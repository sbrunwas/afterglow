import test from 'node:test';
import assert from 'node:assert/strict';
import {AfterglowAudio} from '../dist/audio.js';
import {createInitialState} from '../dist/state.js';

let contexts=0,nodes=0,order=[];
class MockContext {
 constructor(){contexts++;this.state='suspended';this.sampleRate=48000;this.destination={};this.audioWorklet={addModule:async()=>{order.push('module');}};}
 resume(){order.push('resume');this.state='running';return Promise.resolve();}
 close(){this.state='closed';return Promise.resolve();}
 async decodeAudioData(){return {length:4,duration:4/48000,sampleRate:48000,numberOfChannels:1,getChannelData:()=>Float32Array.of(0,.1,-.2,0)};}
}
class MockNode {
 constructor(){nodes++;this.messages=[];this.port={postMessage:data=>this.messages.push(data),onmessage:null};queueMicrotask(()=>this.port.onmessage({data:{type:'ready'}}));}
 connect(){this.connected=true;}
 disconnect(){this.connected=false;}
}
globalThis.AudioContext=MockContext;globalThis.AudioWorkletNode=MockNode;

test('audio initializes once across concurrent gestures and resumes before async work',async()=>{
 const audio=new AfterglowAudio();audio.module={};await Promise.all([audio.init(),audio.init()]);assert.equal(contexts,1);assert.equal(nodes,1);assert.equal(order[0],'resume');assert.equal(audio.node.connected,true);
 assert.equal(audio.node.messages.filter(m=>m.type==='sample').length,11);
 const count=audio.node.messages.length;audio.setSamples(audio.samples);assert.equal(audio.node.messages.length,count);
 const samples=audio.samples.slice();samples[2]={name:'a',sampleRate:48000,left:Float32Array.of(.1),right:Float32Array.of(-.1)};audio.setSamples(samples);assert.equal(audio.node.messages.length,count+1);assert.equal(audio.node.messages.at(-1).voice,2);
 audio.setSamples(samples);assert.equal(audio.node.messages.length,count+1);samples[2]=null;audio.setSamples(samples);assert.equal(audio.node.messages.at(-1).left,null);
 await audio.play();assert.equal(audio.node.messages.at(-1).type,'play');audio.pause();assert.equal(audio.node.messages.at(-1).type,'pause');audio.stop();assert.equal(audio.node.messages.at(-1).type,'stop');
});

test('controller transmits edited bank once and parameter updates without the full bank',()=>{
 const audio=new AfterglowAudio();audio.node=new MockNode();audio.node.port.onmessage=()=>{};const s=createInitialState();audio.setState(s);assert.ok(audio.node.messages.at(-1).state.bank);
 s.tempo=130;audio.setState(s);assert.equal('bank' in audio.node.messages.at(-1).state,false);s.bank.patterns[0].steps[0][1].on=true;audio.setState(s);assert.ok(audio.node.messages.at(-1).state.bank);
});

test('sample decoding works before audio initialization and preserves mono data as stereo',async()=>{
 const audio=new AfterglowAudio();const sample=await audio.loadSample(1,{size:20,name:'mono.wav',arrayBuffer:async()=>new ArrayBuffer(20)});assert.equal(audio.node,null);assert.deepEqual(sample.left,sample.right);assert.notEqual(sample.left,sample.right);assert.equal(sample.name,'mono.wav');
 await assert.rejects(()=>audio.loadSample(11,{size:1}),/Select a drum/);await assert.rejects(()=>audio.loadSample(0,{size:51*1024*1024}),/50 MB/);
});
