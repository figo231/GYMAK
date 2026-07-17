import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { fmt } from "../../lib/format";
import { compressImage, MAX_UPLOAD_MB } from "../../lib/imageCompress";
import { GRADIENTS } from "./badgeData";
import { usePrompt, useConfirm } from "../../hooks/useDialog";
import { useToast } from "../../hooks/useToast";
import { useI18n } from "../../hooks/useI18n";
import { useAuth } from "../../hooks/useAuth";
import AchievementsGrid from "./AchievementsGrid";
import EditProfileSheet from "./EditProfileSheet";
import LangUnitsSheet from "./LangUnitsSheet";
import NotifSheet from "./NotifSheet";

export default function Profile() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const promptAsync = usePrompt();
  const confirmAsync = useConfirm();
  const toast = useToast();
  const { lang: currentLang, setLang } = useI18n();
  const { user } = useAuth();

  const [showEdit, setShowEdit] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

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
  async function handleAvatarFile(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast(`الصورة كبيرة قوي، اختار صورة أصغر من ${MAX_UPLOAD_MB} ميجا.`);
      return;
    }
    try {
      const dataUrl = await compressImage(file, 400, 0.82);
      const res = Store.setAvatar(dataUrl);
      if (!res.ok) toast("مساحة التخزين المحلي ممتلئة. جرّب تمسح بيانات قديمة أو تستخدم صورة أصغر.");
      refresh();
    } catch {
      toast("تعذر تحميل الصورة، جرّب صورة تانية.");
    }
  }

  async function handleCoverFile(file) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast(`الصورة كبيرة قوي، اختار صورة أصغر من ${MAX_UPLOAD_MB} ميجا.`);
      return;
    }
    try {
      const dataUrl = await compressImage(file, 900, 0.78);
      const res = Store.setCover(dataUrl);
      if (!res.ok) toast("مساحة التخزين المحلي ممتلئة. جرّب تمسح بيانات قديمة أو تستخدم صورة أصغر.");
      refresh();
    } catch {
      toast("تعذر تحميل الصورة، جرّب صورة تانية.");
    }
  }

  function handleGradientPick(id) {
    Store.setCoverGradient(id);
    refresh();
  }

  function handleEditSave({ name, username, bio, gender }) {
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
    const val = await promptAsync({ title: "اكتب طولك بالسنتيمتر (لحساب BMI):", inputType: "number", defaultValue: current || "" });
    if (val && !isNaN(parseFloat(val))) { Store.setHeight(parseFloat(val)); refresh(); }
  }

  async function handleGoalClick() {
    const currentKg = Store.getGoalWeight();
    const currentDisp = currentKg != null ? Store.toDisplayWeight(currentKg) : "";
    const val = await promptAsync({ title: `اكتب وزنك المستهدف (${Store.unitLabel()}):`, inputType: "number", defaultValue: currentDisp });
    if (val && !isNaN(parseFloat(val))) { Store.setGoalWeight(Store.fromDisplayWeight(parseFloat(val))); refresh(); }
  }

  // ===== Share =====
  async function handleShare() {
    const streak = Store.getStreak();
    const text = `أنا في المستوى ${profile.level} على GYMAK 💪 وعندي ستريك ${streak} يوم متتالي!`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* user cancelled — no-op, matches original */ }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        toast("تم نسخ النص، جاهز تلصقه فين ما تحب.");
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

  // ===== Reset data =====
  async function handleReset() {
    const ok = await confirmAsync({
      title: "هيمسح كل بياناتك (الوزن، التمارين، الإنجازات) نهائيًا. متأكد؟",
      danger: true, confirmLabel: "مسح كل شيء", cancelLabel: "إلغاء",
    });
    if (ok) { Store.resetAllData(); refresh(); }
  }

  const coverStyle = profile.cover
    ? { backgroundImage: `url("${profile.cover}")` }
    : { backgroundImage: GRADIENTS[profile.coverGradient] || GRADIENTS.g1 };

  return (
    <>
      <div className="glass profile-head">
        <div className="cover-wrap" style={coverStyle}>
          <button className="cover-edit-btn" aria-label="تغيير صورة الغلاف" onClick={() => document.getElementById("__coverPickTrigger")?.click()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
          </button>
        </div>
        <div className="profile-head-body">
          <div className="p-avatar-wrap">
            <div className="p-avatar-ring"><img src={profile.avatar || "/icon-192.png"} alt="صورتي" /></div>
            <div className="p-level-badge">Lv. {profile.level}</div>
            <button className="avatar-edit-btn" aria-label="تغيير الصورة الشخصية" onClick={() => setShowEdit(true)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" /><circle cx="12" cy="13" r="4" /></svg>
            </button>
          </div>
          <p className="p-name" style={{ cursor: "pointer" }} onClick={() => setShowEdit(true)}>{profile.name || "بطل الجيم"}</p>
          {profile.username && <p className="p-username">@{profile.username}</p>}
          {profile.bio && <p className="p-bio">{profile.bio}</p>}
          <p className="p-role">عضو منذ {profile.memberSince}</p>

          <div className="p-stats-row">
            <div className="p-stat"><span>{fmt(Store.getTotalWorkoutDays())}</span><label>تمرين</label></div>
            <div className="p-stat"><span>{fmt(unlockedCount)}</span><label>إنجاز</label></div>
            <div className="p-stat"><span>{fmt(Store.getBestStreak())}</span><label>أفضل سلسلة</label></div>
          </div>

          <button className="edit-profile-btn" onClick={() => setShowEdit(true)}>تعديل الملف الشخصي</button>

          <div className="p-xp-wrap">
            <div className="p-xp-nums"><span>{fmt(profile.xp)} XP</span><span>{fmt(profile.xpNext)} XP</span></div>
            <div className="p-xp-track"><div className="p-xp-fill" style={{ width: `${Math.min(100, (profile.xp / profile.xpNext) * 100)}%` }} /></div>
          </div>
        </div>
      </div>

      <Link to="/ai-coach" className="glass coach-card" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="coach-ic">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /><path d="M9 10.5s1 1 3 1 3-1 3-1" /></svg>
        </div>
        <div className="coach-info">
          <p className="coach-title">مدرّبك الذكي</p>
          <p className="coach-sub">اقترح لك تعديل يوم الأرجل بناءً على تقدمك</p>
        </div>
        <svg className="coach-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
      </Link>

      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>الإنجازات</h2>
        <span className="sub" style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{unlockedCount} من {achievements.length}</span>
      </div>
      <div className="glass" style={{ padding: 14 }}>
        <AchievementsGrid achievements={achievements} />
        <div className="share-row">
          <span className="share-txt">شارك تقدمك مع أصحابك</span>
          <div className="share-btn" style={{ cursor: "pointer" }} onClick={handleShare}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-3.9M8.6 13.5l6.8 3.9" /></svg>
            مشاركة
          </div>
        </div>
      </div>

      <div className="section-title" style={{ display: "flex", justifyContent: "space-between", margin: "20px 4px 12px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>قياسات الجسم</h2>
        <span className="sub" style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600 }}>{latest ? `آخر تحديث: ${latest.date}` : "لسه مفيش قياس"}</span>
      </div>
      <div className="glass inbody-detail">
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--glow-blue)", color: "var(--glow-blue)" }} />الوزن الحالي</div>
          <div><span className="ib-val">{latest ? Store.formatWeight(latest.weight) : "—"}</span></div>
        </div>
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--success)", color: "var(--success)" }} />نسبة الدهون</div>
          <div><span className="ib-val">{latest && latest.bodyFat != null ? latest.bodyFat + "%" : "—"}</span></div>
        </div>
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--glow-purple)", color: "var(--glow-purple)" }} />مؤشر كتلة الجسم BMI</div>
          <div><span className="ib-val" style={{ cursor: "pointer" }} onClick={handleBMIClick}>{bmi != null ? bmi : "حدد طولك"}</span></div>
        </div>
        <div className="inbody-row">
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--warn-text)", color: "var(--warn-text)" }} />هدف الوزن</div>
          <div><span className="ib-val" style={{ cursor: "pointer" }} onClick={handleGoalClick}>{goal != null ? Store.formatWeight(goal) : "حدد هدفك"}</span></div>
        </div>
      </div>

      <div className="section-title" style={{ margin: "20px 4px 12px" }}><h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>الإعدادات</h2></div>
      <div className="glass" style={{ padding: "2px 14px" }}>
        <div className="settings-row" style={{ cursor: "pointer" }} onClick={() => setShowLang(true)}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a15 15 0 0 0 0 18M12 3a15 15 0 0 1 0 18M3 12h18" /></svg></div>
          <span className="settings-name">اللغة والوحدات</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div>
        <Link to={user ? "/account" : "/auth/login"} className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--info-text)" strokeWidth="2" strokeLinecap="round"><path d="M4 12a8 8 0 0 1 14.93-4M20 12a8 8 0 0 1-14.93 4" /><path d="M4 4v4h4M20 20v-4h-4" /></svg></div>
          <span className="settings-name">{user ? "حسابي ومزامنة البيانات" : "تسجيل الدخول ومزامنة البيانات"}</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
        <div className="settings-row" style={{ cursor: "pointer" }} onClick={() => setShowNotif(true)}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><path d="M12 2a7 7 0 0 0-7 7v3.6c0 .5-.2 1-.6 1.4L3 16.5h18l-1.4-2.5c-.4-.4-.6-.9-.6-1.4V9a7 7 0 0 0-7-7Z" /><path d="M9 19a3 3 0 0 0 6 0" /></svg></div>
          <span className="settings-name">الإشعارات والتذكيرات</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div>
        <Link to="/programs" className="settings-row" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 20h8M12 16v4" /></svg></div>
          <span className="settings-name">برامج التدريب الجاهزة</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </Link>
        <a
          href={Store.getDeveloperWhatsAppUrl()} target="_blank" rel="noreferrer"
          className="settings-row" style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></svg></div>
          <span className="settings-name">تواصل مع المطور</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </a>
        <div className="settings-row" style={{ cursor: "pointer" }} onClick={handleReset}>
          <div className="settings-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg></div>
          <span className="settings-name" style={{ color: "var(--danger)" }}>إعادة تعيين كل البيانات</span>
          <svg className="settings-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
        </div>
      </div>

      {/* Hidden trigger so the cover-edit button (outside EditProfileSheet) can still open a picker before the sheet is mounted */}
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
          initialEnabled={settings.notifEnabled}
          initialTime={settings.notifTime}
          onClose={() => setShowNotif(false)}
          onSaved={() => { setShowNotif(false); refresh(); }}
        />
      )}
    </>
  );
}
