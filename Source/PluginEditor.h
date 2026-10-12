// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "PluginProcessor.h"

class AfterglowEditor final : public juce::AudioProcessorEditor,
                              public juce::FileDragAndDropTarget,
                              private juce::Timer {
  public:
    explicit AfterglowEditor(AfterglowProcessor &);
    ~AfterglowEditor() override;
    void paint(juce::Graphics &) override;
    void resized() override;
    bool isInterestedInFileDrag(const juce::StringArray &) override;
    void filesDropped(const juce::StringArray &, int, int) override;

  private:
    struct Style : juce::LookAndFeel_V4 {
        Style();
        juce::Font getTextButtonFont(juce::TextButton &, int) override;
        void drawButtonText(juce::Graphics &, juce::TextButton &, bool, bool) override;
        void drawRotarySlider(juce::Graphics &, int, int, int, int, float, float, float,
                              juce::Slider &) override;
        void drawButtonBackground(juce::Graphics &, juce::Button &, const juce::Colour &, bool,
                                  bool) override;
    } style;
    struct Knob : juce::Component {
        juce::Label title;
        juce::Slider slider;
        explicit Knob(const juce::String &);
        void resized() override;
    };
    struct Grid : juce::Component, juce::SettableTooltipClient {
        AfterglowEditor &owner;
        explicit Grid(AfterglowEditor &);
        void paint(juce::Graphics &) override;
        void mouseDown(const juce::MouseEvent &) override;
    } grid;
    using SliderAttachment = juce::AudioProcessorValueTreeState::SliderAttachment;
    using ButtonAttachment = juce::AudioProcessorValueTreeState::ButtonAttachment;
    using ComboAttachment = juce::AudioProcessorValueTreeState::ComboBoxAttachment;
    AfterglowProcessor &processor;
    juce::TooltipWindow tooltips{this, 600};
    juce::TextButton sync{"HOST"}, run{"RUN"}, song{"CHAIN"};
    juce::TextButton copy{"COPY"}, paste{"PASTE"}, clear{"CLEAR"}, random{"VARY VOICE"};
    juce::TextButton save{"SAVE KIT"}, load{"LOAD KIT"}, exportMidi{"EXPORT MIDI"};
    juce::TextButton audition{"AUDITION"}, browse{"LOAD SAMPLE"}, removeSample{"RESET SAMPLE"};
    juce::TextButton mute{"MUTE"}, solo{"SOLO"}, reverse{"REVERSE"}, applyChain{"APPLY"};
    juce::ComboBox model;
    juce::TextEditor chain;
    juce::Label status, sampleLabel, voiceLabel, chainLabel, lengthLabel;
    juce::Slider length;
    Knob bpm{"TEMPO"}, swing{"SWING"}, master{"MASTER"}, drive{"BUS DRIVE"};
    std::vector<std::unique_ptr<Knob>> voiceKnobs;
    Knob velocity{"VELOCITY"}, probability{"CHANCE"}, ratchets{"REPEATS"};
    std::array<juce::TextButton, 16> patterns;
    std::array<juce::TextButton, 4> pages;
    std::vector<std::unique_ptr<SliderAttachment>> globalSliders, voiceSliders;
    std::vector<std::unique_ptr<ButtonAttachment>> globalButtons, voiceButtons;
    std::unique_ptr<ComboAttachment> modelAttachment;
    std::unique_ptr<juce::FileChooser> chooser;
    int selectedVoice = 0, selectedStep = 0, page = 0, copiedPattern = -1, lastPattern = -1;
    ag::Pattern clipboard;
    bool refreshing = false;
    ag::SequenceData cached;
    int currentPattern() const;
    void selectVoice(int);
    void selectStep(int, int, bool);
    void updateInspector();
    void writeStep();
    void chooseFile(int);
    void loadSampleFile(const juce::File &);
    void message(const juce::String &);
    void timerCallback() override;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AfterglowEditor)
};
