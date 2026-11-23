// @vitest-environment node
import {it,expect} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import {execFileSync} from 'node:child_process';
import {verifyOtaEnvelope} from '../src/lib/update/otaManifest';
it('CI signer produces authenticated metadata, AES bundle and valid native-format RSA checksums',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gymak-sign-test-'));
 try{
  const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs1',format:'pem'}});
  const plain=Buffer.from('fixture ZIP bytes, no user data');fs.writeFileSync(dir+'/input.zip',plain);
  execFileSync(process.execPath,['scripts/ota/sign-bundle.mjs',dir+'/input.zip',dir+'/out','web-2','18','sideload','https://github.com/figo231/GYMAK/releases/download/web-2/bundle.zip'],{env:{...process.env,GYMAK_OTA_PRIVATE_KEY:privateKey}});
  const envelope=JSON.parse(fs.readFileSync(dir+'/out/stable.json'));
  const m=await verifyOtaEnvelope(envelope,publicKey,crypto.webcrypto);
  const [iv,wrapped]=m.sessionKey.split(':');const unwrap=b=>crypto.publicDecrypt({key:publicKey,padding:crypto.constants.RSA_PKCS1_PADDING},b);
  const aes=unwrap(Buffer.from(wrapped,'base64'));const dec=crypto.createDecipheriv('aes-128-cbc',aes,Buffer.from(iv,'base64'));
  expect(Buffer.concat([dec.update(fs.readFileSync(dir+'/out/bundle.zip')),dec.final()])).toEqual(plain);
  expect(unwrap(Buffer.from(m.checksum,'hex'))).toEqual(crypto.createHash('sha256').update(plain).digest());
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
