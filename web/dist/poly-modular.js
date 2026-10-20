export const clawPatchbay=(()=>{
  const SOURCE_IDS=['LFO A','LFO B','ENV','VELOCITY','S&H','VOICE OSC','VOICE ENV'];
  const SOURCE_BY_TYPE={mono:SOURCE_IDS.slice(0,5),poly:SOURCE_IDS};
  const DEST_IDS={mono:['LP FREQ','HP FREQ','PITCH','RESONANCE','FM INDEX','LEVEL'],poly:['LP FREQ','PITCH','OSC2 PITCH','RESONANCE','LEVEL']};
  const COLOR={'LFO A':'#5cd7ea','LFO B':'#b59df5','ENV':'#ffc969','VELOCITY':'#ff7c9a','S&H':'#f99e52','VOICE OSC':'#88e9ac','VOICE ENV':'#ff94cd'};
  const RATE_DEFAULTS={a:1.4,b:.29,hold:3.5};
  function routesSafe(list,type){
    if(!Array.isArray(list))return [];
    const seen=new Set(),out=[];
    for(const x of list){
      if(!x||typeof x!=='object'||!SOURCE_BY_TYPE[type]?.includes(x.source)||!DEST_IDS[type]?.includes(x.dest))continue;
      const key=x.source+'→'+x.dest;
      if(seen.has(key)||typeof x.depth!=='number'||!Number.isFinite(x.depth))continue;
      seen.add(key);out.push({source:x.source,dest:x.dest,depth:Math.max(-1,Math.min(1,x.depth))});
      if(out.length>=8)break;
    }
    return out;
  }
  function ratesSafe(r){return {a:Number.isFinite(r?.a)?Math.min(18,Math.max(.03,r.a)):RATE_DEFAULTS.a,b:Number.isFinite(r?.b)?Math.min(18,Math.max(.03,r.b)):RATE_DEFAULTS.b,hold:Number.isFinite(r?.hold)?Math.min(16,Math.max(.25,r.hold)):RATE_DEFAULTS.hold};}
  function makeAudio(ctx,type,targets,{routes=[],rates}={},options={}){
    if(!DEST_IDS[type])throw Error('Unsupported patchbay instrument');
    const at=Number.isFinite(options.startAt)?Math.max(ctx.currentTime,options.startAt):ctx.currentTime;
    const ratesNow=ratesSafe(rates),sources={},edges=[];
    const starts=[];
    for(const [key,wave,rate] of [['LFO A','sine',ratesNow.a],['LFO B','triangle',ratesNow.b]]){
      const o=ctx.createOscillator();o.type=wave;o.frequency.setValueAtTime(rate,at);o.start(at);sources[key]=o;starts.push(o);
    }
    for(const key of ['ENV','VELOCITY']){
      const c=ctx.createConstantSource();c.offset.value=0;c.start(at);sources[key]=c;starts.push(c);
    }
    // AudioParam automation implements held random voltage; no JS event per audio sample.
    const rand=ctx.createConstantSource();rand.offset.value=0;rand.start(at);sources['S&H']=rand;starts.push(rand);
    sources['VOICE OSC']=type==='poly'?(options.previousVoice?.oscillator||null):null;
    sources['VOICE ENV']=type==='poly'?(options.previousVoice?.envelope||null):null;
    let seed=((Number(options.seed)||0)^0x6d2b79f5)>>>0, noiseAt=at, noiseRate=ratesNow.hold;
    function nextVoltage(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)/4294967295)*2-1;}
    function scheduleNoise(until){if(noiseAt<ctx.currentTime)noiseAt=ctx.currentTime;const max=Number.isFinite(options.stopAt)?Math.min(until,options.stopAt):Math.min(until,ctx.currentTime+3);
      let count=0;while(noiseAt<=max && count++<1024){rand.offset.setValueAtTime(nextVoltage(),noiseAt);noiseAt+=1/noiseRate;}}
    let currentRoutes=[];
    function setRoutes(next){
      const clean=routesSafe(next,type);
      for(const e of edges.splice(0)){try{e.source.disconnect(e.gain)}catch{}try{e.gain.disconnect()}catch{}}
      for(const r of clean){
        const params=targets[r.dest];if(!params||!sources[r.source])continue;
        const destArray=Array.isArray(params)?params:[params];
        // Destination scaling is bounded; target parameters are intentionally additive.
        const scale=({'LP FREQ':1600,'HP FREQ':700,'PITCH':500,'OSC2 PITCH':950,'RESONANCE':11,'FM INDEX':260,'LEVEL':.20})[r.dest];
        const gain=ctx.createGain();gain.gain.value=r.depth*scale;
        sources[r.source].connect(gain);
        try{for(const p of destArray)gain.connect(p);edges.push({gain,source:sources[r.source]})}
        catch(err){sources[r.source].disconnect(gain);gain.disconnect();throw err}
      }
      currentRoutes=clean;
      if(clean.some(r=>r.source==='S&H'))scheduleNoise(Number.isFinite(options.stopAt)?options.stopAt:ctx.currentTime+3);
    }
    function setRates(next){const v=ratesSafe(next),now=Math.max(at,ctx.currentTime);
      sources['LFO A'].frequency.setTargetAtTime(v.a,now,.02);sources['LFO B'].frequency.setTargetAtTime(v.b,now,.02);
      if(v.hold!==noiseRate){noiseRate=v.hold;rand.offset.cancelScheduledValues(now);noiseAt=now; if(currentRoutes.some(r=>r.source==='S&H'))scheduleNoise(Number.isFinite(options.stopAt)?options.stopAt:now+3);}
    }
    function noteOn(time,duration,{attack=.02,decay=.2,sustain=.6,release=.2,velocity=1}={}){
      const t=Math.max(at,time,ctx.currentTime+.001),gate=Math.max(.01,duration),a=Math.max(.002,attack),d=Math.max(.01,decay),s=Math.max(0,Math.min(1,sustain)),rel=Math.max(.01,release);
      const env=sources.ENV.offset,vel=sources.VELOCITY.offset;
      env.cancelScheduledValues(t);env.setValueAtTime(0,t);env.linearRampToValueAtTime(1,t+a);
      env.setTargetAtTime(s,t+a,d/3);
      // Continuity at release: exponential ADSR decay approaches sustain.
      const atRelease=t+Math.max(a,gate),before=s+(1-s)*Math.exp(-(Math.max(0,gate-a))/(d/3));
      env.setValueAtTime(before,atRelease);env.setTargetAtTime(0,atRelease,rel/3);
      vel.setValueAtTime(Math.max(0,Math.min(1,velocity)),t);
      if(currentRoutes.some(r=>r.source==='S&H'))scheduleNoise(t+gate+rel+.4);
    }
    function noteOff(time=ctx.currentTime){const env=sources.ENV.offset,now=Math.max(at,time,ctx.currentTime);env.cancelScheduledValues(now);env.setTargetAtTime(0,now,.055)}
    const tick=type==='mono'&&typeof setInterval==='function'?setInterval(()=>{if(currentRoutes.some(r=>r.source==='S&H'))scheduleNoise(ctx.currentTime+3)},250):null;
    function dispose(){if(tick!==null&&typeof clearInterval==='function')clearInterval(tick);for(const e of edges.splice(0)){try{e.source.disconnect(e.gain)}catch{}try{e.gain.disconnect()}catch{}}for(const node of starts){try{node.stop()}catch{}try{node.disconnect()}catch{}}}
    setRoutes(routes);
    if(Number.isFinite(options.stopAt))for(const node of starts)node.stop(Math.max(at+.01,options.stopAt));
    return {setRoutes,setRates,noteOn,noteOff,dispose,getSource:key=>sources[key]||null,get routes(){return currentRoutes.slice()}};
  }
  const IDEAS={
    mono:{'WOBBLE':[{source:'LFO A',dest:'LP FREQ',depth:.7},{source:'ENV',dest:'RESONANCE',depth:.36}],
      'WEIRD FM':[{source:'LFO B',dest:'FM INDEX',depth:.75},{source:'VELOCITY',dest:'LP FREQ',depth:.46}],
      'BROKEN TAPE':[{source:'LFO A',dest:'PITCH',depth:.11},{source:'LFO B',dest:'LP FREQ',depth:-.43},{source:'ENV',dest:'HP FREQ',depth:.57}],
      'RANDOM ACID':[{source:'S&H',dest:'LP FREQ',depth:.62},{source:'ENV',dest:'RESONANCE',depth:.28}]},
    poly:{'BREATHING PAD':[{source:'LFO A',dest:'LP FREQ',depth:.62},{source:'ENV',dest:'LEVEL',depth:.18}],
      'DRIFT':[{source:'LFO A',dest:'PITCH',depth:.08},{source:'LFO B',dest:'OSC2 PITCH',depth:-.25}],
      'RAVE ACCIDENT':[{source:'LFO A',dest:'RESONANCE',depth:.55},{source:'ENV',dest:'OSC2 PITCH',depth:.62},{source:'LFO B',dest:'LP FREQ',depth:.69}],
      'CROSS-FM':[{source:'VOICE OSC',dest:'OSC2 PITCH',depth:.68},{source:'VOICE ENV',dest:'LP FREQ',depth:.48}],
      'GENERATIVE':[{source:'S&H',dest:'LP FREQ',depth:.55},{source:'VOICE OSC',dest:'PITCH',depth:.18},{source:'LFO B',dest:'RESONANCE',depth:.22}]}
  };
  function panel(mount,type,config){
    const root=document.createElement('section');root.className='claw-patch';root.setAttribute('aria-label',`${type} semi-modular patchbay`);
    root.innerHTML=`<div class="claw-patch-head"><div><b>PATCH FIELD / ${type.toUpperCase()}</b><small>DRAG A CABLE OR TAP TWO JACKS · UP TO 8</small></div><div class="claw-patch-actions"><button type="button" data-action="idea">⚄ HAPPY ACCIDENT</button><button type="button" data-action="clear">CLEAR</button></div></div>
      <div class="claw-patch-workspace"><div class="claw-patch-jacks" data-kind="source">${SOURCE_BY_TYPE[type].map(s=>`<button type="button" class="claw-jack" data-source="${s}" aria-label="Connect from ${s}"><i style="--jack:${COLOR[s]}"></i>${s}</button>`).join('')}</div><svg class="claw-patch-cables" aria-hidden="true" preserveAspectRatio="none"></svg><div class="claw-patch-jacks" data-kind="dest">${DEST_IDS[type].map(d=>`<button type="button" class="claw-jack" data-dest="${d}" aria-label="Connect to ${d}">${d}<i style="--jack:#94e7bd"></i></button>`).join('')}</div></div>
      <div class="claw-patch-foot"><span class="claw-patch-tip" role="status">Drag from a source to a destination (or tap two jacks). S&H is clocked stepped-random voltage; VOICE signals come from a previous Poly voice.</span><div class="claw-patch-rates"><label>LFO A RATE <input aria-label="LFO A rate in hertz" data-rate="a" type="range" min=".03" max="12" step=".01"></label><label>LFO B RATE <input aria-label="LFO B rate in hertz" data-rate="b" type="range" min=".03" max="12" step=".01"></label><label>S&H CLOCK <input aria-label="Sample and hold rate in hertz" data-rate="hold" type="range" min=".25" max="16" step=".25"></label></div></div><div class="claw-patch-list" aria-label="Cable depth controls"></div>`;
    mount.insertAdjacentElement('afterend',root);
    let selected=null;const svg=root.querySelector('svg'),tip=root.querySelector('.claw-patch-tip'),list=root.querySelector('.claw-patch-list');
    const routes=()=>routesSafe(config.getRoutes(),type);
    function update(next){config.setRoutes(routesSafe(next,type));render()}
    function redraw(){if(!root.isConnected)return;const bounds=root.querySelector('.claw-patch-workspace').getBoundingClientRect();const w=Math.max(1,bounds.width),h=Math.max(1,bounds.height);svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.innerHTML='';for(const r of routes()){
      const src=[...root.querySelectorAll('[data-source]')].find(el=>el.dataset.source===r.source),dst=[...root.querySelectorAll('[data-dest]')].find(el=>el.dataset.dest===r.dest);if(!src||!dst)continue;
      const a=src.querySelector('i').getBoundingClientRect(),b=dst.querySelector('i').getBoundingClientRect();const x1=a.left+a.width/2-bounds.left,y1=a.top+a.height/2-bounds.top,x2=b.left+b.width/2-bounds.left,y2=b.top+b.height/2-bounds.top;
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M ${x1} ${y1} C ${x1+Math.max(20,(x2-x1)*.55)} ${y1}, ${x2-Math.max(20,(x2-x1)*.55)} ${y2}, ${x2} ${y2}`);path.setAttribute('fill','none');path.setAttribute('stroke',COLOR[r.source]);path.setAttribute('stroke-width',String(1.5+Math.abs(r.depth)*2.5));path.setAttribute('stroke-opacity','.85');svg.append(path);
    }}
    function render(){const rs=routes();root.querySelectorAll('[data-source]').forEach(btn=>btn.classList.toggle('armed',btn.dataset.source===selected));
      list.replaceChildren();for(const r of rs){const line=document.createElement('div');line.className='claw-patch-line';
        const info=document.createElement('span');info.textContent=`${r.source} → ${r.dest}`;info.style.color=COLOR[r.source];
        const input=document.createElement('input');input.type='range';input.min='-1';input.max='1';input.step='.01';input.value=String(r.depth);input.setAttribute('aria-label',`Depth ${r.source} to ${r.dest}`);
        const pct=document.createElement('small');pct.textContent=`${Math.round(r.depth*100)}%`;input.addEventListener('input',()=>{pct.textContent=Math.round(Number(input.value)*100)+'%';config.setRoutes(rs.map(x=>x.source===r.source&&x.dest===r.dest?{...x,depth:Number(input.value)}:x))});
        const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Disconnect ${r.source} from ${r.dest}`);remove.onclick=()=>update(routes().filter(x=>!(x.source===r.source&&x.dest===r.dest)));
        line.append(info,input,pct,remove);list.append(line);
      }
      if(!rs.length)list.textContent='No cables yet — your original synth sound is unchanged.';
      root.querySelectorAll('[data-rate]').forEach(el=>el.value=String(ratesSafe(config.getRates())[el.dataset.rate]));
      requestAnimationFrame(redraw);
    }
    const workspace=root.querySelector('.claw-patch-workspace');let drag=null,suppressSourceClick=false;
    function point(el){const r=el.getBoundingClientRect(),w=workspace.getBoundingClientRect();return [r.left+r.width/2-w.left,r.top+r.height/2-w.top]}
    function ghost(x,y){if(!drag)return;const [a,b]=point(drag.el.querySelector('i'));const w=workspace.getBoundingClientRect();svg.querySelector('[data-ghost]')?.remove();
      const path=document.createElementNS('http://www.w3.org/2000/svg','path'),dx=Math.max(25,(x-w.left-a)*.55);
      path.dataset.ghost='true';path.setAttribute('d',`M ${a} ${b} C ${a+dx} ${b}, ${x-w.left-dx} ${y-w.top}, ${x-w.left} ${y-w.top}`);
      path.setAttribute('stroke',COLOR[drag.source]);path.setAttribute('stroke-dasharray','7 4');path.setAttribute('stroke-width','3');path.setAttribute('fill','none');svg.append(path);
    }
    function attach(source,d){const rs=routes(),existing=rs.find(r=>r.source===source&&r.dest===d);
      if(existing){tip.textContent='Already connected — change depth below.';return false}
      if(rs.length>=8){tip.textContent='Eight cables maximum; unplug one first.';return false}
      update([...rs,{source,dest:d,depth:.45}]);tip.textContent=`Connected ${source} → ${d}.`;return true;
    }
    root.addEventListener('pointerdown',ev=>{const src=ev.target.closest('[data-source]');if(!src||ev.button!==0)return;
      drag={el:src,id:ev.pointerId,source:src.dataset.source,startX:ev.clientX,startY:ev.clientY,moved:false};
      try{src.setPointerCapture(ev.pointerId)}catch{}
    });
    root.addEventListener('pointermove',ev=>{if(!drag||ev.pointerId!==drag.id)return;
      if(Math.hypot(ev.clientX-drag.startX,ev.clientY-drag.startY)>8)drag.moved=true;
      if(drag.moved){ev.preventDefault();ghost(ev.clientX,ev.clientY)}
    });
    root.addEventListener('pointerup',ev=>{if(!drag||ev.pointerId!==drag.id)return;
      const wasDrag=drag.moved,src=drag.source;drag=null;svg.querySelector('[data-ghost]')?.remove();
      if(!wasDrag)return;
      suppressSourceClick=true;setTimeout(()=>{suppressSourceClick=false},40);
      const dest=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('[data-dest]');
      if(dest&&root.contains(dest)){selected=null;attach(src,dest.dataset.dest)}
      else tip.textContent='Cable released — no destination. Try again.';
      render();
    });
    root.addEventListener('pointercancel',()=>{drag=null;svg.querySelector('[data-ghost]')?.remove()});
    root.addEventListener('click',event=>{if(suppressSourceClick){suppressSourceClick=false;return}const source=event.target.closest('[data-source]'),dest=event.target.closest('[data-dest]');
      if(source){selected=source.dataset.source;tip.textContent=`${selected} selected — now pick any destination.`;render();return}
      if(dest){if(!selected){tip.textContent='Pick a source jack first.';return}const d=dest.dataset.dest,r=routes(),existing=r.find(x=>x.source===selected&&x.dest===d);if(!existing&&r.length>=8){tip.textContent='Eight cables maximum; remove one first.';return}if(!existing)attach(selected,d);selected=null;render();return}
      const action=event.target.closest('[data-action]')?.dataset.action;if(action==='clear'){selected=null;update([]);tip.textContent='All cables unplugged.'}
      if(action==='idea'){const names=Object.keys(IDEAS[type]),name=names[Math.floor(Math.random()*names.length)];selected=null;update(IDEAS[type][name]);tip.textContent=`${name} · reroute or invert any cable to experiment.`}
    });
    root.querySelectorAll('[data-rate]').forEach(el=>el.addEventListener('input',()=>config.setRates({...config.getRates(),[el.dataset.rate]:Number(el.value)})));
    let observer=null;if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(redraw);observer.observe(root)}
    render();return {refresh:render,destroy(){observer?.disconnect();root.remove()}};
  }
  return {SOURCE_IDS,SOURCE_BY_TYPE,DEST_IDS,routesSafe,ratesSafe,makeAudio,panel};
})()