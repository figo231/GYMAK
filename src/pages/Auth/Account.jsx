import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { DetailTopBar } from "../../components/layout/DetailShell";

const STATUS_LABEL = {
  idle: { text: "جاهز", color: "var(--text-dim)" },
  migrating: { text: "بننقل بياناتك القديمة...", color: "var(--warn-text)" },
  syncing: { text: "جاري المزامنة...", color: "var(--warn-text)" },
  synced: { text: "متزامن ✓", color: "var(--success)" },
  offline: { text: "أوفلاين — هيتم المزامنة أول ما ترجع النت", color: "var(--text-dim)" },
  error: { text: "فيه مشكلة في المزامنة", color: "var(--danger)" },
  disabled: { text: "المزامنة مش متاحة دلوقتي", color: "var(--text-dim)" },
};

function timeAgo(ts) {
  if (!ts) return "لسه محصلش مزامنة";
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 60) return "من كذا ثانية";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `من ${diffMin} دقيقة`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `من ${diffHr} ساعة`;
  return new Date(ts).toLocaleDateString("ar-EG");
}

export default function Account() {
  const { user, signOut } = useAuth();
  const { status, lastSyncAt, lastError, lastErrorKind, lastDroppedCount, pendingChangeCount, isMigrated, lastMigration, syncNow } = useSyncStatus();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    setBusy(false);
    navigate("/profile", { replace: true });
  }

  const statusInfo = STATUS_LABEL[status] || STATUS_LABEL.idle;
  const isMigrating = status === "migrating";

  return (
    <>
      <DetailTopBar title="حسابي" backTo="/profile" />

      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700, marginBottom: 4 }}>مسجّل دخول بـ</div>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{user?.email}</div>
      </div>

      {isMigrating && (
        <div className="glass" style={{ padding: 16, marginBottom: 16, background: "linear-gradient(120deg, rgba(251,191,36,0.12), rgba(249,115,22,0.08))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="sync-spinner" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>بننقل بياناتك القديمة للحساب</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>ده بيحصل مرة واحدة بس. متقفلش الصفحة.</div>
            </div>
          </div>
        </div>
      )}

      <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>مزامنة البيانات</div>

        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: statusInfo.color, color: statusInfo.color }} />الحالة</div>
          <div><span className="ib-val" style={{ color: statusInfo.color, fontSize: 12 }}>{statusInfo.text}</span></div>
        </div>
        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--info-text)", color: "var(--info-text)" }} />آخر مزامنة</div>
          <div><span className="ib-val" style={{ fontSize: 12 }}>{timeAgo(lastSyncAt)}</span></div>
        </div>
        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--accent-text-soft)", color: "var(--accent-text-soft)" }} />نقل البيانات القديمة</div>
          <div>
            <span className="ib-val" style={{ fontSize: 12, color: lastMigration?.status === "failed" ? "var(--danger)" : undefined }}>
              {isMigrated ? "تم ✓" : lastMigration?.status === "failed" ? "فشل، هنعيد المحاولة" : "لسه"}
            </span>
          </div>
        </div>
        <div className="inbody-row" style={{ padding: "8px 0" }}>
          <div className="ib-label"><span className="ib-dot" style={{ background: "var(--purple-text)", color: "var(--purple-text)" }} />تغييرات لسه ماتزامنتش</div>
          <div><span className="ib-val" style={{ fontSize: 12 }}>{pendingChangeCount}</span></div>
        </div>
        {lastDroppedCount > 0 && (
          <div className="inbody-row" style={{ padding: "8px 0" }}>
            <div className="ib-label"><span className="ib-dot" style={{ background: "var(--warn-text)", color: "var(--warn-text)" }} />سجلات اتجاهلت</div>
            <div><span className="ib-val" style={{ fontSize: 12 }}>{lastDroppedCount}</span></div>
          </div>
        )}

        {status === "error" && lastError && (
          <div className="auth-error" style={{ marginTop: 10, marginBottom: 0 }}>
            {lastError}
            {lastErrorKind === "auth" && (
              <div style={{ marginTop: 8 }}>
                <button type="button" className="auth-link-sm" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} onClick={() => navigate("/auth/login")}>
                  سجّل دخولك تاني
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button" onClick={syncNow} disabled={status === "syncing" || status === "migrating" || status === "disabled"}
          className="btn btn-primary" style={{ width: "100%", marginTop: 14 }}
        >
          {status === "syncing" || status === "migrating" ? "جاري المزامنة..." : "زامن دلوقتي"}
        </button>
      </div>

      <button
        type="button" className="btn" onClick={handleSignOut} disabled={busy}
        style={{ width: "100%", background: "rgba(244,63,94,0.12)", color: "var(--danger)", padding: 13, borderRadius: 14, border: "none", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}
      >
        {busy ? "جاري الخروج..." : "تسجيل الخروج"}
      </button>
    </>
  );
}
