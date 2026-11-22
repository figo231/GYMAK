import { useState } from "react";
import { monthGrid, shiftMonth, WEEK_HEADS, MONTH_NAMES } from "../../lib/calendarGrid";

export default function WorkoutCalendar({ dayStats, today, selected, onSelect }) {
  const t = today.split("-").map(Number);
  const [ym, setYm] = useState({ year: t[0], month: t[1] - 1 });
  const weeks = monthGrid(ym.year, ym.month);
  const prefix = `${ym.year}-${String(ym.month + 1).padStart(2, "0")}-`;
  const count = Object.keys(dayStats).filter((d) => d.startsWith(prefix)).length;
  const go = (d) => setYm((c) => shiftMonth(c.year, c.month, d));
  return (
    <div className="wc glass">
      <div className="wc-head">
        <button type="button" className="wc-nav" aria-label="الشهر اللي قبله" onClick={() => go(-1)}>›</button>
        <div className="wc-title"><b>{MONTH_NAMES[ym.month]} {ym.year}</b><span>{count} يوم تمرين</span></div>
        <button type="button" className="wc-nav" aria-label="الشهر اللي بعده" onClick={() => go(1)}>‹</button>
      </div>
      <div className="wc-grid" role="grid">
        {WEEK_HEADS.map((h) => <div key={h} className="wc-dow">{h}</div>)}
        {weeks.flat().map((c, i) => {
          if (!c) return <div key={i} />;
          const st = dayStats[c.iso];
          const cls = "wc-day" + (st ? " on" : "") + (c.iso === today ? " today" : "") + (c.iso === selected ? " sel" : "") + (st && st.sets >= 15 ? " hi" : "");
          return (
            <button key={i} type="button" className={cls} disabled={!st} aria-pressed={c.iso === selected}
              aria-label={st ? `${c.day}: ${st.exercises} تمارين` : String(c.day)}
              onClick={() => onSelect(c.iso === selected ? null : c.iso)}>{c.day}</button>
          );
        })}
      </div>
      {selected && <button type="button" className="wc-clear" onClick={() => onSelect(null)}>عرض كل الأيام</button>}
    </div>
  );
}
