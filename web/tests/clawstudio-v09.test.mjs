import test from 'node:test';
import assert from 'node:assert/strict';
import {TEXTURE_ENGINES, INSTRUMENT_PRESETS, SUPER_SAW_OFFSETS, superSawDetune, superSawMix, acidSlideFromPrevious} from '../dist/rack-devices.js';

test('Texture has seven genuinely different synthesis paths',()=>{
  assert.deepEqual(TEXTURE_ENGINES,['WAVETABLE','FM MATRIX','WAVEFOLD','RESONATOR','NOISE','FORMANT','RING']);
  const presets=INSTRUMENT_PRESETS.texture;
  assert.ok(presets.length>=30);
  assert.deepEqual(new Set(presets.map(p=>p[1].engine)),new Set(TEXTURE_ENGINES));
});
test('core Waldorf wavetable patches survive while new formant and folded patches add diversity',()=>{
  for(const [name,p] of INSTRUMENT_PRESETS.texture.filter(x=>x[0].startsWith('WALDORF /')&&!['WALDORF / Cold Logic','WALDORF / Digital Choir','WALDORF / Frozen Choir','WALDORF / Razor Key'].includes(x[0]))) assert.equal(p.engine,'WAVETABLE',name);
  assert.equal(INSTRUMENT_PRESETS.texture.find(x=>x[0]==='WALDORF / Frozen Choir')[1].engine,'FORMANT');
  assert.equal(INSTRUMENT_PRESETS.texture.find(x=>x[0]==='WALDORF / Razor Key')[1].engine,'WAVEFOLD');
});
test('measured 7-saw detune and mix are bounded and normalized',()=>{
  assert.equal(SUPER_SAW_OFFSETS.length,7);
  for(let i=0;i<=100;i++){
    const detune=superSawDetune(i/100),mix=superSawMix(i/100);
    assert.ok(detune>=0 && detune<=1);
    assert.ok(Math.abs(mix.center**2+6*mix.side**2-1)<1e-6);
  }
});
test('303 slide belongs to the previous step, including loop wrap',()=>{
  const pattern=Array.from({length:16},()=>({on:true,slide:false}));
  pattern[15].slide=true;
  assert.equal(acidSlideFromPrevious(pattern,0,16),true);
  assert.equal(acidSlideFromPrevious(pattern,1,16),false);
});
