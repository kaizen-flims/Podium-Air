# Podium Air attribution and distribution review

Podium Air is maintained and branded by Prem Das aka Kaizen. It derives from
BitChord by Kushagra Singh and contributors: https://github.com/kushagrasinghx/BitChord.
The corresponding modified source is https://github.com/kaizen-flims/Podium-Air.
The root LICENSE contains the GPLv3 terms. Original history and copyright notices remain.

Third-party dependencies retain their own licenses. The desktop Legal screen lists
upstream dependency notices, including Kotlin, Compose, Ktor, NewPipeExtractor,
FFmpeg/JavaCPP, OpenJFX, ONNX Runtime, JNA, SQLite, and GraalVM. Dependency JAR
META-INF notices remain in the packaged runtime. This list is not a legal clearance
of every transitive component or asset.

New desktop bundles use the system sans-serif family instead of redistributing
upstream's SF Pro fonts. Existing Android font/model assets are retained for
compatibility and need provenance/distribution review before a public release.
Review ONNX model provenance and actual native FFmpeg configuration and license
before distribution; upstream's claimed license is not sufficient verification.
No release is authorized by this integration PR.
