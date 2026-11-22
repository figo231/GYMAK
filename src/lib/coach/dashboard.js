/* Pure helpers for the coach dashboard. A "report" is what traineeReport() returns. */
import { localISO } from "../dateKey";
export const DAY = 86400000;
const key = (d) => localISO(d);

export function daysSince(dateStr, now = new Date()) {
  if (!dateStr) return null;
  const a = new Date(`${dateStr}T00:00:00Z`), b = new Date(`${key(now)}T00:00:00Z`);
  return Math.max(0, Math.round((b - a) / DAY));
}

/** "ok" trains 4+/7 or trained within 2 days with 2+/7; "watch" has some activity; "risk" nothing for 5+ days or never. */
export function attention(r, now = new Date()) {
  if (!r || r.last7 === undefined) return "unknown";
  const since = daysSince(r.lastWorkout, now);
  if (since === null || since >= 5) return "risk";
  if (r.last7 >= 4 || (r.last7 >= 2 && since <= 2)) return "ok";
  return "watch";
}

export function summarize(links, reports, now = new Date()) {
  const active = links.filter((l) => l.status === "active" && l.trainee_id);
  const out = { active: active.length, pending: links.filter((l) => l.status === "pending").length, ok: 0, watch: 0, risk: 0, avgLast7: null };
  let sum = 0, n = 0;
  active.forEach((l) => {
    const r = reports[l.id];
    const a = attention(r, now);
    if (a in out) out[a]++;
    if (r && r.last7 !== undefined) { sum += r.last7; n++; }
  });
  out.avgLast7 = n ? Math.round((sum / n) * 10) / 10 : null;
  return out;
}

const ORDER = { risk: 0, watch: 1, unknown: 2, ok: 3 };
/** Active trainees needing attention first, then by name; pending invites last. */
export function sortTrainees(links, reports, now = new Date()) {
  const rank = (l) => (l.status === "active" ? ORDER[attention(reports[l.id], now)] ?? 2 : 9);
  const name = (l) => String(reports[l.id]?.name || l.trainee_email || "").toLowerCase();
  return links.slice().sort((a, b) => rank(a) - rank(b) || name(a).localeCompare(name(b)));
}

export function filterTrainees(links, reports, q) {
  const t = String(q || "").trim().toLowerCase();
  if (!t) return links;
  return links.filter((l) => `${l.trainee_email || ""} ${reports[l.id]?.name || ""}`.toLowerCase().includes(t));
}

/** Last n days as [{date, trained}] oldest first, for the activity strip. */
export function activityStrip(dayList, n = 30, now = new Date()) {
  const set = new Set(dayList || []);
  return Array.from({ length: n }, (_, i) => {
    const d = key(new Date(now.getTime() - (n - 1 - i) * DAY));
    return { date: d, trained: set.has(d) };
  });
}

/** Weight trend: points for a sparkline plus the total change. Null under 2 points. */
export function weightTrend(weights) {
  const w = (weights || []).filter((x) => Number.isFinite(x.weight));
  if (w.length < 2) return null;
  const vals = w.map((x) => x.weight), min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  return {
    points: w.map((x, i) => ({ x: i / (w.length - 1), y: 1 - (x.weight - min) / span })),
    change: Math.round((vals[vals.length - 1] - vals[0]) * 10) / 10,
  };
}
