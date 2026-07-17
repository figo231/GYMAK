export default function ExerciseThumb({ color }) {
  return (
    <div className="ex-thumb">
      <svg viewBox="0 0 32 32" width="24" height="24">
        <rect x="3" y="13.5" width="5.5" height="5" rx="1.4" fill={color} opacity=".9" />
        <rect x="23.5" y="13.5" width="5.5" height="5" rx="1.4" fill={color} opacity=".9" />
        <rect x="8.5" y="15.1" width="15" height="1.8" rx=".9" fill={color} opacity=".55" />
      </svg>
    </div>
  );
}
