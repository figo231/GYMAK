import fs from 'node:fs';import crypto from 'node:crypto';
const key=crypto.randomBytes(32),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);
const input=fs.readFileSync(process.argv[2]),data=Buffer.concat([cipher.update(input),cipher.final()]);
const wrapped=crypto.publicEncrypt({key:fs.readFileSync('scripts/private-apk-receiver.pem'),oaepHash:'sha256'},key);
fs.writeFileSync(process.argv[3],JSON.stringify({key:wrapped.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')}));
console.log('Encrypted private test artifact. No plaintext installable artifact uploaded.');
