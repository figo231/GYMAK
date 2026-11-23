import { useMemo, useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import { useToast } from "../../hooks/useToast";
import { useStoreVersion } from "../../hooks/useStoreVersion";
import Store from "../../lib/store/gymakStore";
import { buildPlan, shoppingList, fmtGrams, listText } from "../../lib/mealPlan";
import { shareText, APP_URL } from "../../lib/shareLink";
import { tx, txf } from "../../lib/i18n/tx";

const DAYS = [tx("السبت"), tx("الأحد"), tx("الاتنين"), tx("التلات"), tx("الأربع"), tx("الخميس"), tx("الجمعة")];
const lookup = (n, g) => { const it = Store.parseFood(txf(`{0} {1} جم`, [n, g])); return it && it.length === 1 ? { kcal: it[0].kcal, protein: it[0].protein } : null; };

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
    const r = await shareText({ title: tx("قائمة التسوق"), text: listText(list, Store.foodDisplayName), url: APP_URL });
    if (r === "copied") toast(tx("اتنسخت القائمة."));
  }
  return (
    <div className="mp-page">
      <SectionNav group="food" title={tx("الأكل")} />
      <p className="mp-note">{target ? txf(`خطة أسبوع على هدفك {0} سعرة في اليوم.`, [target]) : tx("سجّل وزنك في الرئيسية عشان الخطة تتظبط على هدفك. دلوقتي على 2200 سعرة.")} {tx("الكميات تقريبية.")}</p>
      <div className="mp-tabs">
        <button type="button" className={tab === "plan" ? "on" : ""} onClick={() => setTab("plan")}>{tx("الخطة")}</button>
        <button type="button" className={tab === "shop" ? "on" : ""} onClick={() => setTab("shop")}>{tx("قائمة التسوق")}</button>
        <button type="button" onClick={() => { setSeed((s) => s + 1); setChecked({}); }}>{tx("غيّر الخطة")}</button>
      </div>
      {tab === "plan" ? plan.map((d, i) => (
        <div key={i} className="glass mp-day">
          <div className="mp-day-top"><b>{DAYS[i]}</b><span dir="ltr">{d.kcal} kcal · {d.protein}g</span></div>
          {d.meals.map((m) => (
            <div key={m.slot} className="mp-meal">
              <span className="mp-slot">{m.label}</span>
              <span className="mp-items">{m.items.map((it) => txf(`{0} {1}جم`, [Store.foodDisplayName(it.name), it.grams])).join(" + ")}</span>
              <span className="mp-kcal" dir="ltr">{m.kcal}</span>
            </div>
          ))}
        </div>
      )) : (
        <div className="glass mp-shop">
          {list.map((x) => (
            <label key={x.name} className={"mp-row" + (checked[x.name] ? " done" : "")}>
              <input type="checkbox" checked={!!checked[x.name]} onChange={() => setChecked((c) => ({ ...c, [x.name]: !c[x.name] }))} />
              <span>{Store.foodDisplayName(x.name)}</span><b>{fmtGrams(x.grams)}</b>
            </label>
          ))}
          <button type="button" className="btn btn-primary" style={{ width: "100%", marginTop: 12 }} onClick={copyList}>{tx("شارك / انسخ القائمة")}</button>
        </div>
      )}
    </div>
  );
}
