#!/usr/bin/env python3
"""Brand-only preparation for the upstream Podium Air source snapshot.

No player, settings, playback, search, home-feed, or other feature logic is
rewritten here. Only product-facing text, launcher artwork, and Android
application/build identity are changed.
"""
from pathlib import Path
import re

ROOT = Path.cwd()
TEXT_EXTS = {".xml", ".kt", ".kts", ".java", ".md", ".txt", ".json", ".html", ".svg", ".yaml", ".yml", ".toml", ".properties", ".pro", ".sh"}

# Replace product names in Android resources and literal UI strings. Kotlin
# identifiers, package names, URLs, and upstream attribution are left intact.
string_literal = re.compile(r'"(?:\\.|[^"\\])*"')
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix.lower() not in TEXT_EXTS:
        continue
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith(".git/") or rel.startswith(".github/workflows/") or rel in {"LICENSE", "COPYING", "NOTICE"}:
        continue
    try:
        source = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue

    brand_token = re.compile(r'(?<![/A-Za-z0-9_%])BitChord(?![/A-Za-z0-9_%])')
    lower_brand = re.compile(r'(?<![A-Za-z0-9_./:-])bitchord(?![A-Za-z0-9_./:-])')
    if path.suffix.lower() == ".xml":
        def brand_xml_text(value):
            return lower_brand.sub("Podium Air", brand_token.sub("Podium Air", value))
        updated = re.sub(r'>([^<>]+)<', lambda m: ">" + brand_xml_text(m.group(1)) + "<", source)
        updated = re.sub(
            r'((?:android:)?(?:label|title|description|contentDescription|text|hint|summary)=")([^"]*)(")',
            lambda m: m.group(1) + brand_xml_text(m.group(2)) + m.group(3),
            updated,
        )
    elif path.suffix.lower() in {".md", ".txt", ".html", ".svg", ".yaml", ".yml", ".toml", ".properties"}:
        updated = lower_brand.sub("Podium Air", brand_token.sub("Podium Air", source))
    else:
        updated = string_literal.sub(
            lambda m: lower_brand.sub("Podium Air", brand_token.sub("Podium Air", m.group(0))),
            source,
        )

    if updated != source:
        path.write_text(updated, encoding="utf-8")

# Keep the upstream project namespace and source packages unchanged. The
# installed Android application identity is independently branded.
settings = ROOT / "settings.gradle.kts"
if settings.exists():
    s = settings.read_text(encoding="utf-8").replace('rootProject.name = "BitChord"', 'rootProject.name = "Podium Air"')
    settings.write_text(s, encoding="utf-8")

gradle = ROOT / "app/build.gradle.kts"
s = gradle.read_text(encoding="utf-8")

prod_old = '''        create("prod") {
            dimension = "env"
            // Matches defaultConfig — this is the package already shipped/installed.
        }'''
prod_new = '''        create("prod") {
            dimension = "env"
            applicationId = "com.podium.air"
        }'''
if prod_old not in s:
    raise SystemExit("Could not find the upstream prod flavor block; refusing to guess at Gradle edits.")
s = s.replace(prod_old, prod_new, 1)

sign_anchor = '''        // Both halves have to be there, not just the properties file: it *names*'''
sign_block = '''        create("audit3") {
            storeFile = file("${System.getProperty("user.home")}/.android/podium-air-audit3.keystore")
            storePassword = "android"
            keyAlias = "podiumaudit3"
            keyPassword = "android"
        }
'''
if sign_anchor not in s:
    raise SystemExit("Could not find the upstream signing config insertion point.")
s = s.replace(sign_anchor, sign_block + sign_anchor, 1)

build_anchor = '''    buildTypes {
        debug {'''
if build_anchor not in s:
    raise SystemExit("Could not find upstream buildTypes block.")
s = s.replace(build_anchor, '''    buildTypes {
        create("audit3") {
            initWith(getByName("release"))
            applicationIdSuffix = ".audit3"
            versionNameSuffix = "-audit3-v1.9.1"
            signingConfig = signingConfigs.getByName("audit3")
            matchingFallbacks += listOf("release")
            resValue("string", "app_name", "Podium Air Audit 3")
        }
        debug {''', 1)

# Point any in-app update asset prefix at the branded APK name.
s = s.replace('"Podium Air-"', '"Podium-Air-"')
gradle.write_text(s, encoding="utf-8")

# Use Podium Air's approved launcher artwork. The XML is a resource-only
# substitution; the upstream icon-selection and launcher code stays untouched.
launcher_fg = ROOT / "app/src/main/res/drawable/ic_launcher_foreground.xml"
podium_fg = ROOT / "app/src/main/res/drawable/podium_air_launcher_foreground.xml"
if not podium_fg.exists():
    raise SystemExit("Podium Air launcher foreground resource was not restored.")
launcher_fg.write_text(podium_fg.read_text(encoding="utf-8"), encoding="utf-8")

launcher_bg = ROOT / "app/src/main/res/drawable/ic_launcher_background.xml"
launcher_bg.write_text('''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#080808" android:pathData="M0,0h108v108h-108z" />
</vector>
''', encoding="utf-8")

# The upstream vector mark is also used in replay cards and notification
# surfaces. Point those resource names at the Podium Air mark as well.
podium_mark = '''<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@drawable/podium_air_icon"
    android:gravity="center" />
'''
for rel in (
    "app/src/main/res/drawable/ic_logo.xml",
    "app/src/main/res/drawable/ic_notification_logo.xml",
    "tv/src/main/res/drawable/ic_logo.xml",
    "tv/src/main/res/drawable/ic_notification_logo.xml",
):
    target = ROOT / rel
    if target.exists():
        target.write_text(podium_mark, encoding="utf-8")

# README branding is updated without rewriting upstream links or attribution.
readme = ROOT / "README.md"
if readme.exists():
    s = readme.read_text(encoding="utf-8")
    s = s.replace("# BitChord", "# Podium Air")
    s = s.replace('alt="BitChord app icon"', 'alt="Podium Air app icon"')
    s += '''

---

## Upstream project and licence

Podium Air is a rebranded derivative of **BitChord**, originally created by
Kushagra Singh. The original source, copyright notices, and GPL-3.0 licence are
retained. This project does not claim authorship of the upstream implementation.
See [LICENSE](LICENSE) and [UPSTREAM-CREDITS.md](UPSTREAM-CREDITS.md).
'''
    readme.write_text(s, encoding="utf-8")

(ROOT / "UPSTREAM-CREDITS.md").write_text('''# Upstream credits

Podium Air Audit 3 is based on **BitChord** by **Kushagra Singh**.

- Upstream repository: https://github.com/kushagrasinghx/BitChord
- Upstream release: BitChord v1.9.1
- Upstream source commit: acf219a7e4a7f52f026d4336d5c7ac5cf7bfafcc
- Licence: GNU General Public License v3.0 (GPL-3.0)

The upstream implementation, feature logic, and original copyright notices are
retained. Podium Air changes are limited to product branding, launcher artwork,
and Android package/build identity for this audit build.
''', encoding="utf-8")

print("Prepared upstream BitChord source with branding-only Podium Air changes.")
