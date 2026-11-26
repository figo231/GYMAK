// The data owner alone survives logout. A restored, ready session is also needed.
export function mayScheduleReminders({userId,ownerId,ready,recovery,master}) {
 return !!userId && userId===ownerId && ready===true && !recovery && master!==false;
}
