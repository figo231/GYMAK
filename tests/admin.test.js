import { describe, it, expect } from "vitest";
import { validateReply, countByStatus, filterFeedback, fetchFeedback, replyFeedback, fetchStats } from "../src/lib/admin";

function fakeClient(tables) {
  const calls = [];
  const q = (name) => {
    const st = { name, filters: [], upd: null };
    const chain = {
      select() { return chain; }, order() { return chain; }, limit() { return chain; }, in() { return chain; },
      eq(c, v) { st.filters.push([c, v]); return chain; }, gte() { return chain; },
      update(v) { st.upd = v; calls.push({ name, upd: v }); return chain; },
      then(res, rej) { return Promise.resolve(st.upd ? { error: tables.updateError || null } : { data: tables[name] || [], error: null, count: (tables[name] || []).length }).then(res, rej); },
    };
    return chain;
  };
  return { from: q, calls };
}
describe("admin helpers", () => {
  it("validates replies", () => {
    expect(validateReply("  ").ok).toBe(false);
    expect(validateReply("x".repeat(2001)).ok).toBe(false);
    expect(validateReply(" شكرًا ").text).toBe("شكرًا");
  });
  it("counts and filters", () => {
    const rows = [{ status: "new" }, { status: "new" }, { status: "read" }, { status: "replied" }, { status: "weird" }];
    expect(countByStatus(rows)).toEqual({ new: 2, read: 1, replied: 1 });
    expect(filterFeedback(rows, "all")).toHaveLength(5);
    expect(filterFeedback(rows, "new")).toHaveLength(2);
  });
  it("joins names; falls back to generic label", async () => {
    const c = fakeClient({ feedback: [{ id: "1", user_id: "u1", message: "m" }, { id: "2", user_id: "u2", message: "n" }], profiles: [{ id: "u1", name: "سارة" }] });
    const r = await fetchFeedback(c);
    expect(r.map((x) => x.who)).toEqual(["سارة", "مستخدم"]);
  });
  it("reply writes text, timestamp and status=replied", async () => {
    const c = fakeClient({});
    const res = await replyFeedback("1", "تمام", c);
    expect(res.ok).toBe(true);
    expect(c.calls[0].upd).toMatchObject({ admin_reply: "تمام", status: "replied" });
    expect(c.calls[0].upd.replied_at).toBeTruthy();
    expect((await replyFeedback("1", "", c)).ok).toBe(false);
    expect((await replyFeedback("1", "x", fakeClient({ updateError: { message: "no" } }))).ok).toBe(false);
  });
  it("stats tolerate failures", async () => {
    const s = await fetchStats(fakeClient({ profiles: [1, 2, 3] }));
    expect(s.total).toBe(3);
  });
});
