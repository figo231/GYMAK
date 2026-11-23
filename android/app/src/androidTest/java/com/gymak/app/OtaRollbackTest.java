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
