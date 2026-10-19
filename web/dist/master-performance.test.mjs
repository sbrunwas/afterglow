import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const classes={};
const sandbox={Float32Array,Math,Number,Array,Set,Object,Map,console,sampleRate:48000,currentTime:0,
 AudioWorkletProcessor:class {constructor(){this.port={onmessage:null}}},registerProcessor:(id,cls)=>classes[id]=cls};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('./master-fx-worklet.js',import.meta.url),'utf8'),sandbox);
const create=()=>new classes['claw-master-performance-fx']();
function block(processor,frames=128,fill=i=>Math.sin(i*.1)*.25){
 const l=Float32Array.from({length:frames},(_,i)=>fill(i)),r=Float32Array.from({length:frames},(_,i)=>fill(i)*.7);
 const out=[new Float32Array(frames),new Float32Array(frames)];processor.process([[l,r]],[out]);
 sandbox.currentTime+=frames/sandbox.sampleRate;
 for(let i=0;i<frames;i++){assert.ok(Number.isFinite(out[0][i])&&Number.isFinite(out[1][i]),'Nonfinite DSP');assert.ok(Math.abs(out[0][i])<=1.5&&Math.abs(out[1][i])<=1.5)}
 return {inL:l,outL:out[0],outR:out[1]};
}
test('disabled FX is bit-accurately dry even with queued gestures',()=>{
 sandbox.currentTime=0;const p=create();const b=block(p);assert.deepEqual(Array.from(b.outL),Array.from(b.inL));
});
test('gate gesture actually suppresses audio and release restores dry path',()=>{
 sandbox.currentTime=0;const p=create();
 p.port.onmessage({data:{type:'state',enabled:true,mix:1,maps:[],macro:0}});
 p.port.onmessage({data:{type:'step',effect:'GATE',at:0,duration:.5,amount:1}});
 let sum=0,ref=0;
 for(let i=0;i<90;i++){const b=block(p);if(i>8&&i<75)for(let j=0;j<128;j++){sum+=b.outL[j]**2;ref+=b.inL[j]**2}}
 assert.ok(sum<ref*.85, 'GATE must reduce programmed audio energy');
 p.port.onmessage({data:{type:'state',enabled:false,mix:1,maps:[],macro:0}});
 for(let i=0;i<12;i++)block(p);
 const clean=block(p);assert.ok(Math.abs(clean.outL[10]-clean.inL[10])<.0005);
});
test('all rhythmic modes render bounded, nontrivial audio',()=>{
 for(const effect of ['RETRIG','REVERSE','TAPE','CRUSH','GATE','FILTER','DELAY','SHUFFLE']){
  sandbox.currentTime=0;const p=create();for(let i=0;i<30;i++)block(p,128,k=>Math.sin((i*128+k)*.03)*.6);
  p.port.onmessage({data:{type:'state',enabled:true,mix:1,maps:[],macro:0}});
  p.port.onmessage({data:{type:'step',effect,at:sandbox.currentTime+.001,duration:.5,amount:.8}});
  let energy=0,diff=0;for(let i=0;i<15;i++){const b=block(p,128,k=>Math.sin((i*128+k)*.045)*.62);for(let j=0;j<128;j++){energy+=b.outL[j]**2;diff+=(b.outL[j]-b.inL[j])**2}}
  assert.ok(energy>=0);assert.ok(diff>1e-6,'No processing change for '+effect);
 }
});
test('automated transition runs across audio blocks then returns to zero',()=>{
 sandbox.currentTime=0;const p=create();
 p.port.onmessage({data:{type:'state',enabled:true,mix:.5,maps:[{target:'FILTER',depth:.8},{target:'DRIVE',depth:.8}],macro:0}});
 p.port.onmessage({data:{type:'run',start:.01,duration:.1}});
 for(let i=0;i<90;i++)block(p);
 assert.equal(p.transition,null);
 assert.equal(p.macro,0);
});
