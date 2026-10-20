# Start ClawStudio in Codex Cloud

Codex Cloud environments are managed in the Codex web/desktop UI. This repository itself cannot grant access or create an environment.

1. Open https://chatgpt.com/codex/ and choose **Work in > Cloud > Select environment > Create environment**.
2. Select the GitHub repositories **sbrunwas/afterglow** (source) and, if the setup permits multiple repositories, **sbrunwas/sbrunwas.github.io** (Pages publisher). Authorize GitHub when prompted.
3. IMPORTANT: ClawStudio's active application is on `afterglow` branch **clawstudio-mono-dsp-clarity-v20**, NOT the repository default `main`. In environment setup, ask Codex to check out that branch. Do not change the GitHub default branch.
4. Ask Codex to install Node 22, run `cd web && npm ci && npm test`, and validate the existing `dist/afterglow.wasm`. The full native engine rebuild uses Emscripten 3.1.74 and can be deferred if toolchain installation is expensive.
5. For headless integration, install Playwright Chromium if permitted and run `node web/scripts/clawstudio-browser-smoke.mjs` (from the repo root). Codex Cloud's *integrated browser/computer UI* may be unavailable; CLI Playwright is a separate capability and must be verified.
6. Review the environment setup report, publish the environment, and start a task. Name it **ClawStudio**.

Suggested setup instruction:

> This is the ClawStudio browser performance studio, not merely the Afterglow VST. Check out `sbrunwas/afterglow` branch `clawstudio-mono-dsp-clarity-v20` and optionally the Pages publisher repo. Read `AGENTS.md` and `docs/CLAWSTUDIO_CODEX_HANDOFF.md`. Install Node 22, `cd web && npm ci && npm test`; check existing WASM and Chromium smoke commands. Keep the live GitHub Pages site unchanged. Record reproducible install/start commands, then show me the environment setup report.

No API token or private key should be placed into this repository. Reuse Codex's GitHub authorization and environment controls. Publishing Codex's environment is distinct from deploying ClawStudio's public website.
