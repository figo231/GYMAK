// Native HTTP bypasses Capacitor's packaged same-origin asset server. Keep the
// existing signed channel URL and trust anchor, rather than changing origins.
import {CapacitorHttp} from '@capacitor/core';
export const OTA_MANIFEST_URL='https://gymak-eight.vercel.app/ota/stable.json';
export async function fetchNativeOtaEnvelope(timeoutMs=2800){
 const response=await CapacitorHttp.get({url:OTA_MANIFEST_URL,headers:{'Cache-Control':'no-cache'},connectTimeout:timeoutMs,readTimeout:timeoutMs,responseType:'json',disableRedirects:true});
 if(response.status!==200)throw Error('manifest_http');
 return typeof response.data==='string'?JSON.parse(response.data):response.data;
}
