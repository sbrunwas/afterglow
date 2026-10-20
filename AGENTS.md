# ClawStudio coding-agent guidance

This repository contains Afterglow (a native VST/standalone drum engine) and ClawStudio (a browser-based performance studio). The actively published ClawStudio source lives on branch `clawstudio-mono-dsp-clarity-v20`, not necessarily the repository's default branch `main`. Verify the branch and current head before editing.

## ClawStudio source and release

- Studio shell: `web/dist/clawstudio.html`. Its imports and other committed `web/dist/` files are served together.
- Drum DSP: native C++ source under `Source/`, compiled into `web/dist/afterglow.wasm`; `web/dist/audio.js`, `wasm-runtime.js`, `worklet.js` are the browser adapter and render-thread engine.
- Rack instruments: `web/dist/bass01.js` (Mono), `rack-devices.js` (Poly, Texture, Acid), with `poly-modular.js` and `poly-modular.css` providing Poly's separate semi-modular expansion.
- Performance components: conductor embedded in `clawstudio.html`, `sampler.js`, `project-session.js`, `poly-arp.js`, `master-performance.js`, `clawstudio-clock.worker.js`, `clawstudio-capture.worklet.js`, `render-worker.js`.
- Public URL: https://sbrunwas.github.io/clawstudio/ . The site files are **generated** into `sbrunwas/sbrunwas.github.io/clawstudio/` by `sbrunwas/sbrunwas.github.io/.github/workflows/publish-clawstudio.yml`, which clones this branch and copies `web/dist/` assets. Make lasting app edits in THIS source repository, not the Pages artifacts.

## Practical work rules

- Preserve working Drum Machine, Mono, Poly, Texture, Acid, sampler, scene conductor, mixer, effects, session persistence, recording, and MIDI paths. Avoid replacing the actual WASM drum engine with mock oscillator code.
- The Poly instrument's main panel should remain JP-8000-inspired, with a physically separate, optional semi-modular patchbay below. Respect older patch/session formats and restore them safely. Mono semi-modular routing is a future integration, not proof of current production support.
- ClawStudio is an original, hardware-inspired synthesizer. Do not imply authentic Roland/Waldorf/other vendor firmware, ROMs, exact circuit models, analog CV output, or hardware MIDI compatibility without measurements.
- Make small, reviewable changes; test negative cases, audio failures, race conditions, timing, and state round-trips. `AGENTS.md` is guidance, not a substitute for inspecting code.
- Never claim a feature is running on the live site based only on a branch write or mock test. Distinguish Node tests, native WASM, Chromium Web Audio, actual listening, MIDI/physical devices, and live deployment.
- Use a feature branch and pull request for substantial work. Do not push to or trigger production deployment without the user's explicit release request; validate CI and source-to-site asset completeness first.
- Keep project and build instructions current in `docs/CLAWSTUDIO_CODEX_HANDOFF.md`.

## Verification

From `web/`: run `npm ci && npm test`. For browser/WASM integration, see `web/scripts/clawstudio-browser-smoke.mjs` and `.github/workflows/browser.yml`. The browser job rebuilds the C++ WASM engine and checks an actual Chromium audio/recording workflow. Other actions also test native C++/VST components. If failures predate a patch, document the baseline; never hide them.

For large or high-risk work, first propose a short implementation plan, then change code, run relevant tests, and give exact file/commit/test results. See `docs/CLAWSTUDIO_CODEX_HANDOFF.md` for product vision and outstanding engineering priorities.
