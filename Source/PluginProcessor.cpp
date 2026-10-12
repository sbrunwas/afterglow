// SPDX-License-Identifier: AGPL-3.0-only
#include "PluginProcessor.h"
#include "PluginEditor.h"
#include <algorithm>
#include <cmath>
#include <cstring>

const std::array<const char *, 11> AfterglowProcessor::voiceNames{
    "Kick", "Snare",      "Low Tom",  "Mid Tom", "High Tom", "Rim",
    "Clap", "Closed Hat", "Open Hat", "Crash",   "Ride"};
const std::array<int, 11> AfterglowProcessor::midiNotes{36, 38, 41, 45, 48, 37, 39, 42, 46, 49, 51};
juce::String AfterglowProcessor::voiceId(int v, const juce::String &s) {
    return "v" + juce::String(v) + "_" + s;
}
namespace {
const std::array<const char *, 12> suffixes{"model", "tune",    "decay",       "tone",
                                            "level", "pan",     "drive",       "mute",
                                            "solo",  "reverse", "sampleStart", "sampleEnd"};
const std::array<const char *, 8> globals{"sync",   "run",   "bpm",     "swing",
                                          "master", "drive", "pattern", "song"};
float safeFloat(const juce::var &value, float fallback, float low, float high) {
    const float x = static_cast<float>(value);
    return std::isfinite(x) ? juce::jlimit(low, high, x) : fallback;
}
} // namespace
juce::AudioProcessorValueTreeState::ParameterLayout AfterglowProcessor::makeParameters() {
    juce::AudioProcessorValueTreeState::ParameterLayout l;
    auto f = [&](juce::String id, juce::String name, float lo, float hi, float def) {
        l.add(std::make_unique<juce::AudioParameterFloat>(
            juce::ParameterID{id, 1}, name, juce::NormalisableRange<float>(lo, hi), def));
    };
    auto b = [&](juce::String id, juce::String name, bool def) {
        l.add(std::make_unique<juce::AudioParameterBool>(juce::ParameterID{id, 1}, name, def));
    };
    b("sync", "Follow host", true);
    b("run", "Internal transport", false);
    f("bpm", "Internal BPM", 40, 240, 124);
    f("swing", "Swing", 0, .66f, 0);
    f("master", "Master level", 0, 1, .75f);
    f("drive", "Master drive", 0, 1, 0);
    l.add(std::make_unique<juce::AudioParameterInt>(juce::ParameterID{"pattern", 1}, "Pattern", 0,
                                                    15, 0));
    b("song", "Song chain", false);
    for (int v = 0; v < 11; ++v) {
        auto id = [&](const char *s) { return voiceId(v, s); };
        auto n = [&](const char *s) { return juce::String(voiceNames[v]) + " " + s; };
        l.add(std::make_unique<juce::AudioParameterChoice>(
            juce::ParameterID{id("model"), 1}, n("engine"),
            juce::StringArray{"909", "808", "Sample", "Linn", "Perkons"}, 0));
        f(id("tune"), n("tune"), -24, 24, 0);
        f(id("decay"), n("decay"), .03f, 1, .5f);
        f(id("tone"), n("tone"), 0, 1, .5f);
        f(id("level"), n("level"), 0, 1.5f, .8f);
        f(id("pan"), n("pan"), -1, 1, 0);
        f(id("drive"), n("drive"), 0, 1, 0);
        b(id("mute"), n("mute"), false);
        b(id("solo"), n("solo"), false);
        b(id("reverse"), n("reverse"), false);
        f(id("sampleStart"), n("sample start"), 0, .99f, 0);
        f(id("sampleEnd"), n("sample end"), .01f, 1, 1);
    }
    return l;
}
AfterglowProcessor::AfterglowProcessor()
    : AudioProcessor([] {
          BusesProperties b;
          b = b.withOutput("Master", juce::AudioChannelSet::stereo(), true);
          for (auto n : voiceNames)
              b = b.withOutput(n, juce::AudioChannelSet::stereo(), false);
          return b;
      }()),
      parameters(*this, nullptr, "AfterglowParameters", makeParameters()) {
    formats.registerBasicFormats();
    for (int v = 0; v < 11; ++v)
        for (size_t j = 0; j < suffixes.size(); ++j)
            voiceRefs[v].p[j] = parameters.getRawParameterValue(voiceId(v, suffixes[j]));
    for (size_t j = 0; j < globals.size(); ++j)
        globalRefs[j] = parameters.getRawParameterValue(globals[j]);
    auto initial = std::make_unique<Snapshot>();
    initial->sequence = ag::Sequencer::factoryPatterns();
    publish(std::move(initial));
}
AfterglowProcessor::~AfterglowProcessor() = default;
float AfterglowProcessor::param(const juce::String &id) const {
    auto *p = parameters.getRawParameterValue(id);
    return p ? p->load() : 0.f;
}
void AfterglowProcessor::publish(std::unique_ptr<Snapshot> s) {
    // All callers hold editLock (constructor excepted). Hazard protects both DSP sample pointers
    // and sequence.
    auto *ptr = s.get();
    snapshots.push_back(std::move(s));
    published.store(ptr);
    const auto *hazard = audioSnapshot.load();
    snapshots.erase(
        std::remove_if(snapshots.begin(), snapshots.end(),
                       [&](const auto &item) { return item.get() != ptr && item.get() != hazard; }),
        snapshots.end());
}
std::unique_ptr<AfterglowProcessor::Snapshot> AfterglowProcessor::copySnapshot() const {
    return std::make_unique<Snapshot>(*published.load());
}
ag::SequenceData AfterglowProcessor::sequenceCopy() const {
    const juce::ScopedLock lock(editLock);
    return published.load()->sequence;
}
void AfterglowProcessor::editSequence(const std::function<void(ag::SequenceData &)> &fn) {
    const juce::ScopedLock lock(editLock);
    auto next = copySnapshot();
    fn(next->sequence);
    publish(std::move(next));
}
void AfterglowProcessor::setStep(int p, int v, int s, ag::Step step) {
    if (p < 0 || p >= 16 || v < 0 || v >= 11 || s < 0 || s >= 64)
        return;
    step.velocity = std::isfinite(step.velocity) ? juce::jlimit(0.f, 1.f, step.velocity) : .8f;
    step.probability =
        std::isfinite(step.probability) ? juce::jlimit(0.f, 1.f, step.probability) : 1;
    step.ratchets = juce::jlimit(1, 4, step.ratchets);
    editSequence([&](auto &d) { d.patterns[p].steps[v][s] = step; });
}
void AfterglowProcessor::setPatternLength(int p, int n) {
    if (p >= 0 && p < 16)
        editSequence([&](auto &d) { d.patterns[p].length = juce::jlimit(1, 64, n); });
}
void AfterglowProcessor::clearPattern(int p) {
    if (p >= 0 && p < 16)
        editSequence([&](auto &d) {
            for (auto &row : d.patterns[p].steps)
                for (auto &s : row)
                    s = ag::Step{};
        });
}
void AfterglowProcessor::copyPattern(int a, int b) {
    if (a >= 0 && a < 16 && b >= 0 && b < 16)
        editSequence([&](auto &d) { d.patterns[b] = d.patterns[a]; });
}
void AfterglowProcessor::replacePattern(int p, const ag::Pattern &pattern) {
    if (p >= 0 && p < 16)
        editSequence([&](auto &d) {
            d.patterns[p] = pattern;
            d.patterns[p].length = juce::jlimit(1, 64, pattern.length);
        });
}
void AfterglowProcessor::randomizePattern(int p, int v) {
    if (p < 0 || p >= 16 || v < -1 || v >= 11)
        return;
    juce::Random rng;
    editSequence([&](auto &d) {
        for (int row = 0; row < 11; ++row)
            if (v < 0 || row == v)
                for (int i = 0; i < d.patterns[p].length; ++i) {
                    auto &s = d.patterns[p].steps[row][i];
                    s.on = rng.nextFloat() < (row == 0 ? .24f : row >= 7 ? .35f : .15f);
                    s.velocity = .55f + .4f * rng.nextFloat();
                    s.probability = 1;
                    s.ratchets = 1;
                }
    });
}
void AfterglowProcessor::setChain(const std::vector<int> &pats) {
    if (pats.empty())
        return;
    editSequence([&](auto &d) {
        d.chainLength = juce::jmin(64, (int)pats.size());
        for (int i = 0; i < d.chainLength; ++i)
            d.chain[i] = juce::jlimit(0, 15, pats[(size_t)i]);
    });
}
void AfterglowProcessor::restoreFactoryPatterns() {
    editSequence([](auto &d) { d = ag::Sequencer::factoryPatterns(); });
}
juce::String AfterglowProcessor::sampleName(int v) const {
    const juce::ScopedLock lock(editLock);
    return v >= 0 && v < 11 ? published.load()->sampleNames[v] : juce::String{};
}
juce::Result AfterglowProcessor::loadSample(int v, const juce::File &file) {
    if (v < 0 || v >= 11)
        return juce::Result::fail("Invalid voice");
    std::unique_ptr<juce::AudioFormatReader> reader(formats.createReaderFor(file));
    if (!reader)
        return juce::Result::fail("Cannot read sample. Use WAV, AIFF, or FLAC.");
    if (reader->sampleRate < 8000 || reader->sampleRate > 192000 || reader->lengthInSamples < 2 ||
        reader->lengthInSamples > reader->sampleRate * 10.0)
        return juce::Result::fail("Use a sample of 10 seconds or less, at 8-192 kHz.");
    const int count = (int)reader->lengthInSamples;
    juce::AudioBuffer<float> buffer(2, count);
    if (!reader->read(&buffer, 0, count, 0, true, true))
        return juce::Result::fail("Sample decoding failed.");
    auto data = std::make_shared<ag::SampleData>();
    data->sampleRate = reader->sampleRate;
    data->left.resize((size_t)count);
    data->right.resize((size_t)count);
    for (int i = 0; i < count; ++i) {
        float l = buffer.getSample(0, i), r = buffer.getSample(reader->numChannels > 1 ? 1 : 0, i);
        data->left[(size_t)i] = std::isfinite(l) ? juce::jlimit(-4.f, 4.f, l) : 0;
        data->right[(size_t)i] = std::isfinite(r) ? juce::jlimit(-4.f, 4.f, r) : 0;
    }
    {
        const juce::ScopedLock lock(editLock);
        auto next = copySnapshot();
        next->samples[v] = std::move(data);
        next->sampleNames[v] = file.getFileName();
        publish(std::move(next));
    }
    auto *choice = parameters.getParameter(voiceId(v, "model"));
    choice->beginChangeGesture();
    // Sample retains raw choice index 2 as new synthesis models are appended.
    choice->setValueNotifyingHost(choice->convertTo0to1(static_cast<float>(ag::Model::Sample)));
    choice->endChangeGesture();
    return juce::Result::ok();
}
void AfterglowProcessor::clearSample(int v) {
    if (v < 0 || v >= 11)
        return;
    const juce::ScopedLock lock(editLock);
    auto next = copySnapshot();
    next->samples[v].reset();
    next->sampleNames[v].clear();
    publish(std::move(next));
}
void AfterglowProcessor::audition(int v) {
    if (v >= 0 && v < 11)
        pendingAuditions.fetch_or(1u << v);
}
bool AfterglowProcessor::isBusesLayoutSupported(const BusesLayout &l) const {
    if (!l.inputBuses.isEmpty() || l.outputBuses.size() != 12 ||
        l.outputBuses[0] != juce::AudioChannelSet::stereo())
        return false;
    for (int i = 1; i < l.outputBuses.size(); ++i)
        if (!l.outputBuses[i].isDisabled() && l.outputBuses[i] != juce::AudioChannelSet::stereo())
            return false;
    return true;
}
void AfterglowProcessor::prepareToPlay(double sr, int) {
    sampleRateHz = std::isfinite(sr) && sr > 0 ? sr : 44100;
    engine.prepare(sampleRateHz);
    sequencer.reset();
    active = nullptr;
    internalPpq = 0;
    previousPlaying = false;
    masterSmooth.reset(sampleRateHz, .01);
    masterSmooth.setCurrentAndTargetValue(param("master"));
    driveSmooth.reset(sampleRateHz, .01);
    driveSmooth.setCurrentAndTargetValue(param("drive"));
}
void AfterglowProcessor::processBlock(juce::AudioBuffer<float> &out, juce::MidiBuffer &midi) {
    juce::ScopedNoDenormals noDenormals;
    out.clear();
    const Snapshot *next;
    do {
        next = published.load();
        audioSnapshot.store(next);
    } while (next != published.load());
    if (active != next) {
        active = next;
        sequencer.setData(&active->sequence);
        for (int v = 0; v < 11; ++v)
            engine.setSample(v, active->samples[v].get());
    }
    for (int v = 0; v < 11; ++v) {
        const auto &r = voiceRefs[v].p;
        ag::VoiceParams p;
        p.model = (ag::Model)juce::jlimit(0, 4, (int)r[0]->load());
        p.tune = r[1]->load();
        p.decay = r[2]->load();
        p.tone = r[3]->load();
        p.level = r[4]->load();
        p.pan = r[5]->load();
        p.drive = r[6]->load();
        p.mute = r[7]->load() > .5f;
        p.solo = r[8]->load() > .5f;
        p.reverse = r[9]->load() > .5f;
        p.sampleStart = r[10]->load();
        p.sampleEnd = r[11]->load();
        engine.setParams(v, p);
    }
    double bpm = globalRefs[2]->load(), ppq = internalPpq;
    bool playing = globalRefs[1]->load() > .5f;
    const bool sync = globalRefs[0]->load() > .5f;
    if (sync) {
        playing = false;
        if (auto *playhead = getPlayHead())
            if (auto pos = playhead->getPosition()) {
                playing = pos->getIsPlaying();
                if (auto tempo = pos->getBpm())
                    if (std::isfinite(*tempo) && *tempo > 0)
                        bpm = *tempo;
                if (auto beat = pos->getPpqPosition())
                    ppq = *beat;
                else
                    playing = false;
            }
    }
    if (!std::isfinite(ppq)) {
        ppq = 0;
        playing = false;
    }
    bpm = juce::jlimit(1.0, 999.0, bpm);
    const double increment = bpm / (60.0 * sampleRateHz);
    if (!playing && previousPlaying) {
        engine.reset();
        sequencer.reset();
        if (!sync)
            internalPpq = ppq = 0;
    }
    previousPlaying = playing;
    transportRunning.store(playing, std::memory_order_relaxed);
    const int pattern = juce::jlimit(0, 15, (int)globalRefs[6]->load());
    const bool song = globalRefs[7]->load() > .5f;
    const float swing = globalRefs[3]->load();
    masterSmooth.setTargetValue(globalRefs[4]->load());
    driveSmooth.setTargetValue(globalRefs[5]->load());
    unsigned hits = pendingAuditions.exchange(0);
    for (int v = 0; v < 11; ++v)
        if (hits & (1u << v))
            engine.trigger(v, .85f);
    std::array<float *, 12> left{}, right{};
    for (int b = 0; b < 12; ++b)
        if (getBus(false, b)->isEnabled()) {
            auto buf = getBusBuffer(out, false, b);
            left[b] = buf.getWritePointer(0);
            right[b] = buf.getWritePointer(1);
        }
    auto event = midi.cbegin();
    const auto end = midi.cend();
    float blockPeak = 0;
    for (int i = 0; i < out.getNumSamples(); ++i) {
        while (event != end && (*event).samplePosition <= i) {
            if ((*event).numBytes > 3) {
                ++event;
                continue;
            } // Ignore SysEx without constructing an allocating MidiMessage.
            auto msg = (*event).getMessage();
            if (msg.isNoteOn()) {
                for (int v = 0; v < 11; ++v)
                    if (msg.getNoteNumber() == midiNotes[v])
                        engine.trigger(v, msg.getFloatVelocity());
            } else if (msg.isAllNotesOff() || msg.isAllSoundOff())
                engine.reset();
            ++event;
        }
        sequencer.process(ppq, increment, playing, pattern, song, swing, &engine,
                          [](void *context, int v, float vel) {
                              static_cast<ag::DrumEngine *>(context)->trigger(v, vel);
                          });
        float l[11]{}, r[11]{};
        engine.renderFrame(l, r);
        float sumL = 0, sumR = 0;
        for (int v = 0; v < 11; ++v) {
            sumL += l[v];
            sumR += r[v];
            if (left[v + 1]) {
                left[v + 1][i] = l[v];
                right[v + 1][i] = r[v];
            }
        }
        const float master = masterSmooth.getNextValue(), drive = driveSmooth.getNextValue();
        auto shape = [&](float x) {
            x *= master;
            if (drive > .001f)
                x = std::tanh(x * (1 + drive * 8)) / (1 + drive * 2);
            return juce::jlimit(-1.f, 1.f, std::isfinite(x) ? x : 0.f);
        };
        const float ml = shape(sumL), mr = shape(sumR);
        if (left[0]) {
            left[0][i] = ml;
            right[0][i] = mr;
        }
        blockPeak = juce::jmax(blockPeak, std::abs(ml), std::abs(mr));
        if (playing)
            ppq += increment;
    }
    internalPpq = ppq;
    displayedStep.store(playing ? sequencer.currentStep() : -1, std::memory_order_relaxed);
    displayedPattern.store(playing ? sequencer.currentPattern() : pattern,
                           std::memory_order_relaxed);
    peak.store(blockPeak, std::memory_order_relaxed);
    midi.clear();
}

void AfterglowProcessor::getStateInformation(juce::MemoryBlock &destination) {
    auto state = parameters.copyState();
    state.setProperty("schema", 1, nullptr);
    const juce::ScopedLock lock(editLock);
    const auto &snap = *published.load();
    juce::ValueTree data("Project");
    data.setProperty("chainLength", snap.sequence.chainLength, nullptr);
    juce::String chain;
    for (int i = 0; i < snap.sequence.chainLength; ++i) {
        if (i)
            chain += ",";
        chain += juce::String(snap.sequence.chain[i]);
    }
    data.setProperty("chain", chain, nullptr);
    for (int p = 0; p < 16; ++p) {
        juce::ValueTree pat("Pattern");
        pat.setProperty("index", p, nullptr);
        pat.setProperty("length", snap.sequence.patterns[p].length, nullptr);
        for (int v = 0; v < 11; ++v)
            for (int s = 0; s < 64; ++s) {
                const auto &step = snap.sequence.patterns[p].steps[v][s];
                if (!step.on && step.velocity == .8f && step.probability == 1 && step.ratchets == 1)
                    continue;
                juce::ValueTree st("Step");
                st.setProperty("v", v, nullptr);
                st.setProperty("s", s, nullptr);
                st.setProperty("on", step.on, nullptr);
                st.setProperty("velocity", step.velocity, nullptr);
                st.setProperty("probability", step.probability, nullptr);
                st.setProperty("ratchets", step.ratchets, nullptr);
                pat.addChild(st, -1, nullptr);
            }
        data.addChild(pat, -1, nullptr);
    }
    for (int v = 0; v < 11; ++v)
        if (auto sample = snap.samples[v]) {
            juce::ValueTree sm("Sample");
            sm.setProperty("voice", v, nullptr);
            sm.setProperty("name", snap.sampleNames[v], nullptr);
            sm.setProperty("rate", sample->sampleRate, nullptr);
            juce::MemoryOutputStream bytes;
            bytes.writeInt((int)sample->left.size());
            for (size_t i = 0; i < sample->left.size(); ++i) {
                bytes.writeFloat(sample->left[i]);
                bytes.writeFloat(sample->right[i]);
            }
            sm.setProperty("audio", bytes.getMemoryBlock().toBase64Encoding(), nullptr);
            data.addChild(sm, -1, nullptr);
        }
    state.addChild(data, -1, nullptr);
    auto xml = state.createXml();
    copyXmlToBinary(*xml, destination);
}
void AfterglowProcessor::setStateInformation(const void *bytes, int size) {
    restoreState(bytes, size);
}
bool AfterglowProcessor::restoreState(const void *bytes, int size) {
    if (!bytes || size < 1 || size > 256 * 1024 * 1024)
        return false;
    auto xml = getXmlFromBinary(bytes, size);
    if (!xml || !xml->hasTagName("AfterglowParameters"))
        return false;
    auto state = juce::ValueTree::fromXml(*xml);
    if ((int)state.getProperty("schema", 0) != 1)
        return false;
    auto data = state.getChildWithName("Project");
    if (!data.isValid())
        return false;
    auto next = std::make_unique<Snapshot>();
    next->sequence.chainLength = juce::jlimit(1, 64, (int)data.getProperty("chainLength", 1));
    auto chain = juce::StringArray::fromTokens(data.getProperty("chain").toString(), ",", "");
    for (int i = 0; i < next->sequence.chainLength; ++i)
        next->sequence.chain[i] =
            juce::jlimit(0, 15, i < chain.size() ? chain[i].getIntValue() : 0);
    for (auto child : data) {
        if (child.hasType("Pattern")) {
            int p = (int)child.getProperty("index", -1);
            if (p < 0 || p >= 16)
                continue;
            auto &pat = next->sequence.patterns[p];
            pat.length = juce::jlimit(1, 64, (int)child.getProperty("length", 16));
            for (auto st : child) {
                if (!st.hasType("Step"))
                    continue;
                int v = (int)st.getProperty("v", -1), s = (int)st.getProperty("s", -1);
                if (v < 0 || v >= 11 || s < 0 || s >= 64)
                    continue;
                auto &step = pat.steps[v][s];
                step.on = (bool)st.getProperty("on", false);
                step.velocity = safeFloat(st.getProperty("velocity", .8f), .8f, 0, 1);
                step.probability = safeFloat(st.getProperty("probability", 1.f), 1, 0, 1);
                step.ratchets = juce::jlimit(1, 4, (int)st.getProperty("ratchets", 1));
            }
        } else if (child.hasType("Sample")) {
            int v = (int)child.getProperty("voice", -1);
            double rate = (double)child.getProperty("rate", 44100.0);
            if (v < 0 || v >= 11 || !std::isfinite(rate) || rate < 8000 || rate > 192000)
                return false;
            juce::MemoryBlock raw;
            if (!raw.fromBase64Encoding(child.getProperty("audio").toString()))
                return false;
            juce::MemoryInputStream stream(raw, false);
            int n = stream.readInt();
            if (n < 2 || n > rate * 10.0 || raw.getSize() != 4 + (size_t)n * 8)
                return false;
            auto sample = std::make_shared<ag::SampleData>();
            sample->sampleRate = rate;
            sample->left.resize((size_t)n);
            sample->right.resize((size_t)n);
            for (int i = 0; i < n; ++i) {
                float l = stream.readFloat(), r = stream.readFloat();
                sample->left[(size_t)i] = std::isfinite(l) ? juce::jlimit(-4.f, 4.f, l) : 0;
                sample->right[(size_t)i] = std::isfinite(r) ? juce::jlimit(-4.f, 4.f, r) : 0;
            }
            next->samples[v] = std::move(sample);
            next->sampleNames[v] = child.getProperty("name").toString().substring(0, 255);
        }
    }
    // Validate/clamp APVTS payload, including malformed/non-finite preset values.
    auto clean = parameters.copyState();
    for (auto child : state)
        if (child.hasType("PARAM")) {
            auto id = child.getProperty("id").toString();
            if (auto *p = parameters.getParameter(id)) {
                float value = (float)child.getProperty("value");
                if (!std::isfinite(value))
                    continue;
                auto normalized = p->convertTo0to1(value);
                auto bounded = p->convertFrom0to1(juce::jlimit(0.f, 1.f, normalized));
                for (auto dest : clean)
                    if (dest.getProperty("id") == id)
                        dest.setProperty("value", bounded, nullptr);
            }
        }
    {
        const juce::ScopedLock lock(editLock);
        publish(std::move(next));
        parameters.replaceState(clean);
    }
    return true;
}
juce::Result AfterglowProcessor::savePreset(const juce::File &file) {
    juce::MemoryBlock state;
    getStateInformation(state);
    return file.replaceWithData(state.getData(), state.getSize())
               ? juce::Result::ok()
               : juce::Result::fail("Could not save preset.");
}
juce::Result AfterglowProcessor::loadPreset(const juce::File &file) {
    if (file.getSize() > 256 * 1024 * 1024)
        return juce::Result::fail("Preset exceeds size limit.");
    juce::MemoryBlock data;
    if (!file.loadFileAsData(data))
        return juce::Result::fail("Could not read preset.");
    auto xml = getXmlFromBinary(data.getData(), (int)data.getSize());
    if (!xml || !xml->hasTagName("AfterglowParameters") || xml->getIntAttribute("schema") != 1)
        return juce::Result::fail("Not a supported Afterglow preset.");
    return restoreState(data.getData(), (int)data.getSize())
               ? juce::Result::ok()
               : juce::Result::fail("Preset data is incomplete or invalid.");
}
juce::Result AfterglowProcessor::exportMidi(const juce::File &file, int p) const {
    if (p < 0 || p >= 16)
        return juce::Result::fail("Invalid pattern.");
    auto data = sequenceCopy();
    const auto &pat = data.patterns[p];
    juce::MidiMessageSequence sequence;
    auto tempo =
        juce::MidiMessage::tempoMetaEvent((int)(60000000.0 / juce::jmax(1.f, param("bpm"))));
    sequence.addEvent(tempo);
    const double swing = param("swing");
    for (int v = 0; v < 11; ++v)
        for (int s = 0; s < pat.length; ++s) {
            const auto &step = pat.steps[v][s];
            if (!step.on || step.probability <= 0 || step.velocity <= 0)
                continue;
            double start = s + ((s & 1) ? swing : 0),
                   finish = s + 1 + (((s + 1) & 1) && s + 1 < pat.length ? swing : 0);
            for (int k = 0; k < step.ratchets; ++k) {
                double t = (start + (finish - start) * k / step.ratchets) * 240;
                auto on = juce::MidiMessage::noteOn(10, midiNotes[v], step.velocity);
                on.setTimeStamp(t);
                sequence.addEvent(on);
                auto off = juce::MidiMessage::noteOff(10, midiNotes[v]);
                off.setTimeStamp(t + juce::jmin(30.0, (finish - start) * 240 / step.ratchets * .5));
                sequence.addEvent(off);
            }
        }
    auto end = juce::MidiMessage::endOfTrack();
    end.setTimeStamp(pat.length * 240.0);
    sequence.addEvent(end);
    sequence.updateMatchedPairs();
    juce::MidiFile midi;
    midi.setTicksPerQuarterNote(960);
    midi.addTrack(sequence);
    auto stream = file.createOutputStream();
    if (!stream)
        return juce::Result::fail("Cannot write MIDI file.");
    stream->setPosition(0);
    stream->truncate();
    return midi.writeTo(*stream) ? juce::Result::ok() : juce::Result::fail("MIDI export failed.");
}
juce::AudioProcessorEditor *AfterglowProcessor::createEditor() {
    return new AfterglowEditor(*this);
}
juce::AudioProcessor *JUCE_CALLTYPE createPluginFilter() {
    return new AfterglowProcessor();
}
