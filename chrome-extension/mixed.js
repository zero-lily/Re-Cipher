'use strict';
// Split comments into plain text and cipher segments. Encoded output never
// contains whitespace, so whitespace (or 【平文】) safely ends a cipher segment.
(()=>{
  const PREFIXES=['ネタバレ防止言語:','Re信号:'];
  const PLAIN_LABEL='【平文】';
  function nextPrefix(text,from=0){
    let result=null;
    for(const prefix of PREFIXES){
      const index=text.indexOf(prefix,from);
      if(index>=0&&(!result||index<result.index))result={index,prefix};
    }
    return result;
  }
  function split(text){
    const parts=[];
    let pos=0;
    while(pos<text.length){
      const found=nextPrefix(text,pos);
      if(!found){
        parts.push({kind:'plain',text:text.slice(pos)});
        break;
      }
      if(found.index>pos)parts.push({kind:'plain',text:text.slice(pos,found.index)});
      let start=found.index+found.prefix.length;
      // Accommodate an optional space immediately after the prefix.
      while(start<text.length&&/\s/.test(text[start]))start++;
      let end=text.length;
      const next=nextPrefix(text,start);
      if(next)end=Math.min(end,next.index);
      const labeled=text.indexOf(PLAIN_LABEL,start);
      if(labeled>=0)end=Math.min(end,labeled);
      const space=/\s/.exec(text.slice(start,end));
      if(space)end=start+space.index;
      parts.push({kind:'signal',prefix:found.prefix,payload:text.slice(start,end)});
      pos=end;
    }
    return parts;
  }
  globalThis.ReCipherMixed=Object.freeze({split,PLAIN_LABEL});
})();
