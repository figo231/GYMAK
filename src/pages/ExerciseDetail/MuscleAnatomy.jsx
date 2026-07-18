import Store from "../../lib/store/gymakStore";

/* Professional front/back anatomical muscle diagram — replaces the old
   stick-figure "move guide" animation. Every muscle group is its own
   filled shape so it can be individually highlighted:
     - primary muscle  -> full accent color
     - secondary muscle -> its own group color, dimmer
     - everything else -> a faint theme-aware neutral tone
   Fully static/flat (no animation), theme-aware (uses currentColor for
   the neutral base so it adapts to dark/light mode automatically). */

const NEUTRAL_OPACITY = 0.1;
const PRIMARY_OPACITY = 0.95;
const SECONDARY_OPACITY = 0.55;

function getPrimaryRegions(muscle, muscleLabel = "") {
  switch (muscle) {
    case "chest":
      return ["chest"];
    case "back":
      return ["lats_l", "lats_r", "traps_b", "lowerback"];
    case "shoulders":
      return ["delt_f_l", "delt_f_r", "delt_b_l", "delt_b_r"];
    case "legs":
      if (/خلفي|همسترنج|همسترينج/.test(muscleLabel)) return ["ham_l", "ham_r"];
      if (/سمانة|كالف/.test(muscleLabel)) return ["calf_l", "calf_r"];
      if (/مؤخرة/.test(muscleLabel)) return ["glute_l", "glute_r"];
      return ["quad_l", "quad_r"];
    case "arms":
      if (/ترايسبس/.test(muscleLabel)) return ["triceps_l", "triceps_r"];
      if (/ساعد/.test(muscleLabel)) return ["forearm_f_l", "forearm_f_r", "forearm_b_l", "forearm_b_r"];
      return ["biceps_l", "biceps_r"];
    case "core":
      return ["abs", "obl_l", "obl_r"];
    default:
      return ["chest"];
  }
}

const SECONDARY_RULES = [
  [/ترايسبس/, ["triceps_l", "triceps_r"], "arms"],
  [/بايسبس/, ["biceps_l", "biceps_r"], "arms"],
  [/ساعد/, ["forearm_f_l", "forearm_f_r", "forearm_b_l", "forearm_b_r"], "arms"],
  [/أرجل خلفية|همسترنج|همسترينج/, ["ham_l", "ham_r"], "legs"],
  [/سمانة/, ["calf_l", "calf_r"], "legs"],
  [/مؤخرة/, ["glute_l", "glute_r"], "legs"],
  [/أكتاف/, ["delt_f_l", "delt_f_r", "delt_b_l", "delt_b_r"], "shoulders"],
  [/ظهر/, ["lats_l", "lats_r", "traps_b"], "back"],
  [/صدر/, ["chest"], "chest"],
  [/بطن/, ["abs", "obl_l", "obl_r"], "core"],
];

function getSecondaryInfo(secondaryText) {
  if (!secondaryText) return null;
  for (const [re, regions, groupKey] of SECONDARY_RULES) {
    if (re.test(secondaryText)) {
      const meta = Store.getAllMuscles()[groupKey];
      return { regions: new Set(regions), color: meta ? meta.color : "var(--text-secondary)" };
    }
  }
  return null;
}

export default function MuscleAnatomy({ muscle, muscleLabel, secondary, color }) {
  const primary = new Set(getPrimaryRegions(muscle, muscleLabel));
  const secondaryInfo = getSecondaryInfo(secondary);

  function fillFor(id) {
    if (primary.has(id)) return { fill: color, fillOpacity: PRIMARY_OPACITY };
    if (secondaryInfo && secondaryInfo.regions.has(id) && !primary.has(id)) {
      return { fill: secondaryInfo.color, fillOpacity: SECONDARY_OPACITY };
    }
    return { fill: "currentColor", fillOpacity: NEUTRAL_OPACITY };
  }

  const F = fillFor; // shorthand

  return (
    <svg className="anatomy-diagram" viewBox="0 0 220 178" fill="none">
      {/* ---------- FRONT VIEW ---------- */}
      <g>
        <circle cx="45" cy="13" r="9" {...F("head")} />
        <rect x="40" y="20" width="10" height="7" rx="3" {...F("neck")} />
        <path d="M28 68 Q45 76 62 68 L60 82 Q45 87 30 82 Z" {...F("hip_f")} />
        <ellipse cx="24" cy="33" rx="7.2" ry="8" {...F("delt_f_l")} />
        <ellipse cx="66" cy="33" rx="7.2" ry="8" {...F("delt_f_r")} />
        <path d="M30 32 Q37.5 26 45 30 Q52.5 26 60 32 L60 47 Q52 53 45 49 Q38 53 30 47 Z" {...F("chest")} />
        <rect x="15" y="40" width="9" height="21" rx="4.2" {...F("biceps_l")} />
        <rect x="66" y="40" width="9" height="21" rx="4.2" {...F("biceps_r")} />
        <rect x="14" y="62" width="8" height="19" rx="4" {...F("forearm_f_l")} />
        <rect x="68" y="62" width="8" height="19" rx="4" {...F("forearm_f_r")} />
        <rect x="32" y="50" width="6" height="19" rx="3" {...F("obl_l")} />
        <rect x="52" y="50" width="6" height="19" rx="3" {...F("obl_r")} />
        <rect x="39" y="48" width="12" height="23" rx="3.5" {...F("abs")} />
        <line x1="45" y1="52" x2="45" y2="69" stroke="var(--media-bg)" strokeWidth="1" opacity="0.7" />
        <line x1="40" y1="57" x2="50" y2="57" stroke="var(--media-bg)" strokeWidth="1" opacity="0.5" />
        <line x1="40" y1="63" x2="50" y2="63" stroke="var(--media-bg)" strokeWidth="1" opacity="0.5" />
        <rect x="30" y="83" width="13" height="35" rx="6" {...F("quad_l")} />
        <rect x="47" y="83" width="13" height="35" rx="6" {...F("quad_r")} />
        <rect x="31" y="120" width="10" height="30" rx="5" {...F("shin_l")} />
        <rect x="49" y="120" width="10" height="30" rx="5" {...F("shin_r")} />
        <ellipse cx="36" cy="154" rx="7" ry="4" {...F("foot_f_l")} />
        <ellipse cx="54" cy="154" rx="7" ry="4" {...F("foot_f_r")} />
        <text x="45" y="171" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" opacity="0.55">أمامي</text>
      </g>

      {/* ---------- BACK VIEW ---------- */}
      <g transform="translate(130,0)">
        <circle cx="45" cy="13" r="9" {...F("head")} />
        <rect x="40" y="20" width="10" height="7" rx="3" {...F("neck")} />
        <path d="M33 22 L57 22 L64 41 Q45 47 26 41 Z" {...F("traps_b")} />
        <ellipse cx="24" cy="33" rx="7.2" ry="8" {...F("delt_b_l")} />
        <ellipse cx="66" cy="33" rx="7.2" ry="8" {...F("delt_b_r")} />
        <rect x="15" y="40" width="9" height="21" rx="4.2" {...F("triceps_l")} />
        <rect x="66" y="40" width="9" height="21" rx="4.2" {...F("triceps_r")} />
        <rect x="14" y="62" width="8" height="19" rx="4" {...F("forearm_b_l")} />
        <rect x="68" y="62" width="8" height="19" rx="4" {...F("forearm_b_r")} />
        <path d="M30 43 Q23.5 55 27.5 69 L37 65 Q34 53 38 43 Z" {...F("lats_l")} />
        <path d="M60 43 Q66.5 55 62.5 69 L53 65 Q56 53 52 43 Z" {...F("lats_r")} />
        <rect x="40" y="49" width="10" height="21" rx="3.5" {...F("lowerback")} />
        <ellipse cx="35" cy="87" rx="9" ry="9" {...F("glute_l")} />
        <ellipse cx="55" cy="87" rx="9" ry="9" {...F("glute_r")} />
        <rect x="29" y="97" width="12" height="27" rx="5.5" {...F("ham_l")} />
        <rect x="49" y="97" width="12" height="27" rx="5.5" {...F("ham_r")} />
        <rect x="31" y="126" width="10" height="24" rx="5" {...F("calf_l")} />
        <rect x="49" y="126" width="10" height="24" rx="5" {...F("calf_r")} />
        <ellipse cx="36" cy="154" rx="7" ry="4" {...F("foot_b_l")} />
        <ellipse cx="54" cy="154" rx="7" ry="4" {...F("foot_b_r")} />
        <text x="45" y="171" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" opacity="0.55">خلفي</text>
      </g>
    </svg>
  );
}
