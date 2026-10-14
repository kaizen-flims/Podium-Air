"""Fail CI on accidental product identity regression or duplicate Android resources."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
r = Path(__file__).resolve().parents[1]
gradle = (r / 'app/build.gradle.kts').read_text()
for value in ['applicationId = "com.podium.air"', 'applicationId = "com.podium.air.dev"', 'namespace = "com.music.bitchord"', 'versionCode = 2']:
    assert value in gradle, value
assert 'repos/kaizen-flims/Podium-Air/releases/latest' in (r / 'app/src/main/java/com/music/bitchord/data/AppUpdateChecker.kt').read_text()
assert 'repos/kushagrasinghx/BitChord/releases/latest' not in (r / 'desktopApp/src/main/kotlin/com/music/bitchord/desktop/DesktopUpdateChecker.kt').read_text()
for base in ['app/src/main/res', 'sharedUi/src/commonMain/composeResources', 'desktopApp/src/main/resources/strings']:
    for p in (r / base).rglob('*.xml'):
        root = ET.parse(p).getroot()
        strings = root.findall('string')
        names = [s.attrib['name'] for s in strings]
        assert len(names) == len(set(names)), f'Duplicate strings: {p}'
        for s in strings:
            assert 'bitchord' not in ''.join(s.itertext()).lower(), f'Product branding: {p}:{s.attrib["name"]}'
for p in r.rglob('*.kt'):
    assert not re.search(r'^<<<<<<<|^=======|^>>>>>>>', p.read_text(), re.M), p
metadata = (r / 'desktopApp/build.gradle.kts').read_text()
assert 'bundleID = "com.podium.air.desktop"' in metadata
assert 'upgradeUuid = "2e06a9dc-fc0e-4f63-9232-ce7297e72cc2"' in metadata
assert 'packageName = "Podium Air"' in metadata
print('Identity and XML resource checks passed')
