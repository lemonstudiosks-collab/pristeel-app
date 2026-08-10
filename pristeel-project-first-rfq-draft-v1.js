/* PRISTEEL project-first RFQ draft v1
 * Single source of truth for Project-first RFQ drafting.
 * Supplier emails are concise and use project documentation as the technical/quantity source.
 * Buyer request and saved BOM remain internal. Nothing is sent automatically.
 */
(function(){
'use strict';
if(window.__pstProjectFirstRfqDraftV1)return;
window.__pstProjectFirstRfqDraftV1=true;

var state={projectId:'',data:null,bom:[],suppliers:[],buyerContext:'',docLink:'',loaded:false};
var FIXED=['aktiva','kentaur','eurosteel','sector construction'];
var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];

function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function data(){return window.__pstIntegrityLastData||null;}
function pid(){var d=data();return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');}
function db(q,method,body){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return window.supaFetch(q,method,body);}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function normalize(v){return String(v||'').replace(/<br\s*\/?>/gi,'\n').replace(/<\/p\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/\r/g,'').replace(/\u00a0/g,' ').replace(/[ \t]+\n/g,'\n');}
function when(m){var t=new Date((m&&m.sent_at)||(m&&m.created_at)||0).getTime();return isFinite(t)?t:0;}
function externalIncoming(m){
  if(!m)return false;
  var dir=String(m.direction||'').toLowerCase();
  if(dir==='outgoing'||dir==='sent')return false;
  var from=email(m.from_email||m.sender||m.from||'');
  if(from){
    if(INTERNAL.indexOf(from)>-1)return false;
    if(/^(no-?reply|mailer-daemon|postmaster|dmarc|calendar-notification)@/i.test(from))return false;
    return true;
  }
  return dir==='incoming'||dir==='inbound'||dir==='received';
}
function forwardedSection(t){
  var re=/(?:^|\n)\s*(?:[-_]{2,}\s*)?(?:Begin forwarded message:?|Forwarded message|Original Message|Ursprüngliche Nachricht|Urspruengliche Nachricht|Prosleđena poruka|Prosledjena poruka|Poruka prosleđena|Poruka prosledjena|Прослеђена порука)(?:\s*[-_]{2,})?\s*(?=\n|$)/gi;
  var m,last=null;
  while((m=re.exec(t))!==null){last={index:m.index,end:re.lastIndex};if(re.lastIndex===m.index)re.lastIndex++;}
  return last?{wrapper:t.slice(0,last.index),body:t.slice(last.end)}:null;
}
function forwardingWrapper(t){return /\b(prosledjujem|prosleđujem|prosledim|prosljedujem|prosljeđujem|forward(?:ing|ed)?|weiterleit(?:e|en|ung)?|mejl\s+od\s+investitora|mail\s+from\s+the\s+investor)\b/i.test(String(t||''));}
function cleanSegment(v){
  var t=normalize(v);
  t=t.split(/\n\s*(?:On|Am|Dana|Më datën|Me daten).{0,220}(?:wrote|schrieb|napisao|je napisao|shkroi):/i)[0];
  var lines=t.split('\n').map(function(x){return x.replace(/^\s*>+\s?/,'').replace(/[ \t]+/g,' ').trim();});
  while(lines.length&&(!lines[0]||/^\s*(from|von|od|nga|sent|gesendet|poslato|dërguar|derguar|date|datum|to|an|za|për|per|cc|subject|betreff|predmet|subjekti):/i.test(lines[0])))lines.shift();
  while(lines.length&&!lines[lines.length-1])lines.pop();
  if(lines.length&&/^(poštovani|postovani|dear|guten tag|hallo|hello|pershendetje|përshëndetje)\b.*[,!]?$/.test(lines[0].toLowerCase()))lines.shift();
  var close=-1;
  for(var i=0;i<lines.length;i++)if(/^(s poštovanjem|s postovanjem|srdačan pozdrav|srdacan pozdrav|pozdrav|mit freundlichen grüßen|mit freundlichen gruessen|kind regards|best regards|regards|me respekt|faleminderit)\s*[,!.]?$/.test(lines[i].toLowerCase())){close=i;break;}
  if(close>0&&lines.slice(0,close).join(' ').trim().length>=20)lines=lines.slice(0,close);
  lines=lines.filter(function(x){return !/^\s*(from|von|od|nga|sent|gesendet|poslato|dërguar|derguar|date|datum|to|an|za|për|per|cc|subject|betreff|predmet|subjekti):/i.test(x);});
  return lines.join('\n').replace(/\n{3,}/g,'\n\n').trim().slice(0,4800);
}
function cleanBuyer(v){
  var t=normalize(v),f=forwardedSection(t);
  if(f&&forwardingWrapper(f.wrapper)){
    var inner=f.body,deep=forwardedSection(inner),guard=0;
    while(deep&&forwardingWrapper(deep.wrapper)&&guard++<4){inner=deep.body;deep=forwardedSection(inner);}
    var actual=cleanSegment(inner);if(actual.length>=12)return actual;
  }
  if(f)t=f.wrapper;
  return cleanSegment(t);
}
function buildBuyerContext(d){
  var mails=A(d&&d.emails).filter(externalIncoming).sort(function(a,b){return when(a)-when(b);});
  for(var i=0;i<mails.length;i++){
    var txt=cleanBuyer(O(mails[i].body_text,mails[i].body,mails[i].text,mails[i].snippet,''));
    if(txt.length>=12)return txt;
  }
  return'';
}
function lang(v){v=N(v);if(v==='de'||v.indexOf('german')>-1||v.indexOf('deutsch')>-1)return'de';if(v==='sq'||v.indexOf('alban')>-1)return'sq';if(v==='sr'||v==='bs'||v==='hr'||v.indexOf('serb')>-1||v.indexOf('bosn')>-1||v.indexOf('croat')>-1)return'sr';return'en';}
function isManufacturer(p){var cats=A(p&&p.categories).map(N),name=N(p&&p.name);if(cats.indexOf('fabrication')>-1)return true;return FIXED.some(function(x){return name.indexOf(x)>-1;});}
async function loadSuppliers(){
  var partners=[];try{partners=await db('partners?relation=cs.{supplier}&stage=eq.active&select=id,name,country,city,categories,business_type&order=importance.desc&limit=1000')||[];}catch(e){partners=[];}
  var ids=A(partners).map(function(p){return p.id;}).filter(Boolean),contacts=[];
  if(ids.length){try{contacts=await db('partner_contacts?partner_id=in.('+ids.join(',')+')&select=partner_id,full_name,email,language,is_primary&order=is_primary.desc&limit=3000')||[];}catch(e){contacts=[];}}
  var all=[];
  A(partners).forEach(function(p){A(contacts).filter(function(c){return String(c.partner_id)===String(p.id)&&String(c.email||'').trim();}).forEach(function(c){all.push({partnerId:p.id,company:p.name||'Furnitor',country:[p.city,p.country].filter(Boolean).join(', '),categories:A(p.categories),manufacturer:isManufacturer(p),contactName:c.full_name||'',email:c.email||'',lang:lang(c.language||'en'),primary:!!c.is_primary});});});
  var manufacturers=all.filter(function(x){return x.manufacturer;});
  if(manufacturers.length)return manufacturers;if(all.length)return all;
  var legacy=[];try{if(typeof suppliers!=='undefined'&&Array.isArray(suppliers))legacy=suppliers;}catch(e){}
  legacy.forEach(function(s){A(s.contacts).forEach(function(c){if(c&&c.email)all.push({partnerId:'',company:s.name||'Furnitor',country:s.country||'',categories:[],manufacturer:s.cat!=='rawmat',contactName:c.name||'',email:c.email,lang:lang(s.lang||'en'),primary:true});});});
  return all.filter(function(x){return x.manufacturer;}).length?all.filter(function(x){return x.manufacturer;}):all;
}
function currentProject(){return state.data&&state.data.project||{};}
function bomRows(){return A(state.bom);}
function totalKg(){return +bomRows().reduce(function(s,r){return s+n(r.kg);},0).toFixed(2);}
function projectLabel(){
  var p=currentProject(),name=O(p.name,'Projekt'),client=O(p.client,'');
  if(client){var re=new RegExp('^\\s*'+String(client).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*(?:[-–—|:]\\s*)','i');var stripped=name.replace(re,'').trim();if(stripped)name=stripped;}
  return name;
}
function badUrl(u){u=String(u||'').trim();if(!/^https?:\/\//i.test(u))return true;return /(?:google\.[^/]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps|google\.[^/]+\/search|bing\.com\/maps|openstreetmap\.org|facebook\.com|instagram\.com|linkedin\.com|mail\.google\.com|prissteel\.com|localhost|127\.0\.0\.1)/i.test(u);}
function documentLike(u,name){u=String(u||'').trim();name=String(name||'').trim();if(badUrl(u))return false;if(/(?:we\.tl|wetransfer|dropbox|sharepoint|onedrive|drive\.google\.com|docs\.google\.com|mega\.|transfer|download)/i.test(u))return true;if(/\.(?:zip|pdf|dwg|dxf|ifc|xlsx?|docx?|rar|7z)(?:[?#]|$)/i.test(u))return true;if(/\.(?:zip|pdf|dwg|dxf|ifc|xlsx?|docx?|rar|7z)$/i.test(name))return true;return false;}
function urls(v){var m=String(v||'').match(/https?:\/\/[^\s<>"']+/ig)||[];return m.map(function(x){return x.replace(/[),.;]+$/,'');});}
function bestDocLink(d){
  d=d||{};var p=d.project||{},u=String(p.drive_folder_url||'').trim();
  if(u&&/drive\.google\.com\/drive\/folders\//i.test(u)&&!badUrl(u))return u;
  if(p.drive_folder_id)return'https://drive.google.com/drive/folders/'+String(p.drive_folder_id).trim();
  var out=[];
  function add(url,score,name){url=String(url||'').trim();if(documentLike(url,name))out.push({url:url,score:score});}
  A(d.files).concat(A(d.projectDocs),A(d.attachmentLinks),A(d.inboxDocs),A(d.docs),A(d.drive&&d.drive.rows)).forEach(function(f){var x=O(f.webContentLink,f.web_view_link,f.webViewLink,f.drive_url,f.file_url,f.url,''),nm=O(f.name,f.filename,f.file_name,'');add(x,/drive\.google\.com\/drive\/folders\//i.test(x)?95:80,nm);});
  [p.project_download_url,p.download_url].forEach(function(x){add(x,70,'');});
  A(d.emails).filter(externalIncoming).forEach(function(m){urls([m.body_text,m.body,m.text,m.snippet,m.subject].filter(Boolean).join('\n')).forEach(function(x){add(x,50,m.subject||'');});});
  out.sort(function(a,b){return b.score-a.score;});return out.length?out[0].url:'';
}
function subjectFor(l){var p=projectLabel();if(l==='de')return'Anfrage | '+p;if(l==='sr')return'Zahtev za ponudu | '+p;if(l==='sq')return'Kerkese per oferte | '+p;return'RFQ | '+p;}
function firstName(v){return String(v||'').trim().split(/\s+/)[0]||'';}
function bodyFor(s){
  var l=lang(s.lang),who=firstName(s.contactName),project=projectLabel(),doc=state.docLink||'[Shto linkun e dokumentacionit]';
  if(l==='de')return 'Guten Tag '+who+',\n\nunser Kunde hat uns um ein Angebot für die Stahlkonstruktion des folgenden Projekts gebeten:\n'+project+'\n\nDie Projektdokumentation können Sie hier herunterladen:\n'+doc+'\n\nAuf Grundlage der Projektdokumentation benötigen wir Ihr Angebot für:\n- Material + Fertigung, EUR/kg\n- Feuerverzinkung, EUR/kg\n- Pulverbeschichtung, EUR/kg\n- Transport\n- Lieferzeit\n- Incoterm\n- Zahlungsbedingungen\n\nMengen und Positionen sind der Projektdokumentation zu entnehmen. Unklarheiten, fehlende Angaben oder technische Abweichungen kennzeichnen Sie im Angebot eindeutig.\n\nMit freundlichen Grüßen\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
  if(l==='sr')return 'Poštovani'+(who?' '+who:'')+',\n\nnaš klijent je od nas zatražio ponudu za čeličnu konstrukciju za sledeći projekat:\n'+project+'\n\nProjektnu dokumentaciju možete preuzeti ovde:\n'+doc+'\n\nNa osnovu projektne dokumentacije dostavite ponudu za:\n- Materijal + izrada, EUR/kg\n- Toplo cinkovanje, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Rok isporuke\n- Incoterm\n- Uslove plaćanja\n\nKoličine i pozicije preuzmite iz projektne dokumentacije. Sve nejasnoće, nedostajuće podatke ili tehnička odstupanja jasno navedite u ponudi.\n\nSrdačan pozdrav,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
  if(l==='sq')return 'Pershendetje'+(who?' '+who:'')+',\n\nBleresi yne na ka kerkuar oferte per konstruksionin e celikut per projektin:\n'+project+'\n\nDokumentacionin e projektit mund ta shkarkoni ketu:\n'+doc+'\n\nBazuar ne dokumentacionin e projektit, na dergoni oferten tuaj per:\n- Material + prodhim, EUR/kg\n- Zinkim i nxehte, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Afati i furnizimit\n- Incoterm\n- Kushtet e pageses\n\nSasite dhe pozicionet duhet te merren nga dokumentacioni i projektit. Çdo paqartesi, mungese ose devijim teknik shenojeni qarte ne oferte.\n\nMe respekt,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
  return 'Dear '+(who||'Sir/Madam')+',\n\nour client has asked us to provide a quotation for the structural steel works for the following project:\n'+project+'\n\nThe project documentation can be downloaded here:\n'+doc+'\n\nBased on the project documentation, send us your quotation for:\n- Material + fabrication, EUR/kg\n- Hot-dip galvanizing, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Lead time\n- Incoterm\n- Payment terms\n\nQuantities and positions are to be taken from the project documentation. Clearly identify any ambiguities, missing information or technical deviations in your quotation.\n\nKind regards,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
}
function gmailUrl(s){return'https://mail.google.com/mail/?view=cm&authuser=sales%40prissteel.com&to='+encodeURIComponent(s.email)+'&su='+encodeURIComponent(subjectFor(lang(s.lang)))+'&body='+encodeURIComponent(bodyFor(s));}
function css(){if(document.getElementById('pst-pf2-rfq-css'))return;var s=document.createElement('style');s.id='pst-pf2-rfq-css';s.textContent='\
#pst-pf2-rfq-draft{margin:0 0 12px;border:1px solid #cfe0e6;background:#fff;border-radius:13px;overflow:hidden}.prfq-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:13px 15px;background:#f6fafb;border-bottom:1px solid #e3ecef}.prfq-head b{display:block;font-size:11px;color:#315f72}.prfq-head span{font-size:8px;color:#7c8a90}.prfq-actions{display:flex;gap:6px;flex-wrap:wrap}.prfq-btn{height:31px;padding:0 10px;border:1px solid #d4e2e7;border-radius:8px;background:#fff;color:#416f82;font-size:8px;font-weight:750;cursor:pointer}.prfq-btn.p{background:#5b9bb3;border-color:#5b9bb3;color:#fff}.prfq-context,.prfq-docs{padding:11px 14px;border-bottom:1px solid #e8eef0}.prfq-context label,.prfq-docs label{display:block;font-size:8px;font-weight:760;color:#60727a;margin-bottom:5px}.prfq-context textarea{width:100%;min-height:92px;resize:vertical;border:1px solid #dce7ea;border-radius:8px;padding:8px 9px;font:9px/1.45 Inter,sans-serif;color:#53636a}.prfq-note{font-size:7.5px;color:#829096;margin-top:5px}.prfq-docrow{display:flex;gap:7px;align-items:center}.prfq-docrow input{flex:1;min-width:0;height:34px;border:1px solid #d8e5e9;border-radius:8px;padding:0 9px;font:8.5px/1.4 Inter,sans-serif;color:#52646c;background:#fff}.prfq-docrow a{height:34px;display:inline-flex;align-items:center;padding:0 10px;border:1px solid #d4e2e7;border-radius:8px;background:#fff;color:#3f7f98;font-size:8px;font-weight:750;text-decoration:none;white-space:nowrap}.prfq-list{padding:0 12px}.prfq-row{display:grid;grid-template-columns:24px minmax(190px,.8fr) minmax(170px,.8fr) 62px minmax(0,1.5fr) auto;gap:8px;align-items:center;padding:10px 2px;border-bottom:1px solid #edf2f3}.prfq-row.off{opacity:.48}.prfq-row input[type=checkbox]{width:15px;height:15px}.prfq-co b{display:block;font-size:9.5px}.prfq-co span,.prfq-contact span{font-size:7.5px;color:#87949a}.prfq-contact b{display:block;font-size:8.5px}.prfq-lang{display:inline-block;text-align:center;border-radius:999px;background:#eaf5f8;color:#3f7f98;padding:3px 6px;font-size:7px;font-weight:800}.prfq-subject{font-size:8px;color:#5e7078;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.prfq-row-actions{display:flex;gap:5px}.prfq-row-actions button,.prfq-row-actions a{height:29px;display:inline-flex;align-items:center;padding:0 8px;border:1px solid #d5e2e6;border-radius:7px;background:#fff;color:#3f7f98;font-size:7.5px;font-weight:700;text-decoration:none;cursor:pointer}.prfq-preview{display:none;grid-column:2/-1;background:#f8fafb;border:1px solid #e3eaed;border-radius:8px;padding:9px;white-space:pre-wrap;font:8px/1.45 Inter,sans-serif;color:#53646b;max-height:360px;overflow:auto}.prfq-row.open .prfq-preview{display:block}.prfq-foot{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 14px;background:#f8fbfc}.prfq-foot span{font-size:8px;color:#6f7d83}.prfq-foot b{font-size:9px;color:#315f72}@media(max-width:980px){.prfq-row{grid-template-columns:24px 1fr 1fr 54px}.prfq-subject{grid-column:2/5}.prfq-row-actions{grid-column:2/5}.prfq-preview{grid-column:2/5}}';document.head.appendChild(s);}
function selectedCount(){var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return 0;return [].slice.call(box.querySelectorAll('[data-prfq-check]:checked')).length;}
function updateCount(){var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return;var x=box.querySelector('[data-prfq-count]');if(x)x.textContent=selectedCount()+' / '+state.suppliers.length+' prodhues te zgjedhur';box.querySelectorAll('.prfq-row').forEach(function(r){var c=r.querySelector('[data-prfq-check]');r.classList.toggle('off',!!c&&!c.checked);});}
function rerenderDraftText(box){
  var doc=box.querySelector('[data-prfq-doc-link]');state.docLink=String(doc&&doc.value||'').trim();
  state.suppliers.forEach(function(s,i){var row=box.querySelector('[data-prfq-row="'+i+'"]');if(!row)return;var p=row.querySelector('.prfq-preview'),a=row.querySelector('[data-prfq-gmail]'),sub=row.querySelector('.prfq-subject'),body=bodyFor(s),subject=subjectFor(lang(s.lang));if(p)p.textContent=body;if(a)a.href=gmailUrl(s);if(sub)sub.textContent=subject;});
}
function render(){
  var host=document.getElementById('pst-pi-body');if(!host||!state.loaded)return false;css();var old=document.getElementById('pst-pf2-rfq-draft');if(old)old.remove();
  var box=document.createElement('section');box.id='pst-pf2-rfq-draft';
  var rows=state.suppliers.map(function(s,i){var sub=subjectFor(lang(s.lang)),body=bodyFor(s);return'<div class="prfq-row" data-prfq-row="'+i+'"><input type="checkbox" data-prfq-check="'+i+'" checked><div class="prfq-co"><b>'+E(s.company)+'</b><span>'+E(s.country||'')+'</span></div><div class="prfq-contact"><b>'+E(s.contactName||'Kontakt')+'</b><span>'+E(s.email)+'</span></div><div><span class="prfq-lang">'+E(lang(s.lang).toUpperCase())+'</span></div><div class="prfq-subject">'+E(sub)+'</div><div class="prfq-row-actions"><button type="button" data-prfq-preview="'+i+'">Preview</button><a target="_blank" rel="noopener" data-prfq-gmail="'+i+'" href="'+E(gmailUrl(s))+'">Hap Gmail</a></div><pre class="prfq-preview">'+E(body)+'</pre></div>';}).join('');
  box.innerHTML='<div class="prfq-head"><div><b>RFQ draft per prodhuesit</b><span>Dokumentacioni i projektit eshte baza per sasite · emaila sipas gjuhes se kontaktit</span></div><div class="prfq-actions"><button type="button" class="prfq-btn" data-prfq-all>Zgjidh te gjithe</button><button type="button" class="prfq-btn" data-prfq-none>Hiq te gjithe</button><button type="button" class="prfq-btn p" data-prfq-refresh>Rifresko draftet</button></div></div><div class="prfq-context"><label>Kerkesa e bleresit · vetem per reference te brendshme</label><textarea data-prfq-context>'+E(state.buyerContext)+'</textarea><div class="prfq-note">Ky tekst nuk perfshihet ne emailin RFQ per prodhuesin. Emaili bazohet vetem ne projekt dhe dokumentacionin qe ndahet me te.</div></div><div class="prfq-docs"><label>Dokumentacioni i projektit · link per shkarkim</label><div class="prfq-docrow"><input type="url" data-prfq-doc-link placeholder="Ngjit linkun e PDF / ZIP / dosjes se projektit" value="'+E(state.docLink)+'"><a data-prfq-doc-open target="_blank" rel="noopener" href="'+E(state.docLink||'#')+'">Hap linkun</a></div><div class="prfq-note"><b>Dokumentacioni eshte burimi teknik:</b> kontrollo qe furnitori ka qasje para dergimit.</div></div><div class="prfq-list">'+(rows||'<div style="padding:18px;font-size:9px;color:#87949a">Nuk u gjet asnje prodhues me email. Kontrollo Partneret / kontaktet e furnitoreve.</div>')+'</div><div class="prfq-foot"><span>Asgje nuk dergohet automatikisht. “Hap Gmail” vetem hap draftin.</span><b data-prfq-count></b></div>';
  host.insertBefore(box,host.firstChild);wire(box);updateCount();return true;
}
function wire(box){
  box.addEventListener('change',function(e){if(e.target&&e.target.matches('[data-prfq-check]'))updateCount();});
  var ta=box.querySelector('[data-prfq-context]');if(ta)ta.addEventListener('input',function(){state.buyerContext=String(ta.value||'').trim().slice(0,4800);});
  var doc=box.querySelector('[data-prfq-doc-link]'),open=box.querySelector('[data-prfq-doc-open]');if(doc)doc.addEventListener('input',function(){state.docLink=String(doc.value||'').trim();if(open)open.href=state.docLink||'#';rerenderDraftText(box);});
  box.querySelector('[data-prfq-all]').onclick=function(){box.querySelectorAll('[data-prfq-check]').forEach(function(x){x.checked=true;});updateCount();};
  box.querySelector('[data-prfq-none]').onclick=function(){box.querySelectorAll('[data-prfq-check]').forEach(function(x){x.checked=false;});updateCount();};
  box.querySelector('[data-prfq-refresh]').onclick=function(){rerenderDraftText(box);};
  box.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-prfq-preview]');if(b){var r=box.querySelector('[data-prfq-row="'+b.getAttribute('data-prfq-preview')+'"]');if(r)r.classList.toggle('open');return;}var a=e.target.closest&&e.target.closest('[data-prfq-gmail]');if(a&&(!state.docLink||badUrl(state.docLink)||!documentLike(state.docLink,''))){e.preventDefault();e.stopPropagation();alert('Shto nje link valid te dokumentacionit te projektit para se te hapesh draftin ne Gmail.');}},true);
}
async function load(id){
  id=String(id||pid());if(!id)return false;state.projectId=id;
  var d=data();if(!d||String(d.project&&d.project.id)!==id){if(!window.PSTProjectDataIntegrity)return false;d=await window.PSTProjectDataIntegrity.load(id);window.__pstIntegrityLastData=d;}
  state.data=d;state.bom=A(d.bom);if(!state.bom.length){try{state.bom=A(await db('bom_items?project_id=eq.'+enc(id)+'&select=*&order=id.asc&limit=5000'));}catch(e){state.bom=[];}}
  state.buyerContext=buildBuyerContext(d);state.docLink=bestDocLink(d);state.suppliers=await loadSuppliers();state.loaded=true;return true;
}
async function open(id){
  id=String(id||pid());if(!id)return false;try{await load(id);if(!state.bom.length){alert('Ky projekt nuk ka BOM te ruajtur.');return false;}if(window.PSTProjectFirstV2&&window.PSTProjectFirstV2.render)window.PSTProjectFirstV2.render('procurement');setTimeout(render,0);setTimeout(render,120);return true;}catch(e){console.error('Project-first RFQ draft:',e);alert('RFQ draft nuk u pergatit: '+(e.message||e));return false;}
}
function replaceLegacyButton(){var host=document.getElementById('pst-pi-body');if(!host)return;host.querySelectorAll('[data-pf2-action="rfq"]').forEach(function(b){b.removeAttribute('data-pf2-action');b.setAttribute('data-prfq-open','1');b.textContent='Pergatit / hap RFQ';});}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-prfq-open]');if(b){e.preventDefault();open();return;}var t=e.target.closest&&e.target.closest('[data-pf2-tab="procurement"]');if(t){setTimeout(function(){replaceLegacyButton();if(state.loaded&&state.projectId===pid()&&state.bom.length)render();},0);setTimeout(replaceLegacyButton,100);}},true);
document.addEventListener('pst:bom-saved',function(e){var id=e&&e.detail&&e.detail.projectId||pid();setTimeout(function(){open(id);},0);});
document.addEventListener('pst:modules-ready',function(){setTimeout(replaceLegacyButton,0);},{once:true});
window.PSTProjectFirstRfqDraftV1={open:open,load:load,render:render,buildBuyerContext:buildBuyerContext,bodyFor:bodyFor,subjectFor:subjectFor,totalKg:totalKg,bestDocLink:bestDocLink,_state:state};
})();
