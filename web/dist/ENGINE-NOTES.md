# Afterglow engine research and fidelity notes

Research and implementation: 12 October 2026. Afterglow includes circuit-informed
808/909 voices, Linn-inspired sampled drums and Perkons-inspired synthesis. It is a substantial
change in sound, not a claim of component-exact or independently measured
hardware equivalence.

## What is implemented

| Family | Current implementation |
| --- | --- |
| 808 bass drum | Struck resonator with feedback-controlled decay, attack frequency shift, pitch sigh and retained state on retrigger. |
| 808 snare and toms | Separate shell/noise structures and resonating tom circuits, adapted from Schwung 8W8. |
| 808 clap | Multiple noise bursts and a separate tail. |
| 808 hats, cymbal, cowbell | One free-running six-oscillator metal bank, separate filtering/envelopes; cowbell uses two oscillators. |
| 808 rim | Sonic Pi-derived approximation retained by the upstream project. It is not a circuit solver. |
| 909 bass drum | Swept oscillator, nonlinear rounding and attack component. |
| 909 snare, toms, rim, clap | Circuit-informed oscillator, resonator, envelope and filtered-noise models adapted from Schwung 9W9. |
| 909 hats, crash and ride | ER-99 recordings with sample playback, tune, tone and decay. These replace the previous synthetic cymbal approximations. |

The model keeps Afterglow's eleven lanes. In 808 mode the last two are Cymbal
and Cowbell. Old saved 808 Ride settings now play Cowbell. Congas, claves and
maracas are not exposed by this eleven-lane edition. User-sample mode remains
available on every lane.

## Research sources and selection

1. **Werner, Abel and Smith (DAFx 2014), 808 bass drum.**
   [Paper](https://pureadmin.qub.ac.uk/ws/portalfiles/portal/124500900/dafx14_kurt_james_werner_a_physically_informed_ci.pdf).
   Establishes the trigger, pulse shaper, bridged-T, feedback, tone and pitch
   behavior; explains why retained state and accent matter. The selected
   implementation follows the analysis but re-derives a behavioral resonator.
   It does not reproduce every published equation or component.
2. **Werner, Abel and Smith, 808 cymbal and cowbell research.**
   [Cymbal paper](https://pureadmin.qub.ac.uk/ws/portalfiles/portal/125044847/tr_808_cymbal_a_physically_informed_circuit_bendable_digital.pdf)
   and [Stanford dissertation](https://stacks.stanford.edu/file/druid:jy057cz8322/KurtJamesWernerDissertation-augmented.pdf)
   collects the circuit analysis behind shared oscillators, filtering and
   nonlinear envelope behavior. It is a research reference, not copied code.
3. **[Schwung 8W8](https://github.com/athousanddetails/schwung-8W8)**,
   pinned `6fa3f70d52c76f17d816581c668e3ab65b2cd395`, GPL-3.0 with
   MIT notices for Sonic Pi-derived legacy voices. Selected for its comprehensive
   portable voice models and documented assumptions. Its upstream comparisons
   include software-reference renders and hardware recordings; Afterglow has
   not independently reproduced those comparisons. Some constants are fitted.
4. **[Jatin Chowdhury's WaveDigitalFilters](https://github.com/jatinchowdhury18/WaveDigitalFilters)**
   and **[Simon-L's WDR-8](https://github.com/Simon-L/WDR-8-rack)**, GPL-3.0.
   Stronger component-oriented references for individual 808 subcircuits.
   WDR-8 documents an assembled snare calibrated against LTspice, with simplified
   VCA, idealized stages and a replacement high-pass filter. They were evaluated,
   not incorporated into this release; neither supplies a complete validated kit.
5. **[Roland TR-909 service notes](https://device.report/m/315fe45d8ab2ae2b17c9a7020a80f352d503601e1f54d4b19894cf1d4c256721)**.
   Primary circuit and digital-voice reference. In particular, original hat
   selection uses different ROM address regions, and playback includes envelope
   reconstruction. Merely adding a six-bit quantizer to a WAV does not recreate
   that path.
6. **[Schwung 9W9](https://github.com/athousanddetails/schwung-9W9)**,
   pinned `8e9aebde0c40a4c017f640e5c30a4f70936bb595`, GPL-3.0.
   Selected for its detailed analog voice structures. These remain parameterized
   virtual-analog models, with simplified nonlinearities and envelopes, rather
   than transistor-level simulation. Upstream fitting recordings are not bundled
   as a reproducible validation dataset.
7. **[ER-99 by Matthew Cieplak / Extralife](https://github.com/matthewcieplak/er-99)**,
   pinned `aac7a58056dff994177d1087e93764c1d27c0eef`, GPL-3.0 repository.
   Supplies the three cymbal WAVs. Source WAVs, SHA-256 hashes and conversion
   script are retained. Their upstream recording chain is not documented;
   these are not claimed to be licensed Roland ROM dumps. The single hat
   recording with separate envelopes is an approximation of the hardware path.
8. **[Electric Druid / Tom Wiltshire's 909 noise analysis](https://electricdruid.net/tr-909-noise-generator/)**.
   Explains the 31-stage shift register, taps 31 and 13, roughly 300 kHz clock
   and power-up behavior. This corrects the service manual's stage-count
   description and provides a concrete reference for the shared noise source.
9. **[Robin Whittle's modification documentation](https://www.firstpr.com.au/rwi/tr-909/TR-909-Sound-Mods.pdf)**.
   Useful engineering reference for separating original controls from circuit
   modifications. Network 909 and Colin Fraser's older pages are cited by
   upstream, but were unavailable during this research pass.

## Adaptation choices

- The 808 runs internally at 48 kHz because direct testing found significant
  sample-rate sensitivity in the upstream metal voices. Other host rates use
  rate conversion, with a fourth-order Butterworth low-pass on downsampling.
- The 909 uses an independently implemented 31-stage, taps 31/13 noise source
  clocked at 300 kHz. Bit-time integration approximates anti-alias filtering;
  this is not a simulation of the original analog reconstruction stage.
- Tune remains Afterglow's semitone control. On a stock 909 kick the physical
  Tune pot instead controls the sweep. Additional Tone and Decay controls on
  fixed-parameter hardware voices are musical extensions. Circuit controls take
  effect at the next trigger; mixer level, pan and drive remain live.
- The 808 metal source is genuinely shared. Tuning a hat, cymbal or cowbell on
  its next hit changes that bank, including another metal voice still ringing.
- Synthesized transients no longer pass through Afterglow's extra 3 ms fade-in.
  Circuit state is retained on same-model retriggers. Custom samples retain
  anti-click handling, and the final mixer retains a 3 Hz DC blocker.
- Mixer velocity, panning, drive and protective output bounds are Afterglow
  behavior. They are not a model of the original accent bus or output amplifier.
  The 808 additionally varies excitation voltage; the 909 still uses fixed
  excitation with output velocity scaling.

## What still prevents an exact-emulation claim

Independent hardware recordings across knob positions, accent levels and rapid
retrigger intervals have not been acquired and measured here. There is no
complete component-tolerance model, calibrated original output stage, exact
909 ROM/address/compander path, or oversampled solution for every nonlinearity.
Extreme tuning and drive can alias. Original drum machines also vary between
units, so a future comparison must identify the reference unit and settings.

The next fidelity gate is a repeatable dry reference set: individual hits at
minimum/middle/maximum controls, accented and unaccented hits, rapid repeated
hits, and hat-choke pairs. Compare pitch trajectories, decay envelopes, spectra
and transient shapes, then conduct level-matched listening. A modern Roland
emulation is a useful secondary reference, but cannot independently establish
equivalence to vintage hardware.

## LinnDrum-inspired sampled engine

LinnDrum is a sampled instrument, so this engine uses acoustic recordings rather
than synthesizing every hit. Its factory bank uses independently recorded CC0
material with documented attribution, processed into companded eight-bit PCM.
It does **not** contain original LinnDrum ROM data or claim the original sounds.
Tune changes playback rate; Tone and Decay are Afterglow extensions available on
every lane. The conversion is an approximation of a vintage companding character,
not an AM6070 DAC or original analog reconstruction-filter simulation.

Primary references include [Roger Linn’s FAQ](https://www.rogerlinndesign.com/about/roger-faq),
[his account of copied drum sounds](https://www.rogerlinndesign.com/more/lmdrum),
and [Tom Wiltshire’s variable-rate drum playback experiments](https://electricdruid.net/experiments-with-variable-rate-drum-sample-playback/).
Public GitHub collections including oramics/sampled and BushDrum were reviewed;
their downstream license labels did not establish original-recording provenance,
so those Linn recordings were not bundled. Exact selected files, hashes, licenses
and transformations are retained in `src/core/third_party/LinnDrum/PROVENANCE.md`.

## Perkons HD-01-inspired synthesis

The [official Erica Synths manual](https://www.ericasynths.lv/service/file/download/product_id/1167/file_id/521/)
describes fold, wavetable, complex, resonant, slap, Karplus and noise/metal
algorithm families across four voices. No verified open-source implementation
of the proprietary HD-01 engine was found during this research pass. Afterglow
therefore supplies original synthesis inspired by those families, expanded to its
eleven sequencer lanes:

| Lane | Afterglow interpretation |
| --- | --- |
| Kick / low tom | Folded oscillators with pitch envelopes |
| Snare | Resonant tones and filtered noise |
| Mid tom | Harmonic waveform morph |
| High tom | Complex FM percussion |
| Rim | Karplus-style excited delay |
| Clap | Multiple noise bursts and a short tone |
| Closed / open hats | Bandlimited pulse stack and noise |
| Crash / ride | Metallic noise and modulated tones |

FM ratios, waveform shapes, filters and envelopes are original design choices,
not recovered hardware equations. Tone is a timbre/filter macro; tune and decay
remain shared Afterglow controls. Two internal samples per host frame and a
low-pass decimator reduce aliasing but do not eliminate it. No firmware, factory
wavetables or samples are copied. HD-01’s four-channel algorithm/mode controls,
analog output path, compressor and BBD-style effect are not recreated.

## Engine selection and randomization

Each lane can select 909, 808, Linn-inspired, Perkons-inspired or a custom sample.
RANDOMIZE ALL DRUMS draws only from the checked built-in engines, independently
for each lane. The pool is saved with the kit; older kits default to all four.
An empty pool disables that action. RANDOMIZE SOUND varies the selected built-in
voice without changing its engine. Row RND still changes only that lane’s pattern.
UNDO RANDOM restores the preceding randomization.

## Verification and source

Automated tests exercise the actual C++ and WebAssembly engines. The earlier
808/909 validation covered all 22
model/voice combinations, multiple sample rates, extreme controls, repeated
hits, choke, reset, independent instances, custom stereo samples, exports and
UI state. That earlier regression run passed 29/29 tests; the native DSP suite also
passed. ASan/UBSan stress checks passed (LeakSan disabled). On this server, the
actual WASM engine rendered 6.8–14.2 times faster than real time under an
all-voice stress pattern; p95 128-frame callbacks were 0.153–0.245 ms. Scheduler
outliers still occurred, so this is compute headroom, not an xrun guarantee.
These checks establish software behavior and numerical stability, not hardware
identity. Actual browser/device and Ableton listening tests remain
outside this environment.

The four-family expansion passed **34/34 regression tests**: all 44 built-in
model/voice combinations at 44.1/48/96 kHz, extreme controls, retriggers, mixed
model tails, reset, hat choke, saved engine-pool selection, undo, and the actual
rebuilt WebAssembly. Both new adapters also passed standalone ASan/UBSan stress
checks at 8–384 kHz (LeakSanitizer disabled). Native core tests and JUCE processor/
editor syntax checks passed; no new Windows runtime/Ableton session was tested.

Actual WASM all-voice Perkons stress rendering on this server reached 3.70–7.25x
real time across 44.1/48/96 kHz; mixed kits reached 6.70–12.46x. Their p95
128-frame render times were 0.429–0.473 ms and 0.242–0.285 ms respectively.
Scheduling outliers exceeded the 96 kHz callback budget, so these measurements
are compute headroom, not a browser/mobile dropout guarantee. Device listening
and visual browser QA remain unverified in this environment.

[Complete source](https://github.com/sbrunwas/afterglow/tree/main/web).
Vendored source retains its licenses and pinned provenance under
`src/core/third_party/`. Authored application code is AGPL-3.0-only;
GPL-3.0 components and MIT notices are retained separately. See
[GPL text](Schwung-GPL-LICENSE.txt), [application license](LICENSE.txt) and
[notices](NOTICE.txt). Not affiliated with or endorsed by Roland, Roger Linn or Erica Synths.
