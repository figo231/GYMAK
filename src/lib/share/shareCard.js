/* Progress share cards drawn on a canvas (1080x1350, gold luxe look). No network, no deps. */
const W = 1080, H = 1350;

/** Pure: builds the card content from store-like data. */
export function weightCardData(entries, unit = "كجم", conv = (x) => x) {
  if (!entries || entries.length < 2) return null;
  const first = entries[0], last = entries[entries.length - 1];
  const diff = Math.round((conv(last.weight) - conv(first.weight)) * 10) / 10;
  const days = Math.max(1, Math.round((new Date(last.date) - new Date(first.date)) / 86400000));
  const lost = diff < 0;
  return {
    kind: "weight",
    title: lost ? "نزّلت من وزني" : diff > 0 ? "زوّدت في وزني" : "ثبّت وزني",
    big: `${diff > 0 ? "+" : ""}${diff}`.replace("-", "−"),
    unit,
    sub: `من ${Math.round(conv(first.weight) * 10) / 10} إلى ${Math.round(conv(last.weight) * 10) / 10} ${unit} في ${days} يوم`,
  };
}
export function prCardData(pr, unit = "كجم", conv = (x) => x) {
  if (!pr) return null;
  const w = Math.round(conv(pr.weight) * 10) / 10, p = Math.round(conv(pr.prevWeight) * 10) / 10;
  return {
    kind: "pr",
    title: "رقم قياسي جديد 🏆",
    big: `${w}`,
    unit,
    sub: `${pr.exerciseName}${p > 0 ? ` (كان ${p})` : ""}`,
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

export function drawCard(canvas, data, name = "") {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#14110a"); bg.addColorStop(1, "#2a2110");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 620);
  glow.addColorStop(0, "rgba(217,184,99,.28)"); glow.addColorStop(1, "rgba(217,184,99,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(217,184,99,.55)"; ctx.lineWidth = 4; ctx.strokeRect(40, 40, W - 80, H - 80);

  ctx.direction = "rtl"; ctx.textAlign = "center";
  ctx.fillStyle = "#d9b863"; ctx.font = "800 64px Tahoma, Arial, sans-serif";
  ctx.fillText("GYMAK", W / 2, 170);

  ctx.fillStyle = "#f6efdc"; ctx.font = "700 62px Tahoma, Arial, sans-serif";
  ctx.fillText(data.title, W / 2, 430);

  const g = ctx.createLinearGradient(0, 480, 0, 720);
  g.addColorStop(0, "#f3d98a"); g.addColorStop(1, "#b98a2e");
  ctx.fillStyle = g; ctx.font = "900 190px Tahoma, Arial, sans-serif";
  ctx.direction = "ltr";
  let size = 190;
  while (ctx.measureText(data.big).width > W - 160 && size > 80) { size -= 10; ctx.font = `900 ${size}px Tahoma, Arial, sans-serif`; }
  ctx.fillText(data.big, W / 2, 660);
  if (data.unit) { ctx.direction = "rtl"; ctx.fillStyle = "#d9b863"; ctx.font = "700 64px Tahoma, Arial, sans-serif"; ctx.fillText(data.unit, W / 2, 750); }

  ctx.direction = "rtl"; ctx.fillStyle = "#e8dfc6"; ctx.font = "500 46px Tahoma, Arial, sans-serif";
  wrap(ctx, data.sub, W - 200).slice(0, 3).forEach((l, i) => ctx.fillText(l, W / 2, 860 + i * 70));

  if (name) { ctx.fillStyle = "rgba(246,239,220,.8)"; ctx.font = "600 44px Tahoma, Arial, sans-serif"; ctx.fillText(name, W / 2, 1150); }
  ctx.fillStyle = "rgba(217,184,99,.8)"; ctx.font = "500 34px Tahoma, Arial, sans-serif";
  ctx.fillText("اتابع تمارينك وأكلك مع GYMAK", W / 2, 1230);
  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}
