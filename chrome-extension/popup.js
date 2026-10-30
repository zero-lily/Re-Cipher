'use strict';
(()=>{
 const PREFIX='Re信号:';
 const $=id=>document.getElementById(id);
 const ui={enabled:$('enabled'),plain:$('plain'),cipher:$('cipher'),status:$('status'),update:$('update'),notice:$('notice'),send:$('send'),copy:$('copy'),count:$('char-count'),cipherCount:$('cipher-count'),confirm:$('confirm-panel'),dest:$('dest'),preview:$('preview'),commit:$('commit'),issue:$('decode-issue'),hide:$('hide-signals'),decodeInput:$('decode-input'),decodedResult:$('decoded-result'),decodedCount:$('decoded-count'),decodeHint:$('decode-hint'),copyDecoded:$('copy-decoded')};
 let dict=null,trie=null,encrypted='',currentPlain='',pending=null,decodedText='';
 const symbolLen=s=>Array.from(s).length;
 const note=(s,error=false)=>{ui.notice.textContent=s;ui.notice.className='notice '+(error?'error':'success');};
 chrome.storage.sync.get({enabled:true,hideSignals:false}).then(v=>{ui.enabled.checked=!!v.enabled;ui.hide.checked=!!v.hideSignals;});
 ui.enabled.addEventListener('change',()=>chrome.storage.sync.set({enabled:ui.enabled.checked}));
 ui.hide.addEventListener('change',()=>chrome.storage.sync.set({hideSignals:ui.hide.checked}));
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
 function decode(text){
   if(!dict)throw Error('辞書を読み込み中です');
   const input=text.trim();
   if(!input.startsWith(PREFIX))throw Error('「Re信号:」から始まる暗号を入力してください');
   const data=Array.from(input.slice(PREFIX.length).trim());
   if(!data.length)throw Error('Re信号: の後に暗号を入力してください');
   const alphabet=Array.from(dict.alphabet),digits=Array.from(dict.katakana);
   const values=new Map(alphabet.map((ch,i)=>[ch,i]));
   const digitValues=new Map(digits.map((ch,i)=>[ch,i]));
   let result='';
   for(let i=0;i<data.length;){
     let head=data[i];if(head==='!')head='！';if(head==='?')head='？';
     if(head===dict.escape){
       if(i+5>data.length)throw Error('暗号が途中で切れています');
       let cp=0;
       for(let j=i+1;j<i+5;j++){
         const digit=digitValues.get(data[j]);
         if(digit===undefined)throw Error('暗号に使用できない文字があります');
         cp=cp*digits.length+digit;
       }
       if(cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff))throw Error('無効な文字コードです');
       result+=String.fromCodePoint(cp);i+=5;
     }else if(Object.prototype.hasOwnProperty.call(dict.singles,head)){
       result+=dict.singles[head];i++;
     }else{
       if(i+1>=data.length)throw Error('暗号が途中で切れています');
       let next=data[i+1];if(next==='!')next='！';if(next==='?')next='？';
       if(!values.has(head)||!values.has(next))throw Error('暗号に使用できない文字があります');
       const word=dict.pairs[head+next];
       if(word===undefined)throw Error('この符号は未登録です。辞書を更新してください');
       result+=word;i+=2;
     }
   }
   return result;
 }
 function renderDecode(){
   const raw=ui.decodeInput.value.trim();
   decodedText='';ui.copyDecoded.disabled=true;ui.decodedCount.textContent='0文字';
   ui.decodeHint.classList.remove('error');
   if(!raw||raw===PREFIX){
     ui.decodedResult.textContent='ここに元の文章が表示されます';
     ui.decodeHint.textContent='Re信号: の後の暗号を入力してください。';
     return;
   }
   try{
     decodedText=decode(raw);
     ui.decodedResult.textContent=decodedText;
     ui.decodedCount.textContent=symbolLen(decodedText)+'文字';
     ui.copyDecoded.disabled=false;
     ui.decodeHint.textContent='復号しました。';
   }catch(e){
     ui.decodedResult.textContent='復号できませんでした';
     ui.decodeHint.textContent=e.message;
     ui.decodeHint.classList.add('error');
   }
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
   dict=r.codec;trie=makeTrie(dict);render();renderDecode();showStatus();
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
   try{const r=await chrome.runtime.sendMessage({type:'FORCE_SYNC'});if(!r?.ok)throw Error(r?.error||'更新失敗');dict=r.codec;trie=makeTrie(dict);render();renderDecode();note('辞書を更新・確認しました');}
   catch(e){note(e.message,true);}finally{ui.update.disabled=false;showStatus();}
 });
 ui.decodeInput.addEventListener('input',renderDecode);
 $('clear-decode').addEventListener('click',()=>{ui.decodeInput.value='';renderDecode();ui.decodeInput.focus();});
 $('insert-prefix').addEventListener('click',()=>{
   if(!ui.decodeInput.value.trimStart().startsWith(PREFIX)){
     ui.decodeInput.value=PREFIX+ui.decodeInput.value;
     renderDecode();
   }
   ui.decodeInput.focus();
   ui.decodeInput.setSelectionRange(PREFIX.length,PREFIX.length);
 });
 ui.copyDecoded.addEventListener('click',async()=>{
   if(!decodedText)return;
   try{await navigator.clipboard.writeText(decodedText);note('復号文をコピーしました');}
   catch{note('復号文をコピーできませんでした',true);}
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
   let commentFrame=null;
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
       if(target.kind==='comment')commentFrame=frame;
     }
   }
   // During the user's first "暗号化して送信…" action, open the regular
   // video comment placeholder if no active editor exists. This does not
   // insert text or publish anything; the final confirmation is still required.
   if(!commentFrame){
     const top=allowed.find(frame=>frame.frameId===0);
     if(top && /\/(watch|shorts)(?:$|[?\/])/.test(new URL(tab.url).pathname)){
       try{
         const opened=await chrome.tabs.sendMessage(tab.id,{type:'RE_CIPHER_PREPARE_COMMENT'},{frameId:0});
         if(opened?.opened){
           const verified=await chrome.tabs.sendMessage(tab.id,{type:'RE_CIPHER_INSPECT'},{frameId:0});
           const found=(verified?.targets||[]).filter(x=>x.kind==='comment'&&x.count===1);
           if(found.length===1){
             const target=found[0];
             all.push({kind:'comment',href:target.href,title:target.title,frameId:0,tabId:tab.id,tabURL:tab.url});
           }
         }
       }catch{/* Keep independently detected chat or reply targets available. */}
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
     if(!targets.length)throw Error('送信できる入力欄が見つかりません。動画の「コメントする…」を一度クリックするか、チャット欄を開いて再試行してください。コピーは利用できます');
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
