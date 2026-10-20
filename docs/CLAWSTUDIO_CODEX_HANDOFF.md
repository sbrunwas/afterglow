# ClawStudio — Codex Cloud project handoff

Updated 2026-10-20. This is the durable summary of prior ChatGPT engineering conversations; repository source and test evidence outrank this document if they differ.

## Product

ClawStudio is a browser-based electronic-music performance studio. Its central workflow is **independent, synced instrument sequencers feeding a hands-on DJ/performance mixer**, with studio-wide A/B parameter morphing, FX sends, sidechain, scenes/song conductor, live tape/DAT-like recording, resampling, and session backup. The user values experimentation, playful mutation/happy accidents, and seamless improvisation; the project should not become a conventional DAW timeline.

Design references: TR-808/909, JP-8000, early-2000s digital/wavetable sounds, SP-404 live looping, glitch/stutter effects and analog/semi-modular patching. These are *inspirations*, not proprietary emulations.

## Source of truth and delivery

- Canonical development repo: https://github.com/sbrunwas/afterglow
- Active, published ClawStudio source branch: `clawstudio-mono-dsp-clarity-v20` (despite the branch name, it includes v0.21 transport/recording hardening and v0.22 Poly JP panel/patchbay).
- Studio entry: `web/dist/clawstudio.html`; related CSS/JS/WASM assets are under `web/dist/`.
- Publishing repo: https://github.com/sbrunwas/sbrunwas.github.io, `master` workflow `.github/workflows/publish-clawstudio.yml`. The workflow clones the *source branch* and copies the distribution to `clawstudio/` under GitHub Pages. Do not edit generated files as durable source.
- Live: https://sbrunwas.github.io/clawstudio/
- Distinct project components outside the studio (e.g. the native Afterglow VST3) may share the repository. Preserve them.

## Existing modules and behavior

- **Drum Machine:** the C++ engine is compiled to real WebAssembly (not a 55 Hz shim). `audio.js`, `wasm-runtime.js`, `worklet.js`, and `afterglow.wasm` implement its render-thread sequencing. Eleven lanes, pattern banks, multiple researched synthesis families, imported samples, and stereo master routing.
- **Mono:** `bass01.js`, with its own instrument sequencer and mixer strip. Rich single-voice synthesis. Earlier standalone semi-modular experiments have not yet been ported to the current canonical Mono.
- **Poly:** `rack-devices.js` presents the JP-8000-inspired front panel with oscillators/Super Saw, filter/envelope sliders and effects. The **separate lower panel** in `poly-modular.js` / `poly-modular.css` adds virtual cables, S&H/random CV, LFOs, envelope, velocity, per-route depth, and voice-to-voice modulation. Patch state persists with Poly.
- **Texture:** wavetable/FM/wavefold/resonator/formant/noise paths; focus on clearly differentiated, evolving digital timbres.
- **Acid:** 303-inspired monophonic synthesis and sequencer.
- **Sampler:** `sampler.js`, sample/reel capture, import, playback, restoration, and routing through the Desk.
- **Conductor and CLAWSTEP:** scenes/song structure, four sequencer lanes, quantized switching and rack/drum MIDI routing. Inspect actual code before assuming individual scene data is completely covered.
- **Mixer and FX:** deck buses, per-strip EQ/filters/sends, sidechain, crossfader/morph, master FX and recording tap.
- **Session and I/O:** JSON project backup/restore; Web MIDI and optional audio I/O paths. Hardware-specific tests are not available in cloud by default.

## History and QA

The project went through prototype candidates v0.11–v0.20 outside the canonical repo, then ported and shipped select improvements via PRs:
- v0.21: https://github.com/sbrunwas/afterglow/pull/6 — kit preflight, swing/clock consistency, Worker scheduling, render-frame drum events, 24-bit stereo capture via AudioWorklet, regression tests.
- v0.22: https://github.com/sbrunwas/afterglow/pull/8 — preserve JP-style Poly upper panel, add separate semi-modular patchbay and original Web Audio routes, unit and Chromium offline-audio tests.
- Pages publisher work: https://github.com/sbrunwas/sbrunwas.github.io/pull/2 .
- Chromium WASM/recording smoke and automated playback tests passed on the integrated branch. This is not proof of physical MIDI/audio hardware behavior or complete listening quality.
- A Windows native processor test previously segfaulted on both source branches; examine current status and baseline before attributing it to new changes.
- Some prototype ZIPs and discussions from ChatGPT were not imported as code. Do not claim all experimental candidates are shipped merely because they were discussed.

## Product priorities for Codex

1. **QA and release engineering**: comprehensive Playwright integration across JAM/Pause/Stop, conductor scenes, mixer interaction, sampler capture, session restore, recording, and smoke tests for all rack instruments. Differentiate true browser rendering from mocks and physical-device tests.
2. **Safe state/recording**: transactional project import with rollback, corruption/quota handling, crash recovery from initial use, 10-minute recording reliability, sampler AudioWorklet recording instead of deprecated ScriptProcessorNode (if still present).
3. **Clock fidelity**: correlate render-frame WASM timing, external JS/Worker schedule, swing, MIDI output timestamps, and tempo changes; investigate drift quantitatively rather than claiming sample-perfect external instruments.
4. **Semi-modular and sound design**: port the safe Mono patchbay to canonical Mono; improve Poly visual patching and voltage traces without changing JP panel identity; differentiate Texture's wavetable/FM/resonant/glassy/evolving signatures.
5. **Performance**: fader ergonomics, meters/clip alerts, limiter behavior, genuine stereo analysis, glitch/stutter/transition effects, sampler↔mixer loop routing.
6. **Code health**: untangle the large `clawstudio.html` script incrementally while retaining feature parity and public routes. Add scoped test coverage per extraction.

## Non-goals and release constraints

No unauthorized proprietary ROM/firmware use, analog CV compatibility claims, or destructive updates to the live static site. Never auto-merge or deploy experimental work just because tests are green. Confirm the user's requested release scope, reproducible tests, GitHub Actions result, actual built assets, and post-publish checks. Hardware MIDI, audio interfaces, microphones, and physical audio monitoring require human acceptance.

## Starting checklist for a cloud task

1. Confirm you checked out `clawstudio-mono-dsp-clarity-v20` and the latest commit.
2. Read `AGENTS.md`; review relevant source and tests rather than assuming this summary is current.
3. From `web`: `npm ci`, `npm test`; see `.github/workflows/browser.yml` and `scripts/clawstudio-browser-smoke.mjs` for Chromium. Use the committed WASM if not rebuilding.
4. For delivery, open a PR into the active ClawStudio branch with scoped tests and summary; do not merge/publish unless requested.
5. If release authorized, verify the Pages publisher copies every new dependency and the deployed site loads the expected commits; preserve other modules.
