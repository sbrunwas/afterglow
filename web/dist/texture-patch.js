// SPDX-License-Identifier: AGPL-3.0-only
// Original Buchla-inspired, not a port of vintage hardware firmware.
export const BUCHLA_SOURCES=['MOD OSC','CYCLE','RANDOM','ENVELOPE','MOTION','S&H'];
export const BUCHLA_TARGETS=['TIMBRE','FOLD','LPG','FILTER','FM','PAN'];
export const BUCHLA_DEFAULT_ROUTES=()=>[{source:'CYCLE',target:'FOLD',amount:.44},{source:'S&H',target:'TIMBRE',amount:.25},{source:'ENVELOPE',target:'LPG',amount:.35}];
export const buchlaParamDefaults={buchlaFold:.08,buchlaLpg:.25,buchlaDecay:.5,buchlaRate:.4,buchlaIndex:.3};
const clamp=(x,a=-1,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const frac=x=>x-Math.floor(x),hash=x=>frac(Math.sin(x*127.1+78.233)*43758.5453)*2-1;
export function patchModulation(routes=[],p={},voice={},time=0){
 const age=Math.max(0,time-(voice.start||0)),seed=voice.seed||0,rate=.08*Math.pow(170,clamp(p.buchlaRate??.4,0,1)),phase=time*rate+seed,lerp=frac(phase);
 const values={'MOD OSC':Math.sin(2*Math.PI*phase),'CYCLE':1-4*Math.abs(frac(phase*.27)-.5),'RANDOM':hash(Math.floor(phase))*(1-lerp)+hash(Math.floor(phase)+1)*lerp,'ENVELOPE':Math.exp(-age/(.08+2.8*(p.buchlaDecay??.5))),'MOTION':Math.sin(2*Math.PI*phase*.31),'S&H':hash(Math.floor(phase*.72+seed*7))};
 const out=Object.fromEntries(BUCHLA_TARGETS.map(k=>[k,0]));
 for(const r of routes){if(!r||!BUCHLA_SOURCES.includes(r.source)||!BUCHLA_TARGETS.includes(r.target))continue;out[r.target]=clamp(out[r.target]+values[r.source]*clamp(r.amount))}
 return out;
}
export function attachBuchlaPanel(mount,routes,params){
 const board=document.createElement('section');board.className='buc-bay';
 const button=(type,x)=>'<button class="buc-jack" type="button" data-'+type+'="'+x+'"><span class="buc-socket"></span>'+x+'</button>';
 board.innerHTML='<header><div><strong>COMPLEX OSCILLATOR / SEMI-MODULAR BAY</strong><small>259 TIMBRE · 281 CYCLE · 266 UNCERTAINTY · 292 LOW-PASS GATE</small></div><button id="buc-randomize">⚄ REROUTE</button></header>'+
 '<div class="buc-knobs" id="buc-knobs"></div><p class="buc-help">Tap a SOURCE jack then a DESTINATION jack. Edit cable depth below; × unplugs. Six cables maximum.</p>'+
 '<div class="buc-board" id="buc-board"><div class="buc-jacks buc-sources">'+BUCHLA_SOURCES.map(x=>button('source',x)).join('')+'</div><svg id="buc-cables" aria-hidden="true"></svg><div class="buc-jacks buc-targets">'+BUCHLA_TARGETS.map(x=>button('target',x)).join('')+'</div></div><div id="buc-route-list" class="buc-routes"></div><div class="buc-status" aria-live="polite">Patch timbre, fold, filter, FM, and low-pass gate.</div>';
 mount.querySelector('.cri-sequencer').before(board);const $=s=>board.querySelector(s),all=s=>[...board.querySelectorAll(s)];
 const knobs=[['buchlaFold','FOLD'],['buchlaLpg','LPG'],['buchlaDecay','DECAY'],['buchlaRate','CYCLE RATE'],['buchlaIndex','MOD INDEX']];
 $('#buc-knobs').innerHTML=knobs.map(([k,n])=>'<label>'+n+'<input type="range" min="0" max="1" step=".01" data-buc-param="'+k+'"></label>').join('');
 all('[data-buc-param]').forEach(el=>{el.value=params[el.dataset.bucParam]??.5;el.oninput=()=>params[el.dataset.bucParam]=+el.value});
 let picked=null;const palette=['#f8d887','#8bd9d6','#dfa1e5','#f0a884','#8de5b2','#abc1f0'];
 function redraw(){
  const host=$('#buc-board'),svg=$('#buc-cables'),r=host.getBoundingClientRect();if(!r.width||!r.height)return;
  svg.setAttribute('viewBox','0 0 '+r.width+' '+r.height);svg.setAttribute('width',r.width);svg.setAttribute('height',r.height);svg.replaceChildren();
  for(let i=0;i<routes.length;i++){const v=routes[i],a=all('[data-source]').find(e=>e.dataset.source===v.source),b=all('[data-target]').find(e=>e.dataset.target===v.target);if(!a||!b)continue;
   const ra=a.querySelector('.buc-socket').getBoundingClientRect(),rb=b.querySelector('.buc-socket').getBoundingClientRect();
   const x1=ra.left+ra.width/2-r.left,y1=ra.top+ra.height/2-r.top,x2=rb.left+rb.width/2-r.left,y2=rb.top+rb.height/2-r.top,mid=(x1+x2)/2,sag=10+i%3*17;
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M '+x1+' '+y1+' C '+mid+' '+(y1+sag)+', '+mid+' '+(y2+sag)+', '+x2+' '+y2);
   path.setAttribute('stroke',palette[i]);path.setAttribute('stroke-width',String(Math.max(2,Math.abs(v.amount)*4)));path.setAttribute('stroke-linecap','round');path.setAttribute('fill','none');svg.append(path);
  }
 }
 function refresh(){
  all('[data-buc-param]').forEach(el=>{el.value=params[el.dataset.bucParam]??.5});
  const host=$('#buc-route-list');host.replaceChildren();routes.forEach((r,i)=>{const row=document.createElement('div');row.className='buc-route';
   const label=document.createElement('span');label.textContent=(i+1)+'. '+r.source+' → '+r.target;
   const slider=document.createElement('input');slider.type='range';slider.min=-1;slider.max=1;slider.step=.01;slider.value=r.amount;slider.setAttribute('aria-label','Patch cable '+(i+1)+' depth');
   const value=document.createElement('small');value.textContent=Math.round(r.amount*100)+'%';
   slider.oninput=()=>{r.amount=+slider.value;value.textContent=Math.round(r.amount*100)+'%';redraw()};
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.title='Unplug cable';remove.onclick=()=>{routes.splice(i,1);refresh()};
   row.append(label,slider,value,remove);host.append(row)
  });requestAnimationFrame(redraw);
 }
 all('[data-source]').forEach(el=>el.onclick=()=>{picked=el.dataset.source;all('[data-source]').forEach(b=>b.classList.toggle('selected',b===el));$('.buc-status').textContent='Choose destination for '+picked});
 all('[data-target]').forEach(el=>el.onclick=()=>{if(!picked){$('.buc-status').textContent='Choose a source jack first';return}
   const target=el.dataset.target,old=routes.find(r=>r.source===picked&&r.target===target);
   if(old){old.amount=-old.amount;$('.buc-status').textContent='Inverted cable polarity'}
   else if(routes.length<6){routes.push({source:picked,target,amount:.55});$('.buc-status').textContent=picked+' → '+target}
   else $('.buc-status').textContent='Maximum six cables: unplug one first';
   picked=null;all('[data-source]').forEach(b=>b.classList.remove('selected'));refresh();
 });
 $('#buc-randomize').onclick=()=>{routes.splice(0);const a=[...BUCHLA_SOURCES],b=[...BUCHLA_TARGETS];for(let i=0;i<3;i++){routes.push({source:a.splice(Math.random()*a.length|0,1)[0],target:b.splice(Math.random()*b.length|0,1)[0],amount:Math.random()*1.6-.8})}refresh()};
 const resize=typeof ResizeObserver!=='undefined'?new ResizeObserver(redraw):null;resize?.observe(board);refresh();
 return {refresh,dispose:()=>resize?.disconnect()};
}
