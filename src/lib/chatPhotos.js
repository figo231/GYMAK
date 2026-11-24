import {supabase} from './supabaseClient';
import {compressImageToBlob} from './imageCompress';
const DB='gymak_chat_photos_v1';
export const PHOTO_MAX=204800;
export function photoLocalKey(user,photo){if(!user||!photo)throw Error('invalid_photo_key');return `${user}:${photo}`;}
export function createPhotoStore(idb=globalThis.indexedDB){
 if(!idb)throw Error('local_storage_required');
 const open=()=>new Promise((res,rej)=>{const r=idb.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('photos',{keyPath:'id'});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});
 async function run(mode,fn){const db=await open();try{return await new Promise((res,rej)=>{const tx=db.transaction('photos',mode),r=fn(tx.objectStore('photos'));tx.oncomplete=()=>res(r.result);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}finally{db.close();}}
 return {get:(u,p)=>run('readonly',s=>s.get(photoLocalKey(u,p))),put:(u,p,blob)=>run('readwrite',s=>s.put({id:photoLocalKey(u,p),blob,savedAt:Date.now()})),del:(u,p)=>run('readwrite',s=>s.delete(photoLocalKey(u,p)))};
}
let local;const store=()=>local||(local=createPhotoStore());
export const localPhoto=(u,p)=>store().get(u,p);
export const deleteLocalPhoto=(u,p)=>store().del(u,p);
async function call(action,photo,body,extra={}){if(!supabase)throw Error('not_configured');const {data,error}=await supabase.functions.invoke('chat-photo',{body:body||{},headers:{'x-photo-action':action,...(photo?{'x-photo-id':photo}:{}),...extra}});if(error){let detail;try{detail=await error.context?.clone?.().json();}catch{}if(detail?.error)throw Error(detail.error);throw error;}return data;}
export async function prepareChatPhoto(file){if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>5*1048576)throw Error('invalid_photo');for(const [dim,q] of [[1280,.75],[1024,.65],[800,.5],[600,.42]]){const blob=await compressImageToBlob(file,dim,q);if(blob.size>0&&blob.size<=PHOTO_MAX)return blob;}throw Error('photo_too_large');}
export async function sendPhoto(user,thread,nonce,blob){if(blob.type!=='image/jpeg'||blob.size>PHOTO_MAX)throw Error('invalid_photo');await store().put(user,`pending-${nonce}`,blob);const result=await call('upload',null,blob,{'Content-Type':'image/jpeg','x-chat-thread':thread,'x-photo-nonce':nonce});await store().put(user,result.photoId,blob);await store().del(user,`pending-${nonce}`);return result.message;}
export const photoStatus=id=>call('status',id);
export async function fetchPhoto(user,id,sender=false){const blob=await call('download',id);if(!(blob instanceof Blob)||blob.type!=='image/jpeg'||!blob.size||blob.size>PHOTO_MAX)throw Error('invalid_photo');await store().put(user,id,blob);const check=await store().get(user,id);if(!check?.blob||check.blob.size!==blob.size)throw Error('local_save_failed');if(!sender)await call('saved',id);return blob;}
export const confirmPhotoSaved=id=>call('saved',id);
export async function reportPhoto(user,photo,reason,details,include,reportId=null){let blob;if(include){blob=(await localPhoto(user,photo))?.blob;if(!blob)throw Error('local_photo_missing');}let id=reportId;if(!id){const {data,error}=await supabase.rpc('chat_photo_report',{p_photo:photo,p_reason:reason,p_details:details||'',p_include:include});if(error)throw error;id=data;}if(include){try{await call('report-upload',null,blob,{'Content-Type':'image/jpeg','x-report-id':id});}catch(e){e.reportId=id;throw e;}}return id;}
export const reportPhotoBlob=id=>call('report-view',null,null,{'x-report-id':id});

export function photoSendError(error,en=false){const s=String(error?.message||error||'');
 if(/photo_daily_limit/.test(s))return en?'You can send up to 10 photos in 24 hours. Try again later.':'وصلت لحد 10 صور خلال 24 ساعة. استنى لحد ما يعدّي وقت من الصور القديمة.';
 if(/photo_storage_full|photo_capacity/.test(s))return en?'Free photo storage is full. New uploads are paused until space is freed. No payment will be made.':'مساحة الصور المجانية وصلت للحد الآمن. إرسال صور جديدة متوقف لحد ما مساحة تفضى. مش هيتم دفع أي مبلغ.';
 if(/photo_too_large|invalid_photo|jpeg_only|invalid_jpeg/.test(s))return en?'This photo could not fit the 200 KB limit. Choose a smaller photo.':'الصورة دي مش مناسبة أو مقدرناش نضغطها لأقل من 200 كيلوبايت. اختار صورة أصغر.';
 return en?'Photo not confirmed. Keep this preview and retry. Device storage and internet are required.':'إرسال الصورة لسه مش مؤكد. احتفظ بالمعاينة وجرب تاني. لازم نت ومساحة على جهازك.';
}
