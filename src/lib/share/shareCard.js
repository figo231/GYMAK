import { tx, txf } from "../i18n/tx";
/* Progress share cards drawn on a canvas (1080x1350, dark + ember). No network, no deps. */
const W = 1080, H = 1350;

/** Pure: builds the card content from store-like data. */
export function weightCardData(entries, unit = tx("كجم"), conv = (x) => x) {
  if (!entries || entries.length < 2) return null;
  const first = entries[0], last = entries[entries.length - 1];
  const diff = Math.round((conv(last.weight) - conv(first.weight)) * 10) / 10;
  const days = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 86400000));
  const lost = diff < 0;
  return {
    kind: "weight",
    title: lost ? tx("نزّلت من وزني") : diff > 0 ? tx("زوّدت في وزني") : tx("ثبّت وزني"),
    big: `${diff > 0 ? "+" : ""}${diff}`.replace("-", "−"),
    unit,
    sub: txf(`من {0} إلى {1} {2} في {3} يوم`, [Math.round(conv(first.weight) * 10) / 10, Math.round(conv(last.weight) * 10) / 10, unit, days]),
  };
}
export function prCardData(pr, unit = tx("كجم"), conv = (x) => x) {
  if (!pr) return null;
  const w = Math.round(conv(pr.weight) * 10) / 10, p = Math.round(conv(pr.prevWeight) * 10) / 10;
  return {
    kind: "pr",
    title: tx("رقم قياسي جديد 🏆"),
    big: `${w}`,
    unit,
    sub: txf(`{0}{1}`, [pr.exerciseName, p > 0 ? txf(` (كان {0})`, [p]) : ""]),
  };
}

export function achievementCardData(a) {
  if (!a || !a.unlocked) return null;
  return {
    kind: "badge",
    title: tx("وسام افتُتح 🏅"),
    big: a.name,
    unit: "",
    sub: tx("صفحة الإنجازات في GYMAK"),
  };
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(" "); const lines = []; let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

const FONT = "GymakSans, Tahoma, Arial, sans-serif";
const EMBER = "#FF6A1A";

export function drawCard(canvas, data, name = "") {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0B0C0F"; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 640, 40, W / 2, 640, 700);
  glow.addColorStop(0, "rgba(255,106,26,.30)"); glow.addColorStop(1, "rgba(255,106,26,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  // ember edge bars
  ctx.fillStyle = EMBER; ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, H - 14, W, 14);
  ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 3; ctx.strokeRect(48, 48, W - 96, H - 96);

  ctx.direction = "ltr"; ctx.textAlign = "center";
  ctx.fillStyle = EMBER; ctx.font = `800 60px ${FONT}`;
  ctx.fillText("GYMAK", W / 2, 170);

  ctx.direction = "rtl";
  ctx.fillStyle = "#F4F1EA"; ctx.font = `700 62px ${FONT}`;
  ctx.fillText(data.title, W / 2, 430);

  const g = ctx.createLinearGradient(0, 480, 0, 720);
  g.addColorStop(0, "#FF8A3D"); g.addColorStop(1, "#F2500C");
  ctx.fillStyle = g;
  ctx.direction = "ltr";
  let size = 200; ctx.font = `800 ${size}px ${FONT}`;
  while (ctx.measureText(data.big).width > W - 160 && size > 80) { size -= 10; ctx.font = `800 ${size}px ${FONT}`; }
  ctx.fillText(data.big, W / 2, 660);
  if (data.unit) { ctx.direction = "rtl"; ctx.fillStyle = "#F4F1EA"; ctx.font = `700 60px ${FONT}`; ctx.fillText(data.unit, W / 2, 750); }

  ctx.direction = "rtl"; ctx.fillStyle = "rgba(244,241,234,.75)"; ctx.font = `500 44px ${FONT}`;
  wrap(ctx, data.sub, W - 200).slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, 860 + i * 70));

  if (name) { ctx.fillStyle = "#F4F1EA"; ctx.font = `600 44px ${FONT}`; ctx.fillText(name, W / 2, 1150); }
  ctx.fillStyle = "rgba(244,241,234,.5)"; ctx.font = `500 32px ${FONT}`;
  ctx.fillText(tx("اتابع تمارينك وأكلك مع GYMAK"), W / 2, 1230);
  return canvas;
}

/** Before/after card: two images side by side. imgs are loaded Image/ImageBitmap objects. */
export function drawBeforeAfter(canvas, before, after, meta = {}) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0B0C0F"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = EMBER; ctx.fillRect(0, 0, W, 14); ctx.fillRect(0, H - 14, W, 14);
  const pw = (W - 120 - 24) / 2, ph = 860, y = 200;
  const cover = (img, x) => {
    const iw = img.width, ih = img.height, sc = Math.max(pw / iw, ph / ih);
    const sw = pw / sc, sh = ph / sc;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, pw, ph); ctx.clip();
    ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, pw, ph); ctx.restore();
  };
  // RTL reading: "before" on the right
  cover(before, 60 + pw + 24); cover(after, 60);
  ctx.textAlign = "center"; ctx.direction = "rtl";
  ctx.fillStyle = EMBER; ctx.font = `800 56px ${FONT}`; ctx.fillText("GYMAK", W / 2, 120);
  ctx.fillStyle = "#F4F1EA"; ctx.font = `700 48px ${FONT}`;
  ctx.fillText(tx("قبل"), 60 + pw + 24 + pw / 2, y + ph + 70); ctx.fillText(tx("بعد"), 60 + pw / 2, y + ph + 70);
  ctx.font = `500 38px ${FONT}`; ctx.fillStyle = "rgba(244,241,234,.7)";
  if (meta.sub) ctx.fillText(meta.sub, W / 2, y + ph + 150);
  ctx.fillStyle = "rgba(244,241,234,.45)"; ctx.font = `500 30px ${FONT}`;
  ctx.fillText(tx("اتابع تمارينك وأكلك مع GYMAK"), W / 2, H - 50);
  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}
