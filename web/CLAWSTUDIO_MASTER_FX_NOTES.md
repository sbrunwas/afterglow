# ClawStudio v0.19 — Master Performance FX

This release implements original real-time browser audio effects inspired by **dblue Glitch**, **iZotope Stutter Edit** and **Baby Audio Transit**. It is **not** their underlying proprietary DSP or an exact emulation.

## Signal path
Desk deck buses and channel sends -> master gain -> `master-fx-worklet.js` -> existing Drive/Compressor -> stereo meter, DAT WAV recorder, destination. **Factory default: FX bypassed.** The integration connects a direct dry route before the AudioWorklet is ready and retains dry audio if browser worklet initialization fails. The master FX implementation uses a fixed-size 131072-frame stereo history ring on the audio rendering thread. Rhythmic scheduling uses the existing ClawStudio shared transport; the original drum C++ engine remains unchanged.

## Controls
- 16-step master sequencer; paint FX from OFF, RETRIG, REVERSE, TAPE, CRUSH, GATE, FILTER, DELAY, SHUFFLE. Sequencer can be armed and bypassed independently. Wet mix and intensity are available.
- Stutter Edit-style **hold gestures** for retrigger, reverse, tape and gate. Gestures override the current step FX while pressed and release on pointer up or cancel.
- Transit-style **transition macro** with four assignable target/depth pairs: filter, delay, crush, drive, width, gate. An automation can be launched from the next bar for 1, 2 or 4 bars, with a build or release motion. Recipes provide instant macro assignments.
- Scene snapshots and full-project JSON include Master FX parameters and step grid. Existing saved projects without `masterPerformance` restore normally.

## Validation
- `web/dist/master-performance.test.mjs` tests bypass transparency, bounded finite output, real transformations from all eight effect algorithms and macro automation lifecycle.
- `web/tests/clawstudio-master-fx.e2e.mjs` runs headless Chromium on the full ClawStudio application and checks worklet load, transport, gesture hold/release, sequencer editing, scene recall and portable project save.
- GitHub Actions: `.github/workflows/clawstudio-master-fx.yml`.

## Known fidelity limits and next work
- Tape effects are buffer-rate approximations, not physical tape transport modeling.
- SHUFFLE/reverse are history-buffer effects. No phase-vocoder granular time-stretch yet.
- Macro controls are four assignable targets with independent depths; more nuanced nonlinear per-parameter curves, bipolar assignment and host MIDI learn are future work.
- The AudioWorklet advances using sample-domain processing, but the note/effect commands still come from JS lookahead and can jitter if the main thread stalls. Unifying the clock remains a general ClawStudio objective.
- This is a first beta that has not been tested on real hardware, Safari/iOS or long-duration streaming. Headless browser checks do not substitute for subjective sound quality and glitch/dropout testing.

Background references: https://www.izotope.com/community/blog/learn-stutter-edit-in-10-minutes ; https://babyaud.io/docs/transit-2-manual ; https://www.kvraudio.com/news/dblue_releases_glitch_v1_3_beta_now_free_5202.
