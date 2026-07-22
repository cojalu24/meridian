#!/usr/bin/env bash
# Builds the self-contained Meridian Mac app: compiles the web app, bundles it
# into the Electron shell, ad-hoc signs it (required to run on Apple Silicon),
# and zips it for distribution.
set -e
cd "$(dirname "$0")"

# 1. Build the web app (one level up).
(cd .. && npm install && npm run build)

# 2. Bundle the built site into the desktop app.
rm -rf dist && cp -R ../dist dist

# 3. Package, sign, zip.
npm install
ICON_ARG=""
[ -f icon.icns ] && ICON_ARG="--icon=icon.icns"
npx @electron/packager . "Meridian" \
  --platform=darwin --arch=arm64 $ICON_ARG \
  --extra-resource=./dist --ignore="^/dist($|/)" \
  --overwrite --out=build

codesign --force --deep --sign - "build/Meridian-darwin-arm64/Meridian.app"
(cd build/Meridian-darwin-arm64 && ditto -c -k --keepParent "Meridian.app" ../../Meridian-mac.zip)

echo "Built desktop/Meridian-mac.zip"
