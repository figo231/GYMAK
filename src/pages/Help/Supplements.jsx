import { useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import { SUPPLEMENTS, MYTHS, SUPP_BASICS, SUPP_DISCLAIMER } from "../../lib/supplements";
import { tx } from "../../lib/i18n/tx";

export default function Supplements() {
  const [open, setOpen] = useState("creatine");
  return (
    <div className="wu-page">
      <SectionNav group="food" title={tx("أكل")} />
      <p className="mp-note">{SUPP_BASICS}</p>
      {SUPPLEMENTS.map((s) => {
        const on = open === s.id;
        return (
          <div key={s.id} className="glass sp-card">
            <button type="button" className="sp-head" aria-expanded={on} onClick={() => setOpen(on ? "" : s.id)}>
              <b>{tx(s.name)}</b><span className="sp-level">{s.level}</span>
            </button>
            {on && (
              <div className="sp-body">
                <p>{s.what}</p>
                <p><b>{tx("الجرعة:")}</b> {s.dose}</p>
                <p><b>{tx("التوقيت:")}</b> {s.timing}</p>
                <ul>{s.tips.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            )}
          </div>
        );
      })}
      <h2 className="section-title" style={{ margin: "18px 2px 8px", fontSize: 16 }}>{tx("خرافات شائعة")}</h2>
      {MYTHS.map((x) => (
        <div key={x.m} className="glass sp-myth"><b>{x.m}</b><p>{x.t}</p></div>
      ))}
      <p className="mp-note">{SUPP_DISCLAIMER}</p>
    </div>
  );
}
