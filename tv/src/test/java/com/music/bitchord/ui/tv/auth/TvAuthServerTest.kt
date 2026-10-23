package com.music.bitchord.ui.tv.auth

import java.net.Socket
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Test

class TvAuthServerTest {
    @After fun close() = TvAuthServer.stop()

    private fun request(port: Int, path: String, extra: String = "", body: String? = null): String =
        Socket("127.0.0.1", port).use { socket ->
            socket.soTimeout = 5000
            val method = if (body == null) "GET" else "POST"
            val payload = body.orEmpty()
            val wire = "$method $path HTTP/1.1\r\nHost: 127.0.0.1:$port\r\n$extra" +
                "Content-Length: ${payload.length}\r\nConnection: close\r\n\r\n$payload"
            socket.getOutputStream().write(wire.toByteArray())
            socket.getInputStream().bufferedReader().readText()
        }

    @Test fun onlyPairedBrowserCanSubmitAndOldTokenExpires() = runBlocking {
        val captured = AtomicReference<String>()
        val (port, ip) = requireNotNull(TvAuthServer.start { captured.set(it) })
        val url = TvAuthServer.pairingUrl(ip, port)
        val token = url.substringAfter("token=")
        assertTrue(request(port, "/").startsWith("HTTP/1.1 403"))
        val paired = request(port, "/?token=$token")
        assertTrue(paired.startsWith("HTTP/1.1 200"))
        assertTrue(paired.contains("HttpOnly; SameSite=Strict"))
        assertFalse(paired.contains("Access-Control-Allow-Origin: *"))
        assertTrue(request(port, "/submit", "Cookie: podium_pair=$token\r\nOrigin: https://other.example\r\n", "cookie=test-session").startsWith("HTTP/1.1 403"))
        assertNull(captured.get())
        assertTrue(request(port, "/submit", "Cookie: podium_pair=$token\r\n", "cookie=test-session").startsWith("HTTP/1.1 200"))
        assertEquals("test-session", captured.get())
        val (nextPort, _) = requireNotNull(TvAuthServer.start())
        assertTrue(request(nextPort, "/?token=$token").startsWith("HTTP/1.1 403"))
    }

    @Test fun oversizedSubmissionIsRejectedBeforeAllocation() = runBlocking {
        val (port, ip) = requireNotNull(TvAuthServer.start())
        val token = TvAuthServer.pairingUrl(ip, port).substringAfter("token=")
        assertTrue(request(port, "/submit?token=$token", body = "x".repeat(16385)).startsWith("HTTP/1.1 403"))
    }
}
