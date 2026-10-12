# ER-99 cymbal recordings

Source: https://github.com/matthewcieplak/er-99

Pinned commit: `aac7a58056dff994177d1087e93764c1d27c0eef`.

Author/project: Matthew Cieplak (Extralife), ER-99. The upstream repository
publishes the application and its bundled samples under GPL-3.0; LICENSE is
copied alongside the assets. Upstream describes hats, crash and ride as sampled
audio but does not document the recording chain or identify these as original
Roland ROM dumps. Afterglow therefore makes neither claim.

Original source WAVs retained unchanged:

| File | SHA-256 |
| --- | --- |
| hh.wav | 8ae963e80b8604bf23733545117d3b115767aa48ecd3013ad5d91506337d289a |
| crash.wav | 4a1b8d8828f9e530e9ae7f1a3cdffbcb1466e633a2b0607b3aac914699bc8400 |
| ride.wav | f1d1cee24a7c91bb2ca9c6eb97badad3841226897ad0daabfc35801371d78182 |

`scripts/embed-cymbals.py` reads these mono 44.1 kHz WAV files and generates
`CymbalData.h`. It retains 16-bit samples directly and truncates the hat's
24-bit PCM to signed 16-bit PCM. No normalization, sample-rate conversion or
further bit crushing is applied to the tables. `Sampled909.h` adds playback-rate
tuning, linear interpolation, a tone low-pass and a decay envelope. These are
Afterglow controls, not an emulation of the original DAC and reconstruction
filter. Applying another 6-bit quantizer to an already recorded output would
not establish authenticity.
