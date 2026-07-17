import { useMemo, useState } from "react";
import Store from "../../lib/store/gymakStore";
import { useI18n } from "../../hooks/useI18n";
import { DetailTopBar } from "../../components/layout/DetailShell";
import ProgramDetailSheet from "./ProgramDetailSheet";

const LEVEL_CLASS = { "مبتدئ": "lvl-beginner", "متوسط": "lvl-inter", "متقدم": "lvl-advanced" };

export default function Programs() {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);
  const { t } = useI18n();
  const [detailId, setDetailId] = useState(null);

  const programs = useMemo(() => Store.getPrograms(), [version]);
  const active = useMemo(() => Store.getActiveProgram(), [version]);
  const recommendedId = useMemo(() => Store.getRecommendedProgramId(), [version]);
  const detailProgram = detailId ? programs.find((p) => p.id === detailId) : null;

  function handleApply(id) {
    Store.applyProgram(id);
    refresh();
  }

  return (
    <>
      <DetailTopBar backTo="/profile" />
      <div style={{ margin: "-8px 0 6px" }}>
        <h1 className="page-title" style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>برامج التدريب الجاهزة</h1>
        <div className="page-sub" style={{ fontSize: 11.5, color: "var(--text-dim)", fontWeight: 600, marginTop: 2 }}>اختار برنامج وطبّقه تلقائيًا على جدولك</div>
      </div>

      {active && (
        <div className="glass active-banner">
          <div className="active-ic">
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </div>
          <div>
            <div className="active-name">البرنامج الحالي: {active.name}</div>
            <div className="active-sub">{active.daysPerWeek}</div>
          </div>
        </div>
      )}

      {programs.map((p) => {
        const isActive = active && active.id === p.id;
        const isRecommended = recommendedId === p.id && !isActive;
        return (
          <div className="glass prog-card" key={p.id}>
            {isRecommended && <div className="rec-badge">★ {t("prog_recommended") || "موصى به"}</div>}
            <div className="prog-head">
              <div>
                <p className="prog-name">{p.name}</p>
                <div className="prog-days-count">{p.daysPerWeek}</div>
              </div>
              <span className={"prog-level " + (LEVEL_CLASS[p.level] || "lvl-beginner")}>{p.level}</span>
            </div>
            <div className="prog-days">
              {p.dayChips.map((c, i) => <span className="day-chip" key={i}>{c}</span>)}
            </div>
            <p className="prog-desc">{p.desc}</p>
            <div className="prog-actions">
              <div
                className="btn-apply"
                style={{ cursor: "pointer", opacity: isActive ? 0.7 : 1 }}
                onClick={() => handleApply(p.id)}
              >
                {isActive ? (t("prog_applied") || "مطبّق") : (t("prog_apply") || "تطبيق البرنامج")}
              </div>
              <div className="btn-detail" style={{ cursor: "pointer" }} onClick={() => setDetailId(p.id)}>
                {t("prog_details") || "التفاصيل"}
              </div>
            </div>
          </div>
        );
      })}

      {detailProgram && (
        <ProgramDetailSheet
          program={detailProgram}
          isActive={active?.id === detailProgram.id}
          onClose={() => setDetailId(null)}
          onApply={() => { handleApply(detailProgram.id); setDetailId(null); }}
          t={t}
        />
      )}
    </>
  );
}
