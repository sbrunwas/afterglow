// ClawStudio SAMPLER-01 — original Web Audio resampling instrument (AGPL-3.0-only)
// The four slots hold decoded audio only on this device. Download samples to preserve them.
import {encodeAudioBuffer,decodeAudioBuffer} from './project-session.js';
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(+x)?+x:a));
const DEFAULTS=()=>({pitch:0,start:0,end:1,cutoff:.94,drive:.17,wear:.08,wow:.12,level:.8,loop:true});
const escapeHTML=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[x]));
export function encodeSamplerWav(buffer){
 const frames=buffer.length,channels=Math.min(2,buffer.numberOfChannels),data=new ArrayBuffer(44+frames*4),v=new DataView(data);
 let p=0;const str=s=>{for(const c of s)v.setUint8(p++,c.charCodeAt(0))},u16=x=>{v.setUint16(p,x,true);p+=2},u32=x=>{v.setUint32(p,x,true);p+=4};
 str('RIFF');u32(data.byteLength-8);str('WAVEfmt ');u32(16);u16(1);u16(2);u32(buffer.sampleRate);u32(buffer.sampleRate*4);u16(4);u16(16);str('data');u32(frames*4);
 const left=buffer.getChannelData(0),right=buffer.getChannelData(channels>1?1:0);
 for(let i=0;i<frames;i++){v.setInt16(p,Math.round(clamp(left[i],-1,1)*32767),true);p+=2;v.setInt16(p,Math.round(clamp(right[i],-1,1)*32767),true);p+=2}
 return new Blob([data],{type:'audio/wav'});
}
export function createSamplerRack(mount,{getContext,getDestination,getSources,getTempo=()=>126,getNextBarTime=()=>null,status=()=>{}}={}){
 if(!mount||!getContext||!getDestination||!getSources)throw Error('Sampler needs a rack mount and studio audio routing');
 const $=q=>mount.querySelector(q), $$=q=>[...mount.querySelectorAll(q)];
 const slotNames=['A','B','C','D'];
 const slots=slotNames.map((id,i)=>({id,name:`LOOP ${id}`,buffer:null,reverseBuffer:null,settings:DEFAULTS(),playing:false,source:null,chain:null,osc:null,modGain:null,generation:0,color:['#d4ba83','#abc8b1','#a6b6d5','#d6abc1'][i]}));
 let selected=0,context=null,recording=null,busy=false,lastStamp=0,revToken=0;
 const selectedSlot=()=>slots[selected];
 mount.innerHTML=`<section class="smp"><header class="smp-head"><div><small>CLAWSTUDIO · TAPE ROOM / RACK 06</small><h2>SAMPLER<span>—01</span></h2><div class="smp-muted">LIVE RESAMPLING · FOUR LOOP REELS · GENERATION DEGRADATION</div></div><div class="smp-ledbox"><span class="smp-rec-led" id="smp-led"></span><b id="smp-readout">READY</b></div></header>
 <div class="smp-top"><div class="smp-capture"><div class="smp-section">01 / INPUT PATCHBAY <span>POST MIX / BUS / MASTER</span></div><div class="smp-fields"><label>RECORD FROM <select id="smp-source"></select></label><label>CAPTURE LENGTH <select id="smp-bars"><option value="1">1 BAR</option><option value="2" selected>2 BARS</option><option value="4">4 BARS</option><option value="8">8 BARS</option></select></label></div><div class="smp-action"><button class="smp-primary" id="smp-record">● CAPTURE TO SLOT</button><button id="smp-import">↧ IMPORT AUDIO</button><input type="file" id="smp-file" accept="audio/*" hidden></div><div class="smp-note" id="smp-status">Press JAM in the studio, select a source, then capture a bar-aligned loop. Playback routes into the Sampler mixer channel.</div><div class="smp-progress"><div id="smp-progress"></div></div></div>
 <div class="smp-deck"><div class="smp-section">02 / FOUR-REEL LOOP DECK <span>STACK GENERATIONS</span></div><div class="smp-slots" id="smp-slots"></div><div class="smp-actions"><button id="smp-play">▶ PLAY SLOT</button><button id="smp-stop">■ STOP SLOT</button><button id="smp-stopall">■ STOP ALL</button><button id="smp-export">⇩ EXPORT WAV</button><button id="smp-clear">CLEAR</button></div></div></div>
 <section class="smp-process"><div class="smp-section">03 / TAPE PROCESSING <span id="smp-generation">GEN 0 · CLEAN</span></div><div class="smp-wave"><canvas id="smp-waveform" width="960" height="125" aria-label="Captured audio waveform"></canvas><span id="smp-time">NO AUDIO LOADED</span></div><div class="smp-knobs" id="smp-knobs"></div><div class="smp-timeline"><label>IN POINT <input id="smp-in" type="range" min="0" max="99" value="0" step="1"><b id="smp-in-value">0%</b></label><label>OUT POINT <input id="smp-out" type="range" min="1" max="100" value="100" step="1"><b id="smp-out-value">100%</b></label><button id="smp-reverse">↶ REVERSE OFF</button><button id="smp-loop">⟲ LOOP ON</button><button id="smp-bounce" title="Record this sampler through its channel to another selected reel">↻ BOUNCE / REPRINT</button></div></section><footer class="smp-footer"><span>Captures stay in memory until you export WAV; no cloud uploads.</span><span id="smp-stats">0 LOOPS · 0 GENERATIONS</span></footer></section>`;
 const kspec=[['pitch','PITCH',-12,12,'st'],['cutoff','FILTER',0,1,'%'],['drive','SATURATION',0,1,'%'],['wear','TAPE WEAR',0,1,'%'],['wow','WOW / FLUTTER',0,1,'%'],['level','OUTPUT',0,1,'%']];
 function notify(s){$('#smp-status').textContent=s;status(`Sampler: ${s}`)}
 function ensure(){if(context)return context;context=getContext();if(!context)throw Error('Studio audio unavailable');return context}
 function sources(){const items=getSources()||[];return items.filter(s=>s&&s.id&&s.node).map(s=>({id:s.id,label:s.label||s.id,node:s.node}))}
 function populateSources(){const old=$('#smp-source').value,items=sources();$('#smp-source').innerHTML=items.map(x=>`<option value="${escapeHTML(x.id)}">${escapeHTML(x.label)}</option>`).join('');if(items.some(x=>x.id===old))$('#smp-source').value=old;else if(items.some(x=>x.id==='master'))$('#smp-source').value='master';return items}
 function setupChain(slot){if(slot.chain)return;const c=ensure(),input=c.createGain(),hp=c.createBiquadFilter(),lp=c.createBiquadFilter(),shaper=c.createWaveShaper(),level=c.createGain(),output=getDestination();hp.type='highpass';lp.type='lowpass';input.connect(hp);hp.connect(lp);lp.connect(shaper);shaper.connect(level);level.connect(output);slot.chain={input,hp,lp,shaper,level};updateAudio(slot)}
 function updateAudio(slot){if(!slot.chain||!context)return;const {hp,lp,shaper,level}=slot.chain,p=slot.settings,t=context.currentTime;
 hp.frequency.setTargetAtTime(32+p.wear*230,t,.025);
 lp.frequency.setTargetAtTime(Math.max(260,140*Math.pow(145,p.cutoff)*(1-p.wear*.78)),t,.03);
 const amount=1+p.drive*13+p.wear*6,curve=new Float32Array(1024);for(let i=0;i<1024;i++){const x=(i/1023)*2-1;curve[i]=Math.tanh(amount*x)/Math.tanh(amount)}shaper.curve=curve;
 level.gain.setTargetAtTime(p.level*(.74+.26*(1-p.wear)),t,.02);
 if(slot.source)slot.source.playbackRate.setTargetAtTime(Math.pow(2,p.pitch/12),t,.02);
 if(slot.modGain)slot.modGain.gain.setTargetAtTime(.0035*p.wow*Math.pow(2,p.pitch/12),t,.025);
 }
 function reversed(slot){if(slot.reverseBuffer)return slot.reverseBuffer;const original=slot.buffer,c=ensure(),rev=c.createBuffer(original.numberOfChannels,original.length,original.sampleRate);for(let n=0;n<original.numberOfChannels;n++){let a=original.getChannelData(n),b=rev.getChannelData(n);for(let j=0,k=a.length-1;j<b.length;j++,k--)b[j]=a[k]}slot.reverseBuffer=rev;return rev}
 function stop(slot){if(!slot.source)return;const src=slot.source;slot.source=null;slot.playing=false;try{src.stop()}catch{}try{src.disconnect()}catch{}if(slot.osc){try{slot.osc.stop()}catch{}slot.osc.disconnect();slot.osc=null}if(slot.modGain){slot.modGain.disconnect();slot.modGain=null}}
 function play(slot){if(!slot.buffer)return notify('Choose a captured or imported loop first');ensure();setupChain(slot);stop(slot);
 const c=context,p=slot.settings,buf=p.reverse?reversed(slot):slot.buffer,src=c.createBufferSource();src.buffer=buf;src.loop=p.loop;
 const duration=buf.duration,begin=p.reverse?1-p.end:p.start,finish=p.reverse?1-p.start:p.end;
 const start=clamp(begin,0,.99)*duration,end=Math.max(start+.005,clamp(finish,.001,1)*duration);
 src.loopStart=start;src.loopEnd=Math.min(duration,end);src.playbackRate.value=Math.pow(2,p.pitch/12);src.connect(slot.chain.input);
 if(p.wow>.005){const osc=c.createOscillator(),depth=c.createGain();osc.frequency.value=5.3;depth.gain.value=.0035*p.wow*src.playbackRate.value;osc.connect(depth);depth.connect(src.playbackRate);osc.start();slot.osc=osc;slot.modGain=depth}
 slot.source=src;slot.playing=true;src.onended=()=>{if(slot.source===src){slot.source=null;slot.playing=false;renderSlots()}};
 src.start(c.currentTime+.012,start,p.loop?undefined:Math.max(.01,(end-start)/src.playbackRate.value));renderSlots();
 }
 function redraw(){const c=$('#smp-waveform'),g=c.getContext('2d'),w=c.width,h=c.height;g.fillStyle='#071514';g.fillRect(0,0,w,h);
 for(let k=0;k<=8;k++){g.strokeStyle='#243a37';g.beginPath();g.moveTo(k*w/8,0);g.lineTo(k*w/8,h);g.stroke()}
 let slot=selectedSlot();if(!slot.buffer){g.fillStyle='#8aa79c';g.font='13px ui-monospace,monospace';g.fillText('CAPTURE AUDIO TO DRAW WAVEFORM',22,h/2);$('#smp-time').textContent='NO AUDIO LOADED';return}
 const array=slot.buffer.getChannelData(0),n=array.length,center=h*.5;g.strokeStyle='#8cdcc6';g.lineWidth=1.6;g.beginPath();let stride=Math.max(1,Math.ceil(n/w));for(let x=0;x<w;x++){let hi=-1,lo=1;for(let i=x*stride;i<Math.min(n,(x+1)*stride);i++){hi=Math.max(hi,array[i]);lo=Math.min(lo,array[i])}g.moveTo(x,center-lo*center*.86);g.lineTo(x,center-hi*center*.86)}g.stroke();g.fillStyle='#d0b18326';g.fillRect(0,0,w*slot.settings.start,h);g.fillRect(w*slot.settings.end,0,w*(1-slot.settings.end),h);
 $('#smp-time').textContent=`${slot.buffer.duration.toFixed(2)} SEC · ${(slot.buffer.sampleRate/1000).toFixed(1)} KHz · ${slot.buffer.numberOfChannels} CH`;
 }
 function renderSlots(){const grid=$('#smp-slots');grid.innerHTML='';slots.forEach((slot,i)=>{let btn=document.createElement('button');btn.className='smp-slot'+(i===selected?' selected':'')+(slot.playing?' playing':'');btn.style.setProperty('--slot-color',slot.color);btn.innerHTML=`<span>REEL ${slot.id}</span><b>${escapeHTML(slot.name.slice(0,24))}</b><small>${slot.buffer?slot.buffer.duration.toFixed(1)+'s · GEN '+slot.generation:'EMPTY'}</small><i>${slot.playing?'◉ PLAYING':'● ' + (i===selected?'SELECTED':'READY')}</i>`;btn.onclick=()=>{selected=i;refresh()};btn.ondblclick=()=>slot.playing?stop(slot):play(slot);grid.append(btn)});
 $('#smp-stats').textContent=`${slots.filter(x=>x.buffer).length} LOOPS · ${slots.reduce((n,x)=>n+x.generation,0)} GENERATIONS`;}
 function refresh(){const p=selectedSlot().settings;renderSlots();for(const [key,,lo,hi,unit] of kspec){let k=$(`[data-smp-knob="${key}"]`);if(!k)continue;const n=(p[key]-lo)/(hi-lo);k.style.setProperty('--angle',(-135+n*270)+'deg');k.style.setProperty('--arc',n*270+'deg');const display=k.parentElement.querySelector('.smp-value');display.textContent=key==='pitch'?`${p[key]>0?'+':''}${p[key].toFixed(1)} st`:Math.round(p[key]*100)+'%'}
 $('#smp-in').value=Math.round(p.start*100);$('#smp-out').value=Math.round(p.end*100);$('#smp-in-value').textContent=Math.round(p.start*100)+'%';$('#smp-out-value').textContent=Math.round(p.end*100)+'%';$('#smp-reverse').classList.toggle('smp-lit',!!p.reverse);$('#smp-reverse').textContent=p.reverse?'↷ REVERSE ON':'↶ REVERSE OFF';$('#smp-loop').classList.toggle('smp-lit',p.loop);$('#smp-loop').textContent=p.loop?'⟲ LOOP ON':'→ ONE SHOT';$('#smp-generation').textContent=`GEN ${selectedSlot().generation} · ${selectedSlot().generation?'REPRINTED':'CLEAN'}`;redraw()}
 function put(buffer,{name='CAPTURE',generation=0}={}){if(!buffer||!buffer.length)throw Error('No audio captured');const slot=selectedSlot();stop(slot);slot.buffer=buffer;slot.reverseBuffer=null;slot.name=String(name).slice(0,26);slot.generation=generation;slot.settings.start=0;slot.settings.end=1;refresh();}
 function finishCapture(){const r=recording;if(!r)return;recording=null;busy=false;try{r.tap.disconnect(r.node)}catch{}try{r.node.disconnect()}catch{}try{r.silent.disconnect()}catch{}r.node.onaudioprocess=null;
 $('#smp-record').textContent='● CAPTURE TO SLOT';$('#smp-led').classList.remove('live');$('#smp-progress').style.width='0%';if(!r.frames){notify('No audio captured');return}
 const c=ensure(),buff=c.createBuffer(2,r.frames,c.sampleRate);let a=buff.getChannelData(0),b=buff.getChannelData(1),off=0;for(const chunk of r.chunks){a.set(chunk[0],off);b.set(chunk[1],off);off+=chunk[0].length}
 const wasSampler=r.source==='sampler'||(r.source==='master'&&slots.some(x=>x.playing));put(buff,{name:r.label,generation:wasSampler?Math.max(...slots.map(x=>x.generation))+1:0});notify(`Captured ${(buff.length/c.sampleRate).toFixed(2)}s into Reel ${selectedSlot().id}. Press PLAY or BOUNCE to reprocess.`);}
 function cancelCapture(){if(!recording)return;recording.frames=0;finishCapture()}
 async function capture(sourceId=null,forcedBars=null){if(recording){finishCapture();return}if(busy)return;const c=ensure();await c.resume();const items=populateSources(),id=sourceId||$('#smp-source').value,src=items.find(x=>x.id===id);if(!src){notify('Choose a live instrument, deck, or master source');return}
 if(src.id==='sampler'&&!slots.some(x=>x.playing)){notify('Play a sampler reel first to reprint it');return}
 const bars=clamp(forcedBars??$('#smp-bars').value,1,8),duration=bars*4*60/clamp(getTempo(),50,240),frames=Math.min(Math.round(duration*c.sampleRate),c.sampleRate*60);const proc=c.createScriptProcessor(2048,2,2),silent=c.createGain();silent.gain.value=0;
 const target=Number(getNextBarTime())||c.currentTime,r={tap:src.node,node:proc,silent,source:id,label:src.label,remaining:frames,frames:0,total:frames,chunks:[],startTime:Math.max(c.currentTime,target),generation:selectedSlot().generation};recording=r;busy=true;
 src.node.connect(proc);proc.connect(silent);silent.connect(c.destination);$('#smp-record').textContent='■ FINISH CAPTURE';$('#smp-led').classList.add('live');$('#smp-readout').textContent='ARMED · '+src.label;notify(`Armed ${src.label} for ${bars} bar${bars>1?'s':''} · starts ${target>c.currentTime+.03?'next bar':'now'}`);
 proc.onaudioprocess=e=>{if(recording!==r)return;const input=e.inputBuffer,n=input.length,t=e.playbackTime||c.currentTime,skip=Math.max(0,Math.min(n,Math.ceil((r.startTime-t)*c.sampleRate)));if(skip>=n)return;const count=Math.min(n-skip,r.remaining),left=input.getChannelData(0).slice(skip,skip+count),right=input.getChannelData(input.numberOfChannels>1?1:0).slice(skip,skip+count);
 r.chunks.push([left,right]);r.frames+=count;r.remaining-=count;$('#smp-progress').style.width=(100*r.frames/r.total)+'%';if(r.remaining<=0)finishCapture();};
 }
 async function importAudio(f){if(!f)return;try{if(f.size>45e6)throw Error('Maximum audio file size is 45 MB');const c=ensure();const buff=await c.decodeAudioData(await f.arrayBuffer());if(buff.duration>60)throw Error('Audio file must be 60 seconds or less');put(buff,{name:f.name.replace(/\.[^.]+$/,'').slice(0,24),generation:0});notify(`Imported ${f.name}`)}catch(e){notify('Import failed: '+e.message)}}
 function download(){const slot=selectedSlot();if(!slot.buffer)return notify('No audio to export');const url=URL.createObjectURL(encodeSamplerWav(slot.buffer)),a=document.createElement('a');a.href=url;a.download=`ClawStudio_${slot.name.replace(/[^a-z0-9_-]+/gi,'_')}_G${slot.generation}.wav`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1800);notify('Downloaded WAV · keep this file to preserve the loop')}
 for(const [key,label,lo,hi,unit] of kspec){const wrapper=document.createElement('div');wrapper.className='smp-knob-wrap';wrapper.innerHTML=`<span>${label}</span><div class="smp-knob" role="slider" tabindex="0" aria-label="${label}" data-smp-knob="${key}"></div><small class="smp-value"></small>`;
 const control=wrapper.querySelector('.smp-knob');control.addEventListener('pointerdown',e=>{e.preventDefault();control.setPointerCapture(e.pointerId);const y=e.clientY,origin=selectedSlot().settings[key];const move=ev=>{const val=clamp(origin+(y-ev.clientY)*(hi-lo)/160,lo,hi);selectedSlot().settings[key]=key==='pitch'?Math.round(val*2)/2:val;updateAudio(selectedSlot());refresh()};const end=()=>{control.removeEventListener('pointermove',move);control.removeEventListener('pointerup',end);control.removeEventListener('pointercancel',end)};control.addEventListener('pointermove',move);control.addEventListener('pointerup',end);control.addEventListener('pointercancel',end)});
 control.addEventListener('keydown',e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();const inc=e.key==='ArrowUp'||e.key==='ArrowRight'?1:-1,p=selectedSlot().settings;p[key]=clamp(p[key]+inc*(key==='pitch'?.5:.02),lo,hi);updateAudio(selectedSlot());refresh()}});
 $('#smp-knobs').append(wrapper)}
 $('#smp-record').onclick=()=>{capture().catch(e=>{notify('Capture failed: '+e.message);cancelCapture()})};
 $('#smp-play').onclick=()=>play(selectedSlot());$('#smp-stop').onclick=()=>{stop(selectedSlot());refresh()};$('#smp-stopall').onclick=()=>{slots.forEach(stop);refresh()};$('#smp-import').onclick=()=>$('#smp-file').click();$('#smp-file').onchange=e=>{importAudio(e.target.files[0]);e.target.value=''};
 $('#smp-export').onclick=download;$('#smp-clear').onclick=()=>{const s=selectedSlot();stop(s);s.buffer=null;s.reverseBuffer=null;s.generation=0;s.name='LOOP '+s.id;s.settings=DEFAULTS();refresh();notify('Reel cleared')};
 $('#smp-in').oninput=e=>{const p=selectedSlot().settings;p.start=Math.min(+e.target.value/100,p.end-.01);refresh()};$('#smp-out').oninput=e=>{const p=selectedSlot().settings;p.end=Math.max(+e.target.value/100,p.start+.01);refresh()};
 $('#smp-reverse').onclick=()=>{const s=selectedSlot();s.settings.reverse=!s.settings.reverse;if(s.playing)play(s);refresh()};
 $('#smp-loop').onclick=()=>{const s=selectedSlot();s.settings.loop=!s.settings.loop;if(s.playing)play(s);refresh()};
 $('#smp-bounce').onclick=()=>{const playingSlots=slots.filter(x=>x.playing);if(!playingSlots.length){play(selectedSlot());if(!selectedSlot().playing)return}const target=slots.find(x=>!x.buffer)||slots.find(x=>!x.playing&&x!==selectedSlot());if(!target){notify('Stop or clear another reel to receive the bounce');return}selected=slots.indexOf(target);refresh();capture('sampler',Number($('#smp-bars').value)).catch(e=>notify(e.message))};
 $('#smp-waveform').addEventListener('pointerdown',e=>{const slot=selectedSlot();if(!slot.buffer)return;const r=e.currentTarget.getBoundingClientRect();slot.settings.start=Math.min(.99,clamp((e.clientX-r.left)/r.width));slot.settings.end=Math.max(slot.settings.start+.01,slot.settings.end);refresh()});
 function exportProject(){
  if(recording)throw Error('Finish current recording before backing up');
  return {selected,slots:slots.map(s=>({name:s.name,generation:s.generation,settings:{...s.settings},playing:s.playing,pcm:encodeAudioBuffer(s.buffer)}))};
 }
 function restoreProject(data){
  if(!data||!Array.isArray(data.slots)||data.slots.length!==4)throw Error('Invalid four-reel project');
  if(recording)throw Error('Finish current recording before restoring');
  // Decode all packets *before* touching active reels, avoiding partial restores
  // on corrupt or overlarge audio files.
  const c=ensure(),decoded=data.slots.map((entry,i)=>{
   if(!entry||typeof entry!=='object')throw Error('Invalid reel '+(i+1));
   return {name:String(entry.name||'LOOP '+slots[i].id).slice(0,26),
    buffer:entry.pcm?decodeAudioBuffer(c,entry.pcm):null,
    generation:Math.max(0,Math.min(999,Math.floor(+entry.generation||0))),
    settings:{...DEFAULTS(),...Object.fromEntries(Object.entries(entry.settings||{}).filter(([k])=>Object.hasOwn(DEFAULTS(),k)))}};
  });
  slots.forEach((slot,i)=>{stop(slot);const d=decoded[i];slot.name=d.name;slot.buffer=d.buffer;slot.reverseBuffer=null;slot.generation=d.generation;slot.settings=d.settings;updateAudio(slot)});
  selected=Math.max(0,Math.min(3,Math.floor(Number(data.selected)||0)));
  refresh();notify('Four reels restored from project · playback remains stopped until you press PLAY');
 }
 return {exportProject,restoreProject,slots,getSelected:()=>selectedSlot(),select:n=>{selected=clamp(Math.floor(n),0,3);refresh()},capture,play:()=>play(selectedSlot()),stop:()=>{slots.forEach(stop);refresh()},init:()=>{ensure();populateSources();refresh()},refreshSources:populateSources,dispose:()=>{cancelCapture();slots.forEach(s=>{stop(s);if(s.chain)Object.values(s.chain).forEach(n=>n.disconnect?.());s.chain=null})}};
}