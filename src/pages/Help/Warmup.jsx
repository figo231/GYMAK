import { useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import { WARMUP, STRETCH, routineMinutes } from "../../lib/warmup";

export default function Warmup() {
  const [tab, setTab] = useState("warm");
  const [grp, setGrp] = useState("chest");
  const [done, setDone] = useState({});
  const items = tab === "warm" ? WARMUP : STRETCH[grp].items;
  const key = (n) => tab + grp + n;
  return (
    <div className="wu-page">
      <SectionNav group="train" title="تدريب" />
      <div className="mp-tabs">
        <button type="button" className={tab === "warm" ? "on" : ""} onClick={() => setTab("warm")}>إحماء قبل التمرين</button>
        <button type="button" className={tab === "stretch" ? "on" : ""} onClick={() => setTab("stretch")}>إطالة بعد التمرين</button>
      </div>
      {tab === "stretch" && (
        <div className="wu-groups" role="group" aria-label="العضلة">
          {Object.entries(STRETCH).map(([k, g]) => <button key={k} type="button" className={"goal-chip" + (grp === k ? " on" : "")} aria-pressed={grp === k} onClick={() => setGrp(k)}>{g.label}</button>)}
        </div>
      )}
      <p className="mp-note">حوالي {routineMinutes(items)} دقايق. لو حسيت بألم حاد وقّف. ده إرشاد عام مش بديل لمدرب أو دكتور.</p>
      {items.map((x) => (
        <label key={x.name} className={"glass wu-item" + (done[key(x.name)] ? " done" : "")}>
          <input type="checkbox" checked={!!done[key(x.name)]} onChange={() => setDone((d) => ({ ...d, [key(x.name)]: !d[key(x.name)] }))} />
          <span className="wu-body"><b>{x.name}</b><small>{x.tip}</small></span>
          <span className="wu-sec">{x.sec >= 60 ? `${Math.round(x.sec / 60)} د` : `${x.sec} ث`}</span>
        </label>
      ))}
    </div>
  );
}
