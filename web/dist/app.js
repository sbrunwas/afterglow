// SPDX-License-Identifier: AGPL-3.0-only
import {AfterglowAudio} from './audio.js';
import {initSkins} from './skins.js';
import {randomPattern,randomSound,randomAllDrums} from './randomize.js';
initSkins();
import {createInitialState, encodePreset, decodePreset, MIDI_NOTES, RANDOM_ENGINE_IDS} from './state.js';

const $ = id => document.getElementById(id);
const names = ['BASS DRUM','SNARE DRUM','LOW TOM','MID TOM','HIGH TOM','RIM SHOT','HAND CLAP','CLOSED HAT','OPEN HAT','CRASH','RIDE'];
const audio = new AfterglowAudio();
const storageKey = 'afterglow-web-project-v1';
const voiceName = index => state.voices[index].model===1 && index>=9 ? (index===9?'CYMBAL':'COWBELL') : names[index];
let state = createInitialState(), samples = Array(11).fill(null);
let voice = 0, step = 0, page = 0, clipboard = null, initialized = false, initializing = null, playing = false, saveTimer;
let position = {step:-1,pattern:0,playing:false,peak:0};
const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const controls = new Map();
let randomUndo=null;
const voiceRandomButtons=[];
const voiceMuteButtons=[], voiceSoloButtons=[];
const stepButtons = [], voiceButtons = [], patternButtons = [], pageButtons = [], numberLabels = [];
function status(message, error = false) { $('status').textContent = message; $('status').classList.toggle('error',error); }
function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try { localStorage.setItem(storageKey,JSON.stringify(encodePreset(state,samples))); }
        catch { status('Device storage is full or unavailable. Use SAVE KIT to keep this project.',true); }
    },650);
}
function sync(save = true) {
    if(initialized) audio.setState(state);
    if(save) persist();
}
async function ensureAudio() {
    if(initialized) return;
    if(initializing) return initializing;
    $('audio-status').textContent='Starting audio engine...';
    initializing = (async()=> {
        await audio.init();
        initialized=true;
        audio.setState(state);
        audio.setSamples(samples);
        $('audio-status').textContent=audio.stateStatus || 'Audio engine ready';
    })().catch(error=> { status(error.message || String(error),true); $('audio-status').textContent='Audio could not start. Click PLAY to retry.'; throw error; }).finally(()=> {initializing=null;});
    return initializing;
}
function guarded(fn) { return async event => { try { await fn(event); } catch(error) { status(error.message || String(error),true); } }; }
function bind(id,fn) { $(id).addEventListener('click',guarded(fn)); }
function rememberRandom(undo){randomUndo=undo;$('undo-random').disabled=false;}
function randomizeSound(index){if(state.voices[index].model===2){status('Choose a built-in engine to randomize its sound.');return;}const previous=clone(state.voices[index]);rememberRandom(()=>{for(const key of ['tune','decay','tone','drive'])state.voices[index][key]=previous[key];selectVoice(index);});state.voices[index]=randomSound(state.voices[index],index);selectVoice(index);sync();status(`New sound settings for ${voiceName(index)}.`);}
function randomizeLane(lane){const index=state.selectedPattern,selected=lane,previous=clone(currentPattern().steps[lane]);rememberRandom(()=>{state.bank.patterns[index].steps[selected]=previous;state.selectedPattern=index;selectVoice(selected);});const p=currentPattern();for(let s=0;s<64;s++){const hit=p.steps[lane][s];let likelihood=lane===0?(s%4===0?.92:.10):lane===1?(s%8===4?.95:.06):lane===7?(s%2===0?.8:.25):lane===8?(s%4===2?.6:.03):.18;hit.on=s<p.length&&Math.random()<likelihood;hit.velocity=.55+Math.random()*.4;hit.probability=1;hit.ratchets=1;}selectVoice(lane);sync();renderAll();status(`New variation for ${voiceName(lane)}.`);}
function currentPattern(){ return state.bank.patterns[state.selectedPattern]; }
function selectedStep(){ return currentPattern().steps[voice][step]; }
function createControl(parent,key,label,min,max,increment,decimals,get,set) {
    const wrapper=document.createElement('div');wrapper.className='control';
    const title=document.createElement('label');title.textContent=label;title.htmlFor=`range-${key}`;
    const knob=document.createElement('div');knob.className='knob-display';knob.setAttribute('aria-hidden','true');
    const range=document.createElement('input');range.type='range';range.id=`range-${key}`;range.min=min;range.max=max;range.step=increment;range.setAttribute('aria-label',label);
    const number=document.createElement('input');number.type='number';number.className='number-value';number.min=min;number.max=max;number.step=increment;number.setAttribute('aria-label',`${label} value`);
    const refresh=()=>{const value=Number(get());range.value=value;number.value=value.toFixed(decimals);knob.style.setProperty('--angle',`${-135+(value-min)/(max-min)*270}deg`);};
    const edit=value=>{if(!Number.isFinite(value))return;value=Math.max(min,Math.min(max,Math.round(value/increment)*increment));set(value);sync();refresh();if(key.startsWith('step-'))renderGrid();};
    let knobDrag=null;
    knob.style.pointerEvents='auto';knob.style.touchAction='none';knob.style.cursor='ns-resize';
    knob.addEventListener('pointerdown',event=>{event.preventDefault();knobDrag={y:event.clientY,value:Number(get())};knob.setPointerCapture(event.pointerId);});
    knob.addEventListener('pointermove',event=>{if(!knobDrag)return;const value=knobDrag.value+(knobDrag.y-event.clientY)*(max-min)/(event.shiftKey?1000:180);edit(Math.round(value/increment)*increment);});
    knob.addEventListener('pointerup',()=>{knobDrag=null;});knob.addEventListener('pointercancel',()=>{knobDrag=null;});
    range.addEventListener('input',()=>edit(Number(range.value)));
    number.addEventListener('change',()=>edit(Number(number.value)));
    wrapper.append(title,knob,range,number);parent.append(wrapper);controls.set(key,refresh);refresh();
}
function renderGrid(){
    const pattern=currentPattern(), anySolo=state.voices.some(params=>params.solo);
    for(let v=0;v<11;v++){
        for(const [key,buttons] of [['mute',voiceMuteButtons],['solo',voiceSoloButtons]]){
            buttons[v].setAttribute('aria-pressed',String(state.voices[v][key]));
            buttons[v].setAttribute('aria-label',`${key==='mute'?'Mute':'Solo'} ${voiceName(v)}`);
        }
        voiceButtons[v].parentElement.classList.toggle('silenced',state.voices[v].mute||(anySolo&&!state.voices[v].solo));
        voiceButtons[v].lastChild.textContent=voiceName(v);
        voiceButtons[v].setAttribute('aria-label',`Select ${voiceName(v)}`);
        voiceRandomButtons[v].setAttribute('aria-label',`Randomize ${voiceName(v)} pattern`);
        voiceButtons[v].classList.toggle('active',v===voice);voiceButtons[v].setAttribute('aria-pressed',String(v===voice));
        for(let s=0;s<16;s++){
            const absolute=page*16+s, data=pattern.steps[v][absolute], button=stepButtons[v][s];
            button.classList.toggle('on',data.on);button.classList.toggle('inactive',absolute>=pattern.length);button.classList.toggle('selected',v===voice&&absolute===step);
            button.classList.toggle('playing',position.playing&&position.pattern===state.selectedPattern&&position.step===absolute);
            button.style.setProperty('--velocity',data.velocity);button.setAttribute('aria-pressed',String(data.on));
            button.setAttribute('aria-label',`${voiceName(v)}, step ${absolute+1}, ${data.on?'on':'off'}, velocity ${Math.round(data.velocity*100)}%, probability ${Math.round(data.probability*100)}%, ${data.ratchets} repeat${data.ratchets===1?'':'s'}${absolute>=pattern.length?', outside pattern length':''}`);
            button.querySelector('.repeats').textContent=data.on&&data.ratchets>1?data.ratchets:'';
            const chance=button.querySelector('.chance');chance.style.width=`${data.probability*85}%`;chance.hidden=!data.on||data.probability===1;
        }
    }
    for(let s=0;s<16;s++){numberLabels[s].textContent=String(page*16+s+1).padStart(2,'0');numberLabels[s].classList.toggle('playing',position.playing&&position.pattern===state.selectedPattern&&position.step===page*16+s);}
    patternButtons.forEach((b,i)=>{b.classList.toggle('active',i===state.selectedPattern);b.setAttribute('aria-pressed',String(i===state.selectedPattern));});
    pageButtons.forEach((b,i)=>{b.classList.toggle('active',i===page);b.setAttribute('aria-pressed',String(i===page));});
    if(document.activeElement!==$('length')) $('length').value=pattern.length;
    $('step-label').textContent=`STEP ${String(step+1).padStart(2,'0')}`;
}
function renderVoice(){
    $('randomize-sound').disabled=state.voices[voice].model===2;
    $('voice-name').textContent=voiceName(voice);$('voice-number').textContent=String(voice+1).padStart(2,'0');$('model').value=state.voices[voice].model;
    for(const key of ['mute','solo','reverse'])$(key).setAttribute('aria-pressed',String(state.voices[voice][key]));
    const sample=samples[voice];$('sample-name').textContent=sample?sample.name:'Drop an audio sample here, or click to browse';
    $('sample-detail').textContent=sample?`${(sample.left.length/sample.sampleRate).toFixed(2)} sec / ${Math.round(sample.sampleRate/1000)} kHz`:'WAV / AIFF / FLAC / MP3';
    $('sample-clear').disabled=!sample;
    controls.forEach(refresh=>refresh());
}
function renderEnginePool(){
    for(const model of RANDOM_ENGINE_IDS)$(`engine-pool-${model}`).checked=state.randomEnginePool.includes(model);
    const empty=state.randomEnginePool.length===0;
    $('randomize-all-drums').disabled=empty;
    $('randomize-all-drums').setAttribute('aria-describedby','engine-pool-hint');
    $('engine-pool-hint').textContent=empty?'Select at least one engine to randomize all drums.':'Used by Randomize All Drums';
}
function renderAll(){renderGrid();renderVoice();renderEnginePool();$('chain-mode').setAttribute('aria-pressed',String(state.chainMode));$('chain').value=state.bank.chain.slice(0,state.bank.chainLength).map(x=>x+1).join(', ');}
function selectVoice(index){voice=index;renderVoice();renderGrid();}
function makeGrid(){
    const empty=document.createElement('span');empty.className='section-label';empty.textContent='INSTRUMENT';$('sequencer').append(empty);
    for(let s=0;s<16;s++){const label=document.createElement('span');label.className='step-number';numberLabels.push(label);$('sequencer').append(label);}
    for(let v=0;v<11;v++){
        const label=document.createElement('button');label.className='voice-select';const number=document.createElement('span');number.textContent=String(v+1).padStart(2,'0');label.append(number,document.createTextNode(voiceName(v)));
        label.addEventListener('click',()=>selectVoice(v));label.addEventListener('contextmenu',guarded(async event=>{event.preventDefault();selectVoice(v);await ensureAudio();audio.audition(v,1);}));
        label.title='Select voice. Right-click to audition.';voiceButtons.push(label);const row=document.createElement('div');row.className='voice-row';const random=document.createElement('button');random.className='voice-random';random.textContent='RND';random.setAttribute('aria-label',`Randomize ${voiceName(v)} pattern`);random.title='Randomize only this instrument’s steps in the current pattern';random.addEventListener('click',()=>randomizeLane(v));voiceRandomButtons.push(random);row.append(label);
        for(const [key,letter,buttons] of [['mute','M',voiceMuteButtons],['solo','S',voiceSoloButtons]]){
            const toggle=document.createElement('button');toggle.type='button';toggle.className=`voice-toggle voice-${key}`;toggle.textContent=letter;
            toggle.title=key==='mute'?'Mute this lane':'Solo this lane (multiple solos allowed)';
            toggle.addEventListener('click',()=>{state.voices[v][key]=!state.voices[v][key];sync();renderGrid();renderVoice();});
            buttons.push(toggle);row.append(toggle);
        }
        row.append(random);$('sequencer').append(row);stepButtons[v]=[];
        for(let s=0;s<16;s++){
            const button=document.createElement('button');button.className=`step${s%4===0?' beat':''}`;
            const led=document.createElement('i');led.className='key-led';const repeats=document.createElement('span');repeats.className='repeats';const chance=document.createElement('span');chance.className='chance';button.append(led,repeats,chance);
            const select=(toggle)=>{voice=v;step=page*16+s;if(toggle){const data=selectedStep();data.on=!data.on;sync();}renderVoice();renderGrid();};
            button.addEventListener('click',event=>select(!event.shiftKey));button.addEventListener('contextmenu',event=>{event.preventDefault();select(false);});stepButtons[v].push(button);$('sequencer').append(button);
        }
    }
    for(let p=0;p<16;p++){const button=document.createElement('button');button.textContent=p+1;button.setAttribute('aria-label',`Pattern ${p+1}`);button.addEventListener('click',()=>{state.selectedPattern=p;sync();renderAll();});patternButtons.push(button);$('patterns').append(button);}
    for(let p=0;p<4;p++){const button=document.createElement('button');button.textContent=`${p*16+1}–${p*16+16}`;button.addEventListener('click',()=>{page=p;step=p*16;renderGrid();renderVoice();});pageButtons.push(button);$('pages').append(button);}
}
function download(blob,name){const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function togglePlayback(){await ensureAudio();if(playing){audio.pause();playing=false;}else{audio.setState(state);await audio.play();playing=true;}renderTransport();}
function renderTransport(){ $('play').textContent=playing?'Ⅱ PAUSE':'▶ PLAY';$('play').setAttribute('aria-label',playing?'Pause':'Play');$('run-led').classList.toggle('on',playing); }
async function importSample(file,index=voice){if(!file)return;status(`Loading ${file.name}...`);const descriptor=await audio.loadSample(index,file);samples[index]=descriptor;state.voices[index].model=2;audio.setSamples(samples);sync();renderVoice();renderGrid();status(`${file.name} loaded into ${voiceName(index)}.`);}
try{const saved=localStorage.getItem(storageKey);if(saved){const result=decodePreset(saved);randomUndo=null;$('undo-random').disabled=true;state=result.state;samples=result.samples;status('Restored your last session on this device.');}}catch{status('Starting a new session. Previous local data was unavailable.',true);}
makeGrid();
for(const [key,label,min,max,increment,decimals] of [['tempo','TEMPO',40,240,.1,1],['swing','SWING',0,.66,.01,2],['master','MASTER',0,1,.01,2]])createControl($('global-controls'),key,label,min,max,increment,decimals,()=>state[key],value=>state[key]=value);
for(const [key,label,min,max,increment,decimals] of [['tune','TUNE / ST',-24,24,.1,1],['decay','DECAY',.03,1,.01,2],['tone','TONE',0,1,.01,2],['level','LEVEL',0,1.5,.01,2],['pan','PAN',-1,1,.01,2],['drive','DRIVE',0,1,.01,2],['sampleStart','START',0,.99,.001,3],['sampleEnd','END',.01,1,.001,3]])createControl($('voice-controls'),key,label,min,max,increment,decimals,()=>state.voices[voice][key],value=>{const selected=state.voices[voice];if(key==='sampleStart')value=Math.min(value,selected.sampleEnd-.001);if(key==='sampleEnd')value=Math.max(value,selected.sampleStart+.001);selected[key]=value;});
for(const [key,label,min,max,increment,decimals] of [['velocity','VELOCITY',.01,1,.01,2],['probability','CHANCE',0,1,.01,2],['ratchets','REPEATS',1,4,1,0]])createControl($('step-controls'),`step-${key}`,label,min,max,increment,decimals,()=>selectedStep()[key],value=>selectedStep()[key]=value);
bind('play',togglePlayback);bind('stop',()=>{if(initialized)audio.stop();playing=false;position={...position,step:-1,playing:false};renderTransport();renderGrid();$('position').textContent='STOPPED';});
bind('audition',async()=>{await ensureAudio();audio.audition(voice,1);});
$('length').addEventListener('change',()=>{currentPattern().length=Math.max(1,Math.min(64,Math.round(Number($('length').value)||16)));sync();renderGrid();});
$('model').addEventListener('change',()=>{state.voices[voice].model=Number($('model').value);sync();renderVoice();renderGrid();if(state.voices[voice].model===2&&!samples[voice])status('Sample mode selected. Load a sample to hear this voice.');});
for(const key of ['mute','solo','reverse'])bind(key,()=>{state.voices[voice][key]=!state.voices[voice][key];sync();renderVoice();renderGrid();});
bind('copy',()=>{clipboard=clone(currentPattern());$('paste').disabled=false;status(`Pattern ${state.selectedPattern+1} copied. Select a destination and PASTE.`);});
bind('paste',()=>{if(!clipboard)return;state.bank.patterns[state.selectedPattern]=clone(clipboard);sync();renderAll();status('Pattern pasted.');});
bind('clear',()=>{if(!confirm(`Clear all voices in pattern ${state.selectedPattern+1}?`))return;for(const row of currentPattern().steps)for(const hit of row)hit.on=false;sync();renderAll();status('Pattern cleared.');});
bind('randomize-pattern',()=>{const index=state.selectedPattern,previous=clone(currentPattern());rememberRandom(()=>{state.bank.patterns[index]=previous;state.selectedPattern=index;});state.bank.patterns[index]=randomPattern(previous.length);sync();renderAll();status(`New rhythm across all voices in pattern ${index+1}.`);});
bind('randomize-all-drums',()=>{
    if(!state.randomEnginePool.length){status('Select at least one engine to randomize all drums.');return;}
    const previous=clone(state.voices);
    rememberRandom(()=>{state.voices.forEach((params,index)=>{for(const key of ['model','tune','decay','tone','drive'])params[key]=previous[index][key];});});
    state.voices=randomAllDrums(state.voices,state.randomEnginePool);
    sync();renderAll();status('New sounds for all drums from your checked engines. Undo Random restores the previous kit sounds.');
});
for(const model of RANDOM_ENGINE_IDS)$(`engine-pool-${model}`).addEventListener('change',()=>{state.randomEnginePool=RANDOM_ENGINE_IDS.filter(id=>$(`engine-pool-${id}`).checked);sync();renderEnginePool();});
bind('randomize-sound',()=>randomizeSound(voice));
bind('undo-random',()=>{if(!randomUndo)return;randomUndo();randomUndo=null;$('undo-random').disabled=true;sync();renderAll();status('Last randomization restored.');});
bind('randomize',()=>randomizeLane(voice));
bind('chain-mode',()=>{state.chainMode=!state.chainMode;sync();$('chain-mode').setAttribute('aria-pressed',String(state.chainMode));});
bind('chain-apply',()=>{const text=$('chain').value.trim(),tokens=text.split(/[\s,]+/);if(!text||tokens.length>64||tokens.some(t=>!/^\d+$/.test(t)||Number(t)<1||Number(t)>16)){status('Enter 1–64 pattern numbers from 1 to 16, separated by commas.',true);return;}state.bank.chain=tokens.map(t=>Number(t)-1);state.bank.chainLength=tokens.length;sync();status('Song chain applied. Enable SONG CHAIN to play it.');});
bind('save',()=>{const encoded=encodePreset(state,samples);download(new Blob([typeof encoded==='string'?encoded:JSON.stringify(encoded)],{type:'application/json'}),'Afterglow-kit.afterglow-web.json');status('Portable kit downloaded, including your samples.');});
bind('load',()=>$('preset-file').click());$('preset-file').addEventListener('change',guarded(async()=>{const file=$('preset-file').files[0];if(!file)return;if(file.size>90*1024*1024)throw new Error('Preset is too large (maximum 90 MB).');const result=decodePreset(await file.text());if(initialized)audio.stop();playing=false;position={step:-1,pattern:0,playing:false,peak:0};randomUndo=null;$('undo-random').disabled=true;state=result.state;samples=result.samples;page=0;step=0;if(initialized)audio.setSamples(samples);sync();renderAll();renderTransport();status(`Loaded ${file.name}.`);$('preset-file').value='';}));
bind('sample-load',()=>$('sample-file').click());$('sample-file').addEventListener('change',guarded(async()=>{await importSample($('sample-file').files[0]);$('sample-file').value='';}));
bind('sample-clear',()=>{samples[voice]=null;if(initialized)audio.setSamples(samples);if(state.voices[voice].model===2)state.voices[voice].model=0;sync();renderVoice();renderGrid();status('Sample removed.');});
$('sample-zone').addEventListener('click',()=>$('sample-file').click());$('sample-zone').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('sample-file').click();}});
for(const event of ['dragenter','dragover'])$('sample-zone').addEventListener(event,e=>{e.preventDefault();$('sample-zone').classList.add('dragover');});$('sample-zone').addEventListener('dragleave',()=>$('sample-zone').classList.remove('dragover'));$('sample-zone').addEventListener('drop',guarded(async event=>{event.preventDefault();$('sample-zone').classList.remove('dragover');await importSample(event.dataTransfer.files[0]);}));
bind('factory',()=>{if(!confirm('Replace all 16 patterns with the factory bank? Your voice settings and samples will remain.'))return;randomUndo=null;$('undo-random').disabled=true;state.bank=clone(createInitialState().bank);sync();renderAll();status('Factory patterns restored.');});
bind('midi-export',()=>{download(audio.exportMidi(state),`Afterglow-pattern-${state.selectedPattern+1}.mid`);status('MIDI pattern downloaded.');});
bind('wav-export',async()=>{const button=$('wav-export');button.disabled=true;status('Rendering WAV with the Afterglow engine...');try{const blob=await audio.renderWav(clone(state),samples,{bars:Number($('render-bars').value)});download(blob,'Afterglow-render.wav');status('WAV render downloaded.');}finally{button.disabled=false;}});
let midiAccess;
const midiNotes=MIDI_NOTES;
bind('midi-connect',async()=>{if(!navigator.requestMIDIAccess){status('Web MIDI is unavailable in this browser. Try desktop Chrome or Edge.',true);return;}await ensureAudio();midiAccess=await navigator.requestMIDIAccess({sysex:false});const connect=()=>{let count=0;for(const input of midiAccess.inputs.values()){count++;input.onmidimessage=event=>{const [type,note,velocity]=event.data;if((type&0xf0)===0x90&&velocity>0){const index=note===56&&state.voices[10].model===1?10:midiNotes.indexOf(note);if(index>=0)audio.audition(index,velocity/127);}};}status(count?`Connected to ${count} MIDI input${count===1?'':'s'}.`:'MIDI enabled. Connect a controller.');};midiAccess.onstatechange=connect;connect();});
const voiceKeys=['a','s','d','f','g','h','j','k','l',';',"'"];
document.addEventListener('keydown',guarded(async event=>{if(event.repeat||event.metaKey||event.ctrlKey||event.altKey||event.target.closest('input,select,textarea,[contenteditable=true]'))return;if(event.code==='Space'){event.preventDefault();await togglePlayback();return;}const index=voiceKeys.indexOf(event.key.toLowerCase());if(index>=0){event.preventDefault();selectVoice(index);await ensureAudio();audio.audition(index,1);}}));
audio.onPosition=next=>{const changed=position.step!==next.step||position.pattern!==next.pattern||position.playing!==next.playing;position=next;playing=Boolean(next.playing);renderTransport();$('position').textContent=playing?`PAT ${String(next.pattern+1).padStart(2,'0')} / STEP ${String(next.step+1).padStart(2,'0')}`:(next.ppq>0?'PAUSED':'STOPPED');$('peak').value=next.peak||0;if(changed)renderGrid();};
audio.onError=message=>status(String(message),true);
window.addEventListener('beforeunload',()=>{clearTimeout(saveTimer);try{localStorage.setItem(storageKey,JSON.stringify(encodePreset(state,samples)));}catch{}});
renderAll();
