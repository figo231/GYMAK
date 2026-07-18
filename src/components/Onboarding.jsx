import { useState } from "react";

const SLIDES = [
  {
    title: "سجّل تمارينك بسهولة",
    desc: "دوّن كل مجموعة ووزن وتكرار، وشوف تقدمك في كل تمرين أول بأول.",
    color: "var(--glow-blue)",
    illo: (
      <svg viewBox="0 0 120 120" width="150" height="150">
        <circle cx="60" cy="60" r="52" fill="url(#ob-g1)" />
        <rect x="34" y="42" width="12" height="36" rx="4" fill="#fff" opacity="0.95" />
        <rect x="74" y="42" width="12" height="36" rx="4" fill="#fff" opacity="0.95" />
        <rect x="46" y="54" width="28" height="12" rx="5" fill="#fff" opacity="0.8" />
        <defs><linearGradient id="ob-g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FF6B2C" /><stop offset="100%" stopColor="#7C3AED" /></linearGradient></defs>
      </svg>
    ),
  },
  {
    title: "تابع تقدمك بالأرقام",
    desc: "رسومات بيانية واضحة لوزنك وقوتك وسعراتك، عشان تعرف فعلاً بتتحسن ولا لأ.",
    color: "var(--success)",
    illo: (
      <svg viewBox="0 0 120 120" width="150" height="150">
        <circle cx="60" cy="60" r="52" fill="url(#ob-g2)" />
        <path d="M32 78V64M50 78V50M68 78V58M86 78V38" stroke="#fff" strokeWidth="9" strokeLinecap="round" opacity="0.95" />
        <defs><linearGradient id="ob-g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#22C55E" /><stop offset="100%" stopColor="#0EA5E9" /></linearGradient></defs>
      </svg>
    ),
  },
  {
    title: "مدرّبك الذكي معاك دايمًا",
    desc: "اسأل عن برامج تدريب، احسب سعرات وجبتك، واستقبل نصايح مخصصة ليك.",
    color: "var(--purple-text)",
    illo: (
      <svg viewBox="0 0 120 120" width="150" height="150">
        <circle cx="60" cy="60" r="52" fill="url(#ob-g3)" />
        <rect x="34" y="40" width="52" height="34" rx="12" fill="#fff" opacity="0.95" />
        <path d="M46 74v10l14-10" fill="#fff" opacity="0.95" />
        <circle cx="48" cy="57" r="4" fill="#7C3AED" />
        <circle cx="60" cy="57" r="4" fill="#7C3AED" />
        <circle cx="72" cy="57" r="4" fill="#7C3AED" />
        <defs><linearGradient id="ob-g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#A855F7" /><stop offset="100%" stopColor="#EC4899" /></linearGradient></defs>
      </svg>
    ),
  },
];

export default function Onboarding({ onFinish }) {
  const [step, setStep] = useState(0);
  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];

  return (
    <div className="onboarding-screen">
      <div className="onboarding-skip" onClick={onFinish} role="button">تخطي</div>

      <div className="onboarding-slide" key={step}>
        <div className="onboarding-illo">{slide.illo}</div>
        <p className="onboarding-title">{slide.title}</p>
        <p className="onboarding-desc">{slide.desc}</p>
      </div>

      <div className="onboarding-dots">
        {SLIDES.map((_, i) => (
          <span key={i} className={"onboarding-dot" + (i === step ? " active" : "")} />
        ))}
      </div>

      <div
        className="onboarding-cta"
        style={{ background: `linear-gradient(135deg, var(--glow-blue), var(--glow-purple))` }}
        onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
        role="button"
      >
        {isLast ? "يلا نبدأ" : "التالي"}
      </div>
    </div>
  );
}
