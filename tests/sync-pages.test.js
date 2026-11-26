import {describe,it,expect} from 'vitest';
import {readOwnerRows} from '../src/lib/sync/readPages';
function client(rows,{failAt=null,onRead=()=>{}}={}){let reads=0;const requests=[];return {requests,from(table){let cursor=null,size=0;const q={select:()=>q,eq:(k,v)=>{requests.push([table,k,v]);return q;},order:()=>q,limit:n=>{size=n;return q;},gt:(k,v)=>{cursor=v;return q;},then(resolve,reject){reads++;onRead(reads);if(reads===failAt)return Promise.resolve({error:Error('page failed')}).then(resolve,reject);return Promise.resolve({data:rows.filter(r=>cursor===null||r.id>cursor).slice(0,size)}).then(resolve,reject);}};return q;}};}
describe('large offline history recovery',()=>{
 it('reads beyond the server default limit using stable keyset pages',async()=>{const rows=Array.from({length:1201},(_,i)=>({id:String(i).padStart(5,'0')}));const db=client(rows);expect(await readOwnerRows(db,'exercise_logs','owner')).toEqual(rows);expect(db.requests).toHaveLength(3);expect(db.requests.every(r=>r[1]==='user_id'&&r[2]==='owner')).toBe(true);});
 it('fails the whole read rather than returning a partial history',async()=>{const db=client([{id:'1'},{id:'2'},{id:'3'}],{failAt:2});await expect(readOwnerRows(db,'t','a',{pageSize:2})).rejects.toThrow('page failed');});
 it('abandons old-account pages',async()=>{let allowed=true;const db=client([{id:'1'}],{onRead:()=>{allowed=false;}});expect(await readOwnerRows(db,'t','a',{canRead:()=>allowed})).toEqual([]);});
});
