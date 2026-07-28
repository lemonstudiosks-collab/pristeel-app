// ═══════════════════════════════════════════════════════════════
// KONTRATAT — sistem me 3 kategori (Shitjes / Prodhimit / NDA)
// ═══════════════════════════════════════════════════════════════
var ctrFileData={sale:null,prod:null,nda:null};
var ctrGeneratedHtml={sale:null,prod:null,nda:null};
var ctrCurrentFilter='all';

function ctrSwitchTab(tab){
  ['sale','prod','nda'].forEach(function(t){
    var v=document.getElementById('ctr-view-'+t); if(v) v.style.display=(t===tab?'':'none');
    var b=document.getElementById('ctr-tab-'+t); if(b) b.style.background=(t===tab?'var(--bronze)':'');
    if(b) b.style.color=(t===tab?'#fff':'');
    if(b) b.style.borderColor=(t===tab?'var(--bronze)':'');
  });
}

function ctrHandleFile(f,cat){
  if(!f)return;
  var statusEl=document.getElementById((cat==='sale'?'cs':cat==='prod'?'cp':'cn')+'-file-status');
  statusEl.textContent='Duke lexuar...';
  var r=new FileReader();
  r.onload=function(e){
    ctrFileData[cat]={name:f.name,type:f.type,base64:e.target.result};
    statusEl.textContent='✓ '+f.name+' ('+Math.round(f.size/1024)+' KB)';
  };
  r.onerror=function(){statusEl.textContent='Gabim gjatë leximit të skedarit.';};
  r.readAsDataURL(f);
}

// Kur plotësohet vlera totale e kontratës, llogarit automatikisht çmimin/kg nëse sasia (kg) është dhënë
function ctrCalcFromValue(cat){
  var p=cat==='sale'?'cs':cat==='prod'?'cp':'cn';
  var qtyEl=document.getElementById(p+'-qty'), valEl=document.getElementById(p+'-value'), priceEl=document.getElementById(p+'-priceperkg');
  if(!qtyEl||!valEl||!priceEl) return;
  var qty=parseFloat(qtyEl.value)||0, val=parseFloat(valEl.value)||0;
  if(qty>0 && val>0) priceEl.value=(val/qty).toFixed(2);
}
function ctrEsc(s){ return (s||'').toString().replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function ctrFmt(n){ n=parseFloat(n)||0; return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function ctrPayTermsHtml(txt){
  return (txt||'').split('\n').filter(function(l){return l.trim();}).map(function(l){return '<div style="margin-bottom:4px">• '+ctrEsc(l)+'</div>';}).join('');
}

// ── KONTRATA E SHITJES (Werkvertrag / Sales Contract) ──
function ctrBuildSale(lang,d){
  var todayStr=d.date?d.date.split('-').reverse().join('.'):'';
  if(lang==='en'){
    return '<div style="font-family:Arial,sans-serif;line-height:1.55">'
    +'<h2 style="text-align:center;margin-bottom:2px">WORK CONTRACT</h2>'
    +'<div style="text-align:center;color:#666;margin-bottom:18px">Supply of Steel Structures — Offer '+ctrEsc(d.offernr)+'</div>'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><strong>CONTRACTOR</strong><br>PRISteel Sh.p.k.<br>Rr. Tringe Smajli nr. 16<br>10000 Pristina, Kosovo<br>sales@prissteel.com</div>'
    +'<div><strong>CLIENT</strong><br>'+ctrEsc(d.company)+'<br>'+ctrEsc(d.address)+'<br>Contact: '+ctrEsc(d.contact)+'<br>'+ctrEsc(d.email)+'</div></div>'
    +'<p><strong>Project:</strong> '+ctrEsc(d.project)+' &nbsp; <strong>Delivery place:</strong> '+ctrEsc(d.location)+'<br><strong>Date:</strong> '+todayStr+'</p>'
    +'<h3>§1 Subject of Contract</h3><p>The Contractor undertakes to manufacture, coat, and deliver the steel structures described below to the Client, in accordance with EN 1090 execution standards.</p>'
    +'<table style="width:100%;border-collapse:collapse;margin:10px 0" border="1" cellpadding="6"><tr style="background:#f2f2f2"><th>Description</th><th>Quantity</th><th>Unit price</th><th>Total</th></tr>'
    +'<tr><td>Steel structure manufacturing</td><td>'+ctrFmt(d.qty)+' kg</td><td>'+ctrFmt(d.priceperkg)+' EUR/kg</td><td>'+ctrFmt(d.value)+' EUR</td></tr></table>'
    +'<h3>§2 Delivery Terms</h3><p>Incoterms '+ctrEsc(d.incoterm)+', delivery to '+ctrEsc(d.location)+'.</p>'
    +'<h3>§3 Payment Terms</h3>'+ctrPayTermsHtml(d.payterms)
    +'<h3>§4 Warranty</h3><p>The Contractor warrants the delivered components against material and manufacturing defects for a period of 5 years and 4 months from formal acceptance.</p>'
    +'<h3>§5 Governing Law</h3><p>This contract is governed by German law; place of jurisdiction is Hamburg, Germany.</p>'
    +'<div style="display:flex;justify-content:space-between;margin-top:50px"><div>____________________<br>Oltian Vllahiu, CEO<br>PRISteel Sh.p.k.</div><div>____________________<br>'+ctrEsc(d.contact)+'<br>'+ctrEsc(d.company)+'</div></div>'
    +'</div>';
  }
  if(lang==='de'){
    return '<div style="font-family:Arial,sans-serif;line-height:1.55">'
    +'<h2 style="text-align:center;margin-bottom:2px">WERKVERTRAG</h2>'
    +'<div style="text-align:center;color:#666;margin-bottom:18px">Lieferung von Stahlkonstruktionen — Angebot '+ctrEsc(d.offernr)+'</div>'
    +'<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><strong>AUFTRAGNEHMER</strong><br>PRISteel Sh.p.k.<br>Rr. Tringe Smajli nr. 16<br>10000 Pristina, Kosovo<br>sales@prissteel.com<br>Vertreten durch: Oltian Vllahiu, CEO</div>'
    +'<div><strong>AUFTRAGGEBER</strong><br>'+ctrEsc(d.company)+'<br>'+ctrEsc(d.address)+'<br>Kontakt: '+ctrEsc(d.contact)+'<br>'+ctrEsc(d.email)+'</div></div>'
    +'<p><strong>Projekt:</strong> '+ctrEsc(d.project)+' &nbsp; <strong>Bauort:</strong> '+ctrEsc(d.location)+'<br><strong>Datum:</strong> Pristina, '+todayStr+'</p>'
    +'<h3>§ 1 – Vertragsgegenstand</h3><p>Der Auftragnehmer verpflichtet sich gegenüber dem Auftraggeber, die nachfolgend beschriebenen Stahlbauteile herzustellen, zu beschichten und gemäß der vereinbarten Lieferbedingung zu liefern, gemäß EN 1090.</p>'
    +'<table style="width:100%;border-collapse:collapse;margin:10px 0" border="1" cellpadding="6"><tr style="background:#f2f2f2"><th>Beschreibung</th><th>Menge</th><th>Einzelpreis</th><th>Gesamtpreis</th></tr>'
    +'<tr><td>Herstellung von Stahlkonstruktionen</td><td>'+ctrFmt(d.qty)+' kg</td><td>'+ctrFmt(d.priceperkg)+' EUR/kg</td><td>'+ctrFmt(d.value)+' EUR</td></tr></table>'
    +'<h3>§ 2 – Lieferbedingungen</h3><p>Lieferbedingung: '+ctrEsc(d.incoterm)+', Lieferung nach '+ctrEsc(d.location)+', gemäß Incoterms® 2020.</p>'
    +'<h3>§ 3 – Zahlungsbedingungen</h3>'+ctrPayTermsHtml(d.payterms)
    +'<h3>§ 4 – Gewährleistung</h3><p>Der Auftragnehmer gewährleistet, dass alle gelieferten Bauteile frei von Material- und Herstellungsfehlern sind. Gewährleistungsfrist: 5 Jahre und 4 Monate ab dem Datum der förmlichen Abnahme.</p>'
    +'<h3>§ 5 – Anwendbares Recht</h3><p>Dieser Vertrag unterliegt dem Recht der Bundesrepublik Deutschland. Gerichtsstand: Hamburg, Deutschland.</p>'
    +'<div style="display:flex;justify-content:space-between;margin-top:50px"><div>____________________<br>Oltian Vllahiu, CEO<br>PRISteel Sh.p.k.</div><div>____________________<br>'+ctrEsc(d.contact)+'<br>'+ctrEsc(d.company)+'</div></div>'
    +'</div>';
  }
  // Albanian (default / fallback for sr)
  return '<div style="font-family:Arial,sans-serif;line-height:1.55">'
  +'<h2 style="text-align:center;margin-bottom:2px">KONTRATË SHITJEJE</h2>'
  +'<div style="text-align:center;color:#666;margin-bottom:18px">Furnizim me Konstruksione Metalike — Oferta '+ctrEsc(d.offernr)+'</div>'
  +'<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><strong>SHITËSI</strong><br>PRISteel Sh.p.k.<br>Rr. Tringe Smajli nr. 16<br>10000 Prishtinë, Kosovë<br>sales@prissteel.com<br>Përfaqësuar nga: Oltian Vllahiu, CEO</div>'
  +'<div><strong>BLERËSI</strong><br>'+ctrEsc(d.company)+'<br>'+ctrEsc(d.address)+'<br>Kontakti: '+ctrEsc(d.contact)+'<br>'+ctrEsc(d.email)+'</div></div>'
  +'<p><strong>Projekti:</strong> '+ctrEsc(d.project)+' &nbsp; <strong>Vendi i dorëzimit:</strong> '+ctrEsc(d.location)+'<br><strong>Data:</strong> Prishtinë, '+todayStr+'</p>'
  +'<h3>Neni 1 – Objekti i Kontratës</h3><p>Shitësi merr përsipër prodhimin, ngjyrosjen dhe dorëzimin e konstruksioneve metalike të përshkruara më poshtë, sipas normave EN 1090.</p>'
  +'<table style="width:100%;border-collapse:collapse;margin:10px 0" border="1" cellpadding="6"><tr style="background:#f2f2f2"><th>Përshkrimi</th><th>Sasia</th><th>Çmimi/njësi</th><th>Totali</th></tr>'
  +'<tr><td>Prodhim konstruksioni metalik</td><td>'+ctrFmt(d.qty)+' kg</td><td>'+ctrFmt(d.priceperkg)+' EUR/kg</td><td>'+ctrFmt(d.value)+' EUR</td></tr></table>'
  +'<h3>Neni 2 – Kushtet e Dorëzimit</h3><p>Kushti i dorëzimit: '+ctrEsc(d.incoterm)+', dorëzim në '+ctrEsc(d.location)+', sipas Incoterms® 2020.</p>'
  +'<h3>Neni 3 – Kushtet e Pagesës</h3>'+ctrPayTermsHtml(d.payterms)
  +'<h3>Neni 4 – Garancia</h3><p>Shitësi garanton se elementet e dorëzuara janë të lira nga defekte materiali dhe prodhimi. Afati i garancisë: 5 vite e 4 muaj nga data e pranimit formal.</p>'
  +'<h3>Neni 5 – E Drejta e Aplikueshme</h3><p>Kjo kontratë rregullohet nga e drejta e vendit të dorëzimit, përveç nëse rënë dakord ndryshe me shkrim.</p>'
  +'<div style="display:flex;justify-content:space-between;margin-top:50px"><div>____________________<br>Oltian Vllahiu, CEO<br>PRISteel Sh.p.k.</div><div>____________________<br>'+ctrEsc(d.contact)+'<br>'+ctrEsc(d.company)+'</div></div>'
  +'</div>';
}

// ── KONTRATA E PRODHIMIT (Nënkontraktor/Fabrikues) ──
function ctrBuildProd(lang,d){
  var todayStr=d.date?d.date.split('-').reverse().join('.'):'';
  return '<div style="font-family:Arial,sans-serif;line-height:1.55">'
  +'<h2 style="text-align:center;margin-bottom:2px">KONTRATË PRODHIMI DHE DORËZIMI</h2>'
  +'<div style="text-align:center;color:#666;margin-bottom:18px">Prodhimi i Konstruksioneve Metalike — Oferta '+ctrEsc(d.offernr)+'</div>'
  +'<div style="display:flex;justify-content:space-between;margin-bottom:14px"><div><strong>KONTRAKTORI</strong><br>PRISteel Sh.p.k.<br>Rr. Tringe Smajli nr. 16<br>10000 Prishtinë, Kosovë<br>sales@prissteel.com<br>Përfaqësuar nga: Oltian Vllahiu, Pronar &amp; CEO</div>'
  +'<div><strong>NËNKONTRAKTORI</strong><br>'+ctrEsc(d.company)+'<br>'+ctrEsc(d.address)+'<br>Kontakti: '+ctrEsc(d.contact)+'<br>'+ctrEsc(d.email)+'</div></div>'
  +'<p><strong>Projekti:</strong> '+ctrEsc(d.project)+' &nbsp; <strong>Vendi i dorëzimit final:</strong> '+ctrEsc(d.location)+'<br><strong>Data:</strong> Prishtinë, '+todayStr+'</p>'
  +'<h3>Preambulë</h3><p>PRISteel Sh.p.k. (Kontraktori) i beson Nënkontraktorit prodhimin e elementeve metalike sipas ofertës së referuar. Marrëdhëniet tregtare të Kontraktorit me blerësin final mbeten të mbrojtura me NDA-në e lidhur paraprakisht ndërmjet palëve.</p>'
  +'<h3>Neni 1 – Objekti i Kontratës dhe Çmimi</h3>'
  +'<table style="width:100%;border-collapse:collapse;margin:10px 0" border="1" cellpadding="6"><tr style="background:#f2f2f2"><th>Përshkrimi</th><th>Sasia</th><th>Çmimi/njësi</th><th>Totali</th></tr>'
  +'<tr><td>Prodhim, ngjyrosje, ngarkim sipas vizatimeve të aprovuara</td><td>'+ctrFmt(d.qty)+' kg</td><td>'+ctrFmt(d.priceperkg)+' EUR/kg</td><td>'+ctrFmt(d.value)+' EUR</td></tr></table>'
  +'<h3>Neni 2 – Përgjegjësitë Teknike</h3><p>Nënkontraktori merr përsipër përgjegjësinë teknike të plotë për cilësinë, saktësinë dhe afatet e prodhimit, sipas normave EN 1090 dhe certifikatave përkatëse (ISO 3834-2, ISO 9001).</p>'
  +'<h3>Neni 3 – Kushti i Dorëzimit dhe Afati</h3><p>Dorëzimi: DAP '+ctrEsc(d.location)+'. Transporti dhe sigurimi deri në destinacion janë përgjegjësi e Nënkontraktorit dhe të përfshira në çmim, përveç nëse rënë dakord ndryshe.</p>'
  +'<h3>Neni 4 – Kushtet e Pagesës</h3>'+ctrPayTermsHtml(d.payterms)
  +'<h3>Neni 5 – Dokumentacioni i Detyrueshëm i Cilësisë</h3><p>Nënkontraktori dorëzon certifikatat e materialit (EN 10204 Tip 3.1), regjistrin e saldimit (Welding Book), protokollet e kontrollit VT+UT, dhe deklaratën CE, jo më vonë se dita e ngarkimit.</p>'
  +'<h3>Neni 6 – Përgjegjësia për Defektet</h3><p>Nënkontraktori zgjedh midis riparimit ose zëvendësimit brenda afatit të rënë dakord, në rast defektesh të konstatuara nga Blerësi ose Kontraktori.</p>'
  +'<h3>Neni 7 – E Drejta e Aplikueshme</h3><p>Kjo kontratë, bashkë me NDA-në, përbën marrëveshjen e plotë midis palëve.</p>'
  +'<div style="display:flex;justify-content:space-between;margin-top:50px"><div>____________________<br>Oltian Vllahiu<br>Pronar &amp; CEO, PRISteel Sh.p.k.</div><div>____________________<br>'+ctrEsc(d.contact)+'<br>'+ctrEsc(d.company)+'</div></div>'
  +'</div>';
}

// ── NDA ──
function ctrBuildNda(lang,d){
  var todayStr=d.date?d.date.split('-').reverse().join('.'):'';
  return '<div style="font-family:Arial,sans-serif;line-height:1.55">'
  +'<h2 style="text-align:center;margin-bottom:2px">MARRËVESHJE MBI BASHKËPUNIMIN TEKNIK DHE KONFIDENCIALITETIN (NDA)</h2>'
  +'<div style="text-align:center;color:#666;margin-bottom:18px">'+(d.project?ctrEsc(d.project)+' — ':'')+'Prishtinë, '+todayStr+'</div>'
  +'<p>Kjo Marrëveshje lidhet midis: <strong>PRISTEEL SH.P.K.</strong> (Rr. Tringe Smajli nr. 16, 10000 Prishtinë, Kosovë — këtu e tutje: Partneri Tregtar) dhe <strong>'+ctrEsc(d.company)+'</strong> ('+ctrEsc(d.address)+', kontakt: '+ctrEsc(d.contact)+', '+ctrEsc(d.email)+' — këtu e tutje: Partneri Prodhues).</p>'
  +'<h3>Neni 1 – Natyra e Bashkëpunimit</h3><p>Partnerët bashkëpunojnë në projekte industriale, ku Partneri Tregtar sjell kërkesat e blerësve, ndërsa Partneri Prodhues ofron kapacitetet për prodhim, përpunim metalesh dhe montim. Kjo marrëveshje krijon raport Kontraktori–Nënkontraktori, jo shoqëri të përbashkët.</p>'
  +'<h3>Neni 2 – NDA &amp; Non-Circumvention</h3><p>Të gjitha të dhënat mbi Blerësit e Partnerit Tregtar (emrat, kontaktet, lokacionet, çmimet) konsiderohen Sekret Tregtar. Partneri Prodhues zotohet të mos kontaktojë drejtpërdrejt Blerësit e Partnerit Tregtar. Ky detyrim mbetet në fuqi gjatë bashkëpunimit dhe për 5 vite pas përfundimit të projektit të fundit të përbashkët.</p>'
  +'<h3>Neni 3 – Standardet e Prodhimit</h3><p>Partneri Prodhues merr përsipër përputhshmërinë me vizatimet teknike dhe standardet e dakorduara, dhe dorëzon dosjen teknike (atestet, certifikatat) pas përfundimit të punës.</p>'
  +'<h3>Neni 4 – Afatet dhe Përgjegjësia</h3><p>Nëse Partneri Tregtar penalizohet financiarisht nga Blerësi për vonesa ose dështime teknike të Partnerit Prodhues, këto kosto bartën te ky i fundit.</p>'
  +'<h3>Neni 5 – Qasja në Ambientet e Punës</h3><p>Partneri Tregtar ka të drejtë të inspektojë fabrikën/kantierin. Partneri Prodhues lejon vizita (me njoftim paraprak) të Blerësve për auditim teknik.</p>'
  +'<h3>Neni 6 – Pronësia Intelektuale</h3><p>Vizatimet dhe specifikimet e dorëzuara nga Partneri Tregtar mbeten pronë e tij dhe s\'mund të përdoren për projekte të tjera.</p>'
  +'<h3>Neni 7 – Zgjidhja e Mosmarrëveshjeve</h3><p>Kompetente është Gjykata Komerciale në Prishtinë.</p>'
  +'<div style="display:flex;justify-content:space-between;margin-top:50px"><div>____________________<br>PËR PRISTEEL SH.P.K.</div><div>____________________<br>PËR '+ctrEsc((d.company||'').toUpperCase())+'</div></div>'
  +'</div>';
}

function ctrCollect(cat){
  var p=cat==='sale'?'cs':cat==='prod'?'cp':'cn';
  var d={
    company:document.getElementById(p+'-company').value.trim(),
    address:document.getElementById(p+'-address')?document.getElementById(p+'-address').value.trim():'',
    contact:document.getElementById(p+'-contact').value.trim(),
    email:document.getElementById(p+'-email').value.trim(),
    project:document.getElementById(p+'-project')?document.getElementById(p+'-project').value.trim():'',
    location:document.getElementById(p+'-location')?document.getElementById(p+'-location').value.trim():'',
    offernr:document.getElementById(p+'-offernr')?document.getElementById(p+'-offernr').value.trim():'',
    date:document.getElementById(p+'-date').value||'',
    qty:document.getElementById(p+'-qty')?document.getElementById(p+'-qty').value:0,
    priceperkg:document.getElementById(p+'-priceperkg')?document.getElementById(p+'-priceperkg').value:0,
    value:document.getElementById(p+'-value')?document.getElementById(p+'-value').value:0,
    incoterm:document.getElementById(p+'-incoterm')?document.getElementById(p+'-incoterm').value:'',
    payterms:document.getElementById(p+'-payterms')?document.getElementById(p+'-payterms').value:'',
    lang:document.getElementById(p+'-lang')?document.getElementById(p+'-lang').value:'sq'
  };
  return d;
}

function ctrGenerate(cat){
  var d=ctrCollect(cat);
  if(!d.company){alert('Shkruaj emrin e kompanisë.');return;}
  var html;
  if(cat==='sale') html=ctrBuildSale(d.lang,d);
  else if(cat==='prod') html=ctrBuildProd(d.lang,d);
  else html=ctrBuildNda(d.lang,d);
  ctrGeneratedHtml[cat]=html;
  document.getElementById('ctr-preview-'+cat).innerHTML=html;
}

function ctrPrint(cat){
  if(!ctrGeneratedHtml[cat]){alert('Gjenero kontratën së pari.');return;}
  var w=window.open('','_blank');
  w.document.write('<html><head><title>Kontrata</title></head><body>'+ctrGeneratedHtml[cat]+'</body></html>');
  w.document.close();
  setTimeout(function(){w.print();},300);
}

function ctrSave(cat){
  var d=ctrCollect(cat);
  if(!d.company){alert('Shkruaj emrin e kompanisë.');return;}
  if(!ctrGeneratedHtml[cat]) ctrGenerate(cat);
  var typeLabel=cat==='sale'?'Kontratë Shitjeje':cat==='prod'?'Kontratë Prodhimi':'NDA';
  var fd=ctrFileData[cat];
  var payload={
    category:cat, contract_type:typeLabel, party:d.company, project:d.project||null,
    contact_person:d.contact||null, buyer_email:d.email||null, payment_terms:d.payterms||null,
    language:d.lang, contract_value:parseFloat(d.value)||null, quantity_kg:parseFloat(d.qty)||null,
    date:d.date||null, generated_html:ctrGeneratedHtml[cat],
    file_name:fd?fd.name:null, file_type:fd?fd.type:null, file_base64:fd?fd.base64:null
  };
  supaFetch('contracts','POST',payload).then(function(){
    alert('Kontrata u ruajt!');
    loadContracts();
  }).catch(function(e){alert('Gabim (a ekziston tabela contracts në Supabase?): '+e.message);});
}

function ctrFilterList(cat){
  ctrCurrentFilter=cat;
  ['all','sale','prod','nda'].forEach(function(c){
    var b=document.getElementById('ctr-flt-'+c); if(!b)return;
    b.style.background=(c===cat?'var(--bronze)':''); b.style.color=(c===cat?'#fff':''); b.style.borderColor=(c===cat?'var(--bronze)':'');
  });
  renderContractsList();
}

function renderContractsList(){
  var el=document.getElementById('ctr-list');
  if(!el)return;
  var rows=contractsList||[];
  if(ctrCurrentFilter!=='all') rows=rows.filter(function(r){return (r.category||ctrLegacyCategory(r))===ctrCurrentFilter;});
  if(rows.length===0){el.innerHTML='<div style="color:var(--text3);font-size:13px">Asnjë kontratë e ruajtur.</div>';return;}
  var catIcon={sale:'📄',prod:'🏭',nda:'🔒'};
  el.innerHTML=rows.map(function(r){
    var cat=r.category||ctrLegacyCategory(r);
    return '<div class="project-card" onclick="openContractDetail(\''+r.id+'\')" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:none;box-shadow:0 1px 3px rgba(26,26,25,.07);border-radius:8px;margin-bottom:8px;transition:box-shadow .13s" onmouseover="this.style.boxShadow=\'0 3px 8px rgba(26,26,25,.13)\'" onmouseout="this.style.boxShadow=\'0 1px 3px rgba(26,26,25,.07)\'">'
      +'<div>'+(catIcon[cat]||'📄')+' <strong>'+(r.contract_type||'')+'</strong> <span style="color:var(--text3);font-size:12px">'+(r.party||'')+(r.project?' · '+r.project:'')+(r.date?' · '+r.date:'')+(r.file_base64?' · 📎':'')+'</span></div>'
      +'<div style="display:flex;gap:6px"><button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteContract(\''+r.id+'\')">Fshij</button></div></div>';
  }).join('');
}
// Kontratat e vjetra (para këtij ndryshimi) s'kanë fushën "category" — i klasifikojmë prapa sipas contract_type
function ctrLegacyCategory(r){
  var t=(r.contract_type||'').toLowerCase();
  if(t.indexOf('nda')>=0) return 'nda';
  if(t.indexOf('nënkontrat')>=0||t.indexOf('prodhim')>=0) return 'prod';
  return 'sale';
}

function loadContracts(){
  var el=document.getElementById('ctr-list');
  if(!el)return;
  supaFetch('contracts?order=created_at.desc&limit=100').then(function(rows){
    contractsList=rows||[];
    renderContractsList();
  }).catch(function(e){el.innerHTML='<div style="color:var(--red-text);font-size:12px">Tabela contracts mungon në Supabase ende. Shiko udhëzimet SQL.</div>';});
}
function closeContractDetail(){ var bg=document.getElementById('pst-ctr-modal'); if(bg) bg.remove(); }
function openContractDetail(id){
  const r=contractsList.find(function(x){return x.id===id;});
  if(!r) return;
  var bg=document.createElement('div'); bg.className='pst-modal-bg'; bg.id='pst-ctr-modal';
  bg.onclick=function(e){ if(e.target===bg) closeContractDetail(); };
  bg.innerHTML='<div class="pst-modal">'
    +'<div class="pst-modal-hd"><div>'
      +'<div style="font-size:14px;font-weight:650">'+(r.contract_type||'')+'</div>'
      +'<div style="font-size:11px;color:var(--text3);margin-top:3px">'+(r.party||'—')+(r.project?' · '+r.project:'')+'</div>'
    +'</div><span class="pst-modal-x" onclick="closeContractDetail()">✕</span></div>'
    +'<div class="pst-modal-bd">'
      +'<table style="width:100%;font-size:12px;border-collapse:collapse">'
        +'<tr><td style="color:var(--text3);padding:5px 0">Projekti</td><td style="text-align:right">'+(r.project||'—')+'</td></tr>'
        +'<tr><td style="color:var(--text3);padding:5px 0">Pala tjetër</td><td style="text-align:right">'+(r.party||'—')+'</td></tr>'
        +'<tr><td style="color:var(--text3);padding:5px 0">Kontakti</td><td style="text-align:right">'+(r.contact_person||'—')+'</td></tr>'
        +'<tr><td style="color:var(--text3);padding:5px 0">Email</td><td style="text-align:right">'+(r.buyer_email||'—')+'</td></tr>'
        +'<tr><td style="color:var(--text3);padding:5px 0">Lloji</td><td style="text-align:right">'+(r.contract_type||'—')+'</td></tr>'
        +'<tr><td style="color:var(--text3);padding:5px 0">Vlera</td><td style="text-align:right">'+(r.contract_value?ctrFmt(r.contract_value)+' EUR':'—')+'</td></tr>'
        +'<tr><td style="color:var(--text3);padding:5px 0">Data</td><td style="text-align:right">'+(r.date||'—')+'</td></tr>'
      +'</table>'
      +(r.generated_html?'<div style="font-size:11.5px;color:var(--text2);margin-top:12px;line-height:1.5;border-top:1px solid var(--border);padding-top:10px;max-height:300px;overflow-y:auto">'+r.generated_html+'</div>'
        :(r.notes?'<div style="font-size:12.5px;color:var(--text2);margin-top:12px;line-height:1.5;border-top:1px solid var(--border);padding-top:10px">'+r.notes.replace(/\n/g,'<br>')+'</div>':''))
      +'<div style="display:flex;gap:8px;margin-top:16px">'
        +(r.file_base64?'<button class="btn btn-sm btn-primary" style="flex:1" onclick="event.stopPropagation();viewOrDownloadFile(\''+(r.file_name||'').replace(/'/g,"\\'")+'\',\''+(r.file_type||'')+'\',contractsList.find(function(x){return x.id===\''+r.id+'\';}).file_base64)">📎 Shiko / Shkarko skedarin</button>'
          :'<div style="flex:1;font-size:11.5px;color:var(--text3);align-self:center">Asnjë skedar i bashkëngjitur.</div>')
        +'<button class="btn btn-danger btn-sm" onclick="closeContractDetail();deleteContract(\''+r.id+'\')">Fshij</button>'
      +'</div>'
    +'</div></div>';
  document.body.appendChild(bg);
}
