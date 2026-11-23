// Display-only translations for data vocab (muscles, equipment, difficulty).
// Logic comparisons keep the Arabic values; these maps are applied at render
// time only, when the active language is English.
export const MUSCLE_EN = {
  "ذراعين": "Arms",
  "صدر": "Chest", "صدر علوي": "Upper chest", "صدر سفلي": "Lower chest",
  "صدر داخلي": "Inner chest", "صدر خارجي": "Outer chest",
  "ظهر": "Back", "ظهر علوي": "Upper back", "ظهر أوسط": "Mid back",
  "ظهر سفلي": "Lower back", "أسفل الظهر": "Lower back", "لاتس": "Lats",
  "أكتاف": "Shoulders", "أكتاف أمامية": "Front delts", "أكتاف جانبية": "Side delts",
  "أكتاف خلفية": "Rear delts", "ترابيس": "Traps",
  "بايسبس": "Biceps", "ترايسبس": "Triceps", "ساعد": "Forearms",
  "فخذ أمامي": "Quads", "فخذ خلفي": "Hamstrings", "فخذ داخلي": "Inner thighs",
  "فخذ خارجي": "Outer thighs", "مؤخرة": "Glutes", "سمانة": "Calves",
  "أرجل": "Legs", "أرجل خلفية": "Hamstrings",
  "بطن": "Abs", "بطن سفلي": "Lower abs", "بطن علوي": "Upper abs", "جوانب البطن": "Obliques",
  "كارديو": "Cardio",
};
export const EQUIPMENT_EN = {
  "بار": "Barbell", "دمبل": "Dumbbell", "كابل": "Cable", "وزن الجسم": "Bodyweight",
  "جهاز": "Machine", "دمبل/كيتل بل": "Dumbbell/Kettlebell", "بار EZ": "EZ bar",
  "عجلة": "Ab wheel", "سميث": "Smith machine", "قرص": "Plate",
};
export const DIFFICULTY_EN = { "مبتدئ": "Beginner", "متوسط": "Intermediate", "متقدم": "Advanced" };
export function muscleEn(ar) { return MUSCLE_EN[ar] || ar; }
export function equipmentEn(ar) { return EQUIPMENT_EN[ar] || ar; }
export function difficultyEn(ar) { return DIFFICULTY_EN[ar] || ar; }

export const GOAL_MODE_EN = {
  bulk: { label: "Bulking", tip: "A slight calorie surplus with enough protein. Focus on increasing your weights gradually." },
  cut: { label: "Cutting", tip: "A sensible calorie deficit with high protein so you keep your muscle." },
  tone: { label: "Toning", tip: "A small deficit with enough protein, plus resistance training so your body shapes up without extra weight loss." },
  glutes: { label: "Glute building", tip: "A small surplus with enough protein. Focus on hip thrusts and squats and add weight over time." },
  recomp: { label: "Recomp", tip: "Calories close to your maintenance with high protein. Minimal weight change while your shape improves." },
};
