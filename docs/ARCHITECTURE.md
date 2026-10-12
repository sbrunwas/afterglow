# Afterglow architecture

Afterglow is a C++17 instrument built with JUCE, targeting Windows x64 VST3 and a standalone application. Its interface takes inspiration from classic hardware step programming and ReBirth's immediacy; it does not use ReBirth code, graphics, or sound assets.

## Design

The audio engine is separate from the editor. Eleven drum lanes share a bank of 16 patterns, each with capacity for 64 steps. The processor owns the engine, sequencer, automation parameters, pattern state, and imported audio. Closing the editor must not stop playback or destroy sound state.

JUCE's AudioProcessorValueTreeState exposes continuous and choice parameters to the host. Pattern data and sample payloads belong to the plugin's serialized state. Samples are embedded so an Ableton project can recall its sounds without relying solely on the original import path.

The output layout is one stereo master with eleven optional stereo instrument buses. The master provides immediate playback on an ordinary MIDI track; auxiliary buses support separate mixing and effects in the host. Bus enablement is a host decision, and disabled outputs must never be indexed as if they had active channels.

## Timing

Host synchronization derives musical position from the host playhead and advances the sequencer at sample resolution inside each process block. MIDI note events retain their sample offsets. Swing shifts alternate subdivisions rather than changing the overall pattern duration. Transport starts, stops, loops, and seeks must resynchronize from musical position rather than allowing an independent wall-clock timer to drift.

The standalone transport supplies its own musical clock. A stopped sequencer does not prevent MIDI audition. Envelope tails may continue after a sequencer stop; an explicit panic must clear active voices.

## Sound engines and fidelity

The default sound family is 909-inspired, with an alternate 808-inspired family and user-sample playback. The synthesis foundations use the MIT-licensed DaisySP ports of Émilie Gillet's Mutable Instruments Plaits drum models where appropriate. The upstream synthetic snare incorporates selected 909 schematic relationships; its synthetic kick is described upstream as “909-ish.” The analog bass drum is an 808-inspired resonator model.

These are musical digital models, not a claim of component-for-component circuit simulation or a measured match to an original unit. The original 909 used samples for its hi-hats and cymbals. Procedural substitutes cannot reproduce those exact recordings. No Roland ROM content or commercial sample library is bundled. Importing suitable recordings is the route to using a particular unit's sampled cymbal sound.

The remaining percussion voices use original synthesis. Accent, tuning, decay, and timbre controls intentionally permit sounds beyond vintage hardware ranges. Tests can establish timing and numerical stability; they cannot establish authenticity without reference recordings, controlled parameter comparisons, and listening evaluation.

## Audio-thread rules

- Decode audio and perform filesystem work outside the render callback.
- Preallocate render-time storage; avoid locks, allocation, and object destruction with unbounded cost on the audio thread.
- Publish UI changes through atomics or bounded messages; never call editor components from the callback.
- Protect sample ownership through handoff and retirement so replacing a sample does not invalidate a playing voice.
- Clamp restored values and validate imported audio before it reaches DSP.
- Keep parameter identifiers stable for saved sessions and host automation.

## Reproducibility and validation

JUCE is pinned to version 8.0.6, commit `51a8a6d7aeae7326956d747737ccf1575e61e209`. The project uses JUCE's AGPLv3 licensing route. Third-party source notices remain with vendored DSP sources; see [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md).

Validation should cover varied sample rates and block sizes; silent and dense patterns; finite bounded output; MIDI offsets; swing and pattern rollover; transport discontinuities; sample replacement; save/restore; and optional output buses. Building a VST3 is distinct from testing it inside Ableton Live on Windows. Release notes must identify which validations were actually run and which remain host checks.
