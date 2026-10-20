import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE,Bass01Engine} from './bass01.js';
const engine=Object.create(Bass01Engine.prototype);
test('zero drive is linear across all three stages',()=>{
 for(const fold of [false,true]){
  const curve=engine._curve(0,fold);assert.equal(curve.length,1024);
  for(let i=0;i<curve.length;i++)assert.ok(Math.abs(curve[i]-(2*i/1023-1))<1e-6,'index '+i);
 }
 for(const power of [0,.001,.05,.2,1])for(const x of engine._curve(power))assert.ok(Number.isFinite(x)&&Math.abs(x)<=1.01);
});
test('drive and wavefolding are effective but bypassable',()=>{
 const dry=engine._curve(0),dist=engine._curve(.65),fold=engine._curve(.77,true);
 const i=750;assert.ok(Math.abs(dist[i]-dry[i])>.04);assert.ok(Math.abs(fold[i]-dry[i])>.10);
 assert.equal(BASE.subWave,'TRIANGLE');
});
test('4x oversampling and usable sub waveform selector are present',async()=>{
 const fs=await import('node:fs'),src=fs.readFileSync(new URL('./bass01.js',import.meta.url),'utf8');
 assert.equal((src.match(/oversample='4x'/g)||[]).length,3);
 assert.ok(src.includes("this.post.curve=this._curve(p.mode==='WEST'?p.fold"));
 assert.ok(src.includes('SINE · CLEAN')&&src.includes('SQUARE · RAW'));
 assert.ok(src.includes('this.sendD.gain.value=0;'),'Internal delay must start fully dry');
 assert.ok(src.includes('this.sendR.gain.value=0;'),'Internal reverb must start fully dry');;
});
