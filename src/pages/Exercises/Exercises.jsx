import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import ExerciseCard from "./ExerciseCard";
import AddExerciseSheet from "./AddExerciseSheet";

const FILTERS = [
  { m: "all", label: "الكل" },
  { m: "chest", color: "var(--muscle-chest)", label: "صدر" },
  { m: "back", color: "var(--muscle-back)", label: "ظهر" },
  { m: "shoulders", color: "var(--muscle-shoulders)", label: "أكتاف" },
  { m: "legs", color: "var(--muscle-legs)", label: "أرجل" },
  { m: "arms", color: "var(--muscle-arms)", label: "ذراعين" },
  { m: "core", color: "var(--muscle-core)", label: "بطن" },
];

export default function Exercises() {
  const [version, setVersion] = useState(0); // bumped to force re-read from Store after mutations
  const [activeMuscle, setActiveMuscle] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const refresh = () => setVersion((v) => v + 1);

  const all = useMemo(() => Store.getExercises(), [version]);
  const activeProgram = useMemo(() => Store.getActiveProgram(), [version]);

  const filtered = all.filter((ex) => {
    const matchMuscle = activeMuscle === "all" || ex.muscle === activeMuscle;
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    return matchMuscle && matchSearch;
  });

  const groups = {};
  filtered.forEach((ex) => {
    if (!groups[ex.muscle]) groups[ex.muscle] = [];
    groups[ex.muscle].push(ex);
  });

  const muscleCount = new Set(all.map((ex) => ex.muscle)).size;

  function handleAddSave(payload) {
    Store.addExercise(payload);
    setShowAdd(false);
    refresh();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">التمارين</h1>
          <div className="page-count">{all.length} تمرين · {muscleCount} مجموعات عضلية</div>
        </div>
        <div className="add-btn" style={{ cursor: "pointer" }} onClick={() => setShowAdd(true)}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </div>
      </div>

      {activeProgram && (
        <div className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", marginBottom: 14 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontWeight: 700 }}>البرنامج الحالي</div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{activeProgram.name}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
              {activeProgram.dayChips.map((c) => (
                <span key={c} style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(17,24,39,0.055)", color: "var(--text-secondary)" }}>{c}</span>
              ))}
            </div>
          </div>
          <Link to="/programs" style={{ textDecoration: "none", fontSize: 11, fontWeight: 800, color: "var(--accent-text)", background: "rgba(147,197,253,0.12)", padding: "6px 10px", borderRadius: 12, flexShrink: 0 }}>تغيير</Link>
        </div>
      )}

      <div className="glass search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        <input type="text" placeholder="دور على تمرين..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="filters">
        {FILTERS.map((f) => (
          <div
            key={f.m}
            className={"chip" + (activeMuscle === f.m ? " active" : "")}
            onClick={() => setActiveMuscle(f.m)}
            style={{ cursor: "pointer" }}
          >
            {f.color && <span className="dot" style={{ background: f.color, color: f.color }} />}
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      <div className="page-count" style={{ textAlign: "center", marginBottom: 8, opacity: 0.7 }}>
        اضغط مطوّل على أي تمرين لحذفه
      </div>

      {!filtered.length ? (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-dim)" }}>
          <p style={{ fontSize: 13 }}>مفيش تمارين في القسم ده لسه.<br />دوس على + فوق عشان تضيف تمرين جديد.</p>
        </div>
      ) : (
        Object.keys(groups).map((muscle) => {
          const meta = Store.getMuscleMeta(muscle);
          const items = groups[muscle];
          return (
            <div key={muscle}>
              <div className="group-head">
                <span className="dot" style={{ background: meta.color, color: meta.color }} />
                {meta.label}
                <span className="group-count">{items.length} تمرين</span>
              </div>
              {items.map((ex) => (
                <ExerciseCard key={ex.id} ex={ex} meta={meta} onDeleted={refresh} />
              ))}
            </div>
          );
        })
      )}

      {showAdd && <AddExerciseSheet onClose={() => setShowAdd(false)} onSave={handleAddSave} />}
    </>
  );
}
