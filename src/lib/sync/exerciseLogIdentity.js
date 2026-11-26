import {deterministicId} from './deterministicId';
export const validLogId=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function exerciseLogId(user,exercise,l){return validLogId(l.id)?l.id:deterministicId('exercise_log',user,exercise,l.date,l.weight,l.sets,l.reps);}
export function exerciseLogKey(exercise,l){return validLogId(l.id)?'id:'+l.id:`${exercise}|${l.date}|${l.weight}|${l.sets}|${l.reps}`;}
