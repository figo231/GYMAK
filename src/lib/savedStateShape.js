// Structural checks only. Missing legacy fields are backfilled by Store.load().
// Reject shapes that would crash migration before replacing the current copy.
export function validSavedState(s,{requireCore=false}={}) {
 if(!s||typeof s!=='object'||Array.isArray(s))return false;
 if(requireCore&&(!s.profile||!Array.isArray(s.weightLogs)||!s.exerciseLogs||!Array.isArray(s.workoutDays)))return false;
 for(const field of ['weightLogs','workoutDays','exercises','foodLog','prHistory','savedMeals','cheatDays','deletedExerciseIds'])if(s[field]!==undefined&&!Array.isArray(s[field]))return false;
 for(const field of ['profile','settings','pendingDeletes'])if(s[field]!==undefined&&(!s[field]||typeof s[field]!=='object'||Array.isArray(s[field])))return false;
 if(s.exerciseLogs!=null&&(typeof s.exerciseLogs!=='object'||Array.isArray(s.exerciseLogs)||Object.values(s.exerciseLogs).some(x=>!Array.isArray(x))))return false;
 for(const field of ['weightLogs','foodLog','prHistory','savedMeals'])if(s[field]?.some(r=>!r||typeof r!=='object'||Array.isArray(r)))return false;
 if(s.foodLog?.some(r=>!Array.isArray(r.items)||r.items.some(i=>!i||typeof i!=='object'||Array.isArray(i))))return false;
 if(s.exerciseLogs&&Object.values(s.exerciseLogs).some(rows=>rows.some(r=>!r||typeof r!=='object'||Array.isArray(r))))return false;
 if(s.pendingDeletes&&['weight','food','exerciseLogs','prs'].some(k=>s.pendingDeletes[k]!==undefined&&!Array.isArray(s.pendingDeletes[k])))return false;
 if(s.exercises?.some(e=>!e||typeof e!=='object'||typeof e.id!=='string'))return false;
 return true;
}
