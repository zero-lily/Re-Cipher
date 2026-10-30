"use strict";
(()=>{
 if(globalThis.__reCipherContentLoaded)return;
 globalThis.__reCipherContentLoaded=true;
 const PREFIX='Re信号:';
 const MSG='GET_CODEC';
 const SELECTORS=[
  'ytd-comment-view-model #content-text',
  'ytd-comment-renderer #content-text',
  'ytd-comment-thread-renderer #content-text',
  'yt-attributed-string#content-text',
  'yt-live-chat-text-message-renderer #message',
  'yt-live-chat-paid-message-renderer #message',
  'yt-live-chat-paid-sticker-renderer #message',
  'yt-live-chat-membership-item-renderer #message',
  'yt-live-chat-legacy-paid-message-renderer #message'
 ].join(',');
 let enabled=false, dict=null, seen=new Set(), scheduled=false, lastIssueTime=0, lastSendKey='', lastSendTime=0;
 const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 function decode(text){
  if(!dict)throw Error('辞書が未読込です');
  const source=text.slice(PREFIX.length),data=Array.from(source.trim());
  const chars=Array.from(dict.alphabet),values=new Map(chars.map((c,i)=>[c,i]));
  const digits=Array.from(dict.katakana),digitValues=new Map(digits.map((c,i)=>[c,i]));
  let out='';
  for(let i=0;i<data.length;){
   let x=data[i]; if(x==='!')x='！';if(x==='?')x='？';
   if(x===dict.escape){
    if(i+5>data.length)throw Error('短いエスケープ');
    let num=0;for(let j=i+1;j<i+5;j++){const v=digitValues.get(data[j]);if(v===undefined)throw Error('不正な文字');num=num*digits.length+v;}
    if(num>0x10ffff || (num>=0xd800&&num<=0xdfff))throw Error('無効なUnicode');
    out+=String.fromCodePoint(num);i+=5;
   }else if(has(dict.singles,x)){out+=dict.singles[x];i++;}
   else{
    if(i+2>data.length)throw Error('途中で切れています');
    let y=data[i+1];if(y==='!')y='！';if(y==='?')y='？';
    if(!values.has(x)||!values.has(y))throw Error('不正な文字');
    const v=dict.pairs[x+y];if(v===undefined)throw Error('未登録の符号');
    out+=v;i+=2;
   }
  }
  return out;
 }
 // A standalone text comment is replaced visually; the original DOM remains intact.
 function sourceText(el){
   const clone=el.cloneNode(true);
   clone.querySelectorAll('.re-cipher-output').forEach(node=>node.remove());
   return (clone.textContent||'').trim();
 }
 function handle(el){
   if(!el.isConnected || el.closest('.re-cipher-output'))return;
   const t=sourceText(el);
   if(!t.startsWith(PREFIX)){
     if(el.dataset.reCipher==='yes')restore(el);
     return;
   }
   const old=el.getAttribute('data-re-cipher-source');
   if(old===t && el.dataset.reCipher==='yes')return;
   restore(el);
   if(!enabled || !dict || t.length<=PREFIX.length)return;
   let decoded;try{decoded=decode(t);}catch{
     if(Date.now()-lastIssueTime>60_000){lastIssueTime=Date.now();chrome.runtime.sendMessage({type:'DECODE_FAILURE'}).catch(()=>{});}
     return;
   }
   const span=document.createElement('span');span.className='re-cipher-output';span.setAttribute('data-re-cipher-generated','yes');
   const p=document.createElement('span');p.className='re-cipher-prefix';p.textContent=PREFIX;
   const body=document.createElement('span');body.className='re-cipher-decoded';body.textContent=decoded;
   span.append(p,body);
   // Preserve YouTube's native text and DOM for easy restoration and copy.
   el.classList.add('re-cipher-original-hidden');
   el.insertAdjacentElement('afterend',span);
   el.dataset.reCipher='yes';el.setAttribute('data-re-cipher-source',t);seen.add(el);
 }
 function restore(el){
  el.classList.remove('re-cipher-original-hidden');
  if(el.nextElementSibling?.classList.contains('re-cipher-output'))el.nextElementSibling.remove();
  delete el.dataset.reCipher;el.removeAttribute('data-re-cipher-source');seen.delete(el);
 }
 function scan(){scheduled=false;
  if(!enabled){for(const el of [...seen])restore(el);return;}
  if(!dict)return;
  for(const el of document.querySelectorAll(SELECTORS))handle(el);
  for(const el of [...seen])if(!el.isConnected)seen.delete(el);
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan);}
 function load(){chrome.runtime.sendMessage({type:MSG},res=>{if(chrome.runtime.lastError)return;if(res?.ok){dict=res.codec;schedule();}});}
 chrome.storage.sync.get({enabled:false}).then(o=>{enabled=!!o.enabled;if(enabled)load();schedule();});
 chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='sync' && has(changes,'enabled')){enabled=!!changes.enabled.newValue;if(enabled)load();else schedule();}
  if(area==='local' && has(changes,'codec') && enabled){dict=changes.codec.newValue;for(const el of [...seen])restore(el);schedule();}
 });
 const observer=new MutationObserver(ms=>{
   if(!enabled)return;
   for(const m of ms){if(m.type==='childList'||m.type==='characterData'){schedule();break;}}
 });
 observer.observe(document.documentElement,{childList:true,characterData:true,subtree:true});

 // High-friction, fail-closed sending support. Only triggered by an explicit popup confirmation.
 function visible(el){return !!el && el.isConnected && el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden';}
 const TARGET_FIELDS={
   live:['yt-live-chat-text-input-field-renderer #input[contenteditable="true"]','yt-live-chat-message-input-renderer #input[contenteditable="true"]'],
   comment:['ytd-comment-simplebox-renderer #contenteditable-root[contenteditable="true"]','ytd-commentbox #contenteditable-root[contenteditable="true"]'],
   reply:['ytd-commentbox #contenteditable-root[contenteditable="true"]']
 };
 function candidates(kind){
   const found=[];
   for(const css of TARGET_FIELDS[kind]||[]){
     for(const el of document.querySelectorAll(css)){
       if(!visible(el) || found.includes(el))continue;
       // Replies are always inside a comment thread.
       const reply=!!el.closest('ytd-comment-thread-renderer,ytd-comment-replies-renderer');
       if(kind==='comment'&&reply)continue;
       if(kind==='reply'&&!reply)continue;
       found.push(el);
     }
   }
   return found;
 }
 function buttons(kind,field){
   const owner=kind==='live' ? field.closest('yt-live-chat-message-input-renderer') : field.closest('ytd-comment-simplebox-renderer,ytd-commentbox');
   if(!owner)return [];
   const selector=kind==='live'?'#send-button button':'#submit-button button';
   return Array.from(owner.querySelectorAll(selector)).filter(visible);
 }
 function inputText(field){return (field.innerText||field.textContent||'').replace(/\u200b/g,'').trim();}
 function insertText(field,text){
   field.focus();
   const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(field);range.collapse(false);selection.removeAllRanges();selection.addRange(range);
   const ok=document.execCommand('insertText',false,text);
   if(!ok && inputText(field)!==text){
     field.textContent=text;
     field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
   }
   return inputText(field)===text;
 }
 async function sendEncrypted(msg){
   const {kind,encoded,expectedHref}=msg;
   if(!['live','comment','reply'].includes(kind)||typeof encoded!=='string'||!encoded.startsWith(PREFIX)||encoded.length>10000)return {ok:false,error:'送信内容が不正です'};
   if(kind==='live' && Array.from(encoded).length>200)return {ok:false,error:'ライブチャットの200文字上限を超えています'};
   if(location.href!==expectedHref)return {ok:false,error:'送信先のページが変わりました。送信操作を中断しました'};
   const fields=candidates(kind);
   if(fields.length!==1)return {ok:false,error:'入力欄を一意に特定できません。YouTubeの入力欄を開いて再試行してください'};
   const field=fields[0];
   if(inputText(field))return {ok:false,error:'入力欄に既存の下書きがあります。上書きせずに中断しました'};
   const key=location.href+kind+encoded;
   if(key===lastSendKey&&Date.now()-lastSendTime<15000)return {ok:false,error:'重複送信の可能性があるため中断しました'};
   if(!insertText(field,encoded))return {ok:false,error:'入力欄へのセットに失敗したため送信していません'};
   await new Promise(resolve=>setTimeout(resolve,120));
   if(inputText(field)!==encoded)return {ok:false,error:'入力内容が一致しません。送信は行っていません'};
   const btns=buttons(kind,field);
   if(btns.length!==1 || btns[0].disabled || btns[0].getAttribute('aria-disabled')==='true')return {ok:true,clicked:false,detail:'暗号文を入力欄にセットしましたが、送信ボタンを特定できないため自動送信は行っていません。YouTube側で確認して手動送信してください'};
   lastSendKey=key;lastSendTime=Date.now();btns[0].click();
   return {ok:true,clicked:true,detail:'YouTubeの送信ボタンを押しました。チャット・コメント欄に表示されたか確認してください'};
 }
 chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
   if(msg?.type!=='RE_CIPHER_SEND')return;
   sendEncrypted(msg).then(reply).catch(e=>reply({ok:false,error:String(e?.message||e)}));
   return true;
 });
 window.addEventListener('pageshow',schedule);
})();
