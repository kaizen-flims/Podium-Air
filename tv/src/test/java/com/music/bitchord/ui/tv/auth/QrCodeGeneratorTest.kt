package com.music.bitchord.ui.tv.auth

import com.google.zxing.qrcode.decoder.Decoder
import org.junit.Assert.assertEquals
import org.junit.Test

class QrCodeGeneratorTest {
    @Test fun pairingUrlsDecodeExactlyIncludingLongTokens() {
        for (host in listOf("10.0.0.2", "192.168.255.254")) {
            val url = "http://$host:65535/?token=" + "0123456789abcdef".repeat(5)
            assertEquals(url, Decoder().decode(QrCodeGenerator.encode(url)).text)
        }
    }
}
