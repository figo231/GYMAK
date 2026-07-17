import { Component } from "react";

/* Error boundaries must be class components — React has no hook equivalent
   for componentDidCatch/getDerivedStateFromError yet. This is a gap the
   original MPA didn't have (a JS error on one page couldn't take down the
   others); in this SPA, an uncaught render error anywhere would otherwise
   blank the whole screen with no recovery path. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("[gymak] render error caught by ErrorBoundary:", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="bg-ambient" />
        <div className="glass" style={{ maxWidth: 380, padding: 28, textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>حصل خطأ غير متوقع</p>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 20px" }}>
            بياناتك محفوظة على جهازك ومفيهاش أي مشكلة. جرب ترجع للصفحة الرئيسية.
          </p>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={this.handleReload}>
            رجوع للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }
}
