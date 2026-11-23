package com.gymak.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle state) {
        registerPlugin(OtaLifecyclePlugin.class);
        super.onCreate(state);
        if (getBridge() == null) return;
        // Retain the old HTTPS origin, but let Capacitor serve packaged assets.
        // A legacy PWA worker must not pin this native build to an old web bundle.
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (!url.startsWith("https://gymak-eight.vercel.app/")) return;
                view.evaluateJavascript(
                    "(()=>{if(!navigator.serviceWorker)return;" +
                    "navigator.serviceWorker.getRegistrations().then(async rs=>{" +
                    "if(!rs.length)return;await Promise.all(rs.map(r=>r.unregister()));" +
                    "if(window.caches){const ks=await caches.keys();" +
                    "await Promise.all(ks.filter(k=>k.startsWith('workbox-precache')).map(k=>caches.delete(k)));}" +
                    "location.reload();}).catch(()=>{});})()", null);
                // No localStorage, IndexedDB, cookies or app data are cleared.
            }
        });
    }
}
