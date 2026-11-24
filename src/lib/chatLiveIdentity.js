// In-page signal only. Remote identity refresh uses existing participant-RLS conversation updates.
const listeners=new Set();
export function notifyIdentityChanged(){for(const f of listeners)f();}
export function subscribeIdentity(_userId,onChange){listeners.add(onChange);return()=>listeners.delete(onChange);}
