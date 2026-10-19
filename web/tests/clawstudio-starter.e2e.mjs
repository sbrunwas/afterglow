import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>d.accept());
try{
 await page.goto('http://127.0.0.1:8765/clawstudio.html',{waitUntil:'networkidle',timeout:30000});
 const tabs=page.locator('#c-desktab');await tabs.click();
 const song=()=>page.locator('#cs10-map [data-scene]');
 assert.equal(await song().count(),8);
 assert.equal(await page.locator('#c-bpm').inputValue(),'122');
 assert.equal(await page.locator('#ch17-key').inputValue(),'9');
 assert.equal(await page.locator('#ch17-scale').inputValue(),'MINOR');
 assert.match(await song().first().innerText(),/BLUE HOUR/);
 assert.match(await page.locator('#cs10-auto').innerText(),/AUTO CHAIN ON/);
 assert.equal(await page.locator('.strip .mute.muted').count(),5,'Only drum/texture in the intro');
 assert.equal(await page.locator('#cs10-lanes .cs10-enable.on').count(),0);
 await song().nth(1).click();
 assert.equal(await page.locator('#c-bass-mount #b01-root').inputValue(),'33');
 assert.equal(await page.locator('.strip .mute.muted').count(),5,'Groove only drum and Mono');
 await song().nth(2).click();
 assert.equal(await page.locator('#c-bass-mount #b01-root').inputValue(),'29','F bass root');
 assert.equal(await page.locator('#c-acid-mount #cri-root').inputValue(),'41','Acid root follows F');
 assert.equal(await page.locator('.strip .mute.muted').count(),4);
 await song().nth(3).click();
 assert.equal(await page.locator('#c-bass-mount #b01-root').inputValue(),'36','C bass root');
 assert.equal(await page.locator('#c-poly-mount #poly-arp-degree').inputValue(),'2');
 await song().nth(5).click();
 const [mono,acid]=await Promise.all([page.locator('.strip').nth(1).locator('.mute').getAttribute('aria-pressed'),page.locator('.strip').nth(4).locator('.mute').getAttribute('aria-pressed')]);
 assert.equal(mono,'true','Mono must step out for acid drop');
 assert.equal(acid,'false','Acid should take the low end in drop');
 await song().first().click();
 await page.reload({waitUntil:'networkidle'});
 await page.locator('#c-desktab').click();
 assert.equal(await page.locator('#c-bpm').inputValue(),'122','Reload restores composed instrument defaults');
 assert.equal(await page.locator('#cs10-map [data-scene]').count(),8);
 assert.equal(await page.locator('.strip .mute.muted').count(),5);
 await page.locator('#cs18-demo').click();
 assert.match(await page.locator('#cs10-where').innerText(),/SCENE 01/);
 // Exercise the actual WASM Drum Machine and studio transport (not just a mocked clock).
 await page.locator('#c-play').click();
 await page.waitForFunction(()=>document.querySelector('#c-play')?.textContent.includes('PAUSE'),null,{timeout:25000});
 await page.waitForTimeout(4800); // Intro is two bars at 122 BPM (~3.93 seconds).
 assert.match(await page.locator('#cs10-where').innerText(),/SCENE 02/, 'Auto-chain must advance from intro to groove');
 await page.locator('#c-stop').click();
 assert.deepEqual(errors,[]);
 console.log('PASS starter song: harmony, density, scene launch, manual demo reload, saved state');
}finally{await browser.close()}
