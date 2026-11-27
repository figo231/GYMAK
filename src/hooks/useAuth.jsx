import DefaultChatAvatarSync from '../components/DefaultChatAvatarSync';
import {savePrivateAge,syncPrivateAge,validAge} from '../lib/privateAge';
import {markGuestData,hasGuestImport,inspectGuestImport,finishGuestImport,dataOwner,bindDataOwner} from "../lib/guestImport";
import {clearSignupFailure,takeSignupFailure} from "../lib/authFailureProbe";
import {findAccountStash,restoreAccountData,startFreshForAccount} from "../lib/accountSwitch";
import {flushPushPreferences} from "../lib/push/serverPreferences";
import { flushEncouragementStop } from "../lib/encouragement";
import { recordAppActivity,resetActivitySession } from '../lib/appActivity';
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { syncManager } from "../lib/sync/syncManager";
import { registerForPush, removePushToken } from "../lib/push/pushService";
import { isOwnerAdmin } from "../lib/push/ownerBroadcast";
import { isDeveloperContentUser } from "../lib/developerContent";
import Store from "../lib/store/gymakStore";
import { parseAuthUrl, isDuplicateSignup, recoveryActive, setRecovery, withTimeout } from "../lib/authLogic";

// Captured at load, before supabase-js strips the fragment, so a reload or late mount still knows.
const BOOT = typeof window !== "undefined" ? parseAuthUrl(window.location.hash, window.location.search) : {};
if (BOOT.type === "recovery" && typeof sessionStorage !== "undefined") setRecovery(sessionStorage, true);

const AuthContext = createContext(null);

const NO_CLIENT_ERROR = { message: "لسه معملناش ربط مع Supabase (متغيرات البيئة ناقصة). راجع .env.example." };

/**
 * Session persistence: supabase-js already persists the session to
 * localStorage under its own key and refreshes it silently in the
 * background — we don't need to hand-roll any of that. This provider's job
 * is just to (a) read the session once on mount so the UI doesn't flash a
 * "logged out" state while that lookup is in flight, and (b) subscribe to
 * onAuthStateChange so login/logout/token-refresh in *any* tab updates
 * every component reading useAuth() immediately.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guestImport,setGuestImport]=useState({status:"checking"});
  const [isPasswordRecovery, setIsPasswordRecoveryRaw] = useState(() => typeof sessionStorage !== "undefined" && recoveryActive(sessionStorage));
  const [linkError] = useState(BOOT.error || "");
  const setIsPasswordRecovery = (on) => { if (typeof sessionStorage !== "undefined") setRecovery(sessionStorage, on); setIsPasswordRecoveryRaw(on); };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if(!data.session)markGuestData();
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Supabase fires this when the user lands back on the app via the
      // password-reset email link — it establishes a real (temporary)
      // session for the sole purpose of letting them set a new password.
      // We flag it so ResetPassword.jsx can tell "logged in normally"
      // apart from "here to set a new password", since both look like
      // a truthy `session` otherwise.
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      if (event === "SIGNED_OUT") { setIsPasswordRecovery(false); markGuestData(); }
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Drive the sync engine off the same session state, rather than having
  // every screen that cares about sync re-derive "are we logged in" itself.
  // Skipped during a password-recovery session — that's a temporary session
  // for setting a new password, not a real "signed in, start syncing" state.
  // Owner view: the owner account sees all built-in content (checked server side).
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || isPasswordRecovery) { Store.setOwnerView(false); return undefined; }
    const developerContent = isDeveloperContentUser(userId);
    Store.setOwnerView(developerContent);
    let cancelled = false;
    // The developer's bundled content never depends on a second network request.
    // Keep server authorization separate from this local display exception.
    if (!developerContent) isOwnerAdmin(userId).then((ok) => { if (!cancelled) Store.setOwnerView(ok); });
    return () => { cancelled = true; Store.setOwnerView(false); };
  }, [session?.user?.id, isPasswordRecovery]);

  useEffect(()=>{
    const id=session?.user?.id;let active=true;
    if(loading)return;
    if(!id||isPasswordRecovery){setGuestImport({status:"ready"});return;}
    const owner=dataOwner();
    if(owner&&owner!==id){
      // This account has its own saved copy on this device: swap it back in (the other account's data is stashed, never deleted).
      if(findAccountStash(id)){try{if(restoreAccountData(id)){setGuestImport({status:"ready",userId:id});return;}}catch{}}
      setGuestImport({status:"accountMismatch",userId:id});return;}
    if(!hasGuestImport()){bindDataOwner(id);setGuestImport({status:"ready",userId:id});return;}
    setGuestImport({status:"checking",userId:id});
    inspectGuestImport(id,supabase).then(review=>{if(active)setGuestImport({status:"review",userId:id,review});}).catch(error=>{if(active)setGuestImport({status:"error",userId:id,error});});
    return()=>{active=false;};
  },[session?.user?.id,isPasswordRecovery,loading]);
  function continueFreshOnDevice(){
    const id=session?.user?.id;if(!id||guestImport.userId!==id||guestImport.status!=="accountMismatch")throw Error("session_changed");
    startFreshForAccount(id);setGuestImport({status:"ready",userId:id});
  }
  async function completeGuestImport(choices){
    const id=session?.user?.id;if(!id||guestImport.userId!==id)throw Error("session_changed");
    await finishGuestImport(guestImport.review,choices,supabase);
    setGuestImport({status:"ready",userId:id});
  }

  useEffect(() => {
    const userId = session?.user?.id;
    if (userId && !isPasswordRecovery && guestImport.status==="ready" && guestImport.userId===userId) {
      syncManager.start(userId);
    } else {
      syncManager.stop();
    }
  }, [session?.user?.id, isPasswordRecovery,guestImport.status,guestImport.userId]);

  // Push notification token lifecycle, driven off the same session state —
  // kept as its own effect (not merged into the one above) so this and the
  // sync engine remain independently failing/succeeding: a push-setup
  // error can never affect sync starting, and vice versa.
  useEffect(() => {
    const userId = session?.user?.id;
    if (userId && !isPasswordRecovery) {
      flushPushPreferences(userId).catch(()=>{});
      registerForPush(userId);
    } else {
      removePushToken();
    }
  }, [session?.user?.id, isPasswordRecovery]);

  useEffect(() => {
    const id=session?.user?.id;
    if(!id || isPasswordRecovery){resetActivitySession();return;}
    const tick=()=>{recordAppActivity(id);flushPushPreferences(id).catch(()=>{});};tick();
    document.addEventListener('visibilitychange',tick);
    window.addEventListener('online',tick);
    const timer=setInterval(tick,15*60*1000);
    return ()=>{document.removeEventListener('visibilitychange',tick);window.removeEventListener('online',tick);clearInterval(timer);};
  },[session?.user?.id,isPasswordRecovery]);

  useEffect(()=>{
    const id=session?.user?.id;if(!id||isPasswordRecovery)return;
    const tick=()=>{flushEncouragementStop(id).catch(()=>{});};tick();
    window.addEventListener('online',tick);document.addEventListener('visibilitychange',tick);
    return()=>{window.removeEventListener('online',tick);document.removeEventListener('visibilitychange',tick);};
  },[session?.user?.id,isPasswordRecovery]);

  useEffect(()=>{const id=session?.user?.id;if(!id||isPasswordRecovery)return;const tick=()=>syncPrivateAge(id,supabase).catch(()=>{});tick();window.addEventListener('online',tick);window.addEventListener('gymak-private-age',tick);return()=>{window.removeEventListener('online',tick);window.removeEventListener('gymak-private-age',tick);};},[session?.user?.id,isPasswordRecovery]);

  async function signUp(email, password, identity) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    clearSignupFailure();
    const { data, error } = await withTimeout(supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/login`, ...(identity ? {data:{identity_version:"v1",display_name:identity.name.trim(),gender:identity.gender,username:identity.username.trim().toLowerCase(),private_age:Number(identity.age),private_age_recorded_at:Date.now()}} : {}) },
    }));
    if(!error&&!isDuplicateSignup(data)&&data?.user?.id&&validAge(identity?.age)){try{savePrivateAge(data.user.id,identity.age);}catch{}}
    const detail = takeSignupFailure();
    return { error, data, detail: error ? detail : null, duplicate: !error && isDuplicateSignup(data) };
  }

  async function signIn(email, password) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
    if (!error) setIsPasswordRecovery(false);
    return { error };
  }

  async function signOut() {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    // Sign-out must work offline: a failed token revoke is queued for retry inside removePushToken.
    try { await removePushToken({explicit:true}); } catch { /* never block sign-out */ }
    if (!window.Capacitor?.isNativePlatform?.()) { const {stopWebPush}=await import("../lib/push/webPush"); await stopWebPush(); }
    const { error } = await supabase.auth.signOut();
    return { error };
  }

  async function resetPasswordForEmail(email) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await withTimeout(supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    }));
    return { error };
  }

  async function resendConfirmation(email) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await withTimeout(supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${window.location.origin}/auth/login` } }));
    return { error };
  }

  async function updatePassword(newPassword) {
    if (!supabase) return { error: NO_CLIENT_ERROR };
    const { error } = await withTimeout(supabase.auth.updateUser({ password: newPassword }));
    if (!error) setIsPasswordRecovery(false);
    return { error };
  }

  const value = {
    session,
    guestImport,completeGuestImport,
    user: session?.user ?? null,
    loading,
    isPasswordRecovery,
    linkError,
    resendConfirmation,
    isConfigured: !!supabase,
    signUp,
    signIn,
    signOut,
    continueFreshOnDevice,
    resetPasswordForEmail,
    updatePassword,
  };

  return <AuthContext.Provider value={value}><DefaultChatAvatarSync userId={!isPasswordRecovery&&guestImport.status==='ready'?session?.user?.id:null}/>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
