// DOM emulation checks interaction/state wiring, not visual layout or real browser audio.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseHTML} from 'linkedom';
import {createInitialState,encodePreset,decodePreset} from '../dist/state.js';
const html=await readFile(new URL('../dist/index.html',import.meta.url),'utf8');
let loadId=0;
async function fixture(saved){
 const {window,document}=parseHTML(html),storage=new Map();if(saved)storage.set('afterglow-web-project-v1',JSON.stringify(encodePreset(saved)));
 // Linkedom intentionally omits HTMLSelectElement.value's browser setter.
 // Supply only that platform behavior, leaving application logic untouched.
 for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{
  get(){return [...this.querySelectorAll('option')].find(o=>o.hasAttribute('selected'))?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??'';},
  set(value){for(const option of this.querySelectorAll('option'))option.toggleAttribute('selected',option.getAttribute('value')===String(value));}
 });
 globalThis.window=window;globalThis.document=document;globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};globalThis.confirm=()=>true;
 await import(`../dist/app.js?test=${++loadId}`);
 const $=id=>document.getElementById(id);
 const event=(node,type,fields={})=>{const e=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(e,fields);node.dispatchEvent(e);};
 const click=(node,fields={})=>event(typeof node==='string'?$(node):node,'click',fields);
 const change=(id,value)=>{$(id).value=String(value);event($(id),'change');};
 const save=()=>{window.dispatchEvent(new window.Event('beforeunload'));return decodePreset(storage.get('afterglow-web-project-v1')).state;};
 return {window,document,$,event,click,change,save};
}

test('DOM grid toggles, Shift/right click select without mutation, controls edit selected step',async()=>{
 const f=await fixture(),steps=f.document.querySelectorAll('.step');assert.equal(steps.length,176);assert.equal(f.document.querySelectorAll('.voice-select').length,11);
 const target=steps[1];assert.equal(target.getAttribute('aria-pressed'),'false');f.click(target);assert.equal(target.getAttribute('aria-pressed'),'true');
 f.click(target,{shiftKey:true});assert.equal(target.getAttribute('aria-pressed'),'true');assert.equal(f.$('step-label').textContent,'STEP 02');
 const snare=steps[16+5];f.event(snare,'contextmenu');assert.equal(snare.getAttribute('aria-pressed'),'false');assert.equal(f.$('voice-name').textContent,'SNARE DRUM');assert.equal(f.$('step-label').textContent,'STEP 06');
 f.$('range-step-ratchets').value='4';f.event(f.$('range-step-ratchets'),'input');const state=f.save();assert.equal(state.bank.patterns[0].steps[1][5].ratchets,4);assert.equal(state.bank.patterns[0].steps[0][1].on,true);
});

test('DOM copy/paste creates independent patterns and pages/length map to absolute steps',async()=>{
 const f=await fixture(),patterns=f.$('patterns').children;f.click('copy');assert.equal(f.$('paste').disabled,false);f.click(patterns[1]);f.click('paste');
 const target=f.document.querySelectorAll('.step')[1];f.click(target);let state=f.save();assert.equal(state.bank.patterns[1].steps[0][1].on,true);assert.equal(state.bank.patterns[0].steps[0][1].on,false);
 f.change('length',64);f.click(f.$('pages').children[3]);assert.equal(f.$('step-label').textContent,'STEP 49');f.click(f.document.querySelectorAll('.step')[15]);state=f.save();assert.equal(state.bank.patterns[1].length,64);assert.equal(state.bank.patterns[1].steps[0][63].on,true);assert.equal(f.$('step-label').textContent,'STEP 64');
 f.change('length',999);assert.equal(f.save().bank.patterns[1].length,64);f.change('length',-1);assert.equal(f.save().bank.patterns[1].length,1);
});

test('DOM chain validation preserves valid state and restores saved settings',async()=>{
 const initial=createInitialState();initial.tempo=137.5;initial.selectedPattern=5;initial.voices[0].model=1;initial.bank.chain=[3,1,...Array(62).fill(0)];initial.bank.chainLength=2;initial.chainMode=true;
 const f=await fixture(initial);assert.equal(f.$('range-tempo').value,'137.5');assert.equal(f.$('model').value,'1');assert.equal(f.$('chain').value,'4, 2');assert.equal(f.$('chain-mode').getAttribute('aria-pressed'),'true');assert.ok(f.$('status').textContent.includes('Restored'));
 f.$('chain').value='1, 17';f.click('chain-apply');assert.ok(f.$('status').classList.contains('error'));assert.deepEqual(f.save().bank.chain.slice(0,2),[3,1]);
 f.$('chain').value='16, 2, 4';f.click('chain-apply');assert.deepEqual(f.save().bank.chain.slice(0,3),[15,1,3]);f.click('chain-mode');assert.equal(f.save().chainMode,false);
 f.click('mute');f.click('reverse');const state=f.save();assert.equal(state.voices[0].mute,true);assert.equal(state.voices[0].reverse,true);assert.equal(state.selectedPattern,5);
});

test('DOM sample file loading succeeds with suspended audio before PLAY',async()=>{
 let contexts=0;
 globalThis.AudioContext=class {
  constructor(){contexts++;this.sampleRate=48000;this.state='suspended';}
  resume(){throw new Error('Sample import must not require interactive playback');}
  async decodeAudioData(){return {length:4,duration:4/48000,sampleRate:48000,numberOfChannels:1,getChannelData:()=>Float32Array.of(0,.25,-.25,0)};}
 };
 const f=await fixture();Object.defineProperty(f.$('sample-file'),'files',{value:[{size:16,name:'before-play.wav',arrayBuffer:async()=>new ArrayBuffer(16)}]});f.event(f.$('sample-file'),'change');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(contexts,1);assert.equal(f.$('sample-name').textContent,'before-play.wav');assert.equal(f.$('model').value,'2');assert.equal(f.save().voices[0].model,2);assert.ok(f.$('status').textContent.includes('loaded into'));
});
