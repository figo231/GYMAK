import {Capacitor} from '@capacitor/core';
import { tx } from "../lib/i18n/tx";
export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <div className="splash-glow" />
      <div className="splash-logo-ring">
        <img src="/icon-512.png" alt="GYMAK" className="splash-logo-mark" />
      </div>
      <p className="splash-wordmark">GYMAK</p>
      <p className="splash-tagline">{tx("جسمك اللي هتفتخر بيه")}</p>
      <div className="splash-bar"><div className="splash-bar-fill" /></div>
      {Capacitor.isNativePlatform()&&<p className="ota-launch-label">جاري البحث عن تحديث</p>}
    </div>
  );
}
