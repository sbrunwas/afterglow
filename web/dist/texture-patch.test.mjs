import test from 'node:test';import assert from 'node:assert/strict';
import {BUCHLA_DEFAULT_ROUTES,buchlaParamDefaults,BUCHLA_TARGETS,patchModulation} from './texture-patch.js';
test('patch destinations finite and bounded',()=>{let p={...buchlaParamDefaults},r=BUCHLA_DEFAULT_ROUTES();for(let i=0;i<500;i++){const x=patchModulation(r,p,{start:0,seed:.37},i*.041);assert.deepEqual(Object.keys(x),BUCHLA_TARGETS);for(let v of Object.values(x))assert.ok(Number.isFinite(v)&&Math.abs(v)<=1)}});
test('patching updates only selected destination',()=>{const x=patchModulation([{source:'CYCLE',target:'FOLD',amount:1}],{...buchlaParamDefaults},{start:0,seed:0},.5);assert.notEqual(x.FOLD,0);assert.equal(x.PAN,0);assert.equal(x.FILTER,0)});
test('bipolar attenuverter reverses modulation',()=>{const r=s=>patchModulation([{source:'MOD OSC',target:'FILTER',amount:s}],{...buchlaParamDefaults},{start:0,seed:.1},1.22).FILTER;assert.ok(Math.abs(r(.65)+r(-.65))<1e-8)});
test('invalid routes safely ignored',()=>{const r=patchModulation([{source:'INVALID',target:'LPG',amount:1}],{}, {}, 1);assert.equal(r.LPG,0)});
