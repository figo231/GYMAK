import { WOMEN_EXERCISES } from "../../lib/content/womenContent";
const WOMEN_IDS = new Set(WOMEN_EXERCISES.map(e => e.id));
import ExerciseAnim, { hasExerciseAnim } from "../../components/ExerciseAnim";
import { useExerciseMedia } from "../../lib/exerciseMedia";

export default function ExerciseThumb({ exerciseId, localMedia }) {
  const local = useExerciseMedia(exerciseId, !!localMedia);
  return (
    <div className="ex-thumb" style={{ overflow: "hidden" }}>
      {local.url
        ? (local.kind === "video"
          ? <video className="ex-thumb-media" src={local.url + "#t=0.1"} muted playsInline preload="metadata" />
          : <img className="ex-thumb-media" src={local.url} alt="" />)
        : exerciseId && hasExerciseAnim(exerciseId)
          ? <ExerciseAnim exerciseId={exerciseId} still={!WOMEN_IDS.has(exerciseId)} />
          : <span className="ex-thumb-placeholder" aria-hidden="true">🏋️</span>}
    </div>
  );
}
