/* PRISTEEL project-first RFQ draft v1
 * Saved BOM -> native RFQ draft preparation inside Project-first.
 * Drafts use saved BOM, project metadata and editable buyer-email context.
 * Nothing is sent and nothing is logged as sent until an explicit user action.
 */
(function(){
'use strict';
if(window.__pstProjectFirstRfqDraftV1)return;
window.__pstProjectFirstRfqDraftV1=true;

var state={projectId:'',data:null,bom:[],suppliers:[],buyerContext:'',loaded:false};
var FIXED=['aktiva','kentaur','eurosteel','sector construction'];

function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function O(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function fmt(v,d){return n(v).toLocaleString('de-DE',{minimumFractionDigits:d==null?2:d,maximumFractionDigits:d==null?2:d});}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function data(){return window.__pstIntegrityLastData||null;}
function pid(){var d=data();return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');}
function db(q,method,body){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return window.supaFetch(q,method,body);}
function cleanText(v,max){
  var t=String(v||'').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/\r/g,'').replace(/\u00a0/g,' ');
  t=t.split(/\n[-_]{2,}\s*(?:Original Message|Forwarded message|Ursprüngliche Nachricht|Poruka prosleđena)/i)[0];
  t=t.split(/\nOn .{0,180} wrote:\s*$/im)[0];
  t=t.replace(/^\s*(From|Von|Od|Nga|Sent|Gesendet|Poslato|Dërguar|To|An|Za|Për|Subject|Betreff|Predmet|Subjekti):.*$/gim,'');
  t=t.replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  if(max&&t.length>max)t=t.slice(0,max).trim()+'…';
  return t;
}
function incomingEmails(d){
  var ms=A(d&&d.emails).filter(function(m){
    var dir=N(m&&m.direction),from=N(O(m&&m.from_email,m&&m.sender,m&&m.from,''));
    if(dir==='outgoing'||dir==='sent')return false;
    if(from.indexOf('prissteel com')>-1)return false;
    return true;
  });
  return ms.sort(function(a,b){return new Date(O(b.sent_at,b.created_at,0)).getTime()-new Date(O(a.sent_at,a.created_at,0)).getTime();});
}
function buildBuyerContext(d){
  var p=d&&d.project||{},parts=[];
  var notes=cleanText(O(p.description,p.notes,''),1600);
  if(notes)parts.push(notes);
  incomingEmails(d).slice(0,3).forEach(function(m){
    var txt=cleanText(O(m.body_text,m.body,m.text,m.snippet,''),1800);
    if(!txt)return;
    var subject=O(m.subject,'Email i bleresit');
    parts.push('['+subject+']\n'+txt);
  });
  var seen={},out=[];
  parts.forEach(function(x){var k=N(x).slice(0,220);if(!k||seen[k])return;seen[k]=1;out.push(x);});
  return cleanText(out.join('\n\n'),4800);
}
function lang(v){v=N(v);if(v==='de'||v.indexOf('german')>-1||v.indexOf('deutsch')>-1)return'de';if(v==='sq'||v.indexOf('alban')>-1)return'sq';if(v==='sr'||v==='bs'||v==='hr'||v.indexOf('serb')>-1||v.indexOf('bosn')>-1||v.indexOf('croat')>-1)return'sr';return'en';}
function isManufacturer(p){
  var cats=A(p&&p.categories).map(N),name=N(p&&p.name);
  if(cats.indexOf('fabrication')>-1)return true;
  return FIXED.some(function(x){return name.indexOf(x)>-1;});
}
async function loadSuppliers(){
  var partners=[];try{partners=await db('partners?relation=cs.{supplier}&stage=eq.active&select=id,name,country,city,categories,business_type&order=importance.desc&limit=1000')||[];}catch(e){partners=[];}
  var ids=A(partners).map(function(p){return p.id;}).filter(Boolean),contacts=[];
  if(ids.length){try{contacts=await db('partner_contacts?partner_id=in.('+ids.join(',')+')&select=partner_id,full_name,email,language,is_primary&order=is_primary.desc&limit=3000')||[];}catch(e){contacts=[];}}
  var all=[];
  A(partners).forEach(function(p){
    A(contacts).filter(function(c){return String(c.partner_id)===String(p.id)&&String(c.email||'').trim();}).forEach(function(c){
      all.push({partnerId:p.id,company:p.name||'Furnitor',country:[p.city,p.country].filter(Boolean).join(', '),categories:A(p.categories),manufacturer:isManufacturer(p),contactName:c.full_name||'',email:c.email||'',lang:lang(c.language||'en'),primary:!!c.is_primary});
    });
  });
  var manufacturers=all.filter(function(x){return x.manufacturer;});
  if(manufacturers.length)return manufacturers;
  if(all.length)return all;
  var legacy=[];try{if(typeof suppliers!=='undefined'&&Array.isArray(suppliers))legacy=suppliers;}catch(e){}
  legacy.forEach(function(s){A(s.contacts).forEach(function(c){if(c&&c.email)all.push({partnerId:'',company:s.name||'Furnitor',country:s.country||'',categories:[],manufacturer:s.cat!=='rawmat',contactName:c.name||'',email:c.email,lang:lang(s.lang||'en'),primary:true});});});
  return all.filter(function(x){return x.manufacturer;}).length?all.filter(function(x){return x.manufacturer;}):all;
}
function currentProject(){return state.data&&state.data.project||{};}
function bomRows(){return A(state.bom);}
function totalKg(){return +bomRows().reduce(function(s,r){return s+n(r.kg);},0).toFixed(2);}
function projectInfo(){
  var p=currentProject();return{name:O(p.name,'Projekt'),client:O(p.client,''),ref:O(p.ref,p.reference,''),location:O(p.location,''),deadline:O(p.deadline,''),buyer:state.buyerContext||''};
}
function bomLines(l){
  return bomRows().map(function(r,i){
    var vals=[];vals.push((i+1)+'. '+O(r.profile,r.description,r.name,'Pozicion'));
    if(O(r.dim,r.dimension,''))vals.push(O(r.dim,r.dimension,''));
    if(O(r.grade,r.material,''))vals.push(O(r.grade,r.material,''));
    if(n(r.pcs)>0&&n(r.pcs)!==1)vals.push((l==='de'?'Stk. ':l==='sr'?'Kom. ':l==='sq'?'Cope ':'Pcs. ')+n(r.pcs));
    if(n(r.len_mm||r.lenMm)>0)vals.push((l==='de'?'Länge ':l==='sr'?'Dužina ':l==='sq'?'Gjatesia ':'Length ')+n(r.len_mm||r.lenMm)+' mm');
    vals.push(fmt(r.kg,2)+' kg');
    if(O(r.std,''))vals.push(O(r.std,''));
    if(O(r.cert,''))vals.push(O(r.cert,''));
    if(O(r.surface,''))vals.push(O(r.surface,''));
    return vals.join(' | ');
  }).join('\n');
}
function infoLines(l,c){
  var a=[];
  if(c.client)a.push((l==='de'?'Kunde':l==='sr'?'Klijent':l==='sq'?'Klienti':'Client')+': '+c.client);
  if(c.ref)a.push((l==='de'?'Referenz':l==='sr'?'Referenca':l==='sq'?'Referenca':'Reference')+': '+c.ref);
  if(c.location)a.push((l==='de'?'Projektort':l==='sr'?'Lokacija':l==='sq'?'Lokacioni':'Project location')+': '+c.location);
  if(c.deadline)a.push((l==='de'?'Gewünschter Termin':l==='sr'?'Traženi rok':l==='sq'?'Afati i kerkuar':'Requested deadline')+': '+c.deadline);
  return a.join('\n');
}
function subjectFor(l,c){
  var ref=c.ref?' | '+c.ref:'';
  if(l==='de')return'Anfrage / RFQ | '+c.name+ref;
  if(l==='sr')return'Zahtev za ponudu | '+c.name+ref;
  if(l==='sq')return'Kerkese per oferte | '+c.name+ref;
  return'RFQ | '+c.name+ref;
}
function bodyFor(s,buyerOverride){
  var l=lang(s.lang),c=projectInfo(),buyer=cleanText(buyerOverride!=null?buyerOverride:c.buyer,4800),info=infoLines(l,c),list=bomLines(l),tot=fmt(totalKg(),2),who=s.contactName||'';
  if(l==='de')return 'Guten Tag '+(who||'')+',\n\nbitte senden Sie uns Ihr Angebot für die Lieferung und Fertigung der Stahlkonstruktion für folgendes Projekt. Die Materialmengen laut freigegebener BOM sind unten vollständig aufgeführt.\n\nProjekt: '+c.name+'\n'+info+(buyer?'\n\nZusätzliche Projektangaben aus der Anfrage des Kunden:\n'+buyer:'')+'\n\nBOM / Stahlmengen:\n'+list+'\n\nGesamtgewicht BOM: '+tot+' kg\n\nBitte weisen Sie in Ihrem Angebot getrennt aus, soweit angeboten:\n- Material + Fertigung, EUR/kg\n- Feuerverzinkung, EUR/kg\n- Pulverbeschichtung, EUR/kg\n- Transport\n- Lieferzeit\n- Incoterm\n- Zahlungsbedingungen\n\nBitte kennzeichnen Sie technische Annahmen oder Abweichungen ausdrücklich. Es wurden keine nicht im Kundendokument bestätigten Normen oder Zertifikate ergänzt.\n\nMit freundlichen Grüßen\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com';
  if(l==='sr')return 'Poštovani'+(who?' '+who:'')+',\n\nmolimo Vas da nam dostavite ponudu za isporuku i izradu čelične konstrukcije za projekat ispod. Kompletne količine prema odobrenom BOM-u navedene su u nastavku.\n\nProjekat: '+c.name+'\n'+info+(buyer?'\n\nDodatne informacije o projektu iz zahteva kupca:\n'+buyer:'')+'\n\nBOM / količine čelika:\n'+list+'\n\nUkupna težina BOM-a: '+tot+' kg\n\nMolimo da u ponudi odvojeno navedete, ukoliko nudite:\n- Materijal + izrada, EUR/kg\n- Toplo cinkovanje, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Rok isporuke\n- Incoterm\n- Uslove plaćanja\n\nMolimo jasno označite sve tehničke pretpostavke ili odstupanja. Nisu dodati standardi ili sertifikati koji nisu potvrđeni u dokumentaciji kupca.\n\nSrdačan pozdrav,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com';
  if(l==='sq')return 'Pershendetje'+(who?' '+who:'')+',\n\nJu lutem na dergoni oferten tuaj per furnizimin dhe prodhimin e konstruksionit te celikut per projektin me poshte. Sasite e plota sipas BOM-it te aprovuar jane perfshire me poshte.\n\nProjekti: '+c.name+'\n'+info+(buyer?'\n\nInformacion shtese per projektin nga kerkesa e bleresit:\n'+buyer:'')+'\n\nBOM / sasite e celikut:\n'+list+'\n\nPesha totale e BOM: '+tot+' kg\n\nJu lutem paraqitni vecmas, kur i ofroni:\n- Material + prodhim, EUR/kg\n- Zinkim i nxehte, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Afati i furnizimit\n- Incoterm\n- Kushtet e pageses\n\nJu lutem shenoni qarte cdo supozim teknik ose devijim. Nuk jane shtuar standarde apo certifikata qe nuk jane konfirmuar ne dokumentacionin e bleresit.\n\nMe respekt,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com';
  return 'Dear '+(who||'Sir/Madam')+',\n\nplease send us your quotation for the supply and fabrication of the structural steel for the project below. The complete quantities from the approved BOM are listed below.\n\nProject: '+c.name+'\n'+info+(buyer?'\n\nAdditional project information from the buyer request:\n'+buyer:'')+'\n\nBOM / steel quantities:\n'+list+'\n\nTotal BOM weight: '+tot+' kg\n\nPlease quote separately, where offered:\n- Material + fabrication, EUR/kg\n- Hot-dip galvanizing, EUR/kg\n- Powder coating, EUR/kg\n- Transport\n- Lead time\n- Incoterm\n- Payment terms\n\nPlease clearly identify any technical assumptions or deviations. No standards or certificates not confirmed in the buyer documentation have been added.\n\nKind regards,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com';
}
function gmailUrl(s,buyer){var c=projectInfo(),sub=subjectFor(lang(s.lang),c),body=bodyFor(s,buyer);return'https://mail.google.com/mail/?view=cm&authuser=sales%40prissteel.com&to='+encodeURIComponent(s.email)+'&su='+encodeURIComponent(sub)+'&body='+encodeURIComponent(body);}
function css(){if(document.getElementById('pst-pf2-rfq-css'))return;var s=document.createElement('style');s.id='pst-pf2-rfq-css';s.textContent='\
#pst-pf2-rfq-draft{margin:0 0 12px;border:1px solid #cfe0e6;background:#fff;border-radius:13px;overflow:hidden}.prfq-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:13px 15px;background:#f6fafb;border-bottom:1px solid #e3ecef}.prfq-head b{display:block;font-size:11px;color:#315f72}.prfq-head span{font-size:8px;color:#7c8a90}.prfq-actions{display:flex;gap:6px;flex-wrap:wrap}.prfq-btn{height:31px;padding:0 10px;border:1px solid #d4e2e7;border-radius:8px;background:#fff;color:#416f82;font-size:8px;font-weight:750;cursor:pointer}.prfq-btn.p{background:#5b9bb3;border-color:#5b9bb3;color:#fff}.prfq-context{padding:11px 14px;border-bottom:1px solid #e8eef0}.prfq-context label{display:block;font-size:8px;font-weight:760;color:#60727a;margin-bottom:5px}.prfq-context textarea{width:100%;min-height:92px;resize:vertical;border:1px solid #dce7ea;border-radius:8px;padding:8px 9px;font:9px/1.45 Inter,sans-serif;color:#53636a}.prfq-note{font-size:7.5px;color:#829096;margin-top:5px}.prfq-list{padding:0 12px}.prfq-row{display:grid;grid-template-columns:24px minmax(190px,.8fr) minmax(170px,.8fr) 62px minmax(0,1.5fr) auto;gap:8px;align-items:center;padding:10px 2px;border-bottom:1px solid #edf2f3}.prfq-row.off{opacity:.48}.prfq-row input[type=checkbox]{width:15px;height:15px}.prfq-co b{display:block;font-size:9.5px}.prfq-co span,.prfq-contact span{font-size:7.5px;color:#87949a}.prfq-contact b{display:block;font-size:8.5px}.prfq-lang{display:inline-block;text-align:center;border-radius:999px;background:#eaf5f8;color:#3f7f98;padding:3px 6px;font-size:7px;font-weight:800}.prfq-subject{font-size:8px;color:#5e7078;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.prfq-row-actions{display:flex;gap:5px}.prfq-row-actions button,.prfq-row-actions a{height:29px;display:inline-flex;align-items:center;padding:0 8px;border:1px solid #d5e2e6;border-radius:7px;background:#fff;color:#3f7f98;font-size:7.5px;font-weight:700;text-decoration:none;cursor:pointer}.prfq-preview{display:none;grid-column:2/-1;background:#f8fafb;border:1px solid #e3eaed;border-radius:8px;padding:9px;white-space:pre-wrap;font:8px/1.45 Inter,sans-serif;color:#53646b;max-height:360px;overflow:auto}.prfq-row.open .prfq-preview{display:block}.prfq-foot{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:10px 14px;background:#f8fbfc}.prfq-foot span{font-size:8px;color:#6f7d83}.prfq-foot b{font-size:9px;color:#315f72}@media(max-width:980px){.prfq-row{grid-template-columns:24px 1fr 1fr 54px}.prfq-subject{grid-column:2/5}.prfq-row-actions{grid-column:2/5}.prfq-preview{grid-column:2/5}}';document.head.appendChild(s);}
function selectedCount(){var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return 0;return [].slice.call(box.querySelectorAll('[data-prfq-check]:checked')).length;}
function updateCount(){var box=document.getElementById('pst-pf2-rfq-draft');if(!box)return;var x=box.querySelector('[data-prfq-count]');if(x)x.textContent=selectedCount()+' / '+state.suppliers.length+' prodhues te zgjedhur';box.querySelectorAll('.prfq-row').forEach(function(r){var c=r.querySelector('[data-prfq-check]');r.classList.toggle('off',!!c&&!c.checked);});}
function render(){
  var host=document.getElementById('pst-pi-body');if(!host||!state.loaded)return false;css();var old=document.getElementById('pst-pf2-rfq-draft');if(old)old.remove();
  var c=projectInfo(),box=document.createElement('section');box.id='pst-pf2-rfq-draft';
  var rows=state.suppliers.map(function(s,i){var sub=subjectFor(lang(s.lang),c),body=bodyFor(s,state.buyerContext);return'<div class="prfq-row" data-prfq-row="'+i+'"><input type="checkbox" data-prfq-check="'+i+'" checked><div class="prfq-co"><b>'+E(s.company)+'</b><span>'+E(s.country||'')+'</span></div><div class="prfq-contact"><b>'+E(s.contactName||'Kontakt')+'</b><span>'+E(s.email)+'</span></div><div><span class="prfq-lang">'+E(lang(s.lang).toUpperCase())+'</span></div><div class="prfq-subject">'+E(sub)+'</div><div class="prfq-row-actions"><button type="button" data-prfq-preview="'+i+'">Preview</button><a target="_blank" rel="noopener" data-prfq-gmail="'+i+'" href="'+E(gmailUrl(s,state.buyerContext))+'">Hap Gmail</a></div><pre class="prfq-preview">'+E(body)+'</pre></div>';}).join('');
  box.innerHTML='<div class="prfq-head"><div><b>RFQ draft nga BOM i ruajtur</b><span>'+bomRows().length+' pozicione · '+fmt(totalKg(),2)+' kg · emaila sipas gjuhes se kontaktit</span></div><div class="prfq-actions"><button type="button" class="prfq-btn" data-prfq-all>Zgjidh te gjithe</button><button type="button" class="prfq-btn" data-prfq-none>Hiq te gjithe</button><button type="button" class="prfq-btn p" data-prfq-refresh>Rifresko draftet</button></div></div><div class="prfq-context"><label>Detajet shtese nga bleresi qe do te perfshihen ne RFQ</label><textarea data-prfq-context>'+E(state.buyerContext)+'</textarea><div class="prfq-note">Nxirren nga emailat hyrëse te lidhura me projektin. Mund t’i redaktosh para hapjes ne Gmail. BOM-i dhe pesha merren nga BOM-i i ruajtur.</div></div><div class="prfq-list">'+(rows||'<div style="padding:18px;font-size:9px;color:#87949a">Nuk u gjet asnje prodhues me email. Kontrollo Partneret / kontaktet e furnitoreve.</div>')+'</div><div class="prfq-foot"><span>Asgje nuk dergohet automatikisht. “Hap Gmail” vetem hap draftin. RFQ regjistrohet si i derguar vetem me veprim eksplicit.</span><b data-prfq-count></b></div>';
  host.insertBefore(box,host.firstChild);wire(box);updateCount();return true;
}
function rerenderDraftText(box){state.buyerContext=cleanText((box.querySelector('[data-prfq-context]')||{}).value||'',4800);state.suppliers.forEach(function(s,i){var row=box.querySelector('[data-prfq-row="'+i+'"]');if(!row)return;var p=row.querySelector('.prfq-preview'),a=row.querySelector('[data-prfq-gmail]'),sub=row.querySelector('.prfq-subject');var body=bodyFor(s,state.buyerContext),subject=subjectFor(lang(s.lang),projectInfo());if(p)p.textContent=body;if(a)a.href=gmailUrl(s,state.buyerContext);if(sub)sub.textContent=subject;});}
function wire(box){
  box.addEventListener('change',function(e){if(e.target&&e.target.matches('[data-prfq-check]'))updateCount();});
  var ta=box.querySelector('[data-prfq-context]');if(ta)ta.addEventListener('input',function(){rerenderDraftText(box);});
  box.querySelector('[data-prfq-all]').onclick=function(){box.querySelectorAll('[data-prfq-check]').forEach(function(x){x.checked=true;});updateCount();};
  box.querySelector('[data-prfq-none]').onclick=function(){box.querySelectorAll('[data-prfq-check]').forEach(function(x){x.checked=false;});updateCount();};
  box.querySelector('[data-prfq-refresh]').onclick=function(){rerenderDraftText(box);};
  box.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-prfq-preview]');if(b){var r=box.querySelector('[data-prfq-row="'+b.getAttribute('data-prfq-preview')+'"]');if(r)r.classList.toggle('open');return;}});
}
async function load(id){
  id=String(id||pid());if(!id)return false;state.projectId=id;
  var d=data();if(!d||String(d.project&&d.project.id)!==id){if(!window.PSTProjectDataIntegrity)return false;d=await window.PSTProjectDataIntegrity.load(id);window.__pstIntegrityLastData=d;}
  state.data=d;state.bom=A(d.bom);if(!state.bom.length){try{state.bom=A(await db('bom_items?project_id=eq.'+enc(id)+'&select=*&order=id.asc&limit=5000'));}catch(e){state.bom=[];}}
  state.buyerContext=buildBuyerContext(d);state.suppliers=await loadSuppliers();state.loaded=true;return true;
}
async function open(id){
  id=String(id||pid());if(!id)return false;try{await load(id);if(!state.bom.length){alert('Ky projekt nuk ka BOM te ruajtur.');return false;}if(window.PSTProjectFirstV2&&window.PSTProjectFirstV2.render)window.PSTProjectFirstV2.render('procurement');setTimeout(render,0);setTimeout(render,120);return true;}catch(e){console.error('Project-first RFQ draft:',e);alert('RFQ draft nuk u pergatit: '+(e.message||e));return false;}
}
function replaceLegacyButton(){
  var host=document.getElementById('pst-pi-body');if(!host)return;host.querySelectorAll('[data-pf2-action="rfq"]').forEach(function(b){b.removeAttribute('data-pf2-action');b.setAttribute('data-prfq-open','1');b.textContent='Pergatit / hap RFQ';});
}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-prfq-open]');if(b){e.preventDefault();open();return;}var t=e.target.closest&&e.target.closest('[data-pf2-tab="procurement"]');if(t){setTimeout(function(){replaceLegacyButton();if(state.loaded&&state.projectId===pid()&&state.bom.length)render();},0);setTimeout(replaceLegacyButton,100);}},true);
document.addEventListener('pst:bom-saved',function(e){var id=e&&e.detail&&e.detail.projectId||pid();setTimeout(function(){open(id);},0);});
document.addEventListener('pst:modules-ready',function(){setTimeout(replaceLegacyButton,0);},{once:true});
window.PSTProjectFirstRfqDraftV1={open:open,load:load,render:render,buildBuyerContext:buildBuyerContext,bodyFor:bodyFor,subjectFor:subjectFor,totalKg:totalKg,_state:state};
})();
