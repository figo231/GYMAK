package com.gymak.app;
import static org.junit.Assert.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;
/** Emulator-only synthetic reminders. No server or user account is used. */
@RunWith(AndroidJUnit4.class)
public class Apk27ReminderTest {
 private String js(ActivityScenario<MainActivity> a,String code)throws Exception{
  AtomicReference<String> out=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);
  a.onActivity(x->x.getBridge().getWebView().evaluateJavascript(code,v->{out.set(v);done.countDown();}));
  assertTrue(done.await(15,TimeUnit.SECONDS));return String.valueOf(new JSONTokener(out.get()).nextValue());
 }
 private void waitFor(ActivityScenario<MainActivity> a,String condition)throws Exception{
  long deadline=System.currentTimeMillis()+30000;
  while(System.currentTimeMillis()<deadline){if("true".equals(js(a,"Boolean("+condition+")")))return;Thread.sleep(200);}
  fail("Reminder bridge condition timed out");
 }
 @Test public void schedulesAndCancelsThroughRealAndroidPlugin()throws Exception{
  try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)){
   waitFor(a,"window.Capacitor?.nativePromise && document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
   js(a,"window.__reminder='pending';Capacitor.nativePromise('LocalNotifications','checkPermissions',{}).then(x=>window.__reminder=x.display).catch(()=>window.__reminder='error')");
   waitFor(a,"window.__reminder!=='pending'");assertEquals("granted",js(a,"window.__reminder"));
   js(a,"window.__reminder='pending';Capacitor.nativePromise('LocalNotifications','schedule',{notifications:[{id:4299,isExactNotification:false,title:'Verification only',body:'Synthetic emulator reminder',schedule:{at:new Date(Date.now()+3600000).toISOString()}}]}).then(()=>Capacitor.nativePromise('LocalNotifications','getPending',{})).then(x=>window.__reminder=String(x.notifications.some(n=>n.id===4299))).catch(()=>window.__reminder='error')");
   waitFor(a,"window.__reminder!=='pending'");assertEquals("true",js(a,"window.__reminder"));
   a.recreate();waitFor(a,"window.Capacitor?.nativePromise && document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
   js(a,"window.__reminder='pending';Capacitor.nativePromise('LocalNotifications','getPending',{}).then(x=>window.__reminder=String(x.notifications.some(n=>n.id===4299))).catch(()=>window.__reminder='error')");
   waitFor(a,"window.__reminder!=='pending'");assertEquals("true",js(a,"window.__reminder"));
   js(a,"window.__reminder='pending';Capacitor.nativePromise('LocalNotifications','cancel',{notifications:[{id:4299}]}).then(()=>Capacitor.nativePromise('LocalNotifications','getPending',{})).then(x=>window.__reminder=String(x.notifications.some(n=>n.id===4299))).catch(()=>window.__reminder='error')");
   waitFor(a,"window.__reminder!=='pending'");assertEquals("false",js(a,"window.__reminder"));
  }
 }
}
