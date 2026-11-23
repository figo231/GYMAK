package com.gymak.app;
import static org.junit.Assert.*;import android.content.Context;import android.content.Intent;import androidx.test.ext.junit.runners.AndroidJUnit4;import androidx.test.platform.app.InstrumentationRegistry;import org.json.JSONArray;import org.junit.Test;import org.junit.runner.RunWith;
@RunWith(AndroidJUnit4.class)public class OwnerPushTapTest{
 @Test public void persistsOnlyBoundTapIdsAndDeduplicates()throws Exception{
  Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();c.getSharedPreferences(OwnerPushTapPlugin.PREF,0).edit().clear().commit();
  Intent i=new Intent();i.putExtra("owner_delivery_id","fixture-delivery");i.putExtra("owner_user_id","fixture-user");i.putExtra("gcm.n.body","Must not persist content");
  OwnerPushTapPlugin.record(c,i);OwnerPushTapPlugin.record(c,i);
  String raw=c.getSharedPreferences(OwnerPushTapPlugin.PREF,0).getString(OwnerPushTapPlugin.KEY,"[]");JSONArray a=new JSONArray(raw);
  assertEquals(1,a.length());assertEquals("fixture-user",a.getJSONObject(0).getString("user"));assertFalse(raw.contains("Must not"));
  c.getSharedPreferences(OwnerPushTapPlugin.PREF,0).edit().clear().commit();
 }
}
