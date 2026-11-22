import { useMemo, useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import { useToast } from "../../hooks/useToast";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import Store from "../../lib/store/gymakStore";
import { buildPlan, shoppingList, fmtGrams, listText } from "../../lib/mealPlan";
import { shareText, APP_URL } from "../../lib/shareLink";

const DAYS = ["السبت", "الأحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة"];
const lookup = (n, g) => { const it = Store.parseFood(`${n} ${g} جم`); return it && it.length === 1 ? { kcal: it[0].kcal, protein: it[0].protein } : null; };

export default function MealPlan() {
  const [version] = useStoreVersion();
  const toast = useToast();
  const [seed, setSeed] = useState(0);
  const [tab, setTab] = useState("plan");
  const [checked, setChecked] = useState({});
  const target = useMemo(() => Store.getDailyCalorieTarget(), [version]);
  const plan = useMemo(() => buildPlan(target || 2200, lookup, seed), [target, seed]);
  const list = useMemo(() => shoppingList(plan), [plan]);

  async function copyList() {
    const r = await shareText({ title: "قائمة التسوق", text: listText(list), url: APP_URL });
    if (r === "copied") toast("اتنسخت القائمة.");
  }
  return (
    <div className="mp-page">
      <SectionNav group="food" title="الأكل" />
      <p className="mp-note">{target ? `خطة أسبوع على هدفك ${target} سعرة في اليوم.` : "سجّل وزنك في الرئيسية عشان الخطة تتظبط على هدفك. دلوقتي على 2200 سعرة."} الكميات تقريبية.</p>
      <div className="mp-tabs">
        <button type="button" className={tab === "plan" ? "on" : ""} onClick={() => setTab("plan")}>الخطة</button>
        <button type="button" className={tab === "shop" ? "on" : ""} onClick={() => setTab("shop")}>قائمة التسوق</button>
        <button type="button" onClick={() => { setSeed((s) => s + 1); setChecked({}); }}>غيّر الخطة</button>
      </div>
      {tab === "plan" ? plan.map((d, i) => (
        <div key={i} className="glass mp-day">
          <div className="mp-day-top"><b>{DAYS[i]}</b><span dir="ltr">{d.kcal} kcal · {d.protein}g</span></div>
          {d.meals.map((m) => (
            <div key={m.slot} className="mp-meal">
              <span className="mp-slot">{m.label}</span>
              <span className="mp-items">{m.items.map((it) => `${it.name} ${it.grams}جم`).join(" + ")}</span>
              <span className="mp-kcal" dir="ltr">{m.kcal}</span>
            </div>
          ))}
        </div>
      )) : (
        <div className="glass mp-shop">
          {list.map((x) => (
            <label key={x.name} className={"mp-row" + (checked[x.name] ? " done" : "")}>
              <input type="checkbox" checked={!!checked[x.name]} onChange={() => setChecked((c) => ({ ...c, [x.name]: !c[x.name] }))} />
              <span>{x.name}</span><b>{fmtGrams(x.grams)}</b>
            </label>
          ))}
          <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={copyList}>شارك / انسخ القائمة</button>
        </div>
      )}
    </div>
  );
}
