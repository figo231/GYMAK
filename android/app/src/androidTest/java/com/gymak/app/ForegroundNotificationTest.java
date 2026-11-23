package com.gymak.app;
import static org.junit.Assert.*;
import android.Manifest;import android.app.NotificationManager;import android.content.Context;import android.os.Bundle;
import androidx.test.ext.junit.runners.AndroidJUnit4;import androidx.test.platform.app.InstrumentationRegistry;
import com.google.firebase.messaging.RemoteMessage;import org.junit.Test;import org.junit.runner.RunWith;
/** Synthetic local callback only. No FCM/network send, never user's device. */
@RunWith(AndroidJUnit4.class) public class ForegroundNotificationTest {
 @Test public void postsForegroundSystemNotificationWithoutDuplicate()throws Exception{
  Context ctx=InstrumentationRegistry.getInstrumentation().getTargetContext();
  InstrumentationRegistry.getInstrumentation().getUiAutomation().grantRuntimePermission(ctx.getPackageName(),Manifest.permission.POST_NOTIFICATIONS);
  NotificationManager manager=ctx.getSystemService(NotificationManager.class);manager.cancelAll();
  Bundle b=new Bundle();b.putString("from","local-fixture");b.putString("google.message_id","fixture-foreground");b.putString("gcm.n.e","1");b.putString("gcm.n.title","GYMAK fixture");b.putString("gcm.n.body","Local native display test");b.putString("notification_id","fixture-campaign");
  RemoteMessage message=new RemoteMessage(b);
  // Service binding is not supported by FirebaseMessagingService. Create the
  // Android Service with a real application base context for callback testing.
  GymakMessagingService service=new GymakMessagingService();
  java.lang.reflect.Method attach=android.content.ContextWrapper.class.getDeclaredMethod("attachBaseContext",Context.class);attach.setAccessible(true);attach.invoke(service,ctx);
  android.content.Intent tap=service.createTapIntent(message,"fixture-campaign");
  assertEquals("fixture-foreground",tap.getStringExtra("google.message_id"));
  assertEquals("fixture-campaign",tap.getStringExtra("notification_id"));
  assertEquals("GYMAK fixture",tap.getStringExtra("gcm.n.title"));
  assertEquals("fixture-foreground",io.capawesome.capacitorjs.plugins.firebase.messaging.FirebaseMessagingHelper.createNotificationResult(tap.getExtras()).getString("id"));
  try{service.onMessageReceived(message);service.onMessageReceived(message);
   Thread.sleep(500);assertEquals(1,manager.getActiveNotifications().length);assertEquals(GymakMessagingService.CHANNEL,manager.getActiveNotifications()[0].getNotification().getChannelId());
  }finally{manager.cancelAll();}
 }
}
