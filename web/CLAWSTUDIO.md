# ClawStudio v0.5

ClawStudio is the unified Rack + Performance Desk browser app at `web/dist/clawstudio.html`. It uses the existing local `web/dist/audio.js`, `worklet.js`, `wasm-runtime.js`, `state.js` and `afterglow.wasm` from this repository, without runtime network fetches or fallback drum synthesis.

Run `python -m http.server 8000 --directory web/dist`, then visit `http://localhost:8000/clawstudio.html`. Click JAM to initialize the original audio engine and route its stereo signal to the Desk. The acid, chords and sampler sources are temporary internal loop generators; full rack modules are next. The drum machine currently uses one stereo desk strip.

Known limitation: live hardware output and the genuine WASM integration have not been device-tested. Browser smoke tests used a mock audio adapter. Retain original project's engine licensing notices.