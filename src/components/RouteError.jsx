import { useRouteError, useNavigate } from "react-router-dom";

export default function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error("[gymak] route error:", error);
  }

  return (
    <>
      <div className="bg-ambient" />
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div className="glass" style={{ maxWidth: 380, padding: 28, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>الصفحة دي مش شغالة دلوقتي</p>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 20px" }}>
            بياناتك محفوظة على جهازك. جرب ترجع للصفحة الرئيسية.
          </p>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => navigate("/")}>
            رجوع للصفحة الرئيسية
          </button>
        </div>
      </div>
    </>
  );
}
