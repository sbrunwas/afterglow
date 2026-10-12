// SPDX-License-Identifier: AGPL-3.0-only
#include "PluginProcessor.h"
#include <atomic>
#include <cmath>
#include <iostream>
#include <limits>
#include <stdexcept>
#include <thread>
#include <vector>

namespace {
void require(bool ok, const char *message) {
    if (!ok)
        throw std::runtime_error(message);
}
void set(AfterglowProcessor &p, const juce::String &id, float actual) {
    auto *parameter = p.parameters.getParameter(id);
    require(parameter != nullptr, "missing parameter");
    parameter->setValueNotifyingHost(parameter->convertTo0to1(actual));
}
float get(AfterglowProcessor &p, const juce::String &id) {
    return p.parameters.getRawParameterValue(id)->load();
}
double energy(const juce::AudioBuffer<float> &b, int from = 0, int to = -1, int channel = 0) {
    double e = 0;
    if (to < 0)
        to = b.getNumSamples();
    for (int i = from; i < to; ++i) {
        auto x = b.getSample(channel, i);
        require(std::isfinite(x), "nonfinite processor output");
        e += x * x;
    }
    return e;
}
struct PlayHead : juce::AudioPlayHead {
    double ppq = 0, bpm = 120;
    bool playing = false;
    juce::Optional<PositionInfo> getPosition() const override {
        PositionInfo p;
        p.setPpqPosition(ppq);
        p.setBpm(bpm);
        p.setIsPlaying(playing);
        return p;
    }
};
void midiTimingAndPanic() {
    AfterglowProcessor p;
    p.prepareToPlay(48000, 512);
    juce::AudioBuffer<float> out(2, 512);
    juce::MidiBuffer midi;
    midi.addEvent(juce::MidiMessage::noteOn(1, 36, .9f), 173);
    p.processBlock(out, midi);
    require(energy(out, 0, 173) == 0, "MIDI fires before timestamp");
    require(energy(out, 174) > 1e-7, "MIDI fails to fire");
    require(midi.isEmpty(), "instrument leaked MIDI");
    midi.addEvent(juce::MidiMessage::allSoundOff(1), 211);
    p.processBlock(out, midi);
    require(energy(out, 0, 211) > 0, "voice disappeared early");
    require(energy(out, 211) == 0, "panic leaves audio");
}
void hostAndBuses() {
    AfterglowProcessor p;
    PlayHead head;
    p.setPlayHead(&head);
    p.clearPattern(0);
    p.setStep(0, 0, 0, {true, .9f, 1, 1});
    p.prepareToPlay(48000, 512);
    juce::AudioBuffer<float> out(2, 512);
    juce::MidiBuffer midi;
    p.processBlock(out, midi);
    require(energy(out) == 0, "stopped host triggers sequencer");
    head.playing = true;
    p.processBlock(out, midi);
    require(energy(out) > 1e-7, "host start silent");
    require(p.transportRunning.load(), "host running state incorrect");
    head.playing = false;
    head.ppq = .02;
    p.processBlock(out, midi);
    require(!p.transportRunning.load(), "host stop ignored");
    require(p.enableAllBuses(), "cannot enable multi-output buses");
    require(p.getTotalNumOutputChannels() == 24, "incorrect output channel count");
    p.prepareToPlay(48000, 512);
    juce::AudioBuffer<float> multi(24, 512);
    midi.addEvent(juce::MidiMessage::noteOn(1, 36, .8f), 0);
    p.processBlock(multi, midi);
    require(energy(multi, 0, -1, 2) > 1e-7, "kick auxiliary silent");
    require(energy(multi, 0, -1, 4) == 0, "kick leaks into snare auxiliary");
    for (int i = 0; i < 512; ++i)
        require(std::abs(multi.getSample(0, i) - .75f * multi.getSample(2, i)) < 1e-6,
                "master/aux routing mismatch");
    require(p.disableNonMainBuses(), "cannot disable aux outputs");
    p.prepareToPlay(48000, 512);
    p.processBlock(out, midi);
}
std::vector<float> renderHost(int blockSize) {
    AfterglowProcessor p;
    PlayHead head;
    head.playing = true;
    p.setPlayHead(&head);
    p.clearPattern(0);
    for (int step = 0; step < 16; ++step)
        p.setStep(0, step % 2, step, {true, .8f, 1, step % 3 + 1});
    set(p, "swing", .28f);
    p.prepareToPlay(48000, blockSize);
    std::vector<float> result;
    result.reserve(48000);
    while (result.size() < 48000) {
        int n = std::min(blockSize, 48000 - int(result.size()));
        head.ppq = double(result.size()) / 24000.;
        juce::AudioBuffer<float> out(2, n);
        juce::MidiBuffer midi;
        p.processBlock(out, midi);
        result.insert(result.end(), out.getReadPointer(0), out.getReadPointer(0) + n);
    }
    return result;
}
void blockSizeIndependence() {
    auto a = renderHost(64), b = renderHost(511);
    require(a.size() == b.size(), "render size mismatch");
    for (size_t i = 0; i < a.size(); ++i)
        require(std::abs(a[i] - b[i]) < 1e-5, "host render changes with block size");
}
void concurrentSnapshots() {
    AfterglowProcessor p;
    p.prepareToPlay(48000, 128);
    set(p, "sync", 0);
    set(p, "run", 1);
    std::atomic<bool> finite{true};
    std::thread audio([&] {
        juce::AudioBuffer<float> out(2, 128);
        juce::MidiBuffer midi;
        for (int block = 0; block < 300; ++block) {
            p.processBlock(out, midi);
            for (int i = 0; i < 128; ++i)
                if (!std::isfinite(out.getSample(0, i)))
                    finite = false;
        }
    });
    for (int n = 0; n < 200; ++n) {
        p.setStep(n % 16, n % 11, n % 64, {true, .8f, 1, 1});
        if (n % 10 == 0)
            p.clearPattern((n + 3) % 16);
    }
    audio.join();
    require(finite.load(), "concurrent editing corrupted audio");
}
juce::File makeSample() {
    auto file = juce::File::getSpecialLocation(juce::File::tempDirectory)
                    .getNonexistentChildFile("afterglow-test", ".wav");
    juce::WavAudioFormat format;
    std::unique_ptr<juce::FileOutputStream> stream(file.createOutputStream());
    require(stream != nullptr, "sample output stream");
    auto *raw = stream.release();
    std::unique_ptr<juce::AudioFormatWriter> writer(
        format.createWriterFor(raw, 48000, 2, 24, {}, 0));
    if (!writer) {
        delete raw;
        throw std::runtime_error("sample writer");
    }
    juce::AudioBuffer<float> data(2, 2400);
    for (int i = 0; i < data.getNumSamples(); ++i) {
        float x = .5f * std::sin(float(i) * .07f);
        data.setSample(0, i, x);
        data.setSample(1, i, -x);
    }
    require(writer->writeFromAudioSampleBuffer(data, 0, data.getNumSamples()), "sample write");
    writer.reset();
    return file;
}
void stateAndSamplePortability() {
    AfterglowProcessor source;
    source.clearPattern(3);
    source.setPatternLength(3, 47);
    source.setStep(3, 9, 46, {true, .37f, .45f, 4});
    source.setChain({3, 7, 3});
    set(source, "swing", .31f);
    set(source, AfterglowProcessor::voiceId(2, "tune"), -7);
    const auto file = makeSample();
    require(source.loadSample(2, file).wasOk(), "load WAV failed");
    juce::MemoryBlock state;
    source.getStateInformation(state);
    require(file.deleteFile(), "remove original sample failed");
    AfterglowProcessor restored;
    restored.setStateInformation(state.getData(), int(state.getSize()));
    auto data = restored.sequenceCopy();
    require(data.patterns[3].length == 47 && data.patterns[3].steps[9][46].on,
            "pattern not restored");
    require(std::abs(data.patterns[3].steps[9][46].velocity - .37f) < 1e-5 &&
                data.patterns[3].steps[9][46].ratchets == 4,
            "step properties lost");
    require(data.chainLength == 3 && data.chain[1] == 7, "chain not restored");
    require(std::abs(get(restored, "swing") - .31f) < 1e-5, "automation not restored");
    require(std::abs(get(restored, AfterglowProcessor::voiceId(2, "tune")) + 7) < 1e-5,
            "tune not restored");
    require(restored.sampleName(2) == file.getFileName(), "sample name lost");
    require(get(restored, AfterglowProcessor::voiceId(2, "model")) == 2,
            "sample engine not restored");
    restored.prepareToPlay(48000, 512);
    juce::AudioBuffer<float> out(2, 512);
    juce::MidiBuffer midi;
    midi.addEvent(juce::MidiMessage::noteOn(1, 41, 1.f), 0);
    restored.processBlock(out, midi);
    require(energy(out) > 1e-6, "embedded sample lost without file");
    for (int i = 0; i < 512; ++i)
        require(std::abs(out.getSample(0, i) + out.getSample(1, i)) < 1e-6, "restored stereo lost");
    // Invalid outer state must preserve the active project.
    const char garbage[] = "not a preset";
    restored.setStateInformation(garbage, sizeof(garbage));
    require(restored.sequenceCopy().patterns[3].length == 47, "malformed state mutated project");
    auto xml = juce::AudioProcessor::getXmlFromBinary(state.getData(), int(state.getSize()));
    require(xml != nullptr, "decode own state");
    auto malformed = juce::ValueTree::fromXml(*xml);
    auto project = malformed.getChildWithName("Project");
    auto sample = project.getChildWithName("Sample");
    sample.setProperty("audio", "broken", nullptr);
    juce::MemoryBlock bad;
    juce::AudioProcessor::copyXmlToBinary(*malformed.createXml(), bad);
    restored.setStateInformation(bad.getData(), int(bad.getSize()));
    require(restored.sampleName(2) == file.getFileName(), "bad embedded sample mutated project");
    const auto badFile = juce::File::getSpecialLocation(juce::File::tempDirectory)
                             .getNonexistentChildFile("afterglow-bad-test", ".aglow");
    require(badFile.replaceWithData(bad.getData(), bad.getSize()), "write malformed fixture");
    require(restored.loadPreset(badFile).failed(), "invalid embedded sample reports success");
    badFile.deleteFile();
    require(restored.sequenceCopy().patterns[3].length == 47 &&
                restored.sampleName(2) == file.getFileName(),
            "failed preset partially changes project");
}
void malformedValues() {
    AfterglowProcessor p;
    p.setPatternLength(0, 999);
    p.setStep(0, 0, 0, {true, std::numeric_limits<float>::quiet_NaN(), -20, 100});
    auto s = p.sequenceCopy();
    require(s.patterns[0].length == 64, "length clamp");
    require(std::isfinite(s.patterns[0].steps[0][0].velocity) &&
                s.patterns[0].steps[0][0].probability == 0 &&
                s.patterns[0].steps[0][0].ratchets == 4,
            "step validation");
    p.setChain({-10, 100});
    s = p.sequenceCopy();
    require(s.chain[0] == 0 && s.chain[1] == 15, "chain bounds");
    p.setStep(-1, 0, 0, {});
    p.setStep(0, 11, 0, {});
    p.setStep(0, 0, 64, {});
}
} // namespace
int main(int argc, char **argv) {
    juce::ScopedJuceInitialiser_GUI init;
    try {
        if (argc == 3 && juce::String(argv[1]) == "--screenshot") {
            AfterglowProcessor p;
            std::unique_ptr<juce::AudioProcessorEditor> editor(p.createEditor());
            require(editor != nullptr, "editor creation failed");
            auto image = editor->createComponentSnapshot(editor->getLocalBounds(), true, 1.f);
            juce::File file = juce::File::getCurrentWorkingDirectory().getChildFile(argv[2]);
            auto stream = file.createOutputStream();
            require(stream != nullptr, "screenshot output");
            juce::PNGImageFormat png;
            require(png.writeImageToStream(image, *stream), "screenshot encoding");
            std::cout << "Screenshot saved to " << file.getFullPathName() << "\n";
            return 0;
        }
        midiTimingAndPanic();
        hostAndBuses();
        blockSizeIndependence();
        concurrentSnapshots();
        stateAndSamplePortability();
        malformedValues();
        std::cout << "Processor behavior tests passed\n";
        return 0;
    } catch (const std::exception &e) {
        std::cerr << "PROCESSOR TEST FAILURE: " << e.what() << '\n';
        return 1;
    }
}
