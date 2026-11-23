// @vitest-environment node
import {it,expect} from 'vitest';
import {generateKeyPairSync,sign,webcrypto} from 'node:crypto';
import {verifyOtaEnvelope} from '../src/lib/update/otaManifest';
it('requires authentic metadata, rejects relabeling and wrong signing key',async()=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 const data=Buffer.from(JSON.stringify({version:'web-2',nativeBuild:18}));
 const envelope={payload:data.toString('base64'),signature:sign('sha256',data,privateKey).toString('base64')};
 expect((await verifyOtaEnvelope(envelope,publicKey,webcrypto)).version).toBe('web-2');
 await expect(verifyOtaEnvelope({...envelope,payload:Buffer.from('{"version":"web-99"}').toString('base64')},publicKey,webcrypto)).rejects.toThrow('manifest_signature');
 const wrong=generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem'}});
 await expect(verifyOtaEnvelope(envelope,wrong.publicKey,webcrypto)).rejects.toThrow('manifest_signature');
});
