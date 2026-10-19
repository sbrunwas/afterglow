# ClawStudio — audited project backlog (2026-10-18)

Current **website source**: branch `clawstudio-scene-lane-recall-v16`; served at https://sbrunwas.github.io/clawstudio/ by workflow in `sbrunwas/sbrunwas.github.io`. Browser distribution is **not** merged to the original Afterglow repository's default `main` branch. Native Afterglow VST remains a separate product/build.

## Delivered in the browser beta
- Original 11-voice C++/WebAssembly Drum Machine; 909/808/Linn/Perkons/sample lane families, pattern editor, presets.
- Mono BASS-01 with multiple oscillator modes, resonant filters, separate amp/filter envelopes, 4/8/16/32/64-step sequencer, presets, C0 note range, SNAP/PUNCH parameter, dry default mixer sends.
- Poly JP-inspired performance rack, sound design presets, key/scale/chord/arp modes, phrase editor; original DSP rather than JE-8086 firmware emulation.
- Texture Waldorf/Absynth-inspired 7-source DSP modes, presets and mutation, Buchla-inspired wavefold/LPG and 6x6 patchbay with at most 6 bipolar routes. This is an original approximation.
- Acid 303-inspired instrument with accent/slide and independent sequencer; not an Open303 port.
- Four-reel Sampler rack with source capture, reverse/trim/filter/pitch/tape-style processing and WAV export; storage remains in RAM.
- Desk with individual channels including external input, four-band EQ, filters, sends, channel M/S, instrument navigation by strip double-click/↗, kick-pattern-driven sidechain, A/B mixer morph, external device I/O controls.
- Global **MUTE ALL** now sets *each* desk channel's mute; each strip can independently unmute afterward. It is NOT a master-kill output gain.
- Four-lane CLAWSTEP conductor, eight-scene song map, master waveform/FFT, browser Web MIDI and external audio I/O UI.
- **v0.17 Harmony Conductor:** Shared Key / Scale / Chord Root controls on Desk, explicit note align and generate linked parts, Poly melody Auto-Follow (non-destructive default), scale-locked Mono/Texture/Acid and CLAWSTEP; drum hits and external MIDI sequences are deliberately excluded.
- **v0.17 project recovery:** Download and open complete browser project snapshots; store and restore a browser-local backup, opt into 90-second periodic recovery. Full PCM16 stereo reel content is included. WAV import no longer waits for audio playback to resume.
- **v0.16 fix:** Capture Scene also stores four CLAWSTEP lane patterns, enabled state, destination and MIDI channel; scene recall restores them and remains compatible with older snapshots lacking lane data. Regression tests: `web/tests/clawstudio-scene-lanes.test.mjs`.

## P0 — integrity and reliability blockers
- **Full session save/reload (v0.17 BETA):** Implemented Save/Open Project JSON, opt-in IndexedDB backup and timed refresh, covering Drum Machine samples, four Sampler PCM16 reels, instrument patterns/parameters, mixer, harmony and conductor scenes. A real Chromium WAV→backup→clear→restore test passed. Remaining: device/quota stress tests, warning before unsaved page close, crash/reload recovery verification on Safari/iOS, performance/recording state and safer backups during active capture.
- **Recording audio thread:** `web/dist/sampler.js` and the full-studio recorder in `web/dist/clawstudio.html` still use deprecated `createScriptProcessor`; switch to AudioWorklet ring-buffer capture, test audio dropout, bar-quantized recordings and loop/export alignment.
- **Clock consistency:** Drum Machine sequencing runs native WebAssembly AudioWorklet; Mono/Poly/Texture/Acid and external CLAWSTEP use JS lookahead scheduling. Design/test one shared clock for low-jitter phase-locked playback and proper starts/stops.
- **Native Windows Afterglow VST CI:** `Build and test` on `main` and ClawStudio branches fails the Windows `processor` CTest with SEGFAULT, while Windows DSP/sequencer and Linux tests pass. This predates current ClawStudio changes. Diagnose with Windows debugging/sanitizers, do not simply disable the test.
- **Full-app acceptance:** Fresh browser/device QA for drum WASM initialization, simultaneous five-synth + sampler performance, Web MIDI, recorder and hardware control. Green logic/browser tests do not verify real-device audio fidelity.

## P1 — creative flow and performance
- **True studio-wide A/B morph:** Current A/B snapshots mainly mixer EQ/filter/sends and master FX, not all live rack synth parameters. Add safe per-device morphable parameter bindings (and non-morphable step/pattern handling).
- **Mono and Poly semi-modular patch cables:** Requested/planned; only Texture currently has a live patchbay in this deployed source. Integrate tested audio/modulation routing for Mono and Poly without breaking their familiar core panels.
- **Sampler slicing and sequence lanes:** Beat/onset slices, pads/sequence triggers, tempo-locked reshaping, reprint/resample with stable reel state, memory budgets and export recovery.
- **Mixer deck/scope:** More precise zoomed-out full-track song overview; current Desk's bar-length scene map approximates an arrangement but is not a detailed track timeline. Improve scopes/meters with calibrated stereo metrics and monitoring toggles.
- **Cassette/DAT performance workflow:** Existing WAV export + reel processing is not yet the full multi-track cassette overdub/varispeed/degradation/live take workflow initially specified.
- **MIDI mappings for user hardware:** Test mappings/MIDI Learn against Traktor Kontrol S2 MK2 and Roland TR-8S on real hardware; verify reliable hot plugging and clock.
- **External outputs:** Web MIDI exists, browser audio input/output options exist but real multi-output device routing remains untested. Analog CV output requires a compatible DC-coupled audio or MIDI-to-CV interface; no generic browser analog CV driver is implemented.
- **Audio-triggered sidechain:** Current KICK SC follows programmed kick steps, not isolated kick audio. Improve with envelope follower/kick bus and appropriate audio-thread detection.

## P2 — timbral authenticity and DSP
- **JP-8000**: research/benchmark The Usual Suspects JE-8086/Gearmulator with lawful firmware and performance; not ported.
- **Waldorf microQ**: investigate Vavra/Gearmulator; currently original Web Audio wavetable family and experimental engines, not the original Waldorf firmware DSP.
- **TB-303**: an actual Open303 C++/WASM port and circuit-style envelope/filter response remain unimplemented.
- **Absynth**: advanced breakpoint MSEGs, deeper mutation generations/genetic patch interpolation, granular/resonant processing.
- **Buchla texture**: patching currently uses control-rate modulation. Future audio-rate cross-modulation/function generators and fuller analog-style LPG models.

## Repository and release hygiene
- PRs #1 through #4 are still **open drafts**. Production is deployed from a sequence of versioned feature branches, while default `main` retains the original Afterglow VST project. Establish a stable ClawStudio branch/repository, merge reviewed features, run dedicated CI, tag site releases, and automate publishing from one source of truth.
- Native Windows downloadable Afterglow v0.1.0 is older than current browser/native source improvements. Do not claim that current DSP is shipped as a new Windows build.
- Maintain separate provenance and licensing documentation for any ported open-source DSP/firmware-related work.

## Audit verification
- Latest known website publish and GitHub Pages run completed successfully for v0.15; v0.16 source includes a tested scene-memory fix and new publisher run.
- `ClawStudio Rack and Channel Mute QA` and `Browser engine and interaction tests` passed on v0.15.
- The v0.16 CLAWSTEP snapshot/recall regression workflow passed.
- Windows `processor` native CTest crash reproduced on original `main` workflow, so this is *pre-existing*, not proven caused by current ClawStudio integrations.

This is a prioritized implementation inventory, not a claim that all listed features are production-ready.
