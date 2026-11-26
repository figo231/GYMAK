import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({upsert:vi.fn().mockResolvedValue({})}));vi.mock('../src/lib/supabaseClient',()=>({supabase:{from:()=>({upsert:m.upsert})}}));
import Store from '../src/lib/store/gymakStore';import {pushExerciseLogs} from '../src/lib/sync/domains';
beforeEach(()=>{localStorage.clear();Store.invalidateCache();Store.resetAllData();m.upsert.mockClear();});
it('sends recorded effort and original log time with the stable cloud log id',async()=>{const id=Store.getExercises()[0].id;Store.logSet(id,30,1,10,3);await pushExerciseLogs('owner');const row=m.upsert.mock.calls[0][0][0];expect(row.rir).toBe(3);expect(Number.isFinite(Date.parse(row.client_logged_at))).toBe(true);});
it('restores effort and log time on another device without inventing either for legacy logs',()=>{const id=Store.getExercises()[0].id;Store.mergeExerciseLogsFromRemote([{id:'00000000-0000-4000-8000-000000000001',exercise_id:id,date:'2026-11-25',weight:30,sets:1,reps:10,rir:3,client_logged_at:'2026-11-25T17:00:00Z'}]);const row=Store.getExerciseLogs(id)[0];expect(row.rir).toBe(3);expect(row.at).toBe(Date.parse('2026-11-25T17:00:00Z'));});
