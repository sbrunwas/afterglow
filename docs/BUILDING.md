# Building Afterglow

## Recommended: Windows x64

Install Visual Studio 2022 Build Tools with **Desktop development with C++**, Git, and CMake 3.22 or newer. From the repository root:

```powershell
./scripts/build-windows.ps1
```

CMake fetches the pinned JUCE 8.0.6 release on first configure. To use an existing checkout, add `-DAFTERGLOW_JUCE_PATH=C:/path/to/JUCE` to configure. No separate VST3 SDK download is required; it is included with JUCE.

The finished files are:

- `build/Afterglow_artefacts/Release/VST3/Afterglow.vst3` (copy this entire directory)
- `build/Afterglow_artefacts/Release/Standalone/Afterglow.exe`

GitHub Actions builds both, runs the automated tests, and validates the VST3 with pluginval 1.0.4 at strictness level 5 on Windows for each push and pull request. Its downloadable `Afterglow-Windows-x64` artifact contains a release zip. Pushing a `v*` tag also publishes that zip as a GitHub Release. The zip includes matching project and JUCE source archives and license notices. The MSVC runtime is linked statically.

## DSP and sequencer tests without JUCE

```sh
cmake -S . -B build-core -DAFTERGLOW_BUILD_PLUGIN=OFF -DCMAKE_BUILD_TYPE=Release
cmake --build build-core --parallel 2
ctest --test-dir build-core --output-on-failure
```

## Linux

Install a C++17 compiler, CMake, pkg-config, ALSA, X11/Xext/Xinerama/Xrandr/Xcursor, FreeType, Fontconfig and OpenGL development packages. Then:

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure
```

The `local-linux-build.sh` helper is for the development container's extracted dependency prefix, not needed on a normal Linux machine.

## Windows toolchain requirement

JUCE 8 explicitly does not support MinGW. Windows binaries must be built using the native MSVC workflow above; the Linux build validates application code and tests but cannot establish Windows/Ableton compatibility.

The VST3 and application use the AGPL-3.0 license; JUCE is used under its AGPL option. Retain all notices when distributing source and binaries.
