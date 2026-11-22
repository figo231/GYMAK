import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Store from "../../lib/store/gymakStore";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { useToast } from "../../hooks/useToast";
import { useConfirm, usePrompt } from "../../hooks/useDialog";
import { remaining, pct, macroSplit } from "../../lib/foodLogic";

const QUICK = ["عيش بلدي", "كشري", "فراخ مشوية", "٢ موز", "لبن", "بيض"];

export default function Food() {
  const [version] = useStoreVersion();
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState(null);

  const day = useMemo(() => Store.getTodayFoodLog(), [version]);
  const target = useMemo(() => Store.getDailyCalorieTarget(), [version]);
  const left = remaining(target, day.totalKcal);
  const p = pct(day.totalKcal, target);
  const m = macroSplit(day);

  function parse(t) {
    const v = (t ?? text).trim();
    if (!v) return;
    const items = Store.parseFood(v);
    if (!items || !items.length) { setPreview(null); toast("مفهمتش الأكلة. جرّب اسم الأكلة، زي: عيش بلدي أو فراخ مشوية"); return; }
    setPreview(items);
  }
  function add() {
    if (!preview) return;
    Store.logFoodEntries(preview);
    setPreview(null); setText("");
    toast("اتسجّل");
  }
  async function del(i, it) {
    const ok = await confirm({ title: "مسح الأكلة؟", label: it.name, confirmLabel: "مسح", danger: true });
    if (!ok) return;
    const snap = Store.deleteFoodItem(day.date, i);
    if (snap) toast("تم المسح", { duration: 6000, action: { label: "تراجع", onClick: () => Store.restore(snap) } });
  }
  async function edit(i, it) {
    const v = await prompt({ title: "الكمية بالجرام", label: it.name, inputType: "number", defaultValue: it.grams });
    if (v == null) return;
    const snap = Store.updateFoodItemGrams(day.date, i, Number(v));
    snap ? toast("تم التعديل", { duration: 6000, action: { label: "تراجع", onClick: () => Store.restore(snap) } }) : toast("القيمة مش صحيحة");
  }

  return (
    <>
      <div className="section-head"><h1 className="section-title">الأكل</h1></div>

      <div className="food-hero" data-testid="food-hero">
        <div className="food-hero-top">
          <div>
            <div className="food-big" dir="ltr">{day.totalKcal}</div>
            <div className="food-cap">سعرة النهارده{target ? ` من ${target}` : ""}</div>
          </div>
          {left != null && (
            <div className={"food-left" + (left < 0 ? " over" : "")}>
              <b dir="ltr">{Math.abs(left)}</b>
              <span>{left < 0 ? "زيادة عن الهدف" : "فاضل"}</span>
            </div>
          )}
        </div>
        {target ? (
          <div className="food-bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><i style={{ width: p + "%" }} /></div>
        ) : (
          <div className="food-note">سجّل وزنك في الرئيسية عشان نحسب هدف السعرات.</div>
        )}
        <div className="food-macros">
          <div><b dir="ltr">{m.p}</b><span>بروتين جم</span></div>
          <div><b dir="ltr">{m.c}</b><span>كارب جم</span></div>
          <div><b dir="ltr">{m.f}</b><span>دهون جم</span></div>
        </div>
      </div>

      <div className="glass food-add">
        <div className="food-add-title">كلت إيه؟</div>
        <textarea className="food-input" rows={2} value={text} placeholder="مثال: عيش بلدي وفراخ مشوية و٢ موز" onChange={(e) => { setText(e.target.value); setPreview(null); }} />
        <div className="food-chips">
          {QUICK.map((q) => <button type="button" key={q} className="section-pill" onClick={() => { setText(q); parse(q); }}>{q}</button>)}
        </div>
        {!preview && <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={!text.trim()} onClick={() => parse()}>حلّل</button>}
        {preview && (
          <div className="food-preview">
            <div className="food-note-dim">راجع الكميات. تقدر تعدّلها بالجرام بعد التسجيل.</div>
            {preview.map((it, i) => (
              <div className="food-row" key={i}><span>{it.name} <small dir="ltr">{Math.round(it.grams)}g</small></span><b dir="ltr">{it.kcal} kcal</b></div>
            ))}
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={add}>سجّل ({preview.reduce((a, x) => a + x.kcal, 0)} سعرة)</button>
          </div>
        )}
      </div>

      <div className="section-sub">أكل النهارده</div>
      {day.items.length === 0 ? (
        <div className="glass food-empty">لسه مسجلتش أكل النهارده.</div>
      ) : day.items.map((it, i) => (
        <div className="glass food-row card" key={i}>
          <div className="food-row-main"><b>{it.name}</b><small dir="ltr">{Math.round(it.grams)}g · P{it.protein} C{it.carbs} F{it.fat}</small></div>
          <b dir="ltr">{it.kcal}</b>
          <button type="button" className="hist-btn" aria-label={`تعديل ${it.name}`} onClick={() => edit(i, it)}>✎</button>
          <button type="button" className="hist-btn danger" aria-label={`مسح ${it.name}`} onClick={() => del(i, it)}>✕</button>
        </div>
      ))}
      <p className="food-foot">القيم تقريبية. <Link to="/history">كل أيام الأكل في السجل</Link></p>
    </>
  );
}
