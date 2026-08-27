const APP_NOTICE_URL='https://www.app.gov.al/njoftimi-i-kontrat%C3%ABs-s%C3%AB-shpallur/';
const ALLOWED_HOSTS=new Set(['e-prokurimi.rks-gov.net','app.gov.al','www.app.gov.al']);
const DOC_EXT_RE=/\.(pdf|doc|docx|xls|xlsx|csv|txt|rtf|zip)(?:$|[?#])/i;
const DOC_HINT_RE=/(?:\/GetData\/DownloadDocument\b|\/download(?:\/|\?|$)|\/attachment(?:\/|\?|$)|\bdownload(?:file|attachment)?=)/i;
const KRPP_POSTBACK_ALLOW=[
 /^uiDokumentPodaci\$uiDownloadAll$/,
 /^uiDokumentPodaci\$uiDokumentacijaZaNadmetanjeCtl\$uiOpenDocumentZip$/,
 /^uiDokumentPodaci\$uiDokumentacijaZaNadmetanjeCtl\$uiOpenDocumentDoc(?:_5)?$/,
 /^uiDokumentPodaci\$uiDocumentCtl\$uiOpenDocumentPdf(?:_5)?$/,
 /^uiDokumentPodaci\$uiTroskovnikRepeater\$ctl\d+\$uiTroskovnikCtl\$uiOpenDocumentZip$/,
 /^uiDokumentPodaci\$uiTroskovnikRepeater\$ctl\d+\$uiTroskovnikCtl\$uiOpenDocument(?:_5)?$/,
];

const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
export function decodeEntities(v){return String(v||'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));}
export function stripTags(v){return text(decodeEntities(String(v||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(?:p|div|li|tr|td|th|h[1-6])>/gi,'\n').replace(/<[^>]+>/g,' ')));}
export function officialUrl(value,base=''){
 try{const u=base?new URL(decodeEntities(text(value)),base):new URL(decodeEntities(text(value)));if(u.protocol!=='https:'||!ALLOWED_HOSTS.has(u.hostname.toLowerCase()))return'';return u.href;}catch{return'';}
}
function attr(attrs,name){const m=String(attrs||'').match(new RegExp("\\b"+name+"\\s*=\\s*([\\\"'])([\\s\\S]*?)\\1",'i'));return m?decodeEntities(m[2]):'';}
function filenameFromUrl(url){try{const u=new URL(url);const p=decodeURIComponent(u.pathname.split('/').pop()||'');return text(p);}catch{return'';}}
function candidateUrl(raw,base){return officialUrl(raw,base)||'';}
function samePageNonFile(url,base){
 try{
  const u=new URL(url),b=new URL(base);
  return u.origin===b.origin&&u.pathname===b.pathname&&u.search===b.search&&!DOC_EXT_RE.test(u.href)&&!DOC_HINT_RE.test(u.href);
 }catch{return false;}
}
function pushUnique(out,seen,url,name,base=''){if(!url||seen.has(url)||samePageNonFile(url,base))return;seen.add(url);out.push({url,name:text(name)||filenameFromUrl(url)||'Dokument'});}
export function extractDocumentLinks(html,base){
 const out=[],seen=new Set(),src=String(html||'');let m;
 const anchor=/<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
 while((m=anchor.exec(src))){const attrs=m[1]||'',label=stripTags(m[2]||''),href=attr(attrs,'href'),onclick=attr(attrs,'onclick');const vals=[];if(href)vals.push(href);if(onclick){let x;const q=/["']([^"']+(?:DownloadDocument|download|document|dokument|attachment|file)[^"']*)["']/gi;while((x=q.exec(onclick)))vals.push(x[1]);}
   for(const raw of vals){const url=candidateUrl(raw,base);if(!url)continue;if(DOC_EXT_RE.test(url)||DOC_EXT_RE.test(label)||DOC_HINT_RE.test(url))pushUnique(out,seen,url,label,base);}
 }
 const direct=/(https?:\/\/[^\s"'<>]+|(?:\.{0,2}\/|\/)[^\s"'<>]+)(?=["'])/gi;
 while((m=direct.exec(src))){const raw=m[1];if(!DOC_EXT_RE.test(raw)&&!DOC_HINT_RE.test(raw))continue;const url=candidateUrl(raw,base);if(url)pushUnique(out,seen,url,'Dokument',base);}
 return out;
}
function postbackTargetFromHref(href){
 const m=String(href||'').match(/WebForm_DoPostBackWithOptions\(new WebForm_PostBackOptions\(["']([^"']+)["']/i);
 return m?decodeEntities(m[1]):'';
}
function krppPostbackName(label,target){
 const l=text(label);
 if(/uiDownloadAll$/.test(target))return'Dosje tenderi e plotë';
 if(/uiDokumentacijaZaNadmetanjeCtl\$uiOpenDocumentZip$/.test(target))return'Dokumentacioni i tenderit';
 if(/uiTroskovnikRepeater.*uiOpenDocumentZip$/.test(target))return'Paramasa / dokumentacioni financiar';
 if(/uiDocumentCtl\$uiOpenDocumentPdf/.test(target))return l&& !/^shqip$/i.test(l)?l:'Njoftimi i kontratës - PDF';
 if(/uiDokumentacijaZaNadmetanjeCtl\$uiOpenDocumentDoc/.test(target))return'Dokumentacioni i tenderit - Word';
 if(/uiTroskovnikRepeater.*uiOpenDocument/.test(target))return'Paramasa / dokumenti';
 return l||'Dokument KRPP';
}
function krppPostbackPriority(target){
 if(/uiDownloadAll$/.test(target))return100;
 if(/uiDokumentacijaZaNadmetanjeCtl\$uiOpenDocumentZip$/.test(target))return95;
 if(/uiTroskovnikRepeater.*uiOpenDocumentZip$/.test(target))return90;
 if(/uiDokumentacijaZaNadmetanjeCtl\$uiOpenDocumentDoc_5$/.test(target))return80;
 if(/uiTroskovnikRepeater.*uiOpenDocument_5$/.test(target))return78;
 if(/uiDocumentCtl\$uiOpenDocumentPdf_5$/.test(target))return55;
 if(/uiDokumentacijaZaNadmetanjeCtl\$uiOpenDocumentDoc$/.test(target))return45;
 if(/uiTroskovnikRepeater.*uiOpenDocument$/.test(target))return42;
 if(/uiDocumentCtl\$uiOpenDocumentPdf$/.test(target))return30;
 return10;
}
export function extractKrppPostbackActions(html){
 const out=[],seen=new Set(),src=String(html||'');let m;
 const anchor=/<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
 while((m=anchor.exec(src))){
  const href=attr(m[1]||'','href'),label=stripTags(m[2]||''),target=postbackTargetFromHref(href);
  if(!target||!KRPP_POSTBACK_ALLOW.some(re=>re.test(target))||seen.has(target))continue;
  seen.add(target);out.push({kind:'krpp_postback',event_target:target,name:krppPostbackName(label,target),priority:krppPostbackPriority(target)});
 }
 return out.sort((a,b)=>b.priority-a.priority);
}
export function extractAspNetFormState(html,detailUrl){
 const src=String(html||''),m=src.match(/<form\b([^>]*)>([\s\S]*?)<\/form>/i);if(!m)return{found:false,action:'',fields:{}};
 const actionRaw=attr(m[1]||'','action')||detailUrl,action=officialUrl(actionRaw,detailUrl);if(!action)return{found:false,action:'',fields:{}};
 const fields={};let x;const input=/<input\b([^>]*)>/gi;
 while((x=input.exec(m[2]||''))){
  const attrs=x[1]||'',name=attr(attrs,'name');if(!name)continue;
  const type=(attr(attrs,'type')||'text').toLowerCase();if(['submit','button','image','file'].includes(type))continue;
  if((type==='checkbox'||type==='radio')&&!/\bchecked(?:\s*=|\s|>|$)/i.test(attrs))continue;
  fields[name]=attr(attrs,'value');
 }
 return{found:true,action,fields};
}

function nextReferenceBoundary(src,start){const rest=src.slice(start),m=/Numri(?:\s|&nbsp;|<[^>]+>)+i(?:\s|&nbsp;|<[^>]+>)+referenc/gi.exec(rest);return m?start+m.index:-1;}
export function extractAppDossier(html,reference,pageUrl=APP_NOTICE_URL){
 const src=String(html||''),ref=text(reference);if(!ref)return{found:false,reference:'',detail_text:'',documents:[]};const idx=src.lastIndexOf(ref);if(idx<0)return{found:false,reference:ref,detail_text:'',documents:[]};
 const after=idx+ref.length,boundary=nextReferenceBoundary(src,after),end=boundary>after?boundary:Math.min(src.length,after+70000),docsSlice=src.slice(idx,end),metaStart=Math.max(0,idx-14000),metaSlice=src.slice(metaStart,end);
 return{found:true,reference:ref,detail_text:stripTags(metaSlice).slice(0,26000),documents:extractDocumentLinks(docsSlice,pageUrl).slice(0,16),source_url:pageUrl};
}
export function extractKrppDossier(html,detailUrl){const safe=officialUrl(detailUrl);if(!safe)return{found:false,detail_text:'',documents:[],postbacks:[],form_state:null,source_url:''};const src=String(html||'');return{found:!!src,detail_text:stripTags(src).slice(0,32000),documents:extractDocumentLinks(src,safe).slice(0,20),postbacks:extractKrppPostbackActions(src),form_state:extractAspNetFormState(src,safe),source_url:safe};}
export function documentPriority(doc){const n=text(doc&&doc.name).toLowerCase();let s=0;if(/dst|dokument.*tender|tender.*document/.test(n))s+=80;if(/specifik|teknik|technical/.test(n))s+=75;if(/preventiv|boq|bill of|quantity|sasi/.test(n))s+=70;if(/projekt|drawing|vizatim|plan|relacion/.test(n))s+=60;if(/procesverbal|argument/.test(n))s+=45;if(/njoftim|notice/.test(n))s+=15;if(/\.pdf$/i.test(n))s+=8;return s;}
export function chooseAnalysisDocuments(documents,limit=6){return [...(Array.isArray(documents)?documents:[])].sort((a,b)=>documentPriority(b)-documentPriority(a)).slice(0,Math.max(0,limit));}
export const tenderDossierConstants={APP_NOTICE_URL,ALLOWED_HOSTS:[...ALLOWED_HOSTS]};
