import {describe,it,expect} from 'vitest';
import {mayScheduleReminders} from '../src/lib/push/reminderAccount';
describe('notification account gate',()=>{
 const ready={userId:'a',ownerId:'a',ready:true,recovery:false,master:true};
 it('allows a restored ready owner session',()=>expect(mayScheduleReminders(ready)).toBe(true));
 it('blocks logged-out, other-account, recovery, migration, and master-off scheduling',()=>{
  for(const patch of [{userId:null},{userId:'b'},{ownerId:null},{recovery:true},{ready:false},{master:false}])expect(mayScheduleReminders({...ready,...patch})).toBe(false);
 });
});
