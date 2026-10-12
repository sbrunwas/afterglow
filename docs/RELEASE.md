# Afterglow 0.1.0 — Windows development preview

Download **Afterglow-Windows-x64.zip** from the assets below. It contains the Windows x64 VST3 instrument, optional standalone app, audio demo, documentation, licenses, and corresponding project/JUCE source archives.

## Install in Ableton Live

1. Extract the ZIP and copy the **entire `Afterglow.vst3` folder** into `C:\Program Files\Common Files\VST3\`, or your custom VST3 folder.
2. In Live, enable VST3 plug-in folders in Settings → Plug-Ins and rescan.
3. Load Afterglow on a MIDI track and press Live's Play button. HOST follows Live's tempo and position by default.

The supplied `install-windows.ps1` can copy the bundle into the system folder when run with administrator permission. The standalone `Afterglow.exe` is optional; select an audio device, disable HOST and enable RUN to audition without Live.

## Included

- Eleven drum voices, default 909-inspired synthesis, per-voice 808 or custom WAV/AIFF/FLAC samples.
- Sixteen patterns of up to 64 steps, swing, velocity, probability, repeats, variable-length pattern chains, copy/paste, variation and MIDI export.
- Tune, decay, tone, level, pan, drive, mute/solo, sample trims and reverse.
- Host synchronization, MIDI triggering, automation, stereo master plus eleven stereo voice outputs.
- Portable presets and project recall with embedded samples.

## Validation and limits

Windows release assets are published only after the MSVC build, all three CTest suites (sequencer, DSP, processor), and pluginval 1.0.4 strictness 5 succeed. GUI tests are skipped in pluginval. See `docs/VALIDATION.md` for the detailed record.

This is an initial development preview. It has **not been tested inside Ableton Live on Windows** or compared against original hardware. The engines are 808/909-inspired models, not measured circuit-identical emulations. Stock 909 cymbals are synthesized approximations; no Roland ROM samples are bundled.

The WAV demo plays four bars of 909-inspired synthesis followed by the same patterns with 808-inspired synthesis. The editor PNG is an actual software-rendered JUCE editor snapshot from Linux.

Project code is AGPL-3.0-only; third-party licenses are included. Independent project, unaffiliated with Roland, Reason Studios or Ableton.
