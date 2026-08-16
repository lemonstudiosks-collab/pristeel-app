import PostalMime from "npm:postal-mime@2.7.5";

const MAX_EML_BYTES=15*1024*1024;
const MAX_CHILD_BYTES=10*1024*1024;
const MAX_CHILD_TOTAL=30*1024*1024;
const MAX_CHILDREN=30;

function s(v){return String(v==null?'':v);}
function htmlText(v){return s(v).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function mailbox(v){if(!v)return'';if(Array.isArray(v))return v.map(mailbox).filter(Boolean).join(', ');if(v.group)return (v.group||[]).map(mailbox).filter(Boolean).join(', ');const name=s(v.name).trim(),addr=s(v.address).trim();return name&&addr?`${name} <${addr}>`:addr||name;}
function childBytes(att){if(att?.content instanceof ArrayBuffer)return new Uint8Array(att.content);if(ArrayBuffer.isView(att?.content))return new Uint8Array(att.content.buffer,att.content.byteOffset,att.content.byteLength);if(typeof att?.content==='string')return new TextEncoder().encode(att.content);return new Uint8Array();}
function childName(att,i){return s(att?.filename).trim()||`eml-attachment-${i+1}`;}
function childMime(att){return s(att?.mimeType||'application/octet-stream').toLowerCase();}
function skipInline(att){return att?.related===true||s(att?.disposition).toLowerCase()==='inline';}

export async function parseEmlSource(bytes,extractChild,{depth=0}={}){
  if(!(bytes instanceof Uint8Array)||!bytes.length)return {text:'',method:'eml-rfc822-v1',status:'review',error:'Empty RFC822 source.'};
  if(bytes.length>MAX_EML_BYTES)return {text:'',method:'eml-guard-v1',status:'review',error:'EML exceeds the 15 MiB safe automatic intake limit.'};
  if(depth>4)return {text:'',method:'eml-guard-v1',status:'review',error:'Nested EML depth exceeds the safe automatic intake limit.'};
  const mail=await PostalMime.parse(bytes,{rfc822Attachments:true,forceRfc822Attachments:true,attachmentEncoding:'arraybuffer',maxNestingDepth:32,maxHeadersSize:524288});
  const header=[
    mail.subject?`Subject: ${s(mail.subject).trim()}`:'',
    mail.from?`From: ${mailbox(mail.from)}`:'',
    mail.to?.length?`To: ${mailbox(mail.to)}`:'',
    mail.cc?.length?`Cc: ${mailbox(mail.cc)}`:'',
    mail.date?`Date: ${s(mail.date).trim()}`:'',
    mail.messageId?`Message-ID: ${s(mail.messageId).trim()}`:''
  ].filter(Boolean).join('\n');
  const body=s(mail.text).trim()||htmlText(mail.html);
  const out=[header,body].filter(Boolean),entries=[],pending=[];
  let total=0,seen=0;
  for(const att of (mail.attachments||[])){
    if(skipInline(att))continue;
    if(seen>=MAX_CHILDREN){pending.push(`EML attachment limit reached at ${MAX_CHILDREN} files.`);break;}
    const name=childName(att,seen),mime=childMime(att),data=childBytes(att);seen++;entries.push(name);
    if(!data.length){pending.push(`${name}: empty attachment content`);continue;}
    if(data.length>MAX_CHILD_BYTES){pending.push(`${name}: exceeds 10 MiB child limit`);continue;}
    total+=data.length;if(total>MAX_CHILD_TOTAL){pending.push('EML child extraction stopped at 30 MiB total attachment safety limit.');break;}
    if(/\.(?:png|jpe?g|gif|webp|tiff?)$/i.test(name)||mime.startsWith('image/')){pending.push(`${name}: image requires vision/OCR`);continue;}
    if(/\.dwg$/i.test(name)||/dwg|autocad/.test(mime)){pending.push(`${name}: DWG requires trusted CAD conversion`);continue;}
    try{
      const child=await extractChild(data,name,mime,depth+1);
      if(s(child?.text).trim())out.push(`EML ATTACHMENT: ${name}\n${child.text}`);
      if(Array.isArray(child?.embedded_pending))pending.push(...child.embedded_pending.map(x=>`${name} > ${x}`));
      if(!s(child?.text).trim()&&!['unsupported'].includes(s(child?.status)))pending.push(`${name}: ${child?.error||child?.status||'review required'}`);
    }catch(e){pending.push(`${name}: ${String(e).slice(0,300)}`);}
  }
  const text=out.join('\n\n').slice(0,120000);
  return {text,method:'eml-rfc822-v1',status:text?'extracted':pending.length?'review':'unsupported',error:pending.length?pending.join('\n').slice(0,4000):null,embedded_entries:entries,embedded_pending:pending,email_metadata:{subject:s(mail.subject).trim(),from:mailbox(mail.from),to:mailbox(mail.to),cc:mailbox(mail.cc),date:s(mail.date).trim(),message_id:s(mail.messageId).trim()}};
}
