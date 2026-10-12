// SPDX-License-Identifier: AGPL-3.0-only
// These behavioral checks must remain enabled in Release CI builds.
#ifdef NDEBUG
#undef NDEBUG
#endif
#include "Sequencer.h"
#include <algorithm>
#include <cassert>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <new>

static bool watchAlloc = false;
static int allocations = 0;
void *operator new(std::size_t n) {
    if (watchAlloc)
        ++allocations;
    if (auto *p = std::malloc(n))
        return p;
    throw std::bad_alloc();
}
void operator delete(void *p) noexcept {
    std::free(p);
}
void operator delete(void *p, std::size_t) noexcept {
    std::free(p);
}
struct Log {
    int count = 0;
    double now = 0;
    double times[16384]{};
    int voices[16384]{};
    float velocities[16384]{};
};
static void hit(void *ctx, int v, float velocity) {
    auto &l = *static_cast<Log *>(ctx);
    assert(l.count < 16384);
    l.times[l.count] = l.now;
    l.voices[l.count] = v;
    l.velocities[l.count++] = velocity;
}
static void run(ag::Sequencer &q, Log &log, double begin, double end, double increment,
                float swing = 0, bool song = false) {
    const int n = static_cast<int>(std::ceil((end - begin) / increment - 1e-7));
    for (int i = 0; i < n; ++i) {
        log.now = begin + i * increment;
        q.process(log.now, increment, true, 0, song, swing, &log, hit);
    }
}
int main() {
    ag::SequenceData d;
    ag::Sequencer q;
    Log log;
    for (int s = 0; s < 64; ++s)
        d.patterns[0].steps[0][s].on = true;
    q.setData(&d);
    for (double sr : {44100., 48000., 96000.})
        for (double bpm : {59., 120., 177.3}) {
            q.reset();
            log = {};
            const double inc = bpm / (60 * sr);
            run(q, log, 0, 4, inc);
            assert(log.count == 16);
            for (int s = 0; s < 16; ++s)
                assert(log.times[s] >= s * .25 - 1e-9 && log.times[s] < s * .25 + inc + 1e-9);
        }
    // DAW block boundaries must not alter event counts or timing. Recompute
    // absolute PPQ at the block head as hosts do, then advance inside each block.
    q.reset();
    log = {};
    const double blockInc = 123.0 / (60 * 48000);
    const int totalSamples = static_cast<int>(std::ceil(4 / blockInc));
    int sample = 0, blockIndex = 0;
    const int blockSizes[] = {1, 64, 127, 512, 33, 1024};
    while (sample < totalSamples) {
        const int block = std::min(blockSizes[blockIndex++ % 6], totalSamples - sample);
        double pos = sample * blockInc;
        for (int j = 0; j < block; ++j) {
            log.now = pos;
            q.process(pos, blockInc, true, 0, false, 0, &log, hit);
            pos += blockInc;
        }
        sample += block;
    }
    assert(log.count == 16);
    // Replacing an edit snapshot between blocks preserves the crossing interval.
    q.reset();
    log = {};
    log.now = .249;
    q.process(log.now, .002, true, 0, false, 0, &log, hit);
    auto edited = d;
    q.setData(&edited);
    log.now = .251;
    q.process(log.now, .002, true, 0, false, 0, &log, hit);
    assert(log.count == 1);
    q.setData(&d);
    q.reset();
    log = {};
    run(q, log, .1, 1, .001);
    assert(log.count == 3);
    assert(std::abs(log.times[0] - .25) < 1e-8);
    // Exact loop restart must retrigger zero, never replay the skipped interval.
    q.reset();
    log = {};
    run(q, log, 0, 1, .001);
    run(q, log, 0, 1, .001);
    assert(log.count == 8);
    run(q, log, 2.1, 2.49, .001);
    assert(log.count == 9);
    q.process(0, .001, false, 0, false, 0, &log, hit);
    assert(q.currentStep() == -1);
    // Swing shifts odd sixteenths by 50%, without moving the even steps.
    q.reset();
    log = {};
    run(q, log, 0, 1, .001, .5f);
    assert(log.count == 4);
    assert(std::abs(log.times[1] - .375) < 1e-8);
    assert(std::abs(log.times[2] - .5) < 1e-8);
    // Four ratchets distribute across the actual swung duration of the step.
    d.patterns[0].steps[0][0].ratchets = 4;
    q.reset();
    log = {};
    run(q, log, 0, .375, .0001, .5f);
    assert(log.count == 4);
    for (int i = 0; i < 4; ++i)
        assert(std::abs(log.times[i] - i * .09375) < .000101);
    d = {};
    d.chainLength = 2;
    d.chain[0] = 0;
    d.chain[1] = 1;
    d.patterns[0].length = 3;
    d.patterns[1].length = 5;
    for (int p = 0; p < 2; ++p)
        for (int s = 0; s < d.patterns[p].length; ++s)
            d.patterns[p].steps[p][s].on = true;
    q.reset();
    log = {};
    run(q, log, 0, 4, .001, .5f, true);
    assert(log.count == 16);
    for (int i = 0; i < 16; ++i)
        assert(log.voices[i] == ((i % 8) < 3 ? 0 : 1));
    assert(std::abs(log.times[3] - .75) < 1e-8);
    assert(std::abs(log.times[8] - 2) < 1e-8);
    // Probability selection is deterministic for transport replays and shared
    // across all ratchets of one hit. 0 and 1 are exact, .5 varies across loops.
    d = {};
    d.patterns[0].length = 1;
    d.patterns[0].steps[0][0] = {true, .7f, .5f, 4};
    d.patterns[0].steps[1][0] = {true, .7f, 0.f, 1};
    q.reset();
    log = {};
    run(q, log, 0, 20, .001);
    const Log first = log;
    assert(log.count > 80 && log.count < 240);
    assert(log.count % 4 == 0);
    q.reset();
    log = {};
    run(q, log, 0, 20, .001);
    assert(log.count == first.count);
    for (int i = 0; i < log.count; ++i) {
        assert(log.times[i] == first.times[i]);
        assert(log.voices[i] == 0);
    }
    allocations = 0;
    watchAlloc = true;
    q.reset();
    log = {};
    run(q, log, 0, 1, .001);
    watchAlloc = false;
    assert(allocations == 0);
    q.process(NAN, .001, true, 0, false, 0, &log, hit);
    assert(q.currentStep() == -1);
    std::cout << "Sequencer: tempo/rate, seeks/loops, swing/ratchets, variable chains, probability "
                 "and allocation tests passed\n";
}
