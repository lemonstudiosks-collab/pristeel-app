#!/bin/zsh
set -euo pipefail

ROOT="$HOME/pppp-ai"
WORKER="$ROOT/pppp_semantic_worker.py"
TMP="$ROOT/.pppp_semantic_worker.py.tmp"
LABEL="com.pristeel.pppp-semantic-worker"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
UID_NOW="$(id -u)"
URL="https://raw.githubusercontent.com/lemonstudiosks-collab/pristeel-app/main/local-ai/pppp_semantic_worker.py"

[[ -d "$ROOT" ]] || { echo "Missing PPPP AI directory: $ROOT"; exit 2; }
[[ -f "$PLIST" ]] || { echo "Missing worker LaunchAgent: $PLIST"; exit 3; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is required"; exit 4; }
command -v curl >/dev/null 2>&1 || { echo "curl is required"; exit 5; }

rm -f "$TMP"
curl -fsSL "$URL" -o "$TMP"
python3 -m py_compile "$TMP"
chmod 700 "$TMP"
mv "$TMP" "$WORKER"
chmod 700 "$WORKER"

launchctl kickstart -k "gui/$UID_NOW/$LABEL"
sleep 2
launchctl print "gui/$UID_NOW/$LABEL" >/dev/null

echo "PPPP semantic worker updated and restarted."
echo "Worker: $WORKER"
echo "Log: $ROOT/logs/worker.out.log"
echo "Errors: $ROOT/logs/worker.err.log"