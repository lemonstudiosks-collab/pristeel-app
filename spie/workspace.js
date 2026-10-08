import * as D from './data.mjs?v=20261008-overview2';
import * as O from './operations.mjs?v=20261008-overview2';
import * as B from './bridge.mjs?v=20261008-overview2';
import * as Documents from './documents.mjs?v=20261008-overview2';
import * as Tracker from './tracker.mjs?v=20261008-overview2';
import * as Evidence from './evidence.mjs?v=20261008-overview2';
const view=document.getElementById('view'), status=document.getElementById('read-status');
const VIEWS={overview:'Pasqyra',commercial:'Komerciale',execution:'Porositë / Prodhimi / Dërgesat',files:'Skedarët',finance:'Financat'};
const descriptions={overview:'Gjendja aktuale, veprimet dhe vendimet që kërkojnë vëmendjen tënde.',commercial:'Kërkesat, ofertat dhe versionet e tyre deri te porosia dhe kontrata.',execution:'Ndjekja e çdo porosie dhe dërgese, me fazat dhe dosjen për Zollcon e SPIE.',files:'Dosja reale e projektit. Një kërkim, dokumenti dhe burimi i saktë.',finance:'Ofertat, faturat dalëse dhe faturat hyrëse të ndara sipas kompanisë.'};
const s=x=>String(x??''), arr=x=>Array.isArray(x)?x:[], esc=x=>s(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=x=>x&&Number.isFinite(new Date(x).getTime())?new Date(x).toLocaleDateString('en-GB',{timeZone:'Europe/Budapest'}).replace(/\//g,'.'):'Pa datë';
const labels={unknown:'E paverifikuar',missing:'Mungon',preparing:'Në përgatitje',ready:'Gati',sent:'Dërguar',received:'Pranuar',review:'Për kontroll',in_progress:'Në zhvillim',done:'Përfunduar',not_applicable:'Jo relevante',draft:'Draft',approved:'Miratuar',pending:'Në pritje',verified:'Ruajtur dhe verifikuar',succeeded:'Përpunuar',uncertain:'Ruajtja kërkon verifikim',submitting:'Duke dërguar komandën'};
const label=x=>labels[x]||s(x), empty=x=>'<p class="empty">'+esc(x||'Nuk ka regjistra të verifikuar.')+'</p>';
const link=(url,title='Hap burimin')=>url?'<a class="evidence-link" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">'+esc(title)+'</a>':'';
const source=(url,at,note='')=>'<div class="provenance">'+esc(note)+(at?' · '+date(at):'')+(url?' · '+link(url):'')+'</div>';
const row=(title,body='',evidence='')=>'<div class="row"><div class="row-title">'+esc(title)+'</div>'+(body?'<div class="muted">'+esc(body)+'</div>':'')+evidence+'</div>';
const section=(title,body)=>'<section class="section"><div class="section-head"><h2>'+esc(title)+'</h2></div>'+body+'</section>';
const notice=x=>'<div class="notice" role="status">'+esc(x)+'</div>';
const pill=x=>'<span class="pill">'+esc(label(x))+'</span>';
const money=(x,currency)=>x===null||x===undefined||x===''?'Pa vlerë të verifikuar':Number(x).toLocaleString('sq-AL',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+esc(currency||'Monedha e paregjistruar');
let generation=0, token='', bundlePromise=null, bundleAt=0, financePromise=null, current=null;
function reset(){D.invalidate();bundlePromise=null;financePromise=null;bundleAt=0;}
async function load(){
 if(bundlePromise&&Date.now()-bundleAt<300000)return bundlePromise;
 bundleAt=Date.now();bundlePromise=Promise.all([D.workspaceSnapshot(),D.operationFacts().then(rows=>({rows})).catch(e=>({rows:[],error:e.message}))]).then(async([data,factResult])=>{
  const bundle=await D.operational(factResult.rows);
  const facts=factResult.rows;if(factResult.error)bundle.operationFacts={rows:[],error:factResult.error};
  data.context_facts=[...facts,...arr(data.context_facts).filter(f=>!facts.some(x=>x.fact_key===f.fact_key))];
  let drive=[],driveError='';try{const d=await D.liveDriveFiles(data.project.drive_folder_id);drive=d.files||[];if(d.truncated)driveError='Drive ka mbi 100 skedarë; lista e kufizuar nuk përfshin të gjithë dosjen.';}catch(e){driveError=e.message;}
  const model=D.operationalModel(data,bundle),files=O.fileModel(data,bundle,drive);model.errors.push(...arr(data.read_errors));model.files=files;const units=O.shipments(data,model,facts);
  return {data,bundle,model,files,units,facts,driveError,actionState:'pending',actionError:'',actionPromise:null};
 }).catch(e=>{bundlePromise=null;throw e;});return bundlePromise;
}
function fileAction(f){
 if(!f)return '';
 const identity=f.identity||f.id,drive=D.safeLink(f.drive_url||f.attachment_url,'drive'),gmail=D.safeLink(f.gmail_url||f.source_url,'gmail');
 const canPreview=identity&&!f.link_conflict&&(f.drive_file_id||f.gmail_message_id&&f.gmail_attachment_id);
 return '<div class="document-actions">'+(canPreview?'<button class="btn" data-preview-file="'+esc(identity)+'">Hap në modul</button>':'')+
 '<details class="source-menu"><summary>Burimi origjinal</summary>'+link(drive,'Drive')+link(gmail,'Gmail')+'</details>'+
 (f.link_conflict?'<span class="muted">'+esc(f.link_conflict)+'</span>':'')+(!drive&&!gmail&&!canPreview?'<span class="muted">Dokumenti nuk ka lidhje të verifikuar</span>':'')+'</div>';
}

function offerAction(o){return (o.side==='client'&&o.offer_state?.pristeel_model?Documents.recordAction('documents_registry',o.id.replace(/^client:/,'')):'')+fileAction({...o,identity:o.id,gmail_message_id:o.mail?.gmail_message_id,gmail_attachment_id:o.gmail_attachment_id,gmail_url:o.source_url});}
function offerVersions(offers){
 return O.offerGroups(offers).map(g=>'<details class="offer-record" open><summary>'+esc(g.party)+' · '+g.versions.filter(o=>o.kind==='offer').length+' versione</summary><p class="muted small">'+(g.current?'Versioni aktual i verifikuar: '+esc(g.current.title):'Versioni aktual: i paverifikuar. '+(g.latestSent?'Dërgimi më i fundit me provë: '+date(g.latestSent.sent_at)+'.':''))+'</p>'+g.versions.map(o=>'<details><summary>'+esc(o.title)+'<div class="provenance">'+esc(o.kind==='terms'?'Kushtet komerciale':o.terms||'Incoterm-i kërkon verifikim')+' · '+date(o.sent_at)+' · '+esc(o.state||'Status i paverifikuar')+'</div></summary><p class="offer-value">'+money(o.amount,o.currency)+'</p><dl class="facts offer-facts">'+[['DAP / DDP',o.terms],['Baza e shumës',o.amount_basis],['Pa lyerje',o.amount_without_painting===null||o.amount_without_painting===undefined?'':money(o.amount_without_painting,o.currency)],['Lyerja',o.painting_amount===null||o.painting_amount===undefined?'':money(o.painting_amount,o.currency)],['Pagesa',o.payment_terms],['Vlefshmëria',o.validity],['Transporti',o.transport],['Importi / dogana',o.customs],['CBAM',o.cbam],['Lyerja / veshja',o.painting],['Përfshirë',o.inclusions],['Përjashtuar',o.exclusions]].map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v||'Nuk është nxjerrë nga dokumenti')+'</dd></div>').join('')+'</dl>'+offerAction(o)+source('',o.sent_at,o.source)+'</details>').join('')+'</details>').join('')||empty('Nuk ka oferta në regjistrin e kufizuar dhe burimet e lexuara.');
}
function fileRows(files){return files.length?'<div class="table-wrap"><table><thead><tr><th>Dokumenti</th><th>Kategoria / versioni</th><th>Burimi</th></tr></thead><tbody>'+files.map(f=>'<tr><td class="file-title">'+esc(f.title||f.file_name||f.doc_nr)+fileAction(f)+'</td><td>'+esc(f.category)+'<div class="provenance">'+esc(f.notes.revision||'Revizioni i paverifikuar')+'</div></td><td>'+esc((f.sources||[f.source]).join(' / '))+'<div class="provenance">'+date(f.created_at)+'</div></td></tr>').join('')+'</tbody></table></div>':empty('Nuk ka skedarë të verifikuar në këtë kërkim.');}
function latestFact(c){return arr(c.data.context_facts).filter(f=>f.fact_status==='observed'&&f.value?.summary&&f.value?.source_email&&!f.value?.suppressed_by_canonical_state&&!f.value?.suppressed_by_operator_update).sort((a,b)=>s(b.value.source_sent_at).localeCompare(s(a.value.source_sent_at)))[0];}
function actions(c){
 const rows=arr(c.data.operator_actions).filter(a=>!/done|closed|kryer|mbyllur/.test(s(a.status))).slice(0,3).map(a=>row(a.title,a.detail,source('',a.due_date,'Afati')));
 if(!rows.length&&c.units.some(u=>u.stages.material.status==='in_progress'))rows.push(row('Kompleto materialin dhe konfirmo afatin me Aktiva','Pas konfirmimit të gatishmërisë, njofto SPIE për datën reale të dërgimit.'));
 if(!rows.length&&c.units.length)rows.push(row('Konfirmo fazën dhe afatin e dërgesës','Përdor burimin e porosisë dhe gjendjen nga Aktiva.'));
 return rows.join('')||(c.actionState==='ready'?empty('Nuk ka veprim të regjistruar; mungesa nuk provon se nuk ka punë të hapur.'):empty('Veprimet e regjistruara ende nuk janë verifikuar.'));
}
function actionReadStatus(c){return c.actionState==='pending'?'<p class="muted small">Veprimet e regjistruara po lexohen në prapavijë.</p>':c.actionState==='unavailable'?notice('Veprimet e regjistruara nuk u verifikuan: '+c.actionError)+'<button class="btn" data-retry-actions>Riprovo veprimet</button>':'';}
function hydrateActions(c,refresh=false){
 if(c.actionPromise||(!refresh&&c.actionState!=='pending'))return;
 const sessionToken=token;c.actionState='pending';c.actionError='';
 const paint=()=>{if(current!==c||D.session()?.access_token!==sessionToken)return;const node=document.getElementById('operator-actions'),message=document.getElementById('action-read-status');if(node)node.innerHTML=actions(c);if(message)message.innerHTML=actionReadStatus(c);};
 paint();c.actionPromise=D.workspaceActions({refresh}).then(rows=>{if(D.session()?.access_token!==sessionToken)return;c.data.operator_actions=rows;c.actionState='ready';}).catch(error=>{c.actionState='unavailable';c.actionError=error.message;}).finally(()=>{c.actionPromise=null;paint();});
}
function communications(c){
 const mails=arr(c.bundle.emails?.rows).filter(m=>m.needs_review===false&&!m.association_pending).sort((a,b)=>s(b.sent_at).localeCompare(s(a.sent_at))).slice(0,6);
 return section('Komunikimet e fundit',mails.map(m=>'<article class="communication-row"><div><b>'+esc(m.from_name||m.from_email)+'</b><span class="provenance">'+esc(m.direction==='outgoing'?' · Dërguar':' · Pranuar')+' · '+esc(new Date(m.sent_at).toLocaleString('sq-AL',{timeZone:'Europe/Budapest'}))+'</span></div><button class="message-title" data-preview-email="'+esc(m.gmail_message_id)+'">'+esc(m.subject)+'</button><p class="message-snippet">'+esc(s(m.snippet).slice(0,320))+'</p><span class="provenance">'+(m.external_source?'Lexuar nga Gmail · ende mungon në regjistrin PPPP':'Regjistri PPPP')+'</span></article>').join('')||empty('Nuk u lexuan komunikime të verifikuara.'))+
 (c.bundle.google?.error?notice('Gmail nuk u rifreskua plotësisht: '+c.bundle.google.error):'')+
 (!D.googleSession()?notice('Lidhja Gmail në PPPP duhet të jetë aktive që komunikimet e reja të lexohen menjëherë.'):'');
}
function overview(c){
 const active=c.units.filter(u=>u.stages.delivered.status!=='done'),latest=latestFact(c);
 const mail=arr(c.bundle.emails?.rows).filter(m=>m.needs_review===false&&!m.association_pending).sort((a,b)=>s(b.sent_at).localeCompare(s(a.sent_at)))[0];
 const now=mail?s(mail.snippet).slice(0,500):latest?.value.summary||'Gjendja kërkon konfirmim nga burimet e projektit.';
 const stages=active.flatMap(u=>Object.values(u.stages).filter(r=>r.status!=='done'&&r.status!=='not_applicable').map(r=>({...r,unit:u})));
 const dates=stages.filter(r=>r.planned_date).sort((a,b)=>s(a.planned_date).localeCompare(s(b.planned_date)));
 const missing=active.flatMap(u=>O.dossier(u,c.files).filter(r=>r.required===true&&!r.checked).map(r=>({name:r.name,owner:r.owner})));
 const stateRows=active.length?active.map(u=>'<tr><td>'+esc(u.title)+'</td><td>'+esc(u.phase)+'</td><td>'+esc(Object.values(u.stages).find(r=>r.status==='in_progress')?.owner||'Përgjegjësi i pakonfirmuar')+'</td><td>'+esc(Object.values(u.stages).find(r=>r.status==='in_progress')?.note||'Kërkohet konfirmim i fazës aktuale')+'</td><td><a href="#execution">Ndjekja</a></td></tr>').join(''):'<tr><td colspan="5">Nuk ka porosi ose dërgesë të konfirmuar në ndjekje.</td></tr>';
 return '<div class="summary"><b>Komunikimi më i fundit</b><p>'+esc(now)+'</p>'+(mail?'<button class="btn" data-preview-email="'+esc(mail.gmail_message_id)+'">Lexo emailin këtu</button>'+source('',mail.sent_at,mail.external_source?'Gmail · mungon në PPPP':'PPPP'):source('',latest?.value.source_sent_at))+'</div>'+
 section('Çfarë duhet bërë tani','<div id="action-read-status" role="status">'+actionReadStatus(c)+'</div><div id="operator-actions">'+actions(c)+'</div>')+
 section('Ku qëndrojmë me porositë, prodhimin dhe dërgesat','<div class="table-wrap"><table><thead><tr><th>Porosia / dërgesa</th><th>Gjendja</th><th>Përgjegjësi</th><th>Çfarë presim</th><th></th></tr></thead><tbody>'+stateRows+'</tbody></table></div>')+
 section('Financat, pagesat dhe garancitë','<div id="overview-finance" role="status">Duke lexuar regjistrat financiarë…</div>')+
 section('Afatet dhe pengesat',dates.slice(0,5).map(r=>row(r.unit.title+' · '+r.title,date(r.planned_date)+' · '+(r.owner||'Pa përgjegjës'),source(r.source_url,r.source_date))).join('')+
 missing.slice(0,5).map(r=>row('Mungon: '+r.name,r.owner)).join('')+(!dates.length?empty('Nuk ka afat aktiv të konfirmuar në ndjekje.'):'')+
 (c.data.project.deadline&&new Date(c.data.project.deadline)<new Date()?notice('Afati i projektit në PPPP është '+date(c.data.project.deadline)+'; kërkon rikonfirmim.'):'')+
 '<a class="evidence-link" href="#execution">Hap ndjekjen e plotë</a>')+
 communications(c)+section('Dokumentet e fundit',Documents.letterActions(c)+fileRows(c.files.slice(0,5)));
}
function hydrateFinance(c){
 if(!financePromise)financePromise=D.finance();const identity=token;
 financePromise.then(d=>{
  if(current!==c||D.session()?.access_token!==identity)return;
  const node=document.getElementById('overview-finance');if(!node)return;
  const f=O.financeModel(d,c.files,c.units),rows=[];
  for(const [name,items,key]of [['Faturat dalëse',f.outgoing,'sales'],['Faturat hyrëse',[...f.incoming.values()].flat(),'suppliers']]){
   if(d[key]?.error){rows.push(row(name,'Leximi dështoi: '+d[key].error));continue;}
   const groups=new Map();for(const i of items){const currency=i.currency||'Monedha e paregjistruar',g=groups.get(currency)||{paid:0,unpaid:0,unknown:0};g[i.paid===true?'paid':i.paid===false?'unpaid':'unknown']+=Number(i.gross_amount??i.amount??i.net_amount)||0;groups.set(currency,g);}
   rows.push(row(name,items.length+' regjistra'+(!items.length?' · Nuk ka fatura të regjistruara.':'')));
   for(const [currency,g]of groups)rows.push(row(currency,'Paguar: '+money(g.paid,currency)+' · E papaguar: '+money(g.unpaid,currency)+' · Pagesa e paverifikuar: '+money(g.unknown,currency)));
  }
  rows.push(row('Garancitë',d.guarantees?.error?'Leximi dështoi: '+d.guarantees.error:f.guarantees.length?f.guarantees.map(g=>(g.bank_name||'Banka')+' · '+money(g.amount_guaranteed,g.currency)+' · '+label(g.status)+' · '+date(g.expiry_date)).join('; '):'Nuk ka garanci të regjistruara.'));
  node.innerHTML=rows.join('')+'<a class="evidence-link" href="#finance">Hap regjistrat financiarë</a><p class="provenance">Shumat janë nga regjistrat e projektit; valutat mbahen veçmas. Kostoja dhe pagesa nuk konfirmohen nga emaili.</p>';
 }).catch(error=>{const node=document.getElementById('overview-finance');if(current===c&&node&&D.session()?.access_token===identity)node.textContent=error.message;});
}

function commercial(c){
 const documents=c.files.filter(f=>['RFQ','Porosi / PO','Kontrata'].includes(f.category));
 return section('RFQ / Kërkesat nga SPIE',fileRows(documents.filter(f=>f.category==='RFQ')))+section('Aktiva dhe furnitorët e tjerë',offerVersions(c.model.offers.filter(o=>o.side==='supplier')))+section('Ofertat PriSteel → SPIE · versionet dhe kushtet',offerVersions(c.model.offers.filter(o=>o.side==='client')))+section('Porositë / PO dhe kontratat',fileRows(documents.filter(f=>f.category!=='RFQ')))+(c.model.reviewOffers.length?section('Për kontroll · lidhja me projektin',notice('Këto prova nuk janë lidhur canonicalisht me projektin dhe nuk ndryshojnë fazën ose financat.')+offerVersions(c.model.reviewOffers)):'')+'<p class="metrics-note">Data e dokumentit ose dërgimi i ofertës nuk provon pranimin. Oferta e kthyer në porosi identifikohet vetëm nga referenca e verifikuar në PO / kontratë.</p>';
}
function stageRows(u){return '<div class="table-wrap"><table><thead><tr><th>Faza</th><th>Statusi / përgjegjësi</th><th>Planifikuar / reale</th><th>Mungon / rreziku / prova</th><th></th></tr></thead><tbody>'+Object.values(u.stages).map(r=>'<tr><td>'+esc(r.title)+'</td><td>'+pill(r.status)+'<div class="provenance">'+esc(r.owner||'Pa përgjegjës të konfirmuar')+'</div></td><td>'+date(r.planned_date)+'<div class="provenance">Reale: '+date(r.actual_date)+'</div></td><td>'+esc(r.status==='done'?r.note||'':r.note||r.missing||'')+(r.risk?'<div class="risk">'+esc(r.risk)+'</div>':'')+source(r.source_url,r.source_date)+'</td><td><button class="btn" data-stage="'+esc(r.id)+'" data-unit="'+esc(u.id)+'">Konfirmo faktin</button></td></tr>').join('')+'</tbody></table></div>';}
function checklist(u,c){const rows=O.dossier(u,c.files);return Object.entries(O.GROUPS).map(([key,name])=>section(name,'<div class="table-wrap"><table><thead><tr><th>Tick / dokumenti</th><th>Përgjegjësi</th><th>Statusi / data</th><th>Dokumenti / shënimi</th><th></th></tr></thead><tbody>'+rows.filter(r=>r.group===key).map(r=>'<tr><td><input type="checkbox" aria-label="Konfirmo '+esc(r.name)+'" data-check="'+esc(r.document_id)+'" data-unit="'+esc(u.id)+'" '+(r.checked?'checked ':'')+'>'+esc(r.name)+'<div class="provenance">'+(r.required===true?'I kërkuar':r.required===false?'Jo relevant':'Kërkesa për t’u konfirmuar')+'</div></td><td>'+esc(r.owner)+'</td><td>'+pill(r.status)+'<div class="provenance">'+date(r.date)+(r.auto?' · U gjet automatikisht':'')+'</div></td><td>'+fileAction(r.file)+source(r.source_url,r.source_date)+esc(r.conflict||r.note||'')+'</td><td><button class="btn" data-document="'+esc(r.document_id)+'" data-unit="'+esc(u.id)+'">Shëno dokumentin</button></td></tr>').join('')+'</tbody></table></div>')).join('');}
function execution(c){return '<p><button class="btn" data-new-unit>Regjistro ndjekjen e një porosie / loti / dërgese</button></p>'+(!c.units.length?empty('Nuk ka dërgesë të identifikuar. Regjistro vetëm ndjekjen; kjo nuk krijon PO ose zotim.'):c.units.map(u=>'<details class="shipment-record" open><summary>'+esc(u.title)+'<div class="provenance">'+esc(u.reference)+' · '+esc(u.incoterm||'Incoterm-i i dërgesës i pakonfirmuar')+' · '+esc(u.phase)+'</div></summary>'+source(u.source_url,u.source_date)+(u.technical?row(u.technical.note,'',source(u.technical.source_url,u.technical.source_date)):'')+arr(u.conflicts).map(x=>notice(x.note)+source(x.source_url,x.source_date)).join('')+stageRows(u)+section('Dosja për dërgesë','<button class="btn" data-new-document data-unit="'+esc(u.id)+'">Shëno dokument tjetër të kërkuar</button>'+checklist(u,c))+'</details>').join(''));}
function invoiceTable(rows){return rows.length?'<div class="table-wrap"><table><thead><tr><th>Fatura</th><th>Data / afati</th><th>Shuma</th><th>Statusi / dërgesa / dokumenti</th></tr></thead><tbody>'+rows.map(i=>'<tr><td>'+esc(i.invoice_nr||i.supplier_invoice_nr||'Pa numër')+(i.notes&&String(typeof i.notes==='string'?i.notes:JSON.stringify(i.notes)).includes('pristeel_model')?Documents.recordAction('invoices_out',i.id):'')+'<div class="provenance">'+esc(i.supplier||i.client)+'</div></td><td>'+date(i.date)+'<div class="provenance">Afati: '+date(i.due_date)+'</div></td><td>'+money(i.gross_amount??i.amount??i.net_amount,i.currency)+'</td><td>'+esc(i.paymentStatus)+(i.paid_date?' · '+date(i.paid_date):'')+'<div class="provenance">'+esc(i.shipment?.title||'Lidhja me dërgesën e paverifikuar')+'</div>'+fileAction(i.file||{attachment_url:i.attachment_url})+'</td></tr>').join('')+'</tbody></table></div>':empty('Nuk ka fatura të regjistruara për këtë projekt.');}
function documentEmails(c){const rows=c.facts.filter(f=>f.fact_key?.startsWith('spie.document.email.v1.')&&f.value?.project_id===D.PROJECT_ID&&f.value?.event_type==='gmail_draft');return section('Draftet e dokumenteve',rows.length?rows.map(f=>row(f.value.payload.document_nr,'Draft Gmail · nuk provon dërgim',link(D.safeLink(f.source_ref,'gmail'),'Hap draftin'))).join(''):empty('Ende nuk ka drafte dokumentesh të regjistruara për këtë projekt.'));}
async function finance(c){
 if(!financePromise)financePromise=D.finance();const d=await financePromise,f=O.financeModel(d,c.files,c.units);
 const error=k=>d[k]?.error?notice('Leximi dështoi: '+d[k].error):'';
 return section('Letrat zyrtare',Documents.letterActions(c)||empty('Nuk ka letra të regjistruara.'))+documentEmails(c)+section('Notat kreditore / korrigjimet',error('adjustments')||arr(d.adjustments?.rows).map(r=>row(r.document_nr+' · '+r.original_invoice_nr,money((r.document_type==='credit_note'?-1:1)*r.gross_amount,r.currency)+' · '+(r.reason_text||'')+' · '+date(r.document_date),r.notes&&String(typeof r.notes==='string'?r.notes:JSON.stringify(r.notes)).includes('pristeel_model')?Documents.recordAction('commercial_adjustments',r.id):'')).join('')||empty('Nuk ka nota kreditore të regjistruara.'))+section('A. Ofertat tona për SPIE',offerVersions(c.model.offers.filter(o=>o.side==='client'&&o.kind==='offer')))+section('B. Faturat dalëse PriSteel → SPIE',error('sales')||invoiceTable(f.outgoing))+section('C. Faturat hyrëse Aktiva',error('suppliers')||invoiceTable(f.incoming.get('Aktiva')||[]))+section('D. Faturat hyrëse Zollcon',error('suppliers')||invoiceTable(f.incoming.get('Zollcon')||[]))+section('E. Faturat hyrëse nga furnitorët e tjerë',error('suppliers')||[...f.incoming].filter(([k])=>!['Aktiva','Zollcon'].includes(k)).map(([k,v])=>section(k,invoiceTable(v))).join('')||empty('Nuk ka fatura nga furnitorë të tjerë.'))+section('F. Garancitë / kostot e tjera',(error('expenses')||arr(d.expenses?.rows).map(e=>row(e.category+' · '+e.supplier,money(e.amount??e.net_amount,e.currency),source('',e.date,'Kosto në PPPP'))).join(''))+(error('guarantees')||f.guarantees.map(g=>row(g.bank_name+' · '+s(g.guarantee_type),money(g.amount_guaranteed,g.currency)+' · '+label(g.status)+' · Skadimi: '+date(g.expiry_date))).join('')||empty('Nuk ka garanci të regjistruara për këtë projekt.')))+'<p class="metrics-note">Pagesat pasqyrojnë vetëm regjistrin canonical. Valutat mbahen veçmas. Nuk llogaritet gjendja bankare. Lista është e kufizuar në '+D.LIMITS.invoices+' fatura për regjistër.</p>';
}
function editor(u,eventType,id){
 const isDoc=eventType==='document',r=isDoc?(O.dossier(u,current.files).find(x=>x.document_id===id)||{name:'',group:'A',owner:'PriSteel',status:'missing',required:true}):u.stages[id],dialog=document.createElement('dialog');dialog.className='operation-editor';
 const options=isDoc?['missing','preparing','ready','sent','received','not_applicable']:['unknown','in_progress','done','not_applicable'];
 dialog.innerHTML='<form method="dialog"><h2>'+esc(r.name||r.title)+'</h2><p class="muted small">Ruaje vetëm faktin që konfirmon. Bridge-i verifikohet pas përpunimit; kjo nuk autorizon email, kontratë ose porosi.</p><label>Përgjegjësi<input name="owner" value="'+esc(r.owner)+'" maxlength="120"></label><label>Statusi<select name="status">'+options.map(x=>'<option value="'+x+'" '+(r.status===x?'selected':'')+'>'+label(x)+'</option>').join('')+'</select></label>'+(isDoc?'<label>Emri i dokumentit<input name="name" value="'+esc(r.name)+'" maxlength="160" required></label><label>Grupi<select name="group">'+Object.entries(O.GROUPS).map(([key,name])=>'<option value="'+key+'" '+(r.group===key?'selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label><label>Kërkesa<select name="required"><option value="">Për t’u konfirmuar</option><option value="true" '+(r.required===true?'selected':'')+'>I kërkuar</option><option value="false" '+(r.required===false?'selected':'')+'>Jo relevant</option></select></label><label>Dokumenti real<select name="file_identity"><option value="">Pa dokument të lidhur</option>'+current.files.filter(f=>!f.link_conflict).map(f=>'<option value="'+esc(f.identity)+'" '+(r.file_identity===f.identity?'selected':'')+'>'+esc(f.title)+'</option>').join('')+'</select></label><label>Data<input type="date" name="date" value="'+esc(s(r.date).slice(0,10))+'"></label>':'<label>Data e planifikuar<input type="date" name="planned_date" value="'+esc(r.planned_date)+'"></label><label>Data reale<input type="date" name="actual_date" value="'+esc(r.actual_date)+'"></label>')+'<label>Burimi / prova · URL Gmail ose Drive<input type="url" name="source_url" value="'+esc(r.source_url||'')+'"></label><label>Shënim i shkurtër<textarea name="note" maxlength="700">'+esc(r.note||'')+'</textarea></label><p class="editor-error" role="alert"></p><div class="document-actions"><button class="btn" type="button" data-cancel>Anulo</button><button class="btn" type="submit">Mirato dhe ruaj në PPPP</button></div></form>';
 document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();
 dialog.querySelector('form').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,values=Object.fromEntries(new FormData(form)),sourceUrl=D.safeLink(values.source_url,'gmail')||D.safeLink(values.source_url,'drive'),file=current.files.find(f=>f.identity===values.file_identity);
  try{
   if(values.source_url&&!sourceUrl)throw new Error('Përdor lidhjen reale Gmail ose Drive.');
   if(['done','sent','received'].includes(values.status)&&(!sourceUrl||!values[isDoc?'date':'actual_date']))throw new Error('Statusi kërkon burimin dhe datën reale të verifikuar.');
   if(isDoc&&values.status==='ready'&&!file)throw new Error('Lidhe dokumentin real për statusin Gati.');
   const payload=isDoc?{document_id:id,name:values.name,group:values.group,owner:values.owner,status:values.status,required:values.required===''?null:values.required==='true',file_identity:values.file_identity,date:values.date,note:values.note}:{stage_id:id,owner:values.owner,status:values.status,planned_date:values.planned_date,actual_date:values.actual_date,note:values.note};
   form.querySelector('[type=submit]').disabled=true;await B.submitOperation({shipment_id:u.id,event_type:eventType,payload,source_url:sourceUrl||file?.drive_url||file?.gmail_url||''},true);dialog.close();showPending();
  }catch(error){form.querySelector('[type=submit]').disabled=false;form.querySelector('.editor-error').textContent=error.message;showPending();}
 };
}
function newUnit(){const dialog=document.createElement('dialog');dialog.className='operation-editor';dialog.innerHTML='<form><h2>Ndjekja e porosisë / lotit / dërgesës</h2><label>Emri<input name="title" required maxlength="160"></label><label>Referenca<input name="reference" required maxlength="160"></label><label>Incoterm-i<select name="incoterm"><option value="">I pakonfirmuar</option><option>DAP</option><option>DDP</option><option>FCA</option><option>EXW</option></select></label><label>Burimi · Gmail ose Drive<input name="source_url" type="url" required></label><p class="editor-error" role="alert"></p><div class="document-actions"><button class="btn" type="button" data-cancel>Anulo</button><button class="btn" type="submit">Mirato ndjekjen dhe ruaj</button></div></form>';document.body.append(dialog);dialog.showModal();dialog.onclose=()=>dialog.remove();dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,v=Object.fromEntries(new FormData(f)),url=D.safeLink(v.source_url,'gmail')||D.safeLink(v.source_url,'drive');try{if(!url)throw new Error('Përdor burimin real të projektit.');f.querySelector('[type=submit]').disabled=true;await B.submitOperation({shipment_id:'unit-'+crypto.randomUUID(),event_type:'shipment',payload:{title:v.title,reference:v.reference,incoterm:v.incoterm},source_url:url},true);dialog.close();showPending();}catch(error){f.querySelector('.editor-error').textContent=error.message;f.querySelector('[type=submit]').disabled=false;showPending();}};}
function showPending(){const node=document.getElementById('bridge-status'),p=B.pendingCommand();if(node)node.innerHTML=p?notice('Ruajtja: '+label(p.status)+' · '+p.id+' · Përpunimi i bridge-it mund të zgjasë deri në 10 minuta.')+'<button class="btn" data-verify>Verifiko ruajtjen</button>':'';}
view.addEventListener('change',e=>{if(e.target.dataset.check){const t=e.target,u=current.units.find(x=>x.id===t.dataset.unit);t.checked=!t.checked;editor(u,'document',t.dataset.check);}});
view.addEventListener('click',async e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.openLetter){try{await Documents.openSavedLetter(t.dataset.openLetter,current);}catch(error){status.textContent=error.message;}return;}
 if(t.dataset.previewEmail){try{await Evidence.email(current.bundle.emails.rows.find(m=>m.gmail_message_id===t.dataset.previewEmail));}catch(error){status.textContent=error.message;}return;}
 if(t.dataset.previewFile){const f=current.files.find(f=>f.identity===t.dataset.previewFile)||current.model.offers.concat(current.model.reviewOffers).find(f=>f.id===t.dataset.previewFile);try{await Evidence.file(f);}catch(error){status.textContent=error.message;}return;}
 if(t.hasAttribute('data-refresh-project')){reset();await route();return;}
 if(t.dataset.openSaved){t.disabled=true;try{await Documents.openSaved(t.dataset.recordTable,t.dataset.openSaved,current);}catch(error){status.textContent=error.message;}finally{t.disabled=false;}return;}
 if(t.dataset.createDocument){t.disabled=true;try{await Documents.open(t.dataset.createDocument,current);}catch(error){status.textContent=error.message;}finally{t.disabled=false;}return;}
 if(t.hasAttribute('data-tracker')){t.disabled=true;try{await Tracker.open(current);}catch(error){status.textContent=error.message;}finally{t.disabled=false;}return;}
 if(t.hasAttribute('data-retry-read')){reset();await route();return;}
 if(t.hasAttribute('data-retry-actions')){if(current)hydrateActions(current,true);return;}
 if(t.dataset.stage)editor(current.units.find(x=>x.id===t.dataset.unit),'stage',t.dataset.stage);
 if(t.dataset.document)editor(current.units.find(x=>x.id===t.dataset.unit),'document',t.dataset.document);
 if(t.hasAttribute('data-new-unit'))newUnit();
 if(t.hasAttribute('data-new-document'))editor(current.units.find(x=>x.id===t.dataset.unit),'document','custom-'+crypto.randomUUID());
 if(t.hasAttribute('data-verify')){t.disabled=true;try{const r=await B.verifyPending();if(r?.status==='verified'){reset();await route();status.textContent='Ruajtur në PPPP dhe verifikuar';}else showPending();}catch(error){status.textContent=error.message;}finally{t.disabled=false;}}
 if(t.dataset.download){const f=current.files.find(x=>x.identity===t.dataset.download)||current.model.offers.concat(current.model.reviewOffers).find(x=>x.id===t.dataset.download);if(!f)return;t.disabled=true;try{await D.downloadAttachment({gmail_message_id:f.gmail_message_id||f.mail?.gmail_message_id,gmail_attachment_id:f.gmail_attachment_id,title:f.title,attachment_mime_type:f.attachment_mime_type});}catch(error){status.textContent=error.message;}finally{t.disabled=false;}}
});
async function route(){
 const aliases={offers:'commercial',projects:'execution',emails:'overview',partners:'overview'},requested=location.hash.slice(1),name=VIEWS[requested]?requested:aliases[requested]||'overview',g=++generation;
 document.querySelectorAll('[data-view]').forEach(a=>a.setAttribute('aria-current',a.dataset.view===name?'page':'false'));
 document.getElementById('work-description').textContent=descriptions[name];view.setAttribute('aria-busy','true');status.textContent='Duke lexuar PPPP…';
 try{
  const session=await D.ensureSession();if(g!==generation)return;if(!session)throw new Error('SESSION_REQUIRED: Hap PPPP për të hyrë.');
  if(token!==session.access_token){reset();token=session.access_token;}
  const c=await load();if(g!==generation||D.session()?.access_token!==token)return;current=c;
  const body=name==='overview'?overview(c):name==='commercial'?commercial(c):name==='execution'?execution(c):name==='finance'?await finance(c):'<div class="toolbar"><label>Kërko në dosje<input id="file-search" type="search" placeholder="Emër, referencë, kategori ose fjalë"></label></div><div id="file-results">'+fileRows(c.files)+'</div>';
  if(g!==generation||D.session()?.access_token!==token)return;
  const errors=c.model.errors.concat(c.driveError?[{source:'Drive',error:c.driveError}]:[]);
  view.innerHTML='<div class="hero"><p class="eyebrow">SPIE / TENNET BUNT</p><h1>'+esc(VIEWS[name])+'</h1><p class="muted">'+esc(c.data.project.name)+'</p></div>'+errors.map(e=>notice(e.error)).join('')+'<div id="bridge-status"></div>'+ ('<div class="project-actions">'+Documents.menu()+Tracker.action()+'<button class="btn" data-refresh-project>Rifresko tani</button></div>')+body+'<p class="view-footer">PPPP është gjendja canonical. Burimet e palidhura ose të paqarta kërkojnë kontroll. Rifreskimi bëhet automatikisht çdo 2 minuta kur kjo faqe është aktive. Burimet e palidhura nuk ndryshojnë gjendjen e projektit.</p>';
  showPending();document.getElementById('file-search')?.addEventListener('input',e=>{const q=e.target.value.normalize('NFC').toLowerCase();document.getElementById('file-results').innerHTML=fileRows(c.files.filter(f=>[f.title,f.file_name,f.doc_nr,f.category,f.notes.revision,f.notes.document_key].map(s).join(' ').normalize('NFC').toLowerCase().includes(q)));});
  status.textContent='Lexuar: '+new Date().toLocaleTimeString('sq-AL',{timeZone:'Europe/Budapest'})+' · PPPP / Gmail';
  hydrateActions(c);if(name==='overview')hydrateFinance(c);
 }catch(error){if(g!==generation)return;view.innerHTML=notice(error.message)+'<p><button class="btn" data-retry-read>Riprovo leximin</button> <a class="btn" href="../pristeel-procurement.html">Hap PPPP</a></p>';status.textContent='Të dhënat nuk u verifikuan';}
 finally{if(g===generation)view.setAttribute('aria-busy','false');}
}
document.addEventListener('spie:document-saved',()=>{financePromise=null;bundlePromise=null;bundleAt=0;D.invalidate();});
document.addEventListener('spie:document-closed',()=>route());
document.addEventListener('spie:tracker-uploaded',()=>{reset();route();});
window.addEventListener('hashchange',route);
window.addEventListener('storage',e=>{if(e.key==='pristeel_session'||e.key===null){reset();route();}else if(e.key?.startsWith('pst_google_workspace_')){reset();route();}});
function autoRefresh(){if(document.visibilityState==='visible'&&!document.querySelector('dialog[open]')&&view.getAttribute('aria-busy')!=='true'&&Date.now()-bundleAt>=120000){reset();route();}}
window.addEventListener('focus',autoRefresh);
document.addEventListener('visibilitychange',autoRefresh);
setInterval(autoRefresh,30000);
window.addEventListener('pageshow',e=>{if(e.persisted)route();});
route();


