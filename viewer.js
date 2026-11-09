'use strict';
(() => {
 const PREFIXES=['ネタバレ防止言語:','Re信号:'];
 const $=id=>document.getElementById(id);
 const fmt=t=>{const s=Math.max(0,Math.floor(Number(t)||0));return (Math.floor(s/3600)?Math.floor(s/3600)+':':'')+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
 const state={id:'',title:'',messages:[],codec:null,player:null,playerReady:false,lastEnd:-1,lastKey:'',seekDragging:false,loadSerial:0};
 const st=(msg,err=false)=>{$('status').textContent=msg;$('status').classList.toggle('error',!!err);};
 let entries=[];
 function videoId(input){
  const s=(input||'').trim();
  if(/^[\w-]{11}$/.test(s))return s;
  try{
   const u=new URL(s),host=u.hostname.replace(/^www\.|^m\./g,'');
   if(host==='youtu.be')return /^[\w-]{11}$/.test(u.pathname.split('/')[1]||'')?u.pathname.split('/')[1]:null;
   if(host==='youtube.com'||host==='youtube-nocookie.com'){
    const id=u.searchParams.get('v')||(/\/(?:shorts|live|embed)\/([\w-]{11})/.exec(u.pathname)||[])[1];
    return /^[\w-]{11}$/.test(id||'')?id:null;
   }
  }catch{}
  return null;
 }
 async function requestJSON(path){
  const response=await fetch(path,{cache:'no-store'});
  if(!response.ok)throw Error('データの取得に失敗しました ('+response.status+')');
  return response.json();
 }
 async function loadCodec(){
  try{
   const d=await requestJSON('./codec-v3.json');
   if(!d.pairs||!d.singles||!Array.isArray([...d.katakana]))throw Error('辞書形式が不正です');
   state.codec=d;
   render(true);
  }catch{st('復号辞書を取得できませんでした。暗号文のまま表示します。',true);}
 }
 function prefixOf(str){return PREFIXES.find(p=>str.startsWith(p))||null;}
 function decode(str){
  const d=state.codec;
  if(!d)throw Error('辞書未取得');
  const prefix=prefixOf(str);if(!prefix)throw Error('接頭辞なし');
  const symbols=new Set([...d.alphabet]),digits=[...d.katakana];
  const codepoints=new Map(digits.map((ch,i)=>[ch,i]));
  const input=[...str.slice(prefix.length).trim()];
  let result='';
  for(let i=0;i<input.length;){
   const ch=input[i]==='!'?'！':input[i]==='?'?'？':input[i];
   if(ch===d.escape){
    if(i+5>input.length)throw Error('不完全なエスケープ');
    let cp=0;
    for(let j=i+1;j<i+5;j++){const x=codepoints.get(input[j]);if(x===undefined)throw Error('不正な文字');cp=cp*digits.length+x;}
    if(cp>0x10ffff||(cp>=0xd800&&cp<=0xdfff))throw Error('不正なUnicode');
    result+=String.fromCodePoint(cp);i+=5;
   }else if(Object.prototype.hasOwnProperty.call(d.singles,ch)){result+=d.singles[ch];i++;}
   else{
    if(i+1>=input.length)throw Error('符号の途中');
    const other=input[i+1]==='!'?'！':input[i+1]==='?'?'？':input[i+1];
    if(!symbols.has(ch)||!symbols.has(other))throw Error('不正な文字');
    const value=d.pairs[ch+other];if(value===undefined)throw Error('未登録の符号');
    result+=value;i+=2;
   }
  }
  return result;
 }
 function normalized(data){
  if(!data||!Array.isArray(data.messages))throw Error('チャットデータの形式が不正です');
  const rows=data.messages.map(m=>{
   if(Array.isArray(m))return [Number(m[0]),String(m[1]||'視聴者'),String(m[2]||'')];
   return [Number(m.seconds??m.t),String(m.author||'視聴者'),String(m.text||'')];
  }).filter(m=>Number.isFinite(m[0])&&m[0]>=0&&m[2]);
  rows.sort((a,b)=>a[0]-b[0]);
  return rows;
 }
 function upperBound(rows,time){
  let lo=0,hi=rows.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid][0]<=time)lo=mid+1;else hi=mid;}return lo;
 }
 function setMessages(data,origin){
  state.messages=normalized(data);
  state.title=data.title||state.title;
  state.lastEnd=-1;state.lastKey='';
  $('video-title').textContent=state.title||'YouTube動画';
  $('chat-count').textContent=state.messages.length.toLocaleString('ja-JP')+'件';
  st(origin+'：'+state.messages.length.toLocaleString('ja-JP')+'件のチャットを読み込みました');
  render(true);
 }
 function line(row){
  const el=document.createElement('div');el.className='msg';
  const time=document.createElement('time');time.textContent=fmt(row[0]);
  const info=document.createElement('div');
  const author=document.createElement('div');author.className='author';author.textContent=row[1];
  const body=document.createElement('div');body.className='body';
  const txt=row[2],prefix=prefixOf(txt);
  if(prefix){
   const p=document.createElement('span');p.className='prefix';p.textContent=prefix;
   const span=document.createElement('span');
   let value=txt.slice(prefix.length),ok=false;
   if($('decode-toggle').checked&&state.codec){try{value=decode(txt);ok=true;}catch{}}
   span.className=ok?'decoded':'cipher';span.textContent=value;
   body.append(p,document.createTextNode(' '),span);
  }else body.textContent=txt;
  info.append(author,body);el.append(time,info);return el;
 }
 function render(force=false){
  const demo=$('demo-result');
  if(demo){
   demo.replaceChildren();
   if($('hide-toggle').checked)demo.textContent='（暗号投稿を非表示にしています）';
   else{
    const original='ネタバレ防止言語:ト愛',p=document.createElement('span');
    p.className='prefix';p.textContent='ネタバレ防止言語:';
    const v=document.createElement('span');
    v.className=$('decode-toggle').checked&&state.codec?'decoded':'cipher';
    v.textContent=v.className==='decoded'?decode(original):'ト愛';
    demo.append(p,document.createTextNode(' '),v);
   }
  }
  const t=getTime();
  const end=upperBound(state.messages,t);
  const key=Number($('decode-toggle').checked)+'-'+Number($('hide-toggle').checked)+'-'+Number($('follow-toggle').checked);
  if(!force&&end===state.lastEnd&&key===state.lastKey)return;
  state.lastEnd=end;state.lastKey=key;
  const list=$('chat-list');
  const start=Math.max(0,end-120);
  const rows=state.messages.slice(start,end).filter(r=>!$('hide-toggle').checked||!prefixOf(r[2]));
  const fragment=document.createDocumentFragment();
  if(!state.messages.length){
   const div=document.createElement('div');div.className='empty';div.textContent='この動画のチャットはまだ取り込まれていません。下の「手元のチャットファイルを読み込む」から追加できます。';fragment.append(div);
  }else if(!rows.length){
   const div=document.createElement('div');div.className='empty';div.textContent='この再生位置には表示するチャットがありません。';fragment.append(div);
  }else for(const row of rows)fragment.append(line(row));
  list.replaceChildren(fragment);
  if($('follow-toggle').checked)list.scrollTop=list.scrollHeight;
  $('chat-footer').textContent='再生位置まで '+end.toLocaleString('ja-JP')+'件 / 総 '+state.messages.length.toLocaleString('ja-JP')+'件。直近120件を表示します。';
 }
 function getTime(){
  if(state.playerReady){try{const t=state.player.getCurrentTime();if(Number.isFinite(t))return t;}catch{}}
  return Number($('seek').value)||0;
 }
 function updateClock(){
  if(!state.playerReady)return;
  let t=getTime(),duration=0;
  try{duration=state.player.getDuration()||0;}catch{}
  $('position').textContent=fmt(t);
  $('duration').textContent=duration>0?fmt(duration):'再生位置に同期';
  if(duration>0){$('seek').max=Math.ceil(duration);$('seek').disabled=false;}
  if(!state.seekDragging)$('seek').value=Math.round(t);
  if($('follow-toggle').checked)render();
 }
 function ytReady(){
  const id=state.id;
  if(!id)return;
  const opts={height:'100%',width:'100%',videoId:id,playerVars:{playsinline:1,rel:0,origin:location.origin},events:{
   onReady:()=>{state.playerReady=true;updateClock();render(true);},
   onStateChange:()=>{updateClock();render(true);},
   onError:e=>st('YouTubeの埋め込み再生でエラーが発生しました。YouTubeで開くリンクも利用できます。',true)
  }};
  try{state.player=new YT.Player('yt-player',opts);}catch{st('動画プレーヤーを初期化できませんでした。',true);}
 }
 let ytLoaded=false;
 window.onYouTubeIframeAPIReady=()=>{ytLoaded=true;if(state.id)ytReady();};
 function showVideo(id){
  state.id=id;state.playerReady=false;
  $('seek').value=0;$('seek').disabled=true;$('position').textContent='00:00';$('duration').textContent='再生時刻に自動追従';
  $('video-title').textContent='動画を読み込み中…';
  $('youtube-link').href='https://www.youtube.com/watch?v='+id;
  const url=new URL(location.href);url.searchParams.set('v',id);history.replaceState(null,'',url);
  if(state.player&&typeof state.player.cueVideoById==='function'){
   state.player.cueVideoById(id);state.playerReady=true;
  }else if(ytLoaded)ytReady();
  else if(!document.getElementById('iframe-api')){
   const script=document.createElement('script');script.id='iframe-api';script.src='https://www.youtube.com/iframe_api';script.async=true;document.head.append(script);
  }
 }
 async function openVideo(id){
  if(!id)return st('正しいYouTubeのURLまたは動画IDを入力してください。',true);
  const n=++state.loadSerial;
  state.messages=[];state.title='';state.lastEnd=-1;state.lastKey='';
  $('export-chat').disabled=true;
  showVideo(id);render(true);
  try{
   const data=await requestJSON('./archive-data/'+id+'.json');
   if(n!==state.loadSerial)return;
   setMessages(data,'取得済みデータ');
  }catch{
   if(n!==state.loadSerial)return;
   state.title='YouTube動画 ('+id+')';$('video-title').textContent=state.title;
   $('chat-count').textContent='チャット未取得';
   $('import-details').open=true;
   st('この動画のチャットはまだ登録されていません。yt-dlpで取得したファイルを指定すると、この端末ですぐ表示できます。',true);
   render(true);
  }
 }
 async function initIndex(){
  try{
   const idx=await requestJSON('./archive-data/index.json');
   entries=Array.isArray(idx)?idx:(idx.videos||[]);
  }catch{entries=[{videoId:'NbVDBdORxvE',title:'リゼロ第16〜18話 同時視聴',channel:'新宝島トーア'}];}
  const sel=$('video-select');sel.replaceChildren();
  for(const e of entries){
   const id=e.videoId||e.id;
   if(!/^[\w-]{11}$/.test(id||''))continue;
   const opt=document.createElement('option');opt.value=id;
   opt.textContent=(e.channel?e.channel+' / ':'')+(e.title||id);
   sel.append(opt);
  }
  const params=new URLSearchParams(location.search);const id=videoId(params.get('v'))||sel.value;
  if(id){sel.value=id;await openVideo(id);}
  else st('動画のURLを指定してください。');
 }
 function readCSV(csv){
  const rows=[],row=[];let field='',inside=false;
  for(let i=0;i<csv.length;i++){
   const c=csv[i];
   if(inside){if(c==='"'&&csv[i+1]==='"'){field+='"';i++;}else if(c==='"')inside=false;else field+=c;}
   else if(c==='"')inside=true;
   else if(c===','){row.push(field);field='';}
   else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push([...row]);row.length=0;field='';}
   else field+=c;
  }
  if(field||row.length){row.push(field);rows.push([...row]);}
  const headings=rows.shift().map(x=>x.replace(/^\uFEFF/,''));
  const secs=headings.indexOf('video_seconds'),author=headings.indexOf('author'),text=headings.indexOf('text');
  if(secs<0||text<0)throw Error('CSVには video_seconds と text 列が必要です');
  return rows.map(r=>[Number(r[secs]),r[author]||'視聴者',r[text]||'']);
 }
 function runs(data){
  const arr=data?.runs||[];
  return arr.map(r=>r.text??r.emoji?.shortcuts?.[0]??r.emoji?.emojiId??'').join('')||data?.simpleText||'';
 }
 function readChatReplay(raw){
  const rows=[];
  for(const line of raw.split(/\r?\n/)){
   if(!line.trim())continue;
   let json;try{json=JSON.parse(line);}catch{continue;}
   const replay=json.replayChatItemAction;
   if(!replay)continue;
   const time=Number(replay.videoOffsetTimeMsec)/1000;
   if(!Number.isFinite(time))continue;
   for(const action of replay.actions||[]){
    const item=action.addChatItemAction?.item||action.replaceChatItemAction?.replacementItem||{};
    const msg=item.liveChatTextMessageRenderer||item.liveChatPaidMessageRenderer||item.liveChatMembershipItemRenderer;
    if(!msg)continue;
    const text=runs(msg.message)||runs(msg.headerSubtext);
    if(!text)continue;
    rows.push([time,runs(msg.authorName)||'視聴者',text]);
   }
  }
  return rows;
 }
 async function importFile(file){
  if(!file)return;
  try{
   if(file.size>20*1024*1024)throw Error('ファイルが大きすぎます（20MB以内）');
   const txt=await file.text();let messages;
   if(/\.csv$/i.test(file.name))messages=readCSV(txt);
   else{
    let data;try{data=JSON.parse(txt);}catch{data=null;}
    if(data?.messages)messages=normalized(data);else messages=readChatReplay(txt);
   }
   if(!messages?.length)throw Error('チャットメッセージを読み取れませんでした');
   if(!state.id)throw Error('先にYouTubeの動画を選択してください');
   setMessages({videoId:state.id,title:state.title||'YouTubeアーカイブ',messages},'端末内ファイル');
   $('export-chat').disabled=false;
  }catch(e){st(e.message,true);}
 }
 function exportArchiveFile(){
  if(!state.id||!state.messages.length){st('先にチャットファイルを読み込んでください。',true);return;}
  if(!/^[\\w-]{11}$/.test(state.id)){st('動画IDが正しくありません。',true);return;}
  const data={
   format:'recipher-chat-v1',
   videoId:state.id,title:state.title||('YouTubeアーカイブ '+state.id),
   channel:'',source:'local viewer import',
   updatedAt:new Date().toISOString(),messages:state.messages
  };
  const blob=new Blob([JSON.stringify(data)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=state.id+'.json';anchor.style.display='none';
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60_000);
  st('GitHub登録用JSONを保存しました。GitHubの archive-data/ にアップロードすると公開一覧へ追加されます。');
 }
 $('export-chat').addEventListener('click',exportArchiveFile);
 $('select-video').addEventListener('click',()=>openVideo($('video-select').value));
 $('open-url').addEventListener('click',()=>openVideo(videoId($('video-url').value)));
 $('video-url').addEventListener('keydown',e=>{if(e.key==='Enter')openVideo(videoId($('video-url').value));});
 $('chat-file').addEventListener('change',e=>{importFile(e.target.files?.[0]);});
 for(const id of ['decode-toggle','hide-toggle','follow-toggle'])$(id).addEventListener('change',()=>render(true));
 $('back30').addEventListener('click',()=>{if(state.playerReady)state.player.seekTo(Math.max(0,getTime()-30),true);render(true);});
 $('forward30').addEventListener('click',()=>{if(state.playerReady)state.player.seekTo(getTime()+30,true);render(true);});
 $('seek').addEventListener('input',()=>{state.seekDragging=true;$('position').textContent=fmt($('seek').value);});
 $('seek').addEventListener('change',()=>{state.seekDragging=false;if(state.playerReady)state.player.seekTo(Number($('seek').value),true);render(true);});
 window.setInterval(updateClock,650);
 loadCodec();
 initIndex();
})();