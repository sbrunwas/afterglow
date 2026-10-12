// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include <algorithm>
#include <cmath>
#include "third_party/Schwung808/w8_bd_circuit.h"
#include "third_party/Schwung808/w8_sd_circuit.h"
#include "third_party/Schwung808/w8_tom_circuit.h"
#include "third_party/Schwung808/w8_cp_circuit.h"
#include "third_party/Schwung808/w8_mt_circuit.h"
#include "third_party/Schwung808/w8_voices.h"

namespace ag {
// Circuit-informed 808 reconstruction; the rim is a Sonic Pi-derived model.
// It is not a component-exact emulator or independently hardware-validated.
// Each metal voice reads ONE continuously running six-oscillator source.
class Circuit808 {
public:
    Circuit808() = default;
    Circuit808(const Circuit808&) = delete;
    Circuit808& operator=(const Circuit808&) = delete;
    Circuit808(Circuit808&&) = delete;
    Circuit808& operator=(Circuit808&&) = delete;
    void prepare(double rate) {
        hostRate = std::isfinite(rate) ? std::clamp(rate, 8000.0, 384000.0) : 48000.0;
        reset();
    }
    void reset() {
        bass = {}; snare = {}; clap = {}; rim = {}; bank = {};
        closed = {}; open = {}; cymbal = {}; bell = {};
        bass.init(sampleRate); snare.init(sampleRate); clap.init(sampleRate);
        rim.init(sampleRate);
        for (auto& t : tom) { t = {}; t.init(sampleRate, 0); }
        bank.init(sampleRate);
        closed.init(sampleRate, &bank, 0); open.init(sampleRate, &bank, 1);
        cymbal.init(sampleRate, &bank); bell.init(sampleRate, &bank);
        for (int i = 0; i < 11; ++i) { tilt[i] = 0; low[i] = 0; accentGain[i] = 1; }
        lowCoefficient = float(1 - std::exp(-6.283185307179586 * 3500 / sampleRate));
        phase = 0;
        for (int i = 0; i < 11; ++i) {
            previous[i] = current[i] = 0;
            for (auto& section : downZ1) section[i] = 0;
            for (auto& section : downZ2) section[i] = 0;
        }
        // Fourth-order Butterworth anti-alias filter for sub-48k hosts.
        const double w = 6.283185307179586 * std::min(hostRate * .45, 21600.0) / sampleRate;
        const double cosine = std::cos(w), sine = std::sin(w);
        constexpr double q[] = { .541196100146197, 1.306562964876377 };
        for (int k = 0; k < 2; ++k) {
            const double a0 = 1 + sine / (2 * q[k]);
            filterB0[k] = (1 - cosine) / (2 * a0);
            filterA1[k] = -2 * cosine / a0;
            filterA2[k] = (1 - sine / (2 * q[k])) / a0;
        }
    }
    // tune is semitones; decay and tone are normalized. Only kick and snare
    // have modeled hardware Tone controls. Other lanes use a neutral-centred
    // output tilt extension. Snappy is fixed at centre. Extra decay controls
    // on fixed-decay hardware voices are explicitly musical extensions.
    // Tuning ANY metal lane changes the shared bank, including ringing tails.
    void trigger(int lane, float tuneValue, float decayValue, float toneValue, float velocity) {
        if (lane < 0 || lane >= 11 || !std::isfinite(velocity) || velocity <= 0) return;
        const float tune = safe(tuneValue, -24, 24, 0);
        const float ratio = std::exp2(tune / 12);
        const float decay = safe(decayValue, 0, 1, .5f);
        const float tone = safe(toneValue, 0, 1, .5f);
        const float volts = 4 + 10 * std::clamp(velocity, 0.f, 1.f);
        // Cancel the linear part of voltage gain. The mixer applies velocity
        // once; accent voltage still changes nonlinear strike behaviour.
        accentGain[lane] = (lane <= 4 || lane == 10) ? 14 / volts : 1;
        tilt[lane] = lane < 2 ? 0 : 2 * tone - 1;
        if (lane == 0) bass.trigger(49.5 * ratio, decay, tone, .5f, volts);
        else if (lane == 1) snare.trigger(ratio, decay, tone, .5f, volts);
        else if (lane <= 4) {
            constexpr float base[] = {92.6f, 135.3f, 183.f};
            tom[lane - 2].trigger(base[lane - 2] * ratio, .08f + 1.04f * decay, volts);
        } else if (lane == 5) {
            rim.trigger(0, 440 * std::exp2((91.62 + tune - 69) / 12),
                        (.018f + .104f * decay) * 9.12f,
                        std::min(sampleRate * .45, 440 * std::exp2((63.0 + tune - 69) / 12)),
                        std::min(sampleRate * .45, 440 * std::exp2((118.0 + tune - 69) / 12)));
        } else if (lane == 6) clap.trigger(ratio, std::exp2(4 * (decay - .5f)), .010f, 0);
        else {
            bank.setRatio(ratio);
            if (lane == 7) { closed.trigger(.025f + .12f * decay, 4); open.choke(); }
            else if (lane == 8) open.trigger(.08f + .64f * decay, 4);
            else if (lane == 9) { cymbal.setRatio(ratio); cymbal.trigger(.18f + 3.22f * decay, 4); }
            else { bell.setRatio(ratio); bell.trigger(.08f + .70f * decay, volts); }
        }
    }
    // Advance every voice, including muted/sample-selected lanes, once per
    // sample. Do not call once per active voice or stop the free-running bank.
    void renderFrame(float out[11]) {
        if (!out) return;
        if (hostRate == sampleRate) { renderNative(out); return; }
        phase += sampleRate / hostRate;
        while (phase >= 1) {
            for (int i = 0; i < 11; ++i) previous[i] = current[i];
            renderNative(current);
            if (hostRate < sampleRate) {
                for (int i = 0; i < 11; ++i) {
                    float x = current[i];
                    for (int k = 0; k < 2; ++k) {
                        const double y = filterB0[k] * x + downZ1[k][i];
                        downZ1[k][i] = 2 * filterB0[k] * x - filterA1[k] * y + downZ2[k][i];
                        downZ2[k][i] = filterB0[k] * x - filterA2[k] * y;
                        x = float(y);
                    }
                    current[i] = x;
                }
            }
            phase -= 1;
        }
        for (int i = 0; i < 11; ++i) {
            const float y = previous[i] + float(phase) * (current[i] - previous[i]);
            out[i] = std::isfinite(y) ? std::clamp(y, -4.f, 4.f) : 0;
        }
    }
private:
    // Fixed internal rate avoids upstream hats' differentiator gain changing
    // with host rate. Linear interpolation is a pragmatic conversion, not a
    // mastering resampler; non-48k paths have about one internal sample delay.
    void renderNative(float out[11]) {
        const double bus = bank.tick();
        out[0] = bass.process(); out[1] = snare.process();
        for (int i = 0; i < 3; ++i) out[i + 2] = tom[i].process();
        out[5] = rim.process(); out[6] = clap.process();
        out[7] = closed.process(bus); out[8] = open.process(bus);
        out[9] = cymbal.process(bus); out[10] = bell.process();
        // Per-voice calibration at full accent, with headroom for retriggers.
        constexpr float trims[] = { .1754f, .09f, .30f, .30f, .29f,
                                    .25f, 4.4f, .003f, .045f, 8.f, .014f };
        for (int i = 0; i < 11; ++i) {
            float v = out[i] * trims[i] * accentGain[i];
            if (!std::isfinite(v)) v = 0;
            low[i] += lowCoefficient * (v - low[i]);
            const float t = tilt[i];
            v = t < 0 ? v + (-t) * (low[i] - v) : v - t * low[i];
            out[i] = std::isfinite(v) ? std::clamp(v, -4.f, 4.f) : 0;
        }
    }
private:
    static float safe(float x, float lo, float hi, float fallback) {
        return std::isfinite(x) ? std::clamp(x, lo, hi) : fallback;
    }
    static constexpr double sampleRate = 48000;
    double hostRate = 48000, phase = 0;
    float previous[11]{}, current[11]{};
    double downZ1[2][11]{}, downZ2[2][11]{};
    double filterB0[2]{}, filterA1[2]{}, filterA2[2]{};
    float tilt[11]{}, low[11]{}, accentGain[11]{}, lowCoefficient = .36f;
    w8::CircuitBassDrum bass;
    w8::CircuitSnare snare;
    w8::TomCircuit tom[3];
    w8::ClapCircuit clap;
    w8::RimClave rim;
    w8::SchmittBank bank;
    w8::HatCircuit closed, open;
    w8::CymbalCircuit cymbal;
    w8::CowbellCircuit bell;
};
}
