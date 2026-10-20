// SPDX-License-Identifier: AGPL-3.0-only
// ClawStudio original demo composition: BLUE HOUR / 122 BPM / A natural minor.
// Synths trade roles across 8 scenes rather than running at full density together.
// No user projects are modified unless the user explicitly loads this starter song.
export const STARTER_TITLE='BLUE HOUR';
export const STARTER_BPM=122;
export const STARTER_HARMONY=Object.freeze({key:9,scale:'MINOR',degree:0,autoLink:true});
export const STARTER_SCENES=Object.freeze([
 {name:'BLUE HOUR',bars:2,root:33,degree:0,polyRoot:48,voices:['drums','texture'],drum:'INTRO'},
 {name:'BASEMENT',bars:4,root:33,degree:0,polyRoot:48,voices:['drums','acid'],drum:'GROOVE'},
 {name:'CITY LIGHTS',bars:4,root:29,degree:5,polyRoot:36,voices:['drums','acid','texture'],drum:'GROOVE'},
 {name:'NEON HOOK',bars:4,root:36,degree:2,polyRoot:48,voices:['drums','acid','poly'],drum:'HOOK'},
 {name:'BREAKDOWN',bars:2,root:29,degree:5,polyRoot:36,voices:['poly','texture'],drum:'BREAK'},
 {name:'AFTER HOURS',bars:8,root:33,degree:0,polyRoot:48,voices:['drums','tb303','poly'],drum:'DROP'},
 {name:'DAWN RIDE',bars:4,root:31,degree:6,polyRoot:36,voices:['drums','acid','texture'],drum:'RELIEF'},
 {name:'FADE OUT',bars:2,root:33,degree:0,polyRoot:48,voices:['drums','texture'],drum:'OUTRO'}
]);
const isOn=(list,n)=>list.includes(n);
const HIT={
 INTRO:{kick:[0,4,8,12],hat:[2,6,10,14],clap:[],open:[],rim:[]},
 GROOVE:{kick:[0,4,8,12],hat:[2,6,10,14],clap:[4,12],open:[14],rim:[]},
 HOOK:{kick:[0,4,8,12],hat:[2,4,6,10,12,14],clap:[4,12],open:[14],rim:[]},
 BREAK:{kick:[],hat:[6,14],clap:[],open:[],rim:[15]},
 DROP:{kick:[0,4,8,12],hat:[2,4,6,10,12,14],clap:[4,12],open:[14],rim:[15]},
 RELIEF:{kick:[0,4,8,12],hat:[2,6,10,14],clap:[4,12],open:[],rim:[]},
 OUTRO:{kick:[0,8],hat:[2,10],clap:[],open:[],rim:[]}
};
const clone=x=>JSON.parse(JSON.stringify(x));
const bounded=(n,min,max)=>Math.max(min,Math.min(max,n));
function silenceDrumPattern(pattern,type,sceneIndex){
 pattern.length=16;const beats=HIT[type];
 for(let row=0;row<11;row++)for(let i=0;i<64;i++){
  const cell=pattern.steps[row][i];cell.on=false;cell.velocity=.7;cell.probability=1;cell.ratchets=1;
  if(i>=16)continue;
  if(row===0&&isOn(beats.kick,i)){cell.on=true;cell.velocity=i===0?.96:.82}
  else if(row===6&&isOn(beats.clap,i)){cell.on=true;cell.velocity=.56}
  else if(row===7&&isOn(beats.hat,i)){cell.on=true;cell.velocity=i===2?.38:.30}
  else if(row===8&&isOn(beats.open,i)){cell.on=true;cell.velocity=.24}
  else if(row===5&&isOn(beats.rim,i)){cell.on=true;cell.velocity=.24}
  else if(row===1&&type==='DROP'&&i===12){cell.on=true;cell.velocity=.27}
  else if(row===9&&type==='DROP'&&i===0){cell.on=true;cell.velocity=.15}
 }
}
const bassPositions=[0,3,6,8,11,14];
const bassMotion=[0,0,7,0,3,7];
function bassPattern(steps,scene){
 for(let i=0;i<64;i++){const s=steps[i];s.on=false;s.accent=false;s.slide=false;s.gate=.55;s.note=0}
 for(let j=0;j<bassPositions.length;j++){const idx=bassPositions[j],s=steps[idx];s.on=true;s.note=bassMotion[j]==3?(scene.degree===0?3:4):bassMotion[j];s.gate=j===3?.75:.56;s.accent=j===0||j===3;s.slide=false}
}
function acidPattern(steps,scene){
 for(let i=0;i<64;i++){const s=steps[i];s.on=false;s.accent=false;s.slide=false;s.gate=.45;s.note=0}
 const hits=[2,5,6,10,13,15],offset=[0,3,7,0,5,7];
 for(let j=0;j<hits.length;j++){const s=steps[hits[j]];s.on=true;s.note=offset[j]===3&&scene.degree!==0?4:offset[j];s.accent=j===0||j===4;s.slide=j===1||j===4;s.gate=.52}
}
function texturePattern(steps){
 for(let i=0;i<64;i++){const s=steps[i];s.on=false;s.accent=false;s.slide=false;s.gate=.65;s.note=0}
 steps[0].on=true;steps[0].gate=1;
}
function polyPattern(steps,scene){
 for(let i=0;i<64;i++){const s=steps[i];s.on=false;s.slide=false;s.accent=false;s.gate=.6;s.note=0}
 // The scale-aware JP arpeggiator is authoritative; its rest grid supplies air.
 for(const i of [0,4,8,12]){steps[i].on=true;steps[i].note=scene.degree===0?0:4}
}
export function installStarterPatterns({drum,mono,poly,texture,acid}){
 if(!drum?.bank?.patterns||!mono?.state||!poly?.state||!texture?.state||!acid?.state)throw Error('Starter song requires all rack instruments');
 for(let i=0;i<STARTER_SCENES.length;i++){
  const sc=STARTER_SCENES[i];silenceDrumPattern(drum.bank.patterns[i],sc.drum,i);
  bassPattern(mono.state.patterns[i],sc);acidPattern(acid.state.patterns[i],sc);
  texturePattern(texture.state.patterns[i]);polyPattern(poly.state.patterns[i],sc);
 }
 drum.tempo=STARTER_BPM;drum.swing=.055;drum.master=.65;drum.masterDrive=0;drum.selectedPattern=0;drum.chainMode=false;
 drum.voices.forEach((v,i)=>{v.solo=false;v.mute=false;v.level=({0:.80,1:.35,5:.30,6:.42,7:.25,8:.22,9:.20}[i]??.4);v.decay=i===7?.24:.46;v.drive=0});
 mono.state.steps=16;poly.state.steps=16;texture.state.steps=16;acid.state.steps=16;
 mono.state.pattern=0;poly.state.pattern=0;texture.state.pattern=0;acid.state.pattern=0;
 Object.assign(mono.state.params,{mode:'CLASSIC',saw:.72,pulse:.10,sub:.18,subWave:'SINE',subOct:1,noise:0,attack:.006,decay:.19,sustain:.26,release:.13,punch:.42,lp:.55,hp:.055,hpres:.08,lpres:.14,filterEnv:.28,fDecay:.15,drive:.025,volume:.65,delay:0,space:0,duck:0});
 Object.assign(poly.state.p,{wave:'SUPER SAW',detune:.47,mix:.69,cutoff:.58,res:.16,env:.35,attack:.008,decay:.26,sustain:.21,release:.21,chorus:.41,delay:.12,drive:.07,level:.42});
 Object.assign(texture.state.p,{engine:'WAVETABLE',table:'GLASS',wave:.25,second:.32,third:.07,rate:.10,depth:.30,motion:.3,attack:.45,decay:.54,sustain:.70,release:.56,space:.36,feedback:.09,level:.33,pace:'DRONE',buchlaFold:.03,buchlaLpg:.16,buchlaIndex:.12});
 Object.assign(acid.state.p,{wave:'SQUARE',cutoff:.33,res:.50,env:.55,decay:.25,accent:.55,slide:.28,drive:.10,volume:.38});
 const arp=poly.state.polyArp;
 Object.assign(arp,{enabled:true,key:9,scale:'MINOR',degree:0,chord:'TRIAD',octaves:1,direction:'UP+DOWN',rate:'1/8',gate:.57,steps:8});
 arp.cells=Array.from({length:16},(_,i)=>({shift:[0,0,1,0,0,0,-1,0][i%8],on:![1,5].includes(i%8),accent:i%8===0}));
 return STARTER_SCENES;
}
const level={drums:.76,acid:.36,poly:.40,texture:.32,tb303:.38,sample:.44,external:0};
function starterSceneSnapshot(base,scene,index){
 const copy=clone(base);copy.starterId='blue-hour-v1';
 copy.drumPattern=index;copy.bassPattern=index;copy.polyPattern=index;copy.texturePattern=index;copy.acidPattern=index;
 copy.monoRoot=scene.root;copy.acidRoot=scene.root+12;copy.textureRoot=scene.root+24;copy.polyRoot=scene.polyRoot;
 copy.polyArp={...copy.polyArp,key:9,scale:'MINOR',degree:scene.degree,enabled:true};
 copy.harmony={key:9,scale:'MINOR',degree:scene.degree,autoLink:true};
 for(const [id,v] of Object.entries(copy.channels)){
  v.mute=!scene.voices.includes(id);
  if(level[id]!==undefined)v.v.level=level[id];
  v.sc=(id==='acid'&&!v.mute);v.solo=false;
 }
 copy.masterFX={...copy.masterFX,time:.25,feedback:.20,space:.28,drive:.035};
 copy.sidechain={...copy.sidechain,amount:.35,attack:.03,hold:.06,release:.27};
 return copy;
}
export function buildStarterArrangement(snapshot){
 const arrangement=STARTER_SCENES.map((scene,i)=>({name:scene.name,bars:scene.bars,data:starterSceneSnapshot(snapshot,scene,i)}));
 const lanes=Array.from({length:4},(_,i)=>({name:['BASS','LEAD','ATMOS','ACID'][i],
 target:['MONO','POLY','TEXTURE','ACID'][i],enabled:false,midiChannel:i+1,
 steps:Array.from({length:16},()=>({on:false,note:36,gate:.55,velocity:90}))}));
 // Disabled CLAWSTEP lanes leave each instrument's native sequencer in charge.
 return {sceneIndex:0,auto:true,scenes:arrangement,lanes};
}
