// Device-local session state. Exercise logs and this state are saved together by Store.
export const SESSION_SCHEMA = 1;
export function createWorkoutSession({id, owner, title, exercises, now = Date.now()}) {
  if (!id || !owner || !Array.isArray(exercises) || !exercises.length) throw Error('invalid_workout_session');
  const seen = new Set();
  const rows = exercises.filter(e => e?.id && !seen.has(e.id) && seen.add(e.id)).map(e => ({
    id:e.id, name:String(e.name || e.id), sets:Math.min(20,Math.max(1,Math.floor(Number(e.sets)||3))),
    reps:Math.min(100,Math.max(1,Math.floor(Number(e.reps)||10))), unit:e.unit||'reps', completed:[]
  }));
  if (!rows.length || rows.length > 40) throw Error('invalid_workout_session');
  return {schema:SESSION_SCHEMA,id,owner,title:String(title||'').slice(0,120),startedAt:now,updatedAt:now,status:'active',cursor:0,exercises:rows,restUntil:null};
}
export function nextWorkoutSet(session,{exerciseId,requestId,weight,reps,rir=null,now=Date.now(),restSeconds=90}) {
  if (!session || session.status!=='active' || !requestId) throw Error('workout_not_active');
  const existing=session.exercises.flatMap(e=>e.completed).find(s=>s.requestId===requestId);
  if(existing) {
    if(existing.exerciseId!==exerciseId || existing.weight!==weight || existing.reps!==reps || existing.rir!==rir) throw Error('workout_request_changed');
    return {session,duplicate:true};
  }
  if(!Number.isFinite(weight)||weight<0||weight>1500||!Number.isInteger(reps)||reps<1||reps>500 || (rir!==null&&(!Number.isInteger(rir)||rir<0||rir>5)))throw Error('invalid_workout_set');
  const row=session.exercises[session.cursor];
  if(!row||row.id!==exerciseId||row.completed.length>=row.sets)throw Error('workout_exercise_changed');
  const next=JSON.parse(JSON.stringify(session));
  next.exercises[next.cursor].completed.push({requestId,exerciseId,weight,reps,rir,at:now});
  if(next.exercises[next.cursor].completed.length>=row.sets && next.cursor<next.exercises.length-1)next.cursor++;
  next.updatedAt=now;next.restUntil=now+Math.min(600,Math.max(0,Number(restSeconds)||0))*1000;
  return {session:next,duplicate:false};
}
export function workoutSummary(s,now=Date.now()) {
  const sets=s.exercises.flatMap(e=>e.completed);
  return {sets:sets.length,exercises:s.exercises.filter(e=>e.completed.length).length,plannedSets:s.exercises.reduce((n,e)=>n+e.sets,0),minutes:Math.max(0,Math.round(((s.finishedAt||now)-s.startedAt)/60000)),allDone:s.exercises.every(e=>e.completed.length>=e.sets)};
}
export function finishWorkoutSession(session,now=Date.now()) {
  if(!session||session.status!=='active')throw Error('workout_not_active');
  if(!workoutSummary(session).sets)throw Error('workout_empty');
  return {...session,status:'completed',finishedAt:now,updatedAt:now,restUntil:null};
}
