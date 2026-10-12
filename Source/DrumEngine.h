// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "third_party/DaisySP/Drums/analogbassdrum.h"
#include "third_party/DaisySP/Drums/analogsnaredrum.h"
#include "third_party/DaisySP/Drums/synthbassdrum.h"
#include "third_party/DaisySP/Drums/synthsnaredrum.h"
#include <array>
#include <cstdint>
#include <vector>

namespace ag {
enum class Model { Nine = 0, Eight = 1, Sample = 2 };
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
        std::array<double, 6> phase{};
        double age = 0, position = 0, start = 0, end = 0, rate = 1;
        float velocity = 0, env = 0, envMul = .999f, pitchEnv = 0, pitchMul = .99f;
        float low = 0, highLow = 0, highLow2 = 0, filterA = .5f, filterB = .2f;
        float gate = 0, targetGate = 1, gain = .8f, panL = .7071f, panR = .7071f;
        float oldL = 0, oldR = 0, fadeL = 0, fadeR = 0, fade = 0;
        float dcL = 0, dcR = 0, prevL = 0, prevR = 0;
        bool active = false;
        uint32_t rng = 0x127ab51u;
    };
    double sr = 44100;
    std::array<Voice, numVoices> voices{};
    daisysp::SyntheticBassDrum nineKick;
    daisysp::SyntheticSnareDrum nineSnare;
    daisysp::AnalogBassDrum eightKick;
    daisysp::AnalogSnareDrum eightSnare;
    float smooth = .004f, fadeStep = .02f, dcPole = .998f;
    float synth(int, Voice &);
    float noise(Voice &);
};
} // namespace ag
