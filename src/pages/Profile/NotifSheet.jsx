import { useState } from "react";
import Store from "../../lib/store/gymakStore";
import { useToast } from "../../hooks/useToast";

export default function NotifSheet({ initialEnabled, initialTime, onClose, onSaved }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(initialTime || "19:00");
  const toast = useToast();

  async function handleSave() {
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
          الإشعار بيتبعت من المتصفح، فلازم تسمح بالإشعارات وتسيب التطبيق مفتوح (أو في الخلفية على الموبايل) عشان يوصلك في الميعاد.
          دلوقتي التذكير بيفضل شغال طول ما أي صفحة من التطبيق مفتوحة.
        </p>

        <div className="edit-sheet-actions" style={{ marginTop: 14 }}>
          <button type="button" onClick={onClose}>إلغاء</button>
          <button type="button" style={{ background: "linear-gradient(135deg,#FF6B2C,#FF9457)", color: "#fff" }} onClick={handleSave}>حفظ</button>
        </div>
      </div>
    </div>
  );
}
