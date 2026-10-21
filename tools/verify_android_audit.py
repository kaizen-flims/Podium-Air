"""Check audit isolation and unchanged approved production branding before Android CI."""
from pathlib import Path
import hashlib
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PROTECTED = {'LICENSE': '3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986', 'THIRD_PARTY_NOTICES.md': '00d19ce133628ffa34a8ca0f7a2e0d5c16eb2601f24971f7bda7e3b09a2419eb', 'app/src/main/ic_launcher-playstore.png': 'ed1092d1d59e157b42b0775b7e20fd3b3494486e99d8a0b80b58ef4932b1d06f', 'app/src/main/res/mipmap-anydpi/ic_launcher.xml': '69597da3c35afd8969617f3567ed4288fdfa44d54ba4d8881b2e392029eb7373', 'app/src/main/res/mipmap-anydpi/ic_launcher_round.xml': '69597da3c35afd8969617f3567ed4288fdfa44d54ba4d8881b2e392029eb7373', 'app/src/main/res/mipmap-hdpi/ic_launcher.webp': '11a1595746b2b5e968f8627c2133659e7eaaf401e0c77f1c82970d79adcda627', 'app/src/main/res/mipmap-hdpi/ic_launcher_round.webp': '11a1595746b2b5e968f8627c2133659e7eaaf401e0c77f1c82970d79adcda627', 'app/src/main/res/mipmap-mdpi/ic_launcher.webp': '6ab0d01e35689a7016a184ae878acfd6113bfe4425f97df8302aa03223709e06', 'app/src/main/res/mipmap-mdpi/ic_launcher_round.webp': '6ab0d01e35689a7016a184ae878acfd6113bfe4425f97df8302aa03223709e06', 'app/src/main/res/mipmap-xhdpi/ic_launcher.webp': '46587a8c4060e821c77c28061985866182e9a1fec7d92a33e404465808f13cec', 'app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp': '46587a8c4060e821c77c28061985866182e9a1fec7d92a33e404465808f13cec', 'app/src/main/res/mipmap-xxhdpi/ic_launcher.webp': '64c7e8e403a73649051fd3a93dec8dda1be92fa03645f5d24ee06607c860a318', 'app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp': '64c7e8e403a73649051fd3a93dec8dda1be92fa03645f5d24ee06607c860a318', 'app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp': '66908f795574c5b3c89dbbae220e6ef6232e5d732203ab13dfd2534f8b5d430a', 'app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp': '66908f795574c5b3c89dbbae220e6ef6232e5d732203ab13dfd2534f8b5d430a', 'sharedUi/src/commonMain/composeResources/drawable/ic_logo.png': '4120efc4af675bf38082f1babb15faa0c958e288dd1670eff68de119e8ec70e8', 'sharedUi/src/commonMain/composeResources/drawable/spotify_logo.webp': 'c27c022857a854141d8727a8ec36160d8848bf4acbcfe99286f45d9f16392599'}
for name, digest in PROTECTED.items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name

gradle = (ROOT / "app/build.gradle.kts").read_text()
audit = gradle.split('create("audit") {', 1)[1].split('create("benchmark")', 1)[0]
assert 'applicationIdSuffix = ".audit2"' in audit
assert 'signingConfig = signingConfigs.getByName("audit")' in audit
assert 'storeFile = file("${System.getProperty("user.home")}/.android/debug.keystore")' in gradle
assert 'matchingFallbacks += listOf("release")' in audit
assert '"IS_AUDIT", "true"' in audit
assert '"IS_AUDIT", "false"' in gradle
checker = (ROOT / "app/src/main/java/com/music/bitchord/data/AppUpdateChecker.kt").read_text()
assert 'if (BuildConfig.IS_AUDIT) return@withContext' in checker
manifest = ET.parse(ROOT / "app/src/main/AndroidManifest.xml").getroot()
android = "{http://schemas.android.com/apk/res/android}"
audit_manifest = ET.parse(ROOT / "app/src/audit/AndroidManifest.xml").getroot()
assert audit_manifest.find("application").get(android + "label") == "Podium Air Audit 2"
assert 'resValue("string", "app_name", "Podium Air Audit 2")' in audit
provider = manifest.find("application/provider")
assert provider.get(android + "authorities") == "${applicationId}.fileprovider"
styles = {e.get("name") for p in (ROOT / "app/src/main/res").glob("values*/themes.xml") for e in ET.parse(p).getroot().findall("style")}
assert "Theme.BitChord" in styles, "Manifest theme must retain its resource identifier"
for filename in ("backup_rules.xml", "data_extraction_rules.xml"):
    exclusions = {e.get("path") for e in ET.parse(ROOT / "app/src/main/res/xml" / filename).getroot().iter("exclude")}
    assert {"bitchord_auth.xml", "bitchord_auth_plain.xml", "bitchord_sources.xml", "bitchord_sources_plain.xml"} <= exclusions
aliases = manifest.findall("application/activity-alias")
assert {e.get(android + "name") for e in aliases} == {".LauncherOriginal", ".LauncherLiquidGlass", ".LauncherChrome"}
assert [e.get(android + "name") for e in aliases if e.get(android + "enabled") == "true"] == [".LauncherOriginal"]
assert not manifest.findall("application/activity/intent-filter/category[@" + android + "name='android.intent.category.LAUNCHER']")
assert (ROOT / "app/src/main/java/com/music/bitchord/AppIcon.kt").exists()
# Approved source files are bundled byte-for-byte; only launcher density copies are resized.
for path in (ROOT / "app/src/main/res").glob("values*/strings.xml"):
    ET.parse(path)
print(f"Audit isolation and {len(PROTECTED)} protected assets/notices verified")
assert hashlib.sha256((ROOT / "app/src/main/res/drawable-nodpi/podium_icon_original.jpg").read_bytes()).hexdigest() == "f42a0ac254210c52100991c9274d829e0524947a48ffc3da5a3f93fd972aacb4"
assert hashlib.sha256((ROOT / "app/src/main/res/drawable-nodpi/podium_icon_liquid_glass.jpg").read_bytes()).hexdigest() == "3b70b5104ef319f16a7f241797f61a7bf39c873fe07945de9d61cba038471ac2"
assert hashlib.sha256((ROOT / "app/src/main/res/drawable-nodpi/podium_icon_chrome.jpg").read_bytes()).hexdigest() == "d3dc7432321a709266c84ead2ad04fa3136bac46f1bfb0f220caaf0c3844075f"
chrome = (ROOT / "app/src/main/res/drawable-nodpi/podium_icon_chrome.jpg").read_bytes()
for name in ("app/src/main/res/drawable-nodpi/podium_air_ui_mono.jpg", "app/src/main/res/drawable-nodpi/podium_air_icon.jpg", "sharedUi/src/commonMain/composeResources/drawable/podium_chrome.jpg"):
    assert (ROOT / name).read_bytes() == chrome, name
print("Three approved launcher choices and exact Chrome assets verified")
