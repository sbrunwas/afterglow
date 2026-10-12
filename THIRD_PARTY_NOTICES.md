# Third-party notices

Afterglow's original code is distributed under AGPL-3.0; see `LICENSE`. Third-party code retains its original copyright and license notices. This document is an index, not a replacement for those licenses.

## JUCE

- Project: https://github.com/juce-framework/JUCE
- Version: 8.0.6
- Commit: `51a8a6d7aeae7326956d747737ccf1575e61e209`
- License selected for this project: GNU Affero General Public License, version 3.
- Upstream license: https://github.com/juce-framework/JUCE/blob/51a8a6d7aeae7326956d747737ccf1575e61e209/LICENSE.md

JUCE framework modules are dual-licensed under AGPLv3 and the commercial JUCE license. This project uses the open-source route. JUCE includes further dependencies with their own notices; the pinned JUCE source and its `LICENSE.md` identify the full inventory. Relevant compiled components can include image codecs, compression, font shaping, audio codecs, and platform wrappers. Preserve those notices when distributing source or binaries.

The VST3 SDK bundled with this JUCE version is copyright (c) 2024 Steinberg Media Technologies GmbH and is offered under GPLv3 or the proprietary Steinberg VST3 license. This project uses its GPLv3 route. The SDK's license is at `modules/juce_audio_processors/format_types/VST3_SDK/LICENSE.txt` in the pinned JUCE source. This refers to the bundled SDK version, not the license of a newer standalone SDK release.

## DaisySP and Mutable Instruments

- Project: https://github.com/daisyaudio/DaisySP (formerly `electro-smith/DaisySP`).
- Upstream commit: `2c72eaf9eac5fc0dca1919d65d606da907832618`.
- License: MIT for the selected DSP sources.
- Authors include Electrosmith, Corp, Émilie Gillet, and contributors identified in individual source files.
- Drum models were ported by Ben Sergentanis from Émilie Gillet's Mutable Instruments Plaits DSP.
- Original project: https://github.com/pichenettes/eurorack

The vendored subset in `Source/third_party/DaisySP` contains `Drums/{analogbassdrum,analogsnaredrum,synthbassdrum,synthsnaredrum}.{cpp,h}`, `Filters/svf.{cpp,h}`, `Synthesis/oscillator.h`, and `Utility/dsp.h`. Its complete [LICENSE](Source/third_party/DaisySP/LICENSE) preserves Electrosmith, Plaits/Émilie Gillet, and Soundpipe/Paul Batchelor notices. DaisySP's separately licensed LGPL module is not included.

Packaged Windows downloads also place the DaisySP and JUCE notices under `licenses/`. Their bundled source archives contain the complete project and pinned JUCE source, including additional codec, font, and VST3 SDK notices.

Local modifications initialize the synthetic kick's transient envelope state, move synthetic snare alternating state from global storage into each instance, and replace shared `rand()` usage in drum voices with per-instance xorshift generators. These changes provide deterministic initialization and avoid interference between plugin instances. The analog bass drum's normalized resonator damping was adapted to a decay-controlled ring time (`0.045 + 1.8 * decayControl²` seconds), and its SVF drive was reduced to 0.01; this is an Afterglow-specific tuning change, not an upstream model or hardware-fidelity claim. The vendored source license and attribution comments remain authoritative for each file.

## Circuit engine update

- Schwung 8W8: https://github.com/athousanddetails/schwung-8W8, commit `6fa3f70d52c76f17d816581c668e3ab65b2cd395`, GPL-3.0. Source/third_party/Schwung808 retains GPL and Sonic Pi MIT notices.
- Schwung 9W9: https://github.com/athousanddetails/schwung-9W9, commit `8e9aebde0c40a4c017f640e5c30a4f70936bb595`, GPL-3.0. Source/third_party/Schwung909 retains the license and provenance.
- ER-99, Matthew Cieplak / Extralife: https://github.com/matthewcieplak/er-99, commit `aac7a58056dff994177d1087e93764c1d27c0eef`, GPL-3.0 repository. Source/third_party/ER99 retains unchanged cymbal WAV sources, license, hashes and generated PCM. These are not claimed to be original Roland ROM dumps; upstream recording-chain provenance is undocumented.

Adapters are Afterglow AGPL-3.0-only code. Source headers remain unchanged; rate conversion, mixer integration, and the independently implemented 909 noise generator are documented in web/dist/ENGINE-NOTES.md. The legacy DaisySP subset remains in source but the updated DrumEngine uses the new circuit adapters.

## Names and assets

Roland, TR-808, and TR-909 identify historical instruments and are trademarks of their respective owner. ReBirth identifies the historical Propellerhead product. VST is a trademark of Steinberg Media Technologies GmbH. Ableton Live is a product of Ableton. Afterglow is an independent project, with no affiliation or endorsement implied.

No ReBirth assets or third-party commercial sound libraries are included. The 909 cymbals use the documented ER-99 recordings; other factory voices use the documented DSP models or the independently recorded CC0 acoustic bank below.

## Linn-inspired PCM and Perkons-inspired synthesis

The Linn-inspired bank uses independent CC0 acoustic recordings, not original Linn ROMs. Source files, original attribution, pinned upstreams, licenses, hashes and the reproducible companding conversion are in `Source/third_party/LinnDrum/`. See its `PROVENANCE.md` and `manifest.json`. Sonic Pi attribution documentation retains its MIT license.

Perkons-inspired synthesis is original Afterglow AGPL-3.0-only code based on published algorithm-family descriptions. No Erica Synths firmware, factory wavetables or samples are included. Neither new model is claimed to match hardware exactly. Afterglow is unaffiliated with Roger Linn or Erica Synths.
