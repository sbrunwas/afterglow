// SPDX-License-Identifier: AGPL-3.0-only
#include "../src/bridge.cpp"
#include <cassert>
#include <iostream>
int main(){
 auto* e=ag_create(48000);assert(e);ag_play(e);
 ag::DrumEngine reference;reference.prepare(48000);ag::Sequencer sequence;auto bank=ag::Sequencer::factoryPatterns();sequence.setData(&bank);double ppq=0,inc=124./(60*48000);double energy=0;
 for(int b=0;b<1000;++b){float* out=ag_render(e,128);for(int n=0;n<128;++n){sequence.process(ppq,inc,true,0,false,0,&reference,[](void* p,int v,float velocity){static_cast<ag::DrumEngine*>(p)->trigger(v,velocity);});float l[11],r[11],sl=0,sr=0;reference.renderFrame(l,r);for(int v=0;v<11;++v){sl+=l[v];sr+=r[v];}assert(std::abs(out[n]-std::clamp(sl*.75f,-1.f,1.f))<1e-7);assert(std::abs(out[4096+n]-std::clamp(sr*.75f,-1.f,1.f))<1e-7);energy+=out[n]*out[n];ppq+=inc;}}
 assert(energy>1);assert(!ag_render(e,4097));double before=ag_ppq(e);ag_pause(e);ag_render(e,128);assert(ag_ppq(e)==before);ag_stop(e);auto* out=ag_render(e,128);for(int n=0;n<128;++n)assert(out[n]==0);
 std::vector<float> left(4800,.2f),right(4800,-.2f);assert(ag_sample(e,0,left.data(),right.data(),4800,48000));ag_voice(e,0,2,0,.5,.5,.8,0,0,0,0,0,0,1);ag_trigger(e,0,1);out=ag_render(e,128);assert(out[64]>0&&out[4096+64]<0);assert(!ag_sample(e,0,left.data(),nullptr,4800,0));ag_destroy(e);std::cout<<"Native bridge equals direct C++ engine; controls/sample guards passed\n";
}
