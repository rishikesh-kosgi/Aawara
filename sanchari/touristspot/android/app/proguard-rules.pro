# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native libraries used by the app can be referenced across the bridge
# and by native reflection. Keeping these namespaces avoids release-only crashes.
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.swmansion.rnscreens.** { *; }
-keep class com.reactnativecommunity.asyncstorage.** { *; }
-keep class com.reactnativecommunity.webview.** { *; }
-keep class com.brentvatne.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.airbnb.android.react.maps.** { *; }
-keep class com.agontuk.RNFusedLocation.** { *; }
-keep class com.reactnativegooglesignin.** { *; }
-keep class com.oblador.vectoricons.** { *; }

-keepclassmembers class ** {
    @android.webkit.JavascriptInterface <methods>;
}
