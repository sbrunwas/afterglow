// SPDX-License-Identifier: AGPL-3.0-only
// ClawStudio v0.17 · real C++ WASM drum engine + render-frame scheduled notes.
// Based on Afterglow's original Web AudioWorklet (not a fallback oscillator).
import { createEngine } from './wasm-runtime.js';

class AfterglowProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = null;
    this.events = [];
    this.notifyFrames = 0;
    this.peak = 0;
    this.clockSerial = 0;
    try {
      this.engine = createEngine(options.processorOptions.module, sampleRate);
      if (options.processorOptions.state) this.engine.setState(options.processorOptions.state);
      this.port.postMessage({type:'ready'});
    } catch (error) {
      this.port.postMessage({type:'error',phase:'initialize',message:error.message||String(error)});
    }
    this.port.onmessage = ({data}) => {
      if (!data || typeof data !== 'object') {
        this.port.postMessage({type:'error',phase:'message',message:'Invalid audio message'});
        return;
      }
      if (!this.engine) return;
      try {
        switch(data.type) {
          case 'state': this.engine.setState(data.state); break;
          case 'sample': this.engine.setSample(data.voice,data.left,data.right,data.sampleRate); break;
          case 'samples': this.engine.setSamples(data.samples); break;
          case 'play': this.events.length=0;this.engine.play(); break;
          case 'playAt': {
            const frame=Number(data.audioFrame);
            if (!Number.isSafeInteger(frame)||frame<currentFrame+128||frame>currentFrame+sampleRate*10)
              throw Error('Invalid or late scheduled start frame');
            this.engine.stop();
            this.events.length=0;
            this.events.push({kind:'play',frame});
            this.clockSerial++;
            break;
          }
          case 'triggerAt': {
            const frame=Number(data.audioFrame),voice=data.voice,velocity=Number(data.velocity);
            if (!Number.isInteger(voice)||voice<0||voice>10||!Number.isFinite(velocity)||velocity<0||velocity>1)
              throw Error('Invalid drum voice or velocity');
            if (!Number.isSafeInteger(frame)||frame<currentFrame-128||frame>currentFrame+sampleRate*10)
              throw Error('Invalid or stale drum trigger frame');
            if (this.events.length>=256) throw Error('Drum trigger queue full');
            this.events.push({kind:'trigger',frame:Math.max(currentFrame,frame),voice,velocity});
            this.events.sort((a,b)=>a.frame-b.frame||(a.kind==='play'?-1:b.kind==='play'?1:0));
            break;
          }
          case 'pause': this.events.length=0;this.engine.pause(); break;
          case 'stop': this.events.length=0;this.engine.stop();this.clockSerial++; break;
          case 'trigger': this.engine.trigger(data.voice,data.velocity); break;
          case 'dispose': this.events.length=0;this.engine.destroy();this.engine=null;break;
          default: throw Error('Unknown audio message: '+data.type);
        }
        if(data.requestId!==undefined)this.port.postMessage({type:'ack',requestId:data.requestId});
      } catch(error) {
        this.port.postMessage({type:'error',phase:data.type,message:error.message||String(error),requestId:data.requestId});
      }
    };
  }
  _renderTo(output,offset,count) {
    if(!count)return;
    const pair=this.engine.render(count); // borrowed WASM heap views, copy before next render()
    output[0].set(pair[0],offset);
    if(output[1])output[1].set(pair[1],offset);
    for(let n=0;n<count;n++)this.peak=Math.max(this.peak,Math.abs(pair[0][n]),Math.abs(pair[1][n]));
  }
  process(_inputs,outputs) {
    const out=outputs[0];
    if(!out||!out.length)return true;
    for(const channel of out)channel.fill(0);
    if(!this.engine)return true;
    try {
      const n=out[0].length,end=currentFrame+n;
      let offset=0;
      while(offset<n) {
        const absolute=currentFrame+offset;
        // Execute every event at/before the next sample. Play precedes trigger.
        while(this.events.length && this.events[0].frame<=absolute) {
          const e=this.events.shift();
          if(e.kind==='play')this.engine.play();
          else this.engine.trigger(e.voice,e.velocity);
        }
        const boundary=this.events.length?Math.max(absolute,Math.min(end,this.events[0].frame)):end;
        const chunk=boundary-absolute;
        if(chunk<=0)throw Error('Scheduled drum event did not advance render cursor');
        this._renderTo(out,offset,chunk);
        offset+=chunk;
      }
      this.notifyFrames+=n;
      if(this.notifyFrames>=sampleRate/30){
        const position=this.engine.position();
        this.port.postMessage({type:'position',...position,audioFrame:end,serial:this.clockSerial,peak:this.peak});
        this.notifyFrames=0;this.peak=0;
      }
    }catch(error){
      for(const channel of out)channel.fill(0);
      this.port.postMessage({type:'error',phase:'render',message:error.message||String(error)});
      this.engine=null;
    }
    return true;
  }
}
registerProcessor('afterglow-processor',AfterglowProcessor);
