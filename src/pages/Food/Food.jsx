import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EditFoodSheet from "./EditFoodSheet";
import RamadanCard from "../../components/RamadanCard";
import BarcodeSheet from "./BarcodeSheet";
import SectionNav from "../../components/layout/SectionNav";
import Store from "../../lib/store/gymakStore";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import { useToast } from "../../hooks/useToast";
import { useConfirm, usePrompt } from "../../hooks/useDialog";
import { remaining, pct, macroSplit } from "../../lib/foodLogic";
import { tx, txf } from "../../lib/i18n/tx";

const QUICK = [tx("عيش بلدي"), tx("كشري"), tx("فراخ مشوية"), tx("٢ موز"), tx("لبن"), tx("بيض")];

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
  const mode = useMemo(() => Store.getGoalMode(), [version]);
  const modes = Store.getGoalModes();
  const cheat = useMemo(() => Store.isCheatDay(), [version]);
  function toggleCheat() {
    const r = Store.setCheatDay(day.date, !cheat);
    if (!r.ok) toast(tx("عندك يوم حر في آخر 7 أيام. يوم حر واحد في الأسبوع."));
    else toast(r.on ? tx("النهارده يوم حر. سلسلتك محمية.") : tx("اتلغى اليوم الحر."));
  }
  const saved = useMemo(() => Store.getSavedMeals(), [version]);
  const proteinTarget = useMemo(() => Store.getProteinTarget(), [version]);

  function parse(t) {
    const v = (t ?? text).trim();
    if (!v) return;
    const items = Store.parseFood(v);
    if (!items || !items.length) { setPreview(null); toast(tx("مفهمتش الأكلة. جرّب اسم الأكلة، زي: عيش بلدي أو فراخ مشوية")); return; }
    setPreview(items);
  }
  function add() {
    if (!preview) return;
    Store.logFoodEntries(preview);
    setPreview(null); setText("");
    toast(tx("اتسجّل"));
  }
  async function saveCurrent() {
    if (!preview) return;
    const v = await prompt({ title: tx("اسم الوجبة"), label: tx("مثال: فطاري المعتاد"), inputType: "text", defaultValue: "" });
    if (v == null || !String(v).trim()) return;
    const m = Store.saveMeal(v, preview);
    toast(m ? tx("اتحفظت الوجبة.") : tx("معرفناش نحفظ الوجبة (الحد 30 وجبة)."));
  }
  function logSaved(m) { Store.logSavedMeal(m.id); toast(txf(`اتسجّل: {0}`, [m.name])); }
  async function delSaved(m) {
    const ok = await confirm({ title: tx("تمسح الوجبة المحفوظة؟"), label: m.name, confirmLabel: tx("مسح"), danger: true });
    if (ok) Store.deleteSavedMeal(m.id);
  }
  async function del(i, it) {
    const ok = await confirm({ title: tx("مسح الأكلة؟"), label: it.name, confirmLabel: tx("مسح"), danger: true });
    if (!ok) return;
    const snap = Store.deleteFoodItem(day.date, i);
    if (snap) toast(tx("تم المسح"), { duration: 6000, action: { label: tx("تراجع"), onClick: () => Store.restore(snap) } });
  }
  const [editing, setEditing] = useState(null);
  const [showBarcode, setShowBarcode] = useState(false);
  function edit(i, it) { setEditing({ i, it }); }
  function saveEdit(vals) {
    const { i } = editing; setEditing(null);
    const snap = Store.updateFoodItem(day.date, i, vals);
    snap ? toast(tx("تم التعديل"), { duration: 6000, action: { label: tx("تراجع"), onClick: () => Store.restore(snap) } }) : toast(tx("القيم مش صحيحة"));
  }

  return (
    <>
      <SectionNav group="food" title={tx("الأكل")} />

      <RamadanCard kind="food" />
      <div className="goal-modes" data-testid="goal-modes" role="group" aria-label={tx("الهدف")}>
        {Object.entries(modes).map(([k, v]) => (
          <button key={k} type="button" aria-pressed={mode === k} className={"goal-chip" + (mode === k ? " on" : "")} onClick={() => Store.setGoalMode(mode === k ? null : k)}>{v.label}</button>
        ))}
      </div>
      <button type="button" className={"cheat-toggle" + (cheat ? " on" : "")} aria-pressed={cheat} onClick={toggleCheat}>{cheat ? tx("النهارده يوم حر ✓ (سلسلتك محمية)") : tx("خلّي النهارده يوم حر")}</button>
      {mode && <div className="goal-tip">{modes[mode].tip}{proteinTarget ? txf(` هدف البروتين: {0} جم.`, [proteinTarget]) : ""}</div>}

      <div className="food-hero" data-testid="food-hero">
        <div className="food-hero-top">
          <div>
            <div className="food-big" dir="ltr">{day.totalKcal}</div>
            <div className="food-cap">{tx("سعرة النهارده")}{target ? txf(` من {0}`, [target]) : ""}</div>
          </div>
          {left != null && (
            <div className={"food-left" + (left < 0 && !cheat ? " over" : "")}>
              <b dir="ltr">{Math.abs(left)}</b>
              <span>{left < 0 ? (cheat ? tx("يوم حر") : tx("زيادة عن الهدف")) : tx("فاضل")}</span>
            </div>
          )}
        </div>
        {target ? (
          <div className="food-bar" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}><i style={{ width: p + "%" }} /></div>
        ) : (
          <div className="food-note">{tx("سجّل وزنك في الرئيسية عشان نحسب هدف السعرات.")}</div>
        )}
        <div className="food-macros">
          <div><b dir="ltr">{m.p}</b><span>{tx("بروتين جم")}</span></div>
          <div><b dir="ltr">{m.c}</b><span>{tx("كارب جم")}</span></div>
          <div><b dir="ltr">{m.f}</b><span>{tx("دهون جم")}</span></div>
        </div>
      </div>

      {saved.length > 0 && (
        <div className="saved-meals" data-testid="saved-meals">
          <div className="section-sub">{tx("وجباتك المحفوظة")}</div>
          {saved.map((m) => (
            <div key={m.id} className="glass saved-meal">
              <button type="button" className="saved-meal-main" onClick={() => logSaved(m)}>
                <b>{m.name}</b><small dir="ltr">{m.items.reduce((a, x) => a + x.kcal, 0)} kcal</small>
              </button>
              <button type="button" className="hist-btn danger" aria-label={txf(`مسح {0}`, [m.name])} onClick={() => delSaved(m)}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="glass food-add">
        <div className="food-add-title">{tx("كلت إيه؟")}</div>
        <textarea className="food-input" rows={2} value={text} placeholder={tx("مثال: عيش بلدي وفراخ مشوية و٢ موز")} onChange={(e) => { setText(e.target.value); setPreview(null); }} />
        <div className="food-chips">
          {QUICK.map((q) => <button type="button" key={q} className="section-pill" onClick={() => { setText(q); parse(q); }}>{q}</button>)}
        </div>
        {!preview && <button type="button" className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={() => setShowBarcode(true)}>{tx("سجّل بالباركود")}</button>}
        {!preview && <button type="button" className="btn btn-primary" style={{ width: "100%" }} disabled={!text.trim()} onClick={() => parse()}>{tx("حلّل")}</button>}
        {preview && (
          <div className="food-preview">
            <div className="food-note-dim">{tx("راجع الكميات. تقدر تعدّلها بالجرام بعد التسجيل.")}</div>
            {preview.map((it, i) => (
              <div className="food-row" key={i}><span>{it.name} <small dir="ltr">{Math.round(it.grams)}g</small></span><b dir="ltr">{it.kcal} kcal</b></div>
            ))}
            <button type="button" className="btn btn-primary" style={{ width: "100%" }} onClick={add}>{tx("سجّل (")}{preview.reduce((a, x) => a + x.kcal, 0)} {tx("سعرة)")}</button>
            <button type="button" className="btn" style={{ width: "100%", marginTop: 8 }} onClick={saveCurrent}>{tx("احفظ كوجبة")}</button>
          </div>
        )}
      </div>

      <div className="section-sub">{tx("أكل النهارده")}</div>
      {day.items.length === 0 ? (
        <div className="glass food-empty">{tx("لسه مسجلتش أكل النهارده.")}</div>
      ) : day.items.map((it, i) => (
        <div className="glass food-row card" key={i}>
          <div className="food-row-main"><b>{it.name}</b><small dir="ltr">{Math.round(it.grams)}g · P{it.protein} C{it.carbs} F{it.fat}</small></div>
          <b dir="ltr">{it.kcal}</b>
          <button type="button" className="hist-btn" aria-label={txf(`تعديل {0}`, [it.name])} onClick={() => edit(i, it)}>✎</button>
          <button type="button" className="hist-btn danger" aria-label={txf(`مسح {0}`, [it.name])} onClick={() => del(i, it)}>✕</button>
        </div>
      ))}
      {editing && <EditFoodSheet item={editing.it} onClose={() => setEditing(null)} onSave={saveEdit} />}
      <p className="food-foot">{tx("القيم تقريبية.")} <Link to="/history">{tx("كل أيام الأكل في السجل")}</Link></p>
      {showBarcode && <BarcodeSheet onClose={() => setShowBarcode(false)} onAdd={(it) => { Store.logFoodEntries([it]); setShowBarcode(false); toast(tx("اتسجّل")); }} />}
    </>
  );
}
