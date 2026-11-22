import { describe, it, expect, beforeEach, vi } from "vitest";

let table = null; // fake remote row
let failAll = false;
vi.mock("../src/lib/supabaseClient", () => {
  const q = () => {
    const api = {
      select: () => api, eq: () => api,
      maybeSingle: async () => (failAll ? { data: null, error: { message: "relation does not exist" } } : { data: table, error: null }),
      upsert: async (row) => { if (failAll) return { error: { message: "nope" } }; table = { exercise_ids: row.exercise_ids, updated_ms: row.updated_ms }; return { error: null }; },
    };
    return api;
  };
  return { supabase: { from: () => q() } };
});

import Store from "../src/lib/store/gymakStore";
import { pushFavorites, pullFavorites } from "../src/lib/sync/domains";

describe("favourites sync (last write wins)", () => {
  beforeEach(() => { localStorage.clear(); table = null; failAll = false; Store.__resetForTests?.(); });

  it("toggles and persists locally", () => {
    const before = Store.getFavoriteIds().length;
    Store.toggleFavorite("ex-a");
    expect(Store.getFavoriteIds()).toContain("ex-a");
    Store.toggleFavorite("ex-a");
    expect(Store.getFavoriteIds().length).toBe(before);
  });

  it("pushes newer local state and skips when remote is newer", async () => {
    Store.toggleFavorite("ex-push");
    await pushFavorites("u1");
    expect(table.exercise_ids).toContain("ex-push");
    table = { exercise_ids: ["remote-only"], updated_ms: Date.now() + 100000 };
    await pushFavorites("u1");
    expect(table.exercise_ids).toEqual(["remote-only"]);
  });

  it("pull replaces local only when remote is strictly newer", async () => {
    Store.toggleFavorite("local-fav");
    table = { exercise_ids: ["old"], updated_ms: 1 };
    await pullFavorites("u1");
    expect(Store.getFavoriteIds()).toContain("local-fav");
    table = { exercise_ids: ["new-remote"], updated_ms: Date.now() + 100000 };
    await pullFavorites("u1");
    expect(Store.getFavoriteIds()).toEqual(["new-remote"]);
  });

  it("unfavourite on one device propagates", async () => {
    Store.toggleFavorite("x"); await pushFavorites("u1");
    table = { exercise_ids: [], updated_ms: Date.now() + 5000 };
    await pullFavorites("u1");
    expect(Store.getFavoriteIds()).toEqual([]);
  });

  it("never throws when the table is missing", async () => {
    failAll = true;
    Store.toggleFavorite("z");
    await expect(pushFavorites("u1")).resolves.toEqual({ dropped: 0 });
    await expect(pullFavorites("u1")).resolves.toEqual({ dropped: 0 });
  });

  it("rejects malformed remote rows", async () => {
    table = { exercise_ids: [123, null], updated_ms: Date.now() + 1000 };
    const r = await pullFavorites("u1");
    expect(r.dropped).toBe(1);
    expect(Store.getFavoriteIds()).not.toContain(123);
  });
});
