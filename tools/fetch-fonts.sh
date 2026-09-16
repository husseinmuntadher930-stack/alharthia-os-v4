#!/bin/bash
# Downloads IBM Plex Sans Arabic (the interface font) into shell/ui/vendor/fonts. Safe to fail.
set -u
DIR="$(cd "$(dirname "$0")/.." && pwd)/shell/ui/vendor/fonts"
TMP=$(mktemp -d)
cd "$TMP" || exit 0
if npm pack @fontsource/ibm-plex-sans-arabic >/dev/null 2>&1; then
	tar xzf fontsource-ibm-plex-sans-arabic-*.tgz
	: > "$DIR/fonts.css"
	for w in 300 400 500 600 700; do
		for sub in arabic latin; do
			f="package/files/ibm-plex-sans-arabic-${sub}-${w}-normal.woff2"
			[ -f "$f" ] || continue
			cp "$f" "$DIR/"
			echo "@font-face{font-family:'IBM Plex Sans Arabic';font-style:normal;font-weight:${w};font-display:swap;src:url(./$(basename "$f")) format('woff2');}" >> "$DIR/fonts.css"
		done
	done
	echo "fonts ready"
else
	echo "font download skipped (system Noto fonts will be used)"
fi
rm -rf "$TMP"
