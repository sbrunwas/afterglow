// ClawStudio BASS-01 — original Web Audio monophonic synth, AGPL-3.0-only
// 101-inspired oscillator/sequencer; aggressive dual-resonant MS-style filter;
// TRK-01-inspired oscillator modes/modulation (not circuit-identical emulation).
export const BASE={
  mode:'CLASSIC',saw:.67,pulse:.43,pwm:.42,sub:.67,subOct:1,noise:.055,
  detune:.31,fmRatio:2,fmIndex:.25,wave:.25,fold:.15,
  hp:.065,hpres:.18,lp:.54,lpres:.36,drive:.18,filterEnv:.42,keytrack:.36,
  attack:.035,decay:.27,sustain:.52,release:.24,glide:.10,
  lfo1Rate:.25,lfo1Depth:.12,lfo1Target:'CUTOFF',
  lfo2Rate:.16,lfo2Depth:.08,lfo2Target:'PWM',
  delay:.11,feedback:.29,space:.12,duck:.09,volume:.72
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
    this.pre=ctx.createWaveShaper();this.hp=ctx.createBiquadFilter();this.hp.type='highpass';
    this.inter=ctx.createWaveShaper();this.lp=ctx.createBiquadFilter();this.lp.type='lowpass';
    this.env=ctx.createGain();this.env.gain.value=0;
    this.post=ctx.createWaveShaper();this.duck=ctx.createGain();this.duck.gain.value=1;
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
  _curve(power,fold=false){const a=new Float32Array(1024);for(let i=0;i<a.length;i++){let x=(2*i/1023-1)*(1+power*18);if(fold){x=2/Math.PI*Math.asin(Math.sin(x*1.57));}else x=Math.tanh(x)/Math.max(.001,Math.tanh(1+power*18));a[i]=x;}return a}
  _pulse(duty){const real=new Float32Array(65),imag=new Float32Array(65);for(let n=1;n<65;n++){real[n]=2*Math.sin(n*2*Math.PI*duty)/(Math.PI*n);imag[n]=2*(1-Math.cos(n*2*Math.PI*duty))/(Math.PI*n)}return this.ctx.createPeriodicWave(real,imag,{disableNormalization:false})}
  _wave(morph){const real=new Float32Array(65),imag=new Float32Array(65);for(let n=1;n<65;n++){const tri=n%2===1?Math.pow(-1,(n-1)/2)/(n*n):0;const saw=Math.pow(-1,n)/n;const hollow=n%2?1/n:0;const glass=n<=20?Math.sin(n*1.37)/(Math.sqrt(n)):0;let m=morph*3;imag[n]=m<1?(1-m)*tri+m*saw:m<2?(2-m)*saw+(m-1)*hollow:(3-m)*hollow+(m-2)*glass;}return this.ctx.createPeriodicWave(real,imag,{disableNormalization:false})}
  _changeWave(){const p=this.params;const duty=norm(p.pwm,.05,.95);if(Math.abs(duty-this._lastPulse)>.008){this.pulse.setPeriodicWave(this._pulse(duty));this._lastPulse=duty}
    if(p.mode==='MODERN'&&Math.abs(p.wave-(this._oldWave??-1))>.015){this.carrier.setPeriodicWave(this._wave(p.wave));this._oldWave=p.wave}
  }
  update(changes){Object.assign(this.params,changes);const p=this.params,ctx=this.ctx,t=ctx.currentTime;this.hp.frequency.setTargetAtTime(exp(p.hp,28,5000),t,.023);this.hp.Q.setTargetAtTime(.5+p.hpres*19,t,.03);this.lp.frequency.setTargetAtTime(exp(p.lp,52,19000),t,.023);this.lp.Q.setTargetAtTime(.6+p.lpres*21,t,.03);this.pre.curve=this._curve(p.drive*.7);this.inter.curve=this._curve(p.drive*.43);this.post.curve=this._curve(p.drive*.27,p.mode==='WEST');
    const gainmap={CLASSIC:[p.saw,p.pulse,0,0,p.sub],SUPER:[.6,.08,.5,.5,p.sub],WEST:[.85,.17,0,0,p.sub],FM:[.9,0,0,0,p.sub],MODERN:[.9,0,0,0,p.sub]};const lev=gainmap[p.mode]||gainmap.CLASSIC;for(let i=0;i<this.levels.length;i++)this.levels[i].gain.setTargetAtTime(lev[i],t,.015);this.noiseLevel.gain.setTargetAtTime(p.noise,t,.02);
    this.fmGain.gain.setTargetAtTime(p.mode==='FM'?hz(this.lastNote??36)*p.fmIndex*6:0,t,.025);this.fm.frequency.setTargetAtTime(hz(this.lastNote??36)*p.fmRatio,t,.02);
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
    const gain=this.env.gain,a=.002+p.attack*.12,d=.035+p.decay*.60,s=Math.max(.0002,p.sustain*(accent?1.25:1)),vol=accent?.84:.61;
    gain.cancelScheduledValues(t);gain.setValueAtTime(Math.max(.0001,gain.value),t);gain.linearRampToValueAtTime(vol,t+a);gain.setTargetAtTime(s*vol,t+a,d/3);
    const rel=.025+p.release*.65;if(!slide){gain.setValueAtTime(s*vol,t+tail);gain.setTargetAtTime(.0001,t+tail,rel/3)}
    const lp=this.lp.frequency,base=exp(p.lp,52,19000)*(1+(midi-36)/80*p.keytrack),sweep=(1+p.filterEnv*(accent?8:4));lp.cancelScheduledValues(t);lp.setValueAtTime(Math.min(19500,base*sweep),t);lp.exponentialRampToValueAtTime(Math.max(35,base),t+.018+p.decay*.52);
    const hp=this.hp.frequency;hp.cancelScheduledValues(t);hp.setTargetAtTime(exp(p.hp,28,5000),t,.018);
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
 group('01 / OSCILLATOR MATRIX',`<div class="b01modebar">${['CLASSIC','SUPER','WEST','FM','MODERN'].map(m=>`<button data-mode="${m}" class="b01mode">${m}</button>`).join('')}</div><div class="b01knobgrid">${[['saw','SAW'],['pulse','PULSE'],['pwm','PWM'],['sub','SUB'],['noise','NOISE'],['detune','DETUNE'],['fmIndex','FM INDEX'],['wave','WAVE MORPH'],['fold','FOLD'],['fmRatio','FM RATIO']].map(x=>knobMarkup(...x)).join('')}</div><div class="b01toggle"><label>SUB OCT <select data-option="subOct"><option value="1">−1 OCT</option><option value="2">−2 OCT</option></select></label></div>`),
 group('02 / DUAL RESONANT FILTER',`<div class="b01filterheader">MS · DUAL VCF <span>HP → DRIVE → LP</span></div><div class="b01knobgrid">${[['hp','HP FREQ'],['hpres','HP PEAK'],['lp','LP FREQ'],['lpres','LP PEAK'],['drive','DRIVE'],['filterEnv','ENV AMT'],['keytrack','KEYTRACK']].map(x=>knobMarkup(...x)).join('')}</div>`),
 group('03 / ENVELOPES + GLIDE',`<div class="b01knobgrid">${[['attack','ATTACK'],['decay','DECAY'],['sustain','SUSTAIN'],['release','RELEASE'],['glide','PORTAMENTO'],['volume','LEVEL']].map(x=>knobMarkup(...x)).join('')}</div>`),
 group('04 / MODULATION MATRIX',`<div class="b01lfo">${[1,2].map(n=>`<div><strong>LFO ${n}</strong><div class="b01twoknobs">${knobMarkup('lfo'+n+'Rate','RATE')}${knobMarkup('lfo'+n+'Depth','DEPTH')}</div><label>TARGET <select data-option="lfo${n}Target"><option>CUTOFF</option><option>PWM</option><option>PITCH</option><option>FM</option></select></label></div>`).join('')}</div>`),
 group('05 / OUTBOARD + PUMP',`<div class="b01knobgrid">${[['delay','DUB SEND'],['feedback','ECHO FDBK'],['space','SPACE'],['duck','PUMP']].map(x=>knobMarkup(...x)).join('')}</div>`)
 ];
 mount.innerHTML=`<div class="b01rack"><header class="b01head"><div><span class="b01eyebrow">CLAWSTUDIO / INSTRUMENT 02</span><h2>BASS<span>–01</span></h2><div class="b01subline">MONOPHONIC PERFORMANCE SYNTHESIZER · SH / MS / TRK</div></div><div class="b01master"><span id="b01-lamp" class="b01lamp"></span><label>PATCH <select id="b01-preset"><option value="INIT">INIT PATCH</option>${Object.keys(PRESETS).map(n=>`<option>${n}</option>`).join('')}</select></label><button id="b01-jam">▶ BASS JAM</button></div></header><div class="b01modules">${sections.join('')}</div><section class="b01seq"><div class="b01seqhead"><div><strong>101 / STEP MEMORY</strong><span>ACCENT · SLIDE · LIVE PATTERNS</span></div><div class="b01seqtools"><label>PAT <select id="b01-pattern">${Array.from({length:8},(_,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')}</option>`).join('')}</select></label><label>STEPS <select id="b01-count"><option>16</option><option>32</option><option>64</option></select></label><label>PAGE <select id="b01-page"><option value="0">01</option><option value="1">02</option><option value="2">03</option><option value="3">04</option></select></label><label>ROOT <select id="b01-root">${Array.from({length:25},(_,i)=>`<option value="${24+i}">${NOTES[(24+i)%12]}${Math.floor((24+i)/12)-1}</option>`).join('')}</select></label><button id="b01-random">⚄ VARY</button><button id="b01-clear">CLEAR</button></div></div><div class="b01steps">${Array.from({length:16},(_,i)=>`<button class="b01step" data-step="${i}" aria-label="Step ${i+1}"><b>${String(i+1).padStart(2,'0')}</b><em></em><small></small></button>`).join('')}</div><div class="b01edit"><div class="b01selected">EDIT STEP <strong id="b01-selected">01</strong></div><label>NOTE <select id="b01-note">${Array.from({length:37},(_,i)=>`<option value="${i}">${NOTES[i%12]}${Math.floor(i/12)+2}</option>`).join('')}</select></label><button id="b01-on">● GATE</button><button id="b01-accent">▲ ACCENT</button><button id="b01-slide">↗ SLIDE</button><label>GATE LENGTH <input id="b01-gate" type="range" min=".1" max="1" step=".01"></label></div><div class="b01bottom"><span id="b01-status">Tap BASS JAM to audition. Controls remain editable without audio.</span><div><button id="b01-save">SAVE PATCH</button><button id="b01-load">LOAD PATCH</button><input id="b01-file" type="file" accept=".json" hidden></div></div></section></div>`;
 let editing=0;
 const refresh=()=>{all('[data-param]').forEach(el=>{const id=el.dataset.param,v=state.params[id],n=typeof v==='number'?norm(id==='fmRatio'?(v-1)/7:v):0;el.style.setProperty('--angle',(-135+n*270)+'deg');el.style.setProperty('--arc',(n*270)+'deg');el.setAttribute('aria-valuenow',Math.round(n*100));const value=mount.querySelector('[data-value="'+id+'"]');value.textContent=id==='fmRatio'?v.toFixed(1)+'×':id==='lp'||id==='hp'?Math.round(exp(v,id==='hp'?28:52,id==='hp'?5000:19000))+' Hz':Math.round(n*100)+'%'});
 all('[data-mode]').forEach(el=>el.classList.toggle('lit',el.dataset.mode===state.params.mode));all('[data-option]').forEach(el=>el.value=state.params[el.dataset.option]);$('#b01-preset').value=Object.keys(PRESETS).find(k=>JSON.stringify({...BASE,...PRESETS[k]})===JSON.stringify(state.params))||'INIT';$('#b01-pattern').value=state.pattern;$('#b01-count').value=state.steps;$('#b01-page').value=state.page;$('#b01-root').value=state.root;
 all('[data-step]').forEach((el,i)=>{let x=state.patterns[state.pattern][state.page*16+i],note=x.note;el.classList.toggle('active',x.on);el.classList.toggle('edit',editing===state.page*16+i);el.classList.toggle('playing',activeStep===state.page*16+i);el.querySelector('em').textContent=NOTES[note%12]+(Math.floor(note/12)+2);el.querySelector('small').textContent=(x.accent?'▲':'')+(x.slide?'↗':'')});
 let x=state.patterns[state.pattern][editing];$('#b01-selected').textContent=String(editing+1).padStart(2,'0');$('#b01-note').value=x.note;$('#b01-on').classList.toggle('lit',x.on);$('#b01-accent').classList.toggle('lit',x.accent);$('#b01-slide').classList.toggle('lit',x.slide);$('#b01-gate').value=x.gate};
 const update=changes=>{Object.assign(state.params,changes);engine?.update(state.params);refresh()};
 all('[data-param]').forEach(el=>{const id=el.dataset.param;el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);const y=e.clientY,start=state.params[id],scale=id==='fmRatio'?7:1;const move=a=>{const n=norm((start-(a.clientY-y)/155*scale-(id==='fmRatio'?1:0))/(id==='fmRatio'?7:1));update({[id]:id==='fmRatio'?1+Math.round(n*7):n})};const up=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up)};el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)});el.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();const dir=['ArrowUp','ArrowRight'].includes(e.key)?1:-1;update({[id]:id==='fmRatio'?Math.min(8,Math.max(1,state.params[id]+dir)):norm(state.params[id]+dir*.02)})}});el.addEventListener('dblclick',()=>update({[id]:BASE[id]}))});
 all('[data-mode]').forEach(el=>el.onclick=()=>update({mode:el.dataset.mode}));all('[data-option]').forEach(el=>el.onchange=()=>update({[el.dataset.option]:el.dataset.option==='subOct'?+el.value:el.value}));
 $('#b01-preset').onchange=e=>{const k=e.target.value;if(k==='INIT')update({...BASE});else update({...BASE,...PRESETS[k]});$('#b01-status').textContent='Loaded '+k};
 $('#b01-pattern').onchange=e=>{state.pattern=+e.target.value;editing=0;refresh()};$('#b01-count').onchange=e=>{state.steps=+e.target.value;state.page=0;editing=0;refresh()};$('#b01-page').onchange=e=>{state.page=+e.target.value;editing=state.page*16;refresh()};$('#b01-root').onchange=e=>{state.root=+e.target.value;refresh()};
 all('[data-step]').forEach(el=>{const i=+el.dataset.step;let hold;el.onclick=()=>{const index=state.page*16+i;if(editing===index){state.patterns[state.pattern][index].on=!state.patterns[state.pattern][index].on}else editing=index;refresh()};el.oncontextmenu=e=>{e.preventDefault();editing=state.page*16+i;refresh()}});
 $('#b01-note').onchange=e=>{state.patterns[state.pattern][editing].note=+e.target.value;refresh()};$('#b01-gate').oninput=e=>{state.patterns[state.pattern][editing].gate=+e.target.value};for(const [id,key] of [['b01-on','on'],['b01-accent','accent'],['b01-slide','slide']])$( '#'+id ).onclick=()=>{const x=state.patterns[state.pattern][editing];x[key]=!x[key];refresh()};
 $('#b01-random').onclick=()=>{for(let i=0;i<state.steps;i++){const a=state.patterns[state.pattern][i];a.on=Math.random()>.28;a.note=[0,0,3,5,7,10,12,15][Math.random()*8|0];a.accent=Math.random()<.18;a.slide=Math.random()<.15}refresh()};$('#b01-clear').onclick=()=>{state.patterns[state.pattern].forEach(x=>x.on=false);refresh()};
 function noteFrom(index){const s=state.patterns[state.pattern][index%state.steps];return s.on?{midi:state.root+s.note,accent:s.accent,slide:s.slide,gate:s.gate}:null}
 function scheduleStep(index,time,duration){if(!engine||!state.active)return;const idx=index%state.steps,note=noteFrom(idx);if(note)engine.noteOn(note.midi,time,Math.max(.045,duration*note.gate),note.accent,note.slide);activeStep=idx;if(mount.isConnected&&((idx%2===0)||(idx===0)))requestAnimationFrame(()=>{if(mount.isConnected)all('[data-step]').forEach(el=>el.classList.toggle('playing',state.page*16+(+el.dataset.step)===activeStep) )})}
 function init(context,destination){if(engine)return engine;ctx=context;engine=new Bass01Engine(context,destination);engine.update(state.params);return engine}
 function stop(){playing=false;clearInterval(interval);interval=null;engine?.noteOff();$('#b01-jam').textContent='▶ BASS JAM';$('#b01-lamp').classList.remove('live');activeStep=-1;refresh()}
 async function jam(){if(externalClock){$('#b01-status').textContent='Use the main CLAWSTUDIO JAM transport to play this rack instrument.';return}if(playing){stop();return}try{if(!ctx)ctx=getContext?getContext():new (window.AudioContext||window.webkitAudioContext)();await ctx.resume();if(!engine)init(ctx,getDestination?getDestination():ctx.destination);playing=true;position=0;next=ctx.currentTime+.05;interval=setInterval(()=>{let j=0;while(next<ctx.currentTime+.13&&j++<20){scheduleStep(position,next,60/tempo()/4);position=(position+1)%state.steps;next+=60/tempo()/4}},23);$('#b01-jam').textContent='Ⅱ PAUSE';$('#b01-lamp').classList.add('live');$('#b01-status').textContent='BASS JAM running · drag knobs upward/downward to sculpt the sound'}catch(e){$('#b01-status').textContent='Audio unavailable: '+e.message}}
 $('#b01-jam').onclick=jam;$('#b01-save').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify({format:'clawstudio-bass01',version:1,...state},null,2)],{type:'application/json'}));a.href=url;a.download='ClawStudio-BASS01-patch.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1200)};$('#b01-load').onclick=()=>$('#b01-file').click();$('#b01-file').onchange=async e=>{try{let data=JSON.parse(await e.target.files[0].text());if(data.format!=='clawstudio-bass01')throw Error('Not a BASS-01 patch');if(!Array.isArray(data.patterns)||data.patterns.length!==8||!data.params)throw Error('Invalid patch');Object.assign(state,{...data,patterns:data.patterns});update(state.params);$('#b01-status').textContent='Patch loaded'}catch(err){$('#b01-status').textContent=err.message}};
 // In studio clock mode JAM is disabled because global transport owns scheduling.
 if(externalClock){$('#b01-jam').textContent='↳ MASTER JAM';$('#b01-jam').onclick=()=>{$('#b01-status').textContent='Press JAM in the ClawStudio header to start both instruments.'}}
 refresh();return {state,init,scheduleStep,stop,dispose:()=>{stop();engine?.dispose()},setTempo:n=>{state.bpm=n},setActive:v=>{state.active=!!v},getEngine:()=>engine,getParams:()=>({...state.params})};
}

