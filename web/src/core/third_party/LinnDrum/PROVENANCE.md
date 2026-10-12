# Linn-inspired PCM bank

This is a new bank made from independent CC0 acoustic drum recordings.
**No LinnDrum, LM-1, or other proprietary ROM recordings are included.**
It evokes early sampled drum machines without claiming to reproduce the
original LinnDrum's sounds, circuits, exact DAC law, or clock rates.
The recommended UI name is **Linn-inspired PCM**.

## Sources

Nine recordings are taken unchanged from `samples/` in
https://github.com/samblenny/web-midi-drumkit at commit
`9a23295cb7f3f4611a69acd8e963ea6364658b5f`.
That project redistributed the CC0 recordings from Sonic Pi, which preserves
original Freesound recordist links. The original recordists are **Zajo**
(kick) and **menegass** (Guigui acoustic drum kit, other eight recordings).
`SonicPi-SOURCES.md` preserves the source URLs; `SonicPi-LICENSE.md` preserves
the CC0 statement. The source documentation is MIT and its separate notice
is preserved in `SonicPi-Documentation-MIT.txt`.

Two recordings are from **Versilian Studios LLC, VCSL**:
https://github.com/sgossner/VCSL at commit
`c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e`.

- `sources/clap.wav`: `Idiophones/Struck Idiophones/Claps/Clap_rr1.wav`
- `sources/rim.wav`: `Membranophones/Struck Membranophones/Legacy Snares/OldSnare/snare_rim.wav`

`VCSL-CC0.txt` is the original license, and `VCSL-README.md` preserves the
producer's explicit permission to use these samples in commercial software.
All eleven original files are preserved under `sources/`, with checksums in
`manifest.json`. The generated derivatives remain CC0. Original Afterglow
adapter and generator code are AGPL-3.0-only.

The cymbal names inherited from Sonic Pi are potentially confusing:
`drum_splash_hard` is described by its original recordist as **Crash hard**;
`drum_cymbal_soft` is described as **Ride soft**. These supply the actual
crash and ride lanes, respectively.

## Reproducible processing

Run `python3 generate.py` here, with FFmpeg installed. The script downmixes to
mono, highpasses at 25 Hz, resamples to 35 kHz, trims onset silence and long
tails, normalizes each capture to 0.9, adds an 8 ms tail fade, and encodes
signed-magnitude 8-bit analytic mu=255 companding. It writes `PcmData.h` and
`manifest.json`. There are 283,963 encoded sample bytes. Source and generated
checksums support attribution/reproduction; PCM output can vary slightly
with FFmpeg versions.

35 kHz and companding are stylistic choices informed by early drum samplers.
This is **not** the original AM6070 segmented code format. Runtime uses linear
interpolation, a two-pole lowpass, a decay envelope, and 2 ms retrigger blending.
The original LinnDrum offered tuning on only some voices; all-lane Tune,
Decay and Tone here are Afterglow extensions. Decay changes attenuation and
cannot extend audio beyond each captured sample. Closed/open hats share a
3 ms choke group. Velocity gain is applied once by the main mixer.

## Research and scope

Roger Linn identifies the 1982 LinnDrum as a successor to the LM-1, including
crash and ride cymbals. He notes that he never made a product named LM-2:
https://www.rogerlinndesign.com/about/roger-faq

AM6070 primary data book:
https://www.bitsavers.org/components/amd/_dataBooks/1979_AMD_Linear_and_Interface_Data_Book.pdf

The widely mirrored Hyperreal LinnDrum recordings were considered but not
included: downstream CC0/public-domain labels did not establish the original
recordings' rights chain. Our choice uses recordist-attributed acoustic
material instead. No acoustic or perceptual match to a real LinnDrum has
been measured or claimed.
