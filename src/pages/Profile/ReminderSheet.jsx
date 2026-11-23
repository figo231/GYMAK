import { useEffect, useState } from "react";
import { getPushPermission, initBroadcastPush } from "../../lib/push/pushService";
import Store from "../../lib/store/gymakStore";
import { useToast } from "../../hooks/useToast";
import { isNative, enableNativeReminder, disableNativeReminder } from "../../lib/push/nativeReminder";
import { tx } from "../../lib/i18n/tx";

export default function ReminderSheet({ initialEnabled, initialTime, onClose, onSaved }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime || "19:00");
  const toast = useToast();
  const [perm, setPerm] = useState(null);
  useEffect(() => {
    getPushPermission().then(setPerm);
  }, []);
  async function enablePush() {
    await initBroadcastPush();
    setPerm(await getPushPermission());
  }

  async function handleSave() {
    if (isNative()) {
      // Android app: the web Notification API does not exist here, use native notifications.
      if (enabled) {
        let ok = false;
        try { ok = await enableNativeReminder(time, Store.getLang ? Store.getLang() : "ar"); } catch (e) { ok = false; }
        if (!ok) {
          toast(tx("محتاجين إذنك للإشعارات. فعّلها من إعدادات الموبايل ثم جرب تاني."));
          Store.setNotifSettings({ enabled: false });
          onClose();
          return;
        }
      } else {
        await disableNativeReminder();
      }
      Store.setNotifSettings({ enabled, time });
      onSaved();
      return;
    }
    if (enabled && !("Notification" in window)) {
      toast(tx("متصفحك مش بيدعم الإشعارات."));
      Store.setNotifSettings({ enabled: false });
      onClose();
      return;
    }
    if (enabled && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast(tx("محتاجين إذنك للإشعارات عشان نقدر نفعّل التذكير."));
        Store.setNotifSettings({ enabled: false });
        onClose();
        return;
      }
    }
    Store.setNotifSettings({ enabled, time });
    Store.scheduleReminder();
    onSaved();
  }

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="edit-sheet">
        <div className="edit-sheet-handle" />
        <h3>{tx("التذكير اليومي")}</h3>

        <div style={{ marginBottom: 14 }}>
          <div className="trow-label" style={{ marginBottom: 8 }}>{tx("حالة الإشعارات")}</div>
          {perm === "denied" && <p className="notif-note">{tx("الإشعارات مقفولة للتطبيق. فعّلها من إعدادات الموبايل.")}</p>}
          {perm === "prompt" && <button type="button" className="btn-apply" style={{ width: "100%", marginBottom: 8 }} onClick={enablePush}>{tx("تفعيل إشعارات التطبيق")}</button>}
          {localStorage.getItem("gymak_push_err") && <p className="notif-note" style={{ direction: "ltr", fontSize: 10.5 }}>{localStorage.getItem("gymak_push_err")}</p>}
        </div>

        <div className="toggle-row">
          <div>
            <div className="trow-label">{tx("تذكير يومي بالتمرين")}</div>
            <div className="trow-sub">{tx("هيوصلك إشعار في الميعاد اللي تحدده")}</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="switch-track" />
          </label>
        </div>

        <div className={"edit-field time-field" + (enabled ? " show" : "")}>
          <label htmlFor="notifTime">{tx("ميعاد التذكير")}</label>
          <input type="time" id="notifTime" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <p className="notif-note">
          {isNative()
            ? tx("التذكير بيوصلك كل يوم في الميعاد ده حتى لو التطبيق مقفول. لازم تسمح بالإشعارات للتطبيق.")
            : tx("الإشعار بيتبعت من المتصفح، فلازم تسمح بالإشعارات وتسيب التطبيق مفتوح (أو في الخلفية على الموبايل) عشان يوصلك في الميعاد.")}
        </p>

        <div className="edit-sheet-actions" style={{ marginTop: 14 }}>
          <button type="button" onClick={onClose}>{tx("إلغاء")}</button>
          <button type="button" style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "var(--on-acc, #fff)" }} onClick={handleSave}>{tx("حفظ")}</button>
        </div>
      </div>
    </div>
  );
}
