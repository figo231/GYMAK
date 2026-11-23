package com.gymak.app;
import android.content.Context;import android.content.Intent;import android.os.Bundle;import com.getcapacitor.JSArray;import com.getcapacitor.JSObject;import com.getcapacitor.Plugin;import com.getcapacitor.PluginCall;import com.getcapacitor.PluginMethod;import com.getcapacitor.annotation.CapacitorPlugin;import org.json.JSONArray;import org.json.JSONObject;
/** Keeps only owner-delivery IDs and intended account IDs, never message content or tokens. */
@CapacitorPlugin(name="OwnerPushTap") public class OwnerPushTapPlugin extends Plugin{
 static final String PREF="gymak_owner_taps",KEY="pending";
 static synchronized void record(Context context,Intent intent){
  if(intent==null)return;Bundle b=intent.getExtras();if(b==null)return;
  String id=b.getString("owner_delivery_id"),user=b.getString("owner_user_id");if(id==null||user==null)return;
  try{JSONArray a=new JSONArray(context.getSharedPreferences(PREF,0).getString(KEY,"[]"));
   for(int i=0;i<a.length();i++)if(id.equals(a.getJSONObject(i).getString("id")))return;
   JSONObject row=new JSONObject();row.put("id",id);row.put("user",user);row.put("kind","opened");a.put(row);
   while(a.length()>100)a.remove(0);context.getSharedPreferences(PREF,0).edit().putString(KEY,a.toString()).commit();
  }catch(Exception ignored){}
 }
 @PluginMethod public void pending(PluginCall call){try{JSObject r=new JSObject();r.put("events",new JSArray(getContext().getSharedPreferences(PREF,0).getString(KEY,"[]")));call.resolve(r);}catch(Exception e){call.reject("tap_queue_unavailable");}}
 @PluginMethod public synchronized void remove(PluginCall call){String id=call.getString("id");try{JSONArray a=new JSONArray(getContext().getSharedPreferences(PREF,0).getString(KEY,"[]")),out=new JSONArray();for(int i=0;i<a.length();i++)if(!a.getJSONObject(i).getString("id").equals(id))out.put(a.getJSONObject(i));getContext().getSharedPreferences(PREF,0).edit().putString(KEY,out.toString()).commit();call.resolve();}catch(Exception e){call.reject("tap_queue_unavailable");}}
}
