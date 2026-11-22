import MuscleIllustration from "./MuscleIllustration";
import ExerciseAnim, { hasExerciseAnim } from "../../components/ExerciseAnim";
import { useExerciseMedia } from "../../lib/exerciseMedia";

export default function ExerciseThumb({ color, muscle, exerciseId, localMedia }) {
  const local = useExerciseMedia(exerciseId, !!localMedia);
  return (
    <div className="ex-thumb" style={{ overflow: "hidden" }}>
      {local.url
        ? (local.kind === "video"
          ? <video className="ex-thumb-media" src={local.url + "#t=0.1"} muted playsInline preload="metadata" />
          : <img className="ex-thumb-media" src={local.url} alt="" />)
        : exerciseId && hasExerciseAnim(exerciseId)
          ? <ExerciseAnim exerciseId={exerciseId} still />
          : <MuscleIllustration muscle={muscle} color={color} size={30} />}
    </div>
  );
}
