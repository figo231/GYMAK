import MuscleIllustration from "./MuscleIllustration";

export default function ExerciseThumb({ color, muscle }) {
  return (
    <div className="ex-thumb">
      <MuscleIllustration muscle={muscle} color={color} size={30} />
    </div>
  );
}
