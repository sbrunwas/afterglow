# Afterglow — browser rhythm composer

The browser edition of [Afterglow](https://github.com/sbrunwas/afterglow), with a worn 909-inspired hardware interface and the **same C++ synthesis/sequencer core** as the Windows VST3. No JUCE runtime is required in the browser. Original branding and assets; no Roland ROM samples.

## Play

Serve `dist/` over HTTPS (or localhost for development). Open the page and click **PLAY** to enable Web Audio. The live site uses HTTPS. Edit patterns before enabling audio if you prefer. Browser support requires WebAssembly, AudioWorklet and Web Audio; current Chrome, Edge, Firefox and Safari provide those features. Web MIDI input is optional and browser-dependent.

- Switch skins from the header: Classic 909, Hacker (black/green), Midnight (black/blue), or Studio (bone/burgundy). Skin choice is stored separately on this device and does not change the kit or audio.
- 11 voices; 909/808-inspired synthesis or one-shot custom samples per voice.
- 16 patterns, 1–64 steps, 4 pages, swing, per-step velocity/chance/repeats, song chains, copy/paste and per-voice variation.
- RANDOMIZE PATTERN generates all eleven lanes of the selected pattern, preserving its length. RND next to each voice or RANDOMIZE SOUND varies tune/decay/tone/drive within its selected 808/909 family, preserving mixer settings and samples. Sample voices are excluded from synthesis randomization. UNDO RANDOM restores the last randomization (including VARY VOICE).
- Tune, decay, tone, level, pan, drive, mute/solo, sample start/end/reverse. The original synth controls do not become sample filters.
- Drag a supported audio file onto the selected voice, or use LOAD SAMPLE. Maximum 10 seconds; actual decoding support depends on the browser. PCM WAV is the most portable choice. Audio is decoded locally, resampled to the audio context rate and retained as stereo.
- SAVE KIT downloads a `.afterglow-web.json` preset containing all patterns/settings and embedded float32 samples. LOAD KIT accepts browser presets; native JUCE `.afterglow` files are a different format. Autosave uses device-local storage when quota permits; a quota warning means use SAVE KIT.
- RENDER WAV renders 1/2/4/8 bars with the same WASM engine in a separate Worker, plus one second of ringing tail. It follows the selected pattern or enabled chain; probability follows the core's deterministic position seed. WAV export works independently of live audio/device availability.
- EXPORT MIDI writes the selected pattern, swing and repeats, with enabled steps of nonzero probability. It does not bake a stochastic performance or export the entire chain.
- SPACE toggles playback; A S D F G H J K L ; ' audition the 11 voices. An optional MIDI INPUT button requests input access without SysEx. Notes are36/38/41/45/48/37/39/42/46/49/51.

Samples/presets stay in the browser unless you deliberately download/share them. There is no microphone capture, server-side audio processing or third-party audio request. The interface is responsive; the full 16-step grid scrolls horizontally on small screens.

## Build

The committed `dist/afterglow.wasm` is a ready-to-serve build. To rebuild it, install the official [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html), install/activate **3.1.74**, then run:

```sh
AFTERGLOW_EMSDK=/path/to/emsdk ./scripts/build-wasm.sh
npm ci
npm test
```

Alternatively activate emsdk on PATH or set `EMXX=/path/to/em++`. The bridge compiles `src/core/DrumEngine.cpp`, `Sequencer.cpp` and their vendored DaisySP subset. The copied core matches the VST3 source at commit `38c19ae22fc2784939c8e67e62894c9ae3183b5e`. Core changes should be ported deliberately, with parity tests retained.

Web audio uses a synchronous WebAssembly instance inside AudioWorklet, sample-accurate C++ scheduling and fixed 128 MiB WASM memory. Parameter/bank differences avoid rewriting the entire native bank on every knob edit. A separate Worker handles offline export. Audio-thread rendering does not allocate DSP memory or rely on JavaScript timers for hit scheduling. Imported sample banks are bounded to6million stereo frames; the C++ bridge also enforces a64MiB sample budget.

## Validation

Node tests execute the **actual WASM module** for all22 synthesized voices at44.1/48/96kHz, stereo/reverse samples, instance independence, factory pattern parity, exact callback partition invariance and fixed memory. Additional tests cover presets and malformed input, MIDI timing, offline WAV duration/determinism/tail, controller lifecycle, and the real worklet module with mocked Web Audio interfaces. A native bridge fixture compares the adapter against direct original C++ output.

DOM tests use LinkeDOM and test interactions without a browser. Actual browser autoplay/security/device audio, visual rendering and mobile input have not been verified in this environment. Numerical/adapter tests do not establish browser/device compatibility or fidelity to original drum hardware.

This is a development edition. Stock909 cymbals are synthesized approximations; original909 cymbals were sampled. Circuit-identical emulation is not claimed. Browser timing follows its own clock, not Ableton's transport, and browser audio has stereo output rather than the VST3's auxiliary buses.

## License

Authored code: AGPL-3.0-only. DaisySP/Mutable Instruments drum code retains MIT notices. See `dist/LICENSE.txt`, `dist/DaisySP-LICENSE.txt` and `dist/NOTICE.txt`. The browser source is available through the in-app source link.
