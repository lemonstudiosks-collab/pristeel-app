const APP_NOTICE_URL='https://www.app.gov.al/njoftimi-i-kontrat%C3%ABs-s%C3%AB-shpallur/';
const ALLOWED_HOSTS=new Set(['e-prokurimi.rks-gov.net','app.gov.al','www.app.gov.al']);
const DOC_EXT_RE=/\.(pdf|doc|docx|xls|xlsx|csv|txt|rtf)(?:$|[?#])/i;
const DOC_HINT_RE=/(download|document|dokument|attachment|file|getdata\/downloaddocument)/i;

const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
export function decodeEntities(v){return String(v||'').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCharCode(parseInt(n,16)));}
export function stripTags(v){return text(decodeEntities(String(v||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(?:p|div|li|tr|td|th|h[1-6])>/gi,'\n').replace(/<[^>]+>/g,' ')));}
export function officialUrl(value,base=''){
 try{const u=base?new URL(decodeEntities(text(value)),base):new URL(decodeEntities(text(value)));if(u.protocol!=='https:'||!ALLOWED_HOSTS.has(u.hostname.toLowerCase()))return'';return u.href;}catch{return'';}
}
function attr(attrs,name){const m=String(attrs||'').match(new RegExp("\\b"+name+"\\s*=\\s*([\\\"'])([\\s\\S]*?)\\1",'i'));return m?decodeEntities(m[2]):'';}
function filenameFromUrl(url){try{const u=new URL(url);const p=decodeURIComponent(u.pathname.split('/').pop()||'');return text(p);}catch{return'';}}
function candidateUrl(raw,base){return officialUrl(raw,base)||'';}
function pushUnique(out,seen,url,name){if(!url||seen.has(url))return;seen.add(url);out.push({url,name:text(name)||filenameFromUrl(url)||'Dokument'});}
export function extractDocumentLinks(html,base){
 const out=[],seen=new Set(),src=String(html||'');let m;
 const anchor=/<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
 while((m=anchor.exec(src))){const attrs=m[1]||'',label=stripTags(m[2]||''),href=attr(attrs,'href'),onclick=attr(attrs,'onclick');const vals=[];if(href)vals.push(href);if(onclick){let x;const q=/["']([^"']+(?:DownloadDocument|download|document|dokument|attachment|file)[^"']*)["']/gi;while((x=q.exec(onclick)))vals.push(x[1]);}
   for(const raw of vals){const url=candidateUrl(raw,base);if(!url)continue;if(DOC_EXT_RE.test(url)||DOC_EXT_RE.test(label)||DOC_HINT_RE.test(url))pushUnique(out,seen,url,label);}
 }
 const direct=/(https?:\/\/[^\s"'<>]+|(?:\.{0,2}\/|\/)[^\s"'<>]+)(?=["'])/gi;
 while((m=direct.exec(src))){const raw=m[1];if(!DOC_EXT_RE.test(raw)&&!DOC_HINT_RE.test(raw))continue;const url=candidateUrl(raw,base);if(url)pushUnique(out,seen,url,'Dokument');}
 return out;
}
function nextReferenceBoundary(src,start){const rest=src.slice(start),m=/Numri(?:\s|&nbsp;|<[^>]+>)+i(?:\s|&nbsp;|<[^>]+>)+referenc/gi.exec(rest);return m?start+m.index:-1;}
export function extractAppDossier(html,reference,pageUrl=APP_NOTICE_URL){
 const src=String(html||''),ref=text(reference);if(!ref)return{found:false,reference:'',detail_text:'',documents:[]};const idx=src.lastIndexOf(ref);if(idx<0)return{found:false,reference:ref,detail_text:'',documents:[]};
 const after=idx+ref.length,boundary=nextReferenceBoundary(src,after),end=boundary>after?boundary:Math.min(src.length,after+70000),docsSlice=src.slice(idx,end),metaStart=Math.max(0,idx-14000),metaSlice=src.slice(metaStart,end);
 return{found:true,reference:ref,detail_text:stripTags(metaSlice).slice(0,26000),documents:extractDocumentLinks(docsSlice,pageUrl).slice(0,16),source_url:pageUrl};
}
export function extractKrppDossier(html,detailUrl){const safe=officialUrl(detailUrl);if(!safe)return{found:false,detail_text:'',documents:[],source_url:''};const src=String(html||'');return{found:!!src,detail_text:stripTags(src).slice(0,32000),documents:extractDocumentLinks(src,safe).slice(0,20),source_url:safe};}
export function documentPriority(doc){const n=text(doc&&doc.name).toLowerCase();let s=0;if(/dst|dokument.*tender|tender.*document/.test(n))s+=80;if(/specifik|teknik|technical/.test(n))s+=75;if(/preventiv|boq|bill of|quantity|sasi/.test(n))s+=70;if(/projekt|drawing|vizatim|plan|relacion/.test(n))s+=60;if(/procesverbal|argument/.test(n))s+=45;if(/njoftim|notice/.test(n))s+=15;if(/\.pdf$/i.test(n))s+=8;return s;}
export function chooseAnalysisDocuments(documents,limit=6){return [...(Array.isArray(documents)?documents:[])].sort((a,b)=>documentPriority(b)-documentPriority(a)).slice(0,Math.max(0,limit));}
export const tenderDossierConstants={APP_NOTICE_URL,ALLOWED_HOSTS:[...ALLOWED_HOSTS]};
