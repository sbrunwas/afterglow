import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clawPatchbay} from '../dist/poly-modular.js';

const root = new URL('../dist/', import.meta.url);
const read = file=>readFileSync(new URL(file,root),'utf8');

test('JP-inspired Poly panel preserved and expansion is separate',()=>{
 const code=read('rack-devices.js');
 assert.match(code,/makePolyPanel\(cfg,p\)/);
 assert.match(code,/clawPatchbay\.panel\(mount\.querySelector\('\.cri'\),'poly'/);
 assert.match(code,/type==='poly'\?\{routes:\[\],rates:clawPatchbay\.ratesSafe\(\)\}/);
 assert.match(code,/polyModPanel\?\.destroy\(\)/);
 assert.match(code,/refreshUI:\(\)=>\{syncUI\(\);syncPolyMod\(\);polyModPanel\?\.refresh\(\)\}/);
 assert.ok(read('clawstudio.html').includes('poly-modular.css'));
 assert.ok(read('poly/index.html').includes('poly-modular.css'));
 assert.ok(read('devices.html').includes('poly-modular.css'));
});

test('Poly routes are bounded, unique, and reject unsupported destinations',()=>{
 const clean=clawPatchbay.routesSafe([
   {source:'LFO A',dest:'LP FREQ',depth:3},
   {source:'LFO A',dest:'LP FREQ',depth:.5},
   {source:'S&H',dest:'OSC2 PITCH',depth:-.3},
   {source:'VOICE OSC',dest:'PITCH',depth:.2},
   {source:'LFO A',dest:'KICK',depth:.5},
   {source:'INVALID',dest:'LP FREQ',depth:.5},
 ],'poly');
 assert.equal(clean.length,3);
 assert.equal(clean[0].depth,1);
 assert.equal(clean[1].source,'S&H');
 assert.equal(clean[2].source,'VOICE OSC');
 assert.equal(clawPatchbay.routesSafe(null,'poly').length,0);
 assert.equal(clawPatchbay.routesSafe(clean,'mono').some(x=>x.source==='VOICE OSC'),false);
});

test('Legacy Poly presets without modular state load with safe defaults',()=>{
 const rates=clawPatchbay.ratesSafe();
 assert.ok(rates.a>0&&rates.b>0&&rates.hold>0);
 assert.deepEqual(clawPatchbay.routesSafe(undefined,'poly'),[]);
 assert.equal(clawPatchbay.ratesSafe({hold:1000}).hold,16);
 assert.equal(clawPatchbay.ratesSafe({a:-2}).a,.03);
});

test('S&H, cross-voice sources, and per-voice CV route to actual WebAudio parameters',()=>{
 class Param{
   constructor(){this.value=0;this.events=[]}
   setValueAtTime(v,t){this.events.push(['set',v,t]);this.value=v}
   setTargetAtTime(v,t,d){this.events.push(['target',v,t,d]);this.value=v}
   linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);this.value=v}
   cancelScheduledValues(t){this.events.push(['cancel',t])}
 }
 class Node{
   constructor(){this.frequency=new Param();this.offset=new Param();this.gain=new Param();this.connections=[];this.stopped=false}
   connect(n){this.connections.push(n);return n}
   disconnect(n){this.connections=this.connections.filter(x=>n&&x!==n)}
   start(){}
   stop(){this.stopped=true}
 }
 const ctx={currentTime:0,sampleRate:48000,createOscillator:()=>new Node(),
   createConstantSource:()=>new Node(),createGain:()=>new Node()};
 const previous=new Node(),previousEnv=new Node();
 const targets={'PITCH':new Param(),'LP FREQ':new Param(),'OSC2 PITCH':new Param()};
 const cv=clawPatchbay.makeAudio(ctx,'poly',targets,{
   routes:[{source:'S&H',dest:'LP FREQ',depth:.6},
     {source:'VOICE OSC',dest:'OSC2 PITCH',depth:.5},
     {source:'VOICE ENV',dest:'PITCH',depth:.2}],
   rates:{a:.8,b:.3,hold:8}
 },{startAt:.01,stopAt:1,seed:57,previousVoice:{oscillator:previous,envelope:previousEnv}});
 cv.noteOn(.03,.35,{velocity:.8});
 assert.equal(cv.routes.length,3);
 assert.ok(cv.getSource('S&H').offset.events.filter(e=>e[0]==='set').length>2);
 assert.ok(previous.connections.length>0);
 assert.ok(previousEnv.connections.length>0);
 cv.setRoutes([{source:'LFO B',dest:'PITCH',depth:-.08}]);
 assert.equal(cv.routes.length,1);
 cv.setRates({a:5,b:3,hold:4});
 cv.dispose();
 assert.ok(cv.getSource('LFO A').stopped);
});

test('Each patch can contain at most eight cables',()=>{
 const sources=clawPatchbay.SOURCE_BY_TYPE.poly;
 const dst=clawPatchbay.DEST_IDS.poly;
 const many=[];
 for(const source of sources)for(const dest of dst)many.push({source,dest,depth:.5});
 assert.equal(clawPatchbay.routesSafe(many,'poly').length,8);
});
