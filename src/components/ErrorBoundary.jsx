import { Component } from "react";
import { reportError } from "../lib/crashReporting";
import { tx } from "../lib/i18n/tx";

/* Error boundaries must be class components — React has no hook equivalent
   for componentDidCatch/getDerivedStateFromError yet. This is a gap the
   original MPA didn't have (a JS error on one page couldn't take down the
   others); in this SPA, an uncaught render error anywhere would otherwise
   blank the whole screen with no recovery path. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, savedDataError:false,mealPlanError:false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, mealPlanError:error?.message==='meal_plan_corrupt', savedDataError:String(error?.message||"").includes("original copy has not been changed") };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[gymak] render error caught by ErrorBoundary:", error, info);
    try { window.__gymakRenderFailed=true; } catch {}
    reportError(error, { source: "ErrorBoundary", componentStack: info?.componentStack });
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  downloadOriginal = () => {
    const raw=localStorage.getItem(this.state.mealPlanError?"gymak_meal_planner_v1:"+localStorage.getItem("gymak_local_data_owner_v1"):"gymak_state_v1");if(raw==null)return;
    const url=URL.createObjectURL(new Blob([raw],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download="gymak-original-recovery.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="bg-ambient" />
        <div className="glass" style={{ maxWidth: 380, padding: 28, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>{tx("حصل خطأ غير متوقع")}</p>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 20px" }}>
            {(this.state.savedDataError||this.state.mealPlanError) ? tx("معرفناش نفتح البيانات المحفوظة. النسخة الأصلية متغيرتش. نزّل نسخة للاسترجاع قبل أي محاولة تانية، ومتعملش حذف لبيانات التطبيق.") : tx("حصل خطأ في عرض الصفحة. جرب ترجع للصفحة الرئيسية من غير حذف بيانات التطبيق.")}
          </p>
          {(this.state.savedDataError||this.state.mealPlanError)&&<button className="btn btn-secondary" style={{width:"100%",marginBottom:12}} onClick={this.downloadOriginal}>{tx("تنزيل النسخة الأصلية للاسترجاع")}</button>}
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={this.handleReload}>
            {tx("رجوع للصفحة الرئيسية")}
          </button>
        </div>
      </div>
    );
  }
}
