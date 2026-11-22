import { useMemo } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useDialog";
import { buzz } from "../../lib/haptics";
import Store from "../../lib/store/gymakStore";
import { useI18n } from "../../hooks/useI18n";
import SectionNav from "../../components/layout/SectionNav";
import ProgramDetailSheet from "./ProgramDetailSheet";

const GOALS = [["all", "الكل"], ["bulk", "تضخيم"], ["cut", "تنشيف"], ["strength", "قوة"], ["fitness", "لياقة"]];
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
  const active = useMemo(() => Store.getActiveProgram(), [version]);
  const recommendedId = useMemo(() => Store.getRecommendedProgramId(), [version]);
  const shown = goal === "all" ? programs : programs.filter((p) => p.goal === goal);
  const detailProgram = detailId ? programs.find((p) => p.id === detailId) : null;

  async function handleApply(id) {
    const prev = Store.getActiveProgram();
    if (prev && prev.id === id) { toast("البرنامج ده مطبّق بالفعل."); return; }
    const target = programs.find((p) => p.id === id);
    if (prev) {
      const ok = await confirm({ title: "تغيّر البرنامج؟", label: `هتبدّل "${prev.name}" بـ "${target ? target.name : ""}". سجلاتك وتمارينك ما بتتمسحش.`, confirmLabel: "غيّر" });
      if (!ok) return;
    }
    Store.applyProgram(id);
    buzz(15);
    toast(`اتطبّق: ${target ? target.name : ""}`, {
      duration: 6000,
      action: { label: "تراجع", onClick: () => { if (prev) Store.applyProgram(prev.id); else Store.stopProgram(); } },
    });
  }
  async function handleStop() {
    if (!active) return;
    const ok = await confirm({ title: "توقّف البرنامج الحالي؟", label: "سجلاتك وتمارينك هتفضل زي ما هي.", confirmLabel: "إيقاف", danger: true });
    if (!ok) return;
    const prev = Store.stopProgram();
    toast("البرنامج اتوقّف.", { duration: 6000, action: { label: "تراجع", onClick: () => { if (prev) Store.applyProgram(prev); } } });
  }

  return (
    <>
      <SectionNav group="train" title="تدريب" />
      <div style={{ margin: "-8px 0 6px" }}>
        <h1 className="page-title" style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>برامج التدريب الجاهزة</h1>
        <div className="page-sub" style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600, marginTop: 2 }}>اختار برنامج وطبّقه تلقائيًا على جدولك</div>
      </div>

      {active && (
        <div className="glass active-banner">
          <div className="active-ic">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="active-name">البرنامج الحالي: {active.name}</div>
            <div className="active-sub">{active.daysPerWeek}</div>
          </div>
          <div className="active-actions">
            <Link to="/exercises" className="btn btn-primary active-go">ابدأ</Link>
            <button type="button" className="active-stop" onClick={handleStop}>إيقاف</button>
          </div>
        </div>
      )}

      <div className="goal-tabs" role="tablist" aria-label="الهدف">
        {GOALS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={goal === id} className={"goal-tab" + (goal === id ? " on" : "")} onClick={() => setGoal(id)}>{label}</button>
        ))}
      </div>

      {shown.length === 0 && <div className="glass" style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontWeight: 700, fontSize: 13 }}>مفيش برامج بالهدف ده دلوقتي.</div>}
      {shown.map((p) => {
        const isActive = active && active.id === p.id;
        const isRecommended = recommendedId === p.id && !isActive;
        return (
          <div className={"glass prog-card" + (isActive ? " prog-card-active" : "")} key={p.id}>
            {isRecommended && <div className="rec-badge">★ {t("prog_recommended") || "موصى به"}</div>}
            <div className="prog-head">
              <div>
                <p className="prog-name">{p.name}</p>
                <div className="prog-days-count">{p.daysPerWeek}{p.goal ? ` · ${GOAL_LABEL[p.goal]}` : ""}</div>
              </div>
              <div className="prog-level-wrap">
                <LevelMeter level={p.level} />
                <span className={"prog-level " + (LEVEL_CLASS[p.level] || "lvl-beginner")}>{p.level}</span>
              </div>
            </div>
            <div className="prog-days">
              {p.dayChips.map((c, i) => <span className="day-chip" key={i}>{c}</span>)}
            </div>
            <p className="prog-desc">{p.desc}</p>
            <div className="prog-actions">
              <button type="button" className={"btn-apply" + (isActive ? " is-active" : "")} aria-disabled={isActive || undefined}
                onClick={() => handleApply(p.id)}>
                {isActive ? "✓ " + (t("prog_applied") || "مطبّق") : (t("prog_apply") || "تطبيق البرنامج")}
              </button>
              <button type="button" className="btn-detail" onClick={() => setDetailId(p.id)}>
                {t("prog_details") || "التفاصيل"}
              </button>
            </div>
          </div>
        );
      })}

      {detailProgram && (
        <ProgramDetailSheet
          program={detailProgram}
          isActive={active?.id === detailProgram.id}
          onClose={() => setDetailId(null)}
          onApply={async () => { await handleApply(detailProgram.id); setDetailId(null); }}
          t={t}
        />
      )}
    </>
  );
}
