# Schwung 8W8 DSP subset

Source: https://github.com/athousanddetails/schwung-8W8
Pinned commit: `6fa3f70d52c76f17d816581c668e3ab65b2cd395`

The eight `w8_*.h` headers are copied unchanged from `src/dsp/`.
See LICENSE (GPL-3.0) and THIRD_PARTY.md (MIT notice for w8_voices.h,
including the Sonic Pi-derived rim shot). The surrounding Afterglow adapter
is separate from these upstream files. No samples or commercial plugin audio
are included. Upstream's reference renders and listening claims do not amount
to independent hardware validation of this integration.

## Integration and fidelity limits

`Circuit808.h` adapts kick, snare, three toms, rim, clap, both hats,
cymbal, and cowbell. The model uses resonators, trigger shaping, and the
shared six-oscillator metal bank; it is not a full transistor solver.
The rim is the MIT Sonic Pi-derived synthesis voice. The 808 has no ride
voice; Afterglow's cymbal lane plays the 808 cymbal model in this mode.

Controls are sampled on each strike. Kick Tone and snare Tone control their
modeled output filtering and shell balance respectively. Snappy remains at
centre. On the other voices, Tone adds an Afterglow output tilt, neutral
at centre; those are not original hardware tone controls. Tune and additional
decay controls are musical extensions. Tuning any metal voice retunes the
shared oscillator bank, affecting sounding metal tails. Closed hat chokes
open hat. Resonator state is preserved on retrigger.

Velocity modulates trigger voltage in kick/snare/toms/cowbell. The adapter
cancels its nominal linear gain (14/volts) so that Afterglow's mixer applies
the velocity amplitude once, while nonlinear strike differences remain.
Hats/cymbal use fixed trigger voltage and the mixer's velocity gain.

The upstream metal model was strongly sample-rate-dependent in our smoke
probe. This adapter therefore runs it at 48 kHz, directly at a 48 kHz host,
and uses causal linear interpolation at other host rates, plus a fourth-order
Butterworth anti-alias filter below 48 kHz. The converted path has roughly
one internal sample of interpolation delay plus downsampling filter phase;
it is not an ideal resampler and high-frequency differences remain.
The free-running source advances even when the drum outputs are silent.
The adapter is allocation-free during trigger/render. Individual output
safety bounds are +/-4 and are not reached by the default isolated strikes.

Primary model references used by upstream:

- Werner, Abel, Smith (DAFx 2014), bass drum:
  https://www.dafx.de/paper-archive/2014/dafx14_kurt_james_werner_a_physically_informed%2C_ci.pdf
- Werner, Abel, Smith (ICMC/SMC 2014), cymbal:
  https://pureadmin.qub.ac.uk/ws/portalfiles/portal/125044847/tr_808_cymbal_a_physically_informed_circuit_bendable_digital.pdf

The paper models include idealizations and SPICE comparisons. Upstream also
uses listening and fitting to reference recordings. None establishes an
independent perceptual or hardware accuracy benchmark for Afterglow.
