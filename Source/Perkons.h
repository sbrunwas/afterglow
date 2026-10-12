// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>

namespace ag {
// Original synthesis inspired by the algorithm families in Erica Synths' HD-01
// user manual (Dec 2024), pp. 8–11. Source:
// https://www.ericasynths.lv/service/file/download/product_id/1167/file_id/521/
// FM/modulation ratios and all waveforms below are original interpretations. No firmware, factory samples or wavetables
// are copied. This is not a circuit model or a measured recreation of HD-01.
// Mapping: fold kick, resonant snare, fold/wavetable/FM toms, Karplus rim,
// slap clap, pulse-stack hats, metallic noise crash, FM ride. Tone is a macro.
// Two internal samples and a low-pass decimator reduce nonlinear aliasing;
// this is not a brick-wall bandlimiter. Velocity amplitude belongs to the mixer.
class Perkons {
public:
    void prepare(double rate) {
        sr=std::isfinite(rate)?std::clamp(rate,8000.0,384000.0):48000.;
        ir=sr*2.; dcPole=std::exp(-2*pi*10./sr); reset();
    }
    void reset() {
        for(int i=0;i<11;++i){v[i]={};v[i].rng=0x6d2b79f5u+uint32_t(i)*0x123457u;}
        string.fill(0); stringWrite=0;
    }
    // Parameters are latched at trigger; tune is semitones, other controls 0..1.
    void trigger(int lane,float tune,float decay,float tone,float velocity) {
        if(lane<0||lane>=11||!std::isfinite(velocity)||velocity<=0)return;
        auto& s=v[lane];
        const double pitch=std::exp2(safe(tune,-24,24,0)/12.);
        const double d=safe(decay,0,1,.5f);
        s.tone=safe(tone,0,1,.5f);
        static constexpr double base[11]={48,175,79,125,194,320,650,3100,2800,1750,1260};
        s.freq=std::min(base[lane]*pitch,ir*.085);
        static constexpr double shortest[11]={.08,.04,.05,.04,.03,.018,.04,.012,.06,.15,.10};
        static constexpr double longest[11]={1.8,.65,1.2,.95,.8,.65,.75,.18,1.25,2.8,2.0};
        const double duration=shortest[lane]*std::pow(longest[lane]/shortest[lane],d);
        s.env=1;s.envMul=std::exp(-6.907755278982137/(duration*ir));
        s.pitchEnv=1;s.pitchMul=std::exp(-1./((.009+.025*d)*ir));
        s.age=0;s.attack=0;s.choke=1;
        s.attackMul=std::exp(-1./(.00045*ir));
        s.filterG=std::tan(pi*std::min(ir*.20,450.+s.tone*s.tone*14500.)/ir);
        s.filterK=1.6-.9*s.tone;
        if(lane==5){s.delay=std::clamp(ir/s.freq,4.,double(string.size()-2));s.feedback=std::exp(-6.907755278982137*s.delay/(duration*ir));s.excite=std::max(1,int(s.delay));}
        if(lane==7)v[8].choke=std::exp(-1./(.002*ir));
    }
    void renderFrame(float out[11]) {
        for(int i=0;i<11;++i) {
            auto& s=v[i];
            if(s.env<1e-7){out[i]=0;continue;}
            double result=0;
            for(int sub=0;sub<2;++sub) {
                double x=generate(i,s);
                // Stable topology-preserving state-variable low-pass.
                const double a=1./(1.+s.filterG*(s.filterG+s.filterK));
                const double b=(s.filter1+s.filterG*(x-s.filter2))*a;
                const double c=s.filter2+s.filterG*b;
                s.filter1=2*b-s.filter1;s.filter2=2*c-s.filter2;
                x=(i>=7?x-c:c);
                s.attack=1-(1-s.attack)*s.attackMul;
                x=std::tanh(x*(1.2+1.8*s.tone))*.65*s.env*s.attack;
                s.env*=s.envMul*s.choke;s.pitchEnv*=s.pitchMul;s.age+=1./ir;
                // Four cascaded real poles at 0.19 * internal SR. Coefficients
                // fixed at this 2x ratio; never allocate or recompute per sample.
                for(auto& z:s.decimator){z+=.697*x-.697*z;x=z;}
                result=x;
            }
            const double dc=result-s.dcIn+dcPole*s.dcOut;
            s.dcIn=result;s.dcOut=dc;
            out[i]=float(std::clamp(dc,-1.,1.));
        }
    }
private:
    static constexpr double pi=3.14159265358979323846;
    struct Voice {
        double freq=100,tone=.5,env=0,envMul=0,pitchEnv=0,pitchMul=0;
        double age=0,attack=0,attackMul=0,choke=1;
        double filterG=.1,filterK=1,filter1=0,filter2=0;
        double phase[6]={},decimator[4]={},dcIn=0,dcOut=0;
        double noiseLP=0,delay=100,feedback=.9,stringLP=0;
        uint32_t rng=1;int excite=0;
    };
    std::array<Voice,11> v{};
    std::array<double,16384> string{};
    unsigned stringWrite=0;
    double sr=48000,ir=96000,dcPole=.9986918594;
    static float safe(float x,float lo,float hi,float fallback){return std::isfinite(x)?std::clamp(x,lo,hi):fallback;}
    static double noise(Voice& s){s.rng^=s.rng<<13;s.rng^=s.rng>>17;s.rng^=s.rng<<5;return double(s.rng)*(2./4294967296.)-1.;}
    double osc(Voice& s,int index,double frequency){auto& p=s.phase[index];p+=std::clamp(frequency,0.,ir*.24)/ir;p-=std::floor(p);return std::sin(2*pi*p);}
    static double blep(double p,double dt){if(p<dt){p/=dt;return p+p-p*p-1;}if(p>1-dt){p=(p-1)/dt;return p*p+p+p+1;}return 0;}
    double pulse(Voice& s,int index,double frequency){const double dt=std::clamp(frequency/ir,.000001,.20);auto& p=s.phase[index];p+=dt;p-=std::floor(p);double q=p+.5;q-=std::floor(q);return (p<.5?1.:-1.)+blep(p,dt)-blep(q,dt);}
    double generate(int i,Voice& s) {
        const double n=noise(s),t=s.tone;
        if(i==0||i==2){const double f=s.freq*(1+(i==0?5.:1.8)*s.pitchEnv);const double o=osc(s,0,f);return std::sin(o*(1.+4.5*t*s.pitchEnv))*.9+n*s.pitchEnv*.08*t;}
        if(i==1){const double a=osc(s,0,s.freq*(1+.8*s.pitchEnv));const double b=osc(s,1,s.freq*1.53);s.noiseLP+=.10*(n-s.noiseLP);return (.5*a+.25*b)*(.75-.5*t)+ (n-s.noiseLP)*(.35+.9*t);}
        if(i==3){osc(s,0,s.freq*(1+1.5*s.pitchEnv));const double p=2*pi*s.phase[0];return std::sin(p)*.7+t*(std::sin(2*p)*.3+std::sin(3*p)*.2+std::sin(5*p)*.12);}
        if(i==4){const double m=osc(s,1,s.freq*(1.4+2.6*t));osc(s,0,s.freq*(1+s.pitchEnv));return std::sin(2*pi*s.phase[0]+m*(.3+5*t)*(.2+.8*s.pitchEnv));}
        if(i==5){double pos=double(stringWrite)-s.delay;if(pos<0)pos+=string.size();const auto a=unsigned(pos);const double f=pos-a;const double delayed=string[a]*(1-f)+string[(a+1)%string.size()]*f;s.stringLP+=(.12+.75*t)*(delayed-s.stringLP);const double excitation=s.excite>0?n*(.3+.5*t):0.;if(s.excite>0)--s.excite;string[stringWrite]=std::clamp(s.stringLP*s.feedback+excitation,-2.,2.);stringWrite=(stringWrite+1)%string.size();return delayed*.7;}
        if(i==6){double burst=std::exp(-s.age/ .014);for(int k=1;k<4;++k){const double dt=s.age-k*(.009+.006*t);if(dt>0)burst+=std::exp(-dt/.010);}const double ring=osc(s,0,s.freq)*std::exp(-s.age/.035);return n*(.20+.65*std::min(burst,1.5))+ring*.12;}
        static constexpr double ratios[6]={1.,1.342,1.769,2.117,2.513,2.891};
        double metal=0;for(int k=0;k<6;++k)metal+=pulse(s,k,s.freq*ratios[k]*(.28+.3*t));metal/=6.;
        if(i==7||i==8)return metal*(.85-.25*t)+n*(.1+.45*t);
        if(i==9)return metal*.55+n*.6+std::sin(metal*(3.+9*t))*.2;
        return std::sin(2*pi*s.phase[0]+(1+5*t)*std::sin(2*pi*s.phase[3]))*.5+metal*.3+n*.12;
    }
};
} // namespace ag
