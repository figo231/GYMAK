// Authenticate the RELEASE METADATA too, not only the encrypted ZIP. Otherwise a
// tampered manifest could relabel/replay a signed old bundle as a newer release.
export async function verifyOtaEnvelope(envelope,spkiPem,cryptoApi=globalThis.crypto){
 if(!envelope||typeof envelope.payload!=='string'||typeof envelope.signature!=='string'||envelope.payload.length>32768||envelope.signature.length>2048)throw Error('invalid_envelope');
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const der=bytes(spkiPem.replace(/-----[^-]+-----|\s/g,''));
 const key=await cryptoApi.subtle.importKey('spki',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const payload=bytes(envelope.payload);
 if(!await cryptoApi.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(envelope.signature),payload))throw Error('manifest_signature');
 return JSON.parse(new TextDecoder().decode(payload));
}
