// SPDX-License-Identifier: AGPL-3.0-only
#include "PluginEditor.h"
#include <cmath>
namespace {
const juce::Colour cream(0xffe7e0cf), ink(0xff232724), panel(0xff313733), muted(0xffaeb4a5),
    amber(0xffefa23a), red(0xffdc6547);
void text(juce::Graphics &g, const juce::String &s, juce::Rectangle<int> r, float size,
          juce::Colour c, juce::Justification j = juce::Justification::centredLeft) {
    g.setColour(c);
    g.setFont(juce::FontOptions(size));
    g.drawText(s, r, j);
}
juce::String voiceName(AfterglowProcessor &processor, int voice) {
    const auto model = processor.parameters.getRawParameterValue(
        AfterglowProcessor::voiceId(voice, "model"));
    if (model != nullptr && model->load() == 1.f) {
        if (voice == 9)
            return "Cymbal";
        if (voice == 10)
            return "Cowbell";
    }
    return AfterglowProcessor::voiceNames[(size_t)voice];
}
void formatSlider(juce::Slider &slider, int decimals) {
    slider.textFromValueFunction = [decimals](double value) {
        return juce::String(value, decimals);
    };
    slider.valueFromTextFunction = [](const juce::String &value) {
        return value.getDoubleValue();
    };
    slider.updateText();
}
} // namespace
AfterglowEditor::Style::Style() {
    setColour(juce::Slider::textBoxTextColourId, cream);
    setColour(juce::Slider::textBoxOutlineColourId, juce::Colours::transparentBlack);
    setColour(juce::ComboBox::backgroundColourId, ink);
    setColour(juce::ComboBox::textColourId, cream);
    setColour(juce::ComboBox::outlineColourId, muted.withAlpha(.3f));
    setColour(juce::PopupMenu::backgroundColourId, ink);
    setColour(juce::PopupMenu::textColourId, cream);
    setColour(juce::TextButton::textColourOffId, cream);
    setColour(juce::TextButton::textColourOnId, ink);
    setColour(juce::TextEditor::backgroundColourId, ink);
    setColour(juce::TextEditor::textColourId, cream);
    setColour(juce::Label::textColourId, cream);
}
juce::Font AfterglowEditor::Style::getTextButtonFont(juce::TextButton &button, int) {
    return juce::Font(juce::FontOptions(button.getWidth() < 40 ? 11.f : 12.f));
}
void AfterglowEditor::Style::drawButtonText(juce::Graphics &g, juce::TextButton &button,
                                            bool, bool) {
    g.setFont(getTextButtonFont(button, button.getHeight()));
    g.setColour(button.getToggleState() ? ink : cream);
    g.drawText(button.getButtonText(), button.getLocalBounds().reduced(3, 1),
               juce::Justification::centred);
}
void AfterglowEditor::Style::drawButtonBackground(juce::Graphics &g, juce::Button &b,
                                                  const juce::Colour &, bool over, bool down) {
    auto r = b.getLocalBounds().toFloat().reduced(1);
    auto c = b.getToggleState() ? amber : panel;
    g.setColour(down ? c.darker(.15f) : (over ? c.brighter(.15f) : c));
    g.fillRoundedRectangle(r, 4);
    g.setColour(b.getToggleState() ? amber.brighter(.2f) : muted.withAlpha(.28f));
    g.drawRoundedRectangle(r, 4, 1);
}
void AfterglowEditor::Style::drawRotarySlider(juce::Graphics &g, int x, int y, int w, int h,
                                              float pos, float start, float end, juce::Slider &) {
    auto r = juce::Rectangle<float>((float)x, (float)y, (float)w, (float)h).reduced(5);
    auto d = juce::jmin(r.getWidth(), r.getHeight());
    r = r.withSizeKeepingCentre(d, d);
    juce::Path arc;
    arc.addCentredArc(r.getCentreX(), r.getCentreY(), d * .47f, d * .47f, 0, start,
                      start + pos * (end - start), true);
    g.setColour(amber);
    g.strokePath(arc, juce::PathStrokeType(2.5f));
    auto inner = r.reduced(5);
    g.setColour(juce::Colour(0xff141a17));
    g.fillEllipse(inner.translated(0, 2));
    g.setColour(juce::Colour(0xff555b50));
    g.fillEllipse(inner);
    g.setColour(cream);
    float a = start + pos * (end - start);
    auto c = r.getCentre();
    g.drawLine(c.x + std::sin(a) * d * .15f, c.y - std::cos(a) * d * .15f,
               c.x + std::sin(a) * d * .32f, c.y - std::cos(a) * d * .32f, 2);
}
AfterglowEditor::Knob::Knob(const juce::String &name) {
    title.setText(name, juce::dontSendNotification);
    title.setJustificationType(juce::Justification::centred);
    title.setFont(juce::FontOptions(10.f));
    slider.setSliderStyle(juce::Slider::RotaryHorizontalVerticalDrag);
    slider.setTextBoxStyle(juce::Slider::TextBoxBelow, false, 72, 18);
    addAndMakeVisible(title);
    addAndMakeVisible(slider);
}
void AfterglowEditor::Knob::resized() {
    auto r = getLocalBounds();
    title.setBounds(r.removeFromTop(17));
    slider.setBounds(r);
}
AfterglowEditor::Grid::Grid(AfterglowEditor &e) : owner(e) {
    setMouseCursor(juce::MouseCursor::PointingHandCursor);
}
void AfterglowEditor::Grid::paint(juce::Graphics &g) {
    const float label = 136.f, row = (getHeight() - 22.f) / 11.f,
                cell = (getWidth() - label) / 16.f;
    auto &pat = owner.cached.patterns[(size_t)owner.currentPattern()];
    int play = owner.processor.displayedStep.load();
    for (int s = 0; s < 16; ++s) {
        int absolute = owner.page * 16 + s;
        auto r = juce::Rectangle<int>((int)(label + s * cell), 0, (int)cell, 20);
        text(g, juce::String(absolute + 1), r, 11, absolute == play ? amber : muted,
             juce::Justification::centred);
    }
    for (int v = 0; v < 11; ++v) {
        float y = 22 + v * row;
        bool selected = v == owner.selectedVoice;
        g.setColour(selected ? amber.withAlpha(.13f) : panel.withAlpha(.5f));
        g.fillRoundedRectangle(0, y + 1, (float)getWidth(), row - 2, 3);
        text(g, voiceName(owner.processor, v), {12, (int)y, 120, (int)row}, 12,
             selected ? amber : cream);
        for (int s = 0; s < 16; ++s) {
            int abs = owner.page * 16 + s;
            auto st = pat.steps[(size_t)v][(size_t)abs];
            auto r = juce::Rectangle<float>(label + s * cell + 3, y + 4, cell - 6, row - 8);
            bool enabled = abs < pat.length;
            g.setColour(st.on ? (s % 4 == 0 ? red : amber)
                                    .withAlpha(enabled ? (.45f + .55f * st.velocity) : .2f)
                              : juce::Colour(s % 4 == 0 ? 0xff51574b : 0xff41473e)
                                    .withAlpha(enabled ? 1.f : .25f));
            g.fillRoundedRectangle(r, 3);
            if (st.on && st.ratchets > 1)
                text(g, juce::String(st.ratchets), r.toNearestInt(), 10, ink,
                     juce::Justification::centred);
            if (st.on && st.probability < .999f) {
                g.setColour(ink.withAlpha(.55f));
                g.fillRect(r.getX() + 3, r.getBottom() - 4, (r.getWidth() - 6) * st.probability,
                           2.f);
            }
            if (abs == play && owner.processor.transportRunning.load() &&
                owner.processor.displayedPattern.load() == owner.currentPattern()) {
                g.setColour(cream);
                g.drawRoundedRectangle(r, 3, 1.8f);
            }
            if (selected && abs == owner.selectedStep) {
                g.setColour(cream);
                g.drawRoundedRectangle(r.expanded(2), 4, 1);
            }
        }
    }
}
void AfterglowEditor::Grid::mouseDown(const juce::MouseEvent &e) {
    int v = juce::jlimit(0, 10, (int)((e.y - 22) / ((getHeight() - 22.f) / 11.f)));
    if (e.y < 22)
        return;
    if (e.x < 136) {
        owner.selectVoice(v);
        if (e.mods.isPopupMenu())
            owner.processor.audition(v);
        return;
    }
    int s = juce::jlimit(0, 15, (int)((e.x - 136) / ((getWidth() - 136.f) / 16.f)));
    owner.selectStep(v, owner.page * 16 + s, !e.mods.isPopupMenu());
}
AfterglowEditor::AfterglowEditor(AfterglowProcessor &p)
    : AudioProcessorEditor(p), grid(*this), processor(p) {
    setLookAndFeel(&style);
    auto add = [this](juce::Component &c) { addAndMakeVisible(c); };
    for (auto *b : {&sync, &run, &song, &copy, &paste, &clear, &random, &save, &load, &exportMidi,
                    &audition, &browse, &removeSample, &mute, &solo, &reverse, &applyChain})
        add(*b);
    for (auto *b : {&sync, &run, &song, &mute, &solo, &reverse})
        b->setClickingTogglesState(true);
    for (auto *k : {&bpm, &swing, &master, &drive, &velocity, &probability, &ratchets})
        add(*k);
    for (auto *c :
         std::initializer_list<juce::Component *>{&grid, &model, &chain, &status, &sampleLabel,
                                                  &voiceLabel, &chainLabel, &length, &lengthLabel})
        add(*c);
    globalSliders.emplace_back(std::make_unique<SliderAttachment>(p.parameters, "bpm", bpm.slider));
    globalSliders.emplace_back(
        std::make_unique<SliderAttachment>(p.parameters, "swing", swing.slider));
    globalSliders.emplace_back(
        std::make_unique<SliderAttachment>(p.parameters, "master", master.slider));
    globalSliders.emplace_back(
        std::make_unique<SliderAttachment>(p.parameters, "drive", drive.slider));
    formatSlider(bpm.slider, 1);
    formatSlider(swing.slider, 2);
    formatSlider(master.slider, 2);
    formatSlider(drive.slider, 2);
    globalButtons.emplace_back(std::make_unique<ButtonAttachment>(p.parameters, "sync", sync));
    globalButtons.emplace_back(std::make_unique<ButtonAttachment>(p.parameters, "run", run));
    globalButtons.emplace_back(std::make_unique<ButtonAttachment>(p.parameters, "song", song));
    const char *names[] = {"TUNE / ST", "DECAY", "TONE", "LEVEL", "PAN", "DRIVE", "START", "END"};
    for (auto name : names) {
        voiceKnobs.push_back(std::make_unique<Knob>(name));
        add(*voiceKnobs.back());
    }
    model.addItemList({"TR-909 inspired", "TR-808 inspired", "Your sample"}, 1);
    for (int i = 0; i < 16; ++i) {
        auto &b = patterns[(size_t)i];
        add(b);
        b.setButtonText(juce::String(i + 1));
        b.onClick = [this, i] {
            auto *param = processor.parameters.getParameter("pattern");
            param->beginChangeGesture();
            param->setValueNotifyingHost(param->convertTo0to1((float)i));
            param->endChangeGesture();
            cached = processor.sequenceCopy();
            updateInspector();
        };
    }
    for (int i = 0; i < 4; ++i) {
        auto &b = pages[(size_t)i];
        add(b);
        b.setButtonText(juce::String(i * 16 + 1) + "-" + juce::String(i * 16 + 16));
        b.onClick = [this, i] {
            page = i;
            selectedStep = i * 16;
            updateInspector();
        };
    }
    length.setSliderStyle(juce::Slider::IncDecButtons);
    length.setTextBoxStyle(juce::Slider::TextBoxLeft, false, 42, 24);
    length.setRange(1, 64, 1);
    lengthLabel.setText("LENGTH", juce::dontSendNotification);
    lengthLabel.setFont(juce::FontOptions(10.f));
    length.onValueChange = [this] {
        if (!refreshing) {
            processor.setPatternLength(currentPattern(), (int)length.getValue());
            cached = processor.sequenceCopy();
            grid.repaint();
        }
    };
    velocity.slider.setRange(.01, 1, .01);
    probability.slider.setRange(0, 1, .01);
    ratchets.slider.setRange(1, 4, 1);
    for (auto *k : {&velocity, &probability, &ratchets})
        k->slider.onValueChange = [this] { writeStep(); };
    copy.onClick = [this] {
        copiedPattern = currentPattern();
        clipboard = processor.sequenceCopy().patterns[(size_t)copiedPattern];
        message("Pattern " + juce::String(copiedPattern + 1) +
                " copied. Select a destination, then PASTE.");
    };
    paste.onClick = [this] {
        if (copiedPattern >= 0) {
            processor.replacePattern(currentPattern(), clipboard);
            cached = processor.sequenceCopy();
            updateInspector();
            message("Pattern pasted.");
        }
    };
    clear.onClick = [this] {
        processor.clearPattern(currentPattern());
        cached = processor.sequenceCopy();
        updateInspector();
        message("Pattern cleared.");
    };
    random.onClick = [this] {
        processor.randomizePattern(currentPattern(), selectedVoice);
        cached = processor.sequenceCopy();
        updateInspector();
        message("New variation for selected voice.");
    };
    audition.onClick = [this] { processor.audition(selectedVoice); };
    browse.onClick = [this] { chooseFile(0); };
    removeSample.onClick = [this] {
        processor.clearSample(selectedVoice);
        sampleLabel.setText(processor.sampleName(selectedVoice), juce::dontSendNotification);
        message("Sample removed; select a synthesis model to use the built-in voice.");
    };
    save.onClick = [this] { chooseFile(1); };
    load.onClick = [this] { chooseFile(2); };
    exportMidi.onClick = [this] { chooseFile(3); };
    chainLabel.setText("SONG CHAIN", juce::dontSendNotification);
    chainLabel.setFont(juce::FontOptions(10.f));
    chain.setTextToShowWhenEmpty("1, 1, 2, 4", muted);
    chain.setTooltip(
        "Comma-separated pattern numbers 1-16. Up to 64 entries. Apply, then enable CHAIN.");
    applyChain.onClick = [this] {
        auto tokens = juce::StringArray::fromTokens(chain.getText(), ", ", "");
        std::vector<int> values;
        for (auto t : tokens) {
            if (t.isEmpty())
                continue;
            auto n = t.getIntValue();
            if (n < 1 || n > 16 || !t.containsOnly("0123456789")) {
                message("Chain needs pattern numbers 1-16, separated by commas.");
                return;
            }
            values.push_back(n - 1);
        }
        if (values.empty() || values.size() > 64) {
            message("Enter 1-64 pattern numbers.");
            return;
        }
        processor.setChain(values);
        message("Song chain applied.");
    };
    sync.setTooltip("HOST follows your DAW transport and tempo. Turn off HOST and enable RUN for "
                    "the internal clock.");
    run.setTooltip("Internal clock run/stop (HOST must be off).");
    grid.setTooltip("Click a key to toggle. Right-click to select without toggling. Click a voice "
                    "name to edit; right-click its name to audition.");
    random.setTooltip("Replace only the selected voice's steps with a generated variation.");
    clear.setTooltip("Clear every voice in the current pattern.");
    cached = processor.sequenceCopy();
    juce::StringArray items;
    for (int i = 0; i < cached.chainLength; ++i)
        items.add(juce::String(cached.chain[(size_t)i] + 1));
    chain.setText(items.joinIntoString(", "));
    setResizable(true, true);
    setResizeLimits(1060, 760, 1770, 1200);
    setSize(1180, 800);
    selectVoice(0);
    message("Ready / HOST follows Live transport / Right-click a step to edit velocity, chance and "
            "repeats.");
    startTimerHz(25);
}
AfterglowEditor::~AfterglowEditor() {
    stopTimer();
    setLookAndFeel(nullptr);
}
int AfterglowEditor::currentPattern() const {
    return juce::jlimit(0, 15, (int)processor.parameters.getRawParameterValue("pattern")->load());
}
void AfterglowEditor::selectVoice(int v) {
    selectedVoice = v;
    voiceSliders.clear();
    voiceButtons.clear();
    modelAttachment.reset();
    const char *ids[] = {"tune", "decay", "tone",        "level",
                         "pan",  "drive", "sampleStart", "sampleEnd"};
    for (int i = 0; i < 8; ++i)
        voiceSliders.emplace_back(std::make_unique<SliderAttachment>(
            processor.parameters, AfterglowProcessor::voiceId(v, ids[i]),
            voiceKnobs[(size_t)i]->slider));
    for (int i = 0; i < 8; ++i)
        formatSlider(voiceKnobs[(size_t)i]->slider, i == 0 ? 1 : 2);
    for (auto pair : {std::make_pair(&mute, "mute"), std::make_pair(&solo, "solo"),
                      std::make_pair(&reverse, "reverse")})
        voiceButtons.emplace_back(std::make_unique<ButtonAttachment>(
            processor.parameters, AfterglowProcessor::voiceId(v, pair.second), *pair.first));
    modelAttachment = std::make_unique<ComboAttachment>(
        processor.parameters, AfterglowProcessor::voiceId(v, "model"), model);
    voiceLabel.setText(voiceName(processor, v).toUpperCase(),
                       juce::dontSendNotification);
    sampleLabel.setText(processor.sampleName(v).isEmpty() ? "Drop WAV / AIFF / FLAC here"
                                                          : processor.sampleName(v),
                        juce::dontSendNotification);
    updateInspector();
}
void AfterglowEditor::selectStep(int v, int s, bool toggle) {
    selectedStep = s;
    if (selectedVoice != v)
        selectVoice(v);
    if (toggle) {
        auto st = cached.patterns[(size_t)currentPattern()].steps[(size_t)v][(size_t)s];
        st.on = !st.on;
        processor.setStep(currentPattern(), v, s, st);
        cached = processor.sequenceCopy();
    }
    updateInspector();
}
void AfterglowEditor::updateInspector() {
    refreshing = true;
    auto &pat = cached.patterns[(size_t)currentPattern()];
    auto st = pat.steps[(size_t)selectedVoice][(size_t)selectedStep];
    length.setValue(pat.length, juce::dontSendNotification);
    velocity.slider.setValue(st.velocity, juce::dontSendNotification);
    probability.slider.setValue(st.probability, juce::dontSendNotification);
    ratchets.slider.setValue(st.ratchets, juce::dontSendNotification);
    for (int i = 0; i < 16; ++i)
        patterns[(size_t)i].setToggleState(i == currentPattern(), juce::dontSendNotification);
    for (int i = 0; i < 4; ++i)
        pages[(size_t)i].setToggleState(i == page, juce::dontSendNotification);
    refreshing = false;
    grid.repaint();
    repaint();
}
void AfterglowEditor::writeStep() {
    if (refreshing)
        return;
    auto st = cached.patterns[(size_t)currentPattern()]
                  .steps[(size_t)selectedVoice][(size_t)selectedStep];
    st.velocity = (float)velocity.slider.getValue();
    st.probability = (float)probability.slider.getValue();
    st.ratchets = (int)ratchets.slider.getValue();
    processor.setStep(currentPattern(), selectedVoice, selectedStep, st);
    cached = processor.sequenceCopy();
    grid.repaint();
}
void AfterglowEditor::message(const juce::String &s) {
    status.setText(s, juce::dontSendNotification);
}
bool AfterglowEditor::isInterestedInFileDrag(const juce::StringArray &files) {
    return files.size() == 1 && juce::File(files[0]).hasFileExtension("wav;aif;aiff;flac");
}
void AfterglowEditor::filesDropped(const juce::StringArray &files, int, int) {
    if (isInterestedInFileDrag(files))
        loadSampleFile(juce::File(files[0]));
}
void AfterglowEditor::loadSampleFile(const juce::File &f) {
    auto result = processor.loadSample(selectedVoice, f);
    message(result.wasOk() ? "Loaded " + f.getFileName() + " into " +
                                 voiceName(processor, selectedVoice)
                           : result.getErrorMessage());
    selectVoice(selectedVoice);
}
void AfterglowEditor::chooseFile(int action) {
    juce::String title = action == 0   ? "Choose a drum sample"
                         : action == 1 ? "Save Afterglow kit"
                         : action == 2 ? "Load Afterglow kit"
                                       : "Export current pattern as MIDI";
    juce::String ext = action == 0   ? "*.wav;*.aif;*.aiff;*.flac"
                       : action == 3 ? "*.mid"
                                     : "*.afterglow";
    chooser = std::make_unique<juce::FileChooser>(title, juce::File{}, ext);
    int flags = (action == 1 || action == 3) ? juce::FileBrowserComponent::saveMode |
                                                   juce::FileBrowserComponent::warnAboutOverwriting
                                             : juce::FileBrowserComponent::openMode;
    flags |= juce::FileBrowserComponent::canSelectFiles;
    auto safe = juce::Component::SafePointer<AfterglowEditor>(this);
    const int targetVoice = selectedVoice, targetPattern = currentPattern();
    chooser->launchAsync(flags, [safe, action, targetVoice,
                                 targetPattern](const juce::FileChooser &fc) {
        if (!safe)
            return;
        auto f = fc.getResult();
        if (f == juce::File{})
            return;
        if (action == 0) {
            auto result = safe->processor.loadSample(targetVoice, f);
            safe->message(result.wasOk() ? "Loaded " + f.getFileName() + " into " +
                                               voiceName(safe->processor, targetVoice)
                                         : result.getErrorMessage());
            safe->selectVoice(safe->selectedVoice);
            return;
        }
        if (action == 1 || action == 3)
            f = f.withFileExtension(action == 3 ? "mid" : "afterglow");
        auto result = action == 1   ? safe->processor.savePreset(f)
                      : action == 2 ? safe->processor.loadPreset(f)
                                    : safe->processor.exportMidi(f, targetPattern);
        safe->message(result.wasOk() ? "Done / " + f.getFileName() : result.getErrorMessage());
        if (action == 2 && result.wasOk()) {
            safe->cached = safe->processor.sequenceCopy();
            safe->selectVoice(safe->selectedVoice);
            juce::StringArray items;
            for (int i = 0; i < safe->cached.chainLength; ++i)
                items.add(juce::String(safe->cached.chain[(size_t)i] + 1));
            safe->chain.setText(items.joinIntoString(", "));
        }
    });
}
void AfterglowEditor::timerCallback() {
    const auto before = cached.patterns[(size_t)currentPattern()]
                            .steps[(size_t)selectedVoice][(size_t)selectedStep];
    const auto oldChain = cached.chain;
    const auto oldLength = cached.chainLength;
    cached = processor.sequenceCopy();
    const auto after = cached.patterns[(size_t)currentPattern()]
                           .steps[(size_t)selectedVoice][(size_t)selectedStep];
    const bool stepChanged = before.on != after.on || before.velocity != after.velocity ||
                             before.probability != after.probability ||
                             before.ratchets != after.ratchets;
    if (lastPattern != currentPattern() ||
        (stepChanged && !velocity.slider.isMouseButtonDown() &&
         !probability.slider.isMouseButtonDown() && !ratchets.slider.isMouseButtonDown())) {
        lastPattern = currentPattern();
        updateInspector();
    }
    if (!chain.hasKeyboardFocus(true) &&
        (oldLength != cached.chainLength || oldChain != cached.chain)) {
        juce::StringArray items;
        for (int i = 0; i < cached.chainLength; ++i)
            items.add(juce::String(cached.chain[(size_t)i] + 1));
        chain.setText(items.joinIntoString(", "));
    }
    voiceLabel.setText(voiceName(processor, selectedVoice).toUpperCase(),
                       juce::dontSendNotification);
    auto sample = processor.sampleName(selectedVoice);
    sampleLabel.setText(sample.isEmpty() ? "Drop WAV / AIFF / FLAC here" : sample,
                        juce::dontSendNotification);
    if (!length.isMouseButtonDown())
        length.setValue(cached.patterns[(size_t)currentPattern()].length,
                        juce::dontSendNotification);
    for (int i = 0; i < 16; ++i)
        patterns[(size_t)i].setToggleState(i == currentPattern(), juce::dontSendNotification);
    grid.repaint();
    repaint(0, 0, getWidth(), 66);
}
void AfterglowEditor::paint(juce::Graphics &g) {
    g.fillAll(ink);
    float sx = getWidth() / 1180.f, sy = getHeight() / 800.f;
    g.addTransform(juce::AffineTransform::scale(sx, sy));
    g.setColour(cream);
    g.fillRect(0, 0, 1180, 66);
    text(g, "AFTERGLOW", {24, 8, 320, 36}, 30, ink);
    text(g, "RHYTHM COMPOSER  /  909 / 808 / SAMPLE", {26, 43, 460, 16}, 10, ink.withAlpha(.7f));
    text(g, "01  /  INSTRUMENT", {886, 12, 270, 18}, 12, ink, juce::Justification::centredRight);
    bool running = processor.transportRunning.load();
    auto transport = running
                         ? ">  PLAYING  /  PAT " +
                               juce::String(processor.displayedPattern.load() + 1) +
                               "  /  STEP " + juce::String(processor.displayedStep.load() + 1)
                         : juce::String("-  STOPPED");
    text(g, transport, {805, 35, 290, 18}, 11,
         running ? juce::Colour(0xff46734e) : ink, juce::Justification::centredRight);
    g.setColour(panel);
    g.fillRoundedRectangle(18, 74, 1144, 98, 6);
    g.fillRoundedRectangle(18, 531, 1144, 188, 6);
    g.setColour(muted.withAlpha(.3f));
    g.drawLine(18, 219, 1162, 219);
    g.drawLine(18, 768, 1162, 768);
    text(g, "STEP " + juce::String(selectedStep + 1), {892, 580, 246, 16}, 11, amber);
    text(g, "PATTERN", {24, 181, 64, 22}, 10, muted);
    float peak = juce::jlimit(0.f, 1.f, processor.peak.load());
    g.setColour(ink.withAlpha(.2f));
    g.fillRect(1112, 37, 43, 8);
    g.setColour(peak > .95f ? red : juce::Colour(0xff46734e));
    g.fillRect(1112.f, 37.f, 43.f * peak, 8.f);
}
void AfterglowEditor::resized() {
    float sx = getWidth() / 1180.f, sy = getHeight() / 800.f;
    auto place = [&](juce::Component &c, int x, int y, int w, int h) {
        c.setBounds(juce::roundToInt(x * sx), juce::roundToInt(y * sy), juce::roundToInt(w * sx),
                    juce::roundToInt(h * sy));
    };
    place(sync, 30, 92, 78, 30);
    place(run, 114, 92, 78, 30);
    place(song, 30, 129, 162, 27);
    place(bpm, 211, 80, 92, 86);
    place(swing, 310, 80, 92, 86);
    place(master, 413, 80, 92, 86);
    place(drive, 512, 80, 92, 86);
    place(save, 650, 90, 144, 30);
    place(load, 803, 90, 144, 30);
    place(exportMidi, 956, 90, 190, 30);
    place(chainLabel, 650, 130, 90, 24);
    place(chain, 744, 130, 320, 26);
    place(applyChain, 1070, 130, 76, 26);
    for (int i = 0; i < 16; ++i)
        place(patterns[(size_t)i], 92 + i * 33, 180, 30, 28);
    place(lengthLabel, 632, 181, 52, 24);
    place(length, 684, 180, 88, 28);
    place(copy, 789, 180, 65, 28);
    place(paste, 860, 180, 65, 28);
    place(clear, 931, 180, 65, 28);
    place(random, 1002, 180, 144, 28);
    place(grid, 24, 228, 1126, 290);
    place(voiceLabel, 30, 537, 165, 28);
    voiceLabel.setFont(juce::FontOptions(17.f));
    place(model, 199, 539, 169, 27);
    place(audition, 377, 539, 95, 27);
    place(mute, 480, 539, 64, 27);
    place(solo, 551, 539, 64, 27);
    place(reverse, 622, 539, 87, 27);
    place(browse, 722, 539, 135, 27);
    place(removeSample, 865, 539, 132, 27);
    place(sampleLabel, 30, 689, 827, 22);
    sampleLabel.setFont(juce::FontOptions(11.f));
    for (int i = 0; i < 8; ++i)
        place(*voiceKnobs[(size_t)i], 27 + i * 105, 578, 98, 108);
    place(velocity, 889, 600, 84, 103);
    place(probability, 978, 600, 84, 103);
    place(ratchets, 1067, 600, 84, 103);
    for (int i = 0; i < 4; ++i)
        place(pages[(size_t)i], 30 + i * 108, 734, 101, 26);
    place(status, 24, 772, 1120, 22);
    status.setFont(juce::FontOptions(11.f));
}
