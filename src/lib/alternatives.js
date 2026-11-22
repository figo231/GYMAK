// "Can't do this one? Try these": same primary muscle, ranked by overlap and easy access.
const EQUIP_RANK = { "وزن الجسم": 0, "دمبل": 1, "كابل": 2, "جهاز": 3, "بار": 4 };

export function findAlternatives(ex, all, { limit = 8 } = {}) {
  if (!ex) return [];
  const sec = (ex.secondary || "").split(/[،,/]/).map((x) => x.trim()).filter(Boolean);
  return (all || [])
    .filter((o) => o && o.id !== ex.id && o.muscle === ex.muscle)
    .map((o) => {
      const osec = (o.secondary || "").split(/[،,/]/).map((x) => x.trim()).filter(Boolean);
      const overlap = osec.filter((x) => sec.includes(x)).length;
      let score = overlap * 3;
      if (o.equipment && o.equipment !== ex.equipment) score += 2; // a real alternative, not a twin
      if (o.name && ex.name && o.name.split(" ")[0] === ex.name.split(" ")[0]) score += 1; // same movement family
      return { ex: o, score };
    })
    .sort((a, b) => b.score - a.score || (EQUIP_RANK[a.ex.equipment] ?? 9) - (EQUIP_RANK[b.ex.equipment] ?? 9) || (a.ex.name < b.ex.name ? -1 : 1))
    .map((x) => x.ex)
    .filter((o, i, arr) => arr.findIndex((p) => p.name === o.name && p.equipment === o.equipment) === i)
    .filter((o) => o.name !== ex.name || o.equipment !== ex.equipment)
    .slice(0, limit);
}

export function equipmentOptions(list) {
  const seen = [];
  list.forEach((o) => { if (o.equipment && !seen.includes(o.equipment)) seen.push(o.equipment); });
  return seen.sort((a, b) => (EQUIP_RANK[a] ?? 9) - (EQUIP_RANK[b] ?? 9));
}
