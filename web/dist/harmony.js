// SPDX-License-Identifier: AGPL-3.0-only
// ClawStudio harmonic conductor: shared scale and tonal center across independent machines.
import {SCALES,buildArpChord,quantizeToScale} from './poly-arp.js';
export const KEY_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
export const HARMONY_DEFAULTS=Object.freeze({key:0,scale:'MINOR',degree:0,autoLink:true});
export function normalizeHarmony(x={}){
 return {key:Math.max(0,Math.min(11,Math.floor(Number(x.key)||0))),
  scale:Object.hasOwn(SCALES,x.scale)?x.scale:'MINOR',
  degree:Math.max(0,Math.min(6,Math.floor(Number(x.degree)||0))),
  autoLink:x.autoLink!==false};
}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function chordOffsets(h){
 const chord=buildArpChord({key:h.key,scale:h.scale,degree:h.degree,chord:'SEVENTH'},60);
 return chord.map(n=>n-(60+h.key));
}
export function harmonizePattern(state,kind,harmony,{generate=true}={}){
 if(!state||!state.patterns)return false;
 const h=normalizeHarmony(harmony),octave={mono:24,acid:36,texture:48}[kind];
 if(octave===undefined)return false;
 const oldRoot=Number(state.root)||octave;const base=octave+h.key;
 const arr=state.patterns[state.pattern];
 if(!Array.isArray(arr))return false;
 const intervals=chordOffsets(h);
 const motif=kind==='mono'?[0,0,2,0,1,0,2,3]:kind==='acid'?[0,2,1,0,3,1,2,0]:[0,2,3,1,0,3,2,1];
 const len=clamp(state.steps||16,1,Math.min(64,arr.length));
 // When only syncing key/scale, preserve melodic contour and pick the closest
 // in-scale pitch to the transposed original; generate uses chord tones.
 for(let i=0;i<len;i++){
  const note=arr[i];if(!note||!note.on)continue;
  const target=generate?base+intervals[motif[i%motif.length]]+(kind==='texture'&&i%8===0?12:0):
       (oldRoot+Number(note.note||0)+base-oldRoot);
  const midi=quantizeToScale(clamp(target,0,127),h.key,h.scale);
  note.note=clamp(midi-base,-24,36);
 }
 state.root=base;
 return true;
}
export function harmonizeLane(lane,harmony,{generate=true}={}){
 if(!lane||!Array.isArray(lane.steps)||lane.target==='DRUM MACHINE')return false;
 if(lane.target==='MIDI OUT')return false; // Don't silently rewrite an external device's pattern.
 const h=normalizeHarmony(harmony),offsets=chordOffsets(h);
 const motif=[0,0,2,1,0,3,2,1];const root=lane.target==='MONO'?24+h.key:lane.target==='ACID'?36+h.key:48+h.key;
 for(let i=0;i<lane.steps.length;i++){
  const s=lane.steps[i];if(!s||!s.on)continue;
  const source=generate?root+offsets[motif[i%motif.length]]:Number(s.note);
  s.note=quantizeToScale(clamp(source,0,127),h.key,h.scale);
 }
 return true;
}
export function linkHarmony({mono,poly,texture,acid,lanes}={},settings={},opts={}){
 const h=normalizeHarmony(settings),changed=[];
 if(poly?.state?.polyArp){Object.assign(poly.state.polyArp,{key:h.key,scale:h.scale,degree:h.degree});poly.refreshUI?.();changed.push('POLY')}
 for(const [kind,module] of [['mono',mono],['texture',texture],['acid',acid]]){
  if(harmonizePattern(module?.state,kind,h,opts)){module.refreshUI?.();changed.push(kind.toUpperCase())}
 }
 for(const lane of lanes||[])harmonizeLane(lane,h,opts);
 return changed;
}
export function mountHarmonyPanel(host,state,{onApply,onFromPoly}={}){
 if(!host)return null;const fields=['key','scale','degree'];
 host.innerHTML='<section class="ch17-panel"><div class="ch17-head"><div><strong>HARMONIC CONDUCTOR</strong><small>ONE TONAL CENTER · INDEPENDENT INSTRUMENT RHYTHMS</small></div><label class="ch17-auto"><input type="checkbox" id="ch17-auto"> AUTO-FOLLOW POLY MELODY</label></div><div class="ch17-tools">'+
 '<label>KEY <select id="ch17-key">'+KEY_NAMES.map((k,i)=>'<option value="'+i+'">'+k+'</option>').join('')+'</select></label>'+
 '<label>SCALE <select id="ch17-scale">'+Object.keys(SCALES).map(x=>'<option>'+x+'</option>').join('')+'</select></label>'+
 '<label>CHORD ROOT <select id="ch17-degree">'+[1,2,3,4,5,6,7].map((x,i)=>'<option value="'+i+'">'+x+'</option>').join('')+'</select></label>'+
 '<button type="button" id="ch17-poly">↙ FOLLOW POLY KEY</button><button type="button" id="ch17-sync">♬ ALIGN EXISTING NOTES</button><button type="button" id="ch17-generate">⚄ GENERATE LINKED PARTS</button></div><div id="ch17-status" class="ch17-status">The bass, acid and textures can follow the same harmony without sharing a sequence. Drum rhythms remain untouched.</div></section>';
 const $=q=>host.querySelector(q);
 function render(){const h=normalizeHarmony(state);for(const f of fields)$('#ch17-'+f).value=h[f];$('#ch17-auto').checked=h.autoLink;return h}
 function update(changes){Object.assign(state,normalizeHarmony({...state,...changes}));render();onApply?.({generate:false})}
 for(const f of fields)$('#ch17-'+f).onchange=e=>update({[f]:f==='scale'?e.target.value:Number(e.target.value)});
 $('#ch17-auto').onchange=e=>update({autoLink:e.target.checked});
 $('#ch17-poly').onclick=()=>{onFromPoly?.();render();$('#ch17-status').textContent='Following POLY scale and chord root.'};
 $('#ch17-sync').onclick=()=>{onApply?.({generate:false});$('#ch17-status').textContent='Aligned active pitched steps. Existing rhythms and drums preserved.'};
 $('#ch17-generate').onclick=()=>{onApply?.({generate:true});$('#ch17-status').textContent='Generated linked bass, acid and texture pitches from shared harmony.'};
 render();return {render,update,setStatus:msg=>$('#ch17-status').textContent=msg};
}
