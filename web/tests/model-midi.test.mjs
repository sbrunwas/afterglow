import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,exportMidi,encodePreset,decodePreset} from '../dist/state.js';

test('808 cowbell exports GM 56 while 909 and sample lanes retain ride 51',async()=>{
 const state=createInitialState();state.tempo=120;
 for(const row of state.bank.patterns[0].steps)for(const step of row)step.on=false;
 state.bank.patterns[0].steps[10][0].on=true;
 for(const [model,note] of [[0,51],[1,56],[2,51]]){
  state.voices[10].model=model;
  const bytes=new Uint8Array(await exportMidi(state).arrayBuffer());
  const on=bytes.indexOf(0x99),off=bytes.indexOf(0x89);
  assert.ok(on>=0&&off>on);assert.equal(bytes[on+1],note);assert.equal(bytes[off+1],note);
  const restored=decodePreset(encodePreset(state)).state;
  assert.equal(restored.voices[10].model,model);assert.equal(restored.bank.patterns[0].steps[10][0].on,true);
 }
});
