import RamadanCard from "../../components/RamadanCard";
import SectionNav from "../../components/layout/SectionNav";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import ExerciseCard from "./ExerciseCard";
import AddExerciseSheet from "./AddExerciseSheet";
import EmptyState from "../../components/ui/EmptyState";
import { haystack, matchesQuery, DIFFICULTIES, EQUIPMENT_ORDER, isHomeExercise } from "../../lib/exerciseMeta";
import { getFavs, toggleFav } from "../../lib/exerciseFavs";
import { saveExerciseMedia, deleteExerciseMedia } from "../../lib/exerciseMedia";
import { tx, txf } from "../../lib/i18n/tx";

const FILTERS = [
  { m: "all", label: tx("الكل") },
  { m: "chest", color: "var(--muscle-chest)", label: tx("صدر") },
  { m: "back", color: "var(--muscle-back)", label: tx("ظهر") },
  { m: "shoulders", color: "var(--muscle-shoulders)", label: tx("أكتاف") },
  { m: "legs", color: "var(--muscle-legs)", label: tx("أرجل") },
  { m: "arms", color: "var(--muscle-arms)", label: tx("ذراعين") },
  { m: "core", color: "var(--muscle-core)", label: tx("بطن") },
];

const SORTS = [
  { k: "default", label: tx("الترتيب الأصلي") },
  { k: "alpha", label: tx("أبجدي") },
  { k: "recent", label: tx("آخر تمرين") },
];

function lastDate(id) {
  const l = Store.getLastExerciseLog(id);
  return l && l.date ? String(l.date) : "";
}

export default function Exercises() {
  const [version, refresh] = useStoreVersion(); // bumped locally after mutations, and remotely after a sync pull
  const [activeMuscle, setActiveMuscle] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [scope, setScope] = useState("program"); // "program" (program + my own) | "all" (full library)
  const [equip, setEquip] = useState("");
  const [diff, setDiff] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [homeOnly, setHomeOnly] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [sort, setSort] = useState("default");
  const [showFilters, setShowFilters] = useState(false);
  const [openMap, setOpenMap] = useState({});
  const [favs, setFavs] = useState(() => getFavs());
  const todayIds = useMemo(() => new Set(Store.getTodayPlanIds()), [version]);

  const all = useMemo(() => Store.getExercises(), [version]);
  const activeProgram = useMemo(() => Store.getActiveProgram(), [version]);
  const programExerciseIds = useMemo(
    () => (activeProgram ? Store.getProgramExerciseIds(activeProgram.id) : null),
    [activeProgram, version]
  );

  // With a program active, show only its exercises plus the user's own,
  // unless they ask for the whole library.
  const scopedList = useMemo(() => {
    if (scope === "all" || !activeProgram || !programExerciseIds) return all;
    return all.filter((ex) => ex.custom || programExerciseIds.has(ex.id));
  }, [all, scope, activeProgram, programExerciseIds]);

  const hays = useMemo(() => {
    const m = new Map();
    scopedList.forEach((ex) => m.set(ex.id, haystack(ex, Store.getMuscleMeta(ex.muscle).label)));
    return m;
  }, [scopedList]);

  const equipOptions = useMemo(() => {
    const present = new Set(scopedList.map((e) => e.equipment).filter(Boolean));
    const ordered = EQUIPMENT_ORDER.filter((x) => present.has(x));
    return ordered.concat([...present].filter((x) => !EQUIPMENT_ORDER.includes(x)));
  }, [scopedList]);

  const filtered = useMemo(() => {
    const list = scopedList.filter((ex) => {
      if (activeMuscle !== "all" && ex.muscle !== activeMuscle) return false;
      if (equip && ex.equipment !== equip) return false;
      if (diff && ex.difficulty !== diff) return false;
      if (favOnly && !favs.has(ex.id)) return false;
      if (mineOnly && !ex.custom) return false;
      if (homeOnly && !isHomeExercise(ex)) return false;
      if (search.trim() && !matchesQuery(hays.get(ex.id) || "", search)) return false;
      return true;
    });
    if (sort === "alpha") return list.slice().sort((a, b) => a.name.localeCompare(b.name, "ar"));
    if (sort === "recent") {
      return list.slice().sort((a, b) => {
        const da = lastDate(a.id), db = lastDate(b.id);
        if (da === db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da < db ? 1 : -1;
      });
    }
    return list;
  }, [scopedList, activeMuscle, equip, diff, favOnly, mineOnly, homeOnly, favs, search, hays, sort]);

  const groups = {};
  filtered.forEach((ex) => {
    if (!groups[ex.muscle]) groups[ex.muscle] = [];
    groups[ex.muscle].push(ex);
  });
  const groupKeys = Object.keys(groups);

  const muscleCount = new Set(scopedList.map((ex) => ex.muscle)).size;
  const mineCount = all.filter((e) => e.custom).length;
  const activeFilterCount = (equip ? 1 : 0) + (diff ? 1 : 0) + (favOnly ? 1 : 0) + (mineOnly ? 1 : 0) + (homeOnly ? 1 : 0) + (sort !== "default" ? 1 : 0);
  // On the full unfiltered list, start with groups folded so the page isn't a 130-card scroll.
  const autoFold = activeMuscle === "all" && !search.trim() && !equip && !diff && !favOnly && !mineOnly && !homeOnly && filtered.length > 40;
  const isOpen = (muscle, idx) => (openMap[muscle] !== undefined ? openMap[muscle] : !autoFold || idx === 0);

  async function handleAddSave(payload) {
    const { mediaFile, ...data } = payload;
    const ex = Store.addExercise(data);
    setShowAdd(false);
    setSearch("");
    refresh();
    if (mediaFile) {
      try {
        const kind = await saveExerciseMedia(ex.id, mediaFile);
        Store.setExerciseLocalMedia(ex.id, kind);
        refresh();
      } catch {
        await deleteExerciseMedia(ex.id);
        setMediaError(tx("التمرين اتضاف بس الصورة/الفيديو ماتحفظوش (يمكن مساحة الجهاز ممتلئة)."));
      }
    }
  }

  function openAdd(name = "") {
    setAddName(name);
    setShowAdd(true);
  }

  function clearFilters() {
    setEquip(""); setDiff(""); setFavOnly(false); setMineOnly(false); setHomeOnly(false); setSort("default"); setActiveMuscle("all"); setSearch("");
  }

  return (
    <>
      <SectionNav group="train" />
      <RamadanCard kind="train" />
      <div className="page-head">
        <div>
          <h1 className="page-title">{tx("التمارين")}</h1>
          <div className="page-count">{scopedList.length} {tx("تمرين ·")} {muscleCount} {tx("مجموعات عضلية")}</div>
        </div>
        <button type="button" className="add-btn" aria-label={tx("إضافة تمرين جديد")} onClick={() => openAdd()}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>

      {activeProgram && (
        <div className="glass" style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", marginBottom: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, color: "var(--text-dim)", fontWeight: 700 }}>{tx("البرنامج الحالي")}</div>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{activeProgram.name}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5 }}>
              {activeProgram.dayChips.map((c) => (
                <span key={c} style={{ fontSize: 9.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "rgba(17,24,39,0.055)", color: "var(--text-secondary)" }}>{c}</span>
              ))}
            </div>
          </div>
          <Link to="/programs" style={{ textDecoration: "none", fontSize: 11, fontWeight: 800, color: "var(--accent-text)", background: "rgba(147,197,253,0.12)", padding: "6px 10px", borderRadius: 12, flexShrink: 0 }}>{tx("تغيير")}</Link>
        </div>
      )}

      {activeProgram && (
        <div className="prog-scope-toggle" role="group" aria-label={tx("نطاق التمارين")}>
          <button type="button" className={"prog-scope-opt" + (scope === "program" ? " active" : "")} aria-pressed={scope === "program"} onClick={() => setScope("program")}>
            {tx("برنامجي + تماريني الخاصة")}
          </button>
          <button type="button" className={"prog-scope-opt" + (scope === "all" ? " active" : "")} aria-pressed={scope === "all"} onClick={() => setScope("all")}>
            {tx("كل المكتبة")}
          </button>
        </div>
      )}

      <div className="ex-sticky">
        <div className="glass search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          <input type="search" aria-label={tx("بحث في التمارين")} placeholder={tx("دور بالاسم أو العضلة أو المعدة (dumbbell...)")} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="filters" role="group" aria-label={tx("العضلة")}>
          {FILTERS.map((f) => (
            <button
              type="button"
              key={f.m}
              className={"chip chip-btn" + (activeMuscle === f.m ? " active" : "")}
              aria-pressed={activeMuscle === f.m}
              onClick={() => setActiveMuscle(f.m)}
            >
              {f.color && <span className="dot" style={{ background: f.color, color: f.color }} />}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ex-toolbar">
        <button type="button" className={"chip chip-btn" + (showFilters ? " active" : "")} aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
          <span>{tx("فلاتر وترتيب")}</span>
          {activeFilterCount > 0 && <span className="count-dot">{activeFilterCount}</span>}
        </button>
        <button type="button" className={"chip chip-btn" + (favOnly ? " active" : "")} aria-pressed={favOnly} onClick={() => setFavOnly((v) => !v)}>
          <span>{tx("⭐ المفضلة")}</span>
        </button>
        <button type="button" className={"chip chip-btn" + (mineOnly ? " active" : "")} aria-pressed={mineOnly} onClick={() => setMineOnly((v) => !v)}>
          <span>{tx("🏋️ تماريني (")}{mineCount})</span>
        </button>
        <button type="button" className={"chip chip-btn" + (homeOnly ? " active" : "")} aria-pressed={homeOnly} onClick={() => setHomeOnly((v) => !v)}>
          <span>{tx("🏠 في البيت")}</span>
        </button>
        <span className="page-count" style={{ marginInlineStart: "auto" }}>{filtered.length} {tx("نتيجة")}</span>
      </div>

      {showFilters && (
        <div className="glass ex-filter-panel">
          <div className="ex-filter-row">
            <span className="ex-filter-label">{tx("المعدة")}</span>
            <button type="button" className={"chip chip-btn sm" + (!equip ? " active" : "")} onClick={() => setEquip("")}>{tx("الكل")}</button>
            {equipOptions.map((x) => (
              <button type="button" key={x} className={"chip chip-btn sm" + (equip === x ? " active" : "")} aria-pressed={equip === x} onClick={() => setEquip(equip === x ? "" : x)}>{x}</button>
            ))}
          </div>
          <div className="ex-filter-row">
            <span className="ex-filter-label">{tx("الصعوبة")}</span>
            <button type="button" className={"chip chip-btn sm" + (!diff ? " active" : "")} onClick={() => setDiff("")}>{tx("الكل")}</button>
            {DIFFICULTIES.map((x) => (
              <button type="button" key={x} className={"chip chip-btn sm" + (diff === x ? " active" : "")} aria-pressed={diff === x} onClick={() => setDiff(diff === x ? "" : x)}>{x}</button>
            ))}
          </div>
          <div className="ex-filter-row">
            <span className="ex-filter-label">{tx("الترتيب")}</span>
            {SORTS.map((x) => (
              <button type="button" key={x.k} className={"chip chip-btn sm" + (sort === x.k ? " active" : "")} aria-pressed={sort === x.k} onClick={() => setSort(x.k)}>{x.label}</button>
            ))}
          </div>
          <div className="diff-legend">
            <span>{tx("مبتدئ: حركة بسيطة وآمنة للبداية")}</span>
            <span>{tx("متوسط: محتاج تكنيك وأوزان معقولة")}</span>
            <span>{tx("متقدم: حركة مركبة محتاجة خبرة")}</span>
          </div>
        </div>
      )}

      {mediaError && <div className="ex-field-err" role="alert" style={{ margin: "0 0 10px" }}>{mediaError}</div>}

      {!filtered.length ? (
        <EmptyState
          type="search"
          title={mineOnly && !search.trim() ? tx("لسه ما ضفتش تمارين خاصة بيك") : favOnly && !search.trim() ? tx("مفيش تمارين في المفضلة لسه") : tx("مفيش تمارين مطابقة")}
          subtitle={mineOnly && !search.trim() ? tx("دوس على + وضيف تمرينك بصورة أو فيديو من الكاميرا.") : favOnly && !search.trim() ? tx("دوس على النجمة في أي تمرين عشان يتحفظ هنا.") : tx("جرّب كلمة تانية أو شيل الفلاتر، أو ضيفه كتمرين خاص بيك.")}
          ctaLabel={search.trim() ? txf(`+ أضف "{0}"`, [search.trim()]) : tx("+ إضافة تمرين")}
          onCta={() => openAdd(search.trim())}
        />
      ) : (
        <>
          {activeFilterCount > 0 && (
            <button type="button" className="chip chip-btn sm" style={{ marginBottom: 8 }} onClick={clearFilters}>{tx("مسح الفلاتر")}</button>
          )}
          {groupKeys.map((muscle, idx) => {
            const meta = Store.getMuscleMeta(muscle);
            const items = groups[muscle];
            const open = isOpen(muscle, idx);
            return (
              <section key={muscle} aria-label={meta.label}>
                <div className={"group-head" + (open ? "" : " closed")}>
                  <button type="button" className="group-head-btn" aria-expanded={open} onClick={() => setOpenMap((m) => ({ ...m, [muscle]: !open }))}>
                    <span className="dot" style={{ background: meta.color, color: meta.color }} />
                    {meta.label}
                    <span className="group-count">{items.length} {tx("تمرين")}</span>
                    <svg className="chev-g" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                </div>
                {open && <div className="exg">{items.map((ex) => (
                  <ExerciseCard
                    key={ex.id}
                    ex={ex}
                    meta={meta}
                    fav={favs.has(ex.id)}
                    onToggleFav={(id) => setFavs(toggleFav(id))}
                    inToday={todayIds.has(ex.id)}
                    onToggleToday={(id) => { Store.toggleTodayPlan(id); refresh(); }}
                    onDeleted={refresh}
                  />
                ))}</div>}
              </section>
            );
          })}
          <div className="ex-help">{tx("اضغط مطوّل على أي تمرين لحذفه، أو افتحه واحذفه من جوا.")}</div>
        </>
      )}

      {showAdd && <AddExerciseSheet initialName={addName} existingNames={all.map((e) => e.name)} onClose={() => setShowAdd(false)} onSave={handleAddSave} />}
    </>
  );
}
