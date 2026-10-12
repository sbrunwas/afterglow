// SPDX-License-Identifier: AGPL-3.0-only
#include "DrumEngine.h"
#include <algorithm>
#include <cmath>

namespace ag {
namespace {
constexpr double pi = 3.14159265358979323846;
float clean(float x, float lo, float hi, float fallback = 0) {
    return std::isfinite(x) ? std::clamp(x, lo, hi) : fallback;
}
float pole(double hz, double sr) {
    return float(1.0 - std::exp(-2 * pi * std::min(hz, sr * .42) / sr));
}
float soft(float x) {
    return x / (1.0f + std::abs(x));
}
// Polynomial bandlimited step correction for square-wave transition alias control.
float polyBlep(double phase, double dt) {
    if (phase < dt) {
        double t = phase / dt;
        return float(t + t - t * t - 1);
    }
    if (phase > 1 - dt) {
        double t = (phase - 1) / dt;
        return float(t * t + t + t + 1);
    }
    return 0;
}
} // namespace
void DrumEngine::prepare(double sampleRate) {
    sr = std::isfinite(sampleRate) ? std::clamp(sampleRate, 8000.0, 384000.0) : 44100;
    smooth = float(1 - std::exp(-1 / (sr * .003)));
    fadeStep = float(1 / (sr * .001));
    dcPole = float(std::exp(-2 * pi * 8 / sr));
    reset();
}
void DrumEngine::reset() {
    nineKick.Init(float(sr));
    nineSnare.Init(float(sr));
    eightKick.Init(float(sr));
    eightSnare.Init(float(sr));
    for (int i = 0; i < numVoices; ++i) {
        const auto p = voices[i].p;
        const auto *s = voices[i].sample;
        voices[i] = Voice{};
        voices[i].sample = s;
        voices[i].rng += uint32_t(i) * 73517u;
        setParams(i, p);
    }
}
void DrumEngine::setParams(int i, const VoiceParams &input) {
    if (i < 0 || i >= numVoices)
        return;
    auto p = input;
    if (int(p.model) < 0 || int(p.model) > 2)
        p.model = Model::Nine;
    p.tune = clean(p.tune, -24, 24);
    p.decay = clean(p.decay, 0, 1, .5f);
    p.tone = clean(p.tone, 0, 1, .5f);
    p.level = clean(p.level, 0, 2, .8f);
    p.pan = clean(p.pan, -1, 1);
    p.drive = clean(p.drive, 0, 1);
    p.sampleStart = clean(p.sampleStart, 0, 1);
    p.sampleEnd = clean(p.sampleEnd, 0, 1, 1);
    voices[i].p = p;
}
void DrumEngine::setSample(int i, const SampleData *s) {
    if (i < 0 || i >= numVoices)
        return;
    auto &v = voices[i];
    if (v.sample != s && v.playingModel == Model::Sample) {
        v.active = false;
        v.fadeL = v.oldL;
        v.fadeR = v.oldR;
        v.fade = 1;
    }
    v.sample = s;
}
float DrumEngine::noise(Voice &v) {
    v.rng ^= v.rng << 13;
    v.rng ^= v.rng >> 17;
    v.rng ^= v.rng << 5;
    return float(v.rng >> 8) * (2.0f / 16777216.0f) - 1;
}
void DrumEngine::trigger(int i, float velocity) {
    if (i < 0 || i >= numVoices || !std::isfinite(velocity) || velocity <= 0)
        return;
    auto &v = voices[i];
    const auto &p = v.p;
    if (i == 7)
        voices[8].targetGate = 0; // CH closes OH, including user samples.
    v.fadeL = v.oldL;
    v.fadeR = v.oldR;
    v.fade = 1;
    v.playingModel = p.model;
    v.active = true;
    v.velocity = clean(velocity, 0, 1);
    v.age = 0;
    v.env = 1;
    v.pitchEnv = 1;
    v.phase.fill(0);
    v.low = v.highLow = v.highLow2 = 0;
    v.gate = 0;
    v.targetGate = 1;
    const float ratio = std::exp2(p.tune / 12);
    const bool eight = p.model == Model::Eight;
    double tau = .08 + .6 * p.decay;
    if (i == 5)
        tau = .009 + .06 * p.decay;
    if (i == 6)
        tau = .055 + .19 * p.decay;
    if (i == 7)
        tau = .018 + .08 * p.decay;
    if (i == 8)
        tau = .10 + .65 * p.decay;
    if (i == 9)
        tau = .3 + 1.6 * p.decay;
    if (i == 10)
        tau = .2 + 1.2 * p.decay;
    v.envMul = float(std::exp(-1 / (sr * tau)));
    v.pitchMul = float(std::exp(-1 / (sr * (eight ? .035 : .018))));
    v.filterA = pole(2500 + 11000 * p.tone, sr);
    v.filterB = pole((i >= 7 ? 3500 : 650) + p.tone * (i >= 7 ? 4000 : 1800), sr);
    if (eight && (i == 7 || i == 8)) {
        v.filterA = pole(9500 + 3500 * p.tone, sr);
        v.filterB = pole(5500 + 3500 * p.tone, sr);
    }
    if (p.model == Model::Sample) {
        if (!v.sample || v.sample->left.empty() || !std::isfinite(v.sample->sampleRate) ||
            v.sample->sampleRate <= 0) {
            v.active = false;
            return;
        }
        auto n = v.sample->left.size();
        v.start = std::floor(p.sampleStart * double(n - 1));
        v.end = std::max(v.start, std::ceil(p.sampleEnd * double(n - 1)));
        v.position = p.reverse ? v.end : v.start;
        v.rate =
            ratio * std::clamp(v.sample->sampleRate, 1000.0, 768000.0) / sr * (p.reverse ? -1 : 1);
    } else if (i == 0) {
        if (eight) {
            eightKick.SetFreq(49 * ratio);
            eightKick.SetDecay(.12f + .70f * p.decay);
            eightKick.SetTone(p.tone);
            eightKick.SetAccent(v.velocity);
            eightKick.SetAttackFmAmount(.01f);
            eightKick.SetSelfFmAmount(.01f);
            eightKick.Trig();
        } else {
            nineKick.SetFreq(52 * ratio);
            nineKick.SetDecay(.12f + .78f * p.decay);
            nineKick.SetTone(p.tone);
            nineKick.SetAccent(v.velocity);
            nineKick.SetDirtiness(.15f);
            nineKick.SetFmEnvelopeAmount(.65f);
            nineKick.SetFmEnvelopeDecay(.25f);
            nineKick.Trig();
        }
    } else if (i == 1) {
        if (eight) {
            eightSnare.SetFreq(180 * ratio);
            eightSnare.SetDecay(.1f + .8f * p.decay);
            eightSnare.SetTone(p.tone);
            eightSnare.SetSnappy(.25f + .65f * p.tone);
            eightSnare.SetAccent(v.velocity);
            eightSnare.Trig();
        } else {
            nineSnare.SetFreq(185 * ratio);
            nineSnare.SetDecay(.12f + .75f * p.decay);
            nineSnare.SetFmAmount(.09f);
            nineSnare.SetSnappy(.25f + .65f * p.tone);
            nineSnare.SetAccent(v.velocity);
            nineSnare.Trig();
        }
    }
}
float DrumEngine::synth(int i, Voice &v) {
    const bool eight = v.playingModel == Model::Eight;
    const auto &p = v.p;
    if (i == 0)
        return (eight ? eightKick.Process() : nineKick.Process()) * .85f;
    if (i == 1)
        return (eight ? eightSnare.Process() : nineSnare.Process()) * .8f;
    const double ratio = std::exp2(p.tune / 12);
    auto osc = [&](int n, double hz) {
        v.phase[n] += std::min(hz, sr * .43) / sr;
        v.phase[n] -= std::floor(v.phase[n]);
        return float(std::sin(2 * pi * v.phase[n]));
    };
    float n = noise(v), out = 0;
    if (i >= 2 && i <= 4) {
        const double base = (i == 2 ? 105 : i == 3 ? 155 : 225) * ratio;
        out = osc(0, base * (1 + (eight ? .25 : .6) * v.pitchEnv));
        out += .18f * osc(1, base * 1.51) * v.pitchEnv;
        out += n * (eight ? .05f : .14f) * v.pitchEnv * p.tone;
        out *= v.env * .4f;
    } else if (i == 5) {
        out = (osc(0, (eight ? 480 : 390) * ratio) + .5f * osc(1, (eight ? 810 : 1620) * ratio)) *
              .55f * v.env;
    } else if (i == 6) {
        v.low += v.filterA * (n - v.low);
        v.highLow += v.filterB * (v.low - v.highLow);
        const double t = v.age / sr;
        // Three discrete hand-like pulses followed by a diffuse exponential tail.
        float burst = 0;
        for (int b = 0; b < 3; ++b) {
            double dt = t - b * .011;
            if (dt >= 0)
                burst += float(std::exp(-dt / .003));
        }
        const float tail =
            t > .027 ? float(std::exp(-(t - .027) / (.045 + .18 * p.decay))) * .65f : 0;
        out = (v.low - v.highLow) * (burst + tail) * 1.7f;
    } else {
        static constexpr double frequencies[6] = {205.3, 304.4, 369.6, 522.7, 540.0, 800.0};
        float metal = 0;
        for (int k = 0; k < 6; ++k) {
            double f = frequencies[k] * ratio * (eight ? 1 : 1.63) * (i == 9 ? .85 : 1);
            const double dt = std::min(f, sr * .4) / sr;
            v.phase[k] += dt;
            v.phase[k] -= std::floor(v.phase[k]);
            if (eight) {
                // Six independently related square oscillators, with bandlimited edges.
                double shifted = v.phase[k] + .5;
                shifted -= std::floor(shifted);
                float square = (v.phase[k] < .5 ? 1.f : -1.f) + polyBlep(v.phase[k], dt) -
                               polyBlep(shifted, dt);
                metal += square / 6;
            } else
                metal += soft(9 * float(std::sin(2 * pi * v.phase[k]))) / 6;
        }
        if (!eight)
            metal = .42f * metal + .58f * n;
        if (i == 9)
            metal = .40f * metal + .60f * n;
        if (i == 10)
            metal = .8f * metal + .2f * n;
        v.low += v.filterA * (metal - v.low);
        v.highLow += v.filterB * (v.low - v.highLow);
        float highPassed = v.low - v.highLow;
        if (eight && (i == 7 || i == 8)) {
            // The hardware removes oscillator fundamentals aggressively; a second
            // high-pass stage exposes their dense inharmonic upper partials.
            v.highLow2 += v.filterB * (highPassed - v.highLow2);
            highPassed -= v.highLow2;
        }
        out = highPassed * v.env * (i == 10 ? 2.2f : 2.8f) *
              (eight && (i == 7 || i == 8) ? 4.4f
               : eight && i == 10          ? 2.2f
                                           : 1.0f);
    }
    v.env *= v.envMul;
    v.pitchEnv *= v.pitchMul;
    return out;
}
void DrumEngine::renderFrame(float *left, float *right) {
    if (!left || !right)
        return;
    bool anySolo = false;
    for (const auto &v : voices)
        anySolo |= v.p.solo;
    for (int i = 0; i < numVoices; ++i) {
        auto &v = voices[i];
        const auto &p = v.p;
        float l = 0, r = 0;
        if (v.active) {
            if (v.playingModel == Model::Sample) {
                const auto *s = v.sample;
                if (!s || s->left.empty() || v.position < v.start || v.position > v.end) {
                    v.active = false;
                } else {
                    const auto a = std::min(size_t(v.position), s->left.size() - 1),
                               b = std::min(a + 1, s->left.size() - 1);
                    const float f = float(v.position - double(a));
                    l = clean(s->left[a], -8, 8) +
                        f * (clean(s->left[b], -8, 8) - clean(s->left[a], -8, 8));
                    r = s->right.size() == s->left.size()
                            ? clean(s->right[a], -8, 8) +
                                  f * (clean(s->right[b], -8, 8) - clean(s->right[a], -8, 8))
                            : l;
                    // Fade both trim edges in output time, independent of pitch and direction.
                    double remaining = v.rate > 0 ? v.end - v.position : v.position - v.start;
                    float edge = float(
                        std::min(1.0, remaining / std::max(1.0, std::abs(v.rate) * sr * .001)));
                    l *= edge;
                    r *= edge;
                    v.position += v.rate;
                }
            } else {
                l = r = synth(i, v);
            }
            v.gate += smooth * (v.targetGate - v.gate);
            l *= v.velocity * v.gate;
            r *= v.velocity * v.gate;
            ++v.age;
            if (v.targetGate == 0 && v.gate < .00001f)
                v.active = false;
            if (v.playingModel != Model::Sample && v.age > sr * 12)
                v.active = false;
        }
        l += v.fadeL * v.fade;
        r += v.fadeR * v.fade;
        v.fade = std::max(0.0f, v.fade - fadeStep);
        l = clean(l, -8, 8);
        r = clean(r, -8, 8);
        v.oldL = l;
        v.oldR = r;
        // DC blocker precedes gain and saturation. Stereo channels remain independent.
        float dl = l - v.prevL + dcPole * v.dcL, dr = r - v.prevR + dcPole * v.dcR;
        v.prevL = l;
        v.prevR = r;
        v.dcL = std::abs(dl) < 1e-20f ? 0 : dl;
        v.dcR = std::abs(dr) < 1e-20f ? 0 : dr;
        float target = (p.mute || (anySolo && !p.solo)) ? 0 : p.level;
        v.gain += smooth * (target - v.gain);
        v.panL += smooth * (float(std::cos((p.pan + 1) * pi * .25)) - v.panL);
        v.panR += smooth * (float(std::sin((p.pan + 1) * pi * .25)) - v.panR);
        if (p.drive > 0) {
            float d = 1 + 8 * p.drive;
            dl = std::tanh(dl * d) / std::sqrt(d);
            dr = std::tanh(dr * d) / std::sqrt(d);
        }
        left[i] = clean(dl * v.gain * v.panL, -4, 4);
        right[i] = clean(dr * v.gain * v.panR, -4, 4);
    }
}
} // namespace ag
