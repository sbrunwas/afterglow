import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8765/clawstudio.html',{waitUntil:'networkidle',timeout:30000});
 await page.locator('#c-bass-select').click();
 assert.equal(await page.locator('#c-bass-mount [data-option="subWave"]').inputValue(),'SINE');
 await page.locator('#c-bass-mount [data-option="subWave"]').selectOption('SQUARE');
 assert.equal(await page.locator('#c-bass-mount [data-option="subWave"]').inputValue(),'SQUARE');
 const result=await page.evaluate(async()=>{
  const {Bass01Engine,BASE}=await import('./bass01.js');
  const sr=48000;
  async function render(drive){
   const ctx=new OfflineAudioContext(2,sr,sr),synth=new Bass01Engine(ctx,ctx.destination);
   synth.update({...BASE,mode:'CLASSIC',saw:0,pulse:0,sub:1,subWave:'SINE',
     noise:0,drive,filterEnv:0,lp:1,lpres:0,hp:0,hpres:0,
     attack:0,decay:.05,sustain:.9,release:.06,volume:.8,delay:0,space:0,lfo1Depth:0,lfo2Depth:0});
   synth.noteOn(45,.05,.68,false,false);
   const buffer=await ctx.startRendering();synth.dispose();
   const a=buffer.getChannelData(0),offset=6000,len=14500;
   let rms=0,peak=0,nonfinite=0;
   for(let i=offset;i<offset+len;i++){const v=a[i];if(!Number.isFinite(v))nonfinite++;rms+=v*v;peak=Math.max(peak,Math.abs(v))}
   rms=Math.sqrt(rms/len);
   const amp=f=>{let re=0,im=0;for(let j=0;j<len;j++){const v=a[offset+j],phase=2*Math.PI*f*j/sr;re+=v*Math.cos(phase);im-=v*Math.sin(phase)}return Math.hypot(re,im)/len};
   const fundamental=amp(55);
   return {rms,peak,nonfinite,fundamental,ratio:(amp(110)+amp(165)+amp(220))/Math.max(fundamental,1e-9)};
  }
  return {clean:await render(0),dirty:await render(.85)};
 });
 console.log('MONO offline spectrum',JSON.stringify(result));
 assert.equal(result.clean.nonfinite,0);assert.equal(result.dirty.nonfinite,0);
 assert.ok(result.clean.rms>.005&&result.clean.peak<.95,'Clean bass should be audible, unclipped');
 assert.ok(result.clean.ratio<.15,'Sine sub should have low harmonic distortion');
 assert.ok(result.dirty.ratio>result.clean.ratio+.03,'Drive should add harmonics');
 assert.deepEqual(errors,[]);
 console.log('PASS: Audio spectral purity, drive contrast, and sub controls');
}finally{await browser.close()}
