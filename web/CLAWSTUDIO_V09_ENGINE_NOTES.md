# ClawStudio v0.9 — Original DSP expansion and validation

## Texture-01

The v0.8 prototype used one 3-oscillator Web Audio wavetable signal chain for practically all patches. v0.9 provides seven distinct original synthesis paths: WAVETABLE (retain existing Waldorf-style timbre), FM MATRIX (carrier with stacked frequency modulators), WAVEFOLD (nonlinear folded wave), RESONATOR (short noisy impulse with inharmonic partials and tuned peaks), NOISE (filtered broadband material), FORMANT (multiband resonant vowel shaping), and RING (multiplicative amplitude modulation). These are **original approximations, not Waldorf microQ, Absynth, or other proprietary firmware**.

Each patch can choose its engine, two filter algorithms, routing (SERIAL/PARALLEL/SPLIT), spectral controls, modulation and envelope pacing. The library has 33 differentiated texture patches (Waldorf/Absynth/ambient/trance/experimental inspiration). MUTATE supports TWEAK/TIMBRE/WILD, undo, and locks for engine, filter, and envelope parameters. A HEAR PATCH button previews new sounds. Prior voices fade when switching patches so timbres can be compared meaningfully.

## Poly / Acid

POLY's seven-oscillator detune/mix now follows independently published JP-8000 Super Saw measurements and has a stereo chorus/ensemble pathway. ACID has improved previous-step slide behavior. Both remain *original browser synthesis*, not the usual suspects' ROM-dependent Gearmulator ports or a port of Open303.

## Tests / limitations

- Local Node tests for engine variety, detune/mix curves, and step-wrap slide logic.
- Chromium OfflineAudioContext renders: all seven Texture engines produced finite, non-silent output; poly and acid also rendered non-silent output.
- Desktop + mobile UI: selectors, mutation/undo, and responsive viewport checked with mock-independent sound engine. The full native drum WASM host and iOS actual output have not been verified here.
- CPU performance, aliasing, sound matching and long-session stability are still open. A true Vavra/JE-8086/WebAssembly emulator port requires additional legal, technical and firmware considerations.

Upstream references: https://github.com/dsp56300/gearmulator, https://github.com/RobinSchmidt/Open303, and the JP-8000 Super Saw parameter-estimation literature by Adam Szabo. New DSP is original and separate from those codebases.
