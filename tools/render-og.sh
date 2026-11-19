#!/usr/bin/env bash
# Re-renders static/og.png from tools/og-card.html with headless Edge (Git Bash on Windows).
set -euo pipefail
cd "$(dirname "$0")/.."
EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
# A separate profile is needed: with Edge already open, headless mode otherwise exits without writing the file.
PROFILE="$(cygpath -w "${TMPDIR:-/tmp}/ai-ledger-og-profile")"
"$EDGE" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --user-data-dir="$PROFILE" \
  --window-size=1200,630 --virtual-time-budget=8000 \
  --screenshot="$(cygpath -w "$PWD/static/og.png")" "file:///$(cygpath -m "$PWD/tools/og-card.html")"
