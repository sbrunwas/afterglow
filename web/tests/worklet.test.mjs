import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createInitialState} from '../dist/state.js';
const module=await WebAssembly.compile(await readFile(new URL('../dist/afterglow.wasm',import.meta.url)));
let Processor;
globalThis.sampleRate=48000;
// In a real AudioWorklet the global render clock is always supplied by the browser.
globalThis.currentFrame=0;
globalThis.AudioWorkletProcessor=class {constructor(){this.port={messages:[],postMessage(data){this.messages.push(data);},onmessage:null};}};
globalThis.registerProcessor=(name,implementation)=>{assert.equal(name,'afterglow-processor');Processor=implementation;};
await import('../dist/worklet.js');
const make=()=>new Processor({processorOptions:{module,state:createInitialState()}});
const message=(p,data)=>p.port.onmessage({data});
function block(p,n=128){const out=[new Float32Array(n),new Float32Array(n)];assert.equal(p.process([], [out]),true);globalThis.currentFrame+=n;for(const a of out)assert.ok(a.every(Number.isFinite));return out;}
const energy=a=>a.reduce((n,v)=>n+Math.abs(v),0);

test('real AudioWorklet module initializes, acknowledges messages, renders and reports position',()=>{
 const p=make();assert.deepEqual(p.port.messages,[{type:'ready'}]);
 message(p,{type:'play',requestId:10});assert.deepEqual(p.port.messages.at(-1),{type:'ack',requestId:10});
 let total=0;for(let i=0;i<40;i++)total+=energy(block(p)[0]);assert.ok(total>1);
 const pos=p.port.messages.find(x=>x.type==='position');assert.ok(pos.playing);assert.ok(pos.ppq>0);assert.ok(pos.peak>0&&pos.peak<=1);assert.equal(pos.pattern,0);
 message(p,{type:'pause'});const paused=p.engine.position().ppq;block(p);assert.equal(p.engine.position().ppq,paused);assert.equal(p.engine.position().playing,false);
 message(p,{type:'stop'});assert.equal(p.engine.position().ppq,0);assert.equal(energy(block(p)[0]),0);
 message(p,{type:'dispose',requestId:11});assert.equal(p.engine,null);assert.equal(energy(block(p)[0]),0);assert.equal(p.port.messages.at(-1).requestId,11);
});

test('worklet handles stereo samples and bad messages without losing the engine',()=>{
 const p=make(),state=createInitialState();state.voices[0].model=2;state.voices[0].pan=0;
 message(p,{type:'state',state,requestId:1});
 message(p,{type:'sample',voice:0,left:new Float32Array(4096).fill(.4),right:new Float32Array(4096).fill(-.2),sampleRate:48000,requestId:2});
 message(p,{type:'trigger',voice:0,velocity:1});const a=block(p,512);assert.ok(a[0].some(v=>v>0));assert.ok(a[1].some(v=>v<0));
 message(p,{type:'sample',voice:99,left:Float32Array.of(1),sampleRate:48000,requestId:42});const error=p.port.messages.at(-1);assert.equal(error.type,'error');assert.equal(error.requestId,42);assert.equal(error.phase,'sample');
 message(p,null);assert.equal(p.port.messages.at(-1).phase,'message');message(p,{type:'unknown',requestId:43});assert.equal(p.port.messages.at(-1).type,'error');assert.ok(p.engine);block(p);message(p,{type:'dispose'});
});

test('worklet initialization failure stays silent and returns a clear error',()=>{
 const p=new Processor({processorOptions:{module:null}});assert.equal(p.port.messages[0].type,'error');assert.equal(p.port.messages[0].phase,'initialize');assert.equal(energy(block(p)[0]),0);
});

test('sample-frame scheduled start stays silent until its render boundary',()=>{
 const p=make();
 const at=globalThis.currentFrame+384;
 message(p,{type:'playAt',audioFrame:at,requestId:33});
 assert.equal(p.port.messages.at(-1).type,'ack');
 let pre=0;
 for(let i=0;i<3;i++)pre+=energy(block(p)[0]);
 assert.equal(pre,0);
 let after=0;for(let i=0;i<20;i++)after+=energy(block(p)[0]);
 assert.ok(after>0);
 message(p,{type:'stop'});
});
