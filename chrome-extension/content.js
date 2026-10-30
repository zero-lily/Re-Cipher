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
 const POST_SELECTOR=[
  'yt-live-chat-text-message-renderer','yt-live-chat-paid-message-renderer',
  'yt-live-chat-paid-sticker-renderer','yt-live-chat-membership-item-renderer',
  'yt-live-chat-legacy-paid-message-renderer',
  'ytd-comment-view-model','ytd-comment-renderer'
 ].join(',');
 let enabled=true,hideSignals=false,dict=null,scheduled=false,lastIssueTime=0,lastSendKey='',lastSendTime=0;
 const rendered=new Map();
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
 // Keep YouTube's original message node. Visual changes are always reversible.
 function sourceText(el){
  const clone=el.cloneNode(true);
  clone.querySelectorAll('.re-cipher-output').forEach(node=>node.remove());
  return (clone.textContent||'').trim();
 }
 function restore(el){
  const prev=rendered.get(el);
  if(prev?.container)prev.container.classList.remove('re-cipher-item-hidden');
  el.classList.remove('re-cipher-original-hidden');
  if(el.nextElementSibling?.classList.contains('re-cipher-output'))el.nextElementSibling.remove();
  delete el.dataset.reCipher;
  el.removeAttribute('data-re-cipher-source');
  rendered.delete(el);
 }
 function handle(el){
  if(!el.isConnected || el.closest('.re-cipher-output'))return;
  // Avoid treating parent and nested child as two independent comments.
  if(el.querySelector(SELECTORS))return;
  const t=sourceText(el);
  if(!t.startsWith(PREFIX)){
   if(rendered.has(el))restore(el);
   return;
  }
  const container=el.closest(POST_SELECTOR);
  const wantHidden=hideSignals&&!!container;
  const mode=wantHidden?'hidden':enabled&&dict&&t.length>PREFIX.length?'decoded':'encoded';
  const previous=rendered.get(el);
  if(previous?.text===t&&previous.mode===mode&&previous.container===container&&
    (mode==='hidden'?container?.classList.contains('re-cipher-item-hidden'):el.nextElementSibling?.classList.contains('re-cipher-output')))return;
  if(previous)restore(el);
  if(wantHidden){
   container.classList.add('re-cipher-item-hidden');
   rendered.set(el,{text:t,mode,container});
   return;
  }
  let body=t.slice(PREFIX.length);
  let decoded=false;
  if(enabled&&dict&&body){
   try{body=decode(t);decoded=true;}
   catch{
    if(Date.now()-lastIssueTime>60_000){lastIssueTime=Date.now();chrome.runtime.sendMessage({type:'DECODE_FAILURE'}).catch(()=>{});}
   }
  }
  const span=document.createElement('span');
  span.className='re-cipher-output';span.setAttribute('data-re-cipher-generated','yes');
  const prefix=document.createElement('span');prefix.className='re-cipher-prefix';prefix.textContent=PREFIX;
  const text=document.createElement('span');text.className=decoded?'re-cipher-decoded':'re-cipher-encoded';text.textContent=body;
  span.append(prefix,text);
  el.classList.add('re-cipher-original-hidden');
  el.insertAdjacentElement('afterend',span);
  el.dataset.reCipher='yes';el.setAttribute('data-re-cipher-source',t);
  rendered.set(el,{text:t,mode:decoded?'decoded':'encoded',container});
 }
 function scan(){
  scheduled=false;
  for(const [el,prev] of rendered){
   if(!el.isConnected){
    if(prev.container)prev.container.classList.remove('re-cipher-item-hidden');
    rendered.delete(el);
   }
  }
  for(const el of document.querySelectorAll(SELECTORS))handle(el);
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(scan);}
 function reapply(){for(const el of [...rendered.keys()])restore(el);schedule();}
 function load(){chrome.runtime.sendMessage({type:MSG},res=>{if(chrome.runtime.lastError)return;if(res?.ok){dict=res.codec;reapply();}});}
 chrome.storage.sync.get({enabled:true,hideSignals:false}).then(o=>{
  enabled=!!o.enabled;hideSignals=!!o.hideSignals;
  if(enabled)load();
  schedule();
 });
 chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='sync'){
   if(has(changes,'enabled')){enabled=!!changes.enabled.newValue;if(enabled&&!dict)load();}
   if(has(changes,'hideSignals'))hideSignals=!!changes.hideSignals.newValue;
   if(has(changes,'enabled')||has(changes,'hideSignals'))reapply();
  }
  if(area==='local'&&has(changes,'codec')){dict=changes.codec.newValue;reapply();}
 });
 const observer=new MutationObserver(ms=>{
  for(const m of ms){if(m.type==='childList'||m.type==='characterData'){schedule();break;}}
 });
 observer.observe(document.documentElement,{childList:true,characterData:true,subtree:true});
 // High-friction, fail-closed sending support. Only triggered by an explicit popup confirmation.
 function visible(el){
   if(!el || !el.isConnected || !el.getClientRects().length)return false;
   const style=getComputedStyle(el);
   return style.visibility!=='hidden' && style.display!=='none';
 }
 // Detect approved YouTube composers within their host, even when contenteditable
 // is "plaintext-only" or enabled only on focus; support open Shadow DOM.
 function descendants(root,selector){
   const result=[], seen=new Set();
   function walk(scope,depth){
     if(!scope || depth>4)return;
     const all=scope.querySelectorAll('*');
     for(const el of all){
       if(el.matches(selector) && !seen.has(el)){result.push(el);seen.add(el);}
       if(el.shadowRoot)walk(el.shadowRoot,depth+1);
     }
   }
   walk(root,0);
   return result;
 }
 function candidates(kind){
   const found=new Set();
   if(kind==='live'){
     const roots=descendants(document,'yt-live-chat-message-input-renderer,yt-live-chat-text-input-field-renderer');
     for(const root of roots){
       for(const el of descendants(root,'#input,[contenteditable="true"],[contenteditable="plaintext-only"],[role="textbox"]')){
         if(!visible(el) || el.closest('#message,#items'))continue;
         if(el.id!=='input' && !el.isContentEditable && !el.hasAttribute('contenteditable'))continue;
         found.add(el);
       }
     }
     if(!found.size && /\/live_chat(?:$|[?#])/.test(location.pathname)){
       for(const el of descendants(document,'yt-live-chat-text-input-field-renderer #input,yt-live-chat-message-input-renderer #input')){
         if(visible(el))found.add(el);
       }
     }
     const all=[...found];
     return all.filter(el=>!all.some(x=>x!==el && el.contains(x)));
   }
   const selectors=[
     'ytd-comment-simplebox-renderer #contenteditable-root',
     'ytd-commentbox #contenteditable-root',
     'ytd-comment-simplebox-renderer [contenteditable]',
     'ytd-commentbox [contenteditable]',
     'ytd-comment-simplebox-renderer textarea',
     'ytd-commentbox textarea'
   ];
   for(const el of descendants(document,selectors.join(','))){
     if(!visible(el))continue;
     const textarea=el.matches('textarea');
     if(textarea && (el.disabled||el.readOnly))continue;
     if(!textarea && !el.isContentEditable && !el.hasAttribute('contenteditable'))continue;
     const reply=!!el.closest('ytd-comment-thread-renderer,ytd-comment-replies-renderer');
     if(kind==='comment'&&reply || kind==='reply'&&!reply)continue;
     found.add(el);
   }
   const all=[...found];
   return all.filter(el=>!all.some(child=>child!==el&&el.contains(child)));
 }
 function inspectTargets(){
   const result=[];
   for(const kind of ['live','comment','reply']){
     const fields=candidates(kind);
     if(fields.length)result.push({kind,count:fields.length,href:location.href,title:document.title||''});
   }
   return result;
 }
 // An unopened regular comment box has only a placeholder, not an editor.
 // Open it during the first send-intent action; never insert or submit here.
 async function prepareComment(){
   if(!/^\/(watch|shorts)(?:$|\/)/.test(location.pathname))return {ok:true,opened:false,reason:'動画ページではありません'};
   if(candidates('comment').length)return {ok:true,opened:false,reason:'入力欄は既に開いています'};
   const roots=descendants(document,'ytd-comment-simplebox-renderer');
   const placeholders=[];
   for(const root of roots){
     if(!visible(root)||root.closest('ytd-comment-thread-renderer,ytd-comment-replies-renderer'))continue;
     const items=descendants(root,'#simplebox-placeholder,#placeholder-area');
     const placeholder=items.find(el=>el.id==='simplebox-placeholder'&&visible(el))||items.find(el=>el.id==='placeholder-area'&&visible(el));
     if(placeholder)placeholders.push(placeholder);
   }
   if(placeholders.length!==1)return {ok:true,opened:false,reason:'コメントする…が見つからないか複数あります'};
   placeholders[0].click();
   for(let i=0;i<8;i++){
     if(candidates('comment').length===1)return {ok:true,opened:true,reason:'コメント欄を開きました'};
     await new Promise(resolve=>setTimeout(resolve,120));
   }
   return {ok:true,opened:false,reason:'コメント欄の起動が完了しませんでした'};
 }
 function buttons(kind,field){
   let owner=kind==='live' ? field.closest('yt-live-chat-message-input-renderer') : field.closest('ytd-commentbox,ytd-comment-simplebox-renderer');
   if(!owner && kind==='live') owner=descendants(document,'yt-live-chat-message-input-renderer').find(el=>el.contains(field) || el.shadowRoot?.contains(field));
   if(!owner)return [];
   const selector=kind==='live'?'#send-button button,#send-button yt-button-shape button':'#submit-button button,#submit-button yt-button-shape button,button#submit-button';
   return [...new Set(descendants(owner,selector).filter(visible))];
 }
 function inputText(field){
   const raw=field.matches('textarea')?field.value:(field.innerText||field.textContent||'');
   return raw.replace(/\u200b/g,'').trim();
 }
 function insertText(field,text){
   field.focus();
   if(field.matches('textarea')){
     const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;
     if(!setter)return false;
     setter.call(field,text);
     field.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));
     field.dispatchEvent(new Event('change',{bubbles:true}));
     return inputText(field)===text;
   }
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
   let fields=candidates(kind);
   if(fields.length!==1)return {ok:false,error:'入力欄を一意に特定できません。チャット欄をクリックして再試行してください（候補 '+fields.length+' 件）'};
   let field=fields[0];
   if(kind==='live' && !field.isContentEditable){
     field.click();
     fields=candidates(kind);
     if(fields.length===1)field=fields[0];
   }
   if(!field.matches('textarea')&&!field.isContentEditable&&!field.hasAttribute('contenteditable'))return {ok:false,error:'入力欄が有効になっていません。YouTube側で一度クリックしてください'};
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
   if(msg?.type==='RE_CIPHER_INSPECT'){reply({ok:true,targets:inspectTargets()});return;}
   if(msg?.type==='RE_CIPHER_PREPARE_COMMENT'){prepareComment().then(reply).catch(e=>reply({ok:false,error:String(e?.message||e)}));return true;}
   if(msg?.type!=='RE_CIPHER_SEND')return;
   sendEncrypted(msg).then(reply).catch(e=>reply({ok:false,error:String(e?.message||e)}));
   return true;
 });
 window.addEventListener('pageshow',schedule);
})();
