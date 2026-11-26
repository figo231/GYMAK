import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
describe('legacy dispatcher schema alignment',()=>{
 it('uses actual delivery column names',()=>{for(const n of ['dispatch-batch','retry-failed-deliveries']){const c=read(`supabase/functions/${n}/index.ts`);expect(c).not.toContain('retry_count');expect(c).not.toContain('fcm_message_id');expect(c).not.toContain('error: result.errorCode');expect(c).toContain('attempts: nextRetryCount');expect(c).toContain('error_code: result.errorCode');}});
 it('claims a notification before any topic broadcast invocation',()=>{const c=read('supabase/functions/send-notification/index.ts');expect(c.indexOf("if(!claim?.length)")).toBeLessThan(c.indexOf("rpc('enqueue_broadcast_devices_v1'"));const s=read('supabase/functions/dispatch-scheduled/index.ts');expect(s.indexOf('if(!claim?.length)continue')).toBeLessThan(s.indexOf("rpc('enqueue_broadcast_devices_v1'"));});
});
