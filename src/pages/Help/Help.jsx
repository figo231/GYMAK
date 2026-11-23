import { useState } from "react";
import { Link } from "react-router-dom";
import { FAQ } from "../../lib/faq";
import { tx } from "../../lib/i18n/tx";

export default function Help() {
  const [open, setOpen] = useState(0);
  return (
    <div className="help-page">
      <div className="section-head"><h1 className="section-title">{tx("المساعدة")}</h1></div>
      {FAQ.map((f, i) => (
        <div key={i} className="glass help-item">
          <button type="button" className="help-q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{f.q}</span><span aria-hidden="true">{open === i ? "−" : "+"}</span>
          </button>
          {open === i && <p className="help-a">{f.a}</p>}
        </div>
      ))}
      <Link to="/contact" className="btn btn-primary" style={{ display: "block", textAlign: "center", marginTop: 12 }}>{tx("لسه محتاج مساعدة؟ تواصل معانا")}</Link>
      <Link to="/tour" className="btn" style={{ display: "block", textAlign: "center", marginTop: 8 }}>{tx("شوف الجولة التعريفية")}</Link>
    </div>
  );
}
