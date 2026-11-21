import MuscleIllustration from "./MuscleIllustration";
import ExerciseAnim, { hasExerciseAnim } from "../../components/ExerciseAnim";

export default function ExerciseThumb({ color, muscle, exerciseId }) {
  return (
    <div className="ex-thumb" style={{ overflow: "hidden" }}>
      {exerciseId && hasExerciseAnim(exerciseId)
        ? <ExerciseAnim exerciseId={exerciseId} still />
        : <MuscleIllustration muscle={muscle} color={color} size={30} />}
    </div>
  );
}
