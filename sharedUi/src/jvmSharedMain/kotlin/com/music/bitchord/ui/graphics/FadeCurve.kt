package com.music.bitchord.ui.graphics

/**
 * Smootherstep, 6t^5 - 15t^4 + 10t^3, for a fade across t in 0..1.
 *
 * Its slope and curvature are both zero at either end, avoiding a visible
 * edge where the fade starts or finishes.
 */
fun smootherStep(t: Float): Float {
    val x = t.coerceIn(0f, 1f)
    return x * x * x * (x * (x * 6f - 15f) + 10f)
}

/** Number of gradient stops used to approximate the smootherstep curve. */
const val FADE_CURVE_STOPS = 16
