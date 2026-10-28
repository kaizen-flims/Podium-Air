package com.music.bitchord.ui.tv.auth

import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.google.zxing.qrcode.encoder.Encoder

/** ZXing handles QR block interleaving and version metadata for longer pairing URLs. */
object QrCodeGenerator {
    fun encode(text: String): Array<BooleanArray> {
        val matrix = Encoder.encode(text, ErrorCorrectionLevel.M).matrix
        return Array(matrix.height) { y ->
            BooleanArray(matrix.width) { x -> matrix.get(x, y).toInt() == 1 }
        }
    }
}
