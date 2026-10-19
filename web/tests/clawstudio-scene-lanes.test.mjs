import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const script=fs.readFileSync(new URL('../dist/clawstudio.html',import.meta.url),'utf8');
const section=(start,end)=>{const i=script.indexOf(start),j=script.indexOf(end,i);assert.ok(i>=0&&j>i,'Missing inline conductor helper');return script.slice(i,j)};
const snapshotFn=section('function snapshot(){','\n  function persist(){');
const recallFn=section('function loadScene(index){','\n  function nextScene(index){');
function makeHarness(){
 const parts=[
 'let sceneIndex=0,queued=-1,bar=0,barOffset=0,stored=0,refreshed=0,applied=0;',
 "const DESTINATIONS=['MONO','POLY','TEXTURE','ACID','DRUM MACHINE','ALL SYNTHS','MIDI OUT'];",
 'const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));',
 'const lanes=Array.from({length:4},(_,i)=>({enabled:i===0,target:DESTINATIONS[i],midiChannel:i+1,steps:Array.from({length:16},(_,j)=>({on:j%2===0,note:36+i*12+j,gate:.72,velocity:100}))}));',
 "const scenes=Array.from({length:8},(_,i)=>({name:'SCENE '+i,data:null}));",
 'const getCurrentScene=()=>scenes[sceneIndex];',
 'const captureScene=()=>({drumPattern:2,channels:{drums:{mute:true}}});',
 'const applyScene=s=>{applied++;};',
 'const persist=()=>{stored++};',
 'const refreshScenes=()=>{};',
 'const refreshLanes=()=>{refreshed++};',
 'const status=()=>{};',
 snapshotFn,recallFn,
 'return {snapshot,loadScene,lanes,scenes,get debug(){return {stored,refreshed,applied}}}'
 ];
 return new Function(parts.join('\n'))();
}
test('captured scenes snapshot all four lanes by value',()=>{
 const h=makeHarness();h.lanes[0].steps[0].note=24;h.lanes[1].enabled=true;h.lanes[2].target='MIDI OUT';
 h.snapshot();assert.equal(h.scenes[0].data.conductorLanes.length,4);assert.equal(h.scenes[0].data.conductorLanes[0].steps[0].note,24);
 h.lanes[0].steps[0].note=72;assert.equal(h.scenes[0].data.conductorLanes[0].steps[0].note,24);
});
test('scene recall restores lane settings and preserves legacy scenes',()=>{
 const h=makeHarness();
 h.lanes[0].steps[0]={on:true,note:12,gate:.3,velocity:65};h.lanes[2].enabled=true;h.lanes[2].target='MIDI OUT';
 h.snapshot();h.lanes[0].steps[0].note=92;h.lanes[2].enabled=false;h.lanes[2].target='POLY';
 h.loadScene(0);assert.equal(h.lanes[0].steps[0].note,12);assert.equal(h.lanes[0].steps[0].gate,.3);
 assert.equal(h.lanes[2].enabled,true);assert.equal(h.lanes[2].target,'MIDI OUT');assert.equal(h.debug.refreshed,1);
 h.scenes[1].data={drumPattern:0};h.lanes[0].steps[0].note=48;h.loadScene(1);
 assert.equal(h.lanes[0].steps[0].note,48,'Legacy scenes without lanes retain current CLAWSTEP data');
});
