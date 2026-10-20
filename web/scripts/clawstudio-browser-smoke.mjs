// Automated real-Chromium ClawStudio audio integration smoke.
// Requires: npm install --no-save playwright@1.56.1; npx playwright install chromium
// Then: node scripts/clawstudio-browser-smoke.mjs
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.wasm':'application/wasm','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1/').pathname);
    const filename=resolve(root,'.'+pathname);
    if(filename!==root&&!filename.startsWith(root+sep)){res.writeHead(403).end();return}
    if(!(await stat(filename)).isFile()){res.writeHead(404).end();return}
    res.setHeader('Content-Type',mime[extname(filename)]||'application/octet-stream');
    res.setHeader('Cache-Control','no-store');
    res.end(await readFile(filename));
  }catch(error){res.writeHead(404).end(String(error.message))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required',
    '--use-fake-device-for-media-stream']});
  const context=await browser.newContext({acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())});
  await page.goto('http://127.0.0.1:'+port+'/clawstudio.html',{waitUntil:'domcontentloaded'});
  await page.locator('#c-play').click();
  await page.waitForFunction(()=>{
    const label=document.querySelector('#c-engine');
    return label?.textContent?.includes('LOCAL WASM READY');
  },{timeout:30000});
  await page.waitForTimeout(1200);
  const state=await page.evaluate(()=>({
    engine:document.querySelector('#c-engine')?.textContent,
    jam:document.querySelector('#c-play')?.textContent,
    stripMeters:[...document.querySelectorAll('.strip .meter .bar')].map(n=>parseFloat(n.style.height)||0),
  }));
  assert.match(state.engine,/LOCAL WASM READY/);
  assert.match(state.jam,/PAUSE/);
  assert.ok(state.stripMeters.some(v=>v>0),'No mixer meters registered audio activity');
  await page.locator('#c-rec').click();
  await page.waitForFunction(()=>document.querySelector('#c-rec')?.textContent?.includes('SAVE WAV'),{timeout:12000});
  await page.waitForTimeout(800);
  const promise=page.waitForEvent('download',{timeout:15000});
  await page.locator('#c-rec').click();
  const download=await promise;
  assert.ok(download.suggestedFilename().endsWith('24bit.wav'));
  const bytes=await readFile(await download.path());
  assert.equal(bytes.toString('ascii',0,4),'RIFF');
  assert.equal(bytes.readUInt16LE(34),24);
  assert.ok(bytes.length>1000);
  await page.locator('#c-stop').click();
  assert.deepEqual(errors.filter(e=>!e.includes('404')),[]);
  process.stdout.write('PASS: Chromium genuine WASM JAM, mixer metering, 24-bit master WAV recorder\n');
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
