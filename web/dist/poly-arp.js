// SPDX-License-Identifier: AGPL-3.0-only
// Poly-01 harmonic arpeggiator: MIDI-note generator, no proprietary DSP.
export const SCALES={
 CHROMATIC:[0,1,2,3,4,5,6,7,8,9,10,11],
 MAJOR:[0,2,4,5,7,9,11],
 MINOR:[0,2,3,5,7,8,10],
 DORIAN:[0,2,3,5,7,9,10],
 PHRYGIAN:[0,1,3,5,7,8,10],
 LYDIAN:[0,2,4,6,7,9,11],
 MIXOLYDIAN:[0,2,4,5,7,9,10],
 "HARM MINOR":[0,2,3,5,7,8,11],
 "MIN PENTA":[0,3,5,7,10],
 "MAJ PENTA":[0,2,4,7,9]
};
export const ARP_DIRECTIONS=['UP','DOWN','UP+DOWN','RANDOM','PLAYED'];
export const ARP_RATES=['1/4','1/8','1/16','1/32'];
export function newPolyArp(){
 return {enabled:false,key:0,scale:'MINOR',degree:0,chord:'TRIAD',direction:'UP',octaves:2,rate:'1/16',gate:.66,steps:8,
 cells:Array.from({length:16},()=>({shift:0,on:true,accent:false}))};
}
export function quantizeToScale(note,key=0,name='MINOR'){
 const scale=SCALES[name]||SCALES.MINOR;
 const fits=n=>scale.includes(((n-key)%12+12)%12);
 const input=Math.max(0,Math.min(127,Math.round(note)));
 for(let distance=0;distance<13;distance++){
  const low=input-distance,high=input+distance;
  if(low>=0&&fits(low))return low;
  if(high<=127&&fits(high))return high;
 }
 return input;
}
const degreeAt=(scale,index)=>{const size=scale.length;const div=Math.floor(index/size);return scale[((index%size)+size)%size]+12*div};
export function buildArpChord(p,base=60){
 const arp={...newPolyArp(),...p},scale=SCALES[arp.scale]||SCALES.MINOR;
 const degree=Number(arp.degree)||0;
 const chord=arp.chord==='POWER'?[0,4,7]:arp.chord==='SUS2'?[0,1,4]:arp.chord==='SUS4'?[0,3,4]:arp.chord==='SEVENTH'?[0,2,4,6]:arp.chord==='OCTAVES'?[0,7]:[0,2,4];
 const root=60+Number(arp.key||0)+12*Math.floor((base-60)/12);
 return chord.map(d=>Math.max(0,Math.min(127,root+degreeAt(scale,degree+d))));
}
function pseudo(x){let n=Math.imul(x+101,1664525)+1013904223|0;n^=n>>>16;return (n>>>0)/4294967296}
export function arpEventsAtStep(config,base,transportStep,stepDuration){
 if(!config?.enabled)return [];
 const arp={...newPolyArp(),...config};
 const div={'1/4':4,'1/8':2,'1/16':1,'1/32':.5}[arp.rate]||1;
 if(div>=1&&transportStep%div!==0)return [];
 const perTick=div===.5?2:1;
 const chord=buildArpChord(arp,base),range=Array.from({length:Math.max(1,Math.min(4,Number(arp.octaves)||1))},(_,o)=>chord.map(n=>n+12*o)).flat();
 const length=range.length;if(!length)return [];
 const direction=arp.direction||'UP',events=[];
 const count=Math.max(1,Math.min(16,Number(arp.steps)||8));
 for(let j=0;j<perTick;j++){
  const idx=Math.round(transportStep/div)+j;
  const cell=arp.cells?.[idx%count]||{on:true,shift:0,accent:false};
  if(!cell.on)continue;
  let ni=idx%length;
  if(direction==='DOWN')ni=length-1-ni;
  else if(direction==='UP+DOWN'){const span=Math.max(1,length*2-2);let pos=idx%span;ni=pos<length?pos:span-pos}
  else if(direction==='RANDOM')ni=Math.floor(pseudo(idx+Number(arp.key||0)*31)*length);
  else if(direction==='PLAYED')ni=(Math.floor(idx/chord.length)%Math.max(1,Number(arp.octaves)||1))*chord.length+(idx%chord.length);
  const scale=SCALES[arp.scale]||SCALES.MINOR;
  const offset=degreeAt(scale,Math.trunc(cell.shift||0));
  const note=quantizeToScale(range[ni]+offset,Number(arp.key||0),arp.scale);
  const unit=stepDuration*div;
  events.push({note,offset:j*(stepDuration/2),length:Math.max(.025,unit*Math.max(.15,Math.min(1.5,Number(arp.gate)||.66))),velocity:cell.accent?1:.72,arpIndex:idx});
 }
 return events;
}
