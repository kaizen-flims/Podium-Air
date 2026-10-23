#!/bin/sh
# Generates the containing macOS/iOS app; does not sign, install, or publish it.
set -eu
if [ "$(uname -s)" != Darwin ]; then
  echo 'Safari packaging requires macOS and Xcode.' >&2
  exit 1
fi
extension_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if [ ! -f "$extension_dir/manifest.json" ]; then
  echo 'Run the copy of this script inside the downloaded Safari developer package.' >&2
  exit 1
fi
if xcrun --find safari-web-extension-packager >/dev/null 2>&1; then
  tool=safari-web-extension-packager
elif xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  tool=safari-web-extension-converter
else
  echo 'Install/select full Xcode; Safari packaging tools are missing.' >&2
  exit 1
fi
exec xcrun "$tool" "$extension_dir" --project-location "$extension_dir/../Podium-Air-Safari-Xcode" --app-name 'Podium Air Safari' --bundle-identifier com.podium.air.safari --swift --no-open --no-prompt
