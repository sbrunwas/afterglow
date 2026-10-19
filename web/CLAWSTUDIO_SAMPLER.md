# ClawStudio v0.12 — Sampler & Mixer-to-Rack

ClawStudio now includes **SAMPLER-01**, an independent four-reel Rack instrument. The existing mixer SAMPLER channel is no longer silent: imported/captured reels play into its normal channel input, EQ, filter, sends, deck group and master recorder.

## Performance workflow
1. Start **JAM**, open **Rack → SAMPLER / TAPE**.
2. Choose **RECORD FROM** (post-fader Drum Machine, Mono, Poly, Texture, Acid, Sampler, external input, Deck A/B, or Master).
3. Select 1/2/4/8 bars and **CAPTURE TO SLOT**. While transport plays, recording begins at the next bar. Allow a bar of lead-in before the recording ends.
4. Select one of four reels. Click **PLAY SLOT**; multiple reels can layer, with a shared mixer SAMPLER channel. Double-click a reel to toggle its playback.
5. Change pitch, filter, saturation, tape wear, wow/flutter, start/end, reverse or loop. **BOUNCE / REPRINT** records the Sampler channel into another slot; the generation counter increments.
6. **EXPORT WAV** to retain the captured audio. Recording is stored in RAM only; audio is not uploaded to a server. Raw samples are not yet included in session/scene persistence.

On the **Desk**, **double-click any instrument strip** (away from control knobs/buttons) to open the matching Rack instrument. The small **↗** button in each strip header also opens it and is recommended for touch devices. **EXT IN** opens the Desk's I/O section instead.

## Engineering notes
- Original Web Audio DSP, not hardware emulation.
- Recording uses deprecated but broadly supported ScriptProcessorNode PCM capture, with no lossy codec. Replace with AudioWorklet-based capture after validation across browsers.
- Capture sources are the actual Web Audio instrument/mixer nodes, not offline renders.
- Trimming currently changes the next playback start; to hear updated trims, stop and restart the reel.
- Four sample buffers are memory-resident and should be exported before closing the tab.
- External audio depends on browser input permissions and connected hardware.
- Hard maximum per capture is 60 seconds; import limit 60 seconds / 45 MB.
- Master resampling includes the current Sampler output, allowing destructive new generations. Use mixer levels carefully to avoid clipping.
- Native analog CV output is not yet supported.

## Verification
- Chromium standalone audio test: captured 2s, played, reversed, reprinted to Reel B at generation 1; no JS exceptions.
- Integrated UI test: all 7 strips, Rack navigation, header OPEN and dblclick navigation pass.
- Integrated Web Audio test: synced JAM captured real Mono mixer output for one bar (1.90 s), played in Sampler, no JS exceptions.
- Browser screenshots at desktop and phone sizes. Actual iPhone Safari audio capture remains unverified.
