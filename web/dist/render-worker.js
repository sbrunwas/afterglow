// SPDX-License-Identifier: AGPL-3.0-only
import {createEngine} from './wasm-runtime.js';
import {validateState,validateSamples} from './state.js';
export function renderAudio(module,state,samples,bars,sampleRate=48000,progress=()=>{}) {
  validateState(state);validateSamples(samples);
  if(![1,2,4,8].includes(bars))throw new Error('Invalid render length.');
  const musicalFrames=Math.ceil(bars*4*60/state.tempo*sampleRate),frames=musicalFrames+sampleRate;
  const buffer=new ArrayBuffer(44+frames*4),view=new DataView(buffer);
  const text=(offset,value)=>{for(let i=0;i<value.length;i++)view.setUint8(offset+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*4,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*4,true);
  const engine=createEngine(module,sampleRate);
  try {
    engine.setState(state);engine.setSamples(samples);engine.play();
    let previousProgress=-1;
    for(let offset=0;offset<frames;){
      if(offset===musicalFrames)engine.pause(); // Stop triggers and retain the ringing tail.
      const n=Math.min(4096,frames-offset,offset<musicalFrames?musicalFrames-offset:4096),pair=engine.render(n);
      for(let i=0;i<n;i++) {
        const fade=Math.min(1,(frames-offset-i)/(sampleRate*.01));
        for(let c=0;c<2;c++)view.setInt16(44+(offset+i)*4+c*2,Math.round(Math.max(-1,Math.min(1,pair[c][i]*fade))*32767),true);
      }
      offset+=n;const percent=Math.floor(offset/frames*100);if(percent!==previousProgress&&percent%5===0){progress(percent/100);previousProgress=percent;}
    }
  } finally {engine.destroy();}
  return buffer;
}
if(typeof globalThis.postMessage==='function'&&typeof document==='undefined')globalThis.onmessage=({data})=>{
  try {const buffer=renderAudio(data.module,data.state,data.samples,data.bars,data.sampleRate,p=>globalThis.postMessage({type:'progress',progress:p}));globalThis.postMessage({type:'done',buffer},[buffer]);}
  catch(error){globalThis.postMessage({type:'error',message:error.message||String(error)});}
};
