// SPDX-License-Identifier: AGPL-3.0-only
// Standalone, dependency-free demo rendering. Link AfterglowDSP + AfterglowSequence.
// Usage: ag_render_demo [output.wav] [voice_stats.csv]
#include "DrumEngine.h"
#include "Sequencer.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <vector>

namespace {
void le16(std::ostream &s, std::uint16_t n) {
    s.put(char(n & 255));
    s.put(char(n >> 8));
}
void le32(std::ostream &s, std::uint32_t n) {
    le16(s, std::uint16_t(n));
    le16(s, std::uint16_t(n >> 16));
}
struct Stats {
    double squares = 0, peak = 0;
    std::uint64_t samples = 0, triggers = 0;
};
struct Context {
    ag::DrumEngine *engine;
    std::array<Stats, 11> *stats;
};
void trigger(void *ptr, int v, float velocity) {
    auto &c = *static_cast<Context *>(ptr);
    c.engine->trigger(v, velocity);
    ++(*c.stats)[v].triggers;
}
} // namespace
int main(int argc, char **argv) {
    try {
        const std::string filename = argc > 1 ? argv[1] : "Afterglow-909-808-Demo.wav";
        const std::string csvname = argc > 2 ? argv[2] : "Afterglow-Demo-Stats.csv";
        constexpr int sr = 48000;
        constexpr double tempo = 124, inc = tempo / (60 * sr);
        constexpr double beats = 32, tail = 1.0;
        const auto frames = std::size_t(std::ceil(beats / inc + tail * sr));
        ag::DrumEngine engine;
        engine.prepare(sr);
        auto patterns = ag::Sequencer::factoryPatterns();
        // Same four factory patterns in each section allow a direct model comparison.
        patterns.chainLength = 4;
        patterns.chain[0] = 1;
        patterns.chain[1] = 5;
        patterns.chain[2] = 9;
        patterns.chain[3] = 13;
        ag::Sequencer seq;
        seq.setData(&patterns);
        std::array<std::array<Stats, 11>, 2> stats{};
        std::vector<float> samples(frames * 2);
        float l[11], r[11];
        double peak = 0;
        int previousModel = -1;
        for (std::size_t n = 0; n < frames; ++n) {
            const double ppq = double(n) * inc;
            const int model = ppq < 16 ? 0 : 1;
            if (model != previousModel) {
                for (int i = 0; i < 11; ++i) {
                    ag::VoiceParams p;
                    p.model = ag::Model(model);
                    p.level = .8f;
                    engine.setParams(i, p);
                }
                previousModel = model;
            }
            Context context{&engine, &stats[model]};
            seq.process(ppq, inc, ppq < beats, 0, true, .12f, &context, trigger);
            engine.renderFrame(l, r);
            double sumL = 0, sumR = 0;
            for (int i = 0; i < 11; ++i) {
                if (!std::isfinite(l[i]) || !std::isfinite(r[i]))
                    throw std::runtime_error("Nonfinite DSP output");
                sumL += l[i];
                sumR += r[i];
                auto &s = stats[model][i];
                s.squares += .5 * (double(l[i]) * l[i] + double(r[i]) * r[i]);
                ++s.samples;
                s.peak = std::max(s.peak, double(std::max(std::abs(l[i]), std::abs(r[i]))));
            }
            // A fade at the file's end avoids truncating cymbal or tom tails.
            double fade = std::min(1.0, double(frames - 1 - n) / (sr * .02));
            samples[n * 2] = float(sumL * fade);
            samples[n * 2 + 1] = float(sumR * fade);
            peak = std::max(peak, std::max(std::abs(sumL * fade), std::abs(sumR * fade)));
        }
        const double gain =
            peak > 0 ? std::min(1.0, .891250938 / peak) : 1.0; // -1 dBFS ceiling, no limiter
        std::ofstream wav(filename, std::ios::binary);
        if (!wav)
            throw std::runtime_error("Cannot create WAV");
        const auto dataBytes = std::uint32_t(samples.size() * 2);
        wav.write("RIFF", 4);
        le32(wav, 36 + dataBytes);
        wav.write("WAVEfmt ", 8);
        le32(wav, 16);
        le16(wav, 1);
        le16(wav, 2);
        le32(wav, sr);
        le32(wav, sr * 4);
        le16(wav, 4);
        le16(wav, 16);
        wav.write("data", 4);
        le32(wav, dataBytes);
        for (float x : samples) {
            auto pcm = std::int16_t(std::lround(std::clamp(double(x) * gain, -1., 1.) * 32767));
            le16(wav, std::uint16_t(pcm));
        }
        if (!wav)
            throw std::runtime_error("WAV write failed");
        const char *names[] = {"Kick", "Snare",     "LowTom",  "MidTom", "HighTom", "Rim",
                               "Clap", "ClosedHat", "OpenHat", "Crash",  "Ride"};
        std::ofstream csv(csvname);
        if (!csv)
            throw std::runtime_error("Cannot create stats CSV");
        csv << "model,voice,triggers,rms,peak\n" << std::setprecision(9);
        for (int m = 0; m < 2; ++m)
            for (int i = 0; i < 11; ++i) {
                const auto &s = stats[m][i];
                csv << (m == 0 ? "Nine" : "Eight") << ',' << names[i] << ',' << s.triggers << ','
                    << std::sqrt(s.squares / std::max(std::uint64_t(1), s.samples)) << ',' << s.peak
                    << '\n';
            }
        std::cout << filename << ": " << frames << " frames, " << double(frames) / sr
                  << " s, 124 BPM, Nine first 4 bars / Eight last 4 bars\n"
                  << "Unscaled peak " << peak << ", master gain " << gain << ", output peak "
                  << peak * gain << "\n";
    } catch (const std::exception &e) {
        std::cerr << e.what() << '\n';
        return 1;
    }
}
