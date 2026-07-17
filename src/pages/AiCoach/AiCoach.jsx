import { useEffect, useRef, useState } from "react";
import Store from "../../lib/store/gymakStore";
import { DetailTopBar } from "../../components/layout/DetailShell";
import { usePrompt } from "../../hooks/useDialog";
import { answerFor, welcomeMessage, resolveGoalAnswer } from "./answerEngine";

const QUICK_PROMPTS = [
  { q: "اقترح برنامج", label: "📋 اقترح برنامج جديد" },
  { q: "احسبلي سعرات: 2 بيضة ورغيف عيش بلدي وكوب لبن", label: "🍳 احسبلي سعرات وجبة" },
  { q: "نصايح غذائية", label: "🍽️ نصايح غذائية" },
  { q: "حلل تقدمي", label: "📊 حلل تقدمي" },
  { q: "عدّل هدفي", label: "🎯 عدّل هدفي" },
];

export default function AiCoach() {
  const [messages, setMessages] = useState(() => [{ from: "bot", text: welcomeMessage() }]);
  const [input, setInput] = useState("");
  const bodyRef = useRef(null);
  const promptAsync = usePrompt();

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  function addBotMsg(text) {
    setMessages((m) => [...m, { from: "bot", text }]);
  }
  function addMeMsg(text) {
    setMessages((m) => [...m, { from: "me", text }]);
  }

  async function handleUserText(q) {
    if (!q.trim()) return;
    addMeMsg(q);
    setTimeout(async () => {
      const result = answerFor(q);
      if (result && typeof result === "object" && result.needsGoalPrompt) {
        const current = Store.getGoalWeight();
        const val = await promptAsync({ title: "اكتب وزنك المستهدف (كجم):", inputType: "number", defaultValue: current || "" });
        addBotMsg(resolveGoalAnswer(val));
      } else {
        addBotMsg(result);
      }
    }, 300);
  }

  function handleSend() {
    handleUserText(input);
    setInput("");
  }

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
        {messages.map((m, i) => (
          <div className={"msg-row" + (m.from === "me" ? " me" : "")} key={i}>
            {m.from === "bot" && (
              <div className="msg-ic">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" /><path d="M6 21v-1a6 6 0 0 1 12 0v1" /></svg>
              </div>
            )}
            {/* JSX text content — no innerHTML, so free-form user/bot text can never inject markup */}
            <div className="msg-bubble">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="quick-prompts">
        {QUICK_PROMPTS.map((p) => (
          <div className="qp-chip" key={p.q} onClick={() => handleUserText(p.q)} style={{ cursor: "pointer" }}>
            {p.label}
          </div>
        ))}
      </div>

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
