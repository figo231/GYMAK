import { useState } from "react";
import { getExerciseFrames } from "../lib/exerciseImages";

// Two-frame looping demo (start / end position) for built-in exercises.
// Renders nothing when there are no photos or they fail to load (offline),
// so callers keep their SVG fallback.
export default function ExerciseAnim({ exerciseId, alt, className = "", still = false }) {
  const frames = getExerciseFrames(exerciseId);
  const [failed, setFailed] = useState(false);
  if (!frames || failed) return null;
  return (
    <div className={"ex-anim " + (still ? "still " : "") + className}>
      <img src={frames[0]} alt={alt || ""} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      {!still && <img className="ex-anim-b" src={frames[1]} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </div>
  );
}

export function hasExerciseAnim(exerciseId) {
  return !!getExerciseFrames(exerciseId);
}
