// SPDX-License-Identifier: AGPL-3.0-only
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createEngine } from '../dist/wasm-runtime.js';
import { createInitialState } from '../dist/state.js';
const bytes=fs.readFileSync(new URL('../dist/afterglow.wasm', import.meta.url));
const module=await WebAssembly.compile(bytes);
const probe = new WebAssembly.Instance(module, {wasi_snapshot_preview1:{fd_write:()=>0,fd_close:()=>8,fd_seek:()=>8}});
assert.equal(probe.exports.memory.buffer.byteLength, 128*1024*1024);
assert.throws(()=>probe.exports.memory.grow(1));
const a=createEngine(module,48000),b=createEngine(module,48000);
const bank=a.factoryBank(),js=createInitialState().bank;
assert.equal(bank.chainLength,js.chainLength);assert.deepEqual(bank.chain,js.chain);
for(let p=0;p<16;p++)for(let v=0;v<11;v++)for(let s=0;s<64;s++)for(const key of ['on','velocity','probability','ratchets']){
 const x=bank.patterns[p].steps[v][s][key],y=js.patterns[p].steps[v][s][key];
 if(typeof x==='boolean')assert.equal(x,y);else assert.ok(Math.abs(x-y)<1e-6);
}
a.play();b.play();let energy=0;
for(let k=0;k<1000;k++){
 const left=a.render(128),right=b.render(128);
 for(let i=0;i<128;i++)for(let c=0;c<2;c++){
  assert.ok(Number.isFinite(left[c][i]));assert.ok(Math.abs(left[c][i])<=1);assert.equal(left[c][i],right[c][i]);energy+=left[c][i]**2;
 }
}
assert.ok(energy>1);a.pause();const ppq=a.position().ppq;a.render();assert.equal(a.position().ppq,ppq);
a.stop();assert.ok(a.render()[0].every(x=>x===0));
const state=createInitialState();state.voices[0].model=2;state.voices[0].reverse=true;
const sampleLeft=Float32Array.from({length:4800},(_,i)=>i<2400?-.2:.2);
const sampleRight=Float32Array.from(sampleLeft,x=>-x);
a.setState(state);a.setSample(0,sampleLeft,sampleRight,48000);a.trigger(0,1);
const pair=a.render(128);assert.ok(pair[0][64]>0&&pair[1][64]<0);
a.stop();state.voices[0].reverse=false;a.setState(state);a.trigger(0,1);
assert.ok(a.render(128)[0][64]<0,'Forward sample differs from reversed playback');
assert.throws(()=>a.render(4097));a.destroy();b.destroy();
// Host callback partitioning must not alter transport timing or samples.
const small=createEngine(module,48000),large=createEngine(module,48000);small.play();large.play();
for(let block=0;block<20;block++) {
 const expected=large.render(4096);
 for(let part=0;part<32;part++) {
  const actual=small.render(128);
  for(let c=0;c<2;c++)for(let i=0;i<128;i++)assert.equal(actual[c][i],expected[c][part*128+i]);
 }
}
small.destroy();large.destroy();
for(const rate of [44100,48000,96000]) {
 const engine=createEngine(module,rate),voiceState=createInitialState();
 for(let model=0;model<2;model++)for(let voice=0;voice<11;voice++) {
  engine.stop();voiceState.voices[voice].model=model;engine.setState(voiceState);engine.trigger(voice,1);
  let sum=0;
  for(let block=0;block<150;block++)for(const channel of engine.render(128))for(const value of channel) {
   assert.ok(Number.isFinite(value)&&Math.abs(value)<=1);sum+=value*value;
  }
  assert.ok(sum>1e-5,`Silent voice ${voice}, model ${model}, rate ${rate}`);
 }
 engine.destroy();
}
console.log('WASM factory, stereo samples, controls, instance independence, bounds PASS; energy',energy);
