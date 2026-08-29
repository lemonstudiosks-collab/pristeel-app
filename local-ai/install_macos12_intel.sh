#!/bin/zsh
set -euo pipefail

KEY="${1:-}"
if [[ -z "$KEY" ]]; then
  echo "Usage: $0 <PPPP_SEMANTIC_WORKER_KEY>"
  exit 2
fi

ROOT="$HOME/pppp-ai"
BIN="$ROOT/llama-src/build/bin/llama-server"
MODEL="$ROOT/models/Qwen3-1.7B-Q4_K_M.gguf"
WORKER="$ROOT/pppp_semantic_worker.py"
LOGS="$ROOT/logs"
LA="$HOME/Library/LaunchAgents"
SERVER_PLIST="$LA/com.pristeel.pppp-llama.plist"
WORKER_PLIST="$LA/com.pristeel.pppp-semantic-worker.plist"
AWAKE_PLIST="$LA/com.pristeel.pppp-awake.plist"
UID_NOW="$(id -u)"
THREADS="$(sysctl -n hw.physicalcpu 2>/dev/null || echo 2)"
if (( THREADS > 4 )); then THREADS=4; fi
if (( THREADS < 2 )); then THREADS=2; fi

[[ -x "$BIN" ]] || { echo "Missing llama-server: $BIN"; exit 3; }
[[ -f "$MODEL" ]] || { echo "Missing model: $MODEL"; exit 4; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is required"; exit 5; }
command -v curl >/dev/null 2>&1 || { echo "curl is required"; exit 6; }

mkdir -p "$LOGS" "$LA"
chmod 700 "$ROOT" "$LOGS"

echo "Downloading PPPP semantic worker..."
curl -fsSL "https://raw.githubusercontent.com/lemonstudiosks-collab/pristeel-app/main/local-ai/pppp_semantic_worker.py" -o "$WORKER"
chmod 700 "$WORKER"

cat > "$SERVER_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.pristeel.pppp-llama</string>
<key>ProgramArguments</key><array>
<string>$BIN</string><string>-m</string><string>$MODEL</string><string>-c</string><string>4096</string><string>-t</string><string>$THREADS</string><string>-np</string><string>1</string><string>--host</string><string>127.0.0.1</string><string>--port</string><string>8080</string>
</array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>$LOGS/llama.out.log</string>
<key>StandardErrorPath</key><string>$LOGS/llama.err.log</string>
<key>ProcessType</key><string>Background</string>
</dict></plist>
EOF

cat > "$WORKER_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.pristeel.pppp-semantic-worker</string>
<key>ProgramArguments</key><array><string>$(command -v python3)</string><string>$WORKER</string></array>
<key>EnvironmentVariables</key><dict>
<key>PPPP_SEMANTIC_WORKER_KEY</key><string>$KEY</string>
<key>PPPP_SEMANTIC_QUEUE_URL</key><string>https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-queue</string>
<key>PPPP_LLAMA_URL</key><string>http://127.0.0.1:8080/v1/chat/completions</string>
<key>PPPP_LOCAL_MODEL</key><string>Qwen3-1.7B-Q4_K_M</string>
<key>PPPP_SEMANTIC_POLL_SECONDS</key><string>4</string>
</dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>$LOGS/worker.out.log</string>
<key>StandardErrorPath</key><string>$LOGS/worker.err.log</string>
<key>ProcessType</key><string>Background</string>
</dict></plist>
EOF

cat > "$AWAKE_PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.pristeel.pppp-awake</string>
<key>ProgramArguments</key><array><string>/usr/bin/caffeinate</string><string>-dimsu</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>ProcessType</key><string>Background</string>
</dict></plist>
EOF

chmod 600 "$SERVER_PLIST" "$WORKER_PLIST" "$AWAKE_PLIST"

for plist in "$WORKER_PLIST" "$SERVER_PLIST" "$AWAKE_PLIST"; do
  launchctl bootout "gui/$UID_NOW" "$plist" >/dev/null 2>&1 || true
done

launchctl bootstrap "gui/$UID_NOW" "$AWAKE_PLIST"
launchctl enable "gui/$UID_NOW/com.pristeel.pppp-awake" || true
launchctl bootstrap "gui/$UID_NOW" "$SERVER_PLIST"
launchctl enable "gui/$UID_NOW/com.pristeel.pppp-llama" || true

echo "Waiting for local AI server..."
for i in {1..60}; do
  if curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:8080/health >/dev/null || { echo "llama-server did not become healthy. See $LOGS/llama.err.log"; exit 7; }

launchctl bootstrap "gui/$UID_NOW" "$WORKER_PLIST"
launchctl enable "gui/$UID_NOW/com.pristeel.pppp-semantic-worker" || true
sleep 2

echo "=== PPPP LOCAL AI ==="
echo "llama health: $(curl -fsS http://127.0.0.1:8080/health)"
echo "awake service: $(launchctl print "gui/$UID_NOW/com.pristeel.pppp-awake" >/dev/null 2>&1 && echo RUNNING || echo ERROR)"
echo "server service: $(launchctl print "gui/$UID_NOW/com.pristeel.pppp-llama" >/dev/null 2>&1 && echo RUNNING || echo ERROR)"
echo "worker service: $(launchctl print "gui/$UID_NOW/com.pristeel.pppp-semantic-worker" >/dev/null 2>&1 && echo RUNNING || echo ERROR)"
echo "threads: $THREADS"
echo "logs: $LOGS"
