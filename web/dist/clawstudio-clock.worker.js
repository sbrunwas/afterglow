// Dedicated sequencer wakeups; audio scheduling still uses AudioContext time.
// Browser throttling can still occur; main thread detects starvation and pauses.
let timer=null;
self.onmessage=({data})=>{
  if(data?.type==='stop'){
    clearInterval(timer);timer=null;
  }else if(data?.type==='start'){
    clearInterval(timer);
    const interval=Number.isFinite(data.interval)?
      Math.max(12,Math.min(100,data.interval)):24;
    timer=setInterval(()=>self.postMessage({type:'tick'}),interval);
    self.postMessage({type:'tick'});
  }
};
