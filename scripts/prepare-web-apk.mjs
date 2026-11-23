import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
if(process.env.VERCEL==='1'){
 const r=await fetch('https://api.github.com/repos/figo231/GYMAK/releases/latest');
 if(!r.ok)throw new Error('Cannot verify current Android release');
 const release=await r.json();const asset=release.assets.find(a=>a.name==='GYMAK.apk');
 if(!asset)throw new Error('No Android release asset');
 const response=await fetch(asset.browser_download_url);if(!response.ok)throw new Error('APK download failed');
 const bytes=Buffer.from(await response.arrayBuffer());
 if(bytes.length!==asset.size)throw new Error('APK size mismatch');
 const digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
 if(!asset.digest||digest!==asset.digest)throw new Error('APK digest mismatch');
 await mkdir('public/download',{recursive:true});
 await writeFile('public/download/GYMAK.apk',bytes);
 await writeFile('public/download/version.json',JSON.stringify({tag:release.tag_name,size:bytes.length,sha256:digest.slice(7)}));
 console.log('Verified same-domain APK:',release.tag_name,bytes.length,digest);
}
