# Validation record — development version 0.1.0

This is an initial development build, not a production-ready or hardware-validated release. A successful compilation or automated test is not evidence that Ableton Live has loaded the Windows plugin successfully.

## Completed checks

- The standalone C++ DSP behavioral suite passed on Linux using GCC. It exercises every 808/909 factory voice at 44.1, 48, and 96 kHz, finite/bounded output, audible signal, reset silence, and independence between interleaved engine instances.
- The DSP suite also passed with AddressSanitizer and UndefinedBehaviorSanitizer. Leak detection was disabled because LeakSanitizer cannot inspect the environment's process filesystem. This does not claim leak validation.
- DSP sampling checks cover independent stereo channels, reversed playback, sample completion, empty/missing samples, replacement during playback, closed-hat choking of an open-hat sample, mute, solo, hard pan, and invalid parameter inputs.
- An 808-inspired closed-hat spectral regression checks that upper-band energy dominates low fundamentals at 44.1, 48, and 96 kHz. This catches an overly tonal/dull synthesis regression; its threshold is not a comparison against hardware.

## Integration checks

The Linux Release build produced the native VST3, standalone executable, and test executable. All three CTest suites passed: sequencer, DSP, and processor. The processor test executable was also run directly and passed without a display server.

The Linux VST3 passed pluginval 1.0.4 at strictness level 5 with GUI tests skipped, including audio processing, automation, state, and bus-layout checks. The separate Steinberg VST3 validator was not configured and was skipped; this is a pluginval result, not an official SDK-validator result.

The real JUCE editor was rendered headlessly to a PNG at its default 1180 × 800 size and visually inspected. The initial snapshot exposed elided two-digit pattern labels, excess decimal places, and malformed separators; those defects were corrected and a fresh snapshot was checked. A software-rendered snapshot does not establish Windows GUI input, scaling, or accessibility compatibility.

No Windows VST3 or standalone binary was produced locally. The MinGW attempt failed at the framework toolchain check; see below. The configured Windows GitHub Actions workflow has not been run as part of these local checks.

The processor suite covers sample-offset MIDI triggering, panic, host start/stop, auxiliary bus routing, different host block sizes, concurrent pattern publication, full state recall, embedded sample portability after removal of the source WAV, and rejection of malformed state/preset data. Its screenshot mode renders the actual JUCE editor for visual inspection.

## Unverified environments and behavior

- A MinGW cross-compilation attempt was rejected by JUCE 8.0.6's explicit unsupported-toolchain check. A generic Windows executable compiler probe is not a Windows VST3 build. The supported Visual Studio/MSVC Windows build is configured in GitHub Actions; a successful workflow result must be verified separately.
- No actual Ableton Live session on Windows has been exercised in this environment.
- Native Windows plugin scan, device audio operation, automation recording, host project reopen, and multi-output routing require confirmation on the user's machine.
- No original TR-808/TR-909 hardware, reference capture corpus, or controlled listening panel was available. Circuit-identical emulation and perceptual indistinguishability are not claimed.
- Numerical tests are not a comprehensive CPU-load, long-session, accessibility, or compatibility certification.

## Known scope limits

- The default 909 hats/crash/ride are synthesized approximations; the original machine used sampled cymbals. No Roland ROM samples are bundled.
- Sample import is intended for WAV, AIFF, and FLAC, at 8–192 kHz and at most 10 seconds. Mono/stereo work; multichannel imports use the first two channels. Imported audio is embedded in saved state, which increases project/preset size.
- Sample playback is one-shot with pitch/speed adjustment, trims, and reverse. It has no time stretching, slicing, or streaming; synth tone/decay controls do not become sample filters/envelopes.
- Kick/snare synthesis settings are applied at the next trigger; changing a control does not necessarily reshape a hit already ringing. Sample tuning/trims/reverse likewise take effect on the next trigger. Mixer gain/pan and master controls are smoothed during playback.
- Step probability is deterministic for musical position. Replaying the same host loop reproduces its chance decisions rather than generating a newly randomized performance each pass.
- MIDI export contains enabled, nonzero-probability steps in the selected pattern, including swing and repeats. It does not capture one stochastic performance or export a complete song chain.
- Auxiliary buses bypass master level/drive and retain their voices in the master bus. Monitor either path as appropriate to avoid doubling signals.
- Patterns and steps are edited in the plugin; continuous voice/global controls are host parameters. Full per-step parameter locks and live MIDI pattern recording are outside this version.

## First Ableton Live check

1. Install the entire VST3 bundle, rescan, and load it on a MIDI track.
2. Start/stop Live, change tempo, loop a region, and seek during playback; confirm stable timing.
3. Trigger MIDI notes with the sequencer disabled, automate a voice parameter, and reopen the project.
4. Import a short sample, save/reopen, and verify recall after moving its original file.
5. Enable an auxiliary output and check its routing without also monitoring the same voice twice.
6. Begin at a conservative monitoring level; this build has not undergone extended host testing.
