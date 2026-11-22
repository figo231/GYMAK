import { useCallback, useEffect, useRef, useState } from "react";
import SectionNav from "../../components/layout/SectionNav";
import { useToast } from "../../hooks/useToast";
import { useConfirm } from "../../hooks/useDialog";
import { compressImageToBlob } from "../../lib/imageCompress";
import { POSES, addPhoto, compareSet, deletePhoto, listPhotos } from "../../lib/photos/photos";

function useUrls(photos) {
  const [urls, setUrls] = useState({});
  useEffect(() => {
    const m = {};
    photos.forEach((p) => { m[p.id] = URL.createObjectURL(p.blob); });
    setUrls(m);
    return () => Object.values(m).forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);
  return urls;
}
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export default function Photos() {
  const toast = useToast();
  const confirmAsync = useConfirm();
  const [photos, setPhotos] = useState([]);
  const [pose, setPose] = useState("front");
  const [filter, setFilter] = useState("front");
  const [view, setView] = useState(null);
  const [busy, setBusy] = useState(false);
  const camRef = useRef(null), galRef = useRef(null);
  const urls = useUrls(photos);

  const refresh = useCallback(async () => { try { setPhotos(await listPhotos()); } catch { toast("مقدرناش نفتح الصور على الجهاز ده."); } }, [toast]);
  useEffect(() => { refresh(); }, [refresh]);

  async function onPick(e) {
    const files = [...(e.target.files || [])]; e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const blob = await compressImageToBlob(f, 1080, 0.8);
        await addPhoto(blob, { pose });
      }
      toast("اتحفظت الصورة على جهازك ✅");
      await refresh();
    } catch (err) {
      toast(err?.message === "photo-limit" ? "وصلت للحد الأقصى من الصور. امسح القديم الأول." : "معرفناش نحفظ الصورة.");
    } finally { setBusy(false); }
  }
  async function del(p) {
    if (!(await confirmAsync({ title: "تمسح الصورة دي من الجهاز؟", danger: true, confirmLabel: "مسح", cancelLabel: "إلغاء" }))) return;
    await deletePhoto(p.id); setView(null); await refresh();
  }
  const cmp = compareSet(photos, filter);
  const card = { padding: 14, marginBottom: 12 };
  const chip = (on) => ({ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--border-soft)", background: on ? "rgba(var(--acc-rgb), .18)" : "none", color: "inherit", fontWeight: on ? 800 : 600, fontSize: 12.5, cursor: "pointer" });
  return (
    <>
      <SectionNav group="progress" title="تقدّمي" />
      <div className="glass" style={card}>
        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>صورة جديدة</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {POSES.map(([k, l]) => <button key={k} type="button" style={chip(pose === k)} onClick={() => setPose(k)}>{l}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-primary" style={{ flex: 1 }} disabled={busy} onClick={() => camRef.current?.click()}>{busy ? "بيحفظ..." : "تصوير"}</button>
          <button type="button" className="btn" style={{ flex: 1 }} disabled={busy} onClick={() => galRef.current?.click()}>من المعرض</button>
        </div>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
        <input ref={galRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
        <p className="notif-note" style={{ marginTop: 10 }}>الصور بتتحفظ على جهازك بس. مبتترفعش على السيرفر ومبتتشاركش مع المدرب. لو مسحت بيانات التطبيق أو غيرت الموبايل هتضيع.</p>
      </div>

      {photos.length >= 2 && (
        <div className="glass" style={card}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 8 }}>قبل وبعد</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {POSES.map(([k, l]) => <button key={k} type="button" style={chip(filter === k)} onClick={() => setFilter(k)}>{l}</button>)}
          </div>
          {cmp ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["بعد", cmp.after], ["قبل", cmp.before]].map(([lab, p]) => (
                  <div key={p.id} style={{ textAlign: "center" }}>
                    <img src={urls[p.id]} alt={lab} style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 12 }} />
                    <div style={{ fontSize: 12, marginTop: 4 }}><b>{lab}</b> · <span dir="ltr">{p.date}</span></div>
                  </div>
                ))}
              </div>
              <p className="notif-note" style={{ textAlign: "center" }}>الفرق {dayDiff(cmp.before.date, cmp.after.date)} يوم</p>
            </>
          ) : <p className="notif-note">محتاج صورتين على الأقل من نفس الوضع عشان نقارن.</p>}
        </div>
      )}

      <div style={{ fontWeight: 800, fontSize: 13.5, margin: "8px 0" }}>كل الصور ({photos.length})</div>
      {photos.length === 0 && <p className="notif-note">لسه مفيش صور. صوّر أول صورة النهاردة وقارن بعد كام أسبوع.</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {photos.map((p) => (
          <button key={p.id} type="button" onClick={() => setView(p)} style={{ padding: 0, border: "none", background: "none", position: "relative", cursor: "pointer" }}>
            <img src={urls[p.id]} alt={p.date} loading="lazy" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 10, display: "block" }} />
            <span dir="ltr" style={{ position: "absolute", bottom: 4, insetInlineStart: 4, fontSize: 10, background: "rgba(0,0,0,.55)", color: "#fff", borderRadius: 6, padding: "1px 5px" }}>{p.date}</span>
          </button>
        ))}
      </div>

      {view && (
        <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) setView(null); }}>
          <div className="edit-sheet" style={{ maxHeight: "92vh", overflowY: "auto" }}>
            <div className="edit-sheet-handle" />
            <img src={urls[view.id]} alt={view.date} style={{ width: "100%", borderRadius: 14 }} />
            <p className="notif-note" style={{ textAlign: "center" }}><span dir="ltr">{view.date}</span> · {POSES.find(([k]) => k === view.pose)?.[1]}</p>
            <div className="edit-sheet-actions">
              <button type="button" onClick={() => setView(null)}>إغلاق</button>
              <button type="button" onClick={() => del(view)} style={{ color: "#dc2626" }}>مسح</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
