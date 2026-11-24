package com.gymak.app;
import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.getcapacitor.Plugin;
import ee.forgr.capacitor_updater.*;
import java.io.*;import java.lang.reflect.Field;import java.util.Date;import java.util.concurrent.*;import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONTokener;import org.junit.Test;import org.junit.runner.RunWith;
/** Isolated emulator only: tests native switch/readiness/rollback, no remote release. */
@RunWith(AndroidJUnit4.class)
public class OtaRollbackTest {
 private String js(ActivityScenario<MainActivity> a,String s)throws Exception{AtomicReference<String> r=new AtomicReference<>();CountDownLatch l=new CountDownLatch(1);a.onActivity(x->x.getBridge().getWebView().evaluateJavascript(s,v->{r.set(v);l.countDown();}));assertTrue(l.await(15,TimeUnit.SECONDS));return String.valueOf(new JSONTokener(r.get()).nextValue());}
 private void waitFor(ActivityScenario<MainActivity>a,String c,int seconds)throws Exception{long end=System.currentTimeMillis()+seconds*1000L;while(System.currentTimeMillis()<end){if("true".equals(js(a,"Boolean("+c+")")))return;Thread.sleep(200);}fail("Timed out: "+c+" page:"+js(a,"document.body.innerText.slice(0,300)"));}
 private void copy(android.content.res.AssetManager assets,String src,File dest)throws Exception{String[] children=assets.list(src);if(children.length>0){dest.mkdirs();for(String c:children)copy(assets,src+"/"+c,new File(dest,c));}else{dest.getParentFile().mkdirs();try(InputStream in=assets.open(src);OutputStream out=new FileOutputStream(dest)){in.transferTo(out);}}}
 private void zipAssets(android.content.res.AssetManager assets,String src,String rel,java.util.zip.ZipOutputStream z)throws Exception{String[] children=assets.list(src);if(children.length>0){for(String c:children)zipAssets(assets,src+"/"+c,rel.isEmpty()?c:rel+"/"+c,z);}else{z.putNextEntry(new java.util.zip.ZipEntry(rel));try(InputStream in=assets.open(src)){if(rel.equals("index.html")){String html=new String(in.readAllBytes(),"UTF-8");z.write(html.replace("<head>","<head><script>window.__otaPipeline=true;</script>").getBytes("UTF-8"));}else in.transferTo(z);}z.closeEntry();}}
 private String hex(byte[] b){StringBuilder s=new StringBuilder();for(byte x:b)s.append(String.format("%02x",x));return s.toString();}
 @Test public void encryptedDownloadUnzipRejectsCorruptionAndPreservesData()throws Exception{
  try(ActivityScenario<MainActivity>a=ActivityScenario.launch(MainActivity.class)){
   waitFor(a,"document.querySelector('[data-gymak-route-ready]')&&!document.querySelector('.splash-screen')",60);
   AtomicReference<CapgoUpdater> ref=new AtomicReference<>();AtomicReference<android.content.Context> context=new AtomicReference<>();
   a.onActivity(x->{try{Plugin p=x.getBridge().getPlugin("CapacitorUpdater").getInstance();Field f=p.getClass().getDeclaredField("implementation");f.setAccessible(true);ref.set((CapgoUpdater)f.get(p));context.set(x);}catch(Exception e){throw new RuntimeException(e);}});
   CapgoUpdater u=ref.get();Thread.sleep(2500);
   ByteArrayOutputStream bytes=new ByteArrayOutputStream();try(java.util.zip.ZipOutputStream zip=new java.util.zip.ZipOutputStream(bytes)){zipAssets(context.get().getAssets(),"public","",zip);}byte[] plain=bytes.toByteArray();
   java.security.KeyPairGenerator g=java.security.KeyPairGenerator.getInstance("RSA");g.initialize(2048);java.security.KeyPair keys=g.generateKeyPair();
   byte[] spki=keys.getPublic().getEncoded();int off=0;for(;off<spki.length-4;off++)if((spki[off]&255)==3&&(spki[off+1]&255)==130&&spki[off+4]==0)break;
   String pub="-----BEGIN RSA PUBLIC KEY-----\n"+android.util.Base64.encodeToString(java.util.Arrays.copyOfRange(spki,off+5,spki.length),2)+"\n-----END RSA PUBLIC KEY-----";
   byte[] aes=new byte[16],iv=new byte[16];new java.security.SecureRandom().nextBytes(aes);new java.security.SecureRandom().nextBytes(iv);
   javax.crypto.Cipher cipher=javax.crypto.Cipher.getInstance("AES/CBC/PKCS5Padding");cipher.init(1,new javax.crypto.spec.SecretKeySpec(aes,"AES"),new javax.crypto.spec.IvParameterSpec(iv));byte[] encrypted=cipher.doFinal(plain);
   javax.crypto.Cipher rsa=javax.crypto.Cipher.getInstance("RSA/ECB/PKCS1Padding");rsa.init(1,keys.getPrivate());String session=android.util.Base64.encodeToString(iv,2)+":"+android.util.Base64.encodeToString(rsa.doFinal(aes),2);String checksum=hex(rsa.doFinal(java.security.MessageDigest.getInstance("SHA-256").digest(plain)));
   Field cf=DownloadService.class.getDeclaredField("sharedClient");cf.setAccessible(true);okhttp3.OkHttpClient original=(okhttp3.OkHttpClient)cf.get(null);String originalKey=u.publicKey;
   java.util.concurrent.atomic.AtomicBoolean corrupt=new java.util.concurrent.atomic.AtomicBoolean(false);
   okhttp3.OkHttpClient fixture=original.newBuilder().addInterceptor(chain->{if(!chain.request().url().host().equals("ota-fixture.invalid")&&!chain.request().url().toString().contains("/web-900010/"))return chain.proceed(chain.request());byte[] body=encrypted.clone();if(corrupt.get())body[body.length/2]^=1;return new okhttp3.Response.Builder().request(chain.request()).protocol(okhttp3.Protocol.HTTP_1_1).code(200).message("fixture").body(okhttp3.ResponseBody.create(okhttp3.MediaType.parse("application/zip"),body)).build();}).build();
   try{u.setPublicKey(pub);cf.set(null,fixture);
    String harness;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("ota-pipeline-fixture.js")){harness=new String(in.readAllBytes(),"UTF-8");}js(a,harness);
    org.json.JSONObject manifest=new org.json.JSONObject().put("schema",1).put("enabled",true).put("channel","sideload").put("nativeBuild",context.get().getPackageManager().getPackageInfo(context.get().getPackageName(),0).getLongVersionCode()).put("version","web-900010").put("expiresAt",new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'",java.util.Locale.US).format(new Date(System.currentTimeMillis()+86400000L))).put("url","https://github.com/figo231/GYMAK/releases/download/web-900010/bundle.zip").put("checksum",checksum).put("sessionKey",session);
    byte[] payload=manifest.toString().getBytes("UTF-8");java.security.Signature signer=java.security.Signature.getInstance("SHA256withRSA");signer.initSign(keys.getPrivate());signer.update(payload);
    org.json.JSONObject envelope=new org.json.JSONObject().put("payload",android.util.Base64.encodeToString(payload,2)).put("signature",android.util.Base64.encodeToString(signer.sign(),2));
    String spkiPem="-----BEGIN PUBLIC KEY-----\n"+android.util.Base64.encodeToString(keys.getPublic().getEncoded(),2)+"\n-----END PUBLIC KEY-----";
    js(a,"localStorage.setItem('gymak_transport_probe','retained');window.__pipelineDone=false;window.__fixtureStage("+envelope.toString()+","+org.json.JSONObject.quote(spkiPem)+","+context.get().getPackageManager().getPackageInfo(context.get().getPackageName(),0).getLongVersionCode()+").then(v=>{window.__pipelineDone=v}).catch(e=>{window.__pipelineError=String(e)})");
    waitFor(a,"window.__pipelineDone||window.__pipelineError",60);assertEquals("undefined",js(a,"String(window.__pipelineError)"));assertFalse("staging must not interrupt running app","true".equals(js(a,"Boolean(window.__otaPipeline)")));
    String staged=js(a,"JSON.parse(localStorage.getItem('gymak_ota_staged_v1')).id");BundleInfo good=u.getBundleInfo(staged);assertFalse(good.isErrorStatus());assertTrue(new File(u.documentsDir,"versions/"+good.getId()+"/index.html").exists());
    js(a,"localStorage.setItem('gymak_transport_probe','retained')");corrupt.set(true);boolean rejected=false;try{u.download("https://ota-fixture.invalid/corrupt.zip","web-900011",session,checksum);}catch(IOException expected){rejected=true;}assertTrue("corrupted ZIP must fail",rejected);assertEquals("retained",js(a,"localStorage.getItem('gymak_transport_probe')"));
   }finally{cf.set(null,original);u.setPublicKey(originalKey);}
  }
 }
 @Test public void activatesPipelineOnNextColdStart()throws Exception{
  try(ActivityScenario<MainActivity>a=ActivityScenario.launch(MainActivity.class)){
   waitFor(a,"window.__otaPipeline&&document.querySelector('[data-gymak-route-ready]')&&!document.querySelector('.splash-screen')",60);
   assertEquals("retained",js(a,"localStorage.getItem('gymak_transport_probe')"));assertEquals("null",js(a,"String(localStorage.getItem('gymak_ota_staged_v1'))"));
   Thread.sleep(2000);assertEquals("true",js(a,"Boolean(window.__otaPipeline)"));
  }
 }
 @Test public void switchesGoodBundleAndRollsBackUnreadyBundleWithoutDataLoss()throws Exception{
  try(ActivityScenario<MainActivity>a=ActivityScenario.launch(MainActivity.class)){
   waitFor(a,"document.querySelector('[data-gymak-route-ready]')&&!document.querySelector('.splash-screen')",60);
   js(a,"localStorage.setItem('gymak_ota_rollback_probe','preserved')");
   AtomicReference<CapgoUpdater> impl=new AtomicReference<>();AtomicReference<android.content.Context> ctx=new AtomicReference<>();
   a.onActivity(x->{try{Plugin p=x.getBridge().getPlugin("CapacitorUpdater").getInstance();Field f=p.getClass().getDeclaredField("implementation");f.setAccessible(true);impl.set((CapgoUpdater)f.get(p));ctx.set(x);}catch(Exception e){throw new RuntimeException(e);}});
   CapgoUpdater updater=impl.get();assertNotNull(updater);
   File good=new File(updater.documentsDir,"versions/otatestgood1");copy(ctx.get().getAssets(),"public",good);
   File idx=new File(good,"index.html");String html=new String(java.nio.file.Files.readAllBytes(idx.toPath()),"UTF-8");java.nio.file.Files.write(idx.toPath(),html.replace("<head>","<head><script>window.__otaGood=true;</script>").getBytes("UTF-8"));
   updater.saveBundleInfo("otatestgood1",new BundleInfo("otatestgood1","web-900001",BundleStatus.PENDING,new Date(),"fixture"));
   js(a,"window.Capacitor.nativePromise('CapacitorUpdater','set',{id:'otatestgood1'}).catch(()=>{})");
   waitFor(a,"window.__otaGood&&document.querySelector('[data-gymak-route-ready]')&&!document.querySelector('.splash-screen')",60);
   Thread.sleep(2500);assertEquals("preserved",js(a,"localStorage.getItem('gymak_ota_rollback_probe')"));
   File bad=new File(updater.documentsDir,"versions/otatestbad01");bad.mkdirs();java.nio.file.Files.write(new File(bad,"index.html").toPath(),"<!doctype html><html><body>Deliberate unready test bundle</body></html>".getBytes("UTF-8"));
   updater.saveBundleInfo("otatestbad01",new BundleInfo("otatestbad01","web-900002",BundleStatus.PENDING,new Date(),"fixture"));
   js(a,"window.Capacitor.nativePromise('CapacitorUpdater','set',{id:'otatestbad01'}).catch(()=>{})");
   waitFor(a,"document.body.innerText.includes('Deliberate unready test bundle')",15);
   waitFor(a,"window.__otaGood&&document.querySelector('[data-gymak-route-ready]')&&!document.querySelector('.splash-screen')",60);
   assertEquals("preserved",js(a,"localStorage.getItem('gymak_ota_rollback_probe')"));assertTrue(updater.getBundleInfo("otatestbad01").isErrorStatus());
   InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,new FileOutputStream(new File(ctx.get().getExternalFilesDir(null),"ota-rollback.png")));
  }
 }
}
