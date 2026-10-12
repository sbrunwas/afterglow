// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include <array>
#include <cstdint>

namespace ag {
constexpr int kVoices = 11, kPatterns = 16, kSteps = 64;
struct Step {
    bool on = false;
    float velocity = .8f, probability = 1.f;
    int ratchets = 1;
};
struct Pattern {
    std::array<std::array<Step, kSteps>, kVoices> steps{};
    int length = 16;
};
struct SequenceData {
    std::array<Pattern, kPatterns> patterns{};
    std::array<int, kSteps> chain{};
    int chainLength = 1;
};

// Data must remain alive and immutable throughout process(). Swap snapshots outside
// the audio callback, or use an owner-provided lock-free snapshot mechanism.
class Sequencer {
  public:
    // Replacing an immutable snapshot preserves transport phase. Call reset()
    // explicitly when restarting transport; edits must not suppress boundaries.
    void setData(const SequenceData *data) noexcept {
        data_ = data;
        if (!data)
            reset();
    }
    void reset() noexcept;
    // Called once per sample. PPQ is the absolute host position at that sample.
    // Events fire on the first sample at/after their musical boundary. Starting
    // between boundaries waits for the next event; seeks do not replay old hits.
    void process(double ppq, double ppqPerSample, bool playing, int selectedPattern, bool songMode,
                 float swing, void *context, void (*trigger)(void *, int, float)) noexcept;
    int currentStep() const noexcept { return step_; }
    int currentPattern() const noexcept { return pattern_; }
    static SequenceData factoryPatterns();

  private:
    const SequenceData *data_ = nullptr;
    double lastPpq_ = 0, lastIncrement_ = 0;
    bool started_ = false, lastSong_ = false;
    int lastSelected_ = 0, step_ = -1, pattern_ = 0;
    float lastSwing_ = 0;
};
} // namespace ag
