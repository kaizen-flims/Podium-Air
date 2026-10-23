package com.music.bitchord

import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager

/** Launcher choice is independent of the Chrome mark inside the app. */
enum class AppIcon(val alias: String, val iconRes: Int, val labelRes: Int, val previewRes: Int) {
    Original("LauncherOriginal", R.mipmap.ic_launcher_original, R.string.app_icon_original, R.drawable.podium_icon_original),
    LiquidGlass("LauncherLiquidGlass", R.mipmap.ic_launcher_liquid_glass, R.string.app_icon_liquid_glass, R.drawable.podium_liquid_glass_trimmed),
    Chrome("LauncherChrome", R.mipmap.ic_launcher_chrome, R.string.app_icon_chrome, R.drawable.podium_icon_chrome);

    private fun component(context: Context) =
        ComponentName(context.packageName, "com.music.bitchord.$alias")

    companion object {
        fun current(context: Context): AppIcon = entries.firstOrNull {
            context.packageManager.getComponentEnabledSetting(it.component(context)) ==
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED
        } ?: Original

        /** Enable the replacement before disabling the others to keep an entry available. */
        fun apply(context: Context, icon: AppIcon) {
            val pm = context.packageManager
            pm.setComponentEnabledSetting(icon.component(context),
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP)
            entries.filter { it != icon }.forEach {
                pm.setComponentEnabledSetting(it.component(context),
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP)
            }
        }
    }
}
