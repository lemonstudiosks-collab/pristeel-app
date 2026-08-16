#!/bin/bash
set -euo pipefail

PATH="/opt/local/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export PATH

BASE_DIR="$HOME/pppp-ocr-worker"
WORKER="$BASE_DIR/pppp-ocr-worker.sh"
TOKEN_FILE="$HOME/.pppp_ocr_token"
PLIST="$HOME/Library/LaunchAgents/com.pristeel.pppp-ocr-worker.plist"
RAW_WORKER_URL="https://raw.githubusercontent.com/lemonstudiosks-collab/pristeel-app/pppp-local-ocr-worker/ops/local-ocr/pppp-ocr-worker.sh"

printf 'PPPP OCR Worker installer\n'

required=(curl python3 shasum tesseract pdftoppm pdfinfo sips)
missing=()
for cmd in "${required[@]}"; do
  command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
done
if [ ${#missing[@]} -gt 0 ]; then
  printf 'Missing dependencies: %s\n' "${missing[*]}" >&2
  exit 1
fi

if [ ! -f "$TOKEN_FILE" ]; then
  printf 'Missing token file: %s\n' "$TOKEN_FILE" >&2
  exit 1
fi

if ! tesseract --list-langs 2>/dev/null | grep -qx 'osd'; then
  printf 'Missing Tesseract OSD language data.\n' >&2
  exit 1
fi

mkdir -p "$BASE_DIR" "$HOME/Library/LaunchAgents"
chmod 700 "$BASE_DIR"
chmod 600 "$TOKEN_FILE" 2>/dev/null || true

curl -fsSL "$RAW_WORKER_URL" -o "$WORKER"
chmod 700 "$WORKER"

if ! /bin/bash -n "$WORKER"; then
  printf 'Worker script syntax check failed.\n' >&2
  exit 1
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.pristeel.pppp-ocr-worker</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$WORKER</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>60</integer>
  <key>ProcessType</key>
  <string>Background</string>
  <key>StandardOutPath</key>
  <string>$BASE_DIR/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>$BASE_DIR/launchd.err.log</string>
</dict>
</plist>
EOF
chmod 600 "$PLIST"

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load -w "$PLIST"

printf 'Installed: %s\n' "$WORKER"
printf 'LaunchAgent: %s\n' "$PLIST"
printf 'Worker runs at login and checks for queued OCR work every 60 seconds.\n'
printf 'Log: %s\n' "$BASE_DIR/worker.log"
