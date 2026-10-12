// SPDX-License-Identifier: AGPL-3.0-only
import {createInitialState,validateState,validateSamples,exportMidi} from './state.js';

export class AfterglowAudio {
  constructor() {
    this.context=null;this.node=null;this.module=null;this.initializing=null;
    this.state=createInitialState();this.samples=Array(11).fill(null);
    this.factoryBank=this.state.bank;this.stateStatus='Click PLAY to enable audio';
    this.onPosition=()=>{};this.onError=()=>{};this.onRenderProgress=()=>{};
    this._lastBank='';this._requests=new Map();this._requestId=0;
    this._sentSamples=Array(11).fill(undefined);
  }
  _context() {
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Context)throw new Error('This browser does not support Web Audio. Try Chrome, Edge, Firefox or Safari.');
    if(!this.context||this.context.state==='closed')this.context=new Context({latencyHint:'interactive',sampleRate:48000});
    return this.context;
  }
  async _module() {
    if(!this.module){const response=await fetch(new URL('./afterglow.wasm',import.meta.url));if(!response.ok)throw new Error('The audio engine could not download. Reload and try again.');this.module=await WebAssembly.compile(await response.arrayBuffer());}
    return this.module;
  }
  async init() {
    const context=this._context();
    // Resume immediately in the initiating user gesture, before fetching assets.
    const resumed=context.resume();
    if(this.node){await resumed;return;}
    if(this.initializing){await this.initializing;await resumed;return;}
    this.initializing=(async()=>{
      if(!context.audioWorklet||!globalThis.AudioWorkletNode)throw new Error('AudioWorklet needs a modern browser and an HTTPS page.');
      const module=await this._module();
      await context.audioWorklet.addModule(new URL('./worklet.js',import.meta.url).href);
      const node=new AudioWorkletNode(context,'afterglow-processor',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[2],processorOptions:{module,state:this.state}});
      this.node=node;
      await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('Audio engine startup timed out. Reload and try again.')),20000);
        node.port.onmessage=({data})=>{
          if(data.type==='ready'){clearTimeout(timeout);resolve();}
          if(data.type==='position')this.onPosition(data);
          if(data.type==='error'){
            const request=this._requests.get(data.requestId);if(request){this._requests.delete(data.requestId);clearTimeout(request.timeout);request.reject(new Error(data.message));}
            this.onError(data.message);
            if(data.phase==='initialize'){clearTimeout(timeout);reject(new Error(data.message));}
          }
          if(data.type==='ack'){const request=this._requests.get(data.requestId);if(request){this._requests.delete(data.requestId);clearTimeout(request.timeout);request.resolve();}}
        };
        node.onprocessorerror=()=>{clearTimeout(timeout);this.stateStatus='Audio engine stopped';this.onError('Audio engine stopped unexpectedly. Reload the page to restart.');reject(new Error('Audio processor failed.'));};
      });
      node.connect(context.destination);
      this._lastBank='';this._sentSamples=Array(11).fill(undefined);this.setState(this.state);this.setSamples(this.samples);
      await resumed;
      this.stateStatus=`Audio ready / ${Math.round(context.sampleRate/1000)} kHz`;
    })().catch(async error=>{this.node?.disconnect();this.node=null;try{await context.close();}catch{}this.context=null;throw error;}).finally(()=>{this.initializing=null;});
    await this.initializing;
  }
  setState(state) {
    this.state=state;
    if(!this.node)return;
    const signature=JSON.stringify(state.bank),payload={...state};
    if(signature===this._lastBank)delete payload.bank;else this._lastBank=signature;
    this.node.port.postMessage({type:'state',state:payload});
  }
  setSamples(samples) {
    validateSamples(samples);this.samples=samples;
    if(this.node)for(let voice=0;voice<11;voice++)if(samples[voice]!==this._sentSamples[voice]){
      const sample=samples[voice];
      this.node.port.postMessage({type:'sample',voice,left:sample?.left??null,right:sample?.right??null,sampleRate:sample?.sampleRate??48000});
      this._sentSamples[voice]=sample;
    }
  }
  async loadSample(voice,file) {
    if(!Number.isInteger(voice)||voice<0||voice>10)throw new Error('Select a drum voice first.');
    if(!file||file.size>50*1024*1024)throw new Error('Choose an audio file smaller than 50 MB.');
    let decoded;
    try{decoded=await this._context().decodeAudioData(await file.arrayBuffer());}catch{throw new Error('This browser could not decode the sample. Try a PCM WAV, MP3 or supported FLAC file.');}
    if(!decoded.length||decoded.duration>10.001)throw new Error('Choose a sample no longer than 10 seconds.');
    const sample={name:file.name,sampleRate:decoded.sampleRate,left:decoded.getChannelData(0).slice(),right:decoded.getChannelData(Math.min(1,decoded.numberOfChannels-1)).slice()};
    const proposed=this.samples.slice();proposed[voice]=sample;validateSamples(proposed);return sample;
  }
  async play(){await this.init();this.node.port.postMessage({type:'play'});}
  pause(){this.node?.port.postMessage({type:'pause'});}
  stop(){this.node?.port.postMessage({type:'stop'});}
  audition(voice,velocity=1){this.node?.port.postMessage({type:'trigger',voice,velocity});}
  exportMidi(state){return exportMidi(state);}
  async renderWav(state,samples,{bars=1}={}) {
    const clean=validateState(state);validateSamples(samples);
    if(![1,2,4,8].includes(bars))throw new Error('Choose 1, 2, 4 or 8 bars.');
    const module=await this._module();
    const worker=new Worker(new URL('./render-worker.js',import.meta.url),{type:'module'});
    return new Promise((resolve,reject)=>{
      const timeout=setTimeout(()=>{worker.terminate();reject(new Error('WAV rendering timed out. Try fewer bars.'));},120000);
      worker.onmessage=({data})=>{
        if(data.type==='progress'){this.onRenderProgress(data.progress);return;}
        clearTimeout(timeout);worker.terminate();
        if(data.type==='done')resolve(new Blob([data.buffer],{type:'audio/wav'}));
        else reject(new Error(data.message||'WAV render failed.'));
      };
      worker.onerror=event=>{clearTimeout(timeout);worker.terminate();reject(new Error(event.message||'WAV render failed.'));};
      worker.postMessage({module,state:clean,samples,bars,sampleRate:48000});
    });
  }
}
