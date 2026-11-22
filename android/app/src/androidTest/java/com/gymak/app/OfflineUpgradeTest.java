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
        fail("Condition did not become true: " + condition + "; page: " + js(a, "document.body.innerText.slice(0,400)"));
    }
    @Test public void seedLegacyData() throws Exception {
        try (ActivityScenario<MainActivity> a = ActivityScenario.launch(MainActivity.class)) {
            waitFor(a, "location.origin === 'https://gymak-eight.vercel.app' && localStorage.getItem('gymak_state_v1')");
            js(a, "(()=>{const s=JSON.parse(localStorage.getItem('gymak_state_v1'));s.profile.name='Offline upgrade test';s.workoutDays=['2026-11-22'];s.exerciseLogs={'bench-press-barbell':[{date:'2026-11-22',weight:60,sets:3,reps:10}]};s.weightLogs=[{date:'2026-11-22',weight:81}];localStorage.setItem('gymak_state_v1',JSON.stringify(s));localStorage.setItem('gymak_onboarded_v1','1');localStorage.setItem('gymak_measure_v1',JSON.stringify([{id:'upgrade-waist',date:'2026-11-22',waist:84}]));localStorage.setItem('gymak_upgrade_probe','kept');window.__fixture='pending';(async()=>{for(const [name,store,id] of [['gymak_photos_v1','photos','upgrade-photo'],['gymak_exmedia_v1','media','upgrade-media']]){await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore(store,{keyPath:'id'});r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,t=d.transaction(store,'readwrite');const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6WQAAAAASUVORK5CYII='),c=>c.charCodeAt(0));t.objectStore(store).put({id,date:'2026-11-22',pose:'front',kind:'image',createdAt:1,blob:new Blob([bytes],{type:'image/png'})});t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>reject(t.error)}})}window.__fixture='done'})().catch(e=>window.__fixture=String(e));return true})()");
            waitFor(a, "window.__fixture === 'done'");
            assertEquals("kept", js(a, "localStorage.getItem('gymak_upgrade_probe')"));
        }
    }
    @Test public void keepsDataAndRunsOffline() throws Exception {
        try (ActivityScenario<MainActivity> a = ActivityScenario.launch(MainActivity.class)) {
            waitFor(a, "document.querySelector('#root')?.children.length && !document.querySelector('.splash-screen')");
            assertEquals("https://gymak-eight.vercel.app", js(a, "location.origin"));
            assertEquals("false", js(a, "navigator.onLine"));
            assertEquals("true", js(a, "window.Capacitor.isNativePlatform()"));
            assertEquals("kept", js(a, "localStorage.getItem('gymak_upgrade_probe')"));
            assertEquals("true", js(a, "(()=>{const s=JSON.parse(localStorage.getItem('gymak_state_v1'));return s.profile.name==='Offline upgrade test' && s.workoutDays.includes('2026-11-22') && s.exerciseLogs['bench-press-barbell'][0].weight===60 && s.weightLogs[0].weight===81 && JSON.parse(localStorage.getItem('gymak_measure_v1'))[0].waist===84})()"));
            js(a, "window.__photoCheck='pending';(async()=>{for(const [name,store,id] of [['gymak_photos_v1','photos','upgrade-photo'],['gymak_exmedia_v1','media','upgrade-media']]){const row=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onsuccess=()=>{const d=r.result,t=d.transaction(store);const q=t.objectStore(store).get(id);q.onsuccess=()=>{const row=q.result;d.close();resolve(row)};q.onerror=reject};r.onerror=reject});if(!row?.blob || row.blob.size!==68 || row.blob.type!=='image/png')throw new Error('blob was not preserved');const bytes=new Uint8Array(await row.blob.arrayBuffer());if(bytes[0]!==137 || bytes[1]!==80)throw new Error('bad photo bytes')}window.__photoCheck='done'})().catch(e=>window.__photoCheck=String(e))");
            waitFor(a, "window.__photoCheck === 'done'");
            assertEquals("true", js(a, "document.body.innerText.includes('Offline upgrade test')"));
            // Lazy route chunks and exercise photos must also work without network.
            js(a, "location.assign('/exercises')");
            waitFor(a, "location.pathname === '/exercises' && document.querySelectorAll('.ex-card').length > 5");
            js(a, "location.assign('/training')");
            waitFor(a, "location.pathname === '/training' && document.querySelector('.ux-training-hero')");
            assertEquals("6", js(a, "document.querySelectorAll('.bottom-nav .nav-item').length"));
            assertEquals("true", js(a, "document.body.innerText.includes('تمرين النهارده')"));
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
