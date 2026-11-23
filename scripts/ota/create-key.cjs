// Run deliberately once. Writes private material only into mode0600 temp file,
// sends it directly to GitHub encrypted repository secret, never stdout/logs.
// Requires gh already authenticated to owner's repository. Never run under xtrace.
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const repo='figo231/GYMAK';
const secrets=cp.execFileSync('gh',['secret','list','--repo',repo],{encoding:'utf8'});
if(secrets.split('\n').some(s=>s.startsWith('GYMAK_OTA_PRIVATE_KEY\t')))throw Error('Signing key already exists. Refuse rotation.');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gymak-ota-key-'));fs.chmodSync(dir,0o700);
try{
 const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048,publicKeyEncoding:{type:'pkcs1',format:'pem'},privateKeyEncoding:{type:'pkcs1',format:'pem'}});
 const file=path.join(dir,'key.pem');fs.writeFileSync(file,privateKey,{mode:0o600});
 cp.execFileSync('gh',['secret','set','GYMAK_OTA_PRIVATE_KEY','--repo',repo],{input:fs.readFileSync(file),stdio:['pipe','pipe','pipe']});
 cp.execFileSync('gh',['variable','set','GYMAK_OTA_PUBLIC_KEY','--repo',repo],{input:publicKey,stdio:['pipe','pipe','pipe']});
 fs.writeFileSync(path.join(process.cwd(),'ota-public-key.pem'),publicKey);
 console.log('OTA signing secret stored in encrypted repository secrets; public key saved. No private material printed.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
