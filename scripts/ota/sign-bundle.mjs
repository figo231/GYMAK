// Run only inside protected CI. Never prints private keys, session keys or tokens.
import fs from 'node:fs';import crypto from 'node:crypto';
const key=process.env.GYMAK_OTA_PRIVATE_KEY;if(!key)throw Error('Missing signing secret');
const [input,out,version,native,channel,url]=process.argv.slice(2);
if(!input||!out||!/^web-[1-9]\d*$/.test(version)||!/^\d+$/.test(native)||!['sideload','play'].includes(channel))throw Error('Invalid release arguments');
const u=new URL(url);if(u.origin!=='https://github.com'||u.pathname!==`/figo231/GYMAK/releases/download/${version}/bundle.zip`)throw Error('Untrusted distribution path');
const plain=fs.readFileSync(input),aes=crypto.randomBytes(16),iv=crypto.randomBytes(16);
const cipher=crypto.createCipheriv('aes-128-cbc',aes,iv);const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);
const wrap=b=>crypto.privateEncrypt({key,padding:crypto.constants.RSA_PKCS1_PADDING},b);
const payload={schema:1,enabled:true,version,nativeBuild:Number(native),channel,url,expiresAt:new Date(Date.now()+7*86400000).toISOString(),checksum:wrap(crypto.createHash('sha256').update(plain).digest()).toString('hex'),sessionKey:iv.toString('base64')+':'+wrap(aes).toString('base64')};
const raw=Buffer.from(JSON.stringify(payload));const envelope={payload:raw.toString('base64'),signature:crypto.sign('sha256',raw,key).toString('base64')};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/bundle.zip',encrypted);fs.writeFileSync(out+'/stable.json',JSON.stringify(envelope));
console.log('Signed bundle and authenticated release manifest written. Nothing published.');
