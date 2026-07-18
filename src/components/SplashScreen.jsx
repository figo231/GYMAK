export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-glow" />
      <div className="splash-logo-ring">
        <img src="/icon-512.png" alt="GYMAK" className="splash-logo-mark" />
      </div>
      <p className="splash-wordmark">GYMAK</p>
      <p className="splash-tagline">جسمك اللي هتفتخر بيه</p>
      <div className="splash-bar"><div className="splash-bar-fill" /></div>
    </div>
  );
}
