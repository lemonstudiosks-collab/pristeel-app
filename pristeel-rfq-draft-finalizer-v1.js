/* PRISTEEL RFQ draft finalizer v1
 * Final presentation guard for Project-first RFQ drafts.
 * Runs after buyer-context, translation/table and project-documentation helpers.
 * Guarantees: no internal thread summary leakage, no map/search URL as project download,
 * target-language buyer section, compact BOM table, and a safe project-document link gate.
 * No email is sent and no polling/MutationObserver is used.
 */
(function(){
'use strict';
if(window.__pstRfqDraftFinalizerV1)return;
window.__pstRfqDraftFinalizerV1=true;

function A(v){return Array.isArray(v)?v:[];}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function num(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function fmt(v){return num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function lang(v){v=N(v);if(v==='de'||v.indexOf('german')>-1||v.indexOf('deutsch')>-1)return'de';if(v==='sq'||v.indexOf('alban')>-1)return'sq';if(v==='sr'||v==='bs'||v==='hr'||v.indexOf('serb')>-1||v.indexOf('bosn')>-1||v.indexOf('croat')>-1)return'sr';return'en';}
function data(){var R=window.PSTProjectFirstRfqDraftV1;return (R&&R._state&&R._state.data)||window.__pstIntegrityLastData||null;}
function clean(v){return String(v||'').replace(/\r/g,'').replace(/\n{3,}/g,'\n\n').trim().slice(0,4800);}
function sourceLang(t){var x=N(t);if(/\b(postovani|molimo|ponud|celic|projekat|dokumentacij|unaprijed|zahtev)\b/.test(x))return'sr';if(/\b(pershendet|ju lutem|kerkese|oferten|projektit|bleresit)\b/.test(x))return'sq';if(/\b(guten tag|bitte|angebot|projekt|unterlagen|dokumentation)\b/.test(x))return'de';return'en';}
function fallback(l){
  if(l==='de')return'Die vollständigen zusätzlichen Anforderungen des Kunden sind in der Projektdokumentation enthalten. Bitte prüfen Sie die Unterlagen als technische Referenz und weisen Sie uns auf relevante Abweichungen hin.';
  if(l==='sr')return'Kompletni dodatni zahtevi kupca nalaze se u projektnoj dokumentaciji. Molimo proverite dokumentaciju kao tehničku referencu i jasno navedite sva relevantna odstupanja.';
  if(l==='sq')return'Detajet e plota shtese te kerkeses se bleresit gjenden ne dokumentacionin e projektit. Ju lutem kontrolloni dokumentacionin si reference teknike dhe na tregoni qarte çdo devijim relevant.';
  return'The buyer’s complete additional requirements are included in the project documentation. Please review the documentation as the technical reference and clearly flag any relevant discrepancies.';
}
function safeBuyer(){
  var B=window.PSTRfqBuyerRequestContextV1,R=window.PSTProjectFirstRfqDraftV1,box=document.getElementById('pst-pf2-rfq-draft'),ta=box&&box.querySelector('[data-prfq-context]');
  if(ta&&ta.getAttribute('data-pst-buyer-user-edited')==='1')return clean(ta.value);
  if(B&&typeof B.buyerRequest==='function'){
    var x=clean(B.buyerRequest((R&&R._state&&R._state.data)||data()));if(x)return x;
  }
  if(B&&typeof B.safeContext==='function'){var y=clean(B.safeContext());if(y)return y;}
  return '';
}
function badUrl(u){
  u=String(u||'').trim();
  if(!/^https?:\/\//i.test(u))return true;
  return /(?:google\.[^/]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^/]+\/search|bing\.com\/maps|openstreetmap\.org|facebook\.com|instagram\.com|linkedin\.com|mail\.google\.com|prissteel\.com|localhost|127\.0\.0\.1)/i.test(u);
}
function urls(v){var m=String(v||'').match(/https?:\/\/[^\s<>"']+/ig)||[];return m.map(function(x){return x.replace(/[),.;]+$/,'');});}
function score(u,origin,name){
  if(badUrl(u))return-999;u=String(u||'');name=String(name||'');var s=0;
  if(origin==='buyer-email')s+=70;if(origin==='project-file')s+=50;if(origin==='project')s+=30;
  if(/(?:we\.tl|wetransfer|dropbox|sharepoint|onedrive|drive\.google\.com|mega\.|transfer|download)/i.test(u))s+=45;
  if(/\.zip(?:[?#]|$)/i.test(u)||/\.zip$/i.test(name))s+=55;
  if(/\.(?:pdf|dwg|dxf|ifc|xlsx?|rar|7z)(?:[?#]|$)/i.test(u)||/\.(?:pdf|dwg|dxf|ifc|xlsx?|rar|7z)$/i.test(name))s+=20;
  if(/drive\.google\.com\/drive\/folders\//i.test(u))s+=12;
  return s;
}
function addCandidate(out,u,origin,name){u=String(u||'').trim();var s=score(u,origin,name);if(s>-900)out.push({url:u,score:s});}
function safeBestLink(){
  var d=data()||{},p=d.project||{},out=[];
  A(d.emails).forEach(function(m){var from=String(O(m.from_email,m.sender,m.from,'')).toLowerCase();if(/@prissteel\.com\b/.test(from))return;urls([m.body_text,m.body,m.text,m.snippet,m.subject].filter(Boolean).join('\n')).forEach(function(u){addCandidate(out,u,'buyer-email',m.subject||'');});});
  A(d.files).concat(A(d.projectDocs),A(d.attachmentLinks),A(d.inboxDocs),A(d.docs),A(d.drive&&d.drive.rows)).forEach(function(f){addCandidate(out,O(f.webContentLink,f.web_view_link,f.webViewLink,f.drive_url,f.file_url,f.url,''),'project-file',O(f.name,f.filename,f.file_name,''));});
  [p.project_download_url,p.download_url,p.source_url,p.drive_folder_url].forEach(function(u){addCandidate(out,u,'project','');});
  if(p.drive_folder_id)addCandidate(out,'https://drive.google.com/drive/folders/'+p.drive_folder_id,'project','');
  out.sort(function(a,b){return b.score-a.score;});return out.length?out[0].url:'';
}
function normalizeDocLink(){
  var box=document.getElementById('pst-pf2-rfq-draft'),inp=box&&box.querySelector('[data-prfq-doc-link]');if(!inp)return'';
  var cur=String(inp.value||'').trim(),best=safeBestLink();
  if(badUrl(cur))cur=best;
  if(cur!==String(inp.value||'').trim()){inp.value=cur;inp.dispatchEvent(new Event('input',{bubbles:true}));}
  var open=box.querySelector('[data-prfq-doc-open]');if(open)open.href=cur||'#';
  return cur;
}
function pad(v,w,right){v=String(v==null?'':v);if(v.length>w)v=v.slice(0,Math.max(1,w-1))+'…';var p=' '.repeat(Math.max(0,w-v.length));return right?p+v:v+p;}
function bomTable(l,rows){
  rows=A(rows);var H=l==='de'?['Nr.','Profil','Abmessung','Güte','Gewicht']:l==='sr'?['Br.','Profil','Dimenzija','Kvalitet','Težina']:l==='sq'?['Nr.','Profili','Dimensioni','Grada','Pesha']:['No.','Profile','Dimension','Grade','Weight'];
  var W=[3,18,18,10,15],sep=W.map(function(w){return'-'.repeat(w);}).join('-+-');
  var out=[pad(H[0],W[0]),pad(H[1],W[1]),pad(H[2],W[2]),pad(H[3],W[3]),pad(H[4],W[4],true)].join(' | ')+'\n'+sep;
  rows.forEach(function(r,i){var vals=[String(i+1),O(r.profile,r.description,r.name,'-'),O(r.dim,r.dimension,'-'),O(r.grade,r.material,'-'),fmt(r.kg)+' kg'];out+='\n'+[pad(vals[0],W[0],true),pad(vals[1],W[1]),pad(vals[2],W[2]),pad(vals[3],W[3]),pad(vals[4],W[4],true)].join(' | ');});
  return out;
}
function buyerHeading(l){return l==='de'?'Zusätzliche Projektangaben aus der Anfrage des Kunden:':l==='sr'?'Dodatne informacije o projektu iz zahteva kupca:':l==='sq'?'Informacion shtese per projektin nga kerkesa e bleresit:':'Additional project information from the buyer request:';}
function bomHeading(l){return l==='de'?'BOM / Stahlmengen:':l==='sr'?'BOM / količine čelika:':l==='sq'?'BOM / sasite e celikut:':'BOM / steel quantities:';}
function totalHeading(l){return l==='de'?'Gesamtgewicht BOM:':l==='sr'?'Ukupna težina BOM-a:':l==='sq'?'Pesha totale e BOM:':'Total BOM weight:';}
function rx(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function replaceSection(body,start,end,value){var re=new RegExp(rx(start)+'\\n[\\s\\S]*?(?=\\n\\n'+rx(end)+')');return re.test(body)?body.replace(re,start+'\n'+value):body;}
function stripDocs(body){return String(body||'').replace(/\n\n(?:Projektdokumentation \/ Download:|Projektna dokumentacija \/ Download:|Dokumentacioni i projektit \/ Shkarkim:|Project documentation \/ Download:)[\s\S]*?(?=\n\nBOM \/)/g,'');}
function docBlock(l,link){
  if(!link)return'';
  if(l==='de')return'Projektdokumentation / Download:\n'+link+'\n\nBitte prüfen Sie unsere BOM und Mengen anhand der vollständigen Projektdokumentation. Bei fehlenden Positionen, Mengenabweichungen oder anderen Unstimmigkeiten verwenden Sie bitte die korrekten Werte in Ihrem Angebot und weisen Sie uns ausdrücklich auf jede Korrektur hin. Im Zweifel ist die Projektdokumentation maßgebend.';
  if(l==='sr')return'Projektna dokumentacija / Download:\n'+link+'\n\nMolimo proverite naš BOM i navedene količine prema kompletnoj projektnoj dokumentaciji. Ako uočite nedostajuće pozicije, razlike u količinama ili druga odstupanja, koristite ispravne vrednosti u ponudi i jasno navedite svaku korekciju. U slučaju neslaganja, projektna dokumentacija je merodavna.';
  if(l==='sq')return'Dokumentacioni i projektit / Shkarkim:\n'+link+'\n\nJu lutem kontrolloni BOM-in dhe sasite tona kundrejt dokumentacionit te plote te projektit. Nese gjeni pozicione qe mungojne, dallime ne sasi ose mospërputhje te tjera, perdorni vlerat e sakta ne oferten tuaj dhe na tregoni qarte çdo korrigjim. Ne rast mospërputhjeje, dokumentacioni i projektit eshte burimi teknik percaktues.';
  return'Project documentation / Download:\n'+link+'\n\nPlease verify our BOM and stated quantities against the complete project documentation. If you identify missing items, quantity differences or other discrepancies, use the correct values in your quotation and clearly flag every correction. In case of discrepancy, the project documentation is the governing technical source.';
}
function setBody(a,body){if(!a)return;try{var u=new URL(a.href,location.href);u.searchParams.set('body',body);a.href=u.toString();}catch(e){}}
function immediate(){
  var R=window.PSTProjectFirstRfqDraftV1,box=document.getElementById('pst-pf2-rfq-draft');if(!R||!R._state||!box)return false;
  var ctx=safeBuyer(),src=sourceLang(ctx),link=normalizeDocLink(),rows=A(R._state.bom);
  if(ctx&&R._state)R._state.buyerContext=ctx;
  A(R._state.suppliers).forEach(function(s,i){
    var row=box.querySelector('[data-prfq-row="'+i+'"]');if(!row)return;var l=lang(s.lang),buyer=(l===src?ctx:fallback(l)),body=String(R.bodyFor(s,ctx)||'');
    body=replaceSection(body,buyerHeading(l),bomHeading(l),buyer);
    body=replaceSection(body,bomHeading(l),totalHeading(l),bomTable(l,rows));
    body=stripDocs(body);var db=docBlock(l,link);if(db){var mark='\n\n'+bomHeading(l);body=body.replace(mark,'\n\n'+db+mark);}
    var pre=row.querySelector('.prfq-preview'),a=row.querySelector('[data-prfq-gmail]');if(pre)pre.textContent=body;setBody(a,body);
  });
  return true;
}
function finalize(){
  immediate();
  var F=window.PSTRfqLanguageTableV1;
  if(F&&typeof F.rewrite==='function'){
    Promise.resolve(F.rewrite(false)).then(function(){normalizeDocLink();var D=window.PSTRfqProjectDocumentationV1;if(D&&typeof D.patchRows==='function')D.patchRows();}).catch(function(){immediate();});
  }
  return true;
}
function schedule(){[0,120,400,900,1800,3200].forEach(function(ms){setTimeout(finalize,ms);});}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open],#pst-pf2-rfq-draft [data-prfq-refresh],#pst-pf2-rfq-draft [data-prfq-preview]');if(t)schedule();},true);
document.addEventListener('input',function(e){if(e.target&&e.target.matches&&e.target.matches('#pst-pf2-rfq-draft [data-prfq-context],[data-prfq-doc-link]'))setTimeout(finalize,80);},false);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTRfqDraftFinalizerV1={finalize:finalize,immediate:immediate,safeBestLink:safeBestLink,_test:{badUrl:badUrl,bomTable:bomTable,sourceLang:sourceLang}};
})();
