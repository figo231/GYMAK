import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useDialog";
import { buzz } from "../../lib/haptics";
import Store from "../../lib/store/gymakStore";
import { useI18n } from "../../hooks/useI18n";
import SectionNav from "../../components/layout/SectionNav";
import { programLink, programIdFromSearch, shareText } from "../../lib/shareLink";
import ProgramDetailSheet from "./ProgramDetailSheet";
import { tx, txf } from "../../lib/i18n/tx";
import { programDisplay } from "../../lib/i18n/programsEn";

const GOALS = [["all", tx("الكل")], ["bulk", tx("تضخيم")], ["cut", tx("تنشيف")], ["strength", tx("قوة")], ["fitness", tx("لياقة")]];
const GOAL_LABEL = Object.fromEntries(GOALS);
const LEVEL_CLASS = { "مبتدئ": "lvl-beginner", "متوسط": "lvl-inter", "متقدم": "lvl-advanced" };
const LEVEL_BARS = { "مبتدئ": 1, "متوسط": 2, "متقدم": 3 };

function LevelMeter({ level }) {
  const filled = LEVEL_BARS[level] || 1;
  return (
    <div className="level-meter" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className={"level-bar" + (i <= filled ? " on" : "")} style={{ height: 6 + i * 4 }} />
      ))}
    </div>
  );
}

export default function Programs() {
  const [version] = useStoreVersion();
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useI18n();
  const [detailId, setDetailId] = useState(null);
  const [goal, setGoal] = useState("all");

  const programs = useMemo(() => Store.getPrograms(), [version]);
  const active = useMemo(() => programDisplay(Store.getActiveProgram()), [version]);
  const recommendedId = useMemo(() => Store.getRecommendedProgramId(), [version]);
  const shownRaw = goal === "all" ? programs : programs.filter((p) => p.goal === goal);
  const shown = recommendedId ? [...shownRaw].sort((a, b) => (b.id === recommendedId) - (a.id === recommendedId)) : shownRaw;
  const detailProgram = detailId ? programs.find((p) => p.id === detailId) : null;

  useEffect(() => {
    const id = programIdFromSearch(window.location.search, Store.getPrograms().map((p) => p.id));
    if (id) setDetailId(id);
  }, []);
  async function handleShare(p) {
    const r = await shareText({ title: p.name, text: txf(`برنامج {0} على GYMAK`, [p.name]), url: programLink(p.id) });
    if (r === "copied") toast(tx("اتنسخ لينك البرنامج."));
    else if (r === "failed") toast(tx("معرفناش نشارك اللينك."));
  }
  async function handleApply(id) {
    const prev = Store.getActiveProgram();
    if (prev && prev.id === id) { toast(tx("البرنامج ده مطبّق بالفعل.")); return; }
    const target = programs.find((p) => p.id === id);
    if (prev) {
      const ok = await confirm({ title: tx("تغيّر البرنامج؟"), label: txf(`هتبدّل "{0}" بـ "{1}". سجلاتك وتمارينك ما بتتمسحش.`, [programDisplay(prev).name, target ? programDisplay(target).name : ""]), confirmLabel: tx("غيّر") });
      if (!ok) return;
    }
    Store.applyProgram(id);
    buzz(15);
    toast(txf(`اتطبّق: {0}`, [target ? target.name : ""]), {
      duration: 6000,
      action: { label: tx("تراجع"), onClick: () => { if (prev) Store.applyProgram(prev.id); else Store.stopProgram(); } },
    });
  }
  async function handleStop() {
    if (!active) return;
    const ok = await confirm({ title: tx("توقّف البرنامج الحالي؟"), label: tx("سجلاتك وتمارينك هتفضل زي ما هي."), confirmLabel: tx("إيقاف"), danger: true });
    if (!ok) return;
    const prev = Store.stopProgram();
    toast(tx("البرنامج اتوقّف."), { duration: 6000, action: { label: tx("تراجع"), onClick: () => { if (prev) Store.applyProgram(prev); } } });
  }

  return (
    <>
      <SectionNav group="train" title={tx("تدريب")} />
      <p className="pg-sub">{tx("اختار برنامج وطبّقه تلقائيًا على جدولك")}</p>

      {active && (
        <div className="glass active-banner">
          <div className="active-ic">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="active-name">{tx("البرنامج الحالي:")} {active.name}</div>
            <div className="active-sub">{active.daysPerWeek}</div>
          </div>
          <div className="active-actions">
            <Link to="/exercises" className="btn btn-primary active-go">{tx("ابدأ")}</Link>
            <button type="button" className="active-stop" onClick={handleStop}>{tx("إيقاف")}</button>
          </div>
        </div>
      )}

      <div className="goal-tabs" role="tablist" aria-label={tx("الهدف")}>
        {GOALS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={goal === id} className={"goal-tab" + (goal === id ? " on" : "")} onClick={() => setGoal(id)}>{label}</button>
        ))}
      </div>

      {shown.length === 0 && <div className="glass" style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontWeight: 700, fontSize: 13 }}>{tx("مفيش برامج بالهدف ده دلوقتي.")}</div>}
      {shown.map((pRaw) => {
        const p = programDisplay(pRaw);
        const isActive = active && active.id === p.id;
        const isRecommended = recommendedId === p.id && !isActive;
        const days = (String(p.daysPerWeek).match(/[0-9٠-٩]+/) || ["•"])[0];
        return (
          <div className={"pg-card" + (isActive ? " is-on" : "") + (isRecommended ? " feature" : "")} key={p.id}>
            <button type="button" className="pg-main" onClick={() => setDetailId(p.id)} aria-label={txf(`تفاصيل {0}`, [p.name])}>
              <div className="pg-days"><b>{days}</b><span>{tx("أيام")}</span></div>
              <div className="pg-body">
                {isRecommended && <span className="pg-badge">{tx("★ موصى به ليك")}</span>}
                <span className="pg-name">{p.name}</span>
                <span className="pg-meta">{p.goal ? GOAL_LABEL[p.goal] : ""} · {p.level}</span>
                {isRecommended && <span className="pg-desc">{p.desc}</span>}
                <span className="pg-chips">{p.dayChips.slice(0, 4).map((c, i) => <i key={i}>{c}</i>)}</span>
              </div>
            </button>
            <button type="button" className={"pg-apply" + (isActive ? " on" : "")} aria-disabled={isActive || undefined} onClick={() => handleApply(p.id)}>
              {isActive ? tx("✓ مطبّق") : tx("طبّق")}
            </button>
          </div>
        );
      })}

      {detailProgram && (
        <ProgramDetailSheet
          program={detailProgram}
          isActive={active?.id === detailProgram.id}
          onClose={() => setDetailId(null)}
          onApply={async () => { await handleApply(detailProgram.id); setDetailId(null); }}
          onShare={() => handleShare(detailProgram)}
          t={t}
        />
      )}
    </>
  );
}
