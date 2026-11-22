import { useEffect, useState } from "react";
import { verifyPin, clearPin } from "../lib/appLock";
import { clearLocalData } from "../lib/profileLogic";
import Store from "../lib/store/gymakStore";
import { useConfirm } from "../hooks/useDialog";

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmAsync = useConfirm();

  useEffect(() => {
    if (pin.length !== 4 || busy) return;
    setBusy(true);
    verifyPin(pin).then((r) => {
      if (r.ok) { onUnlock(); return; }
      setMsg(r.waitMs ? `حاول تاني بعد ${Math.ceil(r.waitMs / 1000)} ثانية` : "الرمز غلط");
      setPin(""); setBusy(false);
    });
  }, [pin]);

  async function forgot() {
    const ok = await confirmAsync({
      title: "هنمسح بيانات التطبيق من الجهاز ونشيل القفل. لو مسجل دخول بياناتك على حسابك هترجع مع المزامنة. متأكد؟",
      danger: true, confirmLabel: "امسح وافتح", cancelLabel: "إلغاء",
    });
    if (!ok) return;
    clearPin(); await clearLocalData(); Store.resetAllData();
    window.location.assign("/profile");
  }

  const press = (d) => { if (pin.length < 4 && !busy) { setMsg(""); setPin(pin + d); } };
  return (
    <div className="lock-screen" role="dialog" aria-label="قفل التطبيق">
      <h2>GYMAK</h2>
      <p>اكتب الرمز لفتح التطبيق</p>
      <div className="lock-dots" aria-label={`${pin.length} من 4`}>{[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? "on" : ""} />)}</div>
      <div className="lock-msg" role="alert">{msg}</div>
      <div className="lock-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button type="button" key={d} onClick={() => press(d)}>{d}</button>)}
        <span />
        <button type="button" onClick={() => press("0")}>0</button>
        <button type="button" aria-label="مسح رقم" onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
      </div>
      <button type="button" className="lock-forgot" onClick={forgot}>نسيت الرمز؟</button>
    </div>
  );
}
