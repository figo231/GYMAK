// Public trust anchor only. Private signing material must never enter this tree.
import fs from 'node:fs';
import crypto from 'node:crypto';
const publicKey=process.env.GYMAK_OTA_PUBLIC_KEY;
const file='capacitor.config.json';const config=JSON.parse(fs.readFileSync(file,'utf8'));
if(process.env.VITE_OTA_ENABLED==='true'&&!publicKey)throw new Error('OTA enabled without native public trust anchor');
if(publicKey){
 if(!publicKey.includes('BEGIN RSA PUBLIC KEY'))throw new Error('Invalid public key envelope');
 const spki=crypto.createPublicKey(publicKey).export({type:'spki',format:'pem'});
 fs.writeFileSync('src/lib/update/otaTrust.js','// Public verification material, not a secret.\nexport const OTA_MANIFEST_PUBLIC_KEY='+JSON.stringify(spki)+';\n');
 config.plugins.CapacitorUpdater.publicKey=publicKey;
 fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
}
