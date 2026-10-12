// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include <algorithm>
#include <cmath>
#include "third_party/Schwung909/9w9_circuit.h"
#include "third_party/Schwung909/9w9_tom909.h"
#include "third_party/Schwung909/9w9_perc909.h"

namespace ag {
// Original implementation from the hardware analysis at
// https://electricdruid.net/tr-909-noise-generator/ (31 stages, XOR taps 31/13,
// approximately 300 kHz clock, plus the hardware output's five-stage delay).
// Finite bit-time integration is a boxcar anti-alias approximation, not the
// original analog reconstruction filter or a brick-wall resampler.
class Noise909 {
public:
    void prepare(double rate) {
        rate = std::isfinite(rate) ? std::clamp(rate,8000.0,384000.0) : 48000.0;
        clocksPerSample = 300000.0 / rate;
        reset();
    }
    void reset() {
        bits=0x7fffffffu; delayed=31u; phase=0;
        // Warm-start after the hardware's power-on fill, avoiding an artificial
        // 20–30 ms boot mute whenever the user presses STOP. No reseed per hit.
        for(int i=0;i<4096;++i)clock();
    }
    float next() {
        double remaining=clocksPerSample,integral=0;
        // At the supported minimum rate, at most 39 iterations per sample.
        while(remaining>1e-12) {
            const double dt=std::min(remaining,1.0-phase);
            integral+=((delayed&16u)?1.0:-1.0)*dt;
            phase+=dt;remaining-=dt;
            if(phase>=1.0-1e-12){clock();phase=0;}
        }
        // A +/-1 bit stream has three times the variance of uniform [-1,1].
        // This gain preserves the old noise bus's low-frequency power density
        // referenced to 48 kHz, independent of the current host sample rate.
        return float(integral/clocksPerSample*1.4433756729740645);
    }
private:
    void clock() {
        const uint32_t bit31=(bits>>30)&1u;
        const uint32_t feedback=bit31^((bits>>12)&1u);
        bits=((bits<<1)|feedback)&0x7fffffffu;
        delayed=((delayed<<1)|bit31)&31u;
    }
    uint32_t bits=0x7fffffffu,delayed=31u;
    double phase=0,clocksPerSample=6.25;
};
// Circuit-informed 909 analog voices. No sampled cymbal assets are included.
// Trigger velocity is accepted for API symmetry but amplitude is applied ONCE by
// DrumEngine's existing mixer. All upstream voice triggers receive unity accent.
class Circuit909 {
public:
    void prepare(double rate) {
        sampleRate = std::isfinite(rate) ? std::clamp(rate, 8000.0, 384000.0) : 48000.0;
        reset();
    }
    void reset() {
        for (auto& voice : body) voice = {};
        for (auto& voice : tom) voice = {};
        rim = {}; clap = {};
        noise.prepare(sampleRate);
        for (int i=0; i<5; ++i) {
            auto& b=body[i];
            b.tune=i==0?13.0f:i==1?205.0f:i==2?68.0f:i==3?102.0f:132.0f;
            b.drive=.2f; b.level=.58f; b.click_tone=2500; b.pitch_mod=1;
            if(i==1) { b.tune2=325; b.osc2_mix=.4f; b.noise_hp=1000; }
            w9_bt_init(&b, float(sampleRate));
        }
        for(auto& t:tom)w9_tom909_init(&t,float(sampleRate));
        rim.tune=210;rim.tune2=480;rim.res=10;rim.level=.7f;rim.drive=1.4f;
        w9_rim909_init(&rim,float(sampleRate));
        clap.tune=950;clap.res=2;clap.spread=12;clap.burst_decay=50;
        clap.tail_decay=345;clap.tail_level=.58f;clap.drive=1.6f;clap.level=.85f;
        w9_clap909_init(&clap,float(sampleRate));
    }
    // tune: semitones; decay/tone: normalized. Controls are sampled per trigger.
    void trigger(int i,float tuneValue,float decayValue,float toneValue,float velocity) {
        if(i<0||i>6||!std::isfinite(velocity)||velocity<=0)return;
        const float ratio=std::exp2(safe(tuneValue,-24,24,0)/12);
        const float decay=safe(decayValue,0,1,.5f),tone=safe(toneValue,0,1,.5f);
        if(i==0) {
            auto& b=body[0];
            b.tune=13; b.sweep_depth=0; b.pitch_mod=1; b.bd_sweep=1;
            b.decay=300+2160*decay;b.amp_hold=40;
            b.attack=.02f+.16f*tone;b.click_tone=2500;b.drive=.2f;b.level=.58f;
            b.tune2=0;b.osc2_mix=0;b.snappy=0;
            w9_bt_trigger(&b,1);
            b.impulse = std::max(1, int(std::lround(sampleRate / 24000.0)));
            // Preserve Afterglow's existing pitch extension without conflating it
            // with the hardware Tune pot (which controls the sweep's time/height).
            b.bd_base*=ratio;b.bd_df*=ratio;
        } else if(i==1) {
            auto& b=body[1];
            b.tune=205*ratio;b.tune2=b.tune*1.585f;b.osc2_mix=.4f;
            b.sweep_depth=1.045f;b.sweep_time=30;b.decay=320;b.amp_hold=0;
            b.attack=.15f;b.snappy=tone;b.noise_decay=200+2000*decay;
            b.noise_hp=1000;b.drive=1.8f;b.level=.45f;
            w9_bt_trigger(&b,1);
            b.impulse = std::max(1, int(std::lround(sampleRate / 24000.0)));
        } else if(i<=4) {
            auto& b=body[i];
            const float bases[3]={68,102,132},decays[3]={1700,1050,1100};
            b.tune=bases[i-2]*ratio;b.sweep_depth=1.12f;b.sweep_time=200-20*(i-2);
            b.decay=decays[i-2]*(.25f+1.5f*decay);
            b.attack=.04f+.28f*tone;b.level=.55f;b.drive=2;
            w9_tom909_trigger(&tom[i-2],&b,1);
        } else if(i==5) {
            rim.tune=210*ratio;rim.tune2=480*ratio;rim.res=10;
            rim.decay=80+240*decay;rim.noise_mix=.1f+.5f*tone;
            w9_rim909_retune(&rim);w9_rim909_trigger(&rim,1);
            rim.impulse = std::max(1, int(std::lround(sampleRate / 24000.0)));
        } else {
            clap.tune=950*ratio;clap.res=2;clap.spread=12;clap.burst_decay=50;
            clap.tail_decay=90+510*decay;clap.tail_level=.28f+.6f*tone;
            w9_clap909_retune(&clap);w9_clap909_trigger(&clap,1);
        }
    }
    // Call once per output sample, not once per active voice. Noise is shared as
    // in the hardware signal topology and all seven analog voices advance once.
    void renderFrame(float out[11]) {
        if(!out)return;
        const float n=noise.next();
        out[0]=finiteOutput(w9_bt_render(&body[0],n));
        out[1]=finiteOutput(w9_bt_render(&body[1],n));
        for(int i=0;i<3;++i)out[i+2]=finiteOutput(w9_tom909_render(&tom[i],&body[i+2],n));
        out[5]=finiteOutput(w9_rim909_render(&rim,n));
        out[6]=finiteOutput(w9_clap909_render(&clap,n));
        for(int i=7;i<11;++i)out[i]=0;
    }
private:
    static float safe(float x,float low,float high,float fallback) {
        return std::isfinite(x)?std::clamp(x,low,high):fallback;
    }
    static float finiteOutput(float x) { return std::isfinite(x)?std::clamp(x,-4.f,4.f):0; }
    double sampleRate=48000;
    w9_bt_t body[5]{};
    w9_tom_t tom[3]{};
    w9_rim909_t rim{};
    w9_clap909_t clap{};
    Noise909 noise{};
};
}
