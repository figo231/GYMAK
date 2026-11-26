import {useState} from 'react';
import {useAuth} from '../../hooks/useAuth';
import {mutableConflicts,chooseMutableConflict} from '../../lib/sync/mutableConflictReview';
import {syncManager} from '../../lib/sync/syncManager';
import {isEn} from '../../lib/i18n/lang';
export default function SyncConflictReview(){
 const {user}=useAuth();const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!user?.id)return null;const owner=user.id,en=isEn();let rows;
 try{rows=mutableConflicts(owner);}catch{return <p role="alert">{en?'Sync recovery data could not be read. Do not clear app data.':'معرفناش نفتح بيانات استرجاع المزامنة. متحذفش بيانات التطبيق.'}</p>;}
 async function choose(row,value){setBusy(true);setError('');try{chooseMutableConflict(owner,row.id,row.fingerprint,value);await syncManager.manualSync();setRevision(revision+1);}catch{setError(en?'Not confirmed. Both copies are kept. Retry after connecting.':'الاختيار لسه متأكدش. النسختين محفوظين. اتصل وجرب تاني.');}finally{setBusy(false);}}
 if(!rows.length)return null;
 return <section className="glass" style={{padding:16,marginBottom:16}}><h2>{en?'Review sync differences':'راجع اختلافات المزامنة'}</h2><p>{en?'Neither copy was overwritten. Choose for each difference. Original local revisions stay on this device. Another change on the server will require a new review.':'مستبدلناش أي نسخة. اختار لكل اختلاف. النسخ المحلية الأصلية بتفضل على الجهاز. لو السيرفر اتغير تاني هنطلب مراجعة جديدة.'}</p>{error&&<p role="alert">{error}</p>}{rows.map(row=><article key={row.id} style={{borderTop:'1px solid var(--border)',paddingBlock:16}}><h3 style={{overflowWrap:'anywhere'}}>{row.id}</h3><details><summary>{en?'Compare saved values':'قارن القيم المحفوظة'}</summary><p>{en?'This device':'الجهاز ده'}</p><pre dir="auto" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(row.local,null,2)}</pre><p>{en?'Server':'السيرفر'}</p><pre dir="auto" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12}}>{JSON.stringify(row.remote,null,2)}</pre></details><button className="btn" disabled={busy} onClick={()=>choose(row,'local')}>{en?'Use this device copy':'استخدم نسخة الجهاز'}</button> <button className="btn" disabled={busy} onClick={()=>choose(row,'remote')}>{en?'Use server copy':'استخدم نسخة السيرفر'}</button></article>)}</section>;
}
