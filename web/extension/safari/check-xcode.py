"""Compile generated wrappers without signing, installing, archiving or publishing."""
import json
from pathlib import Path
import subprocess

output = Path(__file__).resolve().parents[1] / '.output'
projects = list((output / 'Podium-Air-Safari-Xcode').rglob('*.xcodeproj'))
if len(projects) != 1:
    raise SystemExit(f'Expected one generated Xcode project, found {len(projects)}')
project = projects[0]
listed = json.loads(subprocess.check_output(['xcodebuild', '-list', '-json', '-project', str(project)], text=True))
schemes = listed['project']['schemes']
for platform, sdk, destination in [
    ('macOS', 'macosx', 'generic/platform=macOS'),
    ('iOS', 'iphonesimulator', 'generic/platform=iOS Simulator'),
]:
    matches = [scheme for scheme in schemes if f'({platform})' in scheme]
    if len(matches) != 1:
        raise SystemExit(f'Expected one {platform} scheme, got {schemes}')
    subprocess.run([
        'xcodebuild', '-project', str(project), '-scheme', matches[0],
        '-sdk', sdk, '-destination', destination, '-configuration', 'Debug',
        '-derivedDataPath', str(output / f'safari-derived-{platform}'),
        'CODE_SIGNING_ALLOWED=NO', 'build',
    ], check=True)
