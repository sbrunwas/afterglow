import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,validateState,encodePreset,decodePreset} from '../dist/state.js';
import {randomSound,randomAllDrums} from '../dist/randomize.js';

test('all-drum randomization respects a selected subset and leaves sequences/mixer controls alone',()=>{
 const state=createInitialState(),before=structuredClone(state);
 const voices=randomAllDrums(state.voices,[3,4],()=>.75);
 assert.ok(voices.every(voice=>voice.model===4));assert.deepEqual(state,before);
 for(let i=0;i<voices.length;i++)for(const key of ['level','pan','mute','solo','reverse','sampleStart','sampleEnd'])assert.equal(voices[i][key],before.voices[i][key]);
 assert.ok(randomAllDrums(state.voices,[3],()=>.1).every(voice=>voice.model===3));
 assert.throws(()=>randomAllDrums(state.voices,[]),/at least one engine/);
 assert.throws(()=>randomAllDrums(state.voices,[2]),/Invalid random engine/);
});

test('new engines randomize within their chosen family and sample mode stays unchanged',()=>{
 const params=createInitialState().voices[0];
 for(const model of [0,1,3,4]){const input={...params,model};const result=randomSound(input,0,()=>.2);assert.equal(result.model,model);assert.notEqual(result.tune,input.tune);assert.notEqual(result.tone,input.tone);}
 const sample={...params,model:2};assert.deepEqual(randomSound(sample,0),sample);
});

test('engine pools and new models persist; old browser kits default to every built-in engine',()=>{
 const state=createInitialState();assert.deepEqual(state.randomEnginePool,[0,1,3,4]);state.randomEnginePool=[3,4];state.voices[0].model=3;state.voices[1].model=4;
 assert.deepEqual(decodePreset(JSON.stringify(encodePreset(state))).state,state);
 state.randomEnginePool=[];assert.deepEqual(decodePreset(encodePreset(state)).state.randomEnginePool,[]);
 const legacy=encodePreset(createInitialState());delete legacy.state.randomEnginePool;assert.deepEqual(decodePreset(legacy).state.randomEnginePool,[0,1,3,4]);
 for(const invalid of [[2],[5],[0,0],['3'],null])assert.throws(()=>validateState({...state,randomEnginePool:invalid}),/random engine selection/);
 assert.throws(()=>validateState({...state,voices:state.voices.map((v,i)=>i===0?{...v,model:5}:v)}),/engine/);
});
