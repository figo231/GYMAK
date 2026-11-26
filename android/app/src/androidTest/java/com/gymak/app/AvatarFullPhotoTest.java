package com.gymak.app;
import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONTokener;
import org.junit.*;
import org.junit.runner.RunWith;
@RunWith(AndroidJUnit4.class) public class AvatarFullPhotoTest {
 String js(ActivityScenario<MainActivity>a,String s)throws Exception{AtomicReference<String>v=new AtomicReference<>();CountDownLatch l=new CountDownLatch(1);a.onActivity(x->x.getBridge().getWebView().evaluateJavascript(s,r->{v.set(r);l.countDown();}));assertTrue(l.await(15,TimeUnit.SECONDS));return String.valueOf(new JSONTokener(v.get()).nextValue());}
 void waitFor(ActivityScenario<MainActivity>a,String s)throws Exception{for(int i=0;i<150;i++){if("true".equals(js(a,"Boolean("+s+")")))return;Thread.sleep(200);}throw new AssertionError(s);}
 void shot(String n)throws Exception{
  android.graphics.Bitmap painted=null;boolean ready=false;
  for(int attempt=0;attempt<50;attempt++){
   painted=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
   int blue=0,dark=0,light=0,total=0;
   for(int y=60;y<painted.getHeight()-150;y+=5)for(int x=10;x<painted.getWidth()-10;x+=5){
    int p=painted.getPixel(x,y),r=android.graphics.Color.red(p),g=android.graphics.Color.green(p),b=android.graphics.Color.blue(p);total++;
    if(r>35&&r<80&&g>65&&g<110&&b>85&&b<135)blue++;
    if(r<35&&g<35&&b<35)dark++;
    if(r>230&&g>230&&b>230)light++;
   }
   ready=blue>total/10&&(n.endsWith("dark")?dark>total/4:light>total/4);
   if(ready)break;Thread.sleep(200);
  }
  assertTrue("Native compositor must paint avatar grid and requested theme before screenshot",ready);
  painted.compress(android.graphics.Bitmap.CompressFormat.PNG,100,new java.io.FileOutputStream(new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),n+".png")));
 }

 @Test public void localStorageFailureSafety()throws Exception{try(ActivityScenario<MainActivity>a=ActivityScenario.launch(MainActivity.class)){
 waitFor(a,"window.__storageVerification");
 assertEquals("true",js(a,"(()=>{const{measure:m,water:w}=window.__storageVerification;localStorage.setItem('gymak_measure_v1',JSON.stringify([{date:'2026-11-23',waist:90},{date:'2026-11-24',arm:35}]));const before=localStorage.getItem('gymak_measure_v1'),real=Storage.prototype.setItem;let rejected=false;Storage.prototype.setItem=function(k,v){if(k==='gymak_measure_v1')throw new DOMException('quota','QuotaExceededError');return real.call(this,k,v)};try{m.replaceMeasure({waist:88},'2026-11-25','2026-11-23')}catch{rejected=true}finally{Storage.prototype.setItem=real}if(!rejected||localStorage.getItem('gymak_measure_v1')!==before)return false;m.replaceMeasure({waist:88},'2026-11-25','2026-11-23');if(m.loadMeasures().length!==2||m.loadMeasures()[1].waist!==88)return false;const unchanged=localStorage.getItem('gymak_measure_v1');try{m.replaceMeasure({waist:80},'2026-11-24','2026-11-25');return false}catch{}if(localStorage.getItem('gymak_measure_v1')!==unchanged)return false;w.setWaterTotal(500,'2026-11-25');const old=localStorage.getItem('gymak_water_v1');Storage.prototype.setItem=function(k,v){if(k==='gymak_water_v1')throw new DOMException('quota','QuotaExceededError');return real.call(this,k,v)};rejected=false;try{w.addWater(250,'2026-11-25')}catch{rejected=true}finally{Storage.prototype.setItem=real}return rejected&&localStorage.getItem('gymak_water_v1')===old})()"));
 }}
 @Test public void fullPhotosStayInsideAllCircularFrames()throws Exception{try(ActivityScenario<MainActivity>a=ActivityScenario.launch(MainActivity.class)){
 waitFor(a,"window.__avatarVerificationReady && document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
 Thread.sleep(1000);
 for(String theme:new String[]{"light","dark"}){
 js(a,"window.__showAvatarVerification('"+theme+"')");
 waitFor(a,"document.querySelectorAll('#avatar-native-verification img[data-ready]').length===18");
 assertEquals("true",js(a,"[...document.querySelectorAll('#avatar-native-verification img')].every(i=>{const a=i.parentElement.getBoundingClientRect(),b=i.getBoundingClientRect();return a.width===a.height&&Math.abs(b.width-a.width)<.1&&Math.abs(b.height-a.height)<.1&&Math.abs((b.x+b.width/2)-(a.x+a.width/2))<.1&&Math.abs((b.y+b.height/2)-(a.y+a.height/2))<.1&&getComputedStyle(i).objectFit==='cover'&&getComputedStyle(i).objectPosition==='50% 50%'})"));
 waitFor(a,"document.documentElement.getAttribute('data-theme')==='"+theme+"'");
 Thread.sleep(1000);
 assertEquals(theme,js(a,"document.documentElement.getAttribute('data-theme')"));
 assertEquals("true",js(a,"(()=>{const c=getComputedStyle(document.querySelector('#avatar-native-verification')).backgroundColor.match(/\\d+/g).map(Number);return "+(theme.equals("dark")?"c[0]<80&&c[1]<80&&c[2]<80":"c[0]>180&&c[1]>180&&c[2]>180")+"})()"));
 shot("avatar-native-"+theme);
 }
 assertEquals("kept",js(a,"localStorage.getItem('avatar-native-preserve')"));
 }}
}
