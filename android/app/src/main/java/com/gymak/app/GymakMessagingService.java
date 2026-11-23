package com.gymak.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.RemoteMessage;
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;

/** v1 notification payloads are auto-displayed by FCM in background. This
 * callback displays the foreground notification, then forwards to JS inbox. */
public class GymakMessagingService extends MessagingService {
 public static final String CHANNEL="gymak_announcements";
 @Override public void onMessageReceived(RemoteMessage message) {
  RemoteMessage.Notification n=message.getNotification();
  if(n!=null) {
   NotificationManager manager=getSystemService(NotificationManager.class);
   if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel(CHANNEL,"GYMAK",NotificationManager.IMPORTANCE_DEFAULT));
   boolean allowed=Build.VERSION.SDK_INT<33||checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
   if(allowed&&NotificationManagerCompat.from(this).areNotificationsEnabled()){
    String id=message.getData().get("notification_id");if(id==null)id=message.getMessageId();if(id==null)id=String.valueOf(System.currentTimeMillis());
    Intent open=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    open.putExtra("notification_id",id);
    PendingIntent action=PendingIntent.getActivity(this,id.hashCode(),open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    NotificationCompat.Builder b=new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(com.gymak.app.R.drawable.ic_stat_gymak).setContentTitle(n.getTitle()).setContentText(n.getBody()).setStyle(new NotificationCompat.BigTextStyle().bigText(n.getBody())).setAutoCancel(true).setOnlyAlertOnce(true).setContentIntent(action);
    manager.notify(id,id.hashCode(),b.build());
   }
  }
  super.onMessageReceived(message);
 }
}
