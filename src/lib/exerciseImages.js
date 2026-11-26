import { GYM_EXPANSION_MORE } from "./content/gymExpansionMore";
import { WOMEN_EXERCISES } from "./content/womenContent";
const WOMEN_IMAGE_IDS = new Set(WOMEN_EXERCISES.map(e => e.id));
// Original generated two-pose illustrations bundled locally for offline use.
// Provenance and visual review: scripts/{men,women}-art-manifest.json.
// The legacy slugs below remain only as English search aliases, not image sources.
const LOCAL_BASE = "/exercises/";
const IMAGE_IDS = {
  "bench-press-barbell": "Barbell_Bench_Press_-_Medium_Grip",
  "incline-dumbbell-press": "Incline_Dumbbell_Press",
  "cable-crossover": "Cable_Crossover",
  "pushup": "Pushups",
  "lat-pulldown": "Wide-Grip_Lat_Pulldown",
  "deadlift": "Barbell_Deadlift",
  "barbell-row": "Bent_Over_Barbell_Row",
  "pullup": "Pullups",
  "shoulder-press-barbell": "Barbell_Shoulder_Press",
  "lateral-raise": "Side_Lateral_Raise",
  "rear-delt-fly": "Reverse_Flyes",
  "squat-barbell": "Barbell_Full_Squat",
  "leg-press": "Leg_Press",
  "romanian-deadlift": "Romanian_Deadlift",
  "calf-raise": "Standing_Calf_Raises",
  "barbell-curl": "Barbell_Curl",
  "tricep-pushdown": "Triceps_Pushdown",
  "hammer-curl": "Hammer_Curls",
  "dips": "Dips_-_Triceps_Version",
  "plank": "Plank",
  "hanging-leg-raise": "Hanging_Leg_Raise",
  "cable-crunch": "Cable_Crunch",
  "dumbbell-bench-press": "Dumbbell_Bench_Press",
  "decline-bench-press": "Decline_Barbell_Bench_Press",
  "dumbbell-fly": "Dumbbell_Flyes",
  "incline-dumbbell-fly": "Incline_Dumbbell_Flyes",
  "machine-chest-fly": "Butterfly",
  "seated-cable-row": "Seated_Cable_Rows",
  "one-arm-dumbbell-row": "One-Arm_Dumbbell_Row",
  "t-bar-row": "T-Bar_Row_with_Handle",
  "chin-up": "Chin-Up",
  "back-extension": "Hyperextensions_Back_Extensions",
  "dumbbell-shoulder-press": "Dumbbell_Shoulder_Press",
  "arnold-press": "Arnold_Dumbbell_Press",
  "front-raise": "Front_Dumbbell_Raise",
  "face-pull": "Face_Pull",
  "dumbbell-shrug": "Dumbbell_Shrug",
  "leg-extension": "Leg_Extensions",
  "lying-leg-curl": "Lying_Leg_Curls",
  "dumbbell-lunges": "Dumbbell_Lunges",
  "goblet-squat": "Goblet_Squat",
  "hip-thrust": "Barbell_Hip_Thrust",
  "seated-calf-raise": "Seated_Calf_Raise",
  "alternate-hammer-curl": "Alternate_Hammer_Curl",
  "dumbbell-curl": "Dumbbell_Alternate_Bicep_Curl",
  "preacher-curl": "Preacher_Curl",
  "concentration-curl": "Concentration_Curls",
  "dumbbell-triceps-extension": "Standing_Dumbbell_Triceps_Extension",
  "skullcrusher": "EZ-Bar_Skullcrusher",
  "close-grip-bench-press": "Close-Grip_Barbell_Bench_Press",
  "crunch": "Crunches",
  "russian-twist": "Russian_Twist",
  "air-bike": "Air_Bike",
  "mountain-climbers": "Mountain_Climbers",
  "ab-roller": "Ab_Roller",
  "lying-leg-raise": "Flat_Bench_Lying_Leg_Raise",
  "shrug-barbell": "Barbell_Shrug",
  "smith-squat": "Smith_Machine_Squat",
  "stiff-leg-deadlift": "Stiff-Legged_Barbell_Deadlift",
  "close-bench-dip": "Bench_Dips",
  "incline-pushup": "Incline_Push-Up",
  "decline-pushup": "Decline_Push-Up",
  "close-grip-pushup": "Push-Ups_-_Close_Triceps_Position",
  "machine-chest-press": "Machine_Bench_Press",
  "smith-bench-press": "Smith_Machine_Bench_Press",
  "wide-grip-bench-press": "Wide-Grip_Barbell_Bench_Press",
  "incline-barbell-press": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "neutral-grip-db-press": "Dumbbell_Bench_Press_with_Neutral_Grip",
  "incline-cable-fly": "Incline_Cable_Flye",
  "low-cable-crossover": "Low_Cable_Crossover",
  "chest-dips": "Dips_-_Chest_Version",
  "db-pullover": "Bent-Arm_Dumbbell_Pullover",
  "straight-arm-pulldown": "Straight-Arm_Pulldown",
  "close-grip-pulldown": "Close-Grip_Front_Lat_Pulldown",
  "underhand-pulldown": "Underhand_Cable_Pulldowns",
  "reverse-grip-row": "Reverse_Grip_Bent-Over_Rows",
  "inverted-row": "Inverted_Row",
  "two-db-row": "Bent_Over_Two-Dumbbell_Row",
  "rack-pull": "Rack_Pulls",
  "superman": "Superman",
  "muscle-up": "Muscle_Up",
  "seated-db-press": "Seated_Dumbbell_Press",
  "machine-shoulder-press": "Machine_Shoulder_Military_Press",
  "cable-lateral-raise": "Cable_Seated_Lateral_Raise",
  "upright-row-db": "Standing_Dumbbell_Upright_Row",
  "upright-row-barbell": "Upright_Barbell_Row",
  "bent-over-rear-raise": "Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench",
  "reverse-machine-fly": "Reverse_Machine_Flyes",
  "cable-rear-delt-fly": "Cable_Rear_Delt_Fly",
  "front-plate-raise": "Front_Plate_Raise",
  "push-press": "Push_Press",
  "cable-shoulder-press": "Cable_Shoulder_Press",
  "hack-squat": "Hack_Squat",
  "walking-lunge": "Barbell_Walking_Lunge",
  "bodyweight-squat": "Bodyweight_Squat",
  "dumbbell-squat": "Dumbbell_Squat",
  "step-ups": "Dumbbell_Step_Ups",
  "split-squat-db": "Split_Squat_with_Dumbbells",
  "sumo-deadlift": "Sumo_Deadlift",
  "good-morning": "Good_Morning",
  "seated-leg-curl": "Seated_Leg_Curl",
  "glute-kickback": "Glute_Kickback",
  "glute-bridge": "Barbell_Glute_Bridge",
  "standing-barbell-calf": "Standing_Barbell_Calf_Raise",
  "donkey-calf": "Donkey_Calf_Raises",
  "db-calf": "Standing_Dumbbell_Calf_Raise",
  "thigh-abductor": "Thigh_Abductor",
  "thigh-adductor": "Thigh_Adductor",
  "ez-bar-curl": "EZ-Bar_Curl",
  "incline-db-curl": "Incline_Dumbbell_Curl",
  "spider-curl": "Spider_Curl",
  "zottman-curl": "Zottman_Curl",
  "cable-preacher-curl": "Cable_Preacher_Curl",
  "machine-curl": "Machine_Bicep_Curl",
  "standing-cable-curl": "Standing_Biceps_Cable_Curl",
  "reverse-curl": "Reverse_Barbell_Curl",
  "rope-pushdown": "Triceps_Pushdown_-_Rope_Attachment",
  "overhead-rope-extension": "Triceps_Overhead_Extension_with_Rope",
  "tricep-kickback": "Tricep_Dumbbell_Kickback",
  "reverse-pushdown": "Reverse_Grip_Triceps_Pushdown",
  "wrist-curl": "Palms-Down_Wrist_Curl_Over_A_Bench",
  "oblique-crunch": "Oblique_Crunches",
  "decline-crunch": "Decline_Crunch",
  "reverse-crunch": "Reverse_Crunch",
  "flutter-kicks": "Flutter_Kicks",
  "jackknife-situp": "Jackknife_Sit-Up",
  "wood-chop": "Standing_Cable_Wood_Chop",
  "dead-bug": "Dead_Bug",
  "side-bridge": "Side_Bridge",
  "farmers-walk": "Farmers_Walk"
};

import { remoteExerciseFrames } from "./content/remoteContent";
const EXPANSION_IMAGE_IDS = new Set([...GYM_EXPANSION_MORE.map(e => e.id),"pallof-press","single-arm-landmine-press","incline-treadmill-walk","upright-stationary-bike","elliptical-cross-trainer","rowing-ergometer"]);
function resolveExerciseFrames(id) {
  // Rejected/incomplete poses must not be shown as form examples.
  if (["single-arm-cable-chest-press", "barbell-front-squat"].includes(id)) return null;
  if (EXPANSION_IMAGE_IDS.has(id)) return [`/exercises/${id}/0.webp`, `/exercises/${id}/1.webp`];
  if (WOMEN_IMAGE_IDS.has(id)) return [`/women-exercises/${id}/0.webp`, `/women-exercises/${id}/1.webp`];
  const rf = remoteExerciseFrames(id);
  if (rf) return rf;
  // APK23 visual audit: floor-bridge art shows a bench hip thrust; pullover art
  // shows full-length support instead of the seeded cross-bench variation.
  // Hide only that incorrect bundled demo. A later owner-provided replacement above still wins.
  if (id === "glute-bridge" || id === "db-pullover") return null;
  const k = IMAGE_IDS[id];
  return k ? [LOCAL_BASE + id + "/0.webp", LOCAL_BASE + id + "/1.webp"] : null;
}

// English search terms for a built-in exercise (derived from the image slug).
export function getExerciseEnglish(id) {
  const k = IMAGE_IDS[id];
  return k ? k.replace(/_/g, " ").replace(/-/g, " ") : "";
}

// Revisioned local URLs cannot reuse historical same-path gym photos.
export function getExerciseFrames(id){return resolveExerciseFrames(id)?.map(url=>url.startsWith('/')?url+'?art=studio-v2':url)||null;}
