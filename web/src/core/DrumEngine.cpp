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
} // namespace
void DrumEngine::prepare(double sampleRate) {
    sr = std::isfinite(sampleRate) ? std::clamp(sampleRate, 8000.0, 384000.0) : 44100;
    smooth = float(1 - std::exp(-1 / (sr * .003)));
    fadeStep = float(1 / (sr * .001));
    dcPole = float(std::exp(-2 * pi * 3 / sr));
    reset();
}
void DrumEngine::reset() {
    nine.prepare(sr);
    eight.prepare(sr);
    cymbals.prepare(sr);
    for (int i = 0; i < numVoices; ++i) {
        const auto p = voices[i].p;
        const auto *s = voices[i].sample;
        voices[i] = Voice{};
        voices[i].sample = s;
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
void DrumEngine::trigger(int i, float velocity) {
    if (i < 0 || i >= numVoices || !std::isfinite(velocity) || velocity <= 0)
        return;
    auto &v = voices[i];
    const auto &p = v.p;
    if (i == 7)
        voices[8].targetGate = 0; // CH closes OH, including user samples.
    v.fadeL = v.oldL;
    v.fadeR = v.oldR;
    v.fade = p.model == Model::Sample || v.playingModel != p.model ? 1.f : 0.f;
    v.playingModel = p.model;
    v.active = true;
    v.velocity = clean(velocity, 0, 1);
    v.age = 0;
    v.gate = p.model == Model::Sample ? 0.f : 1.f;
    v.targetGate = 1;
    const float ratio = std::exp2(p.tune / 12);
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
    } else if (p.model == Model::Eight) {
        eight.trigger(i, p.tune, p.decay, p.tone, v.velocity);
    } else if (i < 7) {
        nine.trigger(i, p.tune, p.decay, p.tone, v.velocity);
    } else {
        cymbals.trigger(i, p.tune, p.decay, p.tone);
    }
}
void DrumEngine::renderFrame(float *left, float *right) {
    if (!left || !right)
        return;
    // Advance physical states and the shared 808 metal bus even between hits.
    float eightFrame[numVoices]{}, nineFrame[numVoices]{};
    eight.renderFrame(eightFrame);
    nine.renderFrame(nineFrame);
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
                l = r = v.playingModel == Model::Eight ? eightFrame[i]
                      : i < 7 ? nineFrame[i] : cymbals.process(i);
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
