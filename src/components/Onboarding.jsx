import { useEffect, useRef, useState } from "react";
import { SLIDES } from "./onboardingSlides";
import { tx } from "../lib/i18n/tx";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };
const ICONS = {
  logo: <img src="/icon-192.png" alt="" width="72" height="72" style={{ borderRadius: 18 }} />,
  home: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>,
  train: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" /></svg>,
  log: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></svg>,
  food: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8M7 7h4" /><path d="M17 3c-2 2-2 6 0 8v10" /></svg>,
  progress: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><path d="M5 20V12M10 20V6M15 20v-9M20 20V9" /></svg>,
  coach: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><path d="M4 5h16v11H9l-5 4z" /><path d="M9 10h6" /></svg>,
  profile: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-5 15-5 16 0" /></svg>,
  lock: <svg viewBox="0 0 24 24" width="56" height="56" {...P}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>,
};

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const last = step === SLIDES.length - 1;
  const slide = SLIDES[step];
  const next = () => (last ? onFinish() : setStep((s) => s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, [step]);
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onFinish(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onFinish]);

  return (
    <div className="onboarding-screen" role="dialog" aria-modal="true" aria-label={tx("جولة التطبيق")}>
      <button type="button" className="onboarding-skip" onClick={onFinish}>{tx("تخطي")}</button>
      <div className="onboarding-slide" key={step} tabIndex={-1} ref={ref}>
        <div className="onboarding-illo">{ICONS[slide.icon]}</div>
        <h2 className="onboarding-title">{slide.title}</h2>
        <p className="onboarding-desc">{slide.desc}</p>
      </div>
      <div className="onboarding-count" dir="ltr">{step + 1} / {SLIDES.length}</div>
      <div className="onboarding-dots" aria-hidden="true">
        {SLIDES.map((_, i) => <span key={i} className={"onboarding-dot" + (i === step ? " active" : "")} />)}
      </div>
      <div className="onboarding-actions">
        {step > 0 && <button type="button" className="onboarding-back" onClick={back}>{tx("السابق")}</button>}
        <button type="button" className="onboarding-cta" onClick={next}>{last ? tx("يلا نبدأ") : tx("التالي")}</button>
      </div>
    </div>
  );
}
