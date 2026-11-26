// Persisted state is the authority, including another tab's in-progress session.
// Storage failures must not trigger a reload while the user may be training.
export function hasActiveWorkout(storage = localStorage) {
  try {
    const raw = storage.getItem('gymak_state_v1');
    if (!raw) return false;
    return JSON.parse(raw)?.workoutSession?.status === 'active';
  } catch { return true; }
}
