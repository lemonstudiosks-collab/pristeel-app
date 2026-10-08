import * as api from './data.mjs';
import { PIPELINE, draftMessage, contactAllowed, blocked } from './commercial.mjs';

const view=document.getElementById('view'),status=document.getElementById('read-status');
let data=null,selected=null,generation=0,busy=false;
let marketFilters={country:'ALL',segment:'ALL',catalogue:'ALL',relevance:'ALL',status:'ALL'};

const arr=x=>Array.isArray(x)?x:[];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function link(url,label='Burimi'){try{const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)return '';return '<a class="source-link" href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>';}catch{return '';}}
const field=(k,v)=>'<dt>'+esc(k)+'</dt><dd>'+esc(v||'Mungon / për t’u konfirmuar')+'</dd>';
const date=x=>x?String(x).slice(0,10):'Mungon';
const countryName=x=>x==='XK'?'Kosovë':x==='AL'?'Shqipëri':x||'Mungon';

const active=l=>((l.analysis.eligible&&!l.context.closed)||(['CONTACTED','REPLIED','RFQ RECEIVED','REQUEST TO DRUSEIDT READY','DRUSEIDT QUOTING','OFFER RECEIVED','PRISTEEL OFFER READY','OFFERED','FOLLOW-UP'].includes(l.pipeline)&&['HIGH','MEDIUM'].includes(l.analysis.relevance)))&&!['WON','LOST','ARCHIVED'].includes(l.pipeline)&&!blocked(l);
const hero=(title,desc)=>'<section class="hero"><p class="eyebrow">DRUSEIDT · KOSOVË + SHQIPËRI</p><h1>'+esc(title)+'</h1><p>'+esc(desc)+'</p></section><div id="feedback" role="status"></div>';

function activityText(l){
  const c=l.context||{};
  return [c.scope,c.published_activity,c.title,c.company,c.authority,arr(l.analysis?.confirmed).map(x=>x.product+' '+x.excerpt).join(' ')].filter(Boolean).join(' ').toLowerCase();
}
function segments(l){
  const t=activityText(l),out=[];
  if(/switchgear|panel|cabinet|switchboard|substation|distribution board|busbar/.test(t))out.push('Panel / switchgear');
  if(/engineering|epc|installation|automation|scada|plc|project|commission/.test(t))out.push('EPC / engineering');
  if(/utility|grid|transmission|distribution operator|power plant|substation/.test(t))out.push('Utilities / grid');
  if(/mining|metal|industrial plant|factory|welding|furnace|oil|gas/.test(t))out.push('Industri');
  if(/solar|wind|renewable|e-mobility|ev charging|photovoltaic/.test(t))out.push('Renewables / e-mobility');
  if(/galvan|anodis|electroplat|surface treatment|coating/.test(t))out.push('Galvanizim / anodizim');
  if(/wholesale|retail|electrical material|supplier|trade|distribution materials/.test(t))out.push('Distributor / installer');
  return out.length?[...new Set(out)]:['Tjetër / për verifikim'];
}
function maturity(l){
  const p=String(l.pipeline||'DISCOVERED').toUpperCase();
  const directMap={
    'DRAFT READY':'DRAFT READY','CONTACTED':'CONTACTED','REPLIED':'REPLIED','RFQ RECEIVED':'RFQ',
    'REQUEST TO DRUSEIDT READY':'RFQ','DRUSEIDT QUOTING':'RFQ','OFFER RECEIVED':'RFQ','PRISTEEL OFFER READY':'RFQ',
    'OFFERED':'RFQ','FOLLOW-UP':'FOLLOW-UP','WON':'WON','LOST':'LOST','ARCHIVED':'ARCHIVED'
  };
  if(directMap[p])return directMap[p];
  const a=l.analysis||{},c=l.context||{},ct=c.contact||{};
  if(!['HIGH','MEDIUM'].includes(a.relevance)||!arr(a.confirmed).length)return 'DISCOVERED';
  if(ct.name&&ct.email&&!/general|missing|mungon/i.test(ct.role||''))return 'OUTREACH READY';
  if(ct.email||ct.phone)return 'CONTACT IDENTIFIED';
  return 'VERIFIED FIT';
}
function score(l){
  const rel={HIGH:30,MEDIUM:20,REVIEW:5,LOW:0}[l.analysis?.relevance]||0;
  const mat={'RFQ':35,'REPLIED':30,'CONTACTED':25,'DRAFT READY':24,'OUTREACH READY':22,'CONTACT IDENTIFIED':15,'VERIFIED FIT':10,'DISCOVERED':0}[maturity(l)]||0;
  return rel+mat+arr(l.analysis?.confirmed).length*3;
}
function fitProducts(l){return arr(l.analysis?.confirmed).map(x=>x.product).filter(Boolean);}
function row(l){
  const c=l.context||{},a=l.analysis||{},m=maturity(l),seg=segments(l);
  return '<a class="lead-row" href="#lead/'+esc(l.id)+'">'+
    '<div class="lead-meta"><span class="pill '+(a.relevance==='HIGH'?'on-track':'attention')+'">'+esc(a.relevance||'REVIEW')+'</span>'+
    '<span>'+esc(l.kind==='award'?'AWARD / FITUES':l.kind==='active'?'TENDER AKTIV':'KOMPANI')+'</span>'+
    '<span>'+esc(countryName(l.country))+'</span><span>'+esc(m)+'</span></div>'+
    '<h2>'+esc(c.title||c.company||c.authority||'Pa emër')+'</h2>'+
    '<p class="lead-segment">'+seg.map(x=>'<span>'+esc(x)+'</span>').join('')+'</p>'+
    '<p><strong>Pse Druseidt?</strong> '+esc(a.why||'Relevanca është ende duke u verifikuar.')+'</p>'+
    '<div class="lead-meta"><span>Katalogu '+esc(arr(a.catalogues).join(' + ')||'—')+'</span><span>Fit: '+esc(fitProducts(l).join(' · ')||'për verifikim')+'</span></div>'+
    '<p class="lead-next">Hapi tjetër: '+esc(nextAction(l))+'</p></a>';
}
function nextAction(l){
  const c=l.context||{},m=maturity(l);
  if(l.kind==='active'&&!arr(c.bidder_evidence).length)return 'gjej ofertuesin/fituesin dhe evidencën teknike';
  if(m==='DISCOVERED')return 'verifiko aplikimin dhe lidhjen me produktet Druseidt';
  if(m==='VERIFIED FIT')return 'gjej kontaktin e duhur në engineering/procurement';
  if(m==='CONTACT IDENTIFIED')return 'gjej personin përgjegjës ose verifiko rrugën e kontaktit';
  if(m==='OUTREACH READY')return 'shqyrto arsyen e kontaktit dhe përgatit draft vetëm me miratim';
  if(m==='DRAFT READY')return 'shqyrto draftin; mos dërgo pa miratim';
  if(m==='CONTACTED')return 'prit përgjigje / regjistro evidencën e re';
  if(m==='REPLIED')return 'kualifiko nevojën dhe kërko dokumentet teknike';
  if(m==='RFQ')return 'plotëso parametrat dhe koordino review teknik me Druseidt';
  return 'shqyrto gjendjen dhe evidencën';
}
function statsBlock(items){
  const direct=items.filter(l=>l.kind==='direct');
  const counts=[
    ['Kompani të hartëzuara',direct.length],
    ['HIGH fit',direct.filter(l=>l.analysis?.relevance==='HIGH').length],
    ['Fit i verifikuar',direct.filter(l=>!['DISCOVERED'].includes(maturity(l))).length],
    ['Kontakt i identifikuar',direct.filter(l=>['CONTACT IDENTIFIED','OUTREACH READY','DRAFT READY','CONTACTED','REPLIED','RFQ'].includes(maturity(l))).length],
    ['RFQ / përgjigje',direct.filter(l=>['REPLIED','RFQ'].includes(maturity(l))).length],
    ['Tenderë/awards relevantë',items.filter(l=>['active','award'].includes(l.kind)&&active(l)).length]
  ];
  return '<div class="compact-counts">'+counts.map(([k,n])=>'<span><b>'+n+'</b>'+esc(k)+'</span>').join('')+'</div>';
}
function marketLearning(ls){
  const direct=ls.filter(l=>l.kind==='direct'),byCountry=['XK','AL'].map(code=>[countryName(code),direct.filter(l=>l.country===code).length]);
  const segCounts={};
  direct.forEach(l=>segments(l).forEach(s=>segCounts[s]=(segCounts[s]||0)+1));
  const topSeg=Object.entries(segCounts).sort((a,b)=>b[1]-a[1]);
  const catCounts=[1,2,3,4].map(n=>[n,direct.filter(l=>arr(l.analysis?.catalogues).includes(n)).length]);
  return '<section class="detail-section market-learning"><h2>Çfarë po mësojmë për tregun?</h2>'+
    '<div class="learning-grid"><div><h3>Gjeografia</h3>'+byCountry.map(([k,n])=>'<p><b>'+n+'</b> '+esc(k)+'</p>').join('')+'</div>'+
    '<div><h3>Segmentet</h3>'+topSeg.map(([k,n])=>'<p><b>'+n+'</b> '+esc(k)+'</p>').join('')+'</div>'+
    '<div><h3>Katalogët</h3>'+catCounts.map(([n,c])=>'<p><b>'+c+'</b> Katalogu '+n+'</p>').join('')+'</div></div>'+
    '<p class="notice">Këto numra matin vetëm kompanitë e identifikuara me burim në PPPP; nuk janë vlerësim i madhësisë totale të tregut. Një kompani mund të numërohet në më shumë se një segment/katalog.</p></section>';
}
function relationshipBlock(){
  const t=data.target||{};
  return '<section class="detail-section relationship-strip"><h2>Marrëdhënia me Druseidt</h2><div class="relationship-grid">'+
    '<div><small>Statusi</small><strong>'+esc(t.stage||'Mungon')+'</strong></div>'+
    '<div><small>Kontakti</small><strong>'+esc(t.contact_name||'Mungon')+'</strong></div>'+
    '<div><small>Fokusi aktual</small><strong>Kosovë + Shqipëri</strong></div>'+
    '<div><small>Hapi</small><strong>Market mapping + takim online</strong></div></div>'+
    '<p class="notice">Nuk ka marrëveshje për përfaqësim, ekskluzivitet, territor, komision apo kushte komerciale. SPIE mbetet pa outreach Druseidt.</p></section>';
}
function home(){
  const ls=arr(data.leads),direct=ls.filter(l=>l.kind==='direct');
  const actions=direct.filter(l=>['OUTREACH READY','DRAFT READY','REPLIED','RFQ'].includes(maturity(l))).sort((a,b)=>score(b)-score(a));
  const top=direct.filter(l=>['HIGH','MEDIUM'].includes(l.analysis?.relevance)).sort((a,b)=>score(b)-score(a)).slice(0,6);
  return hero('Action required','PPPP punon në prapavijë; këtu dalin vetëm vendimet dhe hapat që kërkojnë vëmendje.')+
    statsBlock(ls)+relationshipBlock()+
    '<section class="detail-section"><div class="section-head"><div><h2>Kërkon veprim</h2><p>Vetëm kompani që kanë kaluar mjaftueshëm faza për një vendim njerëzor.</p></div></div>'+
    (actions.length?actions.map(row).join(''):'<p class="empty">Nuk ka veprim të menjëhershëm. Vazhdojmë hartëzimin dhe verifikimin e tregut.</p>')+'</section>'+
    '<section class="detail-section"><div class="section-head"><div><h2>Top opportunities</h2><p>Kompanitë më të forta sipas evidencës aktuale — jo RFQ të konfirmuara.</p></div><a class="source-link" href="#market">Hap hartën e tregut →</a></div>'+
    (top.length?top.map(row).join(''):'<p class="empty">Ende nuk ka kompani të kualifikuara.</p>')+'</section>'+
    marketLearning(ls)+
    '<section class="detail-section"><h2>Mbulimi i tenderëve</h2><p>Backfill: 45 ditë · '+Number(data.coverage?.scanned||0)+' rekorde · '+Number(data.coverage?.awards||0)+' awards · '+esc(arr(data.coverage?.sources).join(' / '))+'</p><p>Analiza e fundit: '+esc(date(data.coverage?.analyzed_at))+'. Tenderët pa evidencë teknike konkrete nuk shndërrohen në lead.</p></section>';
}
function filterControls(){
  const opts=(values,current)=>values.map(([v,l])=>'<option value="'+esc(v)+'"'+(current===v?' selected':'')+'>'+esc(l)+'</option>').join('');
  return '<div class="market-filters">'+
    '<label>Vendi<select data-filter="country">'+opts([['ALL','Të gjitha'],['XK','Kosovë'],['AL','Shqipëri']],marketFilters.country)+'</select></label>'+
    '<label>Segmenti<select data-filter="segment">'+opts([['ALL','Të gjitha'],['Panel / switchgear','Panel / switchgear'],['EPC / engineering','EPC / engineering'],['Utilities / grid','Utilities / grid'],['Industri','Industri'],['Renewables / e-mobility','Renewables / e-mobility'],['Galvanizim / anodizim','Galvanizim / anodizim'],['Distributor / installer','Distributor / installer']],marketFilters.segment)+'</select></label>'+
    '<label>Katalogu<select data-filter="catalogue">'+opts([['ALL','Të gjithë'],['4','4'],['2','2'],['1','1'],['3','3']],marketFilters.catalogue)+'</select></label>'+
    '<label>Fit<select data-filter="relevance">'+opts([['ALL','Të gjithë'],['HIGH','HIGH'],['MEDIUM','MEDIUM'],['REVIEW','REVIEW']],marketFilters.relevance)+'</select></label>'+
    '<label>Statusi<select data-filter="status">'+opts([['ALL','Të gjithë'],['DISCOVERED','DISCOVERED'],['VERIFIED FIT','VERIFIED FIT'],['CONTACT IDENTIFIED','CONTACT IDENTIFIED'],['OUTREACH READY','OUTREACH READY'],['DRAFT READY','DRAFT READY'],['CONTACTED','CONTACTED'],['REPLIED','REPLIED'],['RFQ','RFQ']],marketFilters.status)+'</select></label>'+
    '</div>';
}
function market(){
  const all=arr(data.leads).filter(l=>l.kind==='direct');
  const ls=all.filter(l=>
    (marketFilters.country==='ALL'||l.country===marketFilters.country)&&
    (marketFilters.segment==='ALL'||segments(l).includes(marketFilters.segment))&&
    (marketFilters.catalogue==='ALL'||arr(l.analysis?.catalogues).map(String).includes(marketFilters.catalogue))&&
    (marketFilters.relevance==='ALL'||l.analysis?.relevance===marketFilters.relevance)&&
    (marketFilters.status==='ALL'||maturity(l)===marketFilters.status)
  ).sort((a,b)=>score(b)-score(a));
  return hero('Harta e tregut','Kompani të identifikuara me burim, të ndara sipas aplikimit dhe fit-it me Druseidt. Discovery nuk krijon automatikisht outreach.')+
    statsBlock(arr(data.leads))+filterControls()+
    '<section class="detail-section"><div class="section-head"><div><h2>'+ls.length+' kompani në këtë pamje</h2><p>DISCOVERED → VERIFIED FIT → CONTACT IDENTIFIED → OUTREACH READY → DRAFT READY → CONTACTED → REPLIED → RFQ</p></div></div>'+
    (ls.length?ls.map(row).join(''):'<p class="empty">Asnjë kompani nuk përputhet me filtrat.</p>')+'</section>'+marketLearning(arr(data.leads));
}
function list(kind){
  let ls=arr(data.leads).filter(l=>kind==='pipeline'?l.pipeline!=='DISCOVERED':l.kind===kind&&active(l));
  let title={active:'Tenderë aktivë relevantë',award:'Awards → fitues → komponentë',pipeline:'Pipeline / RFQ'}[kind];
  let reviews=kind==='active'?arr(data.leads).filter(l=>l.kind==='active'&&l.analysis.relevance==='REVIEW'&&!l.context.closed):[];
  return hero(title,'Vetëm evidencë konkrete; emri i projektit nuk mjafton për match.')+
    ls.sort((a,b)=>score(b)-score(a)).map(row).join('')+(ls.length?'':'<p class="empty">Asnjë rekord i verifikuar në këtë kategori.</p>')+
    (reviews.length?'<details class="detail-section"><summary>'+reviews.length+' rekorde kërkojnë evidencë teknike — nuk janë leads për outreach</summary>'+reviews.map(row).join('')+'</details>':'');
}
function catalogues(){
  const t=data.target||{};
  return hero('Produktet & marrëdhënia','E gjithë gama Druseidt; katalogët 4 dhe 2 janë pika e parë e fokusit.')+
    '<section class="detail-section"><h2>Product / application map</h2><table><thead><tr><th>Katalogu</th><th>Aplikimi</th><th>Ku e kërkojmë në treg</th></tr></thead><tbody>'+
    [[4,'Busbars Cu/Al, fabricated solid parts, supports, lamellar/flexible busbar elements','Panel builders, switchgear, substations, power distribution, industrial power systems'],
     [2,'Flexible high-current connections, braids, earth straps, cables, air/water-cooled current bridges','Switchgear/transformers/generators, industrial high-current equipment, welding, heavy industry'],
     [1,'Cable connection technology, lugs/connectors, crimping and installation tools','Panel builders, installers, electrical wholesalers, maintenance teams'],
     [3,'High-current contacts and accessories for anodising/electroplating','Galvanizing, anodising, coating and surface-treatment plants']].map(([n,p,w])=>'<tr><td>'+link('https://druseidt.de/pdf/K_0'+n+'_DE.pdf','Katalogu '+n)+'</td><td>'+esc(p)+'</td><td>'+esc(w)+'</td></tr>').join('')+
    '</tbody></table><p>'+link('https://druseidt.de/service/download/','Indeksi zyrtar i katalogëve')+'</p><p class="notice">Standard products + custom-made. Parametrat finalë, përzgjedhja teknike dhe feasibility për zgjidhjet specifike konfirmohen nga specialistët Druseidt për secilën RFQ.</p></section>'+
    '<section class="detail-section"><h2>Marrëdhënia e konfirmuar</h2><dl>'+field('Kontakti',t.contact_name)+field('Roli',t.contact_role)+field('Email',t.contact_email)+field('Statusi','Përgjigje e pranuar; interes për Kosovë / Ballkanin Perëndimor')+'</dl><p>'+link('https://mail.google.com/mail/u/0/#all/'+t.gmail_thread_id,'Hap komunikimin real me Andrei')+'</p><p>Takim online i propozuar pas shqyrtimit të katalogëve dhe tregut.</p><p class="notice">Marrëveshja e përfaqësimit, ekskluziviteti, territori, komisioni dhe kushtet komerciale nuk janë konfirmuar.</p><p>SPIE: FUTURE POTENTIAL CUSTOMER · pa draft dhe pa outreach Druseidt.</p></section>';
}
function leadPage(detail){
  const l=detail.lead,c=l.context||{},a=l.analysis||{},contacts=arr(detail.contacts);selected=detail;
  const eligible=active(l),usable=contacts.filter(contactAllowed),comm=l.communications||{},m=maturity(l),seg=segments(l);
  const stateOpts=PIPELINE.filter(x=>x!=='DRAFT READY').map(x=>'<option'+(l.pipeline===x?' selected':'')+'>'+x+'</option>').join('');
  const canDraft=eligible&&usable.length&&['OUTREACH READY','DRAFT READY'].includes(m)&&(l.kind!=='active'||arr(c.bidder_evidence).length);
  return hero(c.title,c.authority||c.company||'')+
    '<a class="source-link" href="#'+(l.kind==='direct'?'market':l.kind)+'">← Kthehu te lista</a>'+
    '<section class="detail-section"><h2>Kompania / aktiviteti</h2><dl>'+
      field('Vendi',countryName(l.country))+field('Segmenti',seg.join(' · '))+field('Maturia',m)+field('Pipeline PPPP',l.pipeline)+field('Procurement stage',c.procurement_stage)+
    '</dl><p>'+esc(c.scope||c.published_activity||'Aktiviteti i publikuar mungon.')+'</p><p>'+link(c.source_url,'Burimi zyrtar / aktiviteti i kompanisë')+'</p></section>'+
    '<section class="detail-section"><h2>Aplikimet → Druseidt fit · '+esc(a.relevance)+'</h2><p>'+esc(a.why)+'</p><p><strong>Katalogu:</strong> '+esc(arr(a.catalogues).join(' + ')||'për verifikim')+'</p><p><strong>Produkte/aplikime të konfirmuara:</strong> '+esc(fitProducts(l).join(' · ')||'ende pa match të konfirmuar')+'</p><p>'+esc(a.custom_made?.capability||'Custom-made capability konfirmohet sipas aplikimit.')+'</p></section>'+
    '<section class="detail-section detail-grid"><div><h2>Evidenca</h2><ul>'+arr(a.confirmed).map(x=>'<li><strong>'+esc(x.product)+'</strong><p>'+esc(x.excerpt)+'</p>'+link(x.source_url,'Evidenca')+'</li>').join('')+'</ul>'+(arr(a.confirmed).length?'':'<p class="empty">Evidenca teknike ende nuk mjafton.</p>')+'</div><div><h2>Mungon / për t’u konfirmuar</h2><ul>'+arr(a.missing).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><p>Paketë e hapur për furnizim: pa konfirmim derisa të kemi evidencë direkte.</p></div></section>'+
    '<section class="detail-section"><h2>Kontaktet</h2>'+contacts.map(x=>'<p><strong>'+esc(x.name||'Kontakt i përgjithshëm')+'</strong> · '+esc(x.role||'Roli mungon')+' · '+esc(x.verification_status)+'<br>'+esc(x.email||'Email mungon')+' '+esc(x.phone||'')+'<br>'+link(x.source_url,'Burimi i kontaktit')+'</p>').join('')+(contacts.length?'':'<p class="empty">Kontakti mungon. Nuk përdorim email të hamendësuar.</p>')+'<p>Prioritet: Procurement → Purchasing → Project Manager → Electrical Engineering → Technical Director → Managing Director.</p></section>'+
    '<section class="detail-section"><h2>Komunikimi</h2>'+link(comm.thread_id?'https://mail.google.com/mail/u/0/#all/'+comm.thread_id:'','Hap Gmail thread')+arr(detail.emails).map(x=>'<p>'+esc(date(x.sent_at))+' · '+esc(x.direction)+' · '+esc(x.subject)+'<br>'+esc(x.snippet)+'<br><small>Message ID: '+esc(x.gmail_message_id)+'</small></p>').join('')+arr(detail.outbound_history).map(x=>'<p>Historik PPPP: '+esc(x.source)+' · '+esc(x.status)+'</p>').join('')+(arr(detail.emails).length||arr(detail.outbound_history).length?'':'<p>Pa komunikim të regjistruar.</p>')+'</section>'+
    '<section class="detail-section"><h2>RFQ / Opportunity</h2>'+(Object.keys(l.rfq||{}).length?'<p>RFQ: '+esc(l.rfq.text||'Dokumente të lidhura')+'</p>'+arr(l.rfq.attachments).map(x=>'<p>'+esc(x.attachment_name)+'</p>').join(''):'<p>RFQ ende e papranuar. Nuk supozojmë paketë të hapur prokurimi.</p>')+'</section>'+
    '<section class="detail-section"><h2>Hapi tjetër</h2><p>'+esc(nextAction(l))+'</p>'+
      (canDraft?'<label>Kontakti <select id="contact-choice">'+usable.map(x=>'<option value="'+esc(x.id||x.email)+'">'+esc(x.name||x.email)+' · '+esc(x.role||'Kontakt i përgjithshëm')+'</option>').join('')+'</select></label><div class="actions"><button id="draft-button">✉ Krijo draft Gmail</button><button class="secondary-button" id="preview-button">Shqyrto tekstin</button></div><div id="draft-preview"></div>':'<p class="notice">Drafti nuk hapet ende automatikisht. Së pari duhet të kemi fit të verifikuar dhe rrugë kontakti të mjaftueshme për outreach.</p>')+
      (['RFQ RECEIVED','REQUEST TO DRUSEIDT READY'].includes(l.pipeline)?'<div class="actions"><button id="supplier-button">Përgatit kërkesën te Druseidt · draft Gmail</button></div>':'')+
      '<p>Çdo dërgim bëhet vetëm me miratimin tuaj në Gmail.</p><details><summary>Përditëso pipeline me evidencë / vendim</summary><form id="decision-form" class="decision-form"><label>Gjendja<select name="state">'+stateOpts+'</select></label><label>Arsyeja e vendimit<textarea name="note" required minlength="12"></textarea></label><label>Gmail message ID për contacted/reply/RFQ<input name="message_id"></label><label>Burimi i evidencës komerciale<input name="source_url" type="url"></label><label>RFQ tekst / informacion i munguar<textarea name="rfq_text"></textarea></label><button>Ruaj vendimin</button></form></details></section>';
}
async function render(){
  const g=++generation,route=location.hash.slice(1)||'home';
  document.querySelectorAll('[data-view]').forEach(a=>{
    const leadRoute=route.startsWith('lead/')&&((selected?.lead?.kind==='direct'&&a.dataset.view==='market')||a.dataset.view===selected?.lead?.kind);
    if(a.dataset.view===route||leadRoute)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  try{
    if(!data)data=await api.snapshot();
    if(!data.target||data.target.company_domain_normalized!=='druseidt.de')throw new Error('Targeti canonical Druseidt nuk u identifikua.');
    let html;
    if(route.startsWith('lead/')){
      const detail=await api.detail(route.slice(5));if(!detail.lead)throw new Error('Lead-i nuk u gjet.');html=leadPage(detail);
    }else if(route==='catalogues')html=catalogues();
    else if(route==='market'||route==='direct')html=market();
    else if(['active','award','pipeline'].includes(route))html=list(route);
    else html=home();
    if(g!==generation)return;
    view.innerHTML=html;view.setAttribute('aria-busy','false');status.textContent='PPPP · të dhëna live · pa dërgime automatike';
  }catch(e){
    if(g!==generation)return;
    view.innerHTML=hero('Druseidt',e.message)+'<a class="action-button" href="../pristeel-procurement.html">Kthehu në PPPP</a>';
    status.textContent='Leximi nuk u verifikua';view.setAttribute('aria-busy','false');
  }
}
view.addEventListener('change',event=>{
  const el=event.target.closest('[data-filter]');if(!el)return;
  marketFilters[el.dataset.filter]=el.value;render();
});
view.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button||!selected||busy)return;
  const lead=selected.lead,contact=arr(selected.contacts).find(x=>String(x.id||x.email)===document.getElementById('contact-choice')?.value);
  if(button.id==='preview-button'){
    try{document.getElementById('draft-preview').innerHTML='<pre class="draft-preview">'+esc(draftMessage(lead,contact).plain)+'</pre>';}
    catch(e){document.getElementById('feedback').textContent=e.message;}return;
  }
  if(!['draft-button','supplier-button'].includes(button.id))return;
  busy=true;button.disabled=true;const feedback=document.getElementById('feedback');feedback.textContent='Duke kontrolluar historikun dhe draftet Gmail…';
  try{
    const r=await api.createDraft(lead.id,contact?.id||contact?.email,button.id==='supplier-button'?'supplier_request':'customer');
    data=null;await render();document.getElementById('feedback').innerHTML=esc(r.existing?'Drafti ekzistues u ripërdor.':'Drafti u krijua; emaili nuk u dërgua.')+' '+link(r.gmail_url,'Shqyrto në Gmail');
  }catch(e){feedback.textContent=e.message;}finally{busy=false;button.disabled=false;}
});
view.addEventListener('submit',async event=>{
  if(event.target.id!=='decision-form')return;event.preventDefault();if(busy)return;
  busy=true;const form=event.target,button=form.querySelector('button');button.disabled=true;const f=new FormData(form);
  try{
    await api.transition(selected.lead,f.get('state'),{note:f.get('note'),message_id:f.get('message_id'),source_url:f.get('source_url'),rfq_text:f.get('rfq_text')});
    data=null;await render();document.getElementById('feedback').textContent='Vendimi u ruajt me evidencë. Asnjë email nuk u dërgua.';
  }catch(e){document.getElementById('feedback').textContent=e.message;}finally{busy=false;button.disabled=false;}
});
window.addEventListener('hashchange',render);
render();
