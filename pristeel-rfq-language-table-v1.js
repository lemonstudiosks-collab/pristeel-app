/* PRISTEEL RFQ language + BOM table v1
 * Keeps the buyer context editable in its original language, but renders every supplier draft
 * fully in the contact language. BOM is rendered as a compact plain-text table so the same
 * structure survives Gmail compose URLs without requiring HTML/Gmail write scopes.
 */
(function(){
'use strict';
if(window.__pstRfqLanguageTableV1)return;
window.__pstRfqLanguageTableV1=true;

var cache={key:'',map:null,pending:null};
function A(v){return Array.isArray(v)?v:[];}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function fmt(v){return n(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function lang(v){v=N(v);if(v==='de'||v.indexOf('german')>-1||v.indexOf('deutsch')>-1)return'de';if(v==='sq'||v.indexOf('alban')>-1)return'sq';if(v==='sr'||v==='bs'||v==='hr'||v.indexOf('serb')>-1||v.indexOf('bosn')>-1||v.indexOf('croat')>-1)return'sr';return'en';}
function hash(s){var h=2166136261,i;for(i=0;i<String(s||'').length;i++){h^=String(s).charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return (h>>>0).toString(36);}
function clean(v){return String(v||'').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,4800);}
function sourceLang(t){var x=N(t);if(/\b(postovani|molimo|ponud|celic|projekat|dokumentacij|unaprijed|zahtev)\b/.test(x))return'sr';if(/\b(pershendet|ju lutem|kerkese|oferten|projektit|bleresit)\b/.test(x))return'sq';if(/\b(guten tag|bitte|angebot|projekt|unterlagen|dokumentation)\b/.test(x))return'de';return'en';}
function fallback(l){
  if(l==='de')return'Die vollständigen zusätzlichen Angaben des Kunden sind in der Projektdokumentation enthalten. Bitte verwenden Sie die Projektdokumentation als technische Referenz und weisen Sie uns auf relevante Abweichungen hin.';
  if(l==='sr')return'Kompletne dodatne informacije kupca nalaze se u projektnoj dokumentaciji. Molimo koristite projektnu dokumentaciju kao tehničku referencu i jasno navedite sva relevantna odstupanja.';
  if(l==='sq')return'Detajet e plota shtese nga bleresi gjenden ne dokumentacionin e projektit. Ju lutem perdorni dokumentacionin si reference teknike dhe na tregoni qarte çdo devijim relevant.';
  return'The buyer’s complete additional requirements are included in the project documentation. Please use the project documentation as the technical reference and clearly flag any relevant discrepancies.';
}
function safeJson(s){s=String(s||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();try{return JSON.parse(s);}catch(e){var a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>-1&&b>a)return JSON.parse(s.slice(a,b+1));throw e;}}
async function callGroq(model,text){
  var key=localStorage.getItem('pristeel_apikey')||'';if(!key)throw new Error('no-key');
  var prompt='Translate the following buyer/project request into Albanian, English, German and Serbian (Latin script). Preserve all names, project names, numbers, dates and technical terms exactly. Do not add, remove, summarize or invent requirements. Remove salutations/signatures only if they are clearly personal correspondence and not project requirements. Return strict JSON with keys sq,en,de,sr and string values only.\n\nSOURCE:\n'+text;
  var r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:model,messages:[{role:'system',content:'You are a precise technical procurement translator. Output valid JSON only.'},{role:'user',content:prompt}],max_tokens:5000,temperature:0,response_format:{type:'json_object'}})});
  var raw=await r.text(),j={};try{j=JSON.parse(raw);}catch(e){}if(!r.ok)throw new Error((j.error&&j.error.message)||('Groq '+r.status));
  var c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(!c)throw new Error('empty');return safeJson(c);
}
async function translations(text,force){
  text=clean(text);var k=hash(text);
  if(!text)return{sq:'',en:'',de:'',sr:''};
  if(!force&&cache.key===k&&cache.map)return cache.map;
  if(!force&&cache.key===k&&cache.pending)return cache.pending;
  try{var stored=sessionStorage.getItem('pst_rfq_trans_'+k);if(!force&&stored){var parsed=JSON.parse(stored);cache={key:k,map:parsed,pending:null};return parsed;}}catch(e){}
  var p=(async function(){
    var out;
    try{out=await callGroq('llama-3.3-70b-versatile',text);}catch(e){try{out=await callGroq('llama-3.1-8b-instant',text);}catch(e2){out=null;}}
    var src=sourceLang(text),m={sq:'',en:'',de:'',sr:''};
    ['sq','en','de','sr'].forEach(function(l){var v=out&&clean(out[l]);m[l]=v||(l===src?text:fallback(l));});
    cache={key:k,map:m,pending:null};try{sessionStorage.setItem('pst_rfq_trans_'+k,JSON.stringify(m));}catch(e){}return m;
  })();
  cache={key:k,map:null,pending:p};return p;
}
function pad(v,w,right){v=String(v==null?'':v);if(v.length>w)v=v.slice(0,Math.max(1,w-1))+'…';var p=' '.repeat(Math.max(0,w-v.length));return right?p+v:v+p;}
function bomTable(l,rows){
  rows=A(rows);var H=l==='de'?['Nr.','Profil','Abmessung','Güte','Gewicht']:l==='sr'?['Br.','Profil','Dimenzija','Kvalitet','Težina']:l==='sq'?['Nr.','Profili','Dimensioni','Grada','Pesha']:['No.','Profile','Dimension','Grade','Weight'];
  var W=[3,18,18,10,15],sep=W.map(function(w){return'-'.repeat(w);}).join('-+-');
  var out=[pad(H[0],W[0]),pad(H[1],W[1]),pad(H[2],W[2]),pad(H[3],W[3]),pad(H[4],W[4],true)].join(' | ');out+='\n'+sep;
  rows.forEach(function(r,i){var vals=[String(i+1),O(r.profile,r.description,r.name,'-'),O(r.dim,r.dimension,'-'),O(r.grade,r.material,'-'),fmt(r.kg)+' kg'];out+='\n'+[pad(vals[0],W[0],true),pad(vals[1],W[1]),pad(vals[2],W[2]),pad(vals[3],W[3]),pad(vals[4],W[4],true)].join(' | ');});
  return out;
}
function buyerHeading(l){return l==='de'?'Zusätzliche Projektangaben aus der Anfrage des Kunden:':l==='sr'?'Dodatne informacije o projektu iz zahteva kupca:':l==='sq'?'Informacion shtese per projektin nga kerkesa e bleresit:':'Additional project information from the buyer request:';}
function bomHeading(l){return l==='de'?'BOM / Stahlmengen:':l==='sr'?'BOM / količine čelika:':l==='sq'?'BOM / sasite e celikut:':'BOM / steel quantities:';}
function totalHeading(l){return l==='de'?'Gesamtgewicht BOM:':l==='sr'?'Ukupna težina BOM-a:':l==='sq'?'Pesha totale e BOM:':'Total BOM weight:';}
function rxEsc(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function replaceSection(body,start,end,value){
  var re=new RegExp(rxEsc(start)+'\\n[\\s\\S]*?(?=\\n\\n'+rxEsc(end)+')');
  if(re.test(body))return body.replace(re,start+'\n'+value);
  return body;
}
function rewriteBody(raw,l,buyer,rows){
  var b=String(raw||'');
  var bh=buyerHeading(l),mh=bomHeading(l),th=totalHeading(l);
  if(buyer){b=replaceSection(b,bh,mh,clean(buyer));}else{var re=new RegExp('\\n\\n'+rxEsc(bh)+'\\n[\\s\\S]*?(?=\\n\\n'+rxEsc(mh)+')');b=b.replace(re,'');}
  b=replaceSection(b,mh,th,bomTable(l,rows));
  return b;
}
function setBody(a,body){if(!a)return;try{var u=new URL(a.href,location.href);u.searchParams.set('body',body);a.href=u.toString();}catch(e){}}
function note(box,text){var n=box&&box.querySelector('.prfq-note');if(!n)return;var base='Detajet shtese mbeten te editueshme ne gjuhen origjinale. Drafti i secilit prodhues gjenerohet i plote ne gjuhen e kontaktit.';n.textContent=text?base+' '+text:base;}
async function rewrite(force){
  var R=window.PSTProjectFirstRfqDraftV1,box=document.getElementById('pst-pf2-rfq-draft');if(!R||!R._state||!box)return false;
  var state=R._state,ta=box.querySelector('[data-prfq-context]'),ctx=clean(ta&&ta.value||state.buyerContext||'');
  note(box,'Duke pergatitur perkthimet…');
  var map=await translations(ctx,!!force);var rows=A(state.bom);
  A(state.suppliers).forEach(function(s,i){var row=box.querySelector('[data-prfq-row="'+i+'"]');if(!row)return;var l=lang(s.lang),raw=R.bodyFor(s,ctx),body=rewriteBody(raw,l,map[l]||'',rows),pre=row.querySelector('.prfq-preview'),a=row.querySelector('[data-prfq-gmail]');if(pre)pre.textContent=body;setBody(a,body);});
  note(box,'BOM-i paraqitet si tabele me kolona edhe ne draftin Gmail.');
  var D=window.PSTRfqProjectDocumentationV1;if(D&&typeof D.patchRows==='function')setTimeout(function(){D.patchRows();},0);
  return true;
}
function schedule(force){[0,100,300,700].forEach(function(ms){setTimeout(function(){rewrite(!!force);},ms);});}

document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open]');if(t)schedule(false);
  var r=e.target&&e.target.closest&&e.target.closest('#pst-pf2-rfq-draft [data-prfq-refresh]');if(r){setTimeout(function(){rewrite(true);},30);}
},true);
document.addEventListener('input',function(e){if(e.target&&e.target.matches&&e.target.matches('#pst-pf2-rfq-draft [data-prfq-context]')){cache.key='';cache.map=null;cache.pending=null;}},false);
document.addEventListener('pst:bom-saved',function(){schedule(false);},false);
document.addEventListener('pst:modules-ready',function(){schedule(false);},{once:true});
window.PSTRfqLanguageTableV1={rewrite:rewrite,translations:translations,_test:{bomTable:bomTable,rewriteBody:rewriteBody,sourceLang:sourceLang}};
})();
