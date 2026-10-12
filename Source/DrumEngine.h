// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "Circuit808.h"
#include "Circuit909.h"
#include "Sampled909.h"
#include "LinnDrum.h"
#include "Perkons.h"
#include <array>
#include <cstdint>
#include <vector>

namespace ag {
enum class Model { Nine = 0, Eight = 1, Sample = 2, Linn = 3, Perkons = 4 };
struct VoiceParams {
    Model model = Model::Nine;
    float tune = 0, decay = .5f, tone = .5f, level = .8f, pan = 0, drive = 0;
    bool mute = false, solo = false, reverse = false;
    float sampleStart = 0, sampleEnd = 1;
};
struct SampleData {
    std::vector<float> left, right;
    double sampleRate = 44100;
};
class DrumEngine {
  public:
    static constexpr int numVoices = 11;
    void prepare(double sampleRate);
    void reset();
    void setParams(int, const VoiceParams &);
    void setSample(int, const SampleData *);
    void trigger(int, float velocity);
    // Writes numVoices samples into each array; caller sums or routes individual voices.
    void renderFrame(float *left, float *right);

  private:
    struct Voice {
        VoiceParams p;
        const SampleData *sample = nullptr;
        Model playingModel = Model::Nine;
        double age = 0, position = 0, start = 0, end = 0, rate = 1;
        float velocity = 0;
        float gate = 0, targetGate = 1, gain = .8f, panL = .7071f, panR = .7071f;
        float oldL = 0, oldR = 0, fadeL = 0, fadeR = 0, fade = 0;
        float dcL = 0, dcR = 0, prevL = 0, prevR = 0;
        bool active = false;
    };
    double sr = 44100;
    std::array<Voice, numVoices> voices{};
    Circuit808 eight;
    Circuit909 nine;
    Sampled909 cymbals;
    LinnDrum linn;
    Perkons perkons;
    float smooth = .004f, fadeStep = .02f, dcPole = .998f;
};
} // namespace ag
