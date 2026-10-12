// SPDX-License-Identifier: AGPL-3.0-only
export const VOICE_NAMES = ['Kick','Snare','Low Tom','Mid Tom','High Tom','Rim','Clap','Closed Hat','Open Hat','Crash','Ride'];
export const MIDI_NOTES = [36,38,41,45,48,37,39,42,46,49,51];
export const midiNoteForVoice = (state, index) => index===10 && state.voices[index].model===1 ? 56 : MIDI_NOTES[index];
export function createInitialState() {
  const patterns = Array.from({length:16},(_,p)=>{
    const steps = Array.from({length:11},()=>Array.from({length:64},()=>({on:false,velocity:.8,probability:1,ratchets:1})));
    for(let s=0;s<16;s++) {
      steps[0][s].on=s%4===0; steps[0][s].velocity=.95;
      steps[1][s].on=s%8===4; steps[1][s].velocity=.85;
      steps[6][s].on=s%8===4&&p%4!==0;
      steps[7][s].on=s%2===0; steps[7][s].velocity=s%4===0?.65:.85;
      steps[8][s].on=s%4===2&&p%2===1;
      if(p>=4&&s%4===3) {steps[7][s].on=true;steps[7][s].velocity=.4;}
      if(p>=8&&s===14) {steps[4][s].on=true;steps[4][s].velocity=.7;}
      if(p>=12&&s===15) {steps[1][s].on=true;steps[1][s].velocity=.5;steps[1][s].ratchets=2;}
    }
    return {length:16,steps};
  });
  return {bank:{patterns,chain:Array.from({length:64},(_,i)=>i<16?i:0),chainLength:4},voices:Array.from({length:11},()=>({model:0,tune:0,decay:.5,tone:.5,level:.8,pan:0,drive:0,mute:false,solo:false,reverse:false,sampleStart:0,sampleEnd:1})),tempo:124,swing:.12,master:.75,masterDrive:0,selectedPattern:0,chainMode:false};
}
const finite=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max) throw new Error(`Invalid ${name}`);return v;};
const integer=(v,min,max,name)=>{finite(v,min,max,name);if(!Number.isInteger(v))throw new Error(`Invalid ${name}`);return v;};
const boolean=(v,name)=>{if(typeof v!=='boolean')throw new Error(`Invalid ${name}`);return v;};
export function validateState(s) {
  if(!s||!s.bank||!Array.isArray(s.bank.patterns)||s.bank.patterns.length!==16||!Array.isArray(s.voices)||s.voices.length!==11)throw new Error('Preset must contain 16 patterns and 11 voices.');
  const patterns=s.bank.patterns.map((p,pi)=>{
    if(!p||!Array.isArray(p.steps)||p.steps.length!==11)throw new Error(`Invalid pattern ${pi+1}`);
    return {length:integer(p.length,1,64,'pattern length'),steps:p.steps.map(row=>{
      if(!Array.isArray(row)||row.length!==64)throw new Error('Each voice must have 64 steps.');
      return row.map(t=>({on:boolean(t.on,'step switch'),velocity:finite(t.velocity,0,1,'velocity'),probability:finite(t.probability,0,1,'probability'),ratchets:integer(t.ratchets,1,4,'repeats')}));
    })};
  });
  const chainLength=integer(s.bank.chainLength,1,64,'chain length');
  if(!Array.isArray(s.bank.chain)||s.bank.chain.length<chainLength||s.bank.chain.length>64)throw new Error('Invalid chain.');
  const chain=s.bank.chain.map(v=>integer(v,0,15,'chain pattern'));while(chain.length<64)chain.push(0);
  const voices=s.voices.map(v=>({model:integer(v.model,0,2,'engine'),tune:finite(v.tune,-24,24,'tune'),decay:finite(v.decay,0,1,'decay'),tone:finite(v.tone,0,1,'tone'),level:finite(v.level,0,1.5,'level'),pan:finite(v.pan,-1,1,'pan'),drive:finite(v.drive,0,1,'drive'),mute:boolean(v.mute,'mute'),solo:boolean(v.solo,'solo'),reverse:boolean(v.reverse,'reverse'),sampleStart:finite(v.sampleStart,0,.99,'sample start'),sampleEnd:finite(v.sampleEnd,.01,1,'sample end')}));
  if(voices.some(v=>v.sampleEnd<=v.sampleStart))throw new Error('Sample end must follow its start.');
  return {bank:{patterns,chain,chainLength},voices,tempo:finite(s.tempo,40,240,'tempo'),swing:finite(s.swing,0,.66,'swing'),master:finite(s.master,0,1,'master'),masterDrive:finite(s.masterDrive??0,0,1,'master drive'),selectedPattern:integer(s.selectedPattern,0,15,'selected pattern'),chainMode:boolean(s.chainMode,'chain mode')};
}
export function validateSamples(samples) {
  if(!Array.isArray(samples)||samples.length!==11)throw new Error('Invalid sample bank.');
  let frames=0;
  for(const s of samples) if(s) {
    finite(s.sampleRate,8000,192000,'sample rate');
    if(!(s.left instanceof Float32Array)||!(s.right instanceof Float32Array)||s.left.length!==s.right.length||!s.left.length||s.left.length>s.sampleRate*10)throw new Error('Samples must be stereo or mono, and at most 10 seconds.');
    frames+=s.left.length;
    if(frames>6000000)throw new Error('Sample bank exceeds browser memory limit (6 million stereo frames).');
    for(const a of [s.left,s.right])for(const f of a) if(!Number.isFinite(f)||Math.abs(f)>16)throw new Error('Sample contains invalid audio.');
  }
  return samples;
}
function encodeChannel(a) {
  const bytes=new Uint8Array(a.length*4),view=new DataView(bytes.buffer);
  for(let i=0;i<a.length;i++)view.setFloat32(i*4,a[i],true);
  let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(str);
}
function decodeChannel(text,maxFrames) {
  if(typeof text!=='string'||text.length>Math.ceil(maxFrames*4/3)*4+8||!/^[A-Za-z0-9+/]*={0,2}$/.test(text))throw new Error('Invalid encoded sample.');
  const raw=atob(text);if(raw.length%4||raw.length/4>maxFrames)throw new Error('Invalid sample size.');
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),view=new DataView(bytes.buffer),a=new Float32Array(raw.length/4);
  for(let i=0;i<a.length;i++)a[i]=view.getFloat32(i*4,true);return a;
}
export function encodePreset(state,samples=Array(11).fill(null)) {
  const clean=validateState(state);validateSamples(samples);
  return {format:'afterglow-web',version:1,state:clean,samples:samples.map(s=>s?{name:String(s.name||'Sample').slice(0,240),sampleRate:s.sampleRate,frames:s.left.length,encoding:'float32-le-base64',left:encodeChannel(s.left),right:encodeChannel(s.right)}:null)};
}
export function decodePreset(json) {
  const d=typeof json==='string'?JSON.parse(json):json;
  if(!d||d.format!=='afterglow-web'||d.version!==1)throw new Error('Choose an Afterglow browser preset (.afterglow-web.json).');
  const state=validateState(d.state);
  if(!Array.isArray(d.samples)||d.samples.length!==11)throw new Error('Invalid sample bank.');
  let frames=0;
  // Validate all metadata and the total budget before decoding any sample bytes.
  for(const s of d.samples)if(s){finite(s.sampleRate,8000,192000,'sample rate');integer(s.frames,1,Math.floor(s.sampleRate*10),'sample frames');frames+=s.frames;if(frames>6000000)throw new Error('Sample bank exceeds browser memory limit.');if(s.encoding!=='float32-le-base64')throw new Error('Unsupported sample encoding.');}
  const samples=d.samples.map(s=>s?{name:String(s.name||'Sample').slice(0,240),sampleRate:s.sampleRate,left:decodeChannel(s.left,s.frames),right:decodeChannel(s.right,s.frames)}:null);
  for(let i=0;i<samples.length;i++)if(samples[i]&&samples[i].left.length!==d.samples[i].frames)throw new Error('Sample frame count mismatch.');
  validateSamples(samples);return {state,samples};
}
function variable(n){let a=[n&127];while(n>>=7)a.unshift((n&127)|128);return a;}
function chunk(name,data){const n=data.length;return [...Array.from(name,c=>c.charCodeAt(0)),n>>>24,(n>>>16)&255,(n>>>8)&255,n&255,...data];}
export function exportMidi(state) {
  const s=validateState(state),p=s.bank.patterns[s.selectedPattern],events=[];
  const us=Math.round(60000000/s.tempo);
  events.push({tick:0,order:-2,bytes:[255,81,3,(us>>16)&255,(us>>8)&255,us&255]});
  events.push({tick:0,order:-1,bytes:[255,88,4,4,2,24,8]});
  for(let v=0;v<11;v++)for(let i=0;i<p.length;i++){
    const t=p.steps[v][i];if(!t.on||t.probability<=0||t.velocity<=0)continue;
    const start=i+(i%2?s.swing:0),finish=i+1+((i+1)%2&&i+1<p.length?s.swing:0);
    for(let r=0;r<t.ratchets;r++){
      const tick=Math.round(240*(start+(finish-start)*r/t.ratchets)),duration=Math.max(1,Math.min(60,Math.round(240*(finish-start)/t.ratchets/2)));
      const note=midiNoteForVoice(s,v);
      events.push({tick,order:1,bytes:[0x99,note,Math.max(1,Math.round(t.velocity*127))]},{tick:tick+duration,order:0,bytes:[0x89,note,0]});
    }
  }
  events.sort((a,b)=>a.tick-b.tick||a.order-b.order);let last=0,track=[];
  for(const e of events){track.push(...variable(e.tick-last),...e.bytes);last=e.tick;}
  track.push(...variable(Math.max(last,p.length*240)-last),255,47,0);
  const bytes=new Uint8Array([...chunk('MThd',[0,0,0,1,3,192]),...chunk('MTrk',track)]);
  return new Blob([bytes],{type:'audio/midi'});
}
