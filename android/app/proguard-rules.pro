# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---------------------------------------------------------------------
# Capacitor keep rules — added as safe groundwork for Sprint 5 (Production
# Hygiene). These rules have ZERO effect right now: build.gradle still has
# minifyEnabled false, so R8 does not run on release builds at all yet.
# They exist so that a FUTURE, separately-tested sprint that flips
# minifyEnabled to true (verified against a real device build) starts from
# a safer baseline instead of the blank default template. Do not treat
# their presence as confirmation that minification is safe — it has not
# been build-tested in this environment.
# ---------------------------------------------------------------------
-keep class com.getcapacitor.** { *; }
-keep class com.gymak.app.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
}
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

