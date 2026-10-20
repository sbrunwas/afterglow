// ClawStudio v0.21: studio recorder, swing and kit validation regression tests.
// Run through: npm test (Node 22+). Tests read the actual built page/processor.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createInitialState,validateState} from '../dist/state.js';

const html=readFileSync(new URL('../dist/clawstudio.html',import.meta.url),'utf8');
const capture=readFileSync(new URL('../dist/clawstudio-capture.worklet.js',import.meta.url),'utf8');

test('master WAV encoder exports properly interleaved 24-bit stereo', async()=>{
  const a=html.indexOf('function wav(chunks){');
  const b=html.indexOf('\nfunction updateRecordClock()',a);
  assert.ok(a>=0&&b>a,'WAV function must be present');
  const fun=vm.runInNewContext(html.slice(a,b)+'\nwav',
    {ArrayBuffer,DataView,Blob,Math,Error,ctx:{sampleRate:48000}});
  const result=fun([[new Float32Array([1,-1]),new Float32Array([0,.5])]]);
  const data=new DataView(await result.arrayBuffer());
  assert.equal(data.getUint32(24,true),48000);
  assert.equal(data.getUint16(22,true),2);
  assert.equal(data.getUint16(34,true),24);
  assert.equal(data.getUint16(32,true),6);
  assert.equal(data.getUint32(40,true),12);
  assert.equal(data.byteLength,56);
  assert.deepEqual([...new Uint8Array(data.buffer,44,3)],[255,255,127]);
});

test('drum kit is validated before any live array assignment',()=>{
  const a=html.indexOf('function restoreKitData(data){');
  const b=html.indexOf('async function loadKit(file)',a);
  assert.ok(a>=0&&b>a);
  const fragment=html.slice(a,b);
  for(const phrase of ['validateState(', 'validateSamples(decoded);', 'patterns[i]=valid.bank.patterns[i]']) {
    assert.ok(fragment.includes(phrase),phrase);
  }
  assert.ok(fragment.indexOf('validateSamples(decoded);')<fragment.indexOf('patterns[i]=valid.bank.patterns[i]'));
});

test('invalid pattern content cannot pass official kit validator',()=>{
  const x=createInitialState();
  x.bank.patterns[0].steps[0][0].velocity=NaN;
  assert.throws(()=>validateState(x),/Invalid velocity/);
});

test('legacy missing swing can be normalized without resetting current value',()=>{
  const base=createInitialState();
  const old={...base};delete old.swing;
  assert.equal(validateState({...old,swing:base.swing}).swing,base.swing);
});

test('swing scheduling uses odd-step delays for all synths and sidechain',()=>{
  const a=html.indexOf('function tick(){'),b=html.indexOf('function drumPosition(',a);
  const src=html.slice(a,b);
  assert.match(src,/const when=next\+\(\(step&1\)\?swing\*unit:0\)/);
  for (const component of ['conductor?.onStep(step,when,duration)','bass01.scheduleStep(step,when,duration)',
    'module.scheduleStep(step,when,duration)','kickSidechain.trigger(when,kick)'])
    assert.ok(src.includes(component),component);
});

test('tab starvation pauses JAM rather than producing stale note bursts',()=>{
  const a=html.indexOf('function tick(){'),b=html.indexOf('function drumPosition(',a);
  const src=html.slice(a,b);
  assert.ok(src.indexOf('next<ctx.currentTime-.12')>=0);
  assert.ok(src.indexOf('pause();')<src.indexOf('while(next<ctx.currentTime+.12'));
});

test('stereo capture worklet posts transferred samples and final done',()=>{
  const sent=[];let Klass;
  class FakeProcessor{constructor(){this.port={postMessage:(m)=>sent.push(m)};}}
  const context={AudioWorkletProcessor:FakeProcessor,registerProcessor:(n,k)=>{assert.equal(n,'clawstudio-stereo-capture');Klass=k},
    Float32Array,Number,Math,currentFrame:0,sampleRate:48000};
  vm.runInNewContext(capture,context);
  const processor=new Klass();
  processor.port.onmessage({data:{type:'startWav',id:42}});
  const l=new Float32Array(128).fill(.3),r=new Float32Array(128).fill(-.4);
  processor.process([[l,r]],[[new Float32Array(128),new Float32Array(128)]]);
  processor.port.onmessage({data:{type:'stopWav',id:42}});
  assert.equal(sent.find(m=>m.type==='wavChunk')?.left.length,128);
  assert.equal(sent.find(m=>m.type==='wavDone')?.copied,128);
});

test('recorder has 10-minute bounded cap and no ScriptProcessorNode',()=>{
  assert.ok(capture.includes('Math.floor(sampleRate * 600)'));
  assert.ok(!html.includes('createScriptProcessor(2048'));
  assert.ok(html.includes("'■ SAVE WAV '"));
});
