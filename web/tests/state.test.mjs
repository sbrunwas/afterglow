import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,validateState,validateSamples,encodePreset,decodePreset,exportMidi,MIDI_NOTES} from '../dist/state.js';

const emptySamples=()=>Array(11).fill(null);
function blank(){const s=createInitialState();for(const p of s.bank.patterns)for(const r of p.steps)for(const t of r){t.on=false;t.velocity=.8;}return s;}

test('factory state has independent steps and validates without aliasing',()=>{
 const s=createInitialState(),copy=validateState(s);assert.deepEqual(copy,s);
 copy.bank.patterns[0].steps[0][0].on=false;assert.equal(s.bank.patterns[0].steps[0][0].on,true);
 s.bank.patterns[0].steps[0][1].velocity=.1;assert.equal(s.bank.patterns[0].steps[1][1].velocity,.85);
 for(const mutate of [x=>x.tempo=NaN,x=>x.swing=.67,x=>x.voices[0].level=Infinity,x=>x.bank.patterns[1].length=1.5,x=>x.bank.patterns[0].steps[0][0].ratchets=5,x=>x.bank.chain[0]=16,x=>x.voices[1].sampleStart=.9,x=>x.chainMode=1]) {
  const invalid=createInitialState();if(mutate.toString().includes('sampleStart'))invalid.voices[1].sampleEnd=.5;mutate(invalid);assert.throws(()=>validateState(invalid));
 }
});

test('portable presets roundtrip stereo float32 audio, metadata, settings and sequences',()=>{
 const s=createInitialState();s.voices[3].model=2;s.voices[3].reverse=true;s.bank.patterns[2].length=37;s.selectedPattern=2;s.chainMode=true;
 const samples=emptySamples();samples[3]={name:'Stereo test.wav',sampleRate:44100,left:Float32Array.from([0,-0,.123456,-.8,1]),right:Float32Array.from([1,.3,-.7,0,-1])};
 const result=decodePreset(JSON.stringify(encodePreset(s,samples)));assert.deepEqual(result.state,s);assert.deepEqual(result.samples,samples);
 assert.equal(result.samples[3].left instanceof Float32Array,true);
 const renamed=emptySamples();renamed[0]={...samples[3],name:'x'.repeat(300)};assert.equal(encodePreset(s,renamed).samples[0].name.length,240);
});

test('sample validation rejects nonfinite, oversized, mismatched and over-budget audio',()=>{
 const invalid=[{sampleRate:0,left:new Float32Array(2),right:new Float32Array(2)},{sampleRate:48000,left:new Float32Array(2),right:new Float32Array(1)},{sampleRate:8000,left:new Float32Array(80001),right:new Float32Array(80001)},{sampleRate:48000,left:Float32Array.of(NaN),right:Float32Array.of(0)},{sampleRate:48000,left:Float32Array.of(17),right:Float32Array.of(0)}];
 for(const x of invalid){const a=emptySamples();a[0]=x;assert.throws(()=>validateSamples(a));}
 const a=emptySamples(),channel=new Float32Array(1500001);for(let i=0;i<4;i++)a[i]={sampleRate:192000,left:channel,right:channel};assert.throws(()=>validateSamples(a),/memory limit/);
});

test('preset metadata budgets are rejected before accessing encoded bytes',()=>{
 const budgetPreset=encodePreset(createInitialState());for(let i=0;i<4;i++){budgetPreset.samples[i]={sampleRate:192000,frames:1600000,encoding:'float32-le-base64'};Object.defineProperty(budgetPreset.samples[i],'left',{get(){throw Error('decoded-too-soon');}});}
 assert.throws(()=>decodePreset(budgetPreset),/memory limit/);
 for(const mutate of [p=>p.version=2,p=>p.samples[0].frames=3,p=>p.samples[0].encoding='other',p=>p.samples[0].left='%%%']) {
  const samples=emptySamples();samples[0]={name:'a',sampleRate:48000,left:Float32Array.of(1,0),right:Float32Array.of(0,1)};const p=encodePreset(createInitialState(),samples);mutate(p);assert.throws(()=>decodePreset(p));
 }
 const samples=emptySamples();samples[0]={name:'a',sampleRate:48000,left:Float32Array.of(1),right:Float32Array.of(0)};const p=encodePreset(createInitialState(),samples);const a=Buffer.alloc(4);a.writeFloatLE(NaN);p.samples[0].left=a.toString('base64');assert.throws(()=>decodePreset(p),/invalid audio/);
});

async function midiEvents(state){
 const a=new Uint8Array(await (await exportMidi(state)).arrayBuffer()),view=new DataView(a.buffer);assert.equal(Buffer.from(a.subarray(0,4)).toString(),'MThd');assert.equal(view.getUint16(12),960);assert.equal(Buffer.from(a.subarray(14,18)).toString(),'MTrk');assert.equal(view.getUint32(18),a.length-22);
 let i=22,tick=0;const events=[];const vlq=()=>{let n=0,b;do{b=a[i++];n=n*128+(b&127);}while(b&128);return n;};
 while(i<a.length){tick+=vlq();const status=a[i++];if(status===255){const type=a[i++],n=vlq(),bytes=Array.from(a.subarray(i,i+n));i+=n;events.push({tick,status,type,bytes});}else events.push({tick,status,note:a[i++],velocity:a[i++]});}
 return events;
}
test('MIDI export maps all 11 voices to channel 10 and includes tempo/end marker',async()=>{
 const s=blank();s.tempo=120;s.swing=0;for(let v=0;v<11;v++)s.bank.patterns[0].steps[v][0].on=true;
 const events=await midiEvents(s),notes=events.filter(e=>e.status===0x99);assert.deepEqual(notes.map(e=>e.note),MIDI_NOTES);assert.ok(notes.every(e=>e.tick===0&&e.velocity===102));assert.deepEqual(events.find(e=>e.type===81).bytes,[7,161,32]);assert.equal(events.at(-1).type,47);assert.equal(events.at(-1).tick,3840);
});
test('MIDI export preserves swing/ratchets and excludes probability-zero hits',async()=>{
 const s=blank();s.swing=.5;s.bank.patterns[0].length=3;
 s.bank.patterns[0].steps[0][0]={on:true,velocity:1,probability:1,ratchets:4};s.bank.patterns[0].steps[1][1]={on:true,velocity:.5,probability:1,ratchets:2};s.bank.patterns[0].steps[2][2]={on:true,velocity:1,probability:0,ratchets:1};
 const e=await midiEvents(s);assert.deepEqual(e.filter(e=>e.status===0x99).map(e=>[e.tick,e.note]),[[0,36],[90,36],[180,36],[270,36],[360,38],[420,38]]);assert.equal(e.at(-1).tick,720);assert.ok(e.every((x,i)=>!i||x.tick>=e[i-1].tick));
});
