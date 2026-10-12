// SPDX-License-Identifier: AGPL-3.0-only
export const SKINS = Object.freeze({
  classic:{name:'Classic 909',chrome:'#242a25'},
  hacker:{name:'Hacker · Black / Green',chrome:'#050806'},
  midnight:{name:'Midnight · Black / Blue',chrome:'#080d16'},
  studio:{name:'Studio · Bone / Burgundy',chrome:'#d5ccc0'},
});
export const SKIN_STORAGE_KEY='afterglow-skin-v1';
export function initSkins(doc=globalThis.document,storage) {
  if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
  const select=doc.getElementById('skin-select');
  if(!select)return;
  const apply=value=>{
    const skin=Object.hasOwn(SKINS,value)?value:'classic';
    doc.documentElement.dataset.skin=skin;
    select.value=skin;
    doc.querySelector('meta[name="theme-color"]')?.setAttribute('content',SKINS[skin].chrome);
    return skin;
  };
  let saved='classic';try{saved=storage?.getItem(SKIN_STORAGE_KEY)||'classic';}catch{}
  apply(saved);
  select.addEventListener('change',()=>{
    const skin=apply(select.value);
    try{storage?.setItem(SKIN_STORAGE_KEY,skin);}catch{}
  });
}
