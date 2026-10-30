'use strict';
(()=>{
 const PREFIX='Re信号:';
 const $=id=>document.getElementById(id);
 const ui={enabled:$('enabled'),plain:$('plain'),cipher:$('cipher'),status:$('status'),update:$('update'),notice:$('notice'),send:$('send'),copy:$('copy'),count:$('char-count'),cipherCount:$('cipher-count'),confirm:$('confirm-panel'),dest:$('dest'),preview:$('preview'),commit:$('commit'),issue:$('decode-issue')};
 let dict=null,trie=null,encrypted='',currentPlain='',pending=null;
 const symbolLen=s=>Array.from(s).length;
 const note=(s,error=false)=>{ui.notice.textContent=s;ui.notice.className='notice '+(error?'error':'success');};
 chrome.storage.sync.get({enabled:false}).then(v=>ui.enabled.checked=!!v.enabled);
 ui.enabled.addEventListener('change',()=>chrome.storage.sync.set({enabled:ui.enabled.checked}));
 function makeTrie(codec){
   const root=Object.create(null),rev=new Map();
   for(const [code,token] of Object.entries(codec.pairs))rev.set(token,code);
   for(const [code,token] of Object.entries(codec.singles))rev.set(token,code);
   for(const [token,code] of rev){let node=root;for(const ch of Array.from(token))node=node[ch]??=Object.create(null);node.endCode=code;}
   return root;
 }
 function encode(text){
   if(!dict||!trie)throw Error('辞書の読み込みが完了していません');
   const a=Array.from(text),n=a.length,dp=Array(n+1).fill(Infinity),ways=Array(n);
   const digits=Array.from(dict.katakana);dp[n]=0;
   for(let i=n-1;i>=0;i--){
     let cp=a[i].codePointAt(0),out=Array(4);
     for(let k=3;k>=0;k--){out[k]=digits[cp%digits.length];cp=Math.floor(cp/digits.length);}
     ways[i]=[i+1,dict.escape+out.join('')];dp[i]=5+dp[i+1];
     let node=trie;
     for(let j=i;j<Math.min(i+24,n);j++){
       node=node[a[j]];if(!node)break;
       if(node.endCode!==undefined){const cost=symbolLen(node.endCode)+dp[j+1];if(cost<dp[i]){dp[i]=cost;ways[i]=[j+1,node.endCode];}}
     }
   }
   let result=PREFIX;for(let i=0;i<n;){const [j,code]=ways[i];result+=code;i=j;}
   return result;
 }
 function render(){
   const plain=ui.plain.value;ui.count.textContent=symbolLen(plain)+'文字';
   if(plain!==currentPlain){pending=null;ui.confirm.classList.add('hidden');}
   currentPlain=plain;
   try{encrypted=plain?encode(plain):'';ui.cipher.textContent=encrypted||'暗号化するとここに表示されます';ui.cipherCount.textContent=symbolLen(encrypted)+'文字';}
   catch(e){encrypted='';ui.cipher.textContent=e.message;ui.cipherCount.textContent='—';}
   ui.copy.disabled=ui.send.disabled=!encrypted;
 }
 async function loadDictionary(){
   const r=await chrome.runtime.sendMessage({type:'GET_CODEC'});
   if(!r?.ok||!r.codec)throw Error(r?.error||'辞書を取得できません');
   dict=r.codec;trie=makeTrie(dict);render();showStatus();
 }
 async function showStatus(){
   const x=await chrome.storage.local.get(['codec','lastSync','lastError','decodeIssue']);
   ui.status.textContent=x.codec?`辞書 v${x.codec.version} / ${Object.keys(x.codec.pairs).length.toLocaleString()}語`:'辞書未読込';
   if(x.lastSync)ui.status.textContent+=' ・確認 '+new Date(x.lastSync).toLocaleString('ja-JP');
   if(x.lastError)ui.status.textContent+=' ・更新失敗（同梱版で動作中）';
   ui.issue.classList.toggle('hidden',!x.decodeIssue);
 }
 ui.update.addEventListener('click',async()=>{
   ui.update.disabled=true;note('GitHubの辞書を確認中…');
   try{const r=await chrome.runtime.sendMessage({type:'FORCE_SYNC'});if(!r?.ok)throw Error(r?.error||'更新失敗');dict=r.codec;trie=makeTrie(dict);render();note('辞書を更新・確認しました');}
   catch(e){note(e.message,true);}finally{ui.update.disabled=false;showStatus();}
 });
 ui.plain.addEventListener('input',render);$('encrypt').addEventListener('click',()=>{render();note(encrypted?'変換しました。内容を確認してください':'入力欄に文章を入力してください',!encrypted);});
 $('clear').addEventListener('click',()=>{ui.plain.value='';render();note('');});
 ui.copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(encrypted);note('暗号文をコピーしました');}catch{note('コピーできませんでした。結果欄から手動コピーしてください',true);}});
 // Discover only YouTube frames, not unrelated advertising iframes.
 // Each frame uses the same target detection as the final send handler.
 function getActiveTab(){return chrome.tabs.query({active:true,currentWindow:true}).then(a=>a[0]);}
 async function inspectTargets(){
   const tab=await getActiveTab();
   if(!tab||!/^https:\/\/(www|m)\.youtube\.com\//.test(tab.url||''))throw Error('YouTubeの動画ページを開いてください');
   const frames=await chrome.webNavigation.getAllFrames({tabId:tab.id});
   if(!frames)throw Error('チャットのフレームを取得できません。YouTubeのページを再読み込みしてください');
   const allowed=frames.filter(f=>{
     try {const u=new URL(f.url);return u.protocol==='https:' && ['www.youtube.com','m.youtube.com'].includes(u.hostname);}
     catch{return false;}
   });
   const all=[];
   for(const frame of allowed){
     let r;
     try{r=await chrome.tabs.sendMessage(tab.id,{type:'RE_CIPHER_INSPECT'},{frameId:frame.frameId});}
     catch{
       try{
         await chrome.scripting.executeScript({target:{tabId:tab.id,frameIds:[frame.frameId]},files:['content.js']});
         r=await chrome.tabs.sendMessage(tab.id,{type:'RE_CIPHER_INSPECT'},{frameId:frame.frameId});
       }catch{continue;}
     }
     if(!r?.ok)continue;
     for(const target of r.targets||[]){
       if(target.count!==1)continue;
       all.push({kind:target.kind,href:target.href,title:target.title,frameId:frame.frameId,tabId:tab.id,tabURL:tab.url});
     }
   }
   return all;
 }
 const LABEL={live:'ライブチャット',comment:'通常コメント',reply:'コメントへの返信'};
 ui.send.addEventListener('click',async()=>{
   render();if(!encrypted)return;
   ui.send.disabled=true;pending=null;ui.confirm.classList.add('hidden');note('YouTubeの送信先を確認中…');
   try{
     const targets=await inspectTargets();
     if(!targets.length)throw Error('送信できる入力欄が見つかりません。YouTubeでコメント欄／チャット欄を開いてください。コピーは利用できます');
     pending={text:encrypted,targets};ui.dest.replaceChildren();
     if(targets.length>1){const o=new Option('送信先を選択してください','');ui.dest.append(o);}
     for(let i=0;i<targets.length;i++){const t=targets[i];const hint=t.title.slice(0,28);ui.dest.add(new Option(`${LABEL[t.kind]}${hint?' / '+hint:''}`,String(i)));}
     ui.dest.value=targets.length===1?'0':'';
     ui.preview.textContent=encrypted;ui.confirm.classList.remove('hidden');updateConfirmation();note('送信先・暗号文を確認し、問題なければ確定してください');
   }catch(e){note(e.message,true);}finally{ui.send.disabled=!encrypted;}
 });
 function updateConfirmation(){
   if(!pending){ui.commit.disabled=true;return;}
   const selected=ui.dest.value;const t=selected===''?null:pending.targets[Number(selected)];
   ui.commit.disabled=!t||pending.text!==encrypted||t.kind==='live'&&symbolLen(encrypted)>200;
   $('confirm-warn').textContent=t?.kind==='live'&&symbolLen(encrypted)>200?'ライブチャットは200文字以内です。文章を短くしてください。':'投稿は即時公開される場合があります。内容・送信先を確認してください。';
 }
 ui.dest.addEventListener('change',updateConfirmation);
 $('cancel').addEventListener('click',()=>{ui.confirm.classList.add('hidden');pending=null;note('送信を取り消しました');});
 ui.commit.addEventListener('click',async()=>{
   if(!pending||ui.commit.disabled)return;
   const target=pending.targets[Number(ui.dest.value)],text=pending.text;
   ui.commit.disabled=true;note('送信先を再確認中…');
   try{
     const tab=await getActiveTab();
     if(!tab||tab.id!==target.tabId||tab.url!==target.tabURL)throw Error('タブが切り替わりました。安全のため送信を中止しました');
     const r=await chrome.tabs.sendMessage(target.tabId,{type:'RE_CIPHER_SEND',kind:target.kind,encoded:text,expectedHref:target.href},{frameId:target.frameId});
     if(!r?.ok)throw Error(r?.error||'送信に失敗しました');
     note(r.detail||'送信操作を行いました');
     ui.confirm.classList.add('hidden');pending=null;
   }catch(e){note(e.message,true);updateConfirmation();}
 });
 loadDictionary().catch(e=>{note(e.message,true);showStatus();});
})();
