"use strict";
// JSON is data only. All execution logic stays in the packaged extension (MV3).
const SOURCE = "https://raw.githubusercontent.com/zero-lily/Re-Cipher/main/codec-v3.json";
const EXPECTED_VERSION = "3";
// Check once when Chrome starts; never poll every 24 hours.
let pending = null;
const has = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
function validate(d){
  if (!d || String(d.version)!==EXPECTED_VERSION || typeof d.alphabet!=="string" || typeof d.katakana!=="string" || typeof d.escape!=="string" || !d.pairs || !d.singles) throw Error("辞書の形式またはバージョンが異なります");
  const a=Array.from(d.alphabet), k=Array.from(d.katakana);
  if(a.length!==100 || new Set(a).size!==100 || k.length!==61 || !a.includes(d.escape)) throw Error("文字表が不正です");
  const reserved=new Set(Object.keys(d.singles)); const values=new Set(Object.values(d.singles));
  const codes=Object.entries(d.pairs);
  if(codes.length<4000 || codes.length>5300)throw Error("登録数が想定範囲外です");
  for(const [code,word] of codes){
    const c=Array.from(code);
    if(c.length!==2 || !k.includes(c[0]) || reserved.has(c[0]) || c[0]===d.escape || !a.includes(c[1]) || typeof word!=="string" || !word || values.has(word)) throw Error("競合する符号があります");
    values.add(word);
  }
  return d;
}
async function bundled(){const url=chrome.runtime.getURL('codec-v3.json');const r=await fetch(url);if(!r.ok)throw Error('同梱辞書の読み込みに失敗');return validate(await r.json());}
async function remote(){const controller=new AbortController(), tid=setTimeout(()=>controller.abort(),8500);try{const r=await fetch(SOURCE+'?t='+Date.now(),{cache:'no-store',signal:controller.signal});if(!r.ok)throw Error('GitHub応答: '+r.status);const text=await r.text();if(text.length>800000)throw Error('辞書サイズが大きすぎます');return validate(JSON.parse(text));}finally{clearTimeout(tid);}}
async function codec(force=false){
 if(pending)return pending;
 pending=(async()=>{
  const saved=await chrome.storage.local.get(['codec','lastSync','lastError']);
  let current;
  try{current=validate(saved.codec);}catch{current=await bundled();await chrome.storage.local.set({codec:current});}
  if(force || !saved.lastSync){
    try{const next=await remote();current=next;await chrome.storage.local.set({codec:next,lastSync:Date.now(),lastError:'',decodeIssue:null});}
    catch(e){await chrome.storage.local.set({lastError:String(e?.message||e)});if(force)throw e;}
  }
  return current;
 })().finally(()=>pending=null);
 return pending;
}
chrome.runtime.onMessage.addListener((msg,sender,sendResponse)=>{
 if(msg?.type==='DECODE_FAILURE'){
  // A damaged user comment may be the cause; only record a suggestion to refresh.
  chrome.storage.local.set({decodeIssue:{at:Date.now(),reason:'未対応の暗号文を検出しました'}}).then(()=>sendResponse({ok:true}));
  return true;
 }
 if(!msg||!['GET_CODEC','FORCE_SYNC'].includes(msg.type))return;
 codec(msg.type==='FORCE_SYNC').then(d=>sendResponse({ok:true,codec:d,entries:Object.keys(d.pairs).length})).catch(e=>sendResponse({ok:false,error:String(e?.message||e)}));
 return true;
});
chrome.runtime.onInstalled.addListener(()=>{
 chrome.storage.sync.get(['enabled','hideSignals']).then(v=>{
   const updates={};
   if(v.enabled===undefined)updates.enabled=true;
   if(v.hideSignals===undefined)updates.hideSignals=false;
   if(Object.keys(updates).length)return chrome.storage.sync.set(updates);
 }).catch(()=>{});
 codec(true).catch(()=>{});
});
chrome.runtime.onStartup.addListener(()=>{codec(true).catch(()=>{});});
