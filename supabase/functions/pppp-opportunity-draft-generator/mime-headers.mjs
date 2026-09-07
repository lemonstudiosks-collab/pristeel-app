const cleanHeader=(v,max=500)=>String(v==null?'':v).replace(/[\r\n]+/g,' ').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]+/g,' ').trim().slice(0,max);
const utf8Bytes=(v)=>new TextEncoder().encode(v);
const base64Utf8=(v)=>{let bin='';for(const b of utf8Bytes(v))bin+=String.fromCharCode(b);return btoa(bin);};

export function encodeRfc2047Header(v){
  const s=cleanHeader(v,500);
  if(!/[^\x20-\x7E]/.test(s))return s;
  const chunks=[];let current='';
  for(const ch of s){
    const next=current+ch;
    if(current&&utf8Bytes(next).length>45){chunks.push(current);current=ch;}else current=next;
  }
  if(current)chunks.push(current);
  return chunks.map(chunk=>`=?UTF-8?B?${base64Utf8(chunk)}?=`).join(' ');
}
