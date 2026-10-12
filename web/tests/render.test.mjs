import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInitialState} from '../dist/state.js';
import {renderAudio} from '../dist/render-worker.js';
const module=await WebAssembly.compile(await readFile(new URL('../dist/afterglow.wasm',import.meta.url)));

test('offline worker creates a deterministic stereo PCM WAV with tempo length and ringing tail',()=>{
 const s=createInitialState();s.tempo=120;s.swing=0;s.voices[0].model=2;
 for(const p of s.bank.patterns)for(const row of p.steps)for(const t of row)t.on=false;
 s.bank.patterns[0].steps[0][0].on=true;
 const samples=Array(11).fill(null);samples[0]={name:'stereo',sampleRate:48000,left:new Float32Array(4096).fill(.4),right:new Float32Array(4096).fill(-.2)};
 const progress=[],buffer=renderAudio(module,s,samples,1,48000,p=>progress.push(p));
 const view=new DataView(buffer),text=(o,n)=>Buffer.from(buffer,o,n).toString();assert.equal(text(0,4),'RIFF');assert.equal(text(8,4),'WAVE');assert.equal(text(36,4),'data');assert.equal(view.getUint32(4,true),buffer.byteLength-8);assert.equal(view.getUint16(20,true),1);assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint16(34,true),16);assert.equal(view.getUint32(24,true),48000);assert.equal(view.getUint32(40,true),144000*4);assert.equal(buffer.byteLength,44+144000*4);
 let left=0,right=0;for(let i=0;i<4096;i++){left+=view.getInt16(44+i*4,true);right+=view.getInt16(46+i*4,true);}assert.ok(left>0);assert.ok(right<0);
 for(let i=120000;i<144000;i++){assert.equal(view.getInt16(44+i*4,true),0);assert.equal(view.getInt16(46+i*4,true),0);}
 assert.equal(progress.at(-1),1);assert.ok(progress.every((p,i)=>p>=0&&p<=1&&(!i||p>=progress[i-1])));
 assert.deepEqual(new Uint8Array(buffer),new Uint8Array(renderAudio(module,s,samples,1,48000)));
});

test('offline renderer rejects unsupported length and invalid state before rendering',()=>{
 const state=createInitialState(),samples=Array(11).fill(null);assert.throws(()=>renderAudio(module,state,samples,3),/render length/);state.tempo=NaN;assert.throws(()=>renderAudio(module,state,samples,1),/tempo/);
});
