import { useEffect, useRef, useState } from "react";
import Store from "../../lib/store/gymakStore";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { usePrompt } from "../../hooks/useDialog";
import { answerFor, welcomeMessage, resolveGoalAnswer } from "./answerEngine";

const SUGGESTION_CARDS = [
  {
    q: "اقترح برنامج",
    title: "اقترح برنامج تدريبي",
    desc: "خطة أسبوعية مناسبة لمستواك وهدفك",
    color: "var(--glow-blue)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
    ),
  },
  {
    q: "احسبلي سعرات: 2 بيضة ورغيف عيش بلدي وكوب لبن",
    title: "احسب سعرات وجبة",
    desc: "اكتب مكوّناتك واحنا نحسبها",
    color: "var(--success)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 3-2 4.2-2 7 0 1.7 1.3 3 3 3s3-1.3 3-3c1.5 1.5 2.5 3.6 2.5 5.8 0 3.6-2.9 6.7-6.5 6.7S5.5 19.4 5.5 15.8c0-2.6 1.2-4.4 2.4-6.1C9.2 7.7 10 5.3 12 2Z" /></svg>
    ),
  },
  {
    q: "حلل تقدمي",
    title: "حلل تقدمي",
    desc: "نظرة سريعة على أدائك الأخير",
    color: "var(--purple-text)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5M10 19v-8M16 19V9M22 19V3" /></svg>
    ),
  },
  {
    q: "عدّل هدفي",
    title: "عدّل هدفك",
    desc: "غيّر وزنك المستهدف في أي وقت",
    color: "var(--warn-text)",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="#fff" /></svg>
    ),
  },
];

const QUICK_PROMPTS = [
  { q: "اقترح برنامج", label: "📋 برنامج جديد" },
  { q: "نصايح غذائية", label: "🍽️ نصايح غذائية" },
  { q: "حلل تقدمي", label: "📊 حلل تقدمي" },
  { q: "عدّل هدفي", label: "🎯 عدّل هدفي" },
];

function TypingIndicator() {
  return (
    <div className="msg-row">
      <div className="msg-ic">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /></svg>
      </div>
      <div className="msg-bubble typing-bubble">
        <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
      </div>
    </div>
  );
}

export default function AiCoach() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef(null);
  const promptAsync = usePrompt();

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, thinking]);

  function addBotMsg(text) {
    setMessages((m) => [...m, { from: "bot", text }]);
  }
  function addMeMsg(text) {
    setMessages((m) => [...m, { from: "me", text }]);
  }

  async function handleUserText(q) {
    if (!q.trim()) return;
    addMeMsg(q);
    setThinking(true);
    setTimeout(async () => {
      const result = answerFor(q);
      if (result && typeof result === "object" && result.needsGoalPrompt) {
        const current = Store.getGoalWeight();
        const val = await promptAsync({ title: "اكتب وزنك المستهدف (كجم):", inputType: "number", defaultValue: current || "" });
        setThinking(false);
        addBotMsg(resolveGoalAnswer(val));
      } else {
        setThinking(false);
        addBotMsg(result);
      }
    }, 550);
  }

  function handleSend() {
    if (!input.trim()) return;
    handleUserText(input);
    setInput("");
  }

  const isEmpty = messages.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <DetailTopBar backTo="/profile" />
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px 10px" }}>
        <div className="coach-avatar">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /><path d="M9 10.5s1 1 3 1 3-1 3-1" /></svg>
        </div>
        <div className="coach-meta">
          <p className="coach-title">المدرّب الذكي</p>
          <div className="coach-status"><span className="status-dot" />متصل الآن</div>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {isEmpty ? (
          <div className="coach-empty">
            <div className="coach-empty-avatar">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /><path d="M9 10.5s1 1 3 1 3-1 3-1" /></svg>
            </div>
            <p className="coach-empty-title">أهلاً، أنا مدرّبك الذكي 💪</p>
            <p className="coach-empty-sub">{welcomeMessage()}</p>

            <div className="coach-suggest-grid">
              {SUGGESTION_CARDS.map((c) => (
                <div key={c.title} className="coach-suggest-card" onClick={() => handleUserText(c.q)} role="button">
                  <div className="coach-suggest-icon" style={{ background: c.color }}>{c.icon}</div>
                  <div className="coach-suggest-title">{c.title}</div>
                  <div className="coach-suggest-desc">{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div className={"msg-row" + (m.from === "me" ? " me" : "")} key={i}>
              {m.from === "bot" && (
                <div className="msg-ic">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /></svg>
                </div>
              )}
              {/* JSX text content — no innerHTML, so free-form user/bot text can never inject markup */}
              <div className="msg-bubble">{m.text}</div>
            </div>
          ))
        )}
        {thinking && <TypingIndicator />}
      </div>

      {!isEmpty && (
        <div className="quick-prompts">
          {QUICK_PROMPTS.map((p) => (
            <div className="qp-chip" key={p.q} onClick={() => handleUserText(p.q)} style={{ cursor: "pointer" }}>
              {p.label}
            </div>
          ))}
        </div>
      )}

      <div className="input-bar">
        <div className="glass input-field">
          <input
            type="text" placeholder="اسأل مدربك الذكي..." value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          />
        </div>
        <div className="send-btn" style={{ cursor: "pointer" }} onClick={handleSend}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 14-7-7 14-2-5-5-2Z" /></svg>
        </div>
      </div>
    </div>
  );
}
