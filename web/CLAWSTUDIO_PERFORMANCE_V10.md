# ClawStudio v0.10 — Performance Conductor

Browser-only production studio beta. This release adds an eight-scene song map at the TOP of the Desk, a four-lane step sequencer, live stereo waveform/FFT/vectorscope, and permission-based external MIDI/audio patching. It preserves all v0.9 synth engines and the original local WebAssembly Drum Machine.

## Scenes
Eight editable scene slots, each 1/2/4/8/16 bars, capture independent Drum, Mono, Poly, Texture, and Acid pattern selections as well as mixer fader/mute values. Click to queue a scene to the next bar, or shift-click to recall immediately. Automatic chaining cycles the eight slots. Save/load song maps as JSON. Song maps are **not** an audio arrangement timeline.

## Four-track conductor
Four independent 16-step lanes with gate/note/velocity, mute/enable, and target routing. Targets: Mono, Poly, Texture, Acid, Drum Machine (via MIDI note mapping), all synths, or MIDI OUT. The device follows the shared studio transport.

## Desk meters
Real live stereo waveform, two-channel FFT spectrum, stereo phase correlation and a Lissajous vectorscope sourced from the actual master signal, not synthetic visual data. Visibility and CPU performance vary by device/browser.

## Hardware
Web MIDI input/output is opt-in and supported only where the browser exposes Web MIDI. Each MIDI lane has a MIDI channel; incoming notes route to the chosen sequencer lane target. MIDI-to-CV converters can receive output notes; **direct CV voltage output is not implemented** because calibrated DC-coupled interfaces are needed. External audio input is opt-in via getUserMedia, routed through its own seventh mixer channel (EXT IN), with input gain and channel fader defaulting to zero. Speaker selection relies on AudioContext.setSinkId and is not supported on all browsers, including Safari.

## Known limitations
- Browser script scheduler is look-ahead JS: it shares tempo with the sample-accurate WASM Drum Machine but scene changes are not yet sample-accurate.
- Hardware MIDI and physical interface audio I/O have not been tested on the user's devices.
- The Sampler channel is still a placeholder; a full hardware-style sampler and tape 4-track have not been implemented.
- Existing WAV recorder is basic and not meant for long takes yet.
- DSP fidelity for JP-8000/microQ/303 is inspired/original, **not** authentic firmware emulation.
- This branch embeds the Conductor script and styles directly inside `web/dist/clawstudio.html` for a single-file Desk deployment; future releases can split it back into separate build assets.

## QA
- Chromium desktop (1400×900) / mobile (390×844) UI smoke tests with a mocked local drum adapter: PASS. Eight scenes, four lanes, seven mixer strips. Scene store, name, measure selection, sequencer controls, and JAM/STOP pass without page errors.
- Node JavaScript syntax checks: PASS.
- Real browser original WASM playback, hardware device outputs and Jekyll Pages integration require deployment/device QA.

## Security
Hardware capabilities require explicit user gestures and OS/browser permissions. No server-side project upload. JSON scene loads validate scene counts, lengths and lane notes before applying.
