// SPDX-License-Identifier: AGPL-3.0-only
#include "DrumEngine.h"
#include <array>
#include <cmath>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>

namespace {
void require(bool ok, const std::string &message) {
    if (!ok)
        throw std::runtime_error(message);
}
using Frame = std::array<float, ag::DrumEngine::numVoices>;
void frame(ag::DrumEngine &e, Frame &l, Frame &r) {
    e.renderFrame(l.data(), r.data());
    for (int i = 0; i < 11; ++i) {
        require(std::isfinite(l[i]) && std::isfinite(r[i]), "nonfinite DSP output");
        require(std::abs(l[i]) <= 4.f && std::abs(r[i]) <= 4.f, "unbounded DSP output");
    }
}
void voiceCoverage() {
    for (double sr : {44100., 48000., 96000.})
        for (auto model : {ag::Model::Nine, ag::Model::Eight}) {
            ag::DrumEngine e;
            e.prepare(sr);
            Frame l{}, r{};
            for (int i = 0; i < 11; ++i) {
                ag::VoiceParams p;
                p.model = model;
                e.setParams(i, p);
                e.trigger(i, .9f);
            }
            std::array<double, 11> energy{};
            for (int s = 0; s < int(sr * .5); ++s) {
                frame(e, l, r);
                for (int i = 0; i < 11; ++i)
                    energy[i] += l[i] * l[i] + r[i] * r[i];
            }
            for (int i = 0; i < 11; ++i)
                require(energy[i] > .00001, "silent factory voice " + std::to_string(i));
            e.reset();
            for (int s = 0; s < 256; ++s) {
                frame(e, l, r);
                for (int i = 0; i < 11; ++i)
                    require(l[i] == 0 && r[i] == 0, "reset leaves sound");
            }
        }
}
void instanceIndependence() {
    for (auto model : {ag::Model::Nine, ag::Model::Eight}) {
        ag::DrumEngine a, b, interferer;
        a.prepare(48000);
        b.prepare(48000);
        interferer.prepare(48000);
        for (int i = 0; i < 11; ++i) {
            ag::VoiceParams p;
            p.model = model;
            a.setParams(i, p);
            b.setParams(i, p);
            a.trigger(i, .7f);
            b.trigger(i, .7f);
            interferer.trigger(i, 1);
        }
        Frame al{}, ar{}, bl{}, br{}, il{}, ir{};
        for (int n = 0; n < 4800; ++n) {
            frame(a, al, ar);
            frame(interferer, il, ir);
            frame(interferer, il, ir);
            frame(b, bl, br);
            for (int i = 0; i < 11; ++i)
                require(al[i] == bl[i] && ar[i] == br[i], "DSP instances interfere");
        }
    }
}
ag::SampleData sineSample(int n = 4800) {
    ag::SampleData s;
    s.sampleRate = 48000;
    s.left.resize(n);
    s.right.resize(n);
    for (int i = 0; i < n; ++i) {
        s.left[i] = .6f * std::sin(float(i) * .11f);
        s.right[i] = -s.left[i];
    }
    return s;
}
void samplePlayback() {
    auto sample = sineSample();
    ag::VoiceParams p;
    p.model = ag::Model::Sample;
    p.level = 1;
    ag::DrumEngine e;
    e.prepare(48000);
    e.setParams(2, p);
    e.setSample(2, &sample);
    e.trigger(2, 1);
    Frame l{}, r{};
    double energy = 0;
    for (int i = 0; i < 4800; ++i) {
        frame(e, l, r);
        energy += l[2] * l[2];
        require(std::abs(l[2] + r[2]) < 1e-6, "stereo sample collapsed");
    }
    require(energy > 1, "sample did not play");
    for (int i = 0; i < 48000; ++i)
        frame(e, l, r);
    require(std::abs(l[2]) + std::abs(r[2]) < 1e-7, "sample tail never ends");
    e.reset();
    p.reverse = true;
    e.setParams(2, p);
    e.trigger(2, 1);
    energy = 0;
    for (int i = 0; i < 4800; ++i) {
        frame(e, l, r);
        energy += l[2] * l[2];
    }
    require(energy > 1, "reverse silent");
    // Replacing an active sample with null must never dereference the old data.
    e.trigger(2, 1);
    frame(e, l, r);
    e.setSample(2, nullptr);
    for (int i = 0; i < 1000; ++i)
        frame(e, l, r);
    e.trigger(2, 1);
    for (int i = 0; i < 1000; ++i)
        frame(e, l, r);
    ag::SampleData empty;
    e.setSample(2, &empty);
    e.trigger(2, 1);
    for (int i = 0; i < 100; ++i)
        frame(e, l, r);
}
void chokeAndMixer() {
    auto sample = sineSample(48000);
    ag::VoiceParams p;
    p.model = ag::Model::Sample;
    p.level = 1;
    ag::DrumEngine e;
    e.prepare(48000);
    e.setParams(8, p);
    e.setSample(8, &sample);
    e.trigger(8, 1);
    Frame l{}, r{};
    for (int i = 0; i < 1000; ++i)
        frame(e, l, r);
    e.trigger(7, 1);
    for (int i = 0; i < 12000; ++i)
        frame(e, l, r);
    require(std::abs(l[8]) < 1e-5, "closed hat failed to choke open sample hat");
    e.reset();
    e.trigger(8, 1);
    p.mute = true;
    e.setParams(8, p);
    for (int i = 0; i < 6000; ++i)
        frame(e, l, r);
    require(std::abs(l[8]) < 1e-6, "mute failed");
    e.reset();
    p.mute = false;
    p.pan = -1;
    e.setParams(8, p);
    e.trigger(8, 1);
    for (int i = 0; i < 6000; ++i)
        frame(e, l, r);
    require(std::abs(r[8]) < 1e-6, "hard pan leaks");
    ag::VoiceParams other;
    other.solo = true;
    e.setParams(4, other);
    for (int i = 0; i < 6000; ++i)
        frame(e, l, r);
    require(std::abs(l[8]) < 1e-6, "solo fails to suppress other lanes");
}
void eightHatSpectrum() {
    // Broad timbral guard: Eight hats should emphasize upper metallic partials,
    // rather than leaking the six exciter fundamentals as a pitched buzz.
    // This is not a measured hardware-response assertion.
    constexpr double pi = 3.14159265358979323846;
    for (double sr : {44100., 48000., 96000.}) {
        ag::DrumEngine e;
        e.prepare(sr);
        ag::VoiceParams p;
        p.model = ag::Model::Eight;
        e.setParams(7, p);
        e.trigger(7, 1);
        Frame l{}, r{};
        std::vector<double> x(static_cast<std::size_t>(sr * .085));
        for (std::size_t n = 0; n < x.size(); ++n) {
            frame(e, l, r);
            x[n] = l[7] * (.5 - .5 * std::cos(2 * pi * n / (x.size() - 1)));
        }
        double low = 0, high = 0;
        for (std::size_t k = 1; k < x.size() / 2; ++k) {
            double hz = k * sr / x.size();
            if (hz > 12000)
                break;
            if (hz > 2000 && hz < 4000)
                continue;
            double c = 2 * std::cos(2 * pi * k / x.size()), s1 = 0, s2 = 0;
            for (double a : x) {
                double next = a + c * s1 - s2;
                s2 = s1;
                s1 = next;
            }
            double power = std::max(0., s1 * s1 + s2 * s2 - c * s1 * s2);
            if (hz < 2000)
                low += power;
            else
                high += power;
        }
        require(high > 3 * low, "Eight closed hat lost upper-partial emphasis");
    }
}
void hostileParameters() {
    ag::DrumEngine e;
    e.prepare(std::numeric_limits<double>::quiet_NaN());
    Frame l{}, r{};
    for (int k = 0; k < 3; ++k) {
        ag::VoiceParams p;
        p.model = static_cast<ag::Model>(k);
        p.tune = k == 0 ? -1e8f : 1e8f;
        p.decay = std::numeric_limits<float>::quiet_NaN();
        p.tone = std::numeric_limits<float>::infinity();
        p.level = 2;
        p.pan = -100;
        p.drive = 1;
        for (int v = 0; v < 11; ++v) {
            e.setParams(v, p);
            e.trigger(v, 1);
        }
        for (int n = 0; n < 12000; ++n)
            frame(e, l, r);
    }
    e.setParams(-1, {});
    e.setParams(100, {});
    e.setSample(-1, nullptr);
    e.trigger(100, 1);
    e.renderFrame(nullptr, nullptr);
}
} // namespace
int main() {
    try {
        voiceCoverage();
        instanceIndependence();
        samplePlayback();
        chokeAndMixer();
        eightHatSpectrum();
        hostileParameters();
        std::cout << "DSP behavior tests passed\n";
        return 0;
    } catch (const std::exception &e) {
        std::cerr << "DSP TEST FAILURE: " << e.what() << '\n';
        return 1;
    }
}
