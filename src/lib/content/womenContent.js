import { WOMEN_GYM_EXPANSION_MORE, WOMEN_GYM_EXPANSION_MORE_EN } from "./gymExpansionMore";
import {WOMEN_GYM_EXPANSION,WOMEN_GYM_EXPANSION_EN} from "./gymExpansion";
// Women-specific built-in content. Everything here carries only: "female" and
// is hidden from every other user at read time (the store filters on `only`).
// Stored data is never touched: these are plain built-in seeds, like the rest.

const ex = (id, name, muscle, muscleLabel, secondary, sets, reps, equipment, difficulty, description, instructions, extra = {}) => ({
  id, name, muscle, muscleLabel, secondary, sets, reps, custom: false, equipment, difficulty, description, instructions, only: "female",
  venue: equipment === "وزن الجسم" ? "home" : "gym", ...extra,
});

export const WOMEN_EXERCISES = [
  ...WOMEN_GYM_EXPANSION,
  ...WOMEN_GYM_EXPANSION_MORE,
  {"id": "w-hip-thrust", "name": "هيب ثراست بالبار", "muscle": "legs", "muscleLabel": "مؤخرة", "secondary": "فخذ خلفي", "sets": 3, "reps": 10, "equipment": "بار", "difficulty": "متوسط", "description": "دفع الحوض بالبار لتقوية الأرداف. ابدئي بوزن خفيف مع مدربة لو الحركة جديدة.", "instructions": ["ثبتي أعلى الظهر على بنش ثابت وحطي وسادة تحت البار على الحوض.", "ثبتي القدمين واشدي البطن وخلي الذقن للداخل.", "ارفعي الحوض لحد ما يبقى في خط الجسم من غير تقويس أسفل الظهر.", "انزلي بتحكم، ووقفي لو فيه ألم."], "custom": false, "only": "female", "venue": "gym"},
  {"id": "w-cable-kickback", "name": "ركل خلفي بالكابل", "muscle": "legs", "muscleLabel": "مؤخرة", "secondary": "فخذ خلفي", "sets": 3, "reps": 12, "equipment": "كابل", "difficulty": "مبتدئ", "description": "عزل للأرداف بالكابل، التكرارات لكل رجل.", "instructions": ["ثبتي حزام الكاحل في بكرة منخفضة وامسكي الجهاز للتوازن.", "اثني ركبة الارتكاز شوية واشدي البطن.", "ادفعي الرجل للخلف بمدى مريح من غير تقويس الظهر أو لف الحوض.", "ارجعي ببطء وبدلي الرجل بعد التكرارات."], "custom": false, "only": "female", "venue": "gym"},
  {"id": "w-bulgarian-split-squat", "name": "بلغاريان سبليت سكوات", "muscle": "legs", "muscleLabel": "فخذ أمامي", "secondary": "مؤخرة", "sets": 3, "reps": 8, "equipment": "دمبل", "difficulty": "متوسط", "description": "سكوات أحادي الرجل للتوازن وتقوية الأرداف والفخذ. ابدئي من غير أوزان.", "instructions": ["حطي ظهر القدم الخلفية على بنش منخفض وثابت، والأمامية بعيدة بما يكفي للتوازن.", "انزلي بالحوض لأسفل مع ميل بسيط للجذع وظهر محايد.", "خلي الركبة الأمامية في اتجاه أصابع القدم، وانزلي بمدى مريح.", "ادفعي بالقدم الأمامية واطلعي بتحكم ثم بدلي الرجل."], "custom": false, "only": "female", "venue": "gym"},
  {"id": "w-glute-leg-press", "name": "ليج برس بتركيز الأرداف", "muscle": "legs", "muscleLabel": "فخذ أمامي", "secondary": "مؤخرة", "sets": 3, "reps": 12, "equipment": "جهاز", "difficulty": "مبتدئ", "description": "ليج برس بمدى حركة متحكم فيه للأرجل والأرداف.", "instructions": ["اضبطي المقعد وثبتي الضهر والحوض على الوسادة.", "حطي القدمين أعلى المنصة قليلًا بعرض مريح، من غير رفع الكعبين.", "اثني الركبتين ببطء لمدى الحوض فيه يفضل ثابت ومش بيلف.", "ادفعي من غير قفل الركبتين بالكامل، وما تنزليش لمدى يرفع ضهرك."], "custom": false, "only": "female", "venue": "gym"},
  {"id": "w-hip-abductor", "name": "فتح الفخذ على الجهاز", "muscle": "legs", "muscleLabel": "فخذ خارجي", "secondary": "مؤخرة", "sets": 3, "reps": 15, "equipment": "جهاز", "difficulty": "مبتدئ", "description": "تقوية جانبي الأرداف على جهاز فتح الفخذ.", "instructions": ["اضبطي الوسادات على الجزء الخارجي من الفخذين واختاري وزن خفيف.", "اجلسي بثبات والظهر مدعوم والقدمين في مكانهما.", "افتحي الفخذين لمدى مريح من غير هز الجسم.", "ارجعي ببطء من غير خبط الأوزان."], "custom": false, "only": "female", "venue": "gym"},
  ex("donkey-kicks", "دونكي كيك (ركل خلفي)", "legs", "مؤخرة", "فخذ خلفي", 3, 15, "وزن الجسم", "مبتدئ",
    "تمرين بيشدّ وبيشكّل الأرداف من وضع الزحف، ومن غير أي معدات.",
    ["ابدأ على أربع: اليدين تحت الكتفين والركبتين تحت الحوض.", "شد عضلات البطن وخلي الظهر مستقيم.", "ارفع رجل لورا والركبة مثنية لحد ما الفخذ يبقى في خط الظهر.", "اضغط الأرداف فوق لثانية وانزل ببطء، وكرر وبعدين بدّل الرجل."]),
  ex("fire-hydrant", "فاير هيدرانت (فتح الفخذ جانبًا)", "legs", "فخذ خارجي ومؤخرة", "", 3, 15, "وزن الجسم", "مبتدئ",
    "بيشغّل الأرداف الجانبية والفخذ الخارجي وبيثبّت الحوض.",
    ["ابدأ على أربع والظهر مستقيم.", "ارفع الركبة للجنب والركبة مثنية، من غير ما تلف الحوض.", "اثبت لثانية فوق.", "انزل ببطء وكرر، وبعدين بدّل الرجل."]),
  ex("side-lying-leg-raise", "رفع الرجل جانبًا (نايمة)", "legs", "فخذ خارجي ومؤخرة", "", 3, 15, "وزن الجسم", "مبتدئ",
    "حركة هادية بتشدّ الفخذ الخارجي وجانب الأرداف.",
    ["اتمددي على جنبك والجسم في خط مستقيم.", "ارفعي الرجل اللي فوق لحد ما تحسي بشد في الجنب.", "انزلي ببطء من غير ما الحوض يتحرك.", "كرري وبعدين اقلبي على الجنب التاني."]),
  ex("inner-thigh-lift", "رفع الفخذ الداخلي (نايمة)", "legs", "فخذ داخلي", "", 3, 15, "وزن الجسم", "مبتدئ",
    "بيستهدف الفخذ الداخلي اللي بيصعب تشغيله في التمارين العادية.",
    ["اتمددي على جنبك وثني الرجل اللي فوق وحطيها قدام الجسم.", "ارفعي الرجل اللي تحت لفوق وهي مفرودة.", "اثبتي لثانية وانتي حاسة بشد في الفخذ الداخلي.", "انزلي ببطء وكرري، وبعدين بدّلي الجنب."]),
  ex("sumo-squat-db", "سكوات سومو بدمبل", "legs", "فخذ داخلي ومؤخرة", "فخذ أمامي", 3, 12, "دمبل", "مبتدئ",
    "سكوات بوقفة واسعة بيركز على الفخذ الداخلي والأرداف.",
    ["قفي برجليك أوسع من الكتفين وأطراف القدم لبرة شوية.", "امسكي دمبل بإيديكي قدام الحوض.", "انزلي لحد ما الفخذ يبقى موازي للأرض والظهر مستقيم.", "ادفعي بالكعبين وشدي الأرداف وانتي طالعة."], { venue: "home" }),
  ex("curtsy-lunge", "كيرتسي لانج", "legs", "فخذ خارجي ومؤخرة", "فخذ أمامي", 3, 10, "وزن الجسم", "متوسط",
    "لانج بخطوة للخلف وللجنب، ممتاز لتشكيل الأرداف والفخذ الخارجي.",
    ["قفي ورجليك بعرض الحوض.", "اعملي خطوة بالرجل اليمين لورا وعبر الرجل الشمال كأنك بتعملي انحناءة.", "انزلي لحد ما الركبة الأمامية تبقى 90 درجة والصدر مرفوع.", "ارجعي للوقوف وكرري، وبعدين بدّلي الرجل."]),
  ex("single-leg-glute-bridge", "جلوت بريدج برجل واحدة", "legs", "مؤخرة", "فخذ خلفي", 3, 12, "وزن الجسم", "متوسط",
    "نسخة أصعب من الجسر، بتشغّل كل ناحية من الأرداف لوحدها.",
    ["اتمددي على ضهرك والركبتين مثنية والقدمين على الأرض.", "ارفعي رجل مفرودة لفوق.", "ادفعي بكعب الرجل التانية وارفعي الحوض لأعلى.", "اضغطي الأرداف فوق ثانيتين وانزلي ببطء، وبدّلي الرجل."]),
  ex("frog-pump", "فروج بامب", "legs", "مؤخرة", "", 3, 20, "وزن الجسم", "مبتدئ",
    "بيحرق الأرداف بعدد تكرارات كبير من غير وزن.",
    ["اتمددي على ضهرك وضمي باطن القدمين مع بعض والركبتين مفتوحتين.", "قربي الكعبين من الحوض.", "ارفعي الحوض بقوة واضغطي الأرداف.", "انزلي من غير ما تلمسي الأرض تمامًا وكرري بسرعة هادية."]),
  ex("step-up-db", "صعود الدرجة بدمبل", "legs", "فخذ ومؤخرة", "", 3, 10, "دمبل", "متوسط",
    "حركة بتبني الأرداف والأرجل وبتحسّن التوازن، وبتحتاج درجة تمرين ثابتة.",
    ["امسكي دمبل في كل إيد وقفي قدام درجة تمرين ثابتة.", "حطي رجل كاملة على الدرجة.", "اصعدي بالضغط على كعب الرجل اللي فوق مع شد الأرداف.", "انزلي ببطء وكرري، وبعدين بدّلي الرجل."], { venue: "home" }),
  ex("wall-sit", "ثبات على الحيطة (Wall Sit)", "legs", "فخذ أمامي", "مؤخرة", 3, 30, "وزن الجسم", "مبتدئ",
    "ثبات ساكن بيحرق الفخذ والأرداف، وبيتعد بالثواني.",
    ["ضهرك على الحيطة والقدمين قدامك بعرض الكتفين.", "انزلي لحد ما الركبتين يبقوا 90 درجة.", "ثبتي الوضع والظهر ملزوق في الحيطة.", "اعدي المدة المطلوبة وبعدين قومي ببطء."], { unit: "sec" }),
  ex("knee-pushup", "ضغط على الركبة", "chest", "صدر", "ترايسبس", 3, 10, "وزن الجسم", "مبتدئ",
    "نسخة أسهل من الضغط، مناسبة للبداية وبتبني قوة الجزء العلوي.",
    ["ابدأي على أربع والركبتين على الأرض واليدين أعرض من الكتفين.", "اشدي البطن وخلي الجسم خط مستقيم من الركبة للراس.", "انزلي بالصدر لحد ما يقرب من الأرض.", "ادفعي لفوق حتى فرد الذراعين."]),
  ex("bird-dog", "بيرد دوج", "core", "بطن", "ظهر سفلي", 3, 12, "وزن الجسم", "مبتدئ",
    "بيقوّي الكور والظهر وبيحسّن التوازن، ومناسب للمبتدئات مع أداء مريح.",
    ["ابدأي على أربع والظهر مستقيم.", "مدّي إيد قدام ورجل عكسها لورا في نفس الوقت.", "ثبتي ثانيتين من غير ما الحوض يتحرك.", "ارجعي وبدّلي الجنب."]),
  ex("standing-oblique-crunch", "كرانش جانبي واقف", "core", "بطن جانبي", "", 3, 15, "وزن الجسم", "مبتدئ",
    "بيشغّل جوانب البطن لتقوية عضلات الجذع، مع الحفاظ على الرقبة مرتاحة.",
    ["قفي برجليك بعرض الكتفين وإيديكي ورا راسك.", "ارفعي ركبة للجنب وقرّبي الكوع منها.", "اشدي جنب البطن وانتي بتعملي كده.", "انزلي وكرري، وبعدين بدّلي الجنب."]),
];

// Program days: ids refer to built-in exercises (shared + women-only).
export const WOMEN_TEMPLATES = {
  "w-beginner-start": [
    { title: "جسم كامل خفيف", exerciseIds: ["goblet-squat", "knee-pushup", "frog-pump", "bird-dog", "plank"] },
    { title: "أرداف وبطن", exerciseIds: ["donkey-kicks", "fire-hydrant", "frog-pump", "standing-oblique-crunch"] },
    { title: "أرجل وكور", exerciseIds: ["wall-sit", "sumo-squat-db", "inner-thigh-lift", "bird-dog", "crunch"] },
  ],
  "w-home-glutes": [
    { title: "أرداف بدون معدات", exerciseIds: ["donkey-kicks", "fire-hydrant", "frog-pump", "single-leg-glute-bridge"] },
    { title: "فخذ وتشكيل", exerciseIds: ["wall-sit", "curtsy-lunge", "side-lying-leg-raise", "inner-thigh-lift"] },
    { title: "أرداف وكور", exerciseIds: ["donkey-kicks", "frog-pump", "bird-dog", "plank", "standing-oblique-crunch"] },
  ],
  "w-tone-body": [
    { title: "سفلي: أرداف وفخذ", exerciseIds: ["sumo-squat-db", "curtsy-lunge", "single-leg-glute-bridge", "inner-thigh-lift"] },
    { title: "علوي خفيف", exerciseIds: ["knee-pushup", "dumbbell-shoulder-press", "lateral-raise", "one-arm-dumbbell-row", "plank"] },
    { title: "سفلي: ثبات وتحمل", exerciseIds: ["step-up-db", "wall-sit", "fire-hydrant", "donkey-kicks", "standing-oblique-crunch"] },
    { title: "كور ووسط", exerciseIds: ["bird-dog", "standing-oblique-crunch", "plank", "crunch", "flutter-kicks"] },
  ],
  "w-hips-thighs": [
    { title: "أرداف بالدمبل", exerciseIds: ["w-hip-thrust", "sumo-squat-db", "step-up-db", "w-cable-kickback"] },
    { title: "علوي وكور", exerciseIds: ["lat-pulldown", "dumbbell-shoulder-press", "seated-cable-row", "lateral-raise", "plank"] },
    { title: "فخذ وأرداف", exerciseIds: ["goblet-squat", "curtsy-lunge", "dumbbell-lunges", "inner-thigh-lift", "calf-raise"] },
    { title: "أرداف وثبات", exerciseIds: ["single-leg-glute-bridge", "frog-pump", "fire-hydrant", "wall-sit"] },
  ],
  "w-gym-glutes": [
    { title: "أرداف تقيلة", exerciseIds: ["w-hip-thrust", "w-glute-leg-press", "w-cable-kickback", "w-hip-abductor", "lying-leg-curl"] },
    { title: "علوي", exerciseIds: ["lat-pulldown", "dumbbell-shoulder-press", "seated-cable-row", "lateral-raise", "tricep-pushdown"] },
    { title: "أرجل وأرداف", exerciseIds: ["w-bulgarian-split-squat", "sumo-squat-db", "w-hip-abductor", "calf-raise", "cable-crunch"] },
    { title: "أرداف وحجم", exerciseIds: ["w-hip-thrust", "step-up-db", "single-leg-glute-bridge", "w-cable-kickback", "crunch"] },
  ],
};

export const WOMEN_PROGRAMS = [
  { id: "w-beginner-start", goal: "fitness", name: "بداية للبنات", level: "مبتدئ", daysPerWeek: "3 أيام / أسبوع", only: "female",
    dayChips: ["جسم كامل خفيف", "أرداف وبطن", "أرجل وكور"],
    desc: "أول خطوة مظبوطة لو لسه بتبدأي. تمارين بسيطة ومتدرجة بوزن الجسم وشوية دمبل، بتبني القوة والثبات وتجهزك للبرامج الأقوى." },
  { id: "w-home-glutes", goal: "fitness", name: "أرداف في البيت", level: "مبتدئ", daysPerWeek: "3 أيام / أسبوع", only: "female",
    dayChips: ["أرداف بدون معدات", "فخذ وتشكيل", "أرداف وكور"],
    desc: "برنامج للبيت من غير أي معدات، بيركز على الأرداف والفخذ مع يوم كور. مناسب لو مش بتروحي جيم." },
  { id: "w-tone-body", goal: "fitness", name: "تشكيل الجسم", level: "مبتدئ", daysPerWeek: "4 أيام / أسبوع", only: "female",
    dayChips: ["سفلي: أرداف وفخذ", "علوي خفيف", "سفلي: ثبات وتحمل", "كور ووسط"],
    desc: "برنامج متوازن لتشكيل الجسم كله: أرداف وفخذ، علوي خفيف، وكور ووسط. بدمبل خفيف ووزن الجسم." },
  { id: "w-hips-thighs", goal: "fitness", name: "هيبس وفخاد", level: "متوسط", daysPerWeek: "4 أيام / أسبوع", only: "female",
    dayChips: ["أرداف بالدمبل", "علوي وكور", "فخذ وأرداف", "أرداف وثبات"],
    desc: "لو عندك أساس وعايزة تقدمي خطوة: تمارين جيم بالكابل والبار والدمبل مع حركات أحادية الجنب لتقوية الأرداف والفخذ." },
  { id: "w-gym-glutes", goal: "fitness", name: "أرداف بالجيم", level: "متوسط", daysPerWeek: "4 أيام / أسبوع", only: "female",
    dayChips: ["أرداف تقيلة", "علوي", "أرجل وأرداف", "أرداف وحجم"],
    desc: "برنامج جيم لبناء الأرداف: هيب ثراست وليج برس وكابل مع يوم علوي. زوّدي الأوزان تدريجيًا." },
];

export const WOMEN_EXERCISES_EN = {
  ...WOMEN_GYM_EXPANSION_EN,
  ...WOMEN_GYM_EXPANSION_MORE_EN,
  "w-hip-thrust": {"n": "Barbell Hip Thrust", "d": "Use a comfortable range and controlled movement. Stop if you feel pain.", "i": ["Rest your upper back on a secure bench with a pad between the bar and hips.", "Plant your feet, brace your core and tuck your chin gently.", "Lift until your hips line up with your torso without arching the lower back.", "Lower with control. Start light and stop if you feel pain."]},
  "w-cable-kickback": {"n": "Cable Glute Kickback", "d": "Use a comfortable range and controlled movement. Stop if you feel pain.", "i": ["Attach an ankle strap to the low pulley and hold the machine for balance.", "Soften the standing knee and brace your core.", "Extend the working leg back without arching your back or rotating your hips.", "Return slowly, finish the reps, then switch legs."]},
  "w-bulgarian-split-squat": {"n": "Bulgarian Split Squat", "d": "Use a comfortable range and controlled movement. Stop if you feel pain.", "i": ["Rest the rear foot on a low secure bench; position the front foot for balance.", "Lower your hips with a slight forward torso lean and neutral spine.", "Keep the front knee tracking with the toes and use a comfortable range.", "Push through the front foot to rise. Start without dumbbells and repeat both sides."]},
  "w-glute-leg-press": {"n": "Glute-Focused Leg Press", "d": "Use a comfortable range and controlled movement. Stop if you feel pain.", "i": ["Adjust the seat so your back and pelvis remain supported.", "Place feet slightly higher on the platform at a comfortable width.", "Bend your knees only as far as you can keep your pelvis and heels down.", "Press out without locking the knees. Do not lower far enough to lift your back."]},
  "w-hip-abductor": {"n": "Hip Abductor Machine", "d": "Use a comfortable range and controlled movement. Stop if you feel pain.", "i": ["Set the pads against your outer thighs and choose a light load.", "Sit with your back supported and feet in position.", "Open the thighs within a comfortable range without rocking your body.", "Close slowly without letting the weights slam."]},
  "donkey-kicks": { n: "Donkey Kicks", d: "Shapes and tightens the glutes from all fours, no equipment.", i: ["Start on all fours, hands under shoulders, knees under hips.", "Brace your core and keep your back flat.", "Lift one bent leg back until the thigh is in line with your back.", "Squeeze at the top for a second, lower slowly, then switch legs."] },
  "fire-hydrant": { n: "Fire Hydrant", d: "Works the side glutes and outer thigh and steadies the hips.", i: ["Start on all fours with a flat back.", "Lift the knee out to the side, bent, without rotating the hips.", "Hold for a second at the top.", "Lower slowly, repeat, then switch legs."] },
  "side-lying-leg-raise": { n: "Side-Lying Leg Raise", d: "A calm move that tones the outer thigh and side of the glutes.", i: ["Lie on your side with your body in a straight line.", "Raise the top leg until you feel the side glute work.", "Lower slowly without moving the hips.", "Repeat, then roll to the other side."] },
  "inner-thigh-lift": { n: "Inner Thigh Lift", d: "Targets the inner thigh, with a controlled side-lying movement.", i: ["Lie on your side, bend the top leg and place it in front.", "Lift the straight bottom leg upward.", "Hold a second and feel the inner thigh work.", "Lower slowly, repeat, then switch sides."] },
  "sumo-squat-db": { n: "Dumbbell Sumo Squat", d: "A wide-stance squat that focuses on the inner thigh and glutes.", i: ["Stand wider than shoulder width with toes turned out slightly.", "Hold a dumbbell with both hands in front of your hips.", "Lower until your thighs are parallel to the floor, back straight.", "Drive through your heels and squeeze the glutes on the way up."] },
  "curtsy-lunge": { n: "Curtsy Lunge", d: "A back-and-across lunge that shapes the glutes and outer thigh.", i: ["Stand with feet hip-width apart.", "Step one leg back and across behind the other, like a curtsy.", "Lower until the front knee is at 90 degrees with your chest up.", "Return to standing, repeat, then switch legs."] },
  "single-leg-glute-bridge": { n: "Single-Leg Glute Bridge", d: "A harder bridge that works each side of the glutes on its own.", i: ["Lie on your back, knees bent, feet flat.", "Extend one leg up.", "Push through the other heel and lift your hips.", "Squeeze two seconds at the top, lower slowly, then switch legs."] },
  "frog-pump": { n: "Frog Pump", d: "Burns the glutes with high reps and no weight.", i: ["Lie on your back with the soles of your feet together and knees out.", "Bring your heels close to your hips.", "Lift your hips hard and squeeze the glutes.", "Lower almost to the floor and repeat at a steady pace."] },
  "step-up-db": { n: "Dumbbell Step-Up", d: "Builds glutes and legs and improves balance. You need a stable exercise step.", i: ["Hold a dumbbell in each hand facing a stable exercise step.", "Place one full foot on the step.", "Step up by pressing through the top heel and squeezing the glute.", "Lower slowly, repeat, then switch legs."] },
  "wall-sit": { n: "Wall Sit", d: "A static hold that burns the thighs and glutes, counted in seconds.", i: ["Back against the wall, feet shoulder-width in front of you.", "Slide down until your knees are at 90 degrees.", "Hold with your back flat on the wall.", "Count the time, then stand up slowly."] },
  "knee-pushup": { n: "Knee Push-Up", d: "An easier push-up that builds upper-body strength for beginners.", i: ["Start on all fours with knees on the floor, hands wider than shoulders.", "Brace your core, body straight from knees to head.", "Lower your chest close to the floor.", "Push back up to full arm extension."] },
  "bird-dog": { n: "Bird Dog", d: "Strengthens the core and back and improves balance. Use a comfortable range.", i: ["Start on all fours with a flat back.", "Extend one arm forward and the opposite leg back together.", "Hold two seconds without moving the hips.", "Return and switch sides."] },
  "standing-oblique-crunch": { n: "Standing Oblique Crunch", d: "Works the sides of the abs to shape the waist, with a relaxed neck.", i: ["Stand feet shoulder-width apart, hands behind your head.", "Lift one knee out to the side and bring the elbow toward it.", "Squeeze the side of your abs as you do.", "Lower, repeat, then switch sides."] },
};

export const WOMEN_PROGRAMS_EN = {
  "w-beginner-start": { name: "Beginner Start for Women", level: "Beginner", daysPerWeek: "3 days / week", dayChips: ["Light full body", "Glutes & abs", "Legs & core"],
    desc: "A solid first step if you are just starting. Simple, gradual moves with bodyweight and light dumbbells that build strength and stability." },
  "w-home-glutes": { name: "Glutes at Home", level: "Beginner", daysPerWeek: "3 days / week", dayChips: ["Glutes, no equipment", "Thighs & toning", "Glutes & core"],
    desc: "A no-equipment home program focused on glutes and thighs, plus a core day. Great if you do not go to a gym." },
  "w-tone-body": { name: "Body Toning", level: "Beginner", daysPerWeek: "4 days / week", dayChips: ["Lower: glutes & thighs", "Light upper", "Lower: hold & endurance", "Core & waist"],
    desc: "A balanced full-body toning plan: glutes and thighs, a light upper day, and core and waist. Light dumbbells and bodyweight." },
  "w-hips-thighs": { name: "Hips & Thighs", level: "Intermediate", daysPerWeek: "4 days / week", dayChips: ["Dumbbell glutes", "Upper & core", "Thighs & glutes", "Glutes & holds"],
    desc: "If you have a base and want to step up: gym equipment, dumbbells and single-leg moves to strengthen the hips and thighs." },
  "w-gym-glutes": { name: "Glutes at the Gym", level: "Intermediate", daysPerWeek: "4 days / week", dayChips: ["Heavy glutes", "Upper", "Legs & glutes", "Glutes & volume"],
    desc: "A gym program for building glutes: hip thrusts, leg press and cables with an upper day. Add weight gradually." },
};
