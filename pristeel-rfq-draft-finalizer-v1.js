/* PRISTEEL RFQ draft finalizer v1
 * Final presentation guard for Project-first RFQ drafts.
 * Supplier RFQs are intentionally concise: project documentation is the quantity/technical source.
 * The internal buyer request and PRISTEEL BOM remain internal and are not inserted into supplier emails.
 * No email is sent automatically and no polling/MutationObserver is used.
 */
(function(){
'use strict';
if(window.__pstRfqDraftFinalizerV1)return;
window.__pstRfqDraftFinalizerV1=true;

function A(v){return Array.isArray(v)?v:[];}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function escRx(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function lang(v){v=N(v);if(v==='de'||v.indexOf('german')>-1||v.indexOf('deutsch')>-1)return'de';if(v==='sq'||v.indexOf('alban')>-1)return'sq';if(v==='sr'||v==='bs'||v==='hr'||v.indexOf('serb')>-1||v.indexOf('bosn')>-1||v.indexOf('croat')>-1)return'sr';return'en';}
function data(){var R=window.PSTProjectFirstRfqDraftV1;return (R&&R._state&&R._state.data)||window.__pstIntegrityLastData||null;}

function badUrl(u){
  u=String(u||'').trim();
  if(!/^https?:\/\//i.test(u))return true;
  return /(?:google\.[^/]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^/]+\/search|bing\.com\/maps|openstreetmap\.org|facebook\.com|instagram\.com|linkedin\.com|mail\.google\.com|prissteel\.com|localhost|127\.0\.0\.1)/i.test(u);
}
function documentLike(u,name){
  u=String(u||'').trim();name=String(name||'').trim();
  if(badUrl(u))return false;
  if(/(?:we\.tl|wetransfer|dropbox|sharepoint|onedrive|drive\.google\.com|docs\.google\.com|mega\.|transfer|download)/i.test(u))return true;
  if(/\.(?:zip|pdf|dwg|dxf|ifc|xlsx?|docx?|rar|7z)(?:[?#]|$)/i.test(u))return true;
  if(/\.(?:zip|pdf|dwg|dxf|ifc|xlsx?|docx?|rar|7z)$/i.test(name))return true;
  return false;
}
function urls(v){var m=String(v||'').match(/https?:\/\/[^\s<>"']+/ig)||[];return m.map(function(x){return x.replace(/[),.;]+$/,'');});}
function preferredDrive(p){
  p=p||{};var u=String(p.drive_folder_url||'').trim();
  if(u&&/drive\.google\.com\/drive\/folders\//i.test(u)&&!badUrl(u))return u;
  if(p.drive_folder_id)return'https://drive.google.com/drive/folders/'+String(p.drive_folder_id).trim();
  return'';
}
function score(u,origin,name){
  if(!documentLike(u,name))return-999;u=String(u||'');name=String(name||'');var s=0;
  if(origin==='project-file')s+=70;if(origin==='project')s+=55;if(origin==='buyer-email')s+=35;
  if(/(?:we\.tl|wetransfer|dropbox|sharepoint|onedrive|drive\.google\.com|docs\.google\.com|mega\.|transfer|download)/i.test(u))s+=45;
  if(/\.zip(?:[?#]|$)/i.test(u)||/\.zip$/i.test(name))s+=55;
  if(/\.(?:pdf|dwg|dxf|ifc|xlsx?|docx?|rar|7z)(?:[?#]|$)/i.test(u)||/\.(?:pdf|dwg|dxf|ifc|xlsx?|docx?|rar|7z)$/i.test(name))s+=20;
  if(/drive\.google\.com\/drive\/folders\//i.test(u))s+=30;
  return s;
}
function addCandidate(out,u,origin,name){u=String(u||'').trim();var s=score(u,origin,name);if(s>-900)out.push({url:u,score:s});}
function safeBestLink(){
  var d=data()||{},p=d.project||{},drive=preferredDrive(p),out=[];if(drive)return drive;
  A(d.files).concat(A(d.projectDocs),A(d.attachmentLinks),A(d.inboxDocs),A(d.docs),A(d.drive&&d.drive.rows)).forEach(function(f){addCandidate(out,O(f.webContentLink,f.web_view_link,f.webViewLink,f.drive_url,f.file_url,f.url,''),'project-file',O(f.name,f.filename,f.file_name,''));});
  [p.project_download_url,p.download_url].forEach(function(u){addCandidate(out,u,'project','');});
  A(d.emails).forEach(function(m){var from=String(O(m.from_email,m.sender,m.from,'')).toLowerCase();if(/@prissteel\.com\b/.test(from))return;urls([m.body_text,m.body,m.text,m.snippet,m.subject].filter(Boolean).join('\n')).forEach(function(u){addCandidate(out,u,'buyer-email',m.subject||'');});});
  out.sort(function(a,b){return b.score-a.score;});return out.length?out[0].url:'';
}
function normalizeDocLink(){
  var box=document.getElementById('pst-pf2-rfq-draft'),inp=box&&box.querySelector('[data-prfq-doc-link]');if(!inp)return'';
  var cur=String(inp.value||'').trim(),best=safeBestLink(),manual=inp.getAttribute('data-prfq-doc-user-edited')==='1';
  if(badUrl(cur)||(!manual&&!documentLike(cur,'')))cur=best;
  if(cur!==String(inp.value||'').trim()){inp.value=cur;inp.dispatchEvent(new Event('input',{bubbles:true}));}
  var open=box.querySelector('[data-prfq-doc-open]');if(open)open.href=cur||'#';
  return cur;
}
function projectLabel(){
  var p=(data()&&data().project)||{},name=O(p.name,'Projekt'),client=O(p.client,'');
  if(client){
    var re=new RegExp('^\\s*'+escRx(client)+'\\s*(?:[-–—|:]\\s*)','i');
    var stripped=name.replace(re,'').trim();if(stripped)name=stripped;
  }
  return name;
}
function subject(l,project){
  if(l==='de')return'Anfrage | '+project;
  if(l==='sr')return'Zahtev za ponudu | '+project;
  if(l==='sq')return'Kerkese per oferte | '+project;
  return'RFQ | '+project;
}
function body(l,who,project,link){
  who=(String(who||'').trim().split(/\s+/)[0]||'');project=String(project||'Projekt').trim();
  var doc=link||'[Shto linkun e dokumentacionit]';
  if(l==='de')return 'Guten Tag '+(who||'')+',\n\nunser Kunde hat uns um ein Angebot für die Stahlkonstruktion des folgenden Projekts gebeten:\n'+project+'\n\nDie Projektdokumentation können Sie hier herunterladen:\n'+doc+'\n\nAuf Grundlage der Projektdokumentation benötigen wir Ihr Angebot für:\n- Material + Fertigung, EUR/kg\n- Feuerverzinkung, EUR/kg\n- Pulverbeschichtung, EUR/kg\n- Transport\n- Lieferzeit\n- Incoterm\n- Zahlungsbedingungen\n\nMengen und Positionen sind der Projektdokumentation zu entnehmen. Unklarheiten, fehlende Angaben oder technische Abweichungen kennzeichnen Sie im Angebot eindeutig.\n\nMit freundlichen Grüßen\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
  if(l==='sr')return 'Poštovani'+(who?' '+who:'')+',\n\nnaš klijent je od nas zatražio ponudu za čeličnu konstrukciju za sledeći projekat:\n'+project+'\n\nProjektnu dokumentaciju možete preuzeti ovde:\n'+doc+'\n\nNa osnovu projektne dokumentacije dostavite ponudu za:\n- Materijal + izrada, EUR/kg\n- Toplo cinkovanje, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Rok isporuke\n- Incoterm\n- Uslove plaćanja\n\nKoličine i pozicije preuzmite iz projektne dokumentacije. Sve nejasnoće, nedostajuće podatke ili tehnička odstupanja jasno navedite u ponudi.\n\nSrdačan pozdrav,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
  if(l==='sq')return 'Pershendetje'+(who?' '+who:'')+',\n\nBleresi yne na ka kerkuar oferte per konstruksionin e celikut per projektin:\n'+project+'\n\nDokumentacionin e projektit mund ta shkarkoni ketu:\n'+doc+'\n\nBazuar ne dokumentacionin e projektit, na dergoni oferten tuaj per:\n- Material + prodhim, EUR/kg\n- Zinkim i nxehte, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Afati i furnizimit\n- Incoterm\n- Kushtet e pageses\n\nSasite dhe pozicionet duhet te merren nga dokumentacioni i projektit. Çdo paqartesi, mungese ose devijim teknik shenojeni qarte ne oferte.\n\nMe respekt,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
  return 'Dear '+(who||'Sir/Madam')+',\n\nour client has asked us to provide a quotation for the structural steel works for the following project:\n'+project+'\n\nThe project documentation can be downloaded here:\n'+doc+'\n\nBased on the project documentation, send us your quotation for:\n- Material + fabrication, EUR/kg\n- Hot-dip galvanizing, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Lead time\n- Incoterm\n- Payment terms\n\nQuantities and positions are to be taken from the project documentation. Clearly identify any ambiguities, missing information or technical deviations in your quotation.\n\nKind regards,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
}
function setCompose(a,sub,txt){
  if(!a)return;try{var u=new URL(a.href,location.href);u.searchParams.set('su',sub);u.searchParams.set('body',txt);a.href=u.toString();}catch(e){}
}
function markInternalContext(box){
  var c=box&&box.querySelector('.prfq-context');if(!c)return;
  var label=c.querySelector('label'),note=c.querySelector('.prfq-note');
  if(label)label.textContent='Kerkesa e bleresit · vetem per reference te brendshme';
  if(note)note.textContent='Ky tekst nuk perfshihet ne emailin RFQ per prodhuesin. Emaili bazohet vetem ne projekt dhe dokumentacionin qe ndahet me te.';
}
function markHeader(box){
  var b=box&&box.querySelector('.prfq-head b'),s=box&&box.querySelector('.prfq-head span');
  if(b)b.textContent='RFQ draft per prodhuesit';
  if(s)s.textContent='Dokumentacioni i projektit eshte baza per sasite · emaila sipas gjuhes se kontaktit';
}
function finalize(){
  var R=window.PSTProjectFirstRfqDraftV1,box=document.getElementById('pst-pf2-rfq-draft');if(!R||!R._state||!box)return false;
  var link=normalizeDocLink(),project=projectLabel();markInternalContext(box);markHeader(box);
  A(R._state.suppliers).forEach(function(s,i){
    var row=box.querySelector('[data-prfq-row="'+i+'"]');if(!row)return;var l=lang(s.lang),sub=subject(l,project),txt=body(l,s.contactName||'',project,link);
    var pre=row.querySelector('.prfq-preview'),a=row.querySelector('[data-prfq-gmail]'),subEl=row.querySelector('.prfq-subject');
    if(pre)pre.textContent=txt;if(subEl)subEl.textContent=sub;setCompose(a,sub,txt);
  });
  return true;
}
function schedule(){[0,100,300,700,1500,2600].forEach(function(ms){setTimeout(finalize,ms);});}
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="procurement"],[data-prfq-open],#pst-pf2-rfq-draft [data-prfq-refresh],#pst-pf2-rfq-draft [data-prfq-preview]');if(t)schedule();
},true);
document.addEventListener('input',function(e){if(e.target&&e.target.matches&&e.target.matches('#pst-pf2-rfq-draft [data-prfq-doc-link]'))setTimeout(finalize,40);},false);
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('#pst-pf2-rfq-draft [data-prfq-gmail]');if(!a)return;
  finalize();var link=normalizeDocLink();if(!link||badUrl(link)){e.preventDefault();e.stopPropagation();alert('Shto nje link valid te dokumentacionit te projektit para se te hapesh draftin ne Gmail.');}
},true);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTRfqDraftFinalizerV1={finalize:finalize,safeBestLink:safeBestLink,_test:{badUrl:badUrl,documentLike:documentLike,projectLabel:projectLabel,subject:subject,body:body}};
})();
