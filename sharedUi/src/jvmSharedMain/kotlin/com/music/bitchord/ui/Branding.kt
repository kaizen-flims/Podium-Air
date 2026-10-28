package com.music.bitchord.ui

import org.jetbrains.compose.resources.DrawableResource

/** Platform-specific mark: Android Chrome branding does not change desktop branding. */
internal expect val brandLogoResource: DrawableResource
internal expect val useChromeBranding: Boolean
