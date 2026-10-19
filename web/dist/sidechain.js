// SPDX-License-Identifier: AGPL-3.0-only
// Sequencer-keyed gain ducking, not yet a kick-audio detector/compressor.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
export const SIDECHAIN_DEFAULTS=Object.freeze({amount:.68,attack:.08,hold:.14,release:.36});
export function sidechainTiming(p){return {attack:.002+.070*clamp(p.attack)**2,hold:.002+.170*clamp(p.hold),release:.050+1.15*clamp(p.release)**2,depth:.96*clamp(p.amount)}}
export function kickAtStep(drum,step,observedPattern=null){
 if(!drum||!Number.isInteger(step)||step<0)return 0;
 const voice=drum.voices?.[0];
 if(!voice||voice.mute||(drum.voices.some(v=>v.solo)&&!voice.solo))return 0;
 const pi=drum.chainMode&&Number.isInteger(observedPattern)?observedPattern:drum.selectedPattern;
 const pattern=drum.bank?.patterns?.[pi];if(!pattern)return 0;
 const length=Math.max(1,Math.min(64,pattern.length||16));
 const hit=pattern.steps?.[0]?.[step%length];return hit?.on?clamp((hit.velocity??.8)*(hit.probability??1)):0;
}
export function createKickSidechain(){
 const params={...SIDECHAIN_DEFAULTS},strips=new Map();let context=null;
 function connect(ctx,id){if(strips.has(id))return strips.get(id).node;context=ctx;const node=ctx.createGain();node.gain.value=1;strips.set(id,{node,enabled:false});return node}
 function setEnabled(id,value){const c=strips.get(id);if(!c)return false;c.enabled=Boolean(value);if(!c.enabled){const a=c.node.gain,t=context.currentTime;a.cancelScheduledValues(t);a.setTargetAtTime(1,t,.012)}return c.enabled}
 function setParameter(k,v){if(Object.prototype.hasOwnProperty.call(params,k))params[k]=clamp(v)}
 function trigger(time,velocity=1){
  if(!context)return;const p=sidechainTiming(params),t=Math.max(time,context.currentTime+.002),floor=clamp(1-p.depth*Math.sqrt(clamp(velocity)),.02,1);
  for(const {node,enabled} of strips.values()){if(!enabled)continue;const a=node.gain;
   if(typeof a.cancelAndHoldAtTime==='function')a.cancelAndHoldAtTime(t);
   else{a.cancelScheduledValues(t);a.setValueAtTime(a.value,t)}
   a.setTargetAtTime(floor,t,Math.max(.002,p.attack/2));
   a.setTargetAtTime(1,t+p.attack+p.hold,Math.max(.008,p.release/3))
  }
 }
 function reset(){if(!context)return;for(const {node} of strips.values()){const a=node.gain,t=context.currentTime;a.cancelScheduledValues(t);a.setTargetAtTime(1,t,.012)}}
 function snapshot(){return {params:{...params},enabled:Object.fromEntries([...strips].map(([id,c])=>[id,c.enabled]))}}
 function restore(data){if(!data)return;for(const [k,v] of Object.entries(data.params||{}))setParameter(k,v);for(const [id,v] of Object.entries(data.enabled||{}))setEnabled(id,v)}
 return {params,connect,setEnabled,setParameter,trigger,reset,snapshot,restore,isEnabled:id=>Boolean(strips.get(id)?.enabled)};
}
