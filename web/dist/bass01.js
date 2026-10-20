// ClawStudio BASS-01 — original Web Audio monophonic synth, AGPL-3.0-only
// 101-inspired oscillator/sequencer; aggressive dual-resonant MS-style filter;
// TRK-01-inspired oscillator modes/modulation (not circuit-identical emulation).
export const BASE={
  mode:'CLASSIC',saw:.67,pulse:.43,pwm:.42,sub:.67,subOct:1,subWave:'TRIANGLE',noise:.055,
  detune:.31,fmRatio:2,fmIndex:.25,wave:.25,fold:.15,
  hp:.065,hpres:.18,lp:.54,lpres:.36,drive:.18,filterEnv:.42,keytrack:.36,
  attack:.015,decay:.22,sustain:.52,release:.20,punch:.35,glide:.10,
  fAttack:.015,fDecay:.22,fSustain:.03,fRelease:.12,filterSource:'OWN',filterTarget:'LP',filterPolarity:'UP',
  lfo1Rate:.25,lfo1Depth:.12,lfo1Target:'CUTOFF',
  lfo2Rate:.16,lfo2Depth:.08,lfo2Target:'PWM',
  delay:0,feedback:.29,space:0,duck:.09,volume:.72
};
export const PRESETS={
 '101 / Rubberline':{mode:'CLASSIC',saw:.8,pulse:.57,pwm:.34,sub:.53,lp:.49,lpres:.35,decay:.2,sustain:.4,glide:.13},
 '101 / Deep Sub':{mode:'CLASSIC',saw:.2,pulse:.45,sub:.95,subOct:1,noise:0,lp:.25,lpres:.17,drive:.1,decay:.5,sustain:.74},
 'MS / Screamer':{mode:'CLASSIC',saw:.87,pulse:.32,sub:.45,hp:.26,hpres:.76,lp:.59,lpres:.83,drive:.72,filterEnv:.75},
 'MS / Rubber Dirt':{mode:'CLASSIC',saw:.52,pulse:.71,sub:.55,hp:.16,hpres:.58,lp:.38,lpres:.7,drive:.65},
 'TRK / Metallic FM':{mode:'FM',fmRatio:3,fmIndex:.69,sub:.58,lp:.65,lpres:.51,drive:.3,filterEnv:.64},
 'TRK / Folded Bass':{mode:'WEST',fold:.74,sub:.57,lp:.55,lpres:.51,drive:.38},
 'TRK / Rave Stack':{mode:'SUPER',detune:.38,sub:.64,lp:.72,lpres:.44,drive:.28,delay:.19},
 'TRK / Shifting Digital':{mode:'MODERN',wave:.7,sub:.48,lp:.65,lpres:.4,lfo1Depth:.36,lfo1Target:'CUTOFF',lfo2Target:'PITCH'},
};

// Additional original ClawStudio patches. Categories are part of the preset name,
// so legacy patch names continue to work. Each is a real parameter snapshot.
Object.assign(PRESETS,{
 '101 / Laser Pulse':{mode:'CLASSIC',saw:.17,pulse:.97,pwm:.23,sub:.53,noise:.01,lp:.59,lpres:.38,filterEnv:.6,fDecay:.18,fSustain:0,attack:0,decay:.17,sustain:.17,release:.10,glide:.07},
 '101 / Hollow Square':{mode:'CLASSIC',saw:.04,pulse:.99,pwm:.68,sub:.76,subOct:2,noise:.0,lp:.44,lpres:.24,filterEnv:.52,fDecay:.40,fSustain:.23,attack:.02,decay:.36,sustain:.57},
 '101 / Bouncy 1994':{mode:'CLASSIC',saw:.54,pulse:.71,pwm:.38,sub:.82,lp:.43,lpres:.55,filterEnv:.73,fDecay:.13,fSustain:.02,decay:.12,sustain:.16,release:.08,glide:.04},
 '101 / Round & Warm':{mode:'CLASSIC',saw:.3,pulse:.42,pwm:.51,sub:.90,noise:0,lp:.36,lpres:.13,filterEnv:.17,fDecay:.37,fSustain:.42,attack:.04,decay:.45,sustain:.77,release:.24},
 'MS / Razor HP':{mode:'CLASSIC',saw:.93,pulse:.48,sub:.26,hp:.44,hpres:.86,lp:.74,lpres:.68,drive:.75,filterEnv:.85,filterTarget:'BOTH',fDecay:.19,fSustain:.03,attack:0,decay:.3,sustain:.34},
 'MS / Snapping Teeth':{mode:'WEST',fold:.48,sub:.39,hp:.20,hpres:.63,lp:.43,lpres:.95,drive:.78,filterEnv:.92,fAttack:0,fDecay:.095,fSustain:0,attack:0,decay:.1,sustain:0,release:.06},
 'MS / Industrial Sub':{mode:'CLASSIC',saw:.48,pulse:.31,sub:1,subOct:2,noise:.16,hp:.1,hpres:.42,lp:.46,lpres:.58,drive:.82,filterEnv:.50,fDecay:.45,fSustain:.25},
 'MS / Inverted Bite':{mode:'CLASSIC',saw:.85,pulse:.13,sub:.56,hp:.28,hpres:.74,lp:.65,lpres:.76,drive:.58,filterEnv:.82,filterPolarity:'DOWN',filterTarget:'HP',fAttack:.3,fDecay:.18,fSustain:.1,attack:.01,release:.17},
 'TRK / Glass Carrier':{mode:'FM',fmRatio:5,fmIndex:.83,sub:.29,noise:.05,lp:.77,lpres:.23,filterEnv:.35,fDecay:.23,fSustain:.4,drive:.18},
 'TRK / Hollow Formant':{mode:'MODERN',wave:.92,sub:.43,noise:.02,lp:.46,lpres:.82,filterEnv:.64,fDecay:.36,fSustain:.12,lfo1Depth:.27,lfo1Rate:.36},
 'TRK / Harsh Folding':{mode:'WEST',fold:.94,sub:.55,hp:.24,hpres:.3,lp:.51,lpres:.74,drive:.82,filterEnv:.88,fDecay:.17,fSustain:.02},
 'TRK / Detuned Engine':{mode:'SUPER',detune:.71,sub:.88,subOct:2,lp:.49,lpres:.26,drive:.43,filterEnv:.3,attack:.13,release:.35,space:.22},
 'TRK / Hollow Metallic':{mode:'FM',fmRatio:7,fmIndex:.52,sub:.92,lp:.39,lpres:.45,filterEnv:.55,fDecay:.34,fSustain:.2,drive:.38},
 'TRANCE / Dotted Pluck':{mode:'CLASSIC',saw:.7,pulse:.55,pwm:.28,sub:.72,lp:.32,lpres:.61,filterEnv:.94,fAttack:.0,fDecay:.16,fSustain:.025,fRelease:.08,attack:.0,decay:.12,sustain:.08,release:.08,glide:.035,delay:.28,feedback:.3},
 'TRANCE / Rolling Octaves':{mode:'SUPER',detune:.23,sub:.9,lp:.52,lpres:.48,filterEnv:.85,fAttack:.01,fDecay:.19,fSustain:.12,attack:.015,decay:.18,sustain:.38,release:.16,drive:.24},
 'TRANCE / Ibiza 2002':{mode:'SUPER',detune:.46,sub:.48,lp:.72,lpres:.24,filterEnv:.64,fAttack:.04,fDecay:.31,fSustain:.26,attack:.06,decay:.37,sustain:.6,release:.29,delay:.23,space:.25},
 'TRANCE / Acid Gate':{mode:'CLASSIC',saw:.92,pulse:.31,sub:.58,lp:.28,lpres:.78,filterEnv:.99,fDecay:.09,fSustain:0,attack:0,decay:.08,sustain:.04,release:.035,glide:.11,drive:.32},
 'TRANCE / Muted Stab':{mode:'CLASSIC',saw:.27,pulse:.9,pwm:.2,sub:.61,lp:.22,lpres:.58,filterEnv:.92,fDecay:.12,fSustain:0,attack:0,decay:.07,sustain:0,release:.025},
 'TRANCE / Cyber Reese':{mode:'SUPER',detune:.64,sub:.78,lp:.49,lpres:.46,filterEnv:.26,attack:.08,decay:.42,sustain:.72,release:.41,drive:.49,space:.18,lfo1Rate:.23,lfo1Depth:.3},
 'TECHNO / Warehouse Stomp':{mode:'CLASSIC',saw:.85,pulse:.23,sub:1,lp:.32,lpres:.28,drive:.78,filterEnv:.42,fDecay:.25,fSustain:.24,decay:.35,sustain:.55,duck:.25},
 'TECHNO / FM Knock':{mode:'FM',fmRatio:2,fmIndex:.85,sub:.75,lp:.38,lpres:.67,filterEnv:.79,fDecay:.1,fSustain:0,attack:0,decay:.12,sustain:0,release:.09,drive:.57},
 'TECHNO / Clicky Sub':{mode:'CLASSIC',saw:.24,pulse:.18,sub:1,noise:.09,lp:.28,lpres:.36,filterEnv:.86,fDecay:.055,fSustain:0,attack:0,decay:.1,sustain:.23,release:.04},
 'TECHNO / Broken Machine':{mode:'WEST',fold:.72,sub:.77,hp:.14,hpres:.37,lp:.42,lpres:.71,drive:.77,filterEnv:.64,fDecay:.19,fSustain:.14,lfo1Target:'CUTOFF',lfo1Depth:.27,lfo1Rate:.38},
 'TECHNO / Sub Pressure':{mode:'CLASSIC',saw:.1,pulse:.18,sub:1,subOct:2,noise:0,lp:.19,lpres:.08,filterEnv:.12,attack:.08,decay:.52,sustain:.82,release:.4,drive:.14,duck:.42},
 'TECHNO / Percussive Blip':{mode:'MODERN',wave:.45,sub:.43,lp:.47,lpres:.62,filterEnv:1,fDecay:.04,fSustain:0,attack:0,decay:.06,sustain:0,release:.03,drive:.32},
 'DUB / Deep & Smoky':{mode:'CLASSIC',saw:.31,pulse:.48,sub:1,subOct:2,lp:.26,lpres:.28,filterEnv:.3,fAttack:.12,fDecay:.56,fSustain:.2,attack:.11,decay:.51,sustain:.63,release:.53,delay:.58,feedback:.63,space:.34},
 'DUB / Echo Pulse':{mode:'CLASSIC',saw:.72,pulse:.36,sub:.78,lp:.35,lpres:.49,filterEnv:.8,fDecay:.14,fSustain:.03,attack:0,decay:.13,sustain:.11,release:.16,delay:.72,feedback:.71,space:.21},
 'DUB / Warped Cassette':{mode:'MODERN',wave:.17,sub:.75,lp:.38,lpres:.22,drive:.67,filterEnv:.29,attack:.06,decay:.49,sustain:.53,release:.56,delay:.44,feedback:.42,lfo2Target:'PITCH',lfo2Rate:.14,lfo2Depth:.13},
 'DUB / Space Drone':{mode:'SUPER',detune:.17,sub:.66,lp:.29,lpres:.59,filterEnv:.44,fAttack:.55,fDecay:.72,fSustain:.74,attack:.55,decay:.65,sustain:.78,release:.86,space:.85,delay:.38},
 'DUB / Slow Filter Bloom':{mode:'CLASSIC',saw:.6,pulse:.5,sub:.54,lp:.30,lpres:.48,filterEnv:.83,fAttack:.66,fDecay:.65,fSustain:.84,fRelease:.62,attack:.25,decay:.61,sustain:.77,release:.72,space:.39},
 'EXP / Glitch FM':{mode:'FM',fmRatio:8,fmIndex:1,sub:.21,noise:.17,lp:.79,lpres:.59,drive:.81,filterEnv:.95,fDecay:.07,fSustain:.05,lfo2Target:'FM',lfo2Depth:.52,lfo2Rate:.82},
 'EXP / Glass Organism':{mode:'MODERN',wave:.98,sub:.33,lp:.65,lpres:.77,filterEnv:.64,fAttack:.4,fDecay:.72,fSustain:.69,attack:.29,decay:.68,sustain:.84,release:.75,lfo1Rate:.17,lfo1Depth:.67,space:.64},
 'EXP / Folded Motion':{mode:'WEST',fold:1,sub:.38,noise:.12,lp:.74,lpres:.68,drive:.78,filterEnv:.9,filterSource:'AMP',fDecay:.37,lfo1Target:'CUTOFF',lfo1Rate:.65,lfo1Depth:.45},
 'EXP / Acid Cicada':{mode:'CLASSIC',saw:.94,pulse:.13,sub:.11,noise:.59,hp:.62,hpres:.83,lp:.84,lpres:.93,drive:.76,filterEnv:.77,filterTarget:'BOTH',fDecay:.13,fSustain:.04,lfo2Target:'PWM',lfo2Rate:.71,lfo2Depth:.81},
 'EXP / Resonant Reverse':{mode:'FM',fmRatio:3,fmIndex:.41,sub:.49,hp:.41,hpres:.81,lp:.46,lpres:.74,filterEnv:.83,filterPolarity:'DOWN',fAttack:.67,fDecay:.46,fSustain:.12,attack:.08,decay:.32,sustain:.52,release:.47},
});
const PRESET_DESCRIPTIONS={
 'TRANCE / Dotted Pluck':'Short-volume / fast LP envelope, dotted-eighth friendly. Try GROOVE → DOTTED 8TH.',
 'TRANCE / Acid Gate':'Very short acid transient with high filter-envelope depth.',
 'TRANCE / Ibiza 2002':'Bright wide trance bass with a longer sustained tail.',
 'MS / Snapping Teeth':'Strong dual resonance with sharp filter closure.',
 'MS / Razor HP':'Aggressive high-pass and low-pass envelope movement.',
 'DUB / Deep & Smoky':'Lowpass-heavy dub bass with an echo trail.',
 'DUB / Slow Filter Bloom':'Slow attack and evolving lowpass cutoff for textural bass.',
 'EXP / Glass Organism':'Long filter and amp envelopes, moving digital overtones.',
};

const NOTES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const norm=(v,a=0,b=1)=>Math.min(b,Math.max(a,+v||0));
const hz=(n)=>440*Math.pow(2,(n-69)/12);
const exp=(norm,min,max)=>min*Math.pow(max/min,Math.max(0,Math.min(1,norm)));
const deepCopy=x=>JSON.parse(JSON.stringify(x));
export function createInitialBassState(){
  const step=(i,variant=0)=>({note:[0,0,7,0,12,7,3,0,0,7,5,3,12,10,7,3][i%16]+(variant%3)*2,
  on:[0,2,3,4,6,7,8,10,11,12,14,15].includes(i%16),accent:[0,4,8,12].includes(i%16),slide:[3,7,11,15].includes(i%16),gate:.74});
  return {params:{...BASE},bpm:126,root:36,steps:16,pattern:0,page:0,patterns:Array.from({length:8},(_,p)=>Array.from({length:64},(_,i)=>step(i,p))),active:true,sceneA:null,sceneB:null,morph:0};
}
const WAVES={};
export class Bass01Engine{
  constructor(ctx,destination){this.ctx=ctx;this.destination=destination;this.nodes=[];this.params={...BASE};this.lastNote=null;this.previousSlide=false;this.ready=false;this.output=ctx.createGain();this.output.gain.value=.75;this.output.connect(destination);
    const make=(type='gain')=>type==='gain'?ctx.createGain():ctx.createBiquadFilter();
    this.oscMix=ctx.createGain();this.oscMix.gain.value=.31;
    this.pre=ctx.createWaveShaper();this.pre.oversample='4x';this.hp=ctx.createBiquadFilter();this.hp.type='highpass';
    this.inter=ctx.createWaveShaper();this.inter.oversample='4x';this.lp=ctx.createBiquadFilter();this.lp.type='lowpass';
    this.env=ctx.createGain();this.env.gain.value=0;
    this.post=ctx.createWaveShaper();this.post.oversample='4x';this.duck=ctx.createGain();this.duck.gain.value=1;
    this.oscMix.connect(this.pre);this.pre.connect(this.hp);this.hp.connect(this.inter);this.inter.connect(this.lp);this.lp.connect(this.env);this.env.connect(this.post);this.post.connect(this.duck);this.duck.connect(this.output);
    this.delay=ctx.createDelay(1.5);this.feedback=ctx.createGain();this.delayTone=ctx.createBiquadFilter();this.delayTone.type='lowpass';this.delayTone.frequency.value=3200;
    this.sendD=ctx.createGain();this.post.connect(this.sendD);this.sendD.connect(this.delay);this.delay.connect(this.delayTone);this.delayTone.connect(this.feedback);this.feedback.connect(this.delay);this.delay.connect(this.output);
    this.sendR=ctx.createGain();this.post.connect(this.sendR);this.reverb=ctx.createConvolver();this.sendR.connect(this.reverb);this.reverb.connect(this.output);
    // compact, deterministic stereo decay impulse
    const n=Math.round(ctx.sampleRate*1.35),ir=ctx.createBuffer(2,n,ctx.sampleRate);
    for(let c=0;c<2;c++){let a=ir.getChannelData(c),seed=12345+c*789;for(let i=0;i<n;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;a[i]=((seed>>>8)/8388608-1)*Math.pow(1-i/n,2.5)*.21}}this.reverb.buffer=ir;
    this.carrier=ctx.createOscillator();this.pulse=ctx.createOscillator();this.super1=ctx.createOscillator();this.super2=ctx.createOscillator();this.sub=ctx.createOscillator();this.fm=ctx.createOscillator();
    this.levels=[this.carrier,this.pulse,this.super1,this.super2,this.sub].map(o=>{let g=ctx.createGain();o.connect(g);g.connect(this.oscMix);g.gain.value=0;return g});
    this.fmGain=ctx.createGain();this.fm.connect(this.fmGain);this.fmGain.connect(this.carrier.frequency);
    this.carrier.type='sawtooth';this.pulse.type='square';this.super1.type='sawtooth';this.super2.type='sawtooth';this.sub.type='square';this.fm.type='sine';
    this.noiseSource=ctx.createBufferSource();let buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),a=buffer.getChannelData(0),seed=517;for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;a[i]=((seed>>>8)/8388608-1)*.22;}this.noiseSource.buffer=buffer;this.noiseSource.loop=true;this.noiseLevel=ctx.createGain();this.noiseSource.connect(this.noiseLevel);this.noiseLevel.connect(this.oscMix);
    for(const o of [this.carrier,this.pulse,this.super1,this.super2,this.sub,this.fm])o.start();this.noiseSource.start();
    this.lfos=[0,1].map(i=>{let o=ctx.createOscillator(),g=ctx.createGain();o.type=i?'triangle':'sine';o.frequency.value=2;o.connect(g);o.start();return {o,g}});
    this._modInterval=0;this._lastPulse=-1;this.update(this.params);this.ready=true;
  }
  _curve(power,fold=false){
    const a=new Float32Array(1024);
    const depth=norm(power,0,1),wet=norm(depth*1.7,0,1),gain=1+depth*12;
    const divisor=Math.max(.001,Math.tanh(gain));
    for(let i=0;i<a.length;i++){
      const input=2*i/1023-1;
      const shape=fold
        ? 2/Math.PI*Math.asin(Math.sin(input*(1+depth*10)*Math.PI/2))
        : Math.tanh(input*gain)/divisor;
      // Drive at zero must be electrically clean. Previous implementation
      // saturated the signal three times even when the control was zero.
      a[i]=input*(1-wet)+shape*wet;
    }
    return a
  }
  _pulse(duty){const real=new Float32Array(65),imag=new Float32Array(65);for(let n=1;n<65;n++){real[n]=2*Math.sin(n*2*Math.PI*duty)/(Math.PI*n);imag[n]=2*(1-Math.cos(n*2*Math.PI*duty))/(Math.PI*n)}return this.ctx.createPeriodicWave(real,imag,{disableNormalization:false})}
  _wave(morph){const real=new Float32Array(65),imag=new Float32Array(65);for(let n=1;n<65;n++){const tri=n%2===1?Math.pow(-1,(n-1)/2)/(n*n):0;const saw=Math.pow(-1,n)/n;const hollow=n%2?1/n:0;const glass=n<=20?Math.sin(n*1.37)/(Math.sqrt(n)):0;let m=morph*3;imag[n]=m<1?(1-m)*tri+m*saw:m<2?(2-m)*saw+(m-1)*hollow:(3-m)*hollow+(m-2)*glass;}return this.ctx.createPeriodicWave(real,imag,{disableNormalization:false})}
  _changeWave(){const p=this.params;const duty=norm(p.pwm,.05,.95);if(Math.abs(duty-this._lastPulse)>.008){this.pulse.setPeriodicWave(this._pulse(duty));this._lastPulse=duty}
    if(p.mode==='MODERN'&&Math.abs(p.wave-(this._oldWave??-1))>.015){this.carrier.setPeriodicWave(this._wave(p.wave));this._oldWave=p.wave}
  }
  update(changes){Object.assign(this.params,changes);const p=this.params,ctx=this.ctx,t=ctx.currentTime;this.hp.frequency.setTargetAtTime(exp(p.hp,28,5000),t,.023);this.hp.Q.setTargetAtTime(.5+16*p.hpres*p.hpres,t,.03);this.lp.frequency.setTargetAtTime(exp(p.lp,52,19000),t,.023);this.lp.Q.setTargetAtTime(.6+17*p.lpres*p.lpres,t,.03);this.pre.curve=this._curve(p.drive*.7);this.inter.curve=this._curve(p.drive*.43);this.post.curve=this._curve(p.mode==='WEST'?p.fold:p.drive*.27,p.mode==='WEST');
    const gainmap={CLASSIC:[p.saw,p.pulse,0,0,p.sub],SUPER:[.6,.08,.5,.5,p.sub],WEST:[.85,.17,0,0,p.sub],FM:[.9,0,0,0,p.sub],MODERN:[.9,0,0,0,p.sub]};const lev=gainmap[p.mode]||gainmap.CLASSIC;for(let i=0;i<this.levels.length;i++)this.levels[i].gain.setTargetAtTime(lev[i],t,.015);this.noiseLevel.gain.setTargetAtTime(p.noise,t,.02);
    this.fmGain.gain.setTargetAtTime(p.mode==='FM'?hz(this.lastNote??36)*p.fmIndex*6:0,t,.025);this.fm.frequency.setTargetAtTime(hz(this.lastNote??36)*p.fmRatio,t,.02);
    this.sub.type=p.subWave==='SINE'?'sine':p.subWave==='SQUARE'?'square':'triangle';
    this.super1.detune.setTargetAtTime(-p.detune*36,t,.03);this.super2.detune.setTargetAtTime(p.detune*36,t,.03);
    if(p.mode!=='MODERN'&&this._oldMode==='MODERN')this.carrier.type=p.mode==='FM'?'sine':'sawtooth';else if(p.mode==='FM'&&this._oldMode!=='FM')this.carrier.type='sine';else if(p.mode!=='FM'&&p.mode!=='MODERN'&&this._oldMode==='FM')this.carrier.type='sawtooth';this._oldMode=p.mode;
    this._changeWave();this.output.gain.setTargetAtTime(p.volume*.84,t,.03);
    this.sendD.gain.setTargetAtTime(p.delay*.46,t,.03);this.delay.delayTime.setTargetAtTime(Math.max(.02,60/126*(p.delay>.49?.75:.5)),t,.035);this.feedback.gain.setTargetAtTime(Math.min(.87,p.feedback*.88),t,.035);this.sendR.gain.setTargetAtTime(p.space*.47,t,.035);
    this.lfos.forEach(({o,g},i)=>{const n=i+1,r=p['lfo'+n+'Rate'],depth=p['lfo'+n+'Depth'],target=p['lfo'+n+'Target'];o.frequency.setTargetAtTime(exp(r,.05,23),t,.05);g.disconnect();g.gain.value=0;const amount=target==='CUTOFF'?exp(p.lp,52,19000)*depth*.47:target==='PITCH'?depth*90:target==='FM'?hz(this.lastNote??36)*depth*2:0;if(amount){g.gain.setTargetAtTime(amount,t,.02);g.connect(target==='CUTOFF'?this.lp.frequency:target==='PITCH'?this.carrier.detune:this.fmGain.gain)}});
    // PWM modulation is computed on the UI thread at 25 Hz; no heavy audio-rate wave creation.
    if(!this._modInterval){this._modInterval=setInterval(()=>{if(this.ctx.state!=='running')return;const q=this.params;let shift=0;[1,2].forEach(i=>{if(q['lfo'+i+'Target']==='PWM')shift+=Math.sin(this.ctx.currentTime*2*Math.PI*exp(q['lfo'+i+'Rate'],.05,23))*q['lfo'+i+'Depth']*.32});const duty=norm(q.pwm+shift,.08,.92);if(Math.abs(duty-this._lastPulse)>.017){this.pulse.setPeriodicWave(this._pulse(duty));this._lastPulse=duty}},40)}
  }
  noteOn(midi,time,length,accent=false,slide=false){if(!this.ready)return;const p=this.params,hzNote=hz(midi),glide=exp(p.glide,.002,.24),t=Math.max(time,this.ctx.currentTime+.004),tail=Math.max(.04,length*(slide?1.08:.83));const freqTargets=[this.carrier,this.pulse,this.super1,this.super2,this.sub];const values=[hzNote,hzNote,hzNote,hzNote,hzNote/Math.pow(2,p.subOct)];
    freqTargets.forEach((o,i)=>{o.frequency.cancelScheduledValues(t);if(this.previousSlide&&this.lastNote!==null){o.frequency.setValueAtTime(hz(this.lastNote)/(i===4?Math.pow(2,p.subOct):1),t);o.frequency.exponentialRampToValueAtTime(values[i],t+glide)}else{o.frequency.setValueAtTime(values[i],t)}});this.fm.frequency.setValueAtTime(hzNote*p.fmRatio,t);this.fmGain.gain.setTargetAtTime(p.mode==='FM'?hzNote*p.fmIndex*6:0,t,.01);
    // Independent amp and filter ADSR envelopes. The end of the note gate
    // triggers a release, not an abrupt value jump, so short/dotted notes pop.
    const a=.0008+p.attack*p.attack*.55,d=.008+p.decay*p.decay*1.35;
    const rel=.012+p.release*p.release*1.55;
    const peak=(accent?.85:.64)*(1+(p.punch??0)*.55),sustain=Math.max(.00001,p.sustain)*(.64+(p.punch??0)*.05);
    const gain=this.env.gain;
    gain.cancelScheduledValues(t);
    if(this.previousSlide){gain.setValueAtTime(Math.max(.0001,sustain),t);}
    else{
      gain.setValueAtTime(.0001,t);
      if(tail<=a){
        const mid=.0001+(peak-.0001)*tail/a;
        gain.linearRampToValueAtTime(mid,t+tail);
      }else{
        gain.linearRampToValueAtTime(peak,t+a);
        gain.setTargetAtTime(sustain,t+a,d/3);
      }
    }
    if(!slide){
      const current=this.previousSlide?sustain:tail<=a?.0001+(peak-.0001)*tail/a:sustain+(peak-sustain)*Math.exp(-(tail-a)/(d/3));
      gain.setValueAtTime(Math.max(.0001,current),t+tail);
      gain.setTargetAtTime(.0001,t+tail,rel/3);
    }
    const filterShape=p.filterSource==='AMP'?{a:p.attack,d:p.decay,s:p.sustain,r:p.release}:{a:p.fAttack??0,d:p.fDecay??.22,s:p.fSustain??0,r:p.fRelease??.12};
    const fa=.0009+filterShape.a*filterShape.a*.58;
    const fd=.009+filterShape.d*filterShape.d*1.4;
    const fr=.02+filterShape.r*filterShape.r*1.8;
    const sign=p.filterPolarity==='DOWN'?-1:1;
    const keyScale= Math.pow(2,(midi-36)*p.keytrack/48);
    const amount=p.filterEnv*(accent?1.23:1)*5;
    const bounds=(x)=>Math.min(19500,Math.max(22,x));
    for(const [node,base,enabled] of [
      [this.lp,exp(p.lp,52,19000)*keyScale,p.filterTarget!=='HP'],
      [this.hp,exp(p.hp,28,5000)*keyScale,p.filterTarget==='HP'||p.filterTarget==='BOTH']]){
      const frequency=node.frequency;
      if(!enabled||p.filterEnv<.0001){frequency.setTargetAtTime(bounds(base),t,.012);continue;}
      const initial=bounds(base),top=bounds(base*Math.pow(2,sign*amount)),sust=bounds(base*Math.pow(2,sign*amount*filterShape.s));
      frequency.cancelScheduledValues(t);
      frequency.setValueAtTime(initial,t);
      if(tail<=fa){
        const atEnd=initial*Math.pow(top/initial,tail/fa);
        frequency.exponentialRampToValueAtTime(atEnd,t+tail);
        if(!slide){frequency.setTargetAtTime(initial,t+tail,fr/3)}
      }else{
        frequency.exponentialRampToValueAtTime(top,t+fa);
        frequency.setTargetAtTime(sust,t+fa,fd/3);
        if(!slide){
          const atEnd=sust+(top-sust)*Math.exp(-(tail-fa)/(fd/3));
          frequency.setValueAtTime(bounds(atEnd),t+tail);
          frequency.setTargetAtTime(initial,t+tail,fr/3);
        }
      }
    }
    if(p.duck>.01){const duck=this.duck.gain;duck.cancelScheduledValues(t);duck.setValueAtTime(1-p.duck*.73,t);duck.linearRampToValueAtTime(1,t+.12)}
    this.lastNote=midi;this.previousSlide=slide;
  }
  noteOff(){const t=this.ctx.currentTime;this.env.gain.cancelScheduledValues(t);this.env.gain.setTargetAtTime(.0001,t,.08);this.previousSlide=false}
  dispose(){this.noteOff();clearInterval(this._modInterval);for(let o of [this.carrier,this.pulse,this.super1,this.super2,this.sub,this.fm,this.noiseSource,...this.lfos.map(x=>x.o)])try{o.stop()}catch{}this.output.disconnect();this.feedback.disconnect()}
}
function knobMarkup(id,label,description=''){return `<div class="b01knobwrap"><div class="b01knoblabel">${label}</div><div class="b01knob" role="slider" tabindex="0" data-param="${id}" title="${description||label}"><i></i></div><span class="b01read" data-value="${id}"></span></div>`}
const group=(name,inner)=>`<section class="b01panel"><div class="b01groupname">${name}</div>${inner}</section>`;
export function createBass01(mount,{getContext=null,getDestination=null,tempo=()=>126,externalClock=false}={}){
 const state=createInitialBassState();let ctx=null,engine=null,running=false,interval=null,next=0,position=0,playing=false,activeStep=-1;const $=s=>mount.querySelector(s),all=s=>[...mount.querySelectorAll(s)];
 const sections=[
 group('01 / OSCILLATOR MATRIX',`<div class="b01modebar">${['CLASSIC','SUPER','WEST','FM','MODERN'].map(m=>`<button data-mode="${m}" class="b01mode">${m}</button>`).join('')}</div><div class="b01knobgrid">${[['saw','SAW'],['pulse','PULSE'],['pwm','PWM'],['sub','SUB'],['noise','NOISE'],['detune','DETUNE'],['fmIndex','FM INDEX'],['wave','WAVE MORPH'],['fold','FOLD'],['fmRatio','FM RATIO']].map(x=>knobMarkup(...x)).join('')}</div><div class="b01toggle"><label>SUB OCT <select data-option="subOct"><option value="1">−1 OCT</option><option value="2">−2 OCT</option></select></label><label>SUB WAVE <select data-option="subWave"><option value="SINE">SINE · CLEAN</option><option value="TRIANGLE">TRIANGLE · WARM</option><option value="SQUARE">SQUARE · RAW</option></select></label></div>`),
 group('02 / DUAL RESONANT FILTER',`<div class="b01filterheader">MS · DUAL VCF <span>HP → DRIVE → LP</span></div><div class="b01knobgrid">${[['hp','HP FREQ'],['hpres','HP PEAK'],['lp','LP FREQ'],['lpres','LP PEAK'],['drive','DRIVE'],['filterEnv','ENV AMT'],['keytrack','KEYTRACK']].map(x=>knobMarkup(...x)).join('')}</div><div class="b01toggle b01options"><label>FILTER SOURCE <select data-option="filterSource"><option value="OWN">FILTER ADSR</option><option value="AMP">AMP ADSR</option></select></label><label>ENV ROUTE <select data-option="filterTarget"><option value="LP">LOW PASS</option><option value="HP">HIGH PASS</option><option value="BOTH">BOTH FILTERS</option></select></label><label>POLARITY <select data-option="filterPolarity"><option value="UP">OPEN ↑</option><option value="DOWN">CLOSE ↓</option></select></label></div>`),
 group('03 / AMP + FILTER ADSR',`<div class="b01envelopes"><div><b>AMP ENVELOPE</b><div class="b01envelopegrid">${[['attack','ATTACK'],['decay','DECAY'],['sustain','SUSTAIN'],['release','RELEASE']].map(x=>knobMarkup(...x)).join('')}</div></div><div><b>FILTER ENVELOPE</b><div class="b01envelopegrid">${[['fAttack','ATTACK'],['fDecay','DECAY'],['fSustain','SUSTAIN'],['fRelease','RELEASE']].map(x=>knobMarkup(...x)).join('')}</div></div><div class="b01envelopeextras">${knobMarkup('glide','PORTAMENTO')}${knobMarkup('punch','SNAP / PUNCH')}${knobMarkup('volume','LEVEL')}</div></div>`),
 group('04 / MODULATION MATRIX',`<div class="b01lfo">${[1,2].map(n=>`<div><strong>LFO ${n}</strong><div class="b01twoknobs">${knobMarkup('lfo'+n+'Rate','RATE')}${knobMarkup('lfo'+n+'Depth','DEPTH')}</div><label>TARGET <select data-option="lfo${n}Target"><option>CUTOFF</option><option>PWM</option><option>PITCH</option><option>FM</option></select></label></div>`).join('')}</div>`),
 group('05 / OUTBOARD + PUMP',`<div class="b01knobgrid">${[['delay','DUB SEND'],['feedback','ECHO FDBK'],['space','SPACE'],['duck','PUMP']].map(x=>knobMarkup(...x)).join('')}</div>`)
 ];
 mount.innerHTML=`<div class="b01rack"><header class="b01head"><div><span class="b01eyebrow">CLAWSTUDIO / INSTRUMENT 02</span><h2>BASS<span>–01</span></h2><div class="b01subline">MONOPHONIC PERFORMANCE SYNTHESIZER · SH / MS / TRK</div></div><div class="b01master"><span id="b01-lamp" class="b01lamp"></span><button id="b01-jam">▶ BASS JAM</button></div></header><div class="b01patchbar"><div class="b01patchtitle"><span>PATCH LIBRARY</span><strong id="b01-patchname">INIT PATCH</strong><small id="b01-patchcount"></small></div><div class="b01patchcontrols"><label>CATEGORY <select id="b01-category"><option value="ALL">ALL STYLES</option>${[...new Set(Object.keys(PRESETS).map(n=>n.split(' / ')[0]))].map(c=>`<option value="${c}">${c}</option>`).join('')}</select></label><button id="b01-prev" aria-label="Previous patch">◀</button><label>PRESET <select id="b01-preset"><option value="INIT">INIT PATCH</option>${Object.keys(PRESETS).map(n=>`<option value="${n}">${n}</option>`).join('')}</select></label><button id="b01-next" aria-label="Next patch">▶</button><button id="b01-surprise">⚄ SURPRISE</button></div><p id="b01-patchdesc" class="b01patchdesc">Design a sound from scratch or select one of the factory bass patches.</p></div><div class="b01modules">${sections.join('')}</div><section class="b01seq"><div class="b01seqhead"><div><strong>101 / STEP MEMORY</strong><span>ACCENT · SLIDE · LIVE PATTERNS</span></div><div class="b01seqtools"><label>PAT <select id="b01-pattern">${Array.from({length:8},(_,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')}</option>`).join('')}</select></label><label>STEPS <select id="b01-count"><option value="4">04</option><option value="8">08</option><option value="16">16</option><option value="32">32</option><option value="64">64</option></select></label><label>PAGE <select id="b01-page"><option value="0">01</option><option value="1">02</option><option value="2">03</option><option value="3">04</option></select></label><label>ROOT <select id="b01-root">${Array.from({length:61},(_,i)=>`<option value="${12+i}">${NOTES[(12+i)%12]}${Math.floor((12+i)/12)-1}</option>`).join('')}</select></label><label>GROOVE <select id="b01-groove"><option value="KEEP">CUSTOM</option><option value="DOTTED">DOTTED 8TH</option><option value="OFFBEAT">OFFBEAT</option><option value="DRIVE">16TH DRIVE</option><option value="SPARSE">SPARSE</option><option value="SYNC">SYNCOPATED</option></select></label><button id="b01-random">⚄ VARY</button><button id="b01-clear">CLEAR</button></div></div><div class="b01steps">${Array.from({length:16},(_,i)=>`<button class="b01step" data-step="${i}" aria-label="Step ${i+1}"><b>${String(i+1).padStart(2,'0')}</b><em></em><small></small></button>`).join('')}</div><div class="b01edit"><div class="b01selected">EDIT STEP <strong id="b01-selected">01</strong></div><label>NOTE <select id="b01-note">${Array.from({length:61},(_,i)=>`<option value="${i-24}">${NOTES[((state.root+i-24)%12+12)%12]}${Math.floor(Math.max(0,state.root+i-24)/12)-1}</option>`).join('')}</select></label><button id="b01-on">● GATE</button><button id="b01-accent">▲ ACCENT</button><button id="b01-slide">↗ SLIDE</button><label>GATE LENGTH <input id="b01-gate" type="range" min=".1" max="1" step=".01"></label></div><div class="b01bottom"><span id="b01-status">Tap BASS JAM to audition. Controls remain editable without audio.</span><div><button id="b01-save">SAVE PATCH</button><button id="b01-load">LOAD PATCH</button><input id="b01-file" type="file" accept=".json" hidden></div></div></section></div>`;
 let editing=0,selectedPreset='INIT',dirty=false;
 const presetKeys=Object.keys(PRESETS);
 function presetDescription(name){return PRESET_DESCRIPTIONS[name]||((name.includes(' / ')?name.split(' / ')[0]:'INIT')+' bass patch · sculpt the knobs, then save your own version.');}
 function presentPreset(){
   const category=$('#b01-category').value;
   const filtered=presetKeys.filter(n=>category==='ALL'||n.startsWith(category+' / '));
   const select=$('#b01-preset');select.innerHTML='<option value="INIT">INIT PATCH</option>'+filtered.map(n=>`<option value="${n}">${n}</option>`).join('');
   if(!filtered.includes(selectedPreset)){$('#b01-category').value='ALL';select.innerHTML='<option value="INIT">INIT PATCH</option>'+presetKeys.map(n=>`<option value="${n}">${n}</option>`).join('')}
   select.value=selectedPreset;
   $('#b01-patchname').textContent=(selectedPreset==='INIT'?'INIT PATCH':selectedPreset)+(dirty?' *':'');
   $('#b01-patchcount').textContent=presetKeys.length+' FACTORY PATCHES';
   $('#b01-patchdesc').textContent=presetDescription(selectedPreset)+(dirty?' · EDITED':'');
 }
 function loadPreset(name){
   if(name!=='INIT'&&!PRESETS[name])return;
   selectedPreset=name;dirty=false;
   Object.assign(state.params,{...BASE,...(PRESETS[name]||{})});engine?.update(state.params);
   refresh();$('#b01-status').textContent='Loaded '+name;
 }

 const refresh=()=>{all('[data-param]').forEach(el=>{const id=el.dataset.param,v=state.params[id],n=typeof v==='number'?norm(id==='fmRatio'?(v-1)/7:v):0;el.style.setProperty('--angle',(-135+n*270)+'deg');el.style.setProperty('--arc',(n*270)+'deg');el.setAttribute('aria-valuenow',Math.round(n*100));const value=mount.querySelector('[data-value="'+id+'"]');value.textContent=id==='fmRatio'?v.toFixed(1)+'×':id==='lp'||id==='hp'?Math.round(exp(v,id==='hp'?28:52,id==='hp'?5000:19000))+' Hz':Math.round(n*100)+'%'});
 all('[data-mode]').forEach(el=>el.classList.toggle('lit',el.dataset.mode===state.params.mode));all('[data-option]').forEach(el=>el.value=state.params[el.dataset.option]);presentPreset();$('#b01-pattern').value=state.pattern;$('#b01-count').value=state.steps;$('#b01-page').value=state.page;$('#b01-root').value=state.root;for(const opt of $('#b01-note').options){const midi=Math.max(0,Math.min(127,state.root+Number(opt.value)));opt.textContent=NOTES[midi%12]+(Math.floor(midi/12)-1)}
 const maxPage=Math.floor((state.steps-1)/16);if(state.page>maxPage)state.page=0;const pageSelect=$('#b01-page');pageSelect.value=state.page;pageSelect.disabled=maxPage===0;[...pageSelect.options].forEach(opt=>{opt.disabled=Number(opt.value)>maxPage});
 const stepGrid=$('.b01steps');stepGrid.style.setProperty('--b01-step-columns',Math.min(16,state.steps));stepGrid.style.minWidth=state.steps<=8?'0px':'';
 all('[data-step]').forEach((el,i)=>{const index=state.page*16+i;const outside=index>=state.steps;el.classList.toggle('outside',outside);el.setAttribute('aria-hidden',String(outside));el.tabIndex=outside?-1:0;if(outside)return;let x=state.patterns[state.pattern][index],note=x.note;el.classList.toggle('active',x.on);el.classList.toggle('edit',editing===state.page*16+i);el.classList.toggle('playing',activeStep===state.page*16+i);const midi=Math.max(0,Math.min(127,state.root+note));el.querySelector('em').textContent=NOTES[midi%12]+(Math.floor(midi/12)-1);el.querySelector('small').textContent=(x.accent?'▲':'')+(x.slide?'↗':'')});
 let x=state.patterns[state.pattern][editing];$('#b01-selected').textContent=String(editing+1).padStart(2,'0');$('#b01-note').value=x.note;$('#b01-on').classList.toggle('lit',x.on);$('#b01-accent').classList.toggle('lit',x.accent);$('#b01-slide').classList.toggle('lit',x.slide);$('#b01-gate').value=x.gate};
 const update=changes=>{Object.assign(state.params,changes);dirty=true;engine?.update(state.params);refresh()};
 all('[data-param]').forEach(el=>{const id=el.dataset.param;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);const y=e.clientY,start=state.params[id],scale=id==='fmRatio'?7:1;const move=a=>{const n=norm((start-(a.clientY-y)/155*scale-(id==='fmRatio'?1:0))/(id==='fmRatio'?7:1));update({[id]:id==='fmRatio'?1+Math.round(n*7):n})};const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up)};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)});el.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();const dir=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;update({[id]:id==='fmRatio'?Math.min(8,Math.max(1,state.params[id]+dir)):norm(state.params[id]+dir*.02)})}});el.addEventListener('dblclick',()=>update({[id]:BASE[id]}))});
 all('[data-mode]').forEach(el=>el.onclick=()=>update({mode:el.dataset.mode}));all('[data-option]').forEach(el=>el.onchange=()=>update({[el.dataset.option]:el.dataset.option==='subOct'?+el.value:el.value}));
 $('#b01-preset').onchange=e=>loadPreset(e.target.value);
 $('#b01-category').onchange=()=>{const c=$('#b01-category').value;const options=presetKeys.filter(n=>c==='ALL'||n.startsWith(c+' / '));if(options.length){selectedPreset=options[0];loadPreset(selectedPreset)}};
 function stepPreset(dir){const c=$('#b01-category').value,options=presetKeys.filter(n=>c==='ALL'||n.startsWith(c+' / '));const index=options.indexOf(selectedPreset);loadPreset(options[(index+dir+options.length)%options.length]);}
 $('#b01-prev').onclick=()=>stepPreset(-1);$('#b01-next').onclick=()=>stepPreset(1);
 $('#b01-surprise').onclick=()=>loadPreset(presetKeys[Math.random()*presetKeys.length|0]);
 $('#b01-groove').onchange=e=>{
   const kind=e.target.value;
   if(kind==='KEEP')return;
   // Groove templates honor the selected loop length (including 4 and 8 steps).
   const length=state.steps;
   for(let i=0;i<length;i++){
     const cell=state.patterns[state.pattern][i];
     cell.on=kind==='DOTTED'?i%3===0:kind==='OFFBEAT'?i%4===2:kind==='DRIVE'?i%2===0:kind==='SPARSE'?i%8===0:[0,3,7,10,14].includes(i%16);
     cell.accent=kind==='DOTTED'?i%12===0:i%4===0;
     cell.slide=false;cell.gate=kind==='DOTTED'?.39:kind==='DRIVE'?.54:.66;
     cell.note=[0,0,7,0,12,7,3,0,0,7,5,3,12,10,7,3][i%16];
   }
   refresh();$('#b01-status').textContent='Groove applied: '+e.target.options[e.target.selectedIndex].text;
 };
 $('#b01-pattern').onchange=e=>{state.pattern=+e.target.value;editing=0;refresh()};$('#b01-count').onchange=e=>{state.steps=+e.target.value;state.page=0;editing=0;position%=state.steps;if(activeStep>=state.steps)activeStep=-1;refresh()};$('#b01-page').onchange=e=>{state.page=+e.target.value;editing=state.page*16;refresh()};$('#b01-root').onchange=e=>{state.root=+e.target.value;refresh()};
 all('[data-step]').forEach(el=>{const i=+el.dataset.step;let hold;el.onclick=()=>{const index=state.page*16+i;if(index>=state.steps)return;if(editing===index){state.patterns[state.pattern][index].on=!state.patterns[state.pattern][index].on}else editing=index;refresh()};el.oncontextmenu=e=>{e.preventDefault();editing=state.page*16+i;refresh()}});
 $('#b01-note').onchange=e=>{state.patterns[state.pattern][editing].note=+e.target.value;refresh()};$('#b01-gate').oninput=e=>{state.patterns[state.pattern][editing].gate=+e.target.value};for(const [id,key] of [['b01-on','on'],['b01-accent','accent'],['b01-slide','slide']])$( '#'+id ).onclick=()=>{const x=state.patterns[state.pattern][editing];x[key]=!x[key];refresh()};
 $('#b01-random').onclick=()=>{for(let i=0;i<state.steps;i++){const a=state.patterns[state.pattern][i];a.on=Math.random()>.28;a.note=[0,0,3,5,7,10,12,15][Math.random()*8|0];a.accent=Math.random()<.18;a.slide=Math.random()<.15}refresh()};$('#b01-clear').onclick=()=>{state.patterns[state.pattern].forEach(x=>x.on=false);refresh()};
 function noteFrom(index){const s=state.patterns[state.pattern][index%state.steps];return s.on?{midi:Math.max(0,Math.min(127,state.root+s.note)),accent:s.accent,slide:s.slide,gate:s.gate}:null}
 function scheduleStep(index,time,duration){if(!engine||!state.active)return;const idx=index%state.steps,note=noteFrom(idx);if(note)engine.noteOn(note.midi,time,Math.max(.045,duration*note.gate),note.accent,note.slide);activeStep=idx;if(mount.isConnected&&((idx%2===0)||(idx===0)))requestAnimationFrame(()=>{if(mount.isConnected)all('[data-step]').forEach(el=>el.classList.toggle('playing',state.page*16+(+el.dataset.step)===activeStep) )})}
 function init(context,destination){if(engine)return engine;ctx=context;engine=new Bass01Engine(context,destination);engine.update(state.params);return engine}
 function stop(){playing=false;clearInterval(interval);interval=null;engine?.noteOff();$('#b01-jam').textContent='▶ BASS JAM';$('#b01-lamp').classList.remove('live');activeStep=-1;refresh()}
 async function jam(){if(externalClock){$('#b01-status').textContent='Use the main CLAWSTUDIO JAM transport to play this rack instrument.';return}if(playing){stop();return}try{if(!ctx)ctx=getContext?getContext():new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();if(!engine)init(ctx,getDestination?getDestination():ctx.destination);playing=true;position=0;next=ctx.currentTime+.05;interval=setInterval(()=>{let j=0;while(next<ctx.currentTime+.13&&j++<20){scheduleStep(position,next,60/tempo()/4);position=(position+1)%state.steps;next+=60/tempo()/4}},23);$('#b01-jam').textContent='Ⅱ PAUSE';$('#b01-lamp').classList.add('live');$('#b01-status').textContent='BASS JAM running · drag knobs upward/downward to sculpt the sound'}catch(e){$('#b01-status').textContent='Audio unavailable: '+e.message}}
 $('#b01-jam').onclick=jam;$('#b01-save').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({format:'clawstudio-bass01',version:2,preset:selectedPreset,...state},null,2)],{type:'application/json'}));a.href=url;a.download='ClawStudio-BASS01-patch.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)};$('#b01-load').onclick=()=>$('#b01-file').click();$('#b01-file').onchange=async e=>{try{let data=JSON.parse(await e.target.files[0].text());if(data.format!=='clawstudio-bass01')throw Error('Not a BASS-01 patch');if(!Array.isArray(data.patterns)||data.patterns.length!==8||!data.params)throw Error('Invalid patch');Object.assign(state,{...data,patterns:data.patterns,params:{...BASE,...data.params}});if(![4,8,16,32,64].includes(state.steps))state.steps=16;state.page=Math.min(Math.max(0,Number(state.page)||0),Math.floor((state.steps-1)/16));editing=0;position%=state.steps;selectedPreset=PRESETS[data.preset]?data.preset:'INIT';dirty=true;engine?.update(state.params);refresh();$('#b01-status').textContent='Patch loaded'}catch(err){$('#b01-status').textContent=err.message}};
 // In studio clock mode JAM is disabled because global transport owns scheduling.
 if(externalClock){$('#b01-jam').textContent='↳ MASTER JAM';$('#b01-jam').onclick=()=>{$('#b01-status').textContent='Press JAM in the ClawStudio header to start both instruments.'}}
 refresh();return {state,init,scheduleStep,stop,dispose:()=>{stop();engine?.dispose()},setTempo:n=>{state.bpm=n},setActive:v=>{state.active=!!v},getEngine:()=>engine,getParams:()=>({...state.params}),refreshUI:refresh};
}
