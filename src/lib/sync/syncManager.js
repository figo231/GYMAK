import {syncPrivateDrafts,capturePrivateDrafts} from './privateDraftSync';
import {syncMutableDomains} from './mutableDomains';
import {mutableConflicts} from './mutableConflictReview';
import {setTrainingUser,reconcileTrainingGeneration,resumePendingReset} from '../trainingReset';
import { supabase } from "../supabaseClient";
import Store from "../store/gymakStore";
import { pushAll, pullAll } from "./domains";
import { tx } from "../i18n/tx";

const SYNC_STATE_KEY = "gymak_sync_state_v1";
const MAX_RETRY_DELAY = 5 * 60 * 1000; // 5 min ceiling
const BASE_RETRY_DELAY = 5000;
const RESUME_MIN_GAP_MS = 15000;
const RESUME_STALE_MS = 60000;

function loadSyncState() {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    const state=raw?JSON.parse(raw):{};
    return {...state,migratedUserIds:Array.isArray(state?.migratedUserIds)?state.migratedUserIds.filter(x=>typeof x==='string'):[],lastSyncAt:state?.lastSyncAt??null,lastMigration:state?.lastMigration??null};
  } catch {
    return { lastSyncAt: null, migratedUserIds: [], lastMigration: null };
  }
}
function saveSyncState(state) {
  try { localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state)); } catch { /* best-effort cache only */ }
}

/** True for auth-token problems where retrying the exact same request is
    pointless — the session itself needs to be re-established, not the sync
    cycle re-attempted. Distinguishing this from a generic/network failure is
    what "handle expired sessions gracefully" means in practice: fail fast
    instead of burning through the retry/backoff ladder against a dead token. */
function isAuthError(err) {
  const msg = (err?.message || String(err || "")).toLowerCase();
  const status = err?.status || err?.code;
  return status === 401 || status === "401" || status === "PGRST301" ||
    msg.includes("jwt") || msg.includes("refresh_token") || msg.includes("invalid token") ||
    msg.includes("not authenticated");
}

/** True for "we couldn't reach Supabase at all" (their outage, DNS, TLS,
    CORS-from-a-broken-deploy, etc.) as opposed to a normal application-level
    error response. Both get retried with backoff, but this one is worth its
    own diagnostic message rather than surfacing a raw fetch error string. */
function isNetworkError(err) {
  const msg = (err?.message || String(err || "")).toLowerCase();
  return err instanceof TypeError || msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("network request failed");
}

/**
 * One instance for the whole app (module-singleton). React reads it via
 * useSyncStatus(); the manager itself is independent of React so it keeps
 * running/retrying across route changes and unmounts.
 *
 * Status values: idle | migrating | syncing | synced | offline | error | disabled
 * - idle: signed in, sync engine started, no cycle has run yet this session
 * - migrating: first-login migration is actively uploading local data
 * - syncing: an ordinary push/pull cycle is in flight
 * - synced: last cycle completed successfully
 * - offline: navigator.onLine is false, or the last attempt hit a network error
 * - error: last cycle failed for a non-network, non-auth reason (or auth,
 *   see lastErrorKind) and is on the retry ladder
 * - disabled: no Supabase env vars configured — app runs local-only
 *
 * Sync cycle order, every time: migrate-if-needed -> push -> pull.
 * Push-before-pull is what implements "last write wins" for the
 * single-row-per-key tables (profile, weight_logs, food_log) without any
 * client-side timestamp bookkeeping — whichever device's push landed on the
 * server last is what every device's next pull converges on. Append-only
 * tables don't need this ordering at all, since pull is a pure set-union.
 */
class SyncManager {
  constructor() {
    this.status = "idle";
    this.lastSyncAt = null;
    this.lastError = null;
    this.lastErrorKind = null; // "auth" | "network" | "server" | null
    this.lastDroppedCount = 0; // rows skipped by validation in the most recent cycle
    this.pendingChangeCount = 0; // local writes made since the last successful sync
    this.userId = null;
    this._listeners = new Set();
    this._debounceTimer = null;
    this._retryTimer = null;
    this._retryDelay = BASE_RETRY_DELAY;
    this._generation = 0;
    this._running = false; // simple mutex — avoid overlapping sync cycles
    this._rerunRequested = false;
    this._applyingRemote = false;

    const persisted = loadSyncState();
    this.lastSyncAt = persisted.lastSyncAt;

    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this._onOnline());
      // Sync when the app comes back to the foreground (phones suspend timers and sockets while backgrounded).
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") this._onResume(); });
      if (window.Capacitor?.isNativePlatform?.()) import("@capacitor/app").then(({ App }) => App.addListener("appStateChange", ({ isActive }) => { if (isActive) this._onResume(); })).catch(() => {});
      window.addEventListener("gymak-private-draft",()=>{if(this.userId){try{capturePrivateDrafts(this.userId);}catch(e){this._setStatus('error',{error:e.message,errorKind:'storage'});}this.pendingChangeCount++;this._notify();this._scheduleSync(1500);}});
      window.addEventListener("offline", () => this._setStatus("offline"));
    }
  }

  subscribe(fn) {
    this._listeners.add(fn);
    fn(this.getSnapshot());
    return () => this._listeners.delete(fn);
  }

  getSnapshot() {
    let conflictCount=0,conflictRecoveryError=null;
    if(this.userId){try{conflictCount=mutableConflicts(this.userId).length;}catch{conflictRecoveryError='sync_journal_corrupt';}}
    return {
      conflictCount,conflictRecoveryError,
      status: this.status,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
      lastErrorKind: this.lastErrorKind,
      lastDroppedCount: this.lastDroppedCount,
      pendingChangeCount: this.pendingChangeCount,
      isMigrated: this.userId ? this._isMigrated(this.userId) : false,
      lastMigration: loadSyncState().lastMigration, // { at, status: "success"|"failed", uploadedCount? }
    };
  }

  _notify() {
    const snap = this.getSnapshot();
    this._listeners.forEach((fn) => fn(snap));
  }

  _setStatus(status, { error = null, errorKind = null } = {}) {
    this.status = status;
    this.lastError = error;
    this.lastErrorKind = errorKind;
    this._notify();
  }

  /** Called once after a successful sign-in. */
  start(userId) {
    if (!supabase) { this._setStatus("disabled"); return; }
    if (this._unsubStore) this._unsubStore(); // guard against start() being called twice without an intervening stop()
    ++this._generation;
    this.userId = userId;setTrainingUser(userId);
    this.pendingChangeCount = 0;
    this._unsubStore = Store.onChange(() => {
      // Pull merges call Store.save() internally, which fires this same
      // listener. Without this guard, every successful sync would
      // immediately re-trigger another one — harmless (the second cycle's
      // push/pull are no-ops on unchanged data) but a wasted round trip.
      // Genuine local edits made by the user mid-sync are NOT suppressed —
      // this flag is only true for the few ms pullAll() is writing merged
      // data in.
      if (this._applyingRemote) return;
      try{capturePrivateDrafts(userId);}catch(e){this._setStatus("error",{error:e.message,errorKind:"storage"});}
      this.pendingChangeCount += 1;
      this._notify();
      this._scheduleSync(1500);
    });
    this._scheduleSync(0);
  }

  /** Called on sign-out — stop pushing/pulling for the now-anonymous session. */
  stop() {
    ++this._generation;
    this.userId = null;setTrainingUser(null);
    if (this._unsubStore) this._unsubStore();
    clearTimeout(this._debounceTimer);
    clearTimeout(this._retryTimer);
    this._retryDelay = BASE_RETRY_DELAY;
    this.pendingChangeCount = 0;
    this._rerunRequested = false;
    this._setStatus("idle");
  }

  async pauseForReset(){this.stop();const started=Date.now();while(this._running){if(Date.now()-started>20000)throw Error('sync_busy');await new Promise(r=>setTimeout(r,50));}}

  /** Manual "sync now" entry point for the Account page button. */
  manualSync() {
    clearTimeout(this._debounceTimer);
    clearTimeout(this._retryTimer);
    this._retryDelay = BASE_RETRY_DELAY;
    return this.runSync();
  }

  _onOnline() {
    if (this.userId) this._scheduleSync(0);
  }

  /** App returned to the foreground. Sync if the last good sync is old or the last attempt failed. At most once per 15 s. */
  _onResume() {
    if (!this.userId || this._running) return;
    const now = Date.now();
    if (now - (this._lastResumeAt || 0) < RESUME_MIN_GAP_MS) return;
    const stale = !this.lastSyncAt || now - this.lastSyncAt > RESUME_STALE_MS;
    if (!stale && this.status !== "error" && this.status !== "offline") return;
    this._lastResumeAt = now;
    this._scheduleSync(300);
  }

  _scheduleSync(delay) {
    if (!this.userId) return;
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this.runSync(), delay);
  }

  _isMigrated(userId) {
    return loadSyncState().migratedUserIds.includes(userId);
  }

  _markMigrated(userId) {
    const s = loadSyncState();
    if (!s.migratedUserIds.includes(userId)) s.migratedUserIds.push(userId);
    saveSyncState(s);
  }

  _recordMigrationResult(status, extra = {}) {
    saveSyncState({ ...loadSyncState(), lastMigration: { at: Date.now(), status, ...extra } });
  }

  async runSync() {
    if (!this.userId || !supabase) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) { this._setStatus("offline"); this._scheduleRetry(); return; } // retry too: navigator.onLine can be wrong and no "online" event may follow
    if (this._running) {
      // A cycle is already in flight. Don't drop whatever triggered this
      // call — remember it and run again right after the current cycle
      // finishes (handled in the `finally` block below), instead of
      // silently discarding it and waiting for some unrelated future event.
      this._rerunRequested = true;
      return;
    }
    const cycleUser=this.userId,generation=this._generation;
    const canApply=()=>this.userId===cycleUser&&this._generation===generation;
    const pullSafe=async()=>{
      const revision=this.pendingChangeCount;
      return pullAll(cycleUser,()=>canApply()&&this.pendingChangeCount===revision,fn=>{
        this._applyingRemote=true;try{return fn();}finally{this._applyingRemote=false;}
      },{mutable:false});
    };
    this._running = true;
    this._setStatus("syncing");
    try {
      const resumedReset=await resumePendingReset(cycleUser,supabase,canApply);
      if(!canApply())return;
      const resetElsewhere=await reconcileTrainingGeneration(cycleUser,supabase,canApply);
      if(!canApply())return;
      if(resetElsewhere||resumedReset)await pullSafe();
      if(!canApply())return;
      if(localStorage.getItem('gymak_guest_import_remote_committed_v1')===cycleUser){
        await pullSafe();
        if(!canApply())return;
        this._markMigrated(cycleUser);localStorage.removeItem('gymak_guest_import_remote_committed_v1');
        this.lastSyncAt=Date.now();this._setStatus('synced');return;
      }
      await this._migrateIfNeeded(cycleUser,canApply);
      if(!canApply())return;

      this._setStatus("syncing");
      const beforePush=this.pendingChangeCount;
      const mutableResult=await syncMutableDomains(cycleUser,supabase,{canApply,applyRemote:fn=>{this._applyingRemote=true;try{return fn();}finally{this._applyingRemote=false;}}});
      if(!canApply())return;
      const pushDropped = mutableResult.dropped+await pushAll(cycleUser,{mutable:false});
      if(!canApply())return;
      if(this.pendingChangeCount!==beforePush){this._rerunRequested=true;return;}

      await syncPrivateDrafts(cycleUser,supabase,canApply);
      if(!canApply())return;
      const beforePull=this.pendingChangeCount;
      const pullDropped = await pullSafe();
      const editedDuringPull=this.pendingChangeCount!==beforePull;

      if(!canApply())return;
      this.lastSyncAt = Date.now();
      this.lastDroppedCount = pushDropped + pullDropped;
      if(!editedDuringPull)this.pendingChangeCount = 0;
      else this._rerunRequested=true;
      saveSyncState({ ...loadSyncState(), lastSyncAt: this.lastSyncAt });
      this._retryDelay = BASE_RETRY_DELAY;
      if(mutableResult.conflicts)this._setStatus("error",{error:tx("فيه تعديلات مختلفة بين الجهاز والسيرفر. النسختين محفوظين. راجع اختيارات المزامنة في حسابي."),errorKind:"conflict"});
      else this._setStatus("synced");
    } catch (err) {
      if(!canApply())return;
      console.error("[gymak sync] cycle failed", err);
      if (isAuthError(err)) {
        // Retrying with the same dead token will just fail again. Surface a
        // clear message and stop the ladder — the auth listener in
        // useAuth.jsx will call stop() for real if supabase-js itself
        // decides the session is gone; if the user re-authenticates instead
        // (token silently refreshes), the next local change or manual sync
        // picks back up normally.
        this._setStatus("error", { error: tx("انتهت صلاحية جلستك. سجّل دخولك تاني عشان المزامنة تكمل."), errorKind: "auth" });
        return;
      }
      if (isNetworkError(err)) {
        this._setStatus("error", { error: tx("معنديش اتصال بالخادم دلوقتي. هنعيد المحاولة تلقائيًا."), errorKind: "network" });
      } else {
        this._setStatus("error", { error: err?.message || String(err), errorKind: "server" });
      }
      this._scheduleRetry();
    } finally {
      this._running = false;
      if (this._rerunRequested) {
        this._rerunRequested = false;
        this._scheduleSync(0);
      }
    }
  }

  _scheduleRetry() {
    clearTimeout(this._retryTimer);
    this._retryTimer = setTimeout(() => this.runSync(), this._retryDelay);
    this._retryDelay = Math.min(this._retryDelay * 2, MAX_RETRY_DELAY);
  }

  /**
   * First-login migration. Server-authoritative: we check profiles.migrated_at
   * (not just the local cache) so a second device logging in for the first
   * time doesn't re-run — and re-check the local cache first only to skip an
   * extra network round trip on every ordinary sync cycle after the first.
   * Reports a distinct "migrating" status (and a persisted success/failure
   * record) so the UI can show something more specific than generic
   * "syncing" during what might be a large one-time upload.
   */
  async _migrateIfNeeded(userId,canApply=()=>true) {
    if (this._isMigrated(userId)) return;

    const { data: profileRow, error } = await supabase
      .from("profiles")
      .select("migrated_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if(!canApply())return;

    if (profileRow?.migrated_at) {
      this._markMigrated(userId);
      return;
    }

    if (Store.isLocalDataEmpty()) {
      const { error: markError } = await supabase
        .from("profiles").update({ migrated_at: new Date().toISOString() }).eq("id", userId);
      if (markError) throw markError;
      this._markMigrated(userId);
      this._recordMigrationResult("success", { uploadedCount: 0 });
      return;
    }

    this._setStatus("migrating");
    try {
      // Snapshot before uploading — a local safety copy, not sent anywhere,
      // purely so a failed/partial migration has something to inspect/retry
      // from rather than only living in memory mid-request.
      try {
        localStorage.setItem(
          "gymak_migration_snapshot_v1",
          JSON.stringify({ at: Date.now(), userId, state: Store.getRawStateForSync() })
        );
      } catch { /* snapshot is best-effort, never blocks the actual migration */ }

      if(!canApply())return;
      const mutable=await syncMutableDomains(userId,supabase,{canApply,applyRemote:fn=>{this._applyingRemote=true;try{return fn();}finally{this._applyingRemote=false;}}});
      if(mutable.conflicts)throw Error("sync_conflict_review_required");
      await pushAll(userId,{mutable:false});
      if(!canApply())return;

      const { error: markError } = await supabase
        .from("profiles").update({ migrated_at: new Date().toISOString() }).eq("id", userId);
      if (markError) throw markError;

      this._markMigrated(userId);
      this._recordMigrationResult("success");
    } catch (err) {
      this._recordMigrationResult("failed", { error: err?.message || String(err) });
      throw err; // let runSync()'s catch handle status/retry — migration failure is a sync failure
    }
  }
}

export const syncManager = new SyncManager();
