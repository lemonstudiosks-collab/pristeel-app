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
BUNDLED_CMAKE="$ROOT/cmake-3.31.8-macos-universal/CMake.app/Contents/bin/cmake"

[[ -d "$SRC" ]] || { echo "ERROR: missing llama.cpp source: $SRC"; exit 2; }
[[ -f "$KEY_FILE" ]] || { echo "ERROR: missing semantic worker key file: $KEY_FILE"; exit 3; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl is required"; exit 5; }

CMAKE_BIN="$(command -v cmake 2>/dev/null || true)"
if [[ -z "$CMAKE_BIN" && -x "$BUNDLED_CMAKE" ]]; then
  CMAKE_BIN="$BUNDLED_CMAKE"
fi
[[ -n "$CMAKE_BIN" && -x "$CMAKE_BIN" ]] || { echo "ERROR: cmake not found"; exit 4; }

MAKE_BIN="/usr/bin/make"
[[ -x "$MAKE_BIN" ]] || { echo "ERROR: /usr/bin/make not found"; exit 8; }

# Build for the actual Mac instead of disabling every vector instruction.
# Feature detection keeps the binary portable across supported/older Intel Mac minis.
CPU_FEATURES="$(sysctl -n machdep.cpu.features 2>/dev/null || true) $(sysctl -n machdep.cpu.leaf7_features 2>/dev/null || true)"
feature_flag() {
  local name="$1"
  if echo " $CPU_FEATURES " | grep -Eiq "[[:space:]]${name}([[:space:]]|$)"; then
    echo ON
  else
    echo OFF
  fi
}
AVX_FLAG="$(feature_flag 'AVX|AVX1\.0')"
AVX2_FLAG="$(feature_flag 'AVX2')"
FMA_FLAG="$(feature_flag 'FMA')"
F16C_FLAG="$(feature_flag 'F16C')"

echo "Using CMake: $CMAKE_BIN"
echo "Using make: $MAKE_BIN"
echo "CPU acceleration: AVX=$AVX_FLAG AVX2=$AVX2_FLAG FMA=$FMA_FLAG F16C=$F16C_FLAG"

for label in com.pristeel.pppp-semantic-worker com.pristeel.pppp-llama; do
  launchctl bootout "gui/$UID_NOW/$label" >/dev/null 2>&1 || true
done

rm -rf "$BUILD"

"$CMAKE_BIN" -S "$SRC" -B "$BUILD" \
  -G "Unix Makefiles" \
  -DCMAKE_MAKE_PROGRAM="$MAKE_BIN" \
  -DCMAKE_BUILD_TYPE=Release \
  -DGGML_NATIVE=OFF \
  -DGGML_METAL=OFF \
  -DGGML_BLAS=OFF \
  -DGGML_ACCELERATE=OFF \
  -DGGML_AVX="$AVX_FLAG" \
  -DGGML_AVX2="$AVX2_FLAG" \
  -DGGML_FMA="$FMA_FLAG" \
  -DGGML_F16C="$F16C_FLAG"

"$CMAKE_BIN" --build "$BUILD" --target llama-server -j 2

NEW_BIN="$BUILD/bin/llama-server"
[[ -x "$NEW_BIN" ]] || { echo "ERROR: optimized llama-server was not built"; exit 6; }

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
