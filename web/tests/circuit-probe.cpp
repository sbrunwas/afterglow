// SPDX-License-Identifier: AGPL-3.0-only
// Native behavioral checks for DrumEngine. No JUCE, WASM runtime, or external test library.
#include "DrumEngine.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <chrono>
#include <cstdint>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
using Frame = std::array<float, ag::DrumEngine::numVoices>;
constexpr double pi = 3.14159265358979323846;
int checks = 0;
void require(bool condition, const std::string& description) {
    ++checks;
    if (!condition) throw std::runtime_error(description);
}
void frame(ag::DrumEngine& engine, Frame& left, Frame& right) {
    engine.renderFrame(left.data(), right.data());
    for (int i = 0; i < ag::DrumEngine::numVoices; ++i) {
        if (!std::isfinite(left[i]) || !std::isfinite(right[i]))
            throw std::runtime_error("Nonfinite output, voice " + std::to_string(i));
        if (std::abs(left[i]) > 4.f || std::abs(right[i]) > 4.f)
            throw std::runtime_error("Output exceeds engine safety bound, voice " + std::to_string(i));
    }
}
void configure(ag::DrumEngine& engine, ag::Model model) {
    for (int i = 0; i < ag::DrumEngine::numVoices; ++i) {
        ag::VoiceParams p;
        p.model = model;
        engine.setParams(i, p);
    }
}
std::string label(double rate, int model, int voice) {
    return "rate=" + std::to_string(int(rate)) + " model=" + std::to_string(model)
        + " voice=" + std::to_string(voice);
}
void coverage(bool summary) {
    double rms[2][11][3]{};
    int rateIndex = 0;
    if (summary) std::cout << "rate,model,voice,rms,peak,energy_1ms,energy_5ms,energy_20ms\n";
    for (double rate : {44100., 48000., 96000.}) {
        for (int model = 0; model < 2; ++model) {
            for (int voice = 0; voice < 11; ++voice) {
                ag::DrumEngine engine;
                engine.prepare(rate);
                configure(engine, ag::Model(model));
                engine.trigger(voice, 1.f);
                Frame l{}, r{};
                double energy = 0, peak = 0, early1 = 0, early5 = 0, early20 = 0;
                int count = int(rate * .35);
                for (int n = 0; n < count; ++n) {
                    frame(engine, l, r);
                    const double e = double(l[voice]) * l[voice] + double(r[voice]) * r[voice];
                    energy += e;
                    peak = std::max(peak, double(std::max(std::abs(l[voice]), std::abs(r[voice]))));
                    if (n < rate * .001) early1 += e;
                    if (n < rate * .005) early5 += e;
                    if (n < rate * .020) early20 += e;
                    for (int other = 0; other < 11; ++other)
                        if (other != voice && (l[other] != 0 || r[other] != 0))
                            throw std::runtime_error("Untriggered voice leaks: " + label(rate, model, other));
                }
                require(energy > 1e-8, "Silent default voice: " + label(rate, model, voice));
                rms[model][voice][rateIndex] = std::sqrt(energy / (2 * count));
                if (summary)
                    std::cout << int(rate) << ',' << model << ',' << voice << ','
                              << std::sqrt(energy / (2 * count)) << ',' << peak << ','
                              << early1 << ',' << early5 << ',' << early20 << '\n';
                engine.reset();
                for (int n = 0; n < 128; ++n) {
                    frame(engine, l, r);
                    for (int i = 0; i < 11; ++i)
                        require(l[i] == 0 && r[i] == 0, "Reset must silence all tails immediately");
                }
            }
        }
        ++rateIndex;
    }
    for (int model = 0; model < 2; ++model) for (int voice = 0; voice < 11; ++voice) {
        const auto bounds = std::minmax_element(rms[model][voice], rms[model][voice] + 3);
        require(*bounds.second / *bounds.first < 3.0,
            "Sample-rate-dependent level collapse " + label(0, model, voice)
            + " max/min=" + std::to_string(*bounds.second / *bounds.first));
    }
}
void extremes() {
    for (double rate : {44100., 48000., 96000.}) {
        for (int model = 0; model < 2; ++model) {
            // Cover both ends of independent pitch, damping, and filter controls.
            for (int corner = 0; corner < 8; ++corner) {
                ag::DrumEngine engine;
                engine.prepare(rate);
                for (int i = 0; i < 11; ++i) {
                    ag::VoiceParams p;
                    p.model = ag::Model(model);
                    p.tune = corner & 1 ? 24 : -24;
                    p.decay = corner & 2 ? 1 : 0;
                    p.tone = corner & 4 ? 1 : 0;
                    p.drive = corner & 1 ? 1 : 0;
                    p.level = 2;
                    engine.setParams(i, p);
                    engine.trigger(i, 1);
                }
                Frame l{}, r{};
                std::array<double, 11> energy{};
                // Every voice is hit repeatedly, including before its old transient ends.
                for (int n = 0; n < int(rate * .12); ++n) {
                    if (n % 29 == 0) engine.trigger((n / 29) % 11, .15f + .85f * ((n / 29) % 2));
                    frame(engine, l, r);
                    for (int i = 0; i < 11; ++i) energy[i] += double(l[i]) * l[i] + double(r[i]) * r[i];
                }
                for (int i = 0; i < 11; ++i)
                    require(energy[i] > 1e-12, "Silent rapid-retrigger corner " + std::to_string(corner)
                        + ": " + label(rate, model, i));
            }
            // Treat nonfinite external state as untrusted input, then prove recovery.
            ag::DrumEngine engine;
            engine.prepare(rate);
            Frame l{}, r{};
            for (int i = 0; i < 11; ++i) {
                ag::VoiceParams p;
                p.model = ag::Model(model);
                p.tune = p.decay = p.tone = p.level = p.pan = p.drive = std::numeric_limits<float>::quiet_NaN();
                engine.setParams(i, p);
                engine.trigger(i, 1);
            }
            engine.trigger(-1, 1);
            engine.trigger(11, 1);
            engine.trigger(0, std::numeric_limits<float>::infinity());
            for (int n = 0; n < 4096; ++n) frame(engine, l, r);
            engine.reset();
            configure(engine, ag::Model(model));
            engine.trigger(0, 1);
            double e = 0;
            for (int n = 0; n < 2048; ++n) { frame(engine, l, r); e += double(l[0]) * l[0]; }
            require(e > 1e-9, "Engine failed to recover from invalid parameters");
        }
    }
}
void choke() {
    for (double rate : {44100., 48000., 96000.}) {
        for (int model = 0; model < 3; ++model) {
            ag::DrumEngine closed, ringing;
            closed.prepare(rate);
            ringing.prepare(rate);
            configure(closed, ag::Model(model));
            configure(ringing, ag::Model(model));
            ag::SampleData sample;
            sample.sampleRate = rate;
            sample.left.resize(int(rate));
            for (size_t n = 0; n < sample.left.size(); ++n)
                sample.left[n] = .2f * float(std::sin(2 * pi * 740 * n / rate));
            if (model == 2) {
                closed.setSample(8, &sample);
                ringing.setSample(8, &sample);
            }
            closed.trigger(8, 1);
            ringing.trigger(8, 1);
            Frame cl{}, cr{}, rl{}, rr{};
            double postChoke = 0, baseline = 0;
            for (int n = 0; n < int(rate * .22); ++n) {
                if (n == int(rate * .05)) closed.trigger(7, 1);
                frame(closed, cl, cr);
                frame(ringing, rl, rr);
                if (n >= rate * .15) {
                    postChoke += double(cl[8]) * cl[8] + double(cr[8]) * cr[8];
                    baseline += double(rl[8]) * rl[8] + double(rr[8]) * rr[8];
                }
            }
            require(baseline > 1e-10, "Open hat baseline silent before choke measurement");
            require(postChoke < baseline * .01, "Closed hat failed to choke open hat "
                    + label(rate, model, 8) + " ratio=" + std::to_string(postChoke / baseline));
            closed.trigger(8, 1); // The next open hat must reopen after the prior choke.
            double reopened = 0;
            for (int n = 0; n < int(rate * .03); ++n) {
                frame(closed, cl, cr);
                reopened += double(cl[8]) * cl[8] + double(cr[8]) * cr[8];
            }
            require(reopened > 1e-9, "Open hat stuck closed after choke");
        }
    }
}
void instances() {
    for (double rate : {44100., 48000., 96000.}) {
        for (int model = 0; model < 2; ++model) {
            ag::DrumEngine expected, tested, interferer;
            expected.prepare(rate); tested.prepare(rate); interferer.prepare(rate);
            configure(expected, ag::Model(model)); configure(tested, ag::Model(model));
            configure(interferer, ag::Model(1 - model));
            std::vector<Frame> reference(8192);
            Frame l{}, r{}, scratch{};
            auto events = [](ag::DrumEngine& e, int n) {
                if (n % 127 == 0) e.trigger((n / 127) % 11, .6f);
                if (n % 109 == 0) e.trigger(6, .9f);
            };
            for (int n = 0; n < int(reference.size()); ++n) {
                events(expected, n); frame(expected, l, r); reference[n] = l;
            }
            for (int n = 0; n < int(reference.size()); ++n) {
                interferer.trigger(n % 11, .8f);
                frame(interferer, l, r);
                if (n % 67 == 0) interferer.reset();
                events(tested, n); frame(tested, l, scratch);
                for (int i = 0; i < 11; ++i)
                    require(l[i] == reference[n][i], "Instances share DSP state " + label(rate, model, i));
            }
            tested.reset(); expected.reset();
            tested.trigger(1, .8f); expected.trigger(1, .8f);
            for (int n = 0; n < 256; ++n) {
                frame(tested, l, scratch); frame(expected, r, scratch);
                for (int i = 0; i < 11; ++i)
                    require(l[i] == r[i], "Reset does not restore deterministic initial state");
            }
        }
    }
}
void controls() {
    for (int model = 0; model < 2; ++model) for (int voice = 0; voice < 11; ++voice) {
        for (int control = 0; control < 3; ++control) {
            // Cymbal decay follows a slow modeled attack; measure through its tail.
            const int count = control == 1 ? 96000 : 12000;
            ag::DrumEngine a, b;
            a.prepare(48000); b.prepare(48000);
            ag::VoiceParams pa, pb;
            pa.model = pb.model = ag::Model(model);
            if (control == 0) { pa.tune = -7; pb.tune = 7; }
            if (control == 1) { pa.decay = .1f; pb.decay = .9f; }
            if (control == 2) { pa.tone = .1f; pb.tone = .9f; }
            a.setParams(voice, pa); b.setParams(voice, pb);
            a.trigger(voice, .8f); b.trigger(voice, .8f);
            Frame al{}, ar{}, bl{}, br{};
            double difference = 0, energy = 0;
            for (int n = 0; n < count; ++n) {
                frame(a, al, ar); frame(b, bl, br);
                difference += double(al[voice] - bl[voice]) * (al[voice] - bl[voice]);
                energy += double(al[voice]) * al[voice] + double(bl[voice]) * bl[voice];
            }
            std::cout << "control," << model << "," << voice << "," << control << "," << difference / std::max(energy, 1e-30) << "\n";
            require(energy > 1e-10 && difference > energy * 1e-10,
                "Control has no effect at next hit: control=" + std::to_string(control)
                + " " + label(48000, model, voice) + " relative-difference=" + std::to_string(difference / std::max(energy, 1e-30)));
        }
    }
}
void freeRunning() {
    ag::DrumEngine early, late;
    early.prepare(48000); late.prepare(48000);
    configure(early, ag::Model::Eight); configure(late, ag::Model::Eight);
    Frame el{}, er{}, ll{}, lr{};
    for (int n = 0; n < 713; ++n) frame(late, ll, lr);
    early.trigger(7, 1); late.trigger(7, 1);
    double difference = 0, energy = 0;
    for (int n = 0; n < 4096; ++n) {
        frame(early, el, er); frame(late, ll, lr);
        difference += double(el[7] - ll[7]) * (el[7] - ll[7]);
        energy += double(el[7]) * el[7] + double(ll[7]) * ll[7];
    }
    require(energy > 1e-10 && difference > energy * .001,
            "808 metal generator appears reset or frozen between hits");
}
void noise909() {
    double referencePower = 0;
    for (double rate : {44100., 48000., 96000.}) {
        ag::Noise909 noise;
        noise.prepare(rate);
        double sum = 0, square = 0, low = 0, bandSquare = 0;
        int bandCount = 0;
        const double coefficient = 1 - std::exp(-2 * pi * 3000 / rate);
        std::array<float, 1024> initial{};
        for (int n = 0; n < int(rate * 4); ++n) {
            const float sample = noise.next();
            require(std::isfinite(sample) && std::abs(sample) <= 1.444f,
                    "909 noise generator became nonfinite or out of range");
            if (n < int(initial.size())) initial[n] = sample;
            sum += sample; square += double(sample) * sample;
            low += coefficient * (sample - low);
            if (n >= rate) { bandSquare += low * low; ++bandCount; }
        }
        const double mean = sum / (rate * 4);
        const double variance = square / (rate * 4) - mean * mean;
        const double normalizedDensity = variance / rate * 48000;
        const double bandPower = bandSquare / bandCount;
        require(std::abs(mean) < .02, "909 noise has excessive DC bias");
        require(normalizedDensity > .22 && normalizedDensity < .38,
                "909 noise has incorrect normalized broad-band power");
        if (referencePower == 0) referencePower = bandPower;
        require(bandPower / referencePower > .85 && bandPower / referencePower < 1.15,
                "909 noise 3kHz-band power varies with sample rate");
        noise.reset();
        for (float expected : initial)
            require(noise.next() == expected, "909 noise reset is not deterministic");
    }
}
void performance() {
    for (double rate : {44100., 48000., 96000.}) for (int model = 0; model < 2; ++model) {
        ag::DrumEngine engine;
        engine.prepare(rate); configure(engine, ag::Model(model));
        Frame l{}, r{};
        volatile double energy = 0;
        const auto start = std::chrono::steady_clock::now();
        for (int n = 0; n < int(rate * 10); ++n) {
            if (n % int(rate / 4) == 0)
                for (int i = 0; i < 11; ++i) engine.trigger(i, 1);
            engine.renderFrame(l.data(), r.data());
            energy += l[n % 11] * l[n % 11];
        }
        const double elapsed = std::chrono::duration<double>(std::chrono::steady_clock::now() - start).count();
        require(energy > 0, "Performance probe rendered silence");
        std::cout << "performance,rate=" << rate << ",model=" << model
                  << ",audio_seconds=10,wall_seconds=" << elapsed
                  << ",realtime_multiple=" << 10 / elapsed << '\n';
    }
}
} // namespace
int main(int argc, char** argv) {
    try {
        const std::string mode = argc > 1 ? argv[1] : "all";
        if (mode == "coverage" || mode == "summary" || mode == "all") coverage(mode == "summary");
        if (mode == "extremes" || mode == "all") extremes();
        if (mode == "choke" || mode == "all") choke();
        if (mode == "instances" || mode == "all") instances();
        if (mode == "controls" || mode == "all") controls();
        if (mode == "free-running" || mode == "all") freeRunning();
        if (mode == "noise" || mode == "all") noise909();
        if (mode == "performance") performance();
        require(mode == "coverage" || mode == "summary" || mode == "extremes" || mode == "choke"
                || mode == "instances" || mode == "controls" || mode == "free-running" || mode == "noise" || mode == "performance" || mode == "all", "Unknown test suite");
        std::cerr << "PASS circuit-probe " << mode << " checks=" << checks << '\n';
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "FAIL circuit-probe: " << error.what() << '\n';
        return 1;
    }
}
