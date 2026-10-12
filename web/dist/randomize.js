// SPDX-License-Identifier: AGPL-3.0-only
const between=(rng,lo,hi)=>lo+(hi-lo)*rng();
const round=(value,places=2)=>Number(value.toFixed(places));
export function randomPattern(length,rng=Math.random) {
  const steps=Array.from({length:11},()=>Array.from({length:64},()=>({on:false,velocity:.8,probability:1,ratchets:1})));
  const fourOnFloor=rng()<.65,clap=rng()<.55,ride=rng()<.3;
  for(let s=0;s<length;s++) {
    const beat=s%16,backbeat=beat===4||beat===12,fill=beat>=12;
    const chances=[fourOnFloor?(s%4===0?.94:.08):(beat===0?.99:beat===6||beat===10?.55:.12),backbeat?.95:(fill?.15:.035),fill?.18:.015,fill?.19:.02,fill?.16:.02,s%4===3?.17:.035,clap&&backbeat?.7:.02,s%2===0?.86:.21,s%4===2?.36:.025,s===0?.7:beat===0?.12:.005,ride&&s%2===0?.55:.035];
    for(let v=0;v<11;v++) {
      const t=steps[v][s];t.on=rng()<chances[v];
      const anchor=v===0&&s%4===0||v===1&&backbeat;
      t.velocity=round(between(rng,anchor?.8:v===7&&s%2?.32:.5,anchor?1:v===7&&s%2?.62:.9));
      if(t.on&&!anchor&&fill&&v!==0&&v!==9&&rng()<.08)t.ratchets=2;
    }
    if(steps[8][s].on)steps[7][s].on=false;
  }
  // Keep an audible foundation even in very short patterns.
  steps[0][0].on=true;steps[0][0].velocity=.95;
  if(length>4){steps[1][4].on=true;steps[1][4].velocity=.9;}
  return {length,steps};
}
export function randomSound(params,voice,rng=Math.random) {
  if(params.model===2)return {...params};
  const pitchRange=voice===0?8:voice>=2&&voice<=4?12:voice>=7?5:9;
  // Mixer settings, sample data/trims and the selected engine are retained.
  return {...params,tune:round(between(rng,-pitchRange,pitchRange),1),decay:round(between(rng,voice===7?.04:.1,voice===7?.52:.92)),tone:round(between(rng,.08,.95)),drive:round(Math.pow(rng(),2)*.65)};
}

export function randomAllDrums(voices, pool, rng=Math.random) {
  if(!Array.isArray(pool)||!pool.length)throw new Error('Select at least one engine before randomizing all drums.');
  if(pool.some(model=>![0,1,3,4].includes(model)))throw new Error('Invalid random engine selection.');
  return voices.map((params,voice)=>{
    const model=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
    return randomSound({...params,model},voice,rng);
  });
}
