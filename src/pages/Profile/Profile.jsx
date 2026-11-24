import {performTrainingReset,clearTrainingLocally} from '../../lib/trainingReset';
import {supabase} from '../../lib/supabaseClient';
import {syncManager} from '../../lib/sync/syncManager';
import {saveIdentity} from "../../lib/accountIdentity";
import ActivityPreference from './ActivityPreference';
import { shareText, APP_URL } from "../../lib/shareLink";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import UpdateService from "../../lib/update/UpdateService";
import { fmt } from "../../lib/format";
import { compressImage, compressImageToBlob, MAX_UPLOAD_MB } from "../../lib/imageCompress";
import { uploadProfileImage } from "../../lib/imageUpload";
import { GRADIENTS } from "./badgeData";
import { usePrompt, useConfirm } from "../../hooks/useDialog";
import { useToast } from "../../hooks/useToast";
import { useI18n } from "../../hooks/useI18n";
import { useAuth } from "../../hooks/useAuth";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import AchievementsGrid from "./AchievementsGrid";
import ShareCardSheet from "./ShareCardSheet";
import { weightCardData, prCardData } from "../../lib/share/shareCard";
import EditProfileSheet from "./EditProfileSheet";
import LangUnitsSheet from "./LangUnitsSheet";
import NotifSheet from "./NotifSheet";
import ReminderSheet from "./ReminderSheet";
import { isOwnerAdmin } from "../../lib/push/ownerBroadcast";
import { REST_OPTIONS, getRestSettings, setRestSettings, fmtClock } from "../../lib/rest/restTimer";
import { isCoach } from "../../lib/coach/coachApi";
import AppearanceSheet from "./AppearanceSheet";
import { useTheme } from "../../hooks/useTheme";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import AppLockSheet from "./AppLockSheet";
import { isLockEnabled } from "../../lib/appLock";
import { HEIGHT_RANGE, GOAL_RANGE_KG, validHeight, validGoalKg, bmiCategory, arDateFull, coachLine, xpToNext, timeAgoAr, exercisesWord } from "../../lib/profileLogic";
import { tx, txf } from "../../lib/i18n/tx";

// Keyboard + screen-reader support for clickable rows that are not <button>s.
const press = (fn) => ({ role: "button", tabIndex: 0, onClick: fn, onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(e); } } });

export default function Profile({ panel = null }) {
  const [version, refresh] = useStoreVersion();
  const promptAsync = usePrompt();
  const confirmAsync = useConfirm();
  const toast = useToast();
  const { lang: currentLang, setLang } = useI18n();
  const { user } = useAuth();
  const identityOwnerRef=useRef(user?.id);identityOwnerRef.current=user?.id;
  const { theme: activeTheme } = useTheme();

  const [pTab,setPTab]=useState("me");
  const [showEdit, setShowEdit] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showReminder, setShowReminder] = useState(() => !panel && searchParams.get("reminder") === "1");
  const [isOwner, setIsOwner] = useState(false);
  const [showCoach, setShowCoach] = useState(false);
  const [card, setCard] = useState(null);
  function openCard(kind) {
    const d = kind === "weight"
      ? weightCardData(Store.getWeightEntries(), Store.unitLabel(), (x) => Store.toDisplayWeight(x))
      : prCardData(Store.getRecentPRs(1)[0], Store.unitLabel(), (x) => Store.toDisplayWeight(x));
    if (!d) { toast(kind === "weight" ? tx("سجّل وزنك مرتين على الأقل الأول.") : tx("لسه معندكش رقم قياسي.")); return; }
    setCard(d);
  }
  const [rest, setRest] = useState(getRestSettings);
  function cycleRest() {
    const opts = [0, ...REST_OPTIONS];
    const cur = rest.enabled ? rest.sec : 0;
    const nxt = opts[(opts.indexOf(cur) + 1) % opts.length];
    setRest(nxt === 0 ? setRestSettings({ enabled: false }) : setRestSettings({ enabled: true, sec: nxt }));
  }
  useEffect(() => { if (user && panel !== "body" && panel !== "ach") isCoach().then(setShowCoach); }, [user?.id, panel]);
  useEffect(() => { if (!panel) isOwnerAdmin(user?.id).then(setIsOwner); }, [user?.id, panel]);
  const [showNotif, setShowNotif] = useState(() => searchParams.get("notif") === "1");
  const [showAppearance, setShowAppearance] = useState(false);
  const [showLock, setShowLock] = useState(false);
  const { status: syncStatus, lastSyncAt } = useSyncStatus();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const data = useMemo(() => {
    const profile = Store.getProfile();
    const achievements = Store.getAchievements();
    const latest = Store.getLatestWeight();
    return {
      profile,
      achievements,
      unlockedCount: achievements.filter((a) => a.unlocked).length,
      latest,
      bmi: Store.getBMI(),
      goal: Store.getGoalWeight(),
      settings: Store.getSettings(),
    };
  }, [version]);

  const { profile, achievements, unlockedCount, latest, bmi, goal, settings } = data;

  // ===== Avatar / cover upload =====
  // Signed-in users: try Storage first (small URL synced instead of a large
  // base64 blob). Any failure there (offline, RLS, network) falls back
  // silently to the original local-only workflow — same result the user
  // always got before this Sprint. Not signed in: local workflow only,
  // unchanged, exactly as before.
  //
  // Concurrency guard: if the user picks a second image before the first
  // one's compress+upload finishes, the first one's result must never win.
  // Each call bumps its kind's token and captures the value at call time;
  // when the async work resolves, the result is only applied if the token
  // is still the latest one issued for that kind. No promise is cancelled
  // (uploads already in flight still complete normally, e.g. Storage still
  // gets the file) — the stale result is simply ignored client-side.
  const avatarUploadToken = useRef(0);
  const coverUploadToken = useRef(0);

  async function handleAvatarFile(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast(txf(`الصورة كبيرة قوي، اختار صورة أصغر من {0} ميجا.`, [MAX_UPLOAD_MB]));
      return;
    }
    const myToken = ++avatarUploadToken.current;
    try {
      const avatarValue = await resolveUploadedOrLocal(file, "avatar", 400, 0.82);
      if (myToken !== avatarUploadToken.current) return; // a newer pick already superseded this one
      const res = Store.setAvatar(avatarValue);
      if (!res.ok) toast(tx("مساحة التخزين المحلي ممتلئة. جرّب تمسح بيانات قديمة أو تستخدم صورة أصغر."));
      refresh();
    } catch {
      if (myToken !== avatarUploadToken.current) return;
      toast(tx("تعذر تحميل الصورة، جرّب صورة تانية."));
    }
  }

  async function handleCoverFile(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast(txf(`الصورة كبيرة قوي، اختار صورة أصغر من {0} ميجا.`, [MAX_UPLOAD_MB]));
      return;
    }
    const myToken = ++coverUploadToken.current;
    try {
      const coverValue = await resolveUploadedOrLocal(file, "cover", 900, 0.78);
      if (myToken !== coverUploadToken.current) return; // a newer pick already superseded this one
      const res = Store.setCover(coverValue);
      if (!res.ok) toast(tx("مساحة التخزين المحلي ممتلئة. جرّب تمسح بيانات قديمة أو تستخدم صورة أصغر."));
      refresh();
    } catch {
      if (myToken !== coverUploadToken.current) return;
      toast(tx("تعذر تحميل الصورة، جرّب صورة تانية."));
    }
  }

  // Tries Supabase Storage (only when signed in); on ANY failure, or when
  // not signed in, falls back to the pre-existing local base64 path so the
  // user experience never changes. maxDim/quality match the previous
  // hard-coded values in each caller — unchanged this Sprint per the
  // approved decision to defer quality tuning.
  async function resolveUploadedOrLocal(file, kind, maxDim, quality) {
    if (user?.id) {
      try {
        const blob = await compressImageToBlob(file, maxDim, quality);
        return await uploadProfileImage(user.id, blob, kind);
      } catch {
        // fall through to local workflow below
      }
    }
    return compressImage(file, maxDim, quality);
  }

  function handleGradientPick(id) {
    Store.setCoverGradient(id);
    refresh();
  }

  async function handleEditSave({ name, username, bio, gender }) {
    const owner=user?.id;
    if(owner){await saveIdentity(owner,{name,username,gender});}
    if(identityOwnerRef.current!==owner)throw Error("session_changed");
    Store.setProfileName(name);
    Store.setUsername(username);
    Store.setBio(bio);
    Store.setGender(gender);
    setShowEdit(false);
    refresh();
  }

  // ===== BMI / goal prompts =====
  async function handleBMIClick() {
    const current = Store.getProfile().heightCm;
    const val = await promptAsync({ title: tx("اكتب طولك بالسنتيمتر (لحساب BMI):"), inputType: "number", defaultValue: current || "" });
    if (val === null || val === undefined || val === "") return;
    const n = parseFloat(val);
    if (!validHeight(n)) { toast(txf(`الطول لازم يكون بين {0} و {1} سم.`, [HEIGHT_RANGE[0], HEIGHT_RANGE[1]])); return; }
    Store.setHeight(n); refresh();
  }

  async function handleGoalClick() {
    const currentKg = Store.getGoalWeight();
    const currentDisp = currentKg != null ? Store.toDisplayWeight(currentKg) : "";
    const val = await promptAsync({ title: txf(`اكتب وزنك المستهدف ({0}):`, [Store.unitLabel()]), inputType: "number", defaultValue: currentDisp });
    if (val === null || val === undefined || val === "") return;
    const kg = Store.fromDisplayWeight(parseFloat(val));
    if (!validGoalKg(kg)) { toast(txf(`الوزن المستهدف لازم يكون بين {0} و {1} كجم.`, [GOAL_RANGE_KG[0], GOAL_RANGE_KG[1]])); return; }
    Store.setGoalWeight(kg); refresh();
  }

  // ===== Share =====
  async function handleShare() {
    const streak = Store.getStreak();
    const text = currentLang === "en"
      ? `I'm level ${profile.level} on GYMAK 💪 with a ${streak}-day streak!`
      : txf(`أنا في المستوى {0} على GYMAK 💪 وعندي ستريك {1} يوم متتالي!`, [profile.level, streak]);
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled — no-op, matches original */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast(tx("تم نسخ النص، جاهز تلصقه فين ما تحب."));
      } catch {
        toast(text);
      }
    }
  }

  // ===== Lang/units sheet =====
  function handleUnitChange(u) { Store.setUnit(u); refresh(); }
  function handleLangChange(l) {
    if (l === currentLang) return;
    setLang(l);
    refresh();
  }

  // ===== Manual update check =====
  async function handleCheckUpdate() {
    if (checkingUpdate) return;
    setCheckingUpdate(true);
    try {
      const found = await UpdateService.checkForUpdate();
      if (found && UpdateService.platform() === "apk") {
        // The update sheet opens from the service event; nothing to apply here.
      } else if (found) {
        // Download + activate + reload — no extra confirmation needed here,
        // the user already explicitly asked to update by tapping this row.
        UpdateService.applyUpdate();
      } else {
        toast(tx("أنت تستخدم أحدث إصدار"));
      }
    } catch {
      toast(navigator.onLine === false ? tx("اتصل بالإنترنت عشان تتحقق من التحديثات.") : tx("تعذر التحقق من التحديثات، جرّب تاني."));
    } finally {
      setCheckingUpdate(false);
    }
  }

  // ===== Reset data =====
  const resetBusy=useRef(false);
  async function handleReset() {
    if(resetBusy.current)return;
    const en=currentLang==='en', uid=user?.id;
    const ok=await confirmAsync({title:en?'Reset training history permanently?':'تصفير سجل التدريب نهائيًا؟',label:en?'Clears synced workouts, weight, food, records and XP, plus measurements, water and progress photos on this device. Keeps your account, identity, chats, exercises, favorites and saved meals. Local photos on other devices cannot be erased remotely.':'هيمسح التمارين والأوزان والأكل والأرقام القياسية والنقاط من الحساب، والقياسات والمية وصور التقدم من الجهاز ده. حسابك وهويتك والشات والتمارين والمفضلة والوجبات المحفوظة هيفضلوا. صور الأجهزة التانية المحلية مش بتتمسح عن بعد.',danger:true,confirmLabel:en?'Continue':'متابعة',cancelLabel:en?'Cancel':'إلغاء'});
    if(!ok)return;
    const answer=await promptAsync({title:en?'Final confirmation':'التأكيد النهائي',label:en?'Type exactly RESET TRAINING (or the Arabic phrase تصفير التدريب), no extra spaces':'اكتب بالظبط: تصفير التدريب (أو RESET TRAINING) من غير مسافات زيادة',placeholder:en?'RESET TRAINING':'تصفير التدريب',defaultValue:'',danger:true,confirmLabel:en?'Reset permanently':'تصفير نهائي',cancelLabel:en?'Cancel':'إلغاء'});
    const norm=v=>String(v||'').normalize('NFKC').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim().toLowerCase();if(answer===null||answer===undefined||answer===false)return;if(![ 'RESET TRAINING','تصفير التدريب'].map(norm).includes(norm(answer))){toast(en?'Phrase did not match. Type exactly RESET TRAINING or تصفير التدريب, no extra spaces.':'الكلمة مش مطابقة. اكتب بالظبط: تصفير التدريب أو RESET TRAINING من غير مسافات زيادة.');return;}
    if(identityOwnerRef.current!==uid){toast(en?'Account changed. Try again.':'الحساب اتغير. حاول تاني.');return;}
    resetBusy.current=true;
    try{
      if(uid)await performTrainingReset(uid,supabase,syncManager);else await clearTrainingLocally();
      refresh();toast(en?'Training reset. Your account is unchanged.':'اتصفّر التدريب. حسابك زي ما هو.');setTimeout(()=>window.location.assign('/profile'),600);
    }catch{toast(en?'Reset could not finish. Check your connection and try again. If the server finished, local cleanup will resume before sync.':'التصفير مكملش. اتأكد من الاتصال وحاول تاني. لو الخادم خلص، تنظيف الجهاز هيكمل قبل المزامنة.');}
    finally{resetBusy.current=false;}
  }

  const coverStyle = profile.cover
    ? { backgroundImage: `url("${profile.cover}")` }
    : { backgroundImage: GRADIENTS[profile.coverGradient] || GRADIENTS.g1 };

  return (
    <>{!panel && <div className="ux-profile"><div className="glass profile-head">
        <div className="cover-wrap" style={coverStyle}>
          <button className="cover-edit-btn" aria-label={tx("تغيير صورة الغلاف")} onClick={() => document.getElementById("__coverPickTrigger")?.click()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
          </button>
        </div>
        <div className="profile-head-body">
          <div className="p-avatar-wrap">
            <div className="p-avatar-ring"><img src={profile.avatar || "/icon-192.png"} alt={tx("صورتي")} /></div>
            <div className="p-level-badge">Lv. {profile.level}</div>
            <button className="avatar-edit-btn" aria-label={tx("تغيير الصورة الشخصية")} onClick={() => setShowEdit(true)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
            </button>
          </div>
          <p className="p-name" style={{ cursor: "pointer" }} {...press(() => setShowEdit(true))}>{profile.name || tx("بطل الجيم")}</p>
          {profile.username && <p className="p-username">@{profile.username}</p>}
          {profile.bio && <p className="p-bio">{profile.bio}</p>}
          <p className="p-role">{tx("عضو منذ")} {arDateFull(profile.memberSince)}</p>



<div className="p-stats-row">
            <div className="p-stat"><span>{fmt(Store.getTotalWorkoutDays())}</span><label>{tx("يوم تمرين")}</label></div>
            <div className="p-stat"><span>{fmt(unlockedCount)}</span><label>{tx("إنجاز")}</label></div>
            <div className="p-stat"><span>{fmt(Store.getBestStreak())}</span><label>{tx("أفضل سلسلة")}</label></div>
          </div>
<div className="p-xp-wrap">
            <div className="p-xp-nums"><span>{fmt(profile.xp)} XP</span><span>{fmt(profile.xpNext)} XP</span></div>
            <div className="p-xp-track"><div className="p-xp-fill" style={{ width: `${Math.min(100, (profile.xp / profile.xpNext) * 100)}%` }} /></div>
            {(() => { const x = xpToNext(profile); return <div className="xp-next">{x.capped ? tx("وصلت سقف الـXP النهارده. كمّل بكرة.") : txf(`فاضل {0} {1} للمستوى {2}`, [x.exercises, exercisesWord(x.exercises), x.nextLevel])}</div>; })()}
          </div><button className="edit-profile-btn" onClick={() => setShowEdit(true)}>{tx("تعديل الملف الشخصي")}</button>


        </div>
      </div>
      <div className="xd-tabs pf-tabs" role="tablist" aria-label={currentLang==='en'?'Account sections':'أقسام الحساب'}>
      {[["me",currentLang==='en'?'My profile':'ملفي'],["ach",currentLang==='en'?'Achievements':'الإنجازات'],["set",currentLang==='en'?'Settings':'الإعدادات']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={pTab===id} className={'xd-tab'+(pTab===id?' on':'')} onClick={()=>setPTab(id)}>{label}</button>)}
      </div>
      {pTab==='me'&&<><Profile panel="training"/><Profile panel="body"/></>}
      {pTab==='ach'&&<Profile panel="ach"/>}
      {pTab==='set'&&<div className="profile-legacy-settings"><section className="ux-group"><h3 className="legacy-settings-title">{tx("الحساب ومزامنة البيانات")}</h3><div className="ux-group-body"><Link to={user ? "/account" : "/auth/login"} className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--info-text)" strokeWidth="2" strokeLinecap="round"><path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4" /><path d="M4 4v4h4M20 20v-4h-4" /></svg></div>
          <span className="settings-name">{user ? tx("حسابي ومزامنة البيانات") : tx("تسجيل الدخول ومزامنة البيانات")}</span>
          {user && <span className="settings-hint">{syncStatus === "synced" ? txf(`متزامن {0}`, [timeAgoAr(lastSyncAt)]) : syncStatus === "error" ? tx("فيه مشكلة") : syncStatus === "offline" ? tx("أوفلاين") : timeAgoAr(lastSyncAt)}</span>}
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link><Link to="/backups" className="glass coach-card" style={{ textDecoration: "none", color: "inherit", marginBottom: 10, padding: 14, display: "block", fontWeight: 700 }}>{tx("النسخ الاحتياطي ←")}</Link><div className="settings-row" style={{ cursor: "pointer" }} {...press(handleReset)}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg></div>
          <span className="settings-name" style={{ color: "var(--danger)" }}>{currentLang==='en'?'Reset training data':'تصفير بيانات التدريب'}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div></div></section><section className="ux-group"><h3 className="legacy-settings-title">{tx("التفضيلات والخصوصية")}</h3><div className="ux-group-body"><ActivityPreference /><div className="settings-row" style={{ cursor: "pointer" }} {...press(() => setShowLang(true))}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a15 15 0 0 0 0 18M12 3a15 15 0 0 1 0 18M3 12h18" /></svg></div>
          <span className="settings-name">{tx("اللغة والوحدات")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div><div className="settings-row" style={{ cursor: "pointer" }} {...press(() => setShowAppearance(true))}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--purple-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg></div>
          <span className="settings-name">{tx("المظهر")}</span>
          <span className="settings-hint">{activeTheme === "dark" ? tx("داكن") : tx("فاتح")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div><div className="settings-row" style={{ cursor: "pointer" }} {...press(() => setShowLock(true))}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
          <span className="settings-name">{tx("قفل التطبيق")}</span>
          <span className="settings-hint">{isLockEnabled() ? tx("شغال") : tx("مقفول")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div><div className="settings-row" style={{ cursor: "pointer" }} {...press(() => setShowReminder(true))}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><path d="M12 2a7 7 0 0 0-7 7v3.6c0 .5-.2 1-.6 1.4L3 16.5h18l-1.4-2.5c-.4-.4-.6-.9-.6-1.4V9a7 7 0 0 0-7-7Z" /><path d="M9 19a3 3 0 0 0 6 0" /></svg></div>
          <span className="settings-name">{tx("التذكير اليومي")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div><Link to="/notifications" className="glass coach-card" style={{ textDecoration: "none", color: "inherit", marginBottom: 10, padding: 14, display: "block", fontWeight: 700 }}>{tx("التنبيهات ←")}</Link></div></section><section className="ux-group"><h3 className="legacy-settings-title">{tx("المساعدة والدعم")}</h3><div className="ux-group-body"><Link to="/help" className="glass coach-card" style={{ textDecoration: "none", color: "inherit", marginBottom: 10, padding: 14, display: "block", fontWeight: 700 }}>{tx("المساعدة وأسئلة شائعة ←")}</Link><Link to="/contact" className="glass coach-card" style={{ textDecoration: "none", color: "inherit", marginBottom: 10, padding: 14, display: "block", fontWeight: 700 }}>{tx("تواصل معانا ←")}</Link><Link to="/tour" className="glass coach-card" style={{ textDecoration: "none", color: "inherit", marginBottom: 10, padding: 14, display: "block", fontWeight: 700 }}>{tx("جولة تعريفية بالتطبيق ←")}</Link><a
          href={Store.getDeveloperWhatsAppUrl()} target="_blank" rel="noreferrer"
          className="settings-row" style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></svg></div>
          <span className="settings-name">{tx("تواصل مع المطور")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </a></div></section><section className="ux-group"><h3 className="legacy-settings-title">{tx("عن التطبيق والمشاركة")}</h3><div className="ux-group-body"><button type="button" className="glass coach-card" style={{ marginBottom: 10, padding: 14, display: "block", width: "100%", textAlign: "start", color: "inherit", font: "inherit", fontWeight: 700 }} onClick={async () => { const r = await shareText({ title: "GYMAK", text: tx("بتمرن وبتتابع أكلك؟ جرّب GYMAK، تطبيق جيم وتغذية بالعربي ببلاش."), url: APP_URL }); if (r === "copied") toast(tx("اللينك اتنسخ")); }}>{tx("شارك التطبيق مع صحابك ←")}</button><div
          className="settings-row"
          style={{ cursor: checkingUpdate ? "default" : "pointer", opacity: checkingUpdate ? 0.6 : 1 }}
          {...press(() => window.dispatchEvent(new Event("gymak-open-update-center")))}
        >
          <div className="settings-ic">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--info-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={checkingUpdate ? "spin" : ""}>
              <path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" />
            </svg>
          </div>
          <span className="settings-name">{tx("مركز التحديثات")}</span>
          {checkingUpdate && <span className="settings-hint">{tx("بيدور...")}</span>}
          {!checkingUpdate && UpdateService.hasPendingApk() && <span style={{ width: 9, height: 9, borderRadius: 9, background: "var(--glow-blue)", display: "inline-block", marginInlineStart: 6 }} />}
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div></div></section>{isOwner && <section className="ux-group"><h3 className="legacy-settings-title">{tx("إدارة التطبيق")}</h3><div className="ux-group-body">{isOwner && (
          <Link to="/owner" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" /></svg></div>
            <span className="settings-name">{tx("لوحة المالك")}</span>
            <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        )}{isOwner && (
          <Link to="/admin" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" /></svg></div>
            <span className="settings-name">{tx("لوحة الإدارة والرسايل")}</span>
            <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        )}</div></section>}</div>}</div>}{panel === "body" && <>      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{tx("قياسات الجسم")}</h2>
        <span className="sub" style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{latest ? txf(`آخر تحديث: {0}`, [arDateFull(latest.date)]) : tx("لسه مفيش قياس")}</span>
      </div>
      <div className="glass inbody-detail">
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--glow-blue)", color: "var(--glow-blue)" }} />{tx("الوزن الحالي")}</div>
          <div><span className="ib-val">{latest ? Store.formatWeight(latest.weight) : "—"}</span></div>
        </div>
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--success)", color: "var(--success)" }} />{tx("نسبة الدهون")}</div>
          <div><span className="ib-val">{latest && latest.bodyFat != null ? latest.bodyFat + "%" : "—"}</span></div>
        </div>
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--glow-purple)", color: "var(--glow-purple)" }} />{tx("مؤشر كتلة الجسم BMI")}</div>
          <div><span className="ib-val" style={{ cursor: "pointer" }} {...press(handleBMIClick)}>{bmi != null ? bmi : tx("حدد طولك")}</span>{bmi != null && <small style={{ marginInlineStart: 6, fontSize: 11, color: "var(--text-dim)", fontWeight: 700 }}>{bmiCategory(bmi)}</small>}</div>
        </div>
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--warn-text)", color: "var(--warn-text)" }} />{tx("هدف الوزن")}</div>
          <div><span className="ib-val" style={{ cursor: "pointer" }} {...press(handleGoalClick)}>{goal != null ? Store.formatWeight(goal) : tx("حدد هدفك")}</span></div>
        </div>
      </div><Link to="/measurements" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17 17 3l4 4L7 21l-4-4Z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></svg></div>
          <span className="settings-name">{tx("قياسات الجسم (سم)")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link><Link to="/photos" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="12" cy="12.5" r="3.5" /><path d="M8 5l1.500-2h5L16 5" /></svg></div>
          <span className="settings-name">{tx("صور التقدم")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link></>}{panel === "ach" && <>      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{tx("الإنجازات")}</h2>
        <span className="sub" style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{txf("{0} من {1}", [unlockedCount, achievements.length])}</span>
      </div>
      <div className="glass" style={{ padding: 14 }}>
        <AchievementsGrid achievements={achievements} />
        <Link to="/achievements" className="btn btn-secondary" style={{ display: "block", textAlign: "center", marginTop: 12 }}>{tx("صفحة الإنجازات الكاملة — شارك أي وسام 🏅")}</Link>
        <div className="share-row">
          <span className="share-txt">{tx("شارك تقدمك مع أصحابك")}</span>
          <div className="share-btn" style={{ cursor: "pointer" }} {...press(handleShare)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9" /></svg>
            {tx("مشاركة")}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" onClick={() => openCard("weight")} style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid var(--border-soft)", background: "none", color: "inherit", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{tx("كارت الوزن (صورة)")}</button>
          <button type="button" onClick={() => openCard("pr")} style={{ flex: 1, padding: 10, borderRadius: 12, border: "1px solid var(--border-soft)", background: "none", color: "inherit", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}>{tx("كارت رقم قياسي (صورة)")}</button>
        </div>
        {card && <ShareCardSheet data={card} name={profile.name} onClose={() => setCard(null)} />}
      </div><Link to="/history" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></svg></div>
          <span className="settings-name">{tx("سجل التمارين والأكل والوزن")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link></>}{panel === "training" && <><Link to="/weekly-check-in" className="glass coach-card" style={{display:"block",padding:16,marginBottom:10,color:"inherit",textDecoration:"none",fontWeight:800}}>متابعتي الأسبوعية ←</Link><button type="button" className="glass coach-card" aria-pressed={Store.getRamadan()} style={{ marginBottom: 10, padding: 14, display: "block", width: "100%", textAlign: "start", color: "inherit", font: "inherit", fontWeight: 700 }} onClick={() => { const on = Store.setRamadan(!Store.getRamadan()); toast(on ? tx("وضع رمضان اتفعّل") : tx("وضع رمضان اتقفل")); }}>{tx("وضع رمضان:")} {Store.getRamadan() ? tx("شغّال") : tx("مقفول")}</button><Link to="/ai-coach" className="glass coach-card" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="coach-ic">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /><path d="M9 10.5s1 1 3 1 3-1 3-1" /></svg>
        </div>
        <div className="coach-info">
          <p className="coach-title">{tx("مدرّبك الذكي")}</p>
          <p className="coach-sub">{coachLine(Store.getWorkoutDays ? Store.getWorkoutDays() : [])}</p>
        </div>
        <svg className="coach-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
      </Link><div className="settings-row" style={{ cursor: "pointer" }} {...press(cycleRest)}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 2h6" /></svg></div>
          <span className="settings-name">{tx("مؤقت الراحة بين المجموعات")}</span>
          <span style={{ fontSize: 12, opacity: 0.75, fontWeight: 700 }}>{rest.enabled ? fmtClock(rest.sec) : tx("إيقاف")}</span>
        </div>{user && (
          <Link to="/coach" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M17 7.5a3 3 0 0 1 0 5M19 20c0-2.2-.9-3.8-2.4-4.8" /></svg></div>
            <span className="settings-name">{showCoach ? tx("المدربين ومتدربيني") : tx("مدربيني")}</span>
            <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
        )}<Link to="/programs" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 20h8M12 16v4" /></svg></div>
          <span className="settings-name">{tx("برامج التدريب الجاهزة")}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link></>}{/* Hidden trigger so the cover-edit button (outside EditProfileSheet) can still open a picker before the sheet is mounted */}
<input
        id="__coverPickTrigger" type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => handleCoverFile(e.target.files?.[0])}
      />
{showEdit && (
        <EditProfileSheet
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSave={handleEditSave}
          onPickAvatar={handleAvatarFile}
          onPickCover={handleCoverFile}
          onPickGradient={handleGradientPick}
        />
      )}
{showLang && (
        <LangUnitsSheet
          unit={settings.unit}
          lang={currentLang}
          onClose={() => setShowLang(false)}
          onUnitChange={handleUnitChange}
          onLangChange={handleLangChange}
        />
      )}
{showNotif && (
        <NotifSheet
          onClose={() => { setShowNotif(false); if (searchParams.get("notif")) setSearchParams({}, { replace: true }); }}
        />
      )}
{showReminder && (
        <ReminderSheet
          initialEnabled={settings.notifEnabled}
          initialTime={settings.notifTime}
          onClose={() => { setShowReminder(false); if (searchParams.get("reminder")) setSearchParams({}, { replace: true }); }}
          onSaved={() => { setShowReminder(false); if (searchParams.get("reminder")) setSearchParams({}, { replace: true }); refresh(); }}
        />
      )}
{showLock && <AppLockSheet onClose={() => setShowLock(false)} onChanged={refresh} />}
{showAppearance && <AppearanceSheet onClose={() => setShowAppearance(false)} />}</>
  );
                                      }
