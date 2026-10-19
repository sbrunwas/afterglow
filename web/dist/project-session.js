// SPDX-License-Identifier: AGPL-3.0-only
// ClawStudio portable project backup: audio packed as stereo 16-bit PCM, no remote uploads.
const MAX_FRAMES=192000*60,MAX_BYTES=MAX_FRAMES*4,DB_NAME='clawstudio-session-recovery',STORE='projects';
const clamp=(v,a=-1,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
function toBase64(bytes){
 let out='';const chunk=32768;for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.subarray(i,i+chunk));
 return btoa(out);
}
function fromBase64(string){
 if(typeof string!=='string'||string.length>Math.ceil(MAX_BYTES*4/3)+16)throw Error('Audio packet exceeds safety limit');
 const str=atob(string),data=new Uint8Array(str.length);
 for(let i=0;i<str.length;i++)data[i]=str.charCodeAt(i);
 return data;
}
export function encodeAudioBuffer(buffer){
 if(!buffer)return null;
 const frames=buffer.length,sampleRate=buffer.sampleRate;
 if(!Number.isInteger(frames)||frames<1||frames>MAX_FRAMES||!(sampleRate>=8000&&sampleRate<=192000))throw Error('Audio length/rate exceeds project safety limits');
 const channels=Math.min(2,buffer.numberOfChannels),left=buffer.getChannelData(0),right=buffer.getChannelData(channels>1?1:0);
 const raw=new Uint8Array(frames*4),dv=new DataView(raw.buffer);
 for(let i=0;i<frames;i++){dv.setInt16(i*4,Math.round(clamp(left[i])*32767),true);dv.setInt16(i*4+2,Math.round(clamp(right[i])*32767),true)}
 return {encoding:'stereo-pcm16-le',sampleRate,frames,audio:toBase64(raw)};
}
export function decodeAudioBuffer(context,packet){
 if(!packet)return null;
 if(packet.encoding!=='stereo-pcm16-le'||!Number.isInteger(packet.frames)||packet.frames<1||packet.frames>MAX_FRAMES||!(packet.sampleRate>=8000&&packet.sampleRate<=192000))throw Error('Invalid project audio format');
 const bytes=fromBase64(packet.audio);
 if(bytes.length!==packet.frames*4)throw Error('Project audio is truncated');
 const buffer=context.createBuffer(2,packet.frames,packet.sampleRate),dv=new DataView(bytes.buffer),l=buffer.getChannelData(0),r=buffer.getChannelData(1);
 for(let i=0;i<packet.frames;i++){l[i]=dv.getInt16(i*4,true)/32768;r[i]=dv.getInt16(i*4+2,true)/32768}
 return buffer;
}
export function validateProject(project){
 if(!project||project.format!=='clawstudio-project'||project.version!==1)throw Error('Not a compatible ClawStudio project file');
 if(!project.drum?.state?.bank?.patterns||project.drum.state.bank.patterns.length!==16||project.drum.state.voices?.length!==11)throw Error('Invalid Drum Machine project data');
 if(!project.rack?.mono||!project.rack?.poly||!project.rack?.texture||!project.rack?.acid)throw Error('Missing instrument snapshots');
 if(!Array.isArray(project.sampler?.slots)||project.sampler.slots.length!==4)throw Error('Missing four sampler reels');
 if(!Array.isArray(project.conductor?.scenes)||project.conductor.scenes.length!==8||!Array.isArray(project.conductor.lanes)||project.conductor.lanes.length!==4)throw Error('Missing conductor sequence/scene data');
 return project;
}
function openDatabase(){
 if(!('indexedDB' in globalThis))return Promise.reject(Error('IndexedDB is unavailable in this browser'));
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
  req.onerror=()=>reject(req.error||Error('Cannot open local project storage'));
  req.onsuccess=()=>resolve(req.result);
 });
}
export async function saveLocalProject(project){
 validateProject(project);
 const db=await openDatabase();
 try{await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(project,'latest');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Browser backup failed'));tx.onabort=()=>reject(tx.error||Error('Browser backup aborted'))})}
 finally{db.close()}
}
export async function loadLocalProject(){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),req=tx.objectStore(STORE).get('latest');req.onsuccess=()=>resolve(req.result?validateProject(req.result):null);req.onerror=()=>reject(req.error||Error('Cannot read local backup'))})}
 finally{db.close()}
}
export function projectBlob(project){return new Blob([JSON.stringify(validateProject(project))],{type:'application/json'})}
