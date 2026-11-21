import { useState } from "react";
import Store from "../../lib/store/gymakStore";
import { useToast } from "../../hooks/useToast";
import { isNative, enableNativeReminder, disableNativeReminder } from "../../lib/push/nativeReminder";

export default function NotifSheet({ initialEnabled, initialTime, onClose, onSaved }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime || "19:00");
  const toast = useToast();

  async function handleSave() {
    if (isNative()) {
      // Android app: the web Notification API does not exist here, use native notifications.
      if (enabled) {
        let ok = false;
        try { ok = await enableNativeReminder(time, Store.getLang ? Store.getLang() : "ar"); } catch (e) { ok = false; }
        if (!ok) {
          toast("محتاجين إذنك للإشعارات. فعّلها من إعدادات الموبايل ثم جرب تاني.");
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
      toast("متصفحك مش بيدعم الإشعارات.");
      Store.setNotifSettings({ enabled: false });
      onClose();
      return;
    }
    if (enabled && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast("محتاجين إذنك للإشعارات عشان نقدر نفعّل التذكير.");
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
        <h3>الإشعارات والتذكيرات</h3>

        <div className="toggle-row">
          <div>
            <div className="trow-label">تذكير يومي بالتمرين</div>
            <div className="trow-sub">هيوصلك إشعار في الميعاد اللي تحدده</div>
          </div>
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <span className="switch-track" />
          </label>
        </div>

        <div className={"edit-field time-field" + (enabled ? " show" : "")}>
          <label htmlFor="notifTime">ميعاد التذكير</label>
          <input type="time" id="notifTime" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <p className="notif-note">
          {isNative()
            ? "التذكير بيوصلك كل يوم في الميعاد ده حتى لو التطبيق مقفول. لازم تسمح بالإشعارات للتطبيق."
            : "الإشعار بيتبعت من المتصفح، فلازم تسمح بالإشعارات وتسيب التطبيق مفتوح (أو في الخلفية على الموبايل) عشان يوصلك في الميعاد."}
        </p>

        <div className="edit-sheet-actions" style={{ marginTop: 14 }}>
          <button type="button" onClick={onClose}>إلغاء</button>
          <button type="button" style={{ background: "linear-gradient(135deg,var(--glow-blue),var(--glow-purple))", color: "#fff" }} onClick={handleSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
            }
