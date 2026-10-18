# ClawStudio Instruments: Sources, DSP provenance, roadmap

## Fidelity rule

ClawStudio v0.8 contains three **original Web Audio instruments**. They draw on documented features but **do not contain native firmware, proprietary DSP, or source from Gearmulator/Open303**. The instrument design should remain playable while deep audio engineering work proceeds. Track emulation fidelity separately from user experience.

## POLY-01 — JP performance synth with Europa-inspired enhancements

The Roland JP-8000 is the correct name of the instrument often called “Jupiter 8000.” JP-8000 has a seven-saw Super Saw oscillator with central waveform, detuned copies, DETUNE/MIX controls, dual oscillators, filter and envelope faders, chorus and delay. Public JP-8000 literature describes feedback oscillator, triangle modulation, sync and cross-mod effects. Reason Europa contributes waveform shape, harmonics, multiple modified sound engines, envelope/LFO modulation, FM and spectral filter ideas.

**Research source:** https://cdn.roland.com/assets/media/pdf/JP-8000.pdf ; https://docs.reasonstudios.com/reason13/europa-shapeshifting-synthesizer ; https://github.com/dsp56300/gearmulator

**High-fidelity target:** The Usual Suspects **JE-8086** in Gearmulator uses native C++ processor emulation and authentic Roland firmware. The current Web Audio prototype has 7 detuned browser oscillators, alternate wave modes, a second oscillator, filters, voice ADSR, FX, 9 JP-like sliders, a pattern sequencer and 14 factory patches. It is not equivalent to the JE-8086 engine.

**Research tasks:** isolate `source/ronaldo/je8086/jeLib` emulator dependencies, verify memory and firmware handling, conduct native CPU benchmarks, attempt C++/WASM Emscripten build with user-supplied permitted firmware, expose audio/MIDI through AudioWorklet, compare reference recordings across oscillator combinations. User should not be asked to distribute firmware or circumvent activation. If it cannot run well in browsers, improve our clean-room oscillator/filter DSP.

## TEXTURE-01 — microQ wavetable/Absynth mutation

The Waldorf microQ has three oscillators, wavetable capabilities, ring modulation, dual filters, multiple envelopes and LFOs, and a deep modulation matrix. Its bright yellow rack faceplate inspired our interface. Absynth contributes complex evolving envelopes, semi-modularity and structured patch mutation with history and controllable strength, plus granular/FM sound design.

**Research source:** https://github.com/dsp56300/gearmulator ; https://www.musicradar.com/music-tech/absynth-story-plugin-week

**High-fidelity target:** Gearmulator **Vavra** handles the Waldorf microQ using processor/firmware emulation; examine `source/waldi/common/mqLib` and common emulator dependencies. Absynth is proprietary and no open original DSP source has been verified; an independent implementation of meaningful mutation and large evolving envelopes is preferable to falsely claiming engine fidelity.

**Now:** 6 Fourier-derived wavetable families, 3 detuned sources, FM, resonant low/high filtering, slow waveform/filter evolution, stereo motion, hall/echo output, guided MUTATE strength, envelope/filter locks, undo history, 14 factory textures. Wavetables and filter behavior are original approximations, not original microQ tables.

**Next:** careful multistage MSEG envelopes, richer modulation matrix, selectable envelope points/curves, granular sources, mutation from tagged compatible sound families, modulation snapshots, patch compare, high-confidence Vavra C++/WASM feasibility prototype.

## ACID-01 — 303 bassline

**Research source:** https://github.com/RobinSchmidt/Open303 ; https://github.com/charlesvestal/schwung-303 ; https://github.com/dfl/db303

The original TB-303: saw/square oscillator, resonant low-pass filter, envelope amount/decay, slides, accents, a 16-step pattern programmer. Open303's C++ engine is MIT, and subsequent JC303/Devilfish-related work is GPLv3; inspect specific files and preserve original notices when importing.

**Now:** saw/square, resonant two-stage low-pass approximation, envelope sweep, separate slide/accent, variable duration/tempo, distortion and original-style panel with 12 patches. This is *not* an Open303 DSP port.

**Next:** replace browser approximation with an actual Open303 C++/WASM DSP module, with browser MIDI note/slide/accent events and an AudioWorklet render buffer. Characterize cutoff/resonance and accent- vs unaccented-decay response, oversampling, feedback safety, pitch slide transitions. Retain original source license notices and publish modifications.

## Integration architecture

`Drum Machine (native WASM)` + `Mono (existing BASS-01)` + `Poly` + `Texture` + `Acid` -> separate stereo channel strips -> ClawStudio mixer buses -> live FX sends -> master/DAT WAV. A sixth Sampler strip remains reserved. All modules have one shared AudioContext and master tempo, but the browser prototype still uses JavaScript lookahead scheduling for non-drum machines, whereas the original drum C++ engine schedules on the audio thread. A future unified AudioWorklet clock is necessary for stable phase locking and lower jitter.

## Validated checks (this development session)

- Each standalone browser module mounted and exposed knobs, presets, patterns, editable 4- and 8-step modes, and live audio start/pause controls without page errors in a Chromium `set_content` test.
- Integrated Rack/Desk smoke-test mounted Poly, Texture and Acid and displayed 6 mixer strips, including Mono and reserved Sampler. Global JAM and stop passed with a mocked Afterglow audio adapter, **not original native drum hardware**.
- Each instrument separately rendered 2 seconds using OfflineAudioContext with nonzero RMS and finite peak values.
- Actual device playback, exact sonic hardware matching, timing stress and the real drum WASM integration still require human/device testing.