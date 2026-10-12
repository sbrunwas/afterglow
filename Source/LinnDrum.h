// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include <algorithm>
#include <cmath>
#include "third_party/LinnDrum/PcmData.h"

namespace ag {
// Linn-inspired PCM: independent CC0 acoustic recordings, companded to 8 bits.
// This is NOT LinnDrum ROM playback, an AM6070 clone, or hardware emulation.
// The fixed captures and variable playback speed give an early-sampler feel.
class LinnDrum {
public:
    void prepare(double rate) {
        sampleRate = std::isfinite(rate) ? std::clamp(rate, 8000.0, 384000.0) : 48000.0;
        // Analytic mu=255 expansion. The original chip uses a segmented law;
        // this codec deliberately does not claim bit-compatible ROM decoding.
        for (int i = 0; i < 256; ++i) {
            const float mag = float((std::pow(256.0, (i & 127) / 127.0) - 1) / 255);
            decode[i] = (i & 128) ? -mag : mag;
        }
        reset();
    }
    void reset() { for (auto& voice : voices) voice = {}; }
    // Tune: semitones. Decay/tone: normalized, trigger-applied extensions.
    // Velocity amplitude belongs to DrumEngine's mixer and is not added here.
    void trigger(int lane, float tune, float decay, float tone, float velocity) {
        if (lane < 0 || lane >= 11 || !std::isfinite(velocity) || velocity <= 0) return;
        auto& v = voices[lane];
        const float previous = v.last;
        v = {};
        v.active = true;
        v.step = linn_pcm::rate / sampleRate * std::exp2(safe(tune, -24, 24, 0) / 12);
        constexpr float tails[] = { .7f, .8f, 1.2f, 1.f, .8f, .35f, .65f, .18f, 1.f, 3.f, 1.8f };
        const float seconds = tails[lane] * std::exp2(4 * (safe(decay, 0, 1, .5f) - .5f));
        v.envelope = 1;
        v.envelopeStep = float(std::exp(std::log(.001) / (seconds * sampleRate)));
        const double cutoff = std::min(sampleRate * .45, 900.0 + 15000.0 * safe(tone, 0, 1, .5f));
        v.filter = float(1 - std::exp(-6.283185307179586 * cutoff / sampleRate));
        v.oldTail = previous;
        v.crossfade = std::max(1, int(sampleRate * .002));
        v.crossfadeLength = v.crossfade;
        // One hi-hat instrument: both articulations choke its previous state.
        if (lane == 7 || lane == 8) {
            auto& other = voices[lane == 7 ? 8 : 7];
            other.chokeFrames = std::max(1, int(sampleRate * .003));
            other.chokeLength = other.chokeFrames;
        }
    }
    void renderFrame(float out[11]) {
        if (!out) return;
        for (int i = 0; i < 11; ++i) {
            auto& v = voices[i];
            out[i] = 0;
            if (!v.active) continue;
            const auto& sample = linn_pcm::bank[i];
            if (v.position >= sample.frames - 1 || v.envelope < 1e-7f) { v = {}; continue; }
            const int index = int(v.position);
            const float fract = float(v.position - index);
            const float a = decode[sample.data[index]], b = decode[sample.data[index + 1]];
            // Linear interpolation is an engineering compromise, not a modeled
            // variable-clock DAC. The lowpass below colours reconstruction.
            float x = (a + (b - a) * fract) * v.envelope * .75f;
            v.position += v.step;
            v.envelope *= v.envelopeStep;
            v.lp1 += v.filter * (x - v.lp1);
            v.lp2 += v.filter * (v.lp1 - v.lp2);
            x = v.lp2;
            if (v.crossfade > 0) {
                x += v.oldTail * float(v.crossfade) / float(v.crossfadeLength);
                --v.crossfade;
            }
            if (v.chokeFrames > 0) {
                x *= float(v.chokeFrames) / float(v.chokeLength);
                if (--v.chokeFrames == 0) v.active = false;
            }
            v.last = std::isfinite(x) ? std::clamp(x, -2.f, 2.f) : 0;
            out[i] = v.last;
        }
    }
private:
    static float safe(float x, float lo, float hi, float fallback) {
        return std::isfinite(x) ? std::clamp(x, lo, hi) : fallback;
    }
    struct Voice {
        double position = 0, step = 1;
        float envelope = 0, envelopeStep = 0, filter = 0;
        float lp1 = 0, lp2 = 0, last = 0, oldTail = 0;
        int crossfade = 0, crossfadeLength = 1, chokeFrames = 0, chokeLength = 1;
        bool active = false;
    } voices[11];
    float decode[256]{};
    double sampleRate = 48000;
};
}
