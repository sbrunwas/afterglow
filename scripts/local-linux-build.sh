#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
deps="${AFTERGLOW_DEPS_ROOT:-$root/../deps/sysroot}"
export PATH="$deps/usr/bin:$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$deps/usr/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
export PKG_CONFIG_SYSROOT_DIR="$deps"
export PKG_CONFIG_LIBDIR="$deps/usr/lib/x86_64-linux-gnu/pkgconfig:$deps/usr/share/pkgconfig:/usr/lib/x86_64-linux-gnu/pkgconfig"
export CPLUS_INCLUDE_PATH="$deps/usr/include:$deps/usr/include/freetype2:$deps/usr/include/x86_64-linux-gnu:${CPLUS_INCLUDE_PATH:-}"
export C_INCLUDE_PATH="$CPLUS_INCLUDE_PATH"
export LIBRARY_PATH="$deps/usr/lib/x86_64-linux-gnu:${LIBRARY_PATH:-}"
cmake -S "$root" -B "$root/build-linux" -DCMAKE_BUILD_TYPE=Release -DAFTERGLOW_JUCE_PATH="$root/../JUCE" -DBUILD_TESTING=ON "$@"
cmake --build "$root/build-linux" --parallel 2
ctest --test-dir "$root/build-linux" --output-on-failure
