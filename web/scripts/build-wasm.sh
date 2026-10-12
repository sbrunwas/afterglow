#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# Activate a caller-specified SDK, or use em++ already available on PATH.
# Example: AFTERGLOW_EMSDK=/path/to/emsdk ./scripts/build-wasm.sh
if [[ -n "${AFTERGLOW_EMSDK:-}" ]]; then
  source "$AFTERGLOW_EMSDK/emsdk_env.sh" >/dev/null
fi
CXX="${EMXX:-em++}"
if ! command -v "$CXX" >/dev/null 2>&1; then
  echo "Emscripten not found. Activate emsdk, set AFTERGLOW_EMSDK, or set EMXX to em++." >&2
  exit 1
fi
cd "$PROJECT_DIR"
"$CXX" -std=c++17 -O3 --no-entry src/bridge.cpp src/core/DrumEngine.cpp src/core/Sequencer.cpp \
  src/core/third_party/DaisySP/Drums/*.cpp src/core/third_party/DaisySP/Filters/svf.cpp \
  -Isrc/core -Isrc/core/third_party/DaisySP -Isrc/core/third_party/DaisySP/Utility \
  -sSTANDALONE_WASM=1 -sINITIAL_MEMORY=134217728 -sALLOW_MEMORY_GROWTH=0 \
  -sSTACK_SIZE=1048576 -sFILESYSTEM=0 -sMALLOC=emmalloc -sASSERTIONS=1 \
  -sEXPORTED_FUNCTIONS='["_malloc","_free","_ag_create","_ag_destroy","_ag_voice","_ag_step","_ag_length","_ag_chain","_ag_transport","_ag_masterDrive","_ag_play","_ag_pause","_ag_stop","_ag_trigger","_ag_sample","_ag_render","_ag_currentStep","_ag_currentPattern","_ag_playing","_ag_ppq","_ag_peak","_ag_getStep","_ag_getLength","_ag_getChain","_ag_getChainLength"]' \
  -o dist/afterglow.wasm
