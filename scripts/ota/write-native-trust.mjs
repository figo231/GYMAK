// Public trust anchor only. Private signing material must never enter this tree.
import fs from 'node:fs';
const publicKey=process.env.GYMAK_OTA_PUBLIC_KEY;
const file='capacitor.config.json';const config=JSON.parse(fs.readFileSync(file,'utf8'));
if(process.env.VITE_OTA_ENABLED==='true'&&!publicKey)throw new Error('OTA enabled without native public trust anchor');
if(publicKey){
 if(!publicKey.includes('BEGIN PUBLIC KEY'))throw new Error('Invalid public key envelope');
 config.plugins.CapacitorUpdater.publicKey=publicKey;
 fs.writeFileSync(file,JSON.stringify(config,null,2)+'\n');
}
