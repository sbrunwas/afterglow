// SPDX-License-Identifier: AGPL-3.0-only
#include "core/DrumEngine.h"
#include "core/Sequencer.h"
#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <new>

namespace {
constexpr int maxFrames=4096,maxSampleFrames=1920000;
constexpr std::size_t maxSampleFloats=16*1024*1024; // 64 MiB across all stereo samples.
struct Engine {
    ag::DrumEngine drum;
    ag::Sequencer sequence;
    ag::SequenceData bank=ag::Sequencer::factoryPatterns();
    std::array<ag::SampleData,11> samples;
    std::array<float,maxFrames*2> output{};
    double sr=48000,ppq=0;
    float tempo=124,swing=0,master=.75f,masterCurrent=.75f,masterDrive=0,driveCurrent=0,peak=0;
    int selected=0;
    bool chainMode=false,playing=false;
    explicit Engine(double rate):sr(std::clamp(rate,8000.,192000.)) {drum.prepare(sr);sequence.setData(&bank);}
};
float bounded(float x,float low,float high,float fallback=0){return std::isfinite(x)?std::clamp(x,low,high):fallback;}
void hit(void* ptr,int voice,float velocity){static_cast<Engine*>(ptr)->drum.trigger(voice,velocity);}
}
extern "C" {
Engine* ag_create(double rate) {if(!std::isfinite(rate))rate=48000;return new(std::nothrow) Engine(rate);}
void ag_destroy(Engine* e){delete e;}
void ag_voice(Engine* e,int i,int model,float tune,float decay,float tone,float level,float pan,float drive,int mute,int solo,int reverse,float start,float end){
    if(!e)return;ag::VoiceParams p;p.model=ag::Model(std::clamp(model,0,4));p.tune=tune;p.decay=decay;p.tone=tone;p.level=level;p.pan=pan;p.drive=drive;p.mute=mute!=0;p.solo=solo!=0;p.reverse=reverse!=0;p.sampleStart=start;p.sampleEnd=end;e->drum.setParams(i,p);
}
void ag_step(Engine* e,int p,int v,int s,int on,float velocity,float probability,int ratchets){
    if(!e||p<0||p>=16||v<0||v>=11||s<0||s>=64)return;
    e->bank.patterns[p].steps[v][s]={on!=0,bounded(velocity,0,1,.8f),bounded(probability,0,1,1),std::clamp(ratchets,1,4)};
}
void ag_length(Engine* e,int p,int length){if(e&&p>=0&&p<16)e->bank.patterns[p].length=std::clamp(length,1,64);}
void ag_chain(Engine* e,int index,int pattern,int length){if(!e)return;if(index>=0&&index<64)e->bank.chain[index]=std::clamp(pattern,0,15);e->bank.chainLength=std::clamp(length,1,64);}
void ag_transport(Engine* e,float tempo,float swing,float master,int selected,int chainMode){if(!e)return;e->tempo=bounded(tempo,30,300,124);e->swing=bounded(swing,0,.66f);e->master=bounded(master,0,1,.75f);e->selected=std::clamp(selected,0,15);e->chainMode=chainMode!=0;}
void ag_masterDrive(Engine* e,float drive){if(e)e->masterDrive=bounded(drive,0,1);}
void ag_play(Engine* e){if(e)e->playing=true;}
void ag_pause(Engine* e){if(e){e->playing=false;e->sequence.reset();}}
void ag_stop(Engine* e){if(e){e->playing=false;e->ppq=0;e->sequence.reset();e->drum.reset();e->peak=0;}}
void ag_trigger(Engine* e,int v,float velocity){if(e)e->drum.trigger(v,velocity);}
// The pointer data are copied here, outside render. A return of 0 rejects oversized input.
int ag_sample(Engine* e,int voice,const float* left,const float* right,int frames,double rate){
    if(!e||voice<0||voice>=11||frames<0||frames>maxSampleFrames||!std::isfinite(rate)||rate<8000||rate>192000||frames>rate*10)return 0;
    if(frames>0&&!left)return 0;
    std::size_t count=std::size_t(frames)*2;
    for(int i=0;i<11;++i)if(i!=voice)count+=e->samples[i].left.size()+e->samples[i].right.size();
    if(count>maxSampleFloats)return 0;
    ag::SampleData replacement;replacement.left.resize(frames);replacement.right.resize(frames);replacement.sampleRate=rate;
    for(int i=0;i<frames;++i){replacement.left[i]=bounded(left[i],-8,8);replacement.right[i]=bounded(right?right[i]:left[i],-8,8);}
    e->drum.setSample(voice,nullptr);
    auto& s=e->samples[voice];s=std::move(replacement); // Release old capacity, including cleared samples.
    e->drum.setSample(voice,frames?&s:nullptr);return 1;
}
float* ag_render(Engine* e,int frames){
    if(!e||frames<0||frames>maxFrames)return nullptr;
    e->peak=0;const double increment=e->tempo/(60*e->sr);
    const float smoothing=float(1-std::exp(-1/(e->sr*.01)));
    for(int n=0;n<frames;++n){
        e->sequence.process(e->ppq,increment,e->playing,e->selected,e->chainMode,e->swing,e,hit);
        float l[11],r[11];e->drum.renderFrame(l,r);float sumL=0,sumR=0;
        for(int i=0;i<11;++i){sumL+=l[i];sumR+=r[i];}
        e->masterCurrent+=smoothing*(e->master-e->masterCurrent);
        sumL*=e->masterCurrent;sumR*=e->masterCurrent;
        e->driveCurrent+=smoothing*(e->masterDrive-e->driveCurrent);
        if(e->driveCurrent>.001f){sumL=std::tanh(sumL*(1+8*e->driveCurrent))/(1+2*e->driveCurrent);sumR=std::tanh(sumR*(1+8*e->driveCurrent))/(1+2*e->driveCurrent);}
        sumL=bounded(sumL,-1,1);sumR=bounded(sumR,-1,1);
        e->output[n]=sumL;e->output[maxFrames+n]=sumR;e->peak=std::max(e->peak,std::max(std::abs(sumL),std::abs(sumR)));
        if(e->playing)e->ppq+=increment;
    }
    return e->output.data();
}
int ag_currentStep(Engine* e){return e?e->sequence.currentStep():-1;}
int ag_currentPattern(Engine* e){return e?e->sequence.currentPattern():0;}
int ag_playing(Engine* e){return e&&e->playing;}
double ag_ppq(Engine* e){return e?e->ppq:0;}
float ag_peak(Engine* e){return e?e->peak:0;}
float ag_getStep(Engine* e,int p,int v,int s,int field){if(!e||p<0||p>=16||v<0||v>=11||s<0||s>=64)return 0;const auto& a=e->bank.patterns[p].steps[v][s];switch(field){case 0:return a.on;case 1:return a.velocity;case 2:return a.probability;case 3:return float(a.ratchets);default:return 0;}}
int ag_getLength(Engine* e,int p){return e&&p>=0&&p<16?e->bank.patterns[p].length:16;}
int ag_getChain(Engine* e,int i){return e&&i>=0&&i<64?e->bank.chain[i]:0;}
int ag_getChainLength(Engine* e){return e?e->bank.chainLength:1;}
}
