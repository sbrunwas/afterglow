# Sound engine

Afterglow has eleven independently triggered voices: kick, snare, low/mid/high tom,
rim, clap, closed/open hat, crash and ride. The default model is Nine; each voice
can instead use Eight or an imported stereo/mono sample. This is an instrument
inspired by the TR-909 and TR-808, **not a circuit-exact or measured emulation**.

Kick and snare build on the MIT-licensed DaisySP ports of Émilie Gillet's Plaits
models. Nine uses the synthetic bass/snare models, including snare mode ratio and
noise coloration motivated by 909 circuitry. Eight uses analog bass/snare models.
The Eight kick resonance mapping is adapted to DaisySP's normalized Chamberlin SVF
so the decay control actually produces a ringing bass drum. Original source,
license and exact revision are preserved under `Source/third_party/DaisySP`.
Local fixes also initialize the synthetic kick transient state, make the snare
alternation flag instance-local, and replace shared C RNG state with private PRNGs.

Toms use pitched oscillators with an exponentially falling pitch, a second mode,
and a noise attack. Rim uses two short resonant tones. Clap uses three bursts of
band-limited noise followed by a diffuse tail. Eight hats use six inharmonically
related square oscillators with polyBLEP edge correction and two high-pass stages
to suppress their fundamentals and expose the metallic upper partials. Nine cymbals use a synthetic metal/noise approximation:
**the original TR-909 cymbals used recordings; no Roland ROM recordings are bundled**.
Neither cymbal model is a calibrated recreation. PolyBLEP reduces aliasing in Eight
square oscillators but does not eliminate it; Nine oscillators are not fully
bandlimited, so extreme tuning can alias. Crash/ride remain synthesis approximations
in both models. User samples offer an alternative sound source without restricting
users to bundled recordings.

Samples use stereo linear interpolation, a ±24 semitone playback rate, source-rate
conversion, trim endpoints, reverse and one-shot playback. The output-rate edge fade
and retrigger tail suppress boundary clicks. Closed hat chokes open hat, including
sample mode. Level, mute, solo and equal-power pan changes are smoothed. Drive uses
soft saturation; independent stereo DC blockers and finite bounds protect output.
Sample values are checked before entering filter state. Parameter range checks also
reject NaN/Inf. Linear interpolation is not a high-quality antialiasing resampler;
large upward pitch shifts can alias.

`prepare`, `reset`, `setParams`, `setSample`, `trigger`, `renderFrame` are the engine
API. Tune is semitones; decay/tone/drive/trim are normalized; level is 0–2; pan is
−1–1. Parameters determining excitation are sampled at trigger time. Render writes
11 independent stereo voice outputs without allocating. Immutable `SampleData`
pointers are externally owned and must remain alive while installed; all mutations
of engine state must happen on the audio thread or while processing is suspended.
A sample replacement stops the previous playback with a short retained output fade.
Reset stops voices and preserves settings/sample assignments. No global DSP state is
shared between plugin instances. Numerical and behavior tests do not establish
acoustic authenticity; no hardware A/B validation has been performed.
