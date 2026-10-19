import {newPolyArp,SCALES,ARP_DIRECTIONS,ARP_RATES} from './poly-arp.js';
const NAMES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const options=items=>items.map(x=>Array.isArray(x)?'<option value="'+x[0]+'">'+x[1]+'</option>':'<option>'+x+'</option>').join('');
export function attachPolyArp(mount,state){
 state.polyArp=Object.assign(newPolyArp(),state.polyArp||{});
 const section=document.createElement('section');section.className='polyarp';
 section.innerHTML='<div class="polyarp-heading"><strong>JP ARPEGGIATOR / HARMONIC ENGINE</strong><span>HIVE × DUNE / SCALE-LOCKED MELODY</span></div><div class="polyarp-toolbar">'+
 '<button id="poly-arp-on" type="button" aria-pressed="false">ARP OFF</button>'+
 '<label>KEY <select id="poly-arp-key">'+options(NAMES.map((x,i)=>[i,x]))+'</select></label>'+
 '<label>SCALE <select id="poly-arp-scale">'+options(Object.keys(SCALES))+'</select></label>'+
 '<label>DEGREE <select id="poly-arp-degree">'+options([1,2,3,4,5,6,7].map((x,i)=>[i,x]))+'</select></label>'+
 '<label>CHORD <select id="poly-arp-chord">'+options(['TRIAD','SEVENTH','POWER','SUS2','SUS4','OCTAVES'])+'</select></label>'+
 '<label>ORDER <select id="poly-arp-dir">'+options(ARP_DIRECTIONS)+'</select></label>'+
 '<label>OCT <select id="poly-arp-oct">'+options([1,2,3,4])+'</select></label>'+
 '<label>RATE <select id="poly-arp-rate">'+options(ARP_RATES)+'</select></label>'+
 '<label>GATE <input type="range" min=".15" max="1.5" step=".05" id="poly-arp-gate"></label>'+
 '<label>LOOP <select id="poly-arp-steps">'+options([4,8,16])+'</select></label></div>'+
 '<div class="polyarp-phrase"><span>MELODY STEPS · TAP TO TRANSPOSE · SHIFT-TAP TO REST · RIGHT-CLICK TO ACCENT</span><div id="poly-arp-grid"></div></div>'+
 '<div class="polyarp-footer"><button id="poly-arp-edit" type="button">EDIT: PITCH</button><button id="poly-arp-generate" type="button">⚄ GENERATE MELODY</button><button id="poly-arp-reset" type="button">CLEAR MOTION</button><span id="poly-arp-status">Choose a scale and turn on ARP.</span></div>';
 mount.querySelector('.cri-sequencer').before(section);
 const $=id=>section.querySelector('#'+id);
 const names={key:'poly-arp-key',scale:'poly-arp-scale',degree:'poly-arp-degree',chord:'poly-arp-chord',direction:'poly-arp-dir',octaves:'poly-arp-oct',rate:'poly-arp-rate',gate:'poly-arp-gate',steps:'poly-arp-steps'};
 const makeCells=()=>Array.from({length:16},()=>({shift:0,on:true,accent:false}));let editMode='PITCH';
 function norm(){const a=state.polyArp||(state.polyArp=newPolyArp());if(!Array.isArray(a.cells))a.cells=makeCells();while(a.cells.length<16)a.cells.push({shift:0,on:true,accent:false});return a}
 function refresh(){const a=norm();for(const [key,id] of Object.entries(names))$(id).value=a[key];let power=$('poly-arp-on');power.textContent=a.enabled?'● ARP ON':'○ ARP OFF';power.classList.toggle('polyarp-lit',a.enabled);power.setAttribute('aria-pressed',String(a.enabled));let grid=$('poly-arp-grid');grid.style.setProperty('--poly-cols',a.steps);grid.innerHTML=Array.from({length:a.steps},(_,i)=>{let c=a.cells[i];return '<button type="button" class="polyarp-step '+(c.on?'on':'rest')+' '+(c.accent?'accent':'')+'" data-arp-index="'+i+'"><small>'+String(i+1).padStart(2,'0')+'</small><b>'+(c.on?(c.shift>0?'+':'')+c.shift:'REST')+'</b><em>'+(c.accent?'▲':'')+'</em></button>'}).join('')}
 $('poly-arp-on').onclick=()=>{let a=norm();a.enabled=!a.enabled;refresh()};
 for(const [key,id] of Object.entries(names))$(id).addEventListener(key==='gate'?'input':'change',e=>{norm()[key]=['key','degree','octaves','gate','steps'].includes(key)?Number(e.target.value):e.target.value;refresh()});
 $('poly-arp-grid').onclick=e=>{const b=e.target.closest('[data-arp-index]');if(!b)return;const c=norm().cells[+b.dataset.arpIndex];if(e.shiftKey||editMode==='REST')c.on=!c.on;else if(editMode==='ACCENT')c.accent=!c.accent;else{c.on=true;let vals=[0,1,2,3,4,-2,-1];c.shift=vals[(vals.indexOf(c.shift)+1)%vals.length]}refresh()};
 $('poly-arp-grid').oncontextmenu=e=>{const b=e.target.closest('[data-arp-index]');if(!b)return;e.preventDefault();let c=norm().cells[+b.dataset.arpIndex];c.accent=!c.accent;refresh()};
 $('poly-arp-edit').onclick=()=>{const modes=['PITCH','REST','ACCENT'];editMode=modes[(modes.indexOf(editMode)+1)%modes.length];$('poly-arp-edit').textContent='EDIT: '+editMode};
 $('poly-arp-generate').onclick=()=>{let a=norm(),v=[0,0,0,1,2,-1,3,4,-2];for(let i=0;i<a.steps;i++){let c=a.cells[i];c.on=i===0||Math.random()>.12;c.shift=v[Math.random()*v.length|0];c.accent=i%4===0}refresh();$('poly-arp-status').textContent='New scale-aware melody generated'};
 $('poly-arp-reset').onclick=()=>{norm().cells=makeCells();refresh()};
 refresh();return {refresh};
}
