// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "DrumEngine.h"
#include "Sequencer.h"
#include <JuceHeader.h>
#include <array>
#include <atomic>
#include <memory>
#include <vector>

class AfterglowProcessor : public juce::AudioProcessor {
  public:
    AfterglowProcessor();
    ~AfterglowProcessor() override;
    void prepareToPlay(double, int) override;
    void releaseResources() override {}
    void processBlock(juce::AudioBuffer<float> &, juce::MidiBuffer &) override;
    bool isBusesLayoutSupported(const BusesLayout &) const override;
    juce::AudioProcessorEditor *createEditor() override;
    bool hasEditor() const override { return true; }
    const juce::String getName() const override { return "Afterglow"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    double getTailLengthSeconds() const override { return 40; }
    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return "Afterglow Kit"; }
    void changeProgramName(int, const juce::String &) override {}
    void getStateInformation(juce::MemoryBlock &) override;
    void setStateInformation(const void *, int) override;

    juce::AudioProcessorValueTreeState parameters;
    static juce::String voiceId(int voice, const juce::String &suffix);
    static const std::array<const char *, 11> voiceNames;
    static const std::array<int, 11> midiNotes;
    ag::SequenceData sequenceCopy() const;
    void setStep(int pattern, int voice, int step, ag::Step);
    void setPatternLength(int pattern, int length);
    void clearPattern(int pattern);
    void copyPattern(int from, int to);
    void replacePattern(int index, const ag::Pattern &);
    void randomizePattern(int pattern, int voice); // voice -1 = all
    void setChain(const std::vector<int> &patterns);
    void restoreFactoryPatterns();
    juce::Result loadSample(int voice, const juce::File &);
    void clearSample(int voice);
    juce::String sampleName(int voice) const;
    void audition(int voice);
    juce::Result savePreset(const juce::File &);
    juce::Result loadPreset(const juce::File &);
    juce::Result exportMidi(const juce::File &, int pattern) const;
    std::atomic<int> displayedStep{-1}, displayedPattern{0};
    std::atomic<float> peak{0};
    std::atomic<bool> transportRunning{false};

  private:
    struct Snapshot {
        ag::SequenceData sequence;
        std::array<std::shared_ptr<const ag::SampleData>, 11> samples;
        std::array<juce::String, 11> sampleNames;
    };
    mutable juce::CriticalSection editLock;
    std::vector<std::unique_ptr<Snapshot>> snapshots;
    std::atomic<const Snapshot *> published{nullptr};
    std::atomic<const Snapshot *> audioSnapshot{nullptr};
    const Snapshot *active = nullptr;
    void publish(std::unique_ptr<Snapshot>);
    std::unique_ptr<Snapshot> copySnapshot() const;
    void editSequence(const std::function<void(ag::SequenceData &)> &);
    bool restoreState(const void *, int);
    static juce::AudioProcessorValueTreeState::ParameterLayout makeParameters();
    float param(const juce::String &) const;
    struct ParamRefs {
        std::array<std::atomic<float> *, 13> p{};
    };
    std::array<ParamRefs, 11> voiceRefs;
    std::array<std::atomic<float> *, 8> globalRefs{};
    ag::DrumEngine engine;
    ag::Sequencer sequencer;
    juce::SmoothedValue<float> masterSmooth, driveSmooth;
    juce::AudioFormatManager formats;
    std::atomic<unsigned> pendingAuditions{0};
    double sampleRateHz = 44100, internalPpq = 0;
    bool previousPlaying = false;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AfterglowProcessor)
};
