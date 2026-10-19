// ClawStudio original browser rack prototypes — not vendor ROM emulations.
// Three playable instrument modules share the host AudioContext, transport and routing.
import {newPolyArp,arpEventsAtStep} from './poly-arp.js';
import {attachPolyArp} from './poly-arp-ui.js';
const TAU=2*Math.PI, cap=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)), hz=n=>440*Math.pow(2,(n-69)/12);
const midiName=n=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][((n%12)+12)%12]+(Math.floor(n/12)-1);
const ease=(v,min,max)=>min*Math.pow(max/min,cap(v));
const basePoly={wave:'SUPER SAW',osc2:'SAW',detune:.4,mix:.78,shape:.3,tune:.5,sync:0,cutoff:.68,res:.28,env:.42,attack:.04,decay:.37,sustain:.65,release:.37,chorus:.65,delay:.22,drive:.12,motion:.12,modRate:.24,level:.57,arp:'UP',steps:8};
const baseTexture={engine:'WAVETABLE',table:'GLASS',wave:.32,spread:.45,second:.48,third:.24,fm:.07,ring:.04,cutoff:.58,res:.22,filter2:.29,attack:.46,decay:.65,sustain:.82,release:.77,rate:.22,depth:.61,motion:.7,evolve:.45,space:.78,feedback:.21,level:.58,mutation:.22,filterMode:'SERIAL',filterA:'LOWPASS',filterB:'HIGHPASS',filterEnv:.22,envAttack:.26,envDecay:.7,character:.45,pace:'DRONE',arp:'DRIFT',steps:16};
const baseAcid={wave:'SAW',cutoff:.43,res:.62,env:.64,decay:.36,accent:.58,slide:.37,drive:.28,tone:.4,volume:.65,steps:16,arp:'LINE'};
export const INSTRUMENT_PRESETS={
 poly:[
 ['CLASSIC / Anthem 1998',{detune:.67,mix:.84,cutoff:.73,chorus:.73,delay:.32,attack:.025,sustain:.76}],
 ['CLASSIC / Hands in the Air',{detune:.8,mix:.92,cutoff:.86,res:.17,chorus:.83,delay:.45,release:.4}],
 ['CLASSIC / Blue Rave Lead',{detune:.38,mix:.79,cutoff:.49,res:.43,env:.69,decay:.28,drive:.32,delay:.24}],
 ['CLASSIC / Satin Strings',{detune:.45,cutoff:.59,attack:.63,sustain:.91,release:.85,chorus:.89,delay:.12}],
 ['CLASSIC / Pulse Motion',{wave:'PWM',osc2:'PULSE',shape:.32,motion:.73,cutoff:.67,chorus:.45}],
 ['CLASSIC / Feedback Siren',{wave:'FEEDBACK',drive:.53,res:.41,cutoff:.64,delay:.42,env:.23}],
 ['EUROPA / Prism Lead',{wave:'SHAPE',shape:.71,cutoff:.84,detune:.26,chorus:.54,drive:.1}],
 ['EUROPA / FM Gleam',{wave:'FM',shape:.79,cutoff:.83,res:.13,motion:.61,delay:.29}],
 ['EUROPA / Sync Sweep',{wave:'SYNC',shape:.64,cutoff:.53,env:.57,res:.26}],
 ['EUROPA / Formant Cloud',{wave:'FORMANT',shape:.62,attack:.51,release:.77,chorus:.68}],
 ['TRANCE / Dream Gate',{detune:.73,mix:.82,cutoff:.47,env:.78,sustain:.12,decay:.3,delay:.57}],
 ['TRANCE / Euphoria',{detune:.6,mix:.88,cutoff:.91,chorus:.92,delay:.49,attack:.02}],
 ['HOUSE / Organ Stab',{wave:'SAW',osc2:'PULSE',detune:.12,cutoff:.57,attack:0,decay:.25,sustain:.25,release:.17,drive:.26}],
 ['AMBIENT / Aurora',{wave:'SHAPE',shape:.44,attack:.79,sustain:1,release:.92,motion:.65,chorus:.85}]],
 texture:[
 ['WALDORF / 2002 Glass',{engine:'WAVETABLE',table:'GLASS',wave:.54,rate:.14,depth:.7,space:.77,attack:.58,release:.82,pace:'DRONE'}],
 ['WALDORF / Micro Air',{engine:'WAVETABLE',table:'AIR',wave:.28,fm:.22,second:.71,cutoff:.74,motion:.85,space:.79}],
 ['WALDORF / Digital Choir',{engine:'FORMANT',table:'VOCAL',wave:.7,ring:.08,rate:.19,depth:.5,attack:.71,release:.89,character:.78}],
 ['WALDORF / Cold Logic',{engine:'FM MATRIX',table:'METAL',wave:.72,fm:.64,filter2:.57,cutoff:.52,space:.4,pace:'PLUCK',attack:.05,release:.16}],
 ['WALDORF / Hollow Strings',{engine:'WAVETABLE',table:'HOLLOW',second:.82,spread:.68,attack:.68,space:.79}],
 ['WALDORF / Mirage Pad',{engine:'WAVETABLE',table:'GLASS',wave:.79,motion:.95,rate:.25,cutoff:.49,space:.91}],
 ['WALDORF / Frozen Choir',{engine:'FORMANT',table:'VOCAL',character:.59,attack:.83,release:.9,rate:.08,space:.84,filterA:'BANDPASS',filterB:'LOWPASS'}],
 ['WALDORF / Razor Key',{engine:'WAVEFOLD',wave:.81,character:.89,cutoff:.72,pace:'PLUCK',attack:.01,decay:.17,sustain:.16,space:.2}],
 ['WALDORF / Cirrus Sweep',{engine:'WAVETABLE',table:'AIR',wave:.39,depth:.93,motion:.94,rate:.1,evolve:1,space:.94}],
 ['ABSYNTH / Mutation Garden',{engine:'WAVEFOLD',table:'ORGANIC',wave:.6,motion:1,evolve:.84,rate:.11,depth:.83,character:.54,space:.93}],
 ['ABSYNTH / Dark Underwater',{engine:'NOISE',table:'HOLLOW',wave:.22,cutoff:.22,res:.67,ring:.24,space:.94,pace:'DRONE',filterA:'BANDPASS'}],
 ['ABSYNTH / Fungal Signals',{engine:'RING',table:'METAL',wave:.62,rate:.49,depth:.91,fm:.51,ring:.88,character:.79,pace:'PULSE'}],
 ['ABSYNTH / Slow Machines',{engine:'RESONATOR',table:'ORGANIC',wave:.25,second:.32,third:.8,evolve:.91,rate:.09,attack:.3,pace:'DRONE'}],
 ['ABSYNTH / Liquid Circuit',{engine:'FM MATRIX',wave:.9,character:.7,fm:.92,second:.78,third:.49,filterA:'HIGHPASS',pace:'PULSE',attack:.1,decay:.48,space:.5}],
 ['ABSYNTH / Ghost Dialtone',{engine:'RING',wave:.18,character:.5,ring:.8,filterA:'BANDPASS',filterB:'NOTCH',filterMode:'PARALLEL',pace:'PULSE',space:.86}],
 ['ABSYNTH / Radio Dust',{engine:'NOISE',table:'AIR',character:.87,filterA:'HIGHPASS',filterB:'BANDPASS',filterMode:'PARALLEL',pace:'PULSE',rate:.62,space:.72}],
 ['ABSYNTH / Glass Insects',{engine:'RESONATOR',wave:.84,character:.83,ring:.81,pace:'PLUCK',decay:.2,sustain:.12,release:.57,space:.52}],
 ['ABSYNTH / Folded Aurora',{engine:'WAVEFOLD',wave:.72,character:.53,second:.83,pace:'DRONE',attack:.74,release:.94,space:.98}],
 ['ABSYNTH / Moving Formants',{engine:'FORMANT',wave:.5,character:.87,rate:.39,depth:.93,motion:1,filterMode:'PARALLEL',pace:'DRONE'}],
 ['AMBIENT / Endless Rain',{engine:'NOISE',table:'AIR',wave:.12,spread:.9,attack:.7,release:.96,space:1,character:.2,filterA:'BANDPASS'}],
 ['AMBIENT / Limen',{engine:'FORMANT',table:'VOCAL',wave:.89,rate:.09,depth:.75,filter2:.54,space:.88,character:.4}],
 ['AMBIENT / Singing Bowls',{engine:'RESONATOR',table:'GLASS',wave:.55,ring:.94,character:.73,pace:'PLUCK',decay:.56,release:.86,space:.97}],
 ['AMBIENT / Forest Machines',{engine:'NOISE',table:'ORGANIC',cutoff:.39,character:.66,filterMode:'PARALLEL',filterA:'LOWPASS',filterB:'BANDPASS',pace:'PULSE',space:.85}],
 ['AMBIENT / Long Wave',{engine:'WAVETABLE',table:'HOLLOW',wave:.12,rate:.025,attack:.98,release:1,evolve:1,motion:1,space:1}],
 ['TRANCE / Celestial',{engine:'WAVETABLE',table:'GLASS',wave:.42,second:.86,cutoff:.75,motion:.55,space:.71}],
 ['TRANCE / Misted Arpeggio',{engine:'FM MATRIX',fm:.47,character:.55,pace:'PLUCK',attack:.01,decay:.17,sustain:.13,release:.29,rate:.36,space:.65}],
 ['TRANCE / Velvet Vowels',{engine:'FORMANT',wave:.37,character:.62,filterA:'BANDPASS',filterB:'LOWPASS',pace:'PULSE',depth:.85,space:.7}],
 ['EXPERIMENT / Broken VHS',{engine:'RING',table:'METAL',wave:.39,fm:.46,ring:.87,depth:1,rate:.53,pace:'PULSE',space:.62}],
 ['EXPERIMENT / Acidic Chimes',{engine:'RESONATOR',table:'METAL',wave:.74,character:.93,pace:'PLUCK',ring:1,filterB:'NOTCH',space:.39}],
 ['EXPERIMENT / Crushed Sine',{engine:'WAVEFOLD',wave:.94,character:1,cutoff:.76,ring:.25,pace:'PLUCK',space:.23}],
 ['EXPERIMENT / Numbers Station',{engine:'FORMANT',wave:.94,character:1,filterMode:'PARALLEL',filterA:'BANDPASS',filterB:'NOTCH',pace:'PULSE',rate:.5,space:.72}],
 ['EXPERIMENT / Submerged Metal',{engine:'FM MATRIX',fm:.86,ring:.9,character:.81,filterA:'LOWPASS',filterB:'BANDPASS',cutoff:.23,space:.91}],
 ['EXPERIMENT / Light Leak',{engine:'WAVEFOLD',table:'ORGANIC',wave:.42,character:.63,filterMode:'PARALLEL',filterA:'HIGHPASS',filterB:'LOWPASS',pace:'DRONE',space:.8}]],
 acid:[
 ['303 / Factory Sequence',{wave:'SAW',cutoff:.39,res:.55,env:.7,decay:.37,accent:.57,slide:.37}],
 ['303 / Chicago 1987',{wave:'SQUARE',cutoff:.48,res:.77,env:.75,decay:.27,accent:.7,drive:.24}],
 ['303 / Rubber Duck',{wave:'SQUARE',cutoff:.3,res:.85,env:.91,decay:.61,accent:.8,slide:.55}],
 ['303 / Wet Circuit',{wave:'SAW',cutoff:.51,res:.93,env:.82,decay:.35,drive:.42}],
 ['303 / Minimal Pulse',{wave:'SQUARE',cutoff:.18,res:.42,env:.65,decay:.14,drive:.04}],
 ['303 / Resonant Scream',{wave:'SAW',cutoff:.79,res:.96,env:.89,accent:.89,drive:.72}],
 ['ACID / Hardfloor',{wave:'SAW',cutoff:.48,res:.7,env:.86,decay:.66,drive:.56,slide:.63}],
 ['ACID / Proto Trance',{wave:'SQUARE',cutoff:.52,res:.65,env:.64,decay:.55,drive:.36}],
 ['ACID / Dubby 303',{wave:'SQUARE',cutoff:.29,res:.67,env:.61,decay:.8,tone:.16,drive:.21}],
 ['ACID / Acid Rave',{wave:'SAW',cutoff:.7,res:.82,env:.91,decay:.29,drive:.61}],
 ['ACID / Deep Swim',{wave:'SQUARE',cutoff:.18,res:.63,env:.5,decay:.76,drive:.19}],
 ['ACID / Needlepoint',{wave:'SAW',cutoff:.61,res:.81,env:.38,decay:.08,accent:.85}]]
};
// JP-8000 Super Saw measurements (A. Szabo, KTH, 2010):
// 7 fixed, slightly asymmetric frequency offsets, nonlinear detune and mix curves.
// These measured coefficients are data/analysis, not a port of manufacturer DSP.
export const SUPER_SAW_OFFSETS=Object.freeze([-.11002313,-.06288439,-.01952356,0,.01991221,.06216538,.10745242]);
export function superSawDetune(knob){
 const x=cap(knob);
 const coeff=[10028.7312891634,-50818.8652045924,111363.4808729368,-138150.6761080548,
 106649.6679158292,-53046.9642751875,17019.9518580080,-3425.0836591318,
  404.2703938388,-24.1878824391,.6717417634,.0030115596];
 let y=coeff[0];for(let i=1;i<coeff.length;i++)y=y*x+coeff[i];
 return cap(y,0,1);
}
export function superSawMix(knob){
 const x=cap(knob),center=Math.max(0,-.55366*x+.99785),side=Math.max(0,-.73764*x*x+1.2841*x+.044372);
 const normalize=1/Math.sqrt(center*center+6*side*side);
 return {center:center*normalize,side:side*normalize};
}
// Correct 303 legato: slide flag belongs to the PREVIOUS active step.
export function acidSlideFromPrevious(pattern,index,length){
 if(!Number.isInteger(length)||length<1||!Array.isArray(pattern))return false;
 const prior=pattern[(index-1+length)%length];
 return Boolean(prior?.on&&prior?.slide);
}
const templates={poly:[0,4,7,11,12,7,4,11,0,4,7,12,11,7,4,2],texture:[0,4,7,11,0,4,7,9,0,3,7,10,0,3,7,12],acid:[0,0,7,0,12,7,3,0,0,7,5,3,12,10,7,3]};
function freshSteps(type){return Array.from({length:64},(_,i)=>({on:type==='texture'?i%8===0:type==='poly'?i%4===0:[0,2,3,6,8,11,12,14].includes(i%16),note:templates[type][i%16],accent:i%8===0,slide:type==='acid'&&[3,11,14].includes(i%16),gate:.7}));}
function en(g,t,attack,decay,sustain,release,dur,level=1){const a=.002+attack*1.3,d=.025+decay*2.1,r=.03+release*3.2,gate=Math.max(.08,dur);g.setValueAtTime(.0001,t);g.linearRampToValueAtTime(level,t+a);g.setTargetAtTime(Math.max(.0001,sustain*level),t+a,Math.max(.01,d/3));g.setTargetAtTime(.0001,t+gate,Math.max(.01,r/3));return t+gate+r*3}
function stage(g,t,a,d,s,r,len,level=1){const at=.003+Math.pow(a,2)*1.8,dc=.025+d*d*2,rt=.035+r*r*4,gate=Math.max(.05,len);g.setValueAtTime(.0001,t);g.linearRampToValueAtTime(level,t+at);g.setTargetAtTime(Math.max(.0001,s*level),t+at,Math.max(.006,dc/3));g.setTargetAtTime(.0001,t+gate,Math.max(.012,rt/3));return t+gate+rt*3}
function oscillator(ctx,wave,hz0,t,end,gain,dest){const o=ctx.createOscillator(),a=ctx.createGain();o.type=wave;o.frequency.setValueAtTime(Math.min(18000,hz0),t);a.gain.value=gain;o.connect(a);a.connect(dest);o.start(t);o.stop(end);return o}
function impulse(ctx,seconds=1.8){const len=Math.round(ctx.sampleRate*seconds),b=ctx.createBuffer(2,len,ctx.sampleRate);let seed=91261;for(let ch=0;ch<2;ch++){const a=b.getChannelData(ch);for(let i=0;i<len;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;a[i]=((seed>>>9)/4194304-1)*Math.pow(1-i/len,2.65)}}return b}
function makeFX(ctx,dest,reverbMix=.35){let main=ctx.createGain(),verb=ctx.createConvolver(),wet=ctx.createGain(),delay=ctx.createDelay(1.5),feed=ctx.createGain(),delayWet=ctx.createGain();verb.buffer=impulse(ctx);main.connect(dest);main.connect(verb);verb.connect(wet);wet.connect(dest);main.connect(delay);delay.connect(feed);feed.connect(delay);delay.connect(delayWet);delayWet.connect(dest);feed.gain.value=.27;delay.delayTime.value=.375;wet.gain.value=reverbMix;delayWet.gain.value=.16;return {input:main,wet,delayWet,feed,delay};}
const tableCache=new WeakMap();
function wave(ctx,table,pos=0){
 let bank=tableCache.get(ctx);if(!bank){bank=new Map();tableCache.set(ctx,bank)}
 const step=Math.round(cap(pos)*64),cacheKey=table+':'+step;
 if(bank.has(cacheKey))return bank.get(cacheKey);
 const n=36,a=new Float32Array(n),b=new Float32Array(n),p=step/64;for(let i=1;i<n;i++){const k=i,base=1/Math.pow(i,table==='METAL'?.78:1.25);let v=base;
if(table==='GLASS')v*=Math.sin(k*(.4+p*2.2))*(1-p*.48);
if(table==='HOLLOW')v*=k%2?.9:-.48*p;
if(table==='VOCAL')v*=Math.exp(-Math.pow((k-(3+p*13))/Math.max(2,2+p*5),2))+.12;
if(table==='ORGANIC')v*=Math.cos(i*(.7+p*1.7))+.3;
if(table==='AIR')v*=Math.exp(-k*(.012+p*.10))*(k%3===0?.3:1);
if(table==='METAL')v*=Math.sin(k*k*(.12+p*.64));
b[k]=v;}const result=ctx.createPeriodicWave(a,b,{disableNormalization:false});bank.set(cacheKey,result);return result}
function createEnsemble(ctx,input,dest){
 const wet=ctx.createGain(),left=ctx.createDelay(.075),right=ctx.createDelay(.075);
 const lp=ctx.createStereoPanner(),rp=ctx.createStereoPanner();lp.pan.value=-.8;rp.pan.value=.8;
 input.connect(left);input.connect(right);left.connect(lp);right.connect(rp);lp.connect(wet);rp.connect(wet);wet.connect(dest);
 const leftLfo=ctx.createOscillator(),rightLfo=ctx.createOscillator(),leftDepth=ctx.createGain(),rightDepth=ctx.createGain();
 left.delayTime.value=.015;right.delayTime.value=.022;
 leftLfo.type='sine';rightLfo.type='sine';leftLfo.frequency.value=.27;rightLfo.frequency.value=.36;
 leftDepth.gain.value=.004;rightDepth.gain.value=.005;leftLfo.connect(leftDepth);rightLfo.connect(rightDepth);
 leftDepth.connect(left.delayTime);rightDepth.connect(right.delayTime);leftLfo.start();rightLfo.start();
 return {wet,leftLfo,rightLfo,leftDepth,rightDepth,dispose(){leftLfo.stop();rightLfo.stop();wet.disconnect()}};
}
class PolyEngine{
 constructor(ctx,dest,params){this.ctx=ctx;this.p=params;this.fx=makeFX(ctx,dest,.09);this.ensemble=createEnsemble(ctx,this.fx.input,dest);this.voices=[];this.update()}
 update(){const p=this.p,t=this.ctx.currentTime;this.fx.wet.gain.setTargetAtTime(p.chorus*.055,t,.05);this.ensemble.wet.gain.setTargetAtTime(p.chorus*.46,t,.04);this.ensemble.leftLfo.frequency.setTargetAtTime(.16+p.modRate*.8,t,.08);this.ensemble.rightLfo.frequency.setTargetAtTime(.22+p.modRate*.94,t,.08);this.ensemble.leftDepth.gain.setTargetAtTime(.001+p.motion*.007,t,.08);this.ensemble.rightDepth.gain.setTargetAtTime(.001+p.motion*.009,t,.08);this.fx.delayWet.gain.setTargetAtTime(p.delay*.36,t,.05);this.fx.feed.gain.setTargetAtTime(.16+p.delay*.45,t,.05)}
 note(midi,t,dur,velocity=1){const p=this.p,ctx=this.ctx,f=hz(midi),attack=p.attack,release=p.release;
// Eight-voice polyphony cap with gentle voice stealing.
 this.voices=this.voices.filter(v=>v.end>ctx.currentTime);
 if(this.voices.length>=8){const oldest=this.voices.shift();oldest.amp.gain.cancelScheduledValues(t);oldest.amp.gain.setTargetAtTime(.0001,t,.007);}
 const cut=ctx.createBiquadFilter();cut.type='lowpass';cut.frequency.setValueAtTime(ease(p.cutoff,110,18500),t);cut.Q.value=.65+p.res*14;
 const out=ctx.createGain();out.gain.value=.5;const amp=ctx.createGain();amp.gain.value=.0001;cut.connect(amp);amp.connect(out);out.connect(this.fx.input);
let peak=ease(p.cutoff,100,18000),high=Math.min(18000,peak*(1+p.env*3.5));cut.frequency.setValueAtTime(high,t);cut.frequency.setTargetAtTime(peak,t+.008,Math.max(.02,p.decay*.5));
const end=stage(amp.gain,t,attack,p.decay,p.sustain,release,dur,p.level*.36*Math.max(.1,Math.min(1,velocity)));
const oscs=[];let src=ctx.createGain();src.connect(cut);
const layers=p.wave==='SUPER SAW'?7:p.wave==='SHAPE'||p.wave==='FORMANT'?3:2;
 const detuneCurve=superSawDetune(p.detune),mixGains=superSawMix(p.mix);
for(let i=0;i<layers;i++){
 const o=ctx.createOscillator(),g=ctx.createGain();let det=i===0?0:((i%2?-1:1)*(Math.ceil(i/2)*3.7)*p.detune*3.4);let wf=p.wave==='PWM'?'square':'sawtooth';if(p.wave==='FM'||p.wave==='FORMANT')wf='sine';if(p.wave==='SHAPE')wf='triangle';if(p.wave==='FEEDBACK')wf='sawtooth';if(p.wave==='SYNC')wf='sawtooth';o.type=wf;const nominal=f*Math.pow(2,(p.tune-.5)*.2);
 if(p.wave==='SUPER SAW'){
   o.frequency.setValueAtTime(nominal*(1+SUPER_SAW_OFFSETS[i]*detuneCurve),t);
   g.gain.value=(i===3?mixGains.center:mixGains.side)*1.04;
 }else{
   o.frequency.setValueAtTime(nominal,t);o.detune.value=det;
   g.gain.value=i===0?1:((p.mix||.5)/(layers-1))*1.25;
 }
 if(p.wave==='FORMANT'){const pw=wave(ctx,'VOCAL',p.shape);o.setPeriodicWave(pw)}
 if(p.wave==='SHAPE'){const pw=wave(ctx,'ORGANIC',p.shape);o.setPeriodicWave(pw)}
 if(p.wave==='FM'){const mod=ctx.createOscillator(),mg=ctx.createGain();mod.frequency.value=f*2;mg.gain.value=f*p.shape*2;mod.connect(mg);mg.connect(o.frequency);mod.start(t);mod.stop(end+.02)}
 if(p.wave==='SYNC')o.frequency.setTargetAtTime(f*(1+p.shape*1.2),t+.012,.1);
 if(p.wave==='FEEDBACK'){const ws=ctx.createWaveShaper();const curve=new Float32Array(256);for(let k=0;k<curve.length;k++){const v=k/127.5-1;curve[k]=Math.tanh(v*(1+p.shape*24))}ws.curve=curve;o.connect(g);g.connect(ws);ws.connect(src)}else{o.connect(g);g.connect(src)}
 // Starting ahead of the gate decorrelates saw phases across notes without a custom oscillator.
 const phaseHeadroom=1/Math.max(1,o.frequency.value);
 o.start(Math.max(ctx.currentTime,t-Math.random()*phaseHeadroom));o.stop(end+.04);oscs.push(o)}
 const second=oscillator(ctx,p.osc2==='PULSE'?'square':p.osc2==='TRI'?'triangle':'sawtooth',f*2**((p.shape-.5)*.3),t,end+.04,.22,src);
 this.voices.push({end,amp,osc:oscs});}
 dispose(){this.ensemble.dispose();this.fx.input.disconnect();this.fx.wet.disconnect();this.fx.delayWet.disconnect()}
}
// Six complementary engines deliberately use DIFFERENT synthesis paths.
// Unlike firmware emulation, these are original WebAudio algorithms inspired by
// subtractive wavetable synthesis and Absynth-style nonlinear/exotic timbres.
export const TEXTURE_ENGINES=Object.freeze(['WAVETABLE','FM MATRIX','WAVEFOLD','RESONATOR','NOISE','FORMANT','RING']);
const TEXTURE_FILTERS=Object.freeze({LOWPASS:'lowpass',HIGHPASS:'highpass',BANDPASS:'bandpass',NOTCH:'notch'});
const wavefoldCurve=(amount)=>{const curve=new Float32Array(1024);for(let i=0;i<1024;i++){const x=(i/511.5-1)*(1+Math.max(0,amount)*15);curve[i]=Math.asin(Math.sin(x*1.57))*2/Math.PI;}return curve};
const noiseBank=new WeakMap();
function textureNoise(ctx){let buffer=noiseBank.get(ctx);if(buffer)return buffer;buffer=ctx.createBuffer(1,Math.round(ctx.sampleRate*2),ctx.sampleRate);let seed=39281,a=buffer.getChannelData(0);for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;a[i]=((seed>>>9)/4194304)-1}noiseBank.set(ctx,buffer);return buffer}
function textureRoute(ctx,pre,a,b,sum,mode){
 if(mode==='PARALLEL'){const aa=ctx.createGain(),bb=ctx.createGain();aa.gain.value=.56;bb.gain.value=.56;pre.connect(a);pre.connect(b);a.connect(aa);b.connect(bb);aa.connect(sum);bb.connect(sum)}
 else if(mode==='SPLIT'){const aa=ctx.createGain(),bb=ctx.createGain();aa.gain.value=.55;bb.gain.value=.4;pre.connect(a);a.connect(aa);pre.connect(b);b.connect(bb);aa.connect(sum);bb.connect(sum)}
 else{pre.connect(a);a.connect(b);b.connect(sum)}
}
class TextureEngine{
 constructor(ctx,dest,params){this.ctx=ctx;this.p=params;this.fx=makeFX(ctx,dest,.42);this.voices=[];this._tick=setInterval(()=>this.motion(),84);this.update()}
 update(){const p=this.p,t=this.ctx.currentTime;this.fx.wet.gain.setTargetAtTime(p.space*.62,t,.08);this.fx.delayWet.gain.setTargetAtTime(p.feedback*.38,t,.06);this.fx.feed.gain.setTargetAtTime(Math.min(.72,.16+p.feedback*.4),t,.06)}
 motion(){const ctx=this.ctx,p=this.p,t=ctx.currentTime;
  for(const v of this.voices){if(v.end<t+.02)continue;
   const phase=t*(.018+p.rate*.45)+(v.seed||0),drift=Math.sin(phase*TAU)*p.motion*p.depth,slow=Math.sin((phase*.317+.22)*TAU);
   const age=Math.max(0,t-v.start),env=(1-Math.exp(-age/(.02+p.envAttack*2)))*Math.exp(-age/(.05+p.envDecay*4));
   const mod=drift+slow*p.evolve*.33;
   const cutoff=ease(cap(p.cutoff+mod*.32+p.filterEnv*env*.2),45,16200);
   const cutoff2=ease(cap(p.filter2+mod*.2),35,14900);
   v.f1.frequency.setTargetAtTime(cutoff,t,.05);v.f2.frequency.setTargetAtTime(cutoff2,t,.05);
   v.f1.Q.setTargetAtTime(.65+p.res*10,t,.06);v.f2.Q.setTargetAtTime(.6+p.ring*11,t,.06);
   if(v.carriers){for(let i=0;i<v.carriers.length;i++){const o=v.carriers[i];if(v.kind!=='WAVETABLE')continue;const pos=cap(p.wave+Math.sin(phase*TAU+i*1.7)*p.depth*.49);const bucket=p.table+':'+Math.round(pos*64);if(v.buckets[i]!==bucket){o.setPeriodicWave(wave(ctx,p.table,pos));v.buckets[i]=bucket}}}
   if(v.modDepth)v.modDepth.gain.setTargetAtTime(v.hz*(.04+p.fm*(.6+p.character*3))*(.6+(.5+drift)*p.evolve),t,.09);
   if(v.bands){for(let i=0;i<v.bands.length;i++)v.bands[i].frequency.setTargetAtTime(Math.min(11500,v.bandBase[i]*(1+mod*.4)),t,.08)}
   v.pan.pan.setTargetAtTime(Math.sin(phase*1.3*TAU)*p.spread*.75,t,.08);
  }
  this.voices=this.voices.filter(v=>v.end>t);
 }
 note(midi,t,dur){const p=this.p,ctx=this.ctx,f=hz(midi),kind=TEXTURE_ENGINES.includes(p.engine)?p.engine:'WAVETABLE';
  this.voices=this.voices.filter(v=>v.end>ctx.currentTime);
  if(this.voices.length>=9){const oldest=this.voices.shift();oldest.amp.gain.cancelScheduledValues(t);oldest.amp.gain.setTargetAtTime(.0001,t,.012)}
  const pre=ctx.createGain(),f1=ctx.createBiquadFilter(),f2=ctx.createBiquadFilter(),sum=ctx.createGain(),amp=ctx.createGain(),pan=ctx.createStereoPanner();
  f1.type=TEXTURE_FILTERS[p.filterA]||'lowpass';f2.type=TEXTURE_FILTERS[p.filterB]||'highpass';
  f1.frequency.value=ease(p.cutoff,45,16200);f2.frequency.value=ease(p.filter2,35,14900);
  f1.Q.value=.65+p.res*10;f2.Q.value=.65+p.ring*11;
  textureRoute(ctx,pre,f1,f2,sum,p.filterMode);
  sum.connect(amp);amp.connect(pan);pan.connect(this.fx.input);
  const pace=p.pace==='PLUCK'?.18:p.pace==='PULSE'?.53:p.pace==='SWARM'?1.4:2.7;
  const length=Math.max(.1,dur,pace*(.45+p.evolve*1.3));
  const end=stage(amp.gain,t,kind==='RESONATOR'?Math.min(.025,p.attack):(p.pace==='PLUCK'?Math.min(.08,p.attack):p.attack),p.decay,p.pace==='PLUCK'?Math.min(.16,p.sustain):p.sustain,p.release,length,p.level*.22);
  const voice={kind,start:t,end,seed:Math.random(),hz:f,carriers:[],buckets:[],f1,f2,pan,amp,modDepth:null,bands:null,bandBase:null};
  const osc=(shape,frequency,destination,gain=.5)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=shape;o.frequency.setValueAtTime(Math.min(16000,frequency),t);g.gain.value=gain;o.connect(g);g.connect(destination);o.start(t);o.stop(end+.06);return o};
  const bufNoise=(gain)=>{const src=ctx.createBufferSource(),g=ctx.createGain();src.buffer=textureNoise(ctx);src.loop=true;g.gain.value=gain;src.connect(g);g.connect(pre);src.start(t);src.stop(end+.06);return src};
  if(kind==='WAVETABLE'){
   for(let i=0;i<3;i++){const o=osc('sine',f*(i===2?2:1),pre,[.7,p.second*.4,p.third*.33][i]);o.detune.value=(i===0?0:i===1?-1:1)*p.spread*18;o.setPeriodicWave(wave(ctx,p.table,cap(p.wave+i*.13)));voice.carriers.push(o);voice.buckets.push(null)}
  }else if(kind==='FM MATRIX'){
   const carrier=osc('sine',f,pre,.72);const mod1=ctx.createOscillator(),g1=ctx.createGain();mod1.frequency.value=f*(1+Math.round(p.wave*11));g1.gain.value=f*p.fm*(.4+p.character*8);mod1.connect(g1);g1.connect(carrier.frequency);mod1.start(t);mod1.stop(end+.06);voice.modDepth=g1;
   if(p.third>.05){const mod2=ctx.createOscillator(),mg=ctx.createGain();mod2.frequency.value=f*(.51+p.ring*11);mg.gain.value=f*p.third*(1+p.second*4);mod2.connect(mg);mg.connect(mod1.frequency);mod2.start(t);mod2.stop(end+.06)}
  }else if(kind==='WAVEFOLD'){
   const fold=ctx.createWaveShaper();fold.curve=wavefoldCurve(Math.max(p.character,p.wave));
   const oscBus=ctx.createGain();oscBus.connect(fold);fold.connect(pre);osc('sine',f,oscBus,.8);if(p.second>.04)osc('triangle',f*(1+Math.round(p.wave*3)),oscBus,p.second*.48);
  }else if(kind==='RESONATOR'){
   const src=ctx.createBufferSource(),env=ctx.createGain(),mix=ctx.createGain();src.buffer=textureNoise(ctx);src.loop=true;
   env.gain.setValueAtTime(0,t);env.gain.linearRampToValueAtTime(.8,t+.004);env.gain.exponentialRampToValueAtTime(.0001,t+.025+p.character*.21);
   src.connect(env);env.connect(mix);src.start(t);src.stop(end+.06);
   const ratios=[1,2.01,2.9+p.wave*.8,4.22+p.ring*2];voice.bands=[];voice.bandBase=[];
   for(let i=0;i<4;i++){const band=ctx.createBiquadFilter(),bg=ctx.createGain();band.type='bandpass';band.frequency.value=Math.min(11000,f*ratios[i]);band.Q.value=8+p.ring*65;bg.gain.value=[.8,.36,.31,.22][i];mix.connect(band);band.connect(bg);bg.connect(pre);voice.bands.push(band);voice.bandBase.push(band.frequency.value)}
   // Inharmonic damped partials supply a struck, bell-like decay instead of
   // relying only on a short bandpassed-noise transient.
   for(let i=0;i<4;i++){
    const partial=ctx.createOscillator(),tail=ctx.createGain();
    partial.type='sine';partial.frequency.value=Math.min(17000,f*ratios[i]);
    const gain=[.34,.18,.12,.09][i]*(1-p.ring*.35);
    tail.gain.setValueAtTime(.0001,t);
    tail.gain.linearRampToValueAtTime(gain,t+.007);
    tail.gain.exponentialRampToValueAtTime(.0001,Math.min(end-.08,t+.13+p.evolve*2.8/(1+i*.42)));
    partial.connect(tail);tail.connect(pre);partial.start(t);partial.stop(end+.05);
   }
  }else if(kind==='NOISE'){
   bufNoise(.75);if(p.fm>.06)osc('triangle',f,pre,.2+p.fm*.35);
  }else if(kind==='FORMANT'){
   const source=ctx.createGain();osc('sawtooth',f,source,.52);osc('triangle',f*2,source,.18);
   const base=[450,1300,2600];voice.bands=[];voice.bandBase=[];
   for(let i=0;i<3;i++){const band=ctx.createBiquadFilter(),g=ctx.createGain();band.type='bandpass';band.frequency.value=base[i]*(.7+p.wave*.75+p.character*.12);band.Q.value=2+p.ring*14;g.gain.value=[.82,.65,.36][i];source.connect(band);band.connect(g);g.connect(pre);voice.bands.push(band);voice.bandBase.push(band.frequency.value)}
  }else if(kind==='RING'){
   const carrier=ctx.createOscillator(),mod=ctx.createOscillator(),mult=ctx.createGain(),level=ctx.createGain();
   carrier.type='sine';carrier.frequency.value=f;mod.type='sine';mod.frequency.value=f*(.5+Math.round(p.wave*8)+p.character*.33);
   mult.gain.value=0;level.gain.value=.64;mod.connect(mult.gain);carrier.connect(mult);mult.connect(level);level.connect(pre);
   mod.start(t);carrier.start(t);carrier.stop(end+.06);mod.stop(end+.06);
   if(p.second>.02)osc('triangle',f*.5,pre,p.second*.18);
  }
  this.voices.push(voice);
 }
 retireVoices(){const t=this.ctx.currentTime;for(const v of this.voices){try{v.amp.gain.cancelScheduledValues(t);v.amp.gain.setTargetAtTime(.0001,t,.024)}catch{}}this.voices=[]}
 dispose(){clearInterval(this._tick);this.retireVoices();this.fx.input.disconnect();this.fx.wet.disconnect();this.fx.delayWet.disconnect()}
}
class AcidEngine{
 constructor(ctx,dest,p){this.ctx=ctx;this.p=p;this.stage=ctx.createGain();this.stage.gain.value=.0001;this.filter1=ctx.createBiquadFilter();this.filter1.type='lowpass';this.filter2=ctx.createBiquadFilter();this.filter2.type='lowpass';this.drive=ctx.createWaveShaper();this.output=ctx.createGain();this.osc=ctx.createOscillator();this.osc.type='sawtooth';this.osc.frequency.value=55;this.osc.connect(this.filter1);this.filter1.connect(this.filter2);this.filter2.connect(this.drive);this.drive.connect(this.stage);this.stage.connect(this.output);this.output.connect(dest);this.osc.start();this.lastNote=null;this.end=0;this.update()}
 update(){let t=this.ctx.currentTime,p=this.p;this.osc.type=p.wave==='SQUARE'?'square':'sawtooth';this.filter1.Q.setTargetAtTime(.75+p.res*19,t,.02);this.filter2.Q.setTargetAtTime(.4+p.res*6,t,.02);this.output.gain.setTargetAtTime(p.volume*.33,t,.05);const a=new Float32Array(1024);for(let i=0;i<a.length;i++){let x=i/511.5-1;a[i]=Math.tanh(x*(1+p.drive*13))}this.drive.curve=a}
 note(midi,t,dur,accent=false,slide=false,holdNext=false){const p=this.p,ctx=this.ctx,f=hz(midi),last=this.lastNote||f;this.osc.frequency.cancelScheduledValues(t);this.osc.frequency.setValueAtTime(last,t);if(slide)this.osc.frequency.setTargetAtTime(f,t+.004,.008+p.slide*.22);else this.osc.frequency.setValueAtTime(f,t);
const base=ease(p.cutoff,90,1600),peak=Math.min(13000,base*(1+p.env*9+(accent?p.accent*7:0))),decay=.065+p.decay*.72;for(let filt of [this.filter1,this.filter2]){filt.frequency.cancelScheduledValues(t);filt.frequency.setValueAtTime(peak,t);filt.frequency.setTargetAtTime(base,t+.008,decay/(accent?3.6:4))}
const g=this.stage.gain;g.cancelScheduledValues(t);if(!slide||this.end<t){g.setValueAtTime(.0001,t);g.linearRampToValueAtTime(accent?1.1:.72,t+.008)}else g.setTargetAtTime(accent?1.1:.72,t,.01);
// Slide is attached to the originating step; sustain the gate into the next note.
 const gate=t+Math.max(.075,dur)*(holdNext?1.08:(slide?.96:.79));
 g.setTargetAtTime(.0001,gate,.028);this.lastNote=f;this.end=gate}
 stop(){this.stage.gain.setTargetAtTime(.0001,this.ctx.currentTime,.025)}
 dispose(){this.stop();this.osc.stop();this.output.disconnect()}
}
const CONFIG={poly:{name:'POLY-01',subtitle:'JP-STYLE PERFORMANCE POLYSYNTH · EUROPA ENGINE MODIFIERS',color:'#709bd4',panel:['OSCILLATOR 1','OSCILLATOR 2 + SHAPE','FILTER · JP-STYLE SLIDERS','ENVELOPES','ENSEMBLE / FX'],preset:basePoly,keys:['detune','mix','shape','tune','sync','cutoff','res','env','attack','decay','sustain','release','chorus','delay','drive','motion','modRate','level'],selects:{wave:['SUPER SAW','SAW','PWM','FEEDBACK','SYNC','SHAPE','FM','FORMANT'],osc2:['SAW','PULSE','TRI'],arp:['UP','DOWN','CHORD','OFF']}},texture:{name:'TEXTURE-01',subtitle:'MICRO Q WAVETABLE · ABSYNTH-STYLE MULTI ENGINE + MUTATION',color:'#e2c73c',preset:baseTexture,keys:['wave','spread','second','third','fm','ring','cutoff','res','filter2','filterEnv','envAttack','envDecay','character','attack','decay','sustain','release','rate','depth','motion','evolve','space','feedback','level','mutation'],selects:{engine:['WAVETABLE','FM MATRIX','WAVEFOLD','RESONATOR','NOISE','FORMANT','RING'],table:['GLASS','HOLLOW','VOCAL','ORGANIC','AIR','METAL'],filterMode:['SERIAL','PARALLEL','SPLIT'],filterA:['LOWPASS','HIGHPASS','BANDPASS','NOTCH'],filterB:['LOWPASS','HIGHPASS','BANDPASS','NOTCH'],pace:['DRONE','PULSE','PLUCK','SWARM'],arp:['DRIFT','CHORD','UP','OFF']}},acid:{name:'ACID-01',subtitle:'303 BASS LINE · ACCENT / SLIDE · STEP PROGRAMMER',color:'#d7d3c6',preset:baseAcid,keys:['cutoff','res','env','decay','accent','slide','drive','tone','volume'],selects:{wave:['SAW','SQUARE']}}};
function makeKnob(key,v,color){return `<div class="cri-knobcell"><span>${key.toUpperCase()}</span><div tabindex="0" role="slider" aria-label="${key}" data-knob="${key}" class="cri-knob" style="--paint:${color};--rot:${-135+v*270}deg;--v:${v}"><i></i></div><small data-val="${key}">${Math.round(v*100)}</small></div>`}
export function createRackInstrument(mount,type,{externalClock=false,tempo=()=>126,getContext=null,getDestination=null}={}){
 if(!CONFIG[type])throw Error('Unknown rack module');const cfg=CONFIG[type],p={...cfg.preset},state={p,steps:type==='acid'?16:8,pattern:0,patterns:Array.from({length:8},()=>freshSteps(type)),root:type==='texture'?48:type==='poly'?60:36,polyArp:type==='poly'?newPolyArp():null,active:true};let ctx=null,engine=null,running=false,interval=null,position=0,next=0,selected=0,history=[],currentPreset='',status='',lastSeq=-1;
 const $=sel=>mount.querySelector(sel),$$=sel=>[...mount.querySelectorAll(sel)],presets=INSTRUMENT_PRESETS[type];
 const title=type==='poly'?'JP-8K · CLAW EDITION':type==='texture'?'μQ · MUTATION LAB':'BASS LINE · 303';
 const pSelect=presets.map((x,i)=>`<option value="${i}">${x[0]}</option>`).join('');
 const selectors=Object.entries(cfg.selects).map(([k,options])=>`<label class="cri-picker">${type==='poly'&&k==='arp'?'BASIC ARP':k.toUpperCase()}<select data-opt="${k}">${options.map(x=>`<option value="${x}">${x}</option>`).join('')}</select></label>`).join('');
 const knobs=cfg.keys.map(k=>makeKnob(k,p[k],cfg.color)).join('');
 const jpSliders=type==='poly'?`<div class="cri-jp-sliders"><div class="cri-striplabel">JP PERFORMANCE SLIDERS / FILTER · ENV · SHAPING</div><div class="cri-faderbank">${['cutoff','res','env','attack','decay','sustain','release','chorus','delay'].map(k=>`<label class="cri-fadercell"><span>${k.toUpperCase()}</span><input aria-label="${k} performance slider" data-fader="${k}" type="range" min="0" max="1" step=".005" value="${p[k]}"></label>`).join('')}</div></div>`:'';
 mount.innerHTML=`<div class="cri cri-${type}" style="--accent:${cfg.color}"><div class="cri-rack-ear">●<span>●</span></div><header class="cri-head"><div><span class="cri-kicker">CLAWSTUDIO · SYNTHESIS LAB / ${type.toUpperCase()}</span><h2>${title}</h2><p>${cfg.subtitle}</p></div><div class="cri-display"><div>${cfg.name} <em>REV 01</em></div><strong id="cri-patchname">${presets[0][0]}</strong><small>INDEPENDENT CLOCK · MIXER OUTPUT</small></div></header><div class="cri-toolbar"><label>PATCH <select id="cri-presets">${pSelect}</select></label><button id="cri-prev">◀</button><button id="cri-next">▶</button><button id="cri-rand">${type==='texture'?'MUTATE':'VARIATION'} ↝</button><button id="cri-undo">UNDO</button>${type==='texture'?'<label class="cri-lock">MUTATION <select id="cri-mutate-scope"><option value="TWEAK">TWEAK</option><option value="TIMBRE">TIMBRE</option><option value="WILD">WILD</option></select></label><label class="cri-lock"><input id="cri-lock-engine" type="checkbox"> LOCK ENGINE</label><label class="cri-lock"><input id="cri-lock-filter" type="checkbox"> LOCK FILTER</label><label class="cri-lock"><input id="cri-lock-env" type="checkbox"> LOCK ENVS</label>':''}<button id="cri-jam">▶ AUDITION</button>${type==='texture'?'<button id="cri-hit" title="Hear this patch instantly">♪ HEAR PATCH</button>':''}</div><div class="cri-controls"><div class="cri-feature"><div class="cri-striplabel">${type==='poly'?'SUPER SAW / WAVE ENGINE':type==='texture'?'WAVETABLE / MODULATION PATH':'ANALOG VOICE / ACID CONTOUR'}</div><div class="cri-selectors">${selectors}</div>${type==='texture'?'<div class="cri-waveform"><canvas class="cri-wave" width="680" height="115"></canvas><span>SPECTRAL EVOLUTION / WAVETABLE POSITION</span></div>':''}<div class="cri-knobs">${knobs}</div>${jpSliders}</div></div><div class="cri-sequencer"><div class="cri-seqbar"><strong>${type==='acid'?'303 / STEP PROGRAMMING':'PATTERN / PERFORMANCE MEMORY'}</strong><div><label>PATTERN <select id="cri-pattern">${Array.from({length:8},(_,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')}</option>`).join('')}</select></label><label>STEPS <select id="cri-length">${[4,8,16,32,64].map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><label>PAGE <select id="cri-page">${[1,2,3,4].map((n,i)=>`<option value="${i}">${String(n).padStart(2,'0')}</option>`).join('')}</select></label><label>ROOT <select id="cri-root">${Array.from({length:37},(_,i)=>`<option value="${36+i}">${midiName(i+36)}</option>`).join('')}</select></label><button id="cri-stepsrnd">RND NOTES</button></div></div><div class="cri-stepgrid" id="cri-steps"></div><div class="cri-stepedit"><strong>STEP <span id="cri-selected">01</span></strong><label>NOTE <select id="cri-note">${Array.from({length:25},(_,i)=>`<option value="${i}">${midiName(48+i)}</option>`).join('')}</select></label><button id="cri-step-on">GATE</button><button id="cri-accent">ACCENT</button><button id="cri-slide">${type==='acid'?'SLIDE':'TIE / LEGATO'}</button><label>GATE LENGTH <input id="cri-gate" type="range" min=".1" max="1" step=".01"></label><button id="cri-save">SAVE</button><button id="cri-load">LOAD</button><input type="file" id="cri-loadfile" accept=".json" hidden></div></div><div class="cri-footer"><span id="cri-status">Try the factory patches, then design your own sound.</span><span>${type==='poly'?'JP BLUE / 7 SAWS · EUROPA-INSPIRED MODIFIERS':type==='texture'?'EVOLVE · MUTATE · KEEP THE HAPPY ACCIDENTS':'CLASSIC ACID · PATTERNS · SLIDE · ACCENT'}</span></div><div class="cri-rack-ear bottom">●<span>●</span></div></div>`;
 const polyArpPanel=type==='poly'?attachPolyArp(mount,state):null;
 let page=0;const val=k=>p[k],syncUI=()=>{$$('[data-knob]').forEach(el=>{let v=cap(p[el.dataset.knob]);el.style.setProperty('--rot',(-135+v*270)+'deg');el.style.setProperty('--v',v);mount.querySelector(`[data-val="${el.dataset.knob}"]`).textContent=Math.round(v*100)});$$('[data-opt]').forEach(el=>el.value=p[el.dataset.opt]);$$('[data-fader]').forEach(el=>el.value=p[el.dataset.fader]);$('#cri-length').value=state.steps;$('#cri-pattern').value=state.pattern;$('#cri-root').value=state.root;$('#cri-page').value=page;[...$('#cri-page').options].forEach(o=>o.disabled=+o.value>Math.floor((state.steps-1)/16));showSteps();drawWave();polyArpPanel?.refresh()};
 function drawWave(){const cv=$('.cri-wave');if(!cv||!cv.getContext)return;let c=cv.getContext('2d');if(!c)return;c.clearRect(0,0,680,115);c.strokeStyle=type==='texture'?'#153b56':'#fff';c.lineWidth=2;c.beginPath();for(let i=0;i<680;i++){let x=i/680*TAU*5;let kind=p.engine||'WAVETABLE';let y=kind==='NOISE'?Math.sin(x*7.7)*Math.sin(x*33.1)*.8:kind==='RESONATOR'?Math.sin(x)*Math.exp(-((i/680)*5)%1*3):kind==='RING'?Math.sin(x)*Math.sin(x*(2+p.character*12)):kind==='WAVEFOLD'?Math.sin(Math.sin(x)*(2+p.character*16)):kind==='FM MATRIX'?Math.sin(x+Math.sin(x*(1+p.wave*8))*p.fm*5):kind==='FORMANT'?Math.sin(x)*Math.sin(x*.4)*.6:Math.sin(x)*(1-p.wave)+Math.sin(3*x+p.wave*6)*p.wave*.45+Math.sin(7*x+p.fm*8)*p.ring*.7;let yy=56-y*29;if(i===0)c.moveTo(i,yy);else c.lineTo(i,yy)}c.stroke()}
 function showSteps(){const host=$('#cri-steps');host.innerHTML='';let length=Math.min(16,state.steps-page*16);host.style.setProperty('--cols',length);for(let i=0;i<length;i++){let idx=page*16+i,s=state.patterns[state.pattern][idx],b=document.createElement('button');b.className='cri-step'+(s.on?' on':'')+(idx===selected?' editing':'')+(idx===lastSeq?' playhead':'');b.innerHTML=`<span>${String(idx+1).padStart(2,'0')}</span><strong>${midiName(state.root+s.note)}</strong><small>${s.accent?'▲':''}${s.slide?'↗':''}</small>`;b.onclick=()=>{if(selected===idx)s.on=!s.on;selected=idx;showSteps();editUI()};host.append(b)}editUI()}
 function editUI(){let s=state.patterns[state.pattern][selected];$('#cri-selected').textContent=String(selected+1).padStart(2,'0');$('#cri-note').value=s.note;$('#cri-gate').value=s.gate;for(let [id,k] of [['cri-step-on','on'],['cri-accent','accent'],['cri-slide','slide']])$('#'+id).classList.toggle('lit',s[k])}
 function patch(i){i=((i%presets.length)+presets.length)%presets.length;history.push({...p});if(history.length>40)history.shift();if(type==='texture')engine?.retireVoices?.();Object.assign(p,cfg.preset,presets[i][1]);currentPreset=presets[i][0];$('#cri-presets').value=i;$('#cri-patchname').textContent=currentPreset;engine?.update?.();syncUI();$('#cri-status').textContent='Loaded '+currentPreset}
 function setParam(k,v){p[k]=cap(v);engine?.update?.();currentPreset='USER EDIT';$('#cri-patchname').textContent=currentPreset;syncUI()}
 $$('[data-knob]').forEach(el=>{let key=el.dataset.knob;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);let start=val(key),y=e.clientY;const move=z=>setParam(key,start+(y-z.clientY)/(z.shiftKey?500:165));const end=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end)};el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)});el.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();setParam(key,val(key)+(e.key==='ArrowUp'?.03:-.03))}});el.ondblclick=()=>setParam(key,cfg.preset[key])});
 $$('[data-opt]').forEach(el=>el.onchange=()=>{p[el.dataset.opt]=el.value;engine?.update?.();syncUI()});$$('[data-fader]').forEach(el=>el.oninput=()=>setParam(el.dataset.fader,+el.value));
 $('#cri-presets').onchange=e=>patch(+e.target.value);$('#cri-prev').onclick=()=>patch((+$('#cri-presets').value-1+presets.length)%presets.length);$('#cri-next').onclick=()=>patch((+$('#cri-presets').value+1)%presets.length);
 $('#cri-rand').onclick=()=>{
  history.push({...p});if(history.length>64)history.shift();
  const strength=p.mutation,scope=type==='texture'?$('#cri-mutate-scope').value:'TWEAK';
  const engineLock=type==='texture'&&$('#cri-lock-engine').checked;
  let count=0;
  for(const k of cfg.keys){
   if(type==='texture'&&(($('#cri-lock-filter').checked&&['cutoff','res','filter2','filterEnv'].includes(k))||($('#cri-lock-env').checked&&['attack','decay','sustain','release','envAttack','envDecay'].includes(k))))continue;
   const power=scope==='WILD'?.62+strength*.75:scope==='TIMBRE'?.28+strength*.5:.065+strength*.32;
   const selected=scope==='TIMBRE'?['wave','spread','fm','ring','character','second','third','depth','filter2','cutoff','motion','evolve']:cfg.keys;
   if(type==='texture'&&scope==='TIMBRE'&&!selected.includes(k))continue;
   if(type==='texture'&&scope==='TWEAK'&&Math.random()>.75)continue;
   p[k]=cap(p[k]+(Math.random()*2-1)*power);count++;
  }
  if(type==='texture'){
   const engines=cfg.selects.engine;
   if(!engineLock&&scope!=='TWEAK'&&(scope==='WILD'||Math.random()<.52))p.engine=engines[Math.random()*engines.length|0];
   if(Math.random()<(scope==='WILD'?.67:.24))p.table=cfg.selects.table[Math.random()*cfg.selects.table.length|0];
   if(scope==='WILD'){
    if(!$('#cri-lock-filter').checked){p.filterMode=cfg.selects.filterMode[Math.random()*3|0];p.filterA=cfg.selects.filterA[Math.random()*4|0];p.filterB=cfg.selects.filterB[Math.random()*4|0]}
    p.pace=cfg.selects.pace[Math.random()*4|0];
   }
  }else if(type==='poly'&&Math.random()<.25)p.wave=cfg.selects.wave[Math.random()*cfg.selects.wave.length|0];
  if(type==='texture'&&scope!=='TWEAK')engine?.retireVoices?.();engine?.update?.();currentPreset=type==='texture'?scope+' MUTATION '+history.length:'VARIATION '+history.length;$('#cri-patchname').textContent=currentPreset;syncUI();
  $('#cri-status').textContent='Created '+currentPreset+' · '+count+' parameters varied · UNDO returns to previous sound';
 };
 $('#cri-undo').onclick=()=>{let h=history.pop();if(h){Object.assign(p,h);engine?.update?.();syncUI();$('#cri-status').textContent='Previous sound restored'}};
 $('#cri-pattern').onchange=e=>{state.pattern=+e.target.value;selected=page*16;showSteps()};$('#cri-length').onchange=e=>{state.steps=+e.target.value;page=0;selected=0;position%=state.steps;syncUI()};$('#cri-page').onchange=e=>{page=+e.target.value;selected=page*16;syncUI()};$('#cri-root').onchange=e=>{state.root=+e.target.value;showSteps()};
 $('#cri-stepsrnd').onclick=()=>{for(let i=0;i<state.steps;i++){let s=state.patterns[state.pattern][i];s.note=templates[type][Math.random()*16|0];s.on=Math.random()>(type==='texture'?.72:.38);s.accent=Math.random()<.22;s.slide=Math.random()<.15}showSteps()};
 $('#cri-note').onchange=e=>{state.patterns[state.pattern][selected].note=+e.target.value;showSteps()};$('#cri-gate').oninput=e=>{state.patterns[state.pattern][selected].gate=+e.target.value};for(let [id,k] of [['cri-step-on','on'],['cri-accent','accent'],['cri-slide','slide']])$('#'+id).onclick=()=>{let s=state.patterns[state.pattern][selected];s[k]=!s[k];showSteps()};
 $('#cri-save').onclick=()=>{const blob=new Blob([JSON.stringify({format:'clawstudio-rack-device',version:1,type,state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`ClawStudio-${type}-patch.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500)};
 $('#cri-load').onclick=()=>$('#cri-loadfile').click();$('#cri-loadfile').onchange=async e=>{try{const obj=JSON.parse(await e.target.files[0].text());if(obj.format!=='clawstudio-rack-device'||obj.type!==type||!obj.state||!Array.isArray(obj.state.patterns)||obj.state.patterns.length!==8)throw Error('Incorrect preset format');Object.assign(state,{...obj.state,p:{...cfg.preset,...obj.state.p}});if(type==='poly')state.polyArp={...newPolyArp(),...(obj.state.polyArp||{})};Object.assign(p,state.p);if(![4,8,16,32,64].includes(state.steps))state.steps=16;page=0;selected=0;engine?.update?.();syncUI();$('#cri-status').textContent='Patch loaded'}catch(ex){$('#cri-status').textContent='Cannot load: '+ex.message}};
 function init(context,destination){if(engine)return engine;ctx=context;engine=type==='poly'?new PolyEngine(ctx,destination,p):type==='texture'?new TextureEngine(ctx,destination,p):new AcidEngine(ctx,destination,p);return engine}
 function scheduleStep(step,t,dur){if(!state.active||!engine)return;let i=step%state.steps,s=state.patterns[state.pattern][i];if(type==='poly'&&state.polyArp?.enabled){for(const event of arpEventsAtStep(state.polyArp,state.root,step,dur))engine.note(event.note,t+event.offset,event.length,event.velocity)}else if(s.on){let note=state.root+s.note;const length=Math.max(.06,dur*s.gate);if(type==='poly'){if(p.arp==='CHORD'){for(let n of [0,4,7])engine.note(note+n,t,length)}else if(p.arp==='OFF'){if(i%4===0)engine.note(note,t,length)}else engine.note(note+(p.arp==='DOWN'?(3-i%4)*3:(i%4)*3),t,length)}else if(type==='texture'){const hold=p.pace==='PLUCK'?1.3:p.pace==='PULSE'?2:p.pace==='SWARM'?3.5:6;const gate=length*hold;if(p.arp==='CHORD'){for(let n of [0,4,7])engine.note(note+n,t,gate)}else if(p.arp==='DRIFT'){for(let n of [0,7,12])engine.note(note+n,t,gate)}else if(p.arp==='UP'){engine.note(note+(i%3)*5,t,gate)}else engine.note(note,t,gate)}else {
  const pattern=state.patterns[state.pattern],fromPrevious=acidSlideFromPrevious(pattern,i,state.steps);
  const next=pattern[(i+1)%state.steps];
  engine.note(note,t,(s.slide&&next?.on)?dur*1.12:length,s.accent,fromPrevious,Boolean(s.slide&&next?.on));
 }}lastSeq=i;if(i===0||i%2===0)requestAnimationFrame(()=>{if(mount.isConnected)$$('.cri-step').forEach((el,j)=>el.classList.toggle('playhead',page*16+j===lastSeq))})}
 function stop(){running=false;clearInterval(interval);interval=null;if(type==='acid')engine?.stop();$('#cri-jam').textContent='▶ AUDITION';lastSeq=-1;showSteps()}
 async function jam(){if(externalClock){$('#cri-status').textContent='Use ClawStudio master JAM; this module is synced to the desk';return}if(running){stop();return}try{if(!ctx)ctx=getContext?.()||new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();if(!engine)init(ctx,getDestination?.()||ctx.destination);running=true;position=0;next=ctx.currentTime+.05;interval=setInterval(()=>{let count=0;while(next<ctx.currentTime+.15&&count++<32){scheduleStep(position,next,60/tempo()/4);position=(position+1)%(type==='poly'&&state.polyArp?.enabled?Math.max(state.steps,state.polyArp.steps):state.steps);next+=60/tempo()/4}},25);$('#cri-jam').textContent='Ⅱ PAUSE';$('#cri-status').textContent='Playing '+cfg.name+' · knobs are live'}catch(err){$('#cri-status').textContent=err.message}}
 $('#cri-jam').onclick=jam;if(externalClock){$('#cri-jam').textContent='↳ MASTER JAM'};
 if(type==='texture')$('#cri-hit').onclick=async()=>{try{
  if(!ctx)ctx=getContext?.()||new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();
  if(!engine)init(ctx,getDestination?.()||ctx.destination);
  engine.note(state.root+state.patterns[state.pattern][selected].note,ctx.currentTime+.035,.3);
  $('#cri-status').textContent='Previewing '+(p.engine||'WAVETABLE')+' · '+currentPreset;
 }catch(e){$('#cri-status').textContent='Audition unavailable: '+e.message}};
 patch(0);state.steps=type==='acid'?16:type==='texture'?16:8;syncUI();return {type,state,init,scheduleStep,stop,dispose:()=>{stop();engine?.dispose()},setActive:v=>state.active=!!v,getParams:()=>({...p}),getEngine:()=>engine,refreshUI:syncUI};
}