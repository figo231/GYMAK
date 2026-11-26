package com.gymak.app;
import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.*;import java.util.concurrent.atomic.AtomicReference;import org.json.JSONTokener;import org.junit.Test;import org.junit.runner.RunWith;
@RunWith(AndroidJUnit4.class) public class MainScreensThemeTest {
 String js(ActivityScenario<MainActivity>a,String s)throws Exception{AtomicReference<String>v=new AtomicReference<>();CountDownLatch l=new CountDownLatch(1);a.onActivity(x->x.getBridge().getWebView().evaluateJavascript(s,r->{v.set(r);l.countDown();}));assertTrue(l.await(15,TimeUnit.SECONDS));return String.valueOf(new JSONTokener(v.get()).nextValue());}
 void waitFor(ActivityScenario<MainActivity>a,String s)throws Exception{for(int i=0;i<200;i++){if("true".equals(js(a,"Boolean("+s+")")))return;Thread.sleep(200);}fail("Theme route failed: "+s+" state:"+js(a,"JSON.stringify({href:location.href,text:document.body.innerText.slice(0,600)})"));}
 void paintCommitted(ActivityScenario<MainActivity>a)throws Exception{
  CountDownLatch done=new CountDownLatch(1);
  a.onActivity(x->{android.webkit.WebView v=x.getBridge().getWebView();v.postVisualStateCallback(System.nanoTime(),new android.webkit.WebView.VisualStateCallback(){@Override public void onComplete(long id){v.postOnAnimation(()->v.postOnAnimation(done::countDown));}});});
  assertTrue("WebView compositor must commit route",done.await(15,TimeUnit.SECONDS));
 }
 android.graphics.Bitmap expectedFrame(ActivityScenario<MainActivity>a,int[]bounds)throws Exception{
  AtomicReference<android.graphics.Bitmap>out=new AtomicReference<>();
  a.onActivity(x->{android.webkit.WebView v=x.getBridge().getWebView();v.getLocationOnScreen(bounds);android.graphics.Bitmap b=android.graphics.Bitmap.createBitmap(v.getWidth(),v.getHeight(),android.graphics.Bitmap.Config.ARGB_8888);v.draw(new android.graphics.Canvas(b));out.set(b);});
  return out.get();
 }
 double difference(android.graphics.Bitmap expected,android.graphics.Bitmap actual,int ox,int oy){
  long sum=0,count=0;for(int y=20;y<expected.getHeight()-20;y+=5)for(int x=10;x<expected.getWidth()-10;x+=5){if(x+ox<0||y+oy<0||x+ox>=actual.getWidth()||y+oy>=actual.getHeight())continue;int c=expected.getPixel(x,y),d=actual.getPixel(x+ox,y+oy);sum+=Math.abs(android.graphics.Color.red(c)-android.graphics.Color.red(d))+Math.abs(android.graphics.Color.green(c)-android.graphics.Color.green(d))+Math.abs(android.graphics.Color.blue(c)-android.graphics.Color.blue(d));count+=3;}return (double)sum/Math.max(1,count);
 }
 void shot(ActivityScenario<MainActivity>a,String n,boolean dark)throws Exception{
  paintCommitted(a);android.app.UiAutomation ui=InstrumentationRegistry.getInstrumentation().getUiAutomation();ui.waitForIdle(250,5000);
  android.graphics.Bitmap b=null,previous=null;boolean ok=false;int stable=0;double lastMatch=999,lastStability=999;long end=System.currentTimeMillis()+15000;
  while(System.currentTimeMillis()<end){
   assertEquals("Splash DOM must remain absent during screenshot check","false",js(a,"Boolean(document.querySelector('.splash-screen'))"));
   int[]bounds=new int[2];android.graphics.Bitmap expected=expectedFrame(a,bounds);b=ui.takeScreenshot();
   lastMatch=difference(expected,b,bounds[0],bounds[1]);lastStability=previous==null?999:difference(previous,b,0,0);
   int desired=0,total=0;for(int y=100;y<b.getHeight()-180;y+=7)for(int x=20;x<b.getWidth()-20;x+=7){int c=b.getPixel(x,y),r=android.graphics.Color.red(c),g=android.graphics.Color.green(c),v=android.graphics.Color.blue(c);total++;if(dark?r<70&&g<70&&v<70:r>220&&g>220&&v>220)desired++;}
   // The actual compositor screenshot must match a fresh draw of the mounted
   // route and remain stable across3frames. A themed splash alone cannot pass.
   stable=lastMatch<5.0&&lastStability<1.5&&desired>total/3?stable+1:0;
   expected.recycle();if(previous!=null)previous.recycle();previous=b;
   if(stable>=3){ok=true;break;}Thread.sleep(200);
  }
  java.io.File dir=InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null);
  try(java.io.FileOutputStream f=new java.io.FileOutputStream(new java.io.File(dir,n+(ok?"":"-FAILED")+".png"))){b.compress(android.graphics.Bitmap.CompressFormat.PNG,100,f);}
  try(java.io.FileOutputStream f=new java.io.FileOutputStream(new java.io.File(dir,n+"-paint.txt"))){f.write(("screenshotFreshDrawMeanChannelError="+lastMatch+";consecutiveFrameError="+lastStability+";stableFrames="+stable+";paintCommitted=true;passed="+ok).getBytes(java.nio.charset.StandardCharsets.UTF_8));}
  assertTrue("Actual pixels must match fully painted route without stale splash: "+n+" match="+lastMatch+" stable="+lastStability,ok);
 }
 @Test public void mainScreensInBothThemesOffline()throws Exception{try(ActivityScenario<MainActivity>a=ActivityScenario.launch(MainActivity.class)){
 waitFor(a,"document.querySelector('#root')?.children.length&&!document.querySelector('.splash-screen')");
 js(a,"(()=>{const id='00000000-0000-4000-8000-000000000123';localStorage.setItem('sb-fixture-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+86400,token_type:'bearer',user:{id,aud:'authenticated',role:'authenticated',email:'offline@test.invalid',app_metadata:{},user_metadata:{}}}));localStorage.setItem('gymak_local_data_owner_v1',id);localStorage.setItem('gymak_onboarded_v1','1');localStorage.setItem('gymak_tour_done_v1','1');sessionStorage.setItem('gymak_age_prompt_skip:'+id,'1');return true})()");
 for(String theme:new String[]{"light","dark"}){js(a,"localStorage.setItem('gymak_theme_pref','"+theme+"')");for(String[] route:new String[][]{{"/","home",".home .hero"},{"/exercises","training",".ex-card"},{"/food","food",".app"},{"/stats","progress",".page-title"},{"/profile","profile",".p-avatar-ring"},{"/messages","chat",".app"}}){js(a,"location.assign('"+route[0]+"')");waitFor(a,"location.pathname==='"+route[0]+"'&&document.querySelector('"+route[2]+"')&&document.querySelector('[data-gymak-route-ready]')&&!document.querySelector('.splash-screen')&&document.documentElement.dataset.theme==='"+theme+"'");assertEquals("false",js(a,"document.documentElement.scrollWidth>innerWidth"));shot(a,"main-"+route[1]+"-"+theme,theme.equals("dark"));System.out.println("MAIN_THEME_PASS="+theme+":"+route[0]);}}
 }}
}
