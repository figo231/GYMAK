import {beforeEach,describe,it,expect} from 'vitest';
import {planMutableRow,rowFingerprint,preserveMutableConflict,readMutableJournal} from '../src/lib/sync/mutableRows';
beforeEach(()=>localStorage.clear());
describe('two-device mutable row conflict plan',()=>{
 const a={weight:80,body_fat:15},b={weight:78,body_fat:15},c={weight:82,body_fat:15};
 it('stale unchanged device pulls newer cloud instead of uploading old values',()=>{expect(planMutableRow({baseline:a,local:a,remote:b,hasBaseline:true}).action).toBe('pull');});
 it('uploads a real offline edit only against the known unchanged cloud baseline',()=>{expect(planMutableRow({baseline:a,local:b,remote:a,hasBaseline:true}).action).toBe('update');});
 it('never picks a winner when two devices edit the same row',()=>{expect(planMutableRow({baseline:a,local:b,remote:c,hasBaseline:true}).action).toBe('conflict');});
 it('does not infer authority to overwrite from an unknown old-device baseline',()=>{expect(planMutableRow({local:a,remote:b}).reason).toBe('unknown_legacy_baseline');expect(planMutableRow({local:a,remote:null}).action).toBe('insert');});
 it('does not resurrect a remotely deleted row when local state has not changed',()=>{expect(planMutableRow({baseline:a,local:a,remote:null,hasBaseline:true}).action).toBe('pull');});
 it('does not delete a newer remote edit from a stale local tombstone',()=>{expect(planMutableRow({baseline:a,local:null,remote:b,hasBaseline:true,deleted:true}).action).toBe('conflict');expect(planMutableRow({baseline:a,local:null,remote:a,hasBaseline:true,deleted:true}).action).toBe('delete');});
 it('acknowledges identical edits regardless of object field order',()=>{expect(rowFingerprint(a)).toBe(rowFingerprint({body_fat:15,weight:80}));expect(planMutableRow({local:a,remote:a}).action).toBe('ack');});
 it('keeps divergent local revisions private to each account without replacing prior edits',()=>{preserveMutableConflict('a','weight:day',{baseline:a,local:b,remote:c,reason:'both_changed'});preserveMutableConflict('a','weight:day',{baseline:a,local:c,remote:a,reason:'both_changed'});expect(readMutableJournal('a').conflicts['weight:day'].revisions.map(r=>r.local)).toEqual([b,c]);expect(readMutableJournal('b').conflicts).toEqual({});});
 it('never replaces a corrupt journal with a fresh baseline',()=>{localStorage.setItem('gymak_mutable_sync_v1:a','broken');expect(()=>preserveMutableConflict('a','x',{local:a})).toThrow('sync_journal_corrupt');expect(localStorage.getItem('gymak_mutable_sync_v1:a')).toBe('broken');});
});
