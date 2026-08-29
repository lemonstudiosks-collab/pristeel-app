#!/bin/zsh
set -euo pipefail

ROOT="$HOME/pppp-ai"
SRC="$ROOT/llama-src"
BUILD="$SRC/build-portable"
LIVE_BUILD="$SRC/build"
LIVE_BIN="$LIVE_BUILD/bin/llama-server"
KEY_FILE="$ROOT/.semantic_worker_key"
INSTALLER_URL="https://raw.githubusercontent.com/lemonstudiosks-collab/pristeel-app/main/local-ai/install_macos12_intel.sh"
INSTALLER="/tmp/install_pppp_ai.sh"
UID_NOW="$(id -u)"

[[ -d "$SRC" ]] || { echo "ERROR: missing llama.cpp source: $SRC"; exit 2; }
[[ -f "$KEY_FILE" ]] || { echo "ERROR: missing semantic worker key file: $KEY_FILE"; exit 3; }
command -v cmake >/dev/null 2>&1 || { echo "ERROR: cmake is required"; exit 4; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl is required"; exit 5; }

for label in com.pristeel.pppp-semantic-worker com.pristeel.pppp-llama; do
  launchctl bootout "gui/$UID_NOW/$label" >/dev/null 2>&1 || true
done

rm -rf "$BUILD"

cmake -S "$SRC" -B "$BUILD" \
  -DCMAKE_BUILD_TYPE=Release \
  -DGGML_NATIVE=OFF \
  -DGGML_METAL=OFF \
  -DGGML_BLAS=OFF \
  -DGGML_AVX=OFF \
  -DGGML_AVX2=OFF \
  -DGGML_FMA=OFF \
  -DGGML_F16C=OFF

cmake --build "$BUILD" --target llama-server -j 2

NEW_BIN="$BUILD/bin/llama-server"
[[ -x "$NEW_BIN" ]] || { echo "ERROR: portable llama-server was not built"; exit 6; }

mkdir -p "$LIVE_BUILD/bin"
if [[ -x "$LIVE_BIN" ]]; then
  cp "$LIVE_BIN" "$LIVE_BIN.broken-$(date +%Y%m%d%H%M%S)" || true
fi
cp "$NEW_BIN" "$LIVE_BIN"
chmod 755 "$LIVE_BIN"

"$LIVE_BIN" --version >/dev/null

KEY="$(cat "$KEY_FILE")"
curl -fsSL "$INSTALLER_URL" -o "$INSTALLER"
chmod +x "$INSTALLER"
"$INSTALLER" "$KEY"
unset KEY

echo "=== PPPP MAC MINI REPAIR ==="
echo "llama-server: OK"
echo "semantic worker: installed"
echo "repair: COMPLETE"
