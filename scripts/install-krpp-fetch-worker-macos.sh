#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$HOME/.pppp/krpp-fetch-worker.env"
COOKIE_FILE="$HOME/.pppp/krpp-cookie.txt"
LOG_DIR="$HOME/.pppp/logs"
PLIST="$HOME/Library/LaunchAgents/com.pristeel.pppp.krpp-fetch-worker.plist"
LABEL="com.pristeel.pppp.krpp-fetch-worker"
NODE="$(command -v node || true)"

if [[ -z "$NODE" ]]; then
  echo "Node.js is not available in PATH. Install/use the same Node 22 runtime as the existing PPPP workers."
  exit 1
fi
mkdir -p "$HOME/.pppp" "$LOG_DIR" "$HOME/Library/LaunchAgents"
if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/scripts/krpp-fetch-worker.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo "Created $ENV_FILE. Put the existing local PPPP worker token there before starting the service."
  exit 2
fi
chmod 600 "$ENV_FILE"
if [[ ! -f "$COOKIE_FILE" ]]; then
  : > "$COOKIE_FILE"
  chmod 600 "$COOKIE_FILE"
  echo "Created $COOKIE_FILE. Log in to KRPP in the authorized local browser and save only the current Cookie header here."
  exit 3
fi
chmod 600 "$COOKIE_FILE"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-lc</string>
    <string>set -a; source '$ENV_FILE'; set +a; cd '$ROOT'; exec '$NODE' scripts/krpp-authenticated-fetch-worker.mjs</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/krpp-fetch-worker.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/krpp-fetch-worker.error.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID" "$PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID" "$PLIST"
launchctl kickstart -k "gui/$UID/$LABEL"
echo "Installed $LABEL. Logs: $LOG_DIR/krpp-fetch-worker.log"
