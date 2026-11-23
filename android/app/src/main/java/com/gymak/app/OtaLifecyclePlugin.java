package com.gymak.app;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.atomic.AtomicBoolean;
/** One activation opportunity per process, not every WebView navigation/reload. */
@CapacitorPlugin(name="OtaLifecycle")
public class OtaLifecyclePlugin extends Plugin {
 private static final AtomicBoolean firstDocument=new AtomicBoolean(true);
 @PluginMethod public void consumeColdStart(PluginCall call){JSObject ret=new JSObject();ret.put("allowed",firstDocument.getAndSet(false));call.resolve(ret);}
}
