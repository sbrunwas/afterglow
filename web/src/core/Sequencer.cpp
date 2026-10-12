// SPDX-License-Identifier: AGPL-3.0-only
#include "Sequencer.h"
#include <algorithm>
#include <cmath>
#include <limits>

namespace ag {
namespace {
int length(const Pattern &p) {
    return std::clamp(p.length, 1, kSteps);
}
struct Location {
    int pattern, step;
    double start, duration;
    std::int64_t cycle;
};
Location locate(const SequenceData &d, double pos, int selected, bool song, double swing) {
    int total = length(d.patterns[selected]);
    const int count = std::clamp(d.chainLength, 1, kSteps);
    if (song) {
        total = 0;
        for (int i = 0; i < count; ++i)
            total += length(d.patterns[std::clamp(d.chain[i], 0, kPatterns - 1)]);
    }
    const double cycle = std::floor(pos / total);
    double local = pos - cycle * total, base = cycle * total;
    int p = selected;
    if (song)
        for (int i = 0; i < count; ++i) {
            p = std::clamp(d.chain[i], 0, kPatterns - 1);
            const int n = length(d.patterns[p]);
            if (local < n || i == count - 1)
                break;
            local -= n;
            base += n;
        }
    const int n = length(d.patterns[p]);
    int s = std::clamp(static_cast<int>(std::floor(local)), 0, n - 1);
    if ((s & 1) && local < s + swing)
        --s;
    const double start = s + ((s & 1) ? swing : 0.0);
    const double end = (s + 1 < n) ? s + 1 + (((s + 1) & 1) ? swing : 0.0) : n;
    return {p, s, base + start, end - start, static_cast<std::int64_t>(cycle)};
}
std::uint64_t mix(std::uint64_t x) {
    x += 0x9e3779b97f4a7c15ULL;
    x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
    x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
    return x ^ (x >> 31);
}
bool pass(const Step &s, const Location &l, int v) {
    if (!s.on || !(s.probability > 0))
        return false;
    if (s.probability >= 1)
        return true;
    const auto seed = mix(static_cast<std::uint64_t>(l.cycle)) ^
                      mix(static_cast<std::uint64_t>(l.pattern * 704 + v * 64 + l.step));
    const double random = static_cast<double>(mix(seed) >> 11) * (1.0 / 9007199254740992.0);
    return random < s.probability;
}
} // namespace
void Sequencer::reset() noexcept {
    started_ = false;
    step_ = -1;
    pattern_ = 0;
}
void Sequencer::process(double ppq, double inc, bool playing, int selected, bool song, float swing,
                        void *context, void (*trigger)(void *, int, float)) noexcept {
    if (!playing || !data_ || !trigger || !std::isfinite(ppq) || !std::isfinite(inc) || inc <= 0 ||
        std::abs(ppq) > 1e12) {
        reset();
        return;
    }
    selected = std::clamp(selected, 0, kPatterns - 1);
    swing = std::isfinite(swing) ? std::clamp(swing, 0.f, .66f) : 0.f;
    const bool continuous =
        started_ && selected == lastSelected_ && song == lastSong_ && swing == lastSwing_ &&
        std::abs(ppq - (lastPpq_ + lastIncrement_)) <= std::max(1e-8, lastIncrement_ * .25);
    constexpr double eps = 1e-9;
    const double now = ppq * 4, low = continuous ? lastPpq_ * 4 : now - 2 * eps;
    // The epsilon snaps floating-point accumulation onto intended exact boundaries.
    Location l = locate(*data_, low + eps, selected, song, swing);
    const auto current = locate(*data_, now + eps, selected, song, swing);
    pattern_ = current.pattern;
    step_ = current.step;
    // A sane host sample crosses at most one step; bounded scanning also handles
    // intentionally accelerated callers without allocating on the audio thread.
    for (int scan = 0; scan < 8192; ++scan) {
        for (int v = 0; v < kVoices; ++v) {
            const auto &s = data_->patterns[l.pattern].steps[v][l.step];
            if (!pass(s, l, v))
                continue;
            const int r = std::clamp(s.ratchets, 1, 4);
            for (int j = 0; j < r; ++j) {
                const double t = l.start + l.duration * j / r;
                if (t > low + eps && t <= now + eps)
                    trigger(context, v,
                            std::isfinite(s.velocity) ? std::clamp(s.velocity, 0.f, 1.f) : 0.f);
            }
        }
        const double next = l.start + l.duration;
        if (next > now + eps)
            break;
        l = locate(*data_, next + eps, selected, song, swing);
    }
    lastPpq_ = ppq;
    lastIncrement_ = inc;
    lastSelected_ = selected;
    lastSong_ = song;
    lastSwing_ = swing;
    started_ = true;
}
SequenceData Sequencer::factoryPatterns() {
    SequenceData d;
    for (int p = 0; p < kPatterns; ++p) {
        auto &a = d.patterns[p];
        for (int s = 0; s < 16; ++s) {
            a.steps[0][s].on = (s % 4 == 0);
            a.steps[0][s].velocity = .95f;
            a.steps[1][s].on = (s % 8 == 4);
            a.steps[1][s].velocity = .85f;
            a.steps[6][s].on = (s % 8 == 4 && p % 4 != 0);
            a.steps[7][s].on = (s % 2 == 0);
            a.steps[7][s].velocity = (s % 4 == 0) ? .65f : .85f;
            a.steps[8][s].on = (s % 4 == 2 && p % 2 == 1);
            if (p >= 4 && s % 4 == 3) {
                a.steps[7][s].on = true;
                a.steps[7][s].velocity = .4f;
            }
            if (p >= 8 && s == 14) {
                a.steps[4][s].on = true;
                a.steps[4][s].velocity = .7f;
            }
            if (p >= 12 && s == 15) {
                a.steps[1][s].on = true;
                a.steps[1][s].velocity = .5f;
                a.steps[1][s].ratchets = 2;
            }
        }
        d.chain[p] = p;
    }
    d.chainLength = 4;
    return d;
}
} // namespace ag
