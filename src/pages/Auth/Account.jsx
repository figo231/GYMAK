import { useRef, useState } from "react";
import UpdateService from "../../lib/update/UpdateService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { supabase } from "../../lib/supabaseClient";
import { useConfirm } from "../../hooks/useDialog";
import { useToast } from "../../hooks/useToast";
import { buildCsv, exportPayload, clearLocalData, parseBackup, applyBackup, timeAgoAr } from "../../lib/profileLogic";
import Store from "../../lib/store/gymakStore";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { tx } from "../../lib/i18n/tx";

/* Enabled 2026-11-22: edge function deployed and verified end to end with a disposable account (function, session invalidation, row cascade). */
const DELETE_ACCOUNT_ENABLED = true;

const STATUS_LABEL = {
  idle: { text: tx("جاهز"), color: "var(--text-dim)" },
  migrating: { text: tx("بننقل بياناتك القديمة..."), color: "var(--warn-text)" },
  syncing: { text: tx("جاري المزامنة..."), color: "var(--warn-text)" },
  synced: { text: tx("متزامن ✓"), color: "var(--success)" },
  offline: { text: tx("أوفلاين — هيتم المزامنة أول ما ترجع النت"), color: "var(--text-dim)" },
  error: { text: tx("فيه مشكلة في المزامنة"), color: "var(--danger)" },
  disabled: { text: tx("المزامنة مش متاحة دلوقتي"), color: "var(--text-dim)" },
};

export default function Account() {
  const { user, signOut, resetPasswordForEmail } = useAuth();
  const { status, lastSyncAt, lastError, lastErrorKind, lastDroppedCount, pendingChangeCount, isMigrated, lastMigration, syncNow } = useSyncStatus();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const importRef = useRef(null);
  const confirmAsync = useConfirm();
  const toast = useToast();

  async function handleDeleteAccount() {
    const ok = await confirmAsync({
      title: tx("هيتمسح حسابك وكل بياناتك من السيرفر نهائيًا ومفيش رجوع. متأكد؟"),
      danger: true, confirmLabel: tx("حذف حسابي"), cancelLabel: tx("إلغاء"),
    });
    if (!ok || !supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account", { body: {} });
      if (error) throw error;
      await signOut();
      toast(tx("اتمسح حسابك"));
      navigate("/profile", { replace: true });
    } catch {
      toast(tx("معرفناش نحذف الحساب دلوقتي، جرب تاني أو ابعتلنا على الإيميل."));
    } finally { setBusy(false); }
  }

  function handleExportCsv() {
    try {
      const st = JSON.parse(localStorage.getItem("gymak_state_v1") || "null");
      const url = URL.createObjectURL(new Blob([buildCsv(st)], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = "gymak-data.csv";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch { /* ignore */ }
  }
  function handleExport() {
    const blob = new Blob([JSON.stringify(exportPayload(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gymak-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(tx("اتحمّلت نسخة من بياناتك."));
  }

  async function handleImportFile(file) {
    if (!file) return;
    const parsed = parseBackup(await file.text());
    if (!parsed.ok) { toast(parsed.error); return; }
    const ok = await confirmAsync({
      title: tx("هنستبدل بيانات الجهاز دلوقتي ببيانات النسخة اللي اخترتها. اللي على الجهاز هيتمسح. متأكد؟"),
      danger: true, confirmLabel: tx("استرجاع"), cancelLabel: tx("إلغاء"),
    });
    if (!ok) return;
    applyBackup(parsed.payload);
    toast(tx("اتسترجعت البيانات."));
    setTimeout(() => window.location.assign("/profile"), 600);
  }

  async function handleChangePassword() {
    if (!user?.email) return;
    const { error } = await resetPasswordForEmail(user.email);
    toast(error ? tx("معرفناش نبعت الرسالة دلوقتي، جرب تاني.") : tx("بعتنالك رسالة على الإيميل لتغيير كلمة السر."));
  }

  async function handleSignOut() {
    const wipe = await confirmAsync({
      title: tx("هتسجّل خروج. تمسح بيانات التطبيق من الجهاز كمان؟ (بياناتك على حسابك مش هتتأثر)"),
      confirmLabel: tx("امسح واخرج"), cancelLabel: tx("اخرج وسيبها"),
    });
    setBusy(true);
    await signOut();
    if (wipe) { await clearLocalData(); Store.resetAllData(); }
    setBusy(false);
    navigate("/profile", { replace: true });
  }

  const statusInfo = STATUS_LABEL[status] || STATUS_LABEL.idle;
  const isMigrating = status === "migrating";

  return (
    <>
      <DetailTopBar title={tx("حسابي")} backTo="/profile" />

      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, marginBottom: 4 }}>{tx("مسجّل دخول بـ")}</div>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{user?.email}</div>
      </div>

      {isMigrating && (
        <div className="glass" style={{ padding: 16, marginBottom: 16, background: "linear-gradient(120deg, rgba(251,191,36,0.12), rgba(249,115,22,0.08))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="sync-spinner" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{tx("بننقل بياناتك القديمة للحساب")}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{tx("ده بيحصل مرة واحدة بس. متقفلش الصفحة.")}</div>
            </div>
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{tx("مزامنة البيانات")}</div>

        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: statusInfo.color, color: statusInfo.color }} />{tx("الحالة")}</div>
          <div><span className="ib-val" style={{ color: statusInfo.color, fontSize: 12 }}>{statusInfo.text}</span></div>
        </div>
        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--info-text)", color: "var(--info-text)" }} />{tx("آخر مزامنة")}</div>
          <div><span className="ib-val" style={{ fontSize: 12 }}>{timeAgoAr(lastSyncAt)}</span></div>
        </div>
        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--accent-text-soft)", color: "var(--accent-text-soft)" }} />{tx("نقل البيانات القديمة")}</div>
          <div>
            <span className="ib-val" style={{ fontSize: 12, color: lastMigration?.status === "failed" ? "var(--danger)" : undefined }}>
              {isMigrated ? tx("تم ✓") : lastMigration?.status === "failed" ? tx("فشل، هنعيد المحاولة") : tx("لسه")}
            </span>
          </div>
        </div>
        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--purple-text)", color: "var(--purple-text)" }} />{tx("تغييرات لسه ماتزامنتش")}</div>
          <div><span className="ib-val" style={{ fontSize: 12 }}>{pendingChangeCount}</span></div>
        </div>
        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--success)", color: "var(--success)" }} />{tx("الجهاز ده")}</div>
          <div><span className="ib-val" style={{ fontSize: 12 }}>{UpdateService.platform() === "apk" ? tx("تطبيق أندرويد") : tx("المتصفح")}</span></div>
        </div>
        {lastDroppedCount > 0 && (
          <div className="inbody-row" style={{ padding: "8px 0" }}>
            <div className="ib-label"><span className="ib-dot" style={{ background: "var(--warn-text)", color: "var(--warn-text)" }} />{tx("سجلات اتجاهلت")}</div>
            <div><span className="ib-val" style={{ fontSize: 12 }}>{lastDroppedCount}</span></div>
          </div>
        )}

        {status === "error" && lastError && (
          <div className="auth-error" style={{ marginTop: 10, marginBottom: 0 }}>
            {lastError}
            {lastErrorKind === "auth" && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="auth-link-sm" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => navigate("/auth/login")}>
                  {tx("سجّل دخولك تاني")}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button" onClick={syncNow} disabled={status === "syncing" || status === "migrating" || status === "disabled"}
          className="btn btn-primary" style={{ width: "100%", marginTop: 14 }}
        >
          {status === "syncing" || status === "migrating" ? tx("جاري المزامنة...") : tx("زامن دلوقتي")}
        </button>
      </div>

      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{tx("الحساب والبيانات")}</div>
        <button type="button" className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={handleChangePassword}>{tx("تغيير كلمة السر (بالإيميل)")}</button>
        <button type="button" className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={handleExport}>{tx("تحميل نسخة من بياناتي")}</button>
        <button type="button" className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={handleExportCsv}>{tx("تصدير Excel (CSV)")}</button>
        <button type="button" className="btn" style={{ width: "100%" }} onClick={() => importRef.current?.click()}>{tx("استرجاع من نسخة")}</button>
        <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { handleImportFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>

      <button
        type="button" className="btn" onClick={handleSignOut} disabled={busy}
        style={{ width: "100%", background: "rgba(244,63,94,0.12)", color: "var(--danger)", padding: 13, borderRadius: 14, border: "none", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}
      >
        {busy ? tx("جاري الخروج...") : tx("تسجيل الخروج")}
      </button>
      {DELETE_ACCOUNT_ENABLED && (
      <button
        type="button" className="btn" onClick={handleDeleteAccount} disabled={busy}
        style={{ width: "100%", marginTop: 10, background: "none", color: "var(--danger)", padding: 12, borderRadius: 14, border: "1px solid rgba(244,63,94,0.35)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
      >
        {tx("حذف حسابي وبياناتي نهائيًا")}
      </button>
      )}
    </>
  );
}
