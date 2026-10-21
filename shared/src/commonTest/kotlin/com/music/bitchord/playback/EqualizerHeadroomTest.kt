package com.music.bitchord.playback

import kotlin.test.Test
import kotlin.test.assertEquals

class EqualizerHeadroomTest {
    @Test
    fun hostsWithoutALimiterKeepFullHeadroom() {
        val bands = MutableList(EqLayout.MANUAL_COUNT) { 0f }
        bands[0] = 12f
        assertEquals(-12f, manualCurve(bands).preampDb, 0.1f)
        assertEquals(-6f, manualCurve(bands, peakLimited = true).preampDb, 0.1f)
    }
}
