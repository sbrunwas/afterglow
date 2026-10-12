// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "third_party/ER99/CymbalData.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <iterator>

namespace ag {
// Recorded cymbals from ER-99. The playback path is intentionally identified
// as sample-based, not a component-exact 909 DAC/compander reconstruction.
class Sampled909 {
  public:
    void prepare(double rate) { sr = rate; reset(); }
    void reset() { voices = {}; }
    void trigger(int lane, float tune, float decay, float tone) {
        if (lane < 7 || lane > 10) return;
        auto &v = voices[lane - 7];
        v = {};
        v.data = lane < 9 ? er99::hh : lane == 9 ? er99::crash : er99::ride;
        v.length = lane < 9 ? std::size(er99::hh) : lane == 9 ? std::size(er99::crash) : std::size(er99::ride);
        v.rate = 44100.0 / sr * std::exp2(tune / 12.0);
        // Decay is an extension that shortens the recorded envelope.
        // Maximum duration is limited by the source recording; Tune alone
        // governs playback rate.
        const double tau = lane == 7 ? .014 + .09 * decay
                         : lane == 8 ? .09 + .6 * decay
                         : .18 * std::pow(100.0, decay);
        v.mult = std::exp(-1 / (sr * tau));
        v.env = 1;
        v.filter = 1 - std::exp(-6.283185307179586 * std::min(sr * .45, 3000 * std::pow(7.0, tone)) / sr);
    }
    float process(int lane) {
        auto &v = voices[lane - 7];
        if (!v.data || v.position >= v.length) return 0;
        const auto i = size_t(v.position);
        const float a = float(v.data[i]) / 32768.f;
        const float b = i + 1 < v.length ? float(v.data[i + 1]) / 32768.f : 0;
        const float x = a + (b - a) * float(v.position - i);
        v.low += v.filter * (x - v.low);
        v.position += v.rate;
        v.env *= v.mult;
        return float(v.low * v.env * .8);
    }
  private:
    struct Voice {
        const int16_t *data = nullptr;
        size_t length = 0;
        double position = 0, rate = 1, env = 0, mult = 1, low = 0, filter = 1;
    };
    std::array<Voice, 4> voices{};
    double sr = 48000;
};
}
