import {beforeEach,describe,it,expect,vi} from 'vitest';
vi.mock('../src/lib/supabaseClient',()=>({supabase:null}));
import {savePushPreference,flushPushPreferences,pendingPushPreferences} from '../src/lib/push/serverPreferences';
beforeEach(()=>localStorage.clear());
function client(id='a',save=async()=>({})){return {auth:{getUser:async()=>({data:{user:{id}}})},from:()=>({upsert:save})};}
describe('server notification settings outbox',()=>{
 it('keeps an offline opt-out for retry on the same account',async()=>{await expect(savePushPreference('a','master',false,client('a',async()=>({error:Error('offline')})))).rejects.toThrow('offline');expect(pendingPushPreferences('a')).toEqual({master:false});await flushPushPreferences('a',client());expect(pendingPushPreferences('a')).toEqual({});});
 it('never flushes under another account',async()=>{await expect(savePushPreference('a','chat',false,client('b'))).rejects.toThrow('session_changed');expect(pendingPushPreferences('a')).toEqual({chat:false});});
 it('retains a newer choice made while a save is pending',async()=>{const db=client('a',async()=>{localStorage.setItem('gymak_server_push_pending_v1:a',JSON.stringify({master:true}));return {};});await savePushPreference('a','master',false,db);expect(pendingPushPreferences('a')).toEqual({master:true});});
});
it('serializes concurrent choices so an earlier network response cannot restore an old setting',async()=>{let release;const gate=new Promise(r=>release=r);const writes=[];const db=client('a',async row=>{writes.push(row.enabled);if(writes.length===1)await gate;return {};});const first=savePushPreference('a','master',false,db);await vi.waitFor(()=>expect(writes).toEqual([false]));const second=savePushPreference('a','master',true,db);release();await Promise.all([first,second]);expect(writes).toEqual([false,true]);expect(pendingPushPreferences('a')).toEqual({});});
it('keeps a damaged outbox unchanged instead of replacing it',async()=>{localStorage.setItem('gymak_server_push_pending_v1:a','[]');await expect(savePushPreference('a','master',true,client())).rejects.toThrow('push_preferences_corrupt');expect(localStorage.getItem('gymak_server_push_pending_v1:a')).toBe('[]');});
