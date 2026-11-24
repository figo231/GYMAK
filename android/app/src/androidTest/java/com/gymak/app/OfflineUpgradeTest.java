package com.gymak.app;

import static org.junit.Assert.*;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Runs on apk-9 first, then on the new APK installed with adb install -r. */
@RunWith(AndroidJUnit4.class)
public class OfflineUpgradeTest {
    private String js(ActivityScenario<MainActivity> activity, String script) throws Exception {
        AtomicReference<String> out = new AtomicReference<>();
        CountDownLatch done = new CountDownLatch(1);
        activity.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(script, value -> {
            out.set(value); done.countDown();
        }));
        assertTrue("WebView evaluation timed out", done.await(15, TimeUnit.SECONDS));
        Object value = new JSONTokener(out.get()).nextValue();
        return String.valueOf(value);
    }
    private void waitFor(ActivityScenario<MainActivity> a, String condition) throws Exception {
        long end = System.currentTimeMillis() + 60000;
        while (System.currentTimeMillis() < end) {
            if ("true".equals(js(a, "Boolean(" + condition + ")"))) return;
            Thread.sleep(300);
        }
        try {
            InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,new java.io.FileOutputStream(new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"condition-failure.png")));
            System.out.println("CONDITION_FAILURE_DOM="+js(a,"JSON.stringify({href:location.href,ready:document.readyState,text:document.body.innerText.slice(0,1800),tabs:document.querySelectorAll('.bottom-nav .nav-item').length,renderFailed:window.__gymakRenderFailed})"));
        } catch(Exception ignored) {}
        fail("Condition did not become true: " + condition + "; page: " + js(a, "document.body.innerText.slice(0,400)"));
    }
    private String accessibilityText(android.view.accessibility.AccessibilityNodeInfo node) {
        if(node==null)return "";
        StringBuilder out=new StringBuilder();out.append(node.getPackageName()).append(' ').append(node.getText()).append(' ').append(node.getContentDescription()).append('\n');
        for(int i=0;i<node.getChildCount();i++)out.append(accessibilityText(node.getChild(i)));
        return out.toString();
    }
    private boolean clickFirstRunChoice(android.view.accessibility.AccessibilityNodeInfo node) {
        if(node==null)return false;
        String text=String.valueOf(node.getText());
        if(text.equals("Use without an account")||text.equals("No thanks")||text.equals("Got it")||text.equals("Accept & continue")){
            android.view.accessibility.AccessibilityNodeInfo target=node;
            for(int i=0;target!=null&&i<4;i++,target=target.getParent())if(target.isClickable()&&target.performAction(android.view.accessibility.AccessibilityNodeInfo.ACTION_CLICK))return true;
        }
        for(int i=0;i<node.getChildCount();i++)if(clickFirstRunChoice(node.getChild(i)))return true;
        return false;
    }
    @Test public void native25VersionAndWelcomeUpdate() throws Exception {
        android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals(25,context.getPackageManager().getPackageInfo(context.getPackageName(),0).getLongVersionCode());
        try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)) {
            waitFor(a,"document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
            js(a,"window.__nativeVersion='pending';window.Capacitor.nativePromise('App','getInfo',{}).then(x=>window.__nativeVersion=String(x.build)).catch(e=>window.__nativeVersion=String(e))");
            waitFor(a,"window.__nativeVersion!=='pending'");
            assertEquals("25",js(a,"window.__nativeVersion"));
            js(a,"window.dispatchEvent(new Event('gymak-open-update-center'))");
            waitFor(a,"document.querySelector('.update-center[role=dialog]')");
            js(a,"[...document.querySelectorAll('.update-center button')].find(b=>b.textContent.includes('صفحة التحميل')||b.textContent.includes('download page'))?.click()");
            long deadline=System.currentTimeMillis()+60000;boolean found=false;
            while(System.currentTimeMillis()<deadline){
                android.view.accessibility.AccessibilityNodeInfo root=InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow();
                String tree=accessibilityText(root);System.out.println("EXTERNAL_BROWSER_TREE="+tree);
                if(tree.contains("gymak-eight.vercel.app")&&tree.contains("GYMAK")){
                    java.io.InputStream state=new android.os.ParcelFileDescriptor.AutoCloseInputStream(InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand("dumpsys activity activities"));
                    String activities=new String(state.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8);state.close();
                    java.nio.file.Files.writeString(new java.io.File(context.getExternalFilesDir(null),"native25-browser-intent.txt").toPath(),activities);
                    // Custom Tabs collapse the visible address to the host. Require the
                    // exact launched URI from Android plus the rendered landing content.
                    if(activities.contains("https://gymak-eight.vercel.app/welcome")&&tree.contains("chrome")){found=true;break;}
                }
                clickFirstRunChoice(root);Thread.sleep(600);
            }
            InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"native25-welcome.png")));
            assertTrue("Update must open external welcome landing",found);
        }
    }
    @Test public void otaActivationOnlyOncePerProcess() throws Exception {
        try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)) {
            waitFor(a,"document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
            js(a,"window.__coldProbe='pending';window.Capacitor.nativePromise('OtaLifecycle','consumeColdStart',{}).then(x=>window.__coldProbe=String(x.allowed)).catch(e=>window.__coldProbe=String(e))");
            waitFor(a,"window.__coldProbe === 'true' || window.__coldProbe === 'false'");
            assertEquals("true",js(a,"window.__coldProbe"));
            js(a,"window.__coldProbe='pending';window.Capacitor.nativePromise('OtaLifecycle','consumeColdStart',{}).then(x=>window.__coldProbe=String(x.allowed))");
            waitFor(a,"window.__coldProbe === 'true' || window.__coldProbe === 'false'");assertEquals("false",js(a,"window.__coldProbe"));
            js(a,"window.__beforeOtaReload=true;location.reload()");
            waitFor(a,"!window.__beforeOtaReload && document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
            js(a,"window.__coldProbe='pending';window.Capacitor.nativePromise('OtaLifecycle','consumeColdStart',{}).then(x=>window.__coldProbe=String(x.allowed))");
            waitFor(a,"window.__coldProbe === 'true' || window.__coldProbe === 'false'");assertEquals("false",js(a,"window.__coldProbe"));
        }
    }
    @Test public void seedLegacyData() throws Exception {
        try (ActivityScenario<MainActivity> a = ActivityScenario.launch(MainActivity.class)) {
            waitFor(a, "location.origin === 'https://gymak-eight.vercel.app' && localStorage.getItem('gymak_state_v1')");
            js(a, "(()=>{const s=JSON.parse(localStorage.getItem('gymak_state_v1'));s.profile.name='Offline upgrade test';s.workoutDays=['2026-11-22'];s.exerciseLogs={'bench-press-barbell':[{date:'2026-11-22',weight:60,sets:3,reps:10}]};s.weightLogs=[{date:'2026-11-22',weight:81}];localStorage.setItem('gymak_state_v1',JSON.stringify(s));localStorage.setItem('gymak_onboarded_v1','1');localStorage.setItem('gymak_measure_v1',JSON.stringify([{id:'upgrade-waist',date:'2026-11-22',waist:84}]));localStorage.setItem('gymak_upgrade_probe','kept');window.__fixture='pending';(async()=>{for(const [name,store,id] of [['gymak_photos_v1','photos','upgrade-photo'],['gymak_exmedia_v1','media','upgrade-media']]){await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore(store,{keyPath:'id'});r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,t=d.transaction(store,'readwrite');const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6WQAAAAASUVORK5CYII='),c=>c.charCodeAt(0));t.objectStore(store).put({id,date:'2026-11-22',pose:'front',kind:'image',createdAt:1,blob:new Blob([bytes],{type:'image/png'})});t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>reject(t.error)}})}window.__fixture='done'})().catch(e=>window.__fixture=String(e));return true})()");
            waitFor(a, "window.__fixture === 'done'");
            assertEquals("kept", js(a, "localStorage.getItem('gymak_upgrade_probe')"));
            // Prove seed survives an ordinary same-version document restart before
            // attributing any failure to a package upgrade.
            js(a,"window.__seedReload=true;location.reload()");
            waitFor(a,"!window.__seedReload && document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
            assertEquals("kept",js(a,"localStorage.getItem('gymak_upgrade_probe')"));
            System.out.println("SEED_PERSISTED="+js(a,"JSON.stringify({origin:location.origin,probe:localStorage.getItem('gymak_upgrade_probe'),keys:Object.keys(localStorage).length})"));
            Thread.sleep(1500);
        }
    }
    @Test public void confirmsSeedAfterLegacyProcessDeath() throws Exception {
        try(ActivityScenario<MainActivity> a=ActivityScenario.launch(MainActivity.class)) {
            waitFor(a,"location.origin === 'https://gymak-eight.vercel.app' && localStorage.getItem('gymak_state_v1')");
            assertEquals("kept",js(a,"localStorage.getItem('gymak_upgrade_probe')"));
            assertEquals("Offline upgrade test",js(a,"JSON.parse(localStorage.getItem('gymak_state_v1')).profile.name"));
            System.out.println("LEGACY_PROCESS_RESTART_SEED="+js(a,"JSON.stringify({origin:location.origin,probe:localStorage.getItem('gymak_upgrade_probe'),keys:Object.keys(localStorage).length})"));
        }
    }
    @Test public void keepsDataAndRunsOffline() throws Exception {
        try (ActivityScenario<MainActivity> a = ActivityScenario.launch(MainActivity.class)) {
            waitFor(a, "document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
            assertEquals("https://gymak-eight.vercel.app", js(a, "location.origin"));
            assertEquals("false", js(a, "navigator.onLine"));
            assertEquals("true", js(a, "window.Capacitor.isNativePlatform()"));
            System.out.println("POST_UPGRADE_STORAGE="+js(a,"JSON.stringify({origin:location.origin,probe:localStorage.getItem('gymak_upgrade_probe'),keys:Object.keys(localStorage).length,profile:JSON.parse(localStorage.getItem('gymak_state_v1')||'{}').profile})"));
            assertEquals("kept", js(a, "localStorage.getItem('gymak_upgrade_probe')"));
            assertEquals("true", js(a, "(()=>{const s=JSON.parse(localStorage.getItem('gymak_state_v1'));return s.profile.name==='Offline upgrade test' && s.workoutDays.includes('2026-11-22') && s.exerciseLogs['bench-press-barbell'][0].weight===60 && s.weightLogs[0].weight===81 && JSON.parse(localStorage.getItem('gymak_measure_v1'))[0].waist===84})()"));
            js(a, "window.__photoCheck='pending';(async()=>{for(const [name,store,id] of [['gymak_photos_v1','photos','upgrade-photo'],['gymak_exmedia_v1','media','upgrade-media']]){const row=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onsuccess=()=>{const d=r.result,t=d.transaction(store);const q=t.objectStore(store).get(id);q.onsuccess=()=>{const row=q.result;d.close();resolve(row)};q.onerror=reject};r.onerror=reject});if(!row?.blob || row.blob.size!==68 || row.blob.type!=='image/png')throw new Error('blob was not preserved');const bytes=new Uint8Array(await row.blob.arrayBuffer());if(bytes[0]!==137 || bytes[1]!==80)throw new Error('bad photo bytes')}window.__photoCheck='done'})().catch(e=>window.__photoCheck=String(e))");
            waitFor(a, "window.__photoCheck === 'done'");
            assertEquals("true", js(a, "document.body.innerText.includes('Offline upgrade test')"));
            // Lazy route chunks and exercise photos must also work without network.
            js(a, "location.assign('/exercises')");
            waitFor(a, "location.pathname === '/exercises' && document.querySelectorAll('.ex-card').length > 5");
            js(a, "window.__beforeTrainingNavigation=true;location.assign('/training')");
            waitFor(a, "!window.__beforeTrainingNavigation && location.pathname === '/exercises' && document.querySelectorAll('.ex-card').length > 5 && document.querySelectorAll('.bottom-nav .nav-item').length === 6");
            assertEquals("6", js(a, "document.querySelectorAll('.bottom-nav .nav-item').length"));
            assertEquals("true", js(a, "document.body.innerText.includes('التمارين')"));
            js(a, "location.assign('/photos')");
            waitFor(a, "location.pathname === '/photos' && document.querySelector('img[src^=\"blob:\"]')?.complete");
            js(a, "location.assign('/')");
            waitFor(a, "document.body.innerText.includes('Offline upgrade test') && !document.querySelector('.splash-screen')");
            Thread.sleep(1000);
            InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,new java.io.FileOutputStream(new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"offline-upgrade.png")));
        }
    }
    @Test public void freshOfflineInstall() throws Exception {
        try (ActivityScenario<MainActivity> a = ActivityScenario.launch(MainActivity.class)) {
            waitFor(a, "document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
            assertEquals("false", js(a, "navigator.onLine"));
            assertEquals("https://gymak-eight.vercel.app", js(a, "location.origin"));
            assertEquals("true", js(a, "window.Capacitor.isNativePlatform()"));
            assertEquals("true", js(a, "document.body.innerText.includes('GYMAK') && !document.body.innerText.includes('ERR_CONNECTION')"));
            InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,new java.io.FileOutputStream(new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"fresh-offline.png")));
        }
    }
}
