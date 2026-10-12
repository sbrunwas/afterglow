# Sequencer behavior

Afterglow stores 16 patterns, each with 11 instruments and up to 64 sixteenth-note steps. Each pattern has its own length of 1–64 steps. Song mode reads a chain of up to 64 pattern references, plays each pattern for its individual length, and repeats the chain. Pattern mode repeats the selected pattern.

## Timing and transport

The sequencer follows absolute quarter-note position (PPQ), rather than counting audio blocks. Every callback sample supplies its current PPQ and PPQ increment. An event is delivered on the first sample at or after its musical boundary, so timing precision is one sample. Changing the audio block size does not change the pattern.

Starting or seeking exactly onto a hit boundary plays that hit. Starting between boundaries does not replay the earlier hit; playback waits for the next scheduled event. For a ratcheted step, that may be the next ratchet subdivision rather than the next full step. Stopping clears the displayed step. A transport loop jump to a pattern boundary triggers its first hit again. Forward seeks skip intervening events.

Replacing an immutable sequence snapshot during playback preserves the previous sample position. This prevents live edits or sample loading from dropping a hit that falls between the last sample of one audio block and the first sample of the next. An explicit `reset()` restarts transport tracking. The data owner must keep each snapshot alive and immutable while the audio callback uses it.

## Swing, ratchets, and probability

Swing delays odd-numbered steps (counting from zero) by 0–66% of a sixteenth note. Even steps retain their grid positions. Swing restarts at the beginning of every pattern, including patterns with odd lengths. Pattern duration never changes.

Each enabled step can have 1–4 ratchets. They divide the actual swung duration of that step evenly, including the shortened final step of an odd-length pattern. Ratchets retain the step's velocity.

Probability applies once per step occurrence, so either all its ratchets play or none do. Selection is a deterministic hash of the loop/chain cycle, pattern, instrument, and step. Replaying the same absolute PPQ produces the same result. Different cycles can produce different results. Repeated references to the same pattern within one song-chain cycle share the same probability decision. Probability zero never triggers; probability one always triggers.

## Instrument order

| Index | Instrument |
|---:|---|
| 0 | Kick |
| 1 | Snare |
| 2 | Low tom |
| 3 | Mid tom |
| 4 | High tom |
| 5 | Rim |
| 6 | Clap |
| 7 | Closed hi-hat |
| 8 | Open hi-hat |
| 9 | Crash |
| 10 | Ride |

## Verification

`tests/sequencer_tests.cpp` checks 44.1/48/96 kHz operation at several tempos, variable audio block sizes, mid-step starts, loop restarts and forward seeks, swung boundaries, ratchet spacing, odd and variable-length song patterns, deterministic probability, snapshot changes, and absence of allocations during processing. It compiles independently of the plug-in SDK:

```sh
g++ -std=c++17 -O2 -I Source Source/Sequencer.cpp tests/sequencer_tests.cpp -o sequencer_tests
./sequencer_tests
```
