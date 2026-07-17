export default function MoveGuide({ muscle, color }) {
  const c = color;
  const head = <circle cx="76" cy="38" r="10" fill={c} opacity=".9" />;
  const torso = <rect x="70" y="48" width="12" height="42" rx="6" fill={c} opacity=".9" />;
  const legsStatic = (
    <>
      <rect x="65" y="90" width="8" height="34" rx="4" fill={c} opacity=".6" />
      <rect x="80" y="90" width="8" height="34" rx="4" fill={c} opacity=".6" />
    </>
  );

  let extra;
  if (muscle === "chest" || muscle === "shoulders" || muscle === "arms") {
    extra = (
      <>
        <g className="mg-arm-up"><rect x="70" y="52" width="30" height="8" rx="4" fill={c} /></g>
        <g className="mg-arm-up2"><rect x="52" y="52" width="30" height="8" rx="4" fill={c} /></g>
        {head}{torso}{legsStatic}
      </>
    );
  } else if (muscle === "back") {
    extra = (
      <>
        <g className="mg-pull">{head}{torso}<rect x="86" y="52" width="30" height="7" rx="3.5" fill={c} /></g>
        {legsStatic}
      </>
    );
  } else if (muscle === "legs") {
    extra = (
      <>
        <g className="mg-squat">{head}{torso}<rect x="55" y="52" width="20" height="7" rx="3.5" fill={c} opacity=".8" /><rect x="77" y="52" width="20" height="7" rx="3.5" fill={c} opacity=".8" /></g>
        {legsStatic}
      </>
    );
  } else if (muscle === "core") {
    extra = (
      <>
        <g className="mg-twist">{head}{torso}<rect x="66" y="52" width="8" height="30" rx="4" fill={c} opacity=".7" /><rect x="78" y="52" width="8" height="30" rx="4" fill={c} opacity=".7" /></g>
        {legsStatic}
      </>
    );
  } else {
    extra = <><g className="mg-flex">{head}{torso}</g>{legsStatic}</>;
  }

  return (
    <svg className="move-guide" viewBox="0 0 150 150" fill="none">
      <ellipse cx="76" cy="128" rx="34" ry="6" fill={c} opacity=".12" />
      {extra}
    </svg>
  );
}
