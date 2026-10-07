import * as D from './data.mjs?v=20261007-operational1';

const view = document.getElementById('view');
const readStatus = document.getElementById('read-status');
const allowedViews = ['overview', 'offers', 'projects', 'files', 'emails', 'finance', 'partners'];
const stages = ['RFQ', 'Offer', 'Negotiation', 'Samples', 'Contract', 'Production', 'Delivery', 'Payment'];
let routeGeneration = 0;
let snapshotPromise;
let snapshotAt = 0;
let overviewPromise;
let operationalPromise;
let authenticatedToken = '';
const str = x => String(x ?? '');
const arr = x => Array.isArray(x) ? x : [];
const escape = x => str(x).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const text = (x, cap = 500) => escape(typeof x === 'string' || typeof x === 'number' ? str(x).slice(0, cap) : '');
// Translate display labels only; canonical stage, filter and evidence values stay unchanged.
const labels = Object.freeze({
  "SPIE has shortlisted PriSteel for the next sourcing step and requested two samples, targeting around 12 Oct 2026 if possible. Confirm the technical basis and achievable window. The official order, production start and delivery commitment remain unverified.": "SPIE ka përfshirë PriSteel në listën e ngushtë për fazën e ardhshme të kërkimit të furnitorëve dhe ka kërkuar dy mostra, me synim rreth 12 tetorit 2026 nëse është e mundur. Konfirmoni bazën teknike dhe afatin e realizueshëm. Porosia zyrtare, fillimi i prodhimit dhe zotimi për dorëzim mbeten të paverifikuar.",
  "SPIE Samples phase and existing Drive document metadata": "Faza e mostrave SPIE dhe të dhënat e dokumenteve ekzistuese në Drive",
  "overview": "Pasqyra",
  "offers": "Ofertat",
  "projects": "Projektet",
  "finance": "Financat",
  "partners": "Partnerët",
  "files": "Skedarët",
  "emails": "Emailat",
  "RFQ": "Kërkesë për ofertë",
  "Offer": "Oferta",
  "Negotiation": "Negocimi",
  "Samples": "Mostrat",
  "Contract": "Kontrata",
  "Production": "Prodhimi",
  "Delivery": "Dorëzimi",
  "Payment": "Pagesa",
  "Schedule": "Afatet",
  "Technical": "Teknike",
  "Commercial": "Komerciale",
  "Finance": "Financat",
  "Contracts": "Kontratat",
  "Quality": "Cilësia",
  "Logistics": "Logjistika",
  "Unclassified": "E paklasifikuar",
  "General": "Të përgjithshme",
  "On track": "Sipas planit",
  "Attention": "Kërkon vëmendje",
  "Critical": "Kritike",
  "Unknown": "E panjohur",
  "action_required": "Kërkon veprim",
  "waiting_external": "Në pritje të palës tjetër",
  "active": "Aktiv",
  "closed": "I mbyllur",
  "in_progress": "Në zhvillim",
  "draft": "Draft",
  "sent": "Dërguar",
  "received": "Pranuar",
  "approved": "Miratuar",
  "pending": "Në pritje",
  "inbound": "Hyrës",
  "outbound": "Dalës",
  "incoming": "Hyrës",
  "outgoing": "Dalës",
  "in": "Hyrës",
  "out": "Dalës",
  "rfq": "Kërkesë për ofertë",
  "rfq_in": "Kërkesë për ofertë e pranuar",
  "sourcing": "Kërkim furnitorësh",
  "technical_review": "Shqyrtim teknik",
  "pricing": "Përgatitje e çmimit",
  "client_offer": "Oferta për klientin",
  "commercial": "Faza komerciale",
  "negotiation": "Negocimi",
  "samples": "Mostrat",
  "sample": "Mostra",
  "contract": "Kontrata",
  "production": "Prodhimi",
  "execution": "Zbatimi",
  "delivery": "Dorëzimi",
  "payment": "Pagesa",
  "paid": "Paguar",
  "unpaid": "Papaguar",
  "expired": "E skaduar",
  "released": "E liruar",
  "sales": "Faturat e klientit",
  "suppliers": "Faturat e furnitorëve",
  "guarantees": "Garancitë",
  "documents": "Dokumentet",
  "contracts": "Kontratat",
  "Unknown currency": "Monedhë e panjohur",
  "Drive metadata snapshot": "Pasqyra e të dhënave nga Drive",
  "client": "Klienti",
  "manufacturer": "Prodhuesi",
  "supplier": "Furnitori",
  "importer": "Importuesi",
  "logistics": "Logjistika",
  "subcontractor": "Nënkontraktori",
  "performance": "E realizimit",
  "advance_payment": "E parapagimit",
  "warranty": "E garancisë",
  "bid_bond": "E tenderit",
  "retention": "E shumës së mbajtur"
});
const label = value => labels[str(value)] ?? str(value);
const date = x => { if (!x) return 'E panjohur'; const d = new Date(x); if (Number.isNaN(d.getTime())) return 'E panjohur'; const parts = new Intl.DateTimeFormat('sq-AL', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Europe/Budapest' }).formatToParts(d); const part = type => parts.find(p => p.type === type)?.value; return part('day') + '.' + part('month') + '.' + part('year'); };
const time = x => { const parts = new Intl.DateTimeFormat('sq-AL', { hour:'2-digit', minute:'2-digit', hourCycle:'h23', timeZone:'Europe/Budapest' }).formatToParts(new Date(x)); return parts.find(p => p.type === 'hour')?.value + ':' + parts.find(p => p.type === 'minute')?.value; };
const badge = (status = 'Unknown') => '<span class="pill ' + escape(status.toLowerCase().replace(/ /g,'-')) + '">' + escape(label(status)) + '</span>';
const empty = msg => '<p class="empty">' + escape(msg || 'Nuk ka të dhëna të verifikuara.') + '</p>';
const sourceLink = (href, label = 'Burimi') => href ? '<a class="evidence-link" href="' + escape(href) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + ' ↗</a>' : '';
const provenance = (label, timestamp, href) => '<div class="provenance">' + escape(label) + (timestamp ? ' · ' + date(timestamp) : '') + (href ? ' · ' + sourceLink(href) : '') + '</div>';
const row = (title, detail = '', evidence = '') => '<div class="row"><div class="row-title">' + text(title) + '</div>' + (detail ? '<div class="muted">' + text(detail) + '</div>' : '') + evidence + '</div>';
const section = (title, body, link = '') => '<section class="section"><div class="section-head"><h2>' + escape(title) + '</h2>' + (link ? '<a href="#' + escape(link) + '">Shiko të gjitha →</a>' : '') + '</div>' + body + '</section>';
const notice = (msg, error = false) => '<div class="notice' + (error ? ' error' : '') + '" role="' + (error ? 'alert' : 'note') + '">' + escape(msg) + '</div>';
const pageHeader = (name, detail) => '<div class="hero"><p class="eyebrow">SPIE · HAPËSIRA E PUNËS · TENNET</p><h1>' + escape(name) + '</h1><p class="muted">' + escape(detail) + '</p></div>';
const footer = () => '<p class="view-footer">Pasqyrë vetëm për lexim · Regjistrat e projektit ruhen në PPPP · Skedarët origjinalë në Drive dhe komunikimi në Gmail.</p>';

function ensureSnapshot() {
  if (!snapshotPromise || Date.now() - snapshotAt > 300000) { snapshotAt = Date.now(); snapshotPromise = D.snapshot(); overviewPromise = null; }
  return snapshotPromise;
}
function ensureOverview() {
  if (Date.now() - snapshotAt > 300000) { snapshotPromise = null; overviewPromise = null; }
  if (!overviewPromise) overviewPromise = ensureOperational();
  return overviewPromise;
}
function ensureOperational() {
  if (!operationalPromise || Date.now()-snapshotAt>300000) {
    operationalPromise=Promise.all([ensureSnapshot(),D.operational()]).then(([data,bundle])=>({data,bundle,model:D.operationalModel(data,bundle)}));
  }
  return operationalPromise;
}
function phase(data) {
  const project = data.project;
  const mapping = { rfq:'RFQ', sourcing:'RFQ', offer:'Offer', pricing:'Offer', negotiation:'Negotiation', samples:'Samples', sample:'Samples', contract:'Contract', production:'Production', execution:'Production', delivery:'Delivery', payment:'Payment' };
  const canonical = mapping[str(project.pipeline_stage).toLowerCase()];
  if (canonical && stages.indexOf(canonical) > 3) return canonical;
  const evidence = D.workspaceEvidence(data)?.value?.workspace_phase;
  return evidence && stages.includes(evidence.status) && evidence.evidence && D.safeLink(evidence.source_url, 'gmail') ? evidence.status : canonical || 'Unknown';
}
function phaseNote(data) {
  const project = data.project;
  const fact = D.workspaceEvidence(data), evidence = fact?.value?.workspace_phase;
  if (evidence && phase(data) === evidence.status && evidence.evidence && D.safeLink(evidence.source_url, 'gmail')) return provenance('Faza e projektit është verifikuar nga komunikimi me SPIE dhe ruhet në PPPP', evidence.observed_at, D.safeLink(evidence.source_url, 'gmail'));
  if (str(project.pipeline_stage).toLowerCase() === 'samples') return '';
  if (stages.indexOf(phase(data)) > 3) return '';
  return notice('Mostrat janë faza e deklaruar nga operatori (5 tetor 2026). PPPP ka regjistruar "' + label(project.pipeline_stage || 'Unknown') + '". Kontrolloni fazën në PPPP para përditësimit.');
}
function stageTrack(data) {
  return '<ol class="stage-track" aria-label="Fazat e projektit">' + stages.map(name => '<li' + (name === phase(data) ? ' aria-current="step"' : '') + '>' + escape(label(name)) + '</li>').join('') + '</ol><p class="provenance">Tregohet vetëm faza aktuale; fazat e mëparshme nuk shënohen të përfunduara dhe nuk llogaritet përqindje përfundimi.</p>';
}
function facts(data) { return arr(data.context_facts); }
function observedFacts(data) { return facts(data).filter(f => f.fact_status === 'observed' && f.evidence_status !== 'review'); }
function factSource(f) {
  const id = str(f.source_ref).replace(/^gmail:/,'');
  return /^[a-f0-9]+$/i.test(id) ? 'https://mail.google.com/mail/u/0/#all/' + id : D.safeLink(f.value?.source_url, 'drive');
}
function health(data) {
  const domains = ['Schedule', 'Technical', 'Commercial', 'Finance', 'Contracts'];
  const valid = ['On track','Attention','Critical','Unknown'];
  const healthFact = observedFacts(data).find(f => f.value?.project_health && f.source_ref);
  return '<div class="health">' + domains.map(domain => {
    const evidence = healthFact?.value?.project_health?.[domain.toLowerCase()];
    const status = evidence && valid.includes(evidence.status) && evidence.evidence ? evidence.status : 'Unknown';
    return '<div><span>' + escape(label(domain)) + '</span>' + badge(status) + '</div>' + (status !== 'Unknown' ? provenance(str(evidence.evidence), healthFact.updated_at, factSource(healthFact)) : '');
  }).join('') + '</div><p class="metrics-note">Gjendja kërkon status të qartë të mbështetur në burime. Kur mungojnë provat, gjendja mbetet e panjohur.</p>';
}
function summary(data) {
  const latest = observedFacts(data).find(f => typeof f.value?.situation_summary === 'string' || typeof f.value?.executive_summary === 'string');
  if (latest) return text(label(latest.value.situation_summary || latest.value.executive_summary), 700) + provenance(label(latest.subject) || 'Konteksti i projektit',latest.updated_at,factSource(latest));
  return 'TenneT është në fazën ' + escape(label(phase(data))) + '. ' + (data.recent_emails?.length ? 'Kontrolloni më poshtë komunikimin e fundit, kërkesat teknike dhe vendimet e hapura.' : 'Komunikimi aktual dhe gatishmëria ende kërkojnë verifikim.');
}
function sampleEvidence(data) { return arr(data.recent_emails).find(m=>m.gmail_message_id === '1a0fb8a8d5040dc9' && !m.needs_review); }
function currentActions(data) {
  const sample = sampleEvidence(data);
  const proposal = sample ? row('Konfirmoni bazën teknike dhe afatin e realizueshëm për dorëzimin e mostrave', 'Propozim për shqyrtim bazuar në kërkesën e SPIE për 2 mostra, me synim rreth 12 tetorit 2026 nëse është e mundur. Kërkesa nuk është zotim i konfirmuar për dorëzim.', provenance('Kërkesa e SPIE për mostra',sample.sent_at,D.gmailLink(sample))) : '';
  const f = observedFacts(data).find(f => f.value?.current_operator_action && f.source_ref);
  if (f && typeof f.value.current_operator_action === 'string') return row(f.value.current_operator_action, '', provenance(f.subject, f.updated_at, factSource(f)));
  const recent = arr(data.operator_actions).filter(a => a.created_at && Date.now() - new Date(a.created_at).getTime() < 14*86400000);
  const list = recent.slice(0,3).map(a => row(a.title, a.detail, provenance('Veprim i operatorit i regjistruar në PPPP', a.created_at))).join('');
  return proposal + (list || (proposal ? '' : empty('Kjo pasqyrë e kufizuar nuk përmban veprim të fundit të operatorit të mbështetur në burime. Kjo nuk provon se projekti nuk ka punë të hapura.')));
}
function waitingFor(data) {
  const f = observedFacts(data).find(f => f.value?.waiting_for && f.source_ref);
  if (!f) {
    const sample = sampleEvidence(data);
    return sample ? row('Porosia zyrtare për mostra · pranimi i paverifikuar', 'SPIE ka deklaruar se porosia zyrtare do të pasojë. Kontrolloni bisedën aktuale; pranimi i mëvonshëm nuk supozohet.', provenance('Deklaratë në kërkesën e SPIE',sample.sent_at,D.gmailLink(sample))) : empty('Pala nga e cila pritet përgjigjja dhe zotimi nuk janë verifikuar në pasqyrën aktuale.');
  }
  const values = Array.isArray(f.value.waiting_for) ? f.value.waiting_for : [f.value.waiting_for];
  return values.filter(x => typeof x === 'string').slice(0,3).map(x => row(x, '', provenance(f.subject,f.updated_at,factSource(f)))).join('') || empty();
}
function fileRows(rows, compact = false) {
  if (!rows.length) return empty('Nuk u kthyen të dhëna për dokumentet e projektit. Kontrolloni dosjen ekzistuese në Drive për dokumentacionin e plotë.');
  if (compact) return rows.slice(0,3).map(f => {
    const m=D.metadata(f);
    return row(f.title || f.file_name || f.doc_nr || 'Dokument', label(m.category) + ' · Rishikimi: ' + (m.revision ?? 'E panjohur'), provenance(label(f.source) || 'Të dhënat e dokumentit në PPPP', f.created_at, D.safeLink(f.drive_url, 'drive') || D.safeLink(f.gmail_url,'gmail')));
  }).join('');
  return '<div class="table-wrap"><table><thead><tr><th style="width:40%">Dokumenti</th><th style="width:18%">Kategoria</th><th style="width:20%">Rishikimi</th><th style="width:22%">Burimi / data</th></tr></thead><tbody>' + rows.map(f => {
    const m=D.metadata(f), link=D.safeLink(f.drive_url,'drive');
    return '<tr><td class="file-title">' + text(f.title || f.file_name || f.doc_nr || 'Dokument') + (m.documentKey ? '<div class="provenance">' + text(m.documentKey) + '</div>' : '') + '</td><td>' + escape(label(m.category)) + (m.categorySuggested ? '<div class="provenance">Propozuar nga titulli</div>' : '') + '</td><td>' + text(m.revision ?? 'E panjohur') + (m.latest ? '<div class="provenance">Rishikimi i fundit i verifikuar</div>' : '<div class="provenance">Më i fundit: I panjohur</div>') + '</td><td>' + (sourceLink(link,'Drive') || sourceLink(D.safeLink(f.gmail_url,'gmail'),'Gmail') || '<span class="muted">Lidhja e Drive nuk është e disponueshme</span>') + '<div class="provenance">' + date(f.doc_date || f.created_at) + (f.source_observed_at ? ' · Të dhënat u kontrolluan më ' + date(f.source_observed_at) : '') + '</div></td></tr>';
  }).join('') + '</tbody></table></div>';
}
function communication(data) {
  const mails=arr(data.recent_emails);
  return mails.length ? mails.slice(0,3).map(m=>row(m.subject,m.from_name || m.from_email,provenance(m.needs_review ? 'Lidhja me projektin kërkon shqyrtim' : 'Komunikim i lidhur nga Gmail',m.sent_at,D.gmailLink(m)))).join('') : empty('Nuk ka komunikim të lidhur në këtë pasqyrë të kufizuar.');
}
function contractSnapshot(data) {
  const documents=arr(data.documents);
  const lastOffer=documents.find(d=>d.series === 'QUO');
  return '<dl class="facts"><div><dt>Vlera e kontratës</dt><dd>E panjohur</dd></div><div><dt>Zotimi kontratë / porosi</dt><dd>I paverifikuar</dd></div><div><dt>Oferta e fundit e regjistruar</dt><dd>' + text(lastOffer?.doc_nr || 'E panjohur') + '</dd></div><div><dt>Arkëtimet / detyrimet</dt><dd><a class="evidence-link" href="#finance">Shiko financat e projektit →</a></dd></div></dl><p class="metrics-note">Oferta nuk është kontratë e nënshkruar. Faturat dhe pagesat lexohen vetëm te Financat.</p>';
}
function milestones(data) {
  const f=observedFacts(data).find(f=>Array.isArray(f.value?.milestones) && f.source_ref);
  if (f) return f.value.milestones.slice(0,4).map(m=>row(m.title || m.name || 'Afati', (m.due_date ? date(m.due_date) + ' · ' : '') + label(m.status || 'Unknown'), provenance(f.subject,f.updated_at,factSource(f)))).join('');
  return empty('Pasqyra aktuale nuk përmban afate të konfirmuara. Një datë e kërkuar me email duhet të konfirmohet para se të bëhet zotim.');
}
function operationPhase(data,model) {
  const canonical=phase(data);
  return stages.indexOf(canonical)>3 ? canonical : model.sample?'Samples':canonical;
}
function operationErrors(model) {
  const names={files:'Dokumentet',emails:'Emailat',attachments:'Bashkëngjitjet',suppliers:'Ofertat e furnitorëve',clients:'Ofertat tona'};
  return model.errors.map(e=>notice((names[e.source]||e.source)+': '+e.error,true)).join('');
}
function offerRows(offers,compact=false) {
  if(!offers.length)return empty('Nuk u kthye ofertë në burimet e lexuara. Kontrolloni komunikimin dhe dosjen e projektit.');
  return offers.slice(0,compact?2:100).map(o=>{
    const price=o.amount===null || o.amount===undefined ? 'Vlera dhe kushtet: në dokumentin origjinal' : 'Vlera e regjistruar: '+amount(o.amount,o.currency);
    const meta=date(o.sent_at)+' · '+o.state+(o.terms?' · '+o.terms:'');
    const links=(sourceLink(D.safeLink(o.drive_url,'drive'),'Hap dokumentin')||'')+' '+sourceLink(o.source_url,'Gmail');
    const body='<div class="muted small">'+escape(meta)+'</div><p class="muted small">'+price+'</p>'+provenance(o.source,null)+(links?'<p>'+links+'</p>':'')
      +(o.metadata_missing?'<p class="provenance">Dërgimi dhe bashkëngjitjet janë regjistruar në email; emrat e skedarëve lexohen nga Gmail kur sesioni Google është aktiv.</p>':'')
      +(!compact?'<dl class="facts"><div><dt>Lloji</dt><dd>'+escape(o.kind==='terms'?'Kushtet e ofertës':'Oferta')+'</dd></div><div><dt>Pagesa / dorëzimi</dt><dd>'+text(o.payment_terms||'Shiko dokumentin')+(o.delivery_weeks?' · '+text(o.delivery_weeks)+' javë':'')+'</dd></div></dl>'
      +(o.inclusions?row('Përfshirë',o.inclusions):'')+(o.exclusions?row('Përjashtuar',o.exclusions):''):'');
    return compact?'<div class="row"><div class="row-title">'+text(o.title)+'</div>'+body+'</div>':'<details class="offer-record" data-side="'+escape(o.side)+'"><summary>'+text(o.title)+'<div class="provenance">'+escape(meta)+'</div></summary>'+body+'</details>';
  }).join('');
}
function nextSteps(data,model) {
  if(model.sample && operationPhase(data,model)==='Samples') {
    const evidence=model.currentRequest||model.sample;
    return row('Aktiva: konfirmo statusin real të vizatimeve dhe dy mostrave',
      'Merr statusin e prodhimit, kontrollit teknik dhe datën e realizueshme të përfundimit. Plani i deklaruar me email nuk provon se prodhimi ka filluar.',
      provenance('Propozim për Arianitin / koordinim me Aktivën',evidence.sent_at,D.gmailLink(model.supplierSample||evidence)))
      +row('Koordino transportin, importin dhe afatin me SPIE',
      'Konfirmo gatishmërinë e dokumenteve dhe dërgimit. Data e kërkuar nga SPIE mbetet synim derisa të konfirmohet afati.',
      provenance('Propozim për Arianitin / logjistikën',evidence.sent_at,D.gmailLink(evidence)))
      +row('Verifiko porosinë zyrtare dhe dokumentet e mostrave',
      'Kontrollo nëse porosia është pranuar dhe nëse baza teknike është e plotë. Miratimi i mënyrës së punës me email nuk zëvendëson porosinë.',
      provenance('Kontroll para zotimit',evidence.sent_at,D.gmailLink(model.approval||evidence)));
  }
  const actions=arr(data.operator_actions).filter(a=>!['mbyllur','closed','done','cancelled'].includes(str(a.status).toLowerCase()));
  return actions.slice(0,3).map(a=>row(a.title,a.detail,provenance('Veprim i regjistruar · Afati '+date(a.due_date),a.created_at,factSource(a)))).join('')||empty('Nuk ka veprim të verifikuar në të dhënat e kthyera. Shqyrto komunikimin më të fundit.');
}
function projectNow(data,model) {
  if(model.sample && operationPhase(data,model)==='Samples') {
    return 'Projekti është te dy mostrat për SPIE. '+(model.approval?'SPIE ka konfirmuar mënyrën e propozuar të punës. ':'')+'Duhet verifikuar statusi real i përgatitjes, prodhimit dhe dorëzimit me Aktivën dhe logjistikën.'
      +provenance('Komunikimi më i fundit për mostrat',(model.approval||model.currentRequest||model.sample).sent_at,D.gmailLink(model.approval||model.currentRequest||model.sample));
  }
  return summary(data);
}
function verifiedProgress(model) {
  const supplier=model.offers.find(o=>o.side==='supplier'&&o.kind==='offer');
  const sent=model.offers.find(o=>o.side==='client'&&o.sent&&o.kind==='offer');
  return (supplier?row('Oferta e Aktivës është në dispozicion',supplier.title,provenance(supplier.state,supplier.sent_at,supplier.source_url)):'')
    +(sent?row('Oferta jonë është dërguar te SPIE',sent.title,provenance('Prova e dërgimit',sent.sent_at,sent.source_url)):'')
    +(model.currentRequest?row('SPIE ka kërkuar dy mostra','Kërkesa teknike dhe destinacioni në emailin origjinal.',provenance('Kërkesa e klientit',model.currentRequest.sent_at,D.gmailLink(model.currentRequest))):'')
    +(model.approval?row('SPIE ka miratuar mënyrën e propozuar të punës','Konfirmim i procedurës; përfundimi dhe dorëzimi nuk janë të provuar.',provenance('Përgjigjja e SPIE',model.approval.sent_at,D.gmailLink(model.approval))):'')
    ||empty('Kontrolloni rrjedhën e projektit për provat e punës së kryer.');
}
function workflowRows(model,compact=false) {
  const rows=compact?model.timeline.slice(0,6):[...model.timeline].reverse();
  if(!rows.length)return empty('Nuk u kthye komunikim i verifikuar i projektit.');
  const parties={supplier:'Aktiva',client:'SPIE',pristeel:'PriSteel',other:'Palë tjetër'};
  return '<div class="workflow-list">'+rows.map(m=>'<details class="workflow-event" data-party="'+escape(m.party)+'"><summary><span class="workflow-date">'+date(m.date)+'</span><span>'+text(m.title)+'<span class="provenance">'+escape(parties[m.party])+' · '+escape(label(m.direction))+'</span></span></summary>'
    +(m.body?'<p class="message-preview">'+text(m.body,1800)+'</p>':'')
    +(m.files.length?'<p class="provenance">Dokumente: '+m.files.map(f=>text(f.title)).join(' · ')+'</p>':'')
    +'<p>'+sourceLink(m.source_url,'Lexo komunikimin në Gmail')+'</p></details>').join('')+'</div>';
}
function currentDeadlines(model) {
  const request=model.currentRequest||model.sample;
  if(!request)return empty('Afatet e ardhshme kërkojnë verifikim në komunikimin aktual.');
  const body=D.messageText(request);
  const matches=[...body.matchAll(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/g)];
  // Display explicit client-requested dates as requests, never delivery commitments.
  return matches.length?matches.slice(0,3).map(m=>row('Synimi i kërkuar nga SPIE',m[0]+' · Afat i kërkuar, ende për t’u konfirmuar me prodhuesin dhe transportin.',provenance('Kërkesa e klientit',request.sent_at,D.gmailLink(request)))).join(''):row('Afati i mostrave','Shiko datën e kërkuar nga SPIE dhe konfirmo realizueshmërinë.',provenance('Komunikimi i SPIE',request.sent_at,D.gmailLink(request)));
}
function renderOverview(data,model) {
  const p=data.project, stage=operationPhase(data,model);
  const suppliers=model.offers.filter(o=>o.side==='supplier'&&o.kind==='offer');
  const clients=model.offers.filter(o=>o.side==='client'&&o.kind==='offer');
  const progress='<ol class="stage-track" aria-label="Fazat e projektit">'+stages.map(s=>'<li'+(s===stage?' aria-current="step"':'')+'>'+escape(label(s))+'</li>').join('')+'</ol>';
  return '<div class="hero"><p class="eyebrow">SPIE / TENNET BUNT</p><h1>'+text(p.name)+'</h1><div class="hero-meta"><span>Faza e punës · <strong>'+escape(label(stage))+'</strong></span>'
    +badge(p.operational_state==='action_required'?'Attention':'Unknown')+'<span>Komunikimi i fundit · '+date(model.trusted[0]?.sent_at||p.last_email_at)+'</span></div><div class="summary">'+projectNow(data,model)+'</div>'+progress+'</div>'
    +operationErrors(model)
    +'<div class="columns"><div>'+section('Çfarë duhet bërë tani',nextSteps(data,model))
    +section('Çfarë është bërë',verifiedProgress(model))
    +section('Oferta e Aktivës',offerRows(suppliers,true),'offers')+'</div><div>'
    +section('Oferta jonë për SPIE',offerRows(clients,true),'offers')
    +section('Afati dhe pikat e hapura',currentDeadlines(model)+(model.sample?row('Ende kërkon provë','Porosia zyrtare, fillimi real i prodhimit, përfundimi i kontrollit dhe dërgimi i mostrave.'):''))
    +section('Dokumentet e projektit',fileRows(model.files.filter(f=>D.metadata(f).category==='Technical'||/3207|stückliste|werkstattzeichnung/i.test(f.title||'')).sort((a,b)=>str(b.created_at).localeCompare(str(a.created_at))),true),'files')+'</div></div>'
    +section('Rrjedha e fundit e projektit',workflowRows(model,true),'projects')
    +(stage==='Samples'&&!/^(sample|samples)$/i.test(p.pipeline_stage)?'<p class="metrics-note">Faza e punës mbështetet në komunikimin e mostrave. Faza e regjistruar në PPPP: '+escape(label(p.pipeline_stage))+'. Kërkon harmonizim të regjistrit; nuk është ndryshuar automatikisht.</p>':'')
    +footer();
}
async function renderOffers() {
  const {model}=await ensureOperational();
  return pageHeader('Ofertat','Aktiva → PriSteel → SPIE. Çdo version ruan dokumentin dhe provën e vet të komunikimit.')
    +operationErrors(model)
    +(!D.googleSession()?'<p class="muted small">Për ofertat më të reja që ende nuk janë lidhur në PPPP, <a class="evidence-link" href="../pristeel-procurement.html">lidhe Gmail në PPPP</a> dhe rihap SPIE. Ofertat e regjistruara shfaqen më poshtë.</p>':'')
    +'<div class="toolbar"><label>Pala <select id="offer-side"><option value="">Të gjitha</option><option value="supplier">Aktiva / furnitorët</option><option value="client">PriSteel → SPIE</option></select></label><label>Kërko ofertën <input id="offer-search" type="search" placeholder="DAP, DDP, data ose dokumenti"></label></div>'
    +(model.structuredMissing?'<p class="muted small">Ofertat ekzistojnë në komunikime dhe dokumente. Vlerat e krahasueshme ende nuk janë në regjistrat e strukturuar të ofertave; shumat dhe marzhi kërkojnë verifikim.</p>':'')
    +'<div id="offer-results">'+offerSections(model.offers)+'</div>'
    +section('Krahasimi dhe lidhja mes ofertave','<p class="muted small">Kontrollo për secilin version sasinë dhe lotet, DAP/DDP, lyerjen, transportin/importin, CBAM, pagesën dhe vlefshmërinë. Shfaqja krah për krah nuk provon se dy oferta kanë të njëjtin objekt. Pa bazë të verifikuar nuk llogaritet marzh dhe nuk vendoset çmim final.</p>')
    +footer();
}
function offerSections(offers) {
  return '<div class="columns"><div>'+section('Aktiva / ofertat e furnitorëve',offerRows(offers.filter(o=>o.side==='supplier')) )+'</div><div>'+section('PriSteel / ofertat për SPIE',offerRows(offers.filter(o=>o.side==='client')) )+'</div></div>';
}
async function renderProjects() {
  const {data,model}=await ensureOperational();
  return pageHeader('Rrjedha e projektit','Komunikimet dhe ofertat sipas datës. Ngjarjet janë prova komunikimi; përfundimi i fazave kërkon konfirmim.')
    +operationErrors(model)
    +'<div class="toolbar"><label>Pala <select id="workflow-party"><option value="">Të gjitha</option><option value="client">SPIE</option><option value="supplier">Aktiva</option><option value="pristeel">PriSteel</option><option value="other">Palët e tjera</option></select></label><label>Kërko <input id="workflow-search" type="search" placeholder="Mostrat, oferta, dogana..."></label></div>'
    +'<div id="workflow-results">'+workflowRows(model)+'</div>'
    +section('Regjistrat që kërkojnë rishikim','<details><summary>Gjendja dhe veprimet e regjistruara në PPPP</summary><p class="muted small">Faza në regjistër: '+escape(label(data.project.pipeline_stage))+'. Veprimet e vjetra automatike duhen verifikuar përballë komunikimeve më të reja.</p>'
      +arr(data.operator_actions).map(a=>row(a.title,a.detail,provenance('Afati i regjistruar '+date(a.due_date),a.created_at))).join('')+'</details>')
    +(model.limits.emails?notice('U arrit kufiri i emailave. Rrjedha e shfaqur mund të mos përfshijë komunikimet më të vjetra.'):'')+footer();
}
async function renderFiles() {
  const {data,model,bundle} = await ensureOperational();
  const records=bundle.files.rows,rows=model.files;
  const folder=D.safeLink(data.project.drive_folder_url,'drive');
  return pageHeader('Skedarët','Të dhënat dhe lidhjet e projektit. Dokumentet origjinale ruhen në dosjen ekzistuese në Google Drive.')
  + '<p>' + sourceLink(folder,'Hap dosjen e projektit në Drive') + '</p>'
  + '<div class="toolbar"><label>Kategoria <select id="file-category"><option value="All">Të gjitha</option>' + ['Technical','Commercial','Contracts','Finance','Quality','Logistics','Unclassified'].map(c=>'<option value="'+escape(c)+'">'+escape(label(c))+'</option>').join('') + '</select></label><label>Gjej dokumentin <input id="file-search" type="search" placeholder="Emri, referenca ose rishikimi"></label></div>'
  + '<p class="muted small">Rishikimet bazohen në të dhënat e regjistruara të dokumentit. Rishikimi më i fundit i vizatimit mbetet i panjohur pa verifikim të qartë. Përfshihen dokumentet në PPPP dhe pasqyra e verifikuar e të dhënave të dosjes. Kategoritë e propozuara kërkojnë shqyrtim. Plotësia e dosjes dhe rishikimet e miratuara mbeten të paverifikuara.</p>'
  + '<div id="file-results">' + fileRows(rows) + '</div>'
  + '<p class="view-footer">Deri në ' + D.LIMITS.files + ' dokumente nga PPPP dhe të dhëna të kufizuara nga Drive · ' + rows.length + ' të shfaqura' + (records.length===D.LIMITS.files?' · U arrit kufiri i PPPP; dokumentacioni i plotë mbetet në Drive.':'') + '</p>' + footer();
}
function context(mail) {
  const s=str(mail.subject).toLowerCase();
  if (/muster|sample/.test(s)) return 'Samples';
  if (/zeichnung|drawing|technical|cad|bom/.test(s)) return 'Technical';
  if (/rechnung|invoice|payment/.test(s)) return 'Finance';
  if (/vertrag|contract|bestellung|purchase order/.test(s)) return 'Contracts';
  if (/zoll|import|transport|delivery|liefer/.test(s)) return 'Logistics';
  if (/angebot|offer|rfq|quotation/.test(s)) return 'Commercial';
  return 'General';
}
function emailRows(rows) {
  return rows.length ? rows.map(m=>'<details><summary><strong>' + text(m.subject || '(Pa subjekt)') + '</strong><div class="provenance">' + text(m.from_name || m.from_email) + ' · ' + date(m.sent_at) + ' · ' + text(label(m.direction || 'Unknown')) + ' · ' + escape(label(context(m))) + (m.needs_review ? ' · Lidhja kërkon shqyrtim' : '') + '</div></summary><dl class="facts"><div><dt>Nga</dt><dd>' + text(m.from_email) + '</dd></div><div><dt>Për / CC</dt><dd>' + text(arr(m.to_emails).concat(arr(m.cc_emails)).join(', '),700) + '</dd></div></dl>'+ (m.snippet ? '<p class="message-preview">'+text(D.messageText(m),1800)+'</p>':'') +'<p>' + sourceLink(D.gmailLink(m),'Lexo bisedën origjinale në Gmail') + '</p></details>').join('') : empty('Nuk ka emaila të lidhur që përputhen me këta filtra.');
}
async function renderEmails() {
  const {model}=await ensureOperational();
  const rows=model.mails;
  const domains=[...new Set(rows.map(m=>str(m.from_email).split('@')[1]).filter(Boolean))].sort();
  return pageHeader('Emailat','Komunikimi i lidhur me TenneT. Gmail mbetet burimi origjinal; këtu nuk dërgohen emaila.')
    + '<div class="toolbar"><label>Kompania / kontakti <select id="email-company"><option value="">Të gjithë dërguesit</option>' + domains.map(d=>'<option value="'+escape(d)+'">'+escape(d)+'</option>').join('') + '</select></label><label>Konteksti <select id="email-context"><option value="">Të gjitha kontekstet</option>' + ['Samples','Technical','Commercial','Contracts','Finance','Logistics','General'].map(c=>'<option value="'+escape(c)+'">'+escape(label(c))+'</option>').join('') + '</select></label><label>Kërko <input id="email-search" type="search" placeholder="Subjekti ose kontakti"></label></div>'
    + '<p class="muted small">Etiketat e kontekstit propozohen nga subjekti. Përdoren vetëm lidhjet ekzistuese me projektin; lidhjet që kërkojnë shqyrtim shfaqen si të paverifikuara.</p><div id="email-results">' + emailRows(rows) + '</div><p class="view-footer">Deri në ' + D.LIMITS.emails + ' mesazhe të lidhura · ' + rows.length + ' të kthyera' + (rows.length===D.LIMITS.emails?' · U arrit kufiri.':'') + '</p>' + footer();
}
function amount(x,currency) { return x===null || x===undefined || x==='' || !Number.isFinite(Number(x)) ? 'E panjohur' : Number(x).toLocaleString('sq-AL',{maximumFractionDigits:2,minimumFractionDigits:2}) + ' ' + escape(label(currency || '· monedha e panjohur')); }
function totals(rows, pick) {
  const list=D.currencyTotals(rows,pick);
  return list.length ? '<div class="metric-lines">' + list.map(t=>'<span>' + amount(t.amount,t.currency) + '</span>').join('') + '</div>' : 'E panjohur';
}
function invoiceTable(rows,supplier) {
  if(!rows.length) return empty('Nuk u kthyen fatura të lidhura. Kjo nuk nënkupton bilanc zero.');
  return '<div class="table-wrap"><table><thead><tr><th style="width:27%">Fatura / pala</th><th style="width:25%">Shuma</th><th style="width:24%">Afati</th><th style="width:24%">Prova e pagesës</th></tr></thead><tbody>' + rows.map(r=>'<tr><td>' + text(supplier ? r.supplier_invoice_nr : r.invoice_nr) + '<div class="provenance">' + text(supplier ? r.supplier : r.client) + '</div></td><td>' + amount(supplier ? r.amount ?? r.net_amount : r.gross_amount ?? r.net_amount,r.currency) + '</td><td>' + date(r.due_date) + '</td><td>' + (r.paid === true ? 'Regjistruar si e paguar' : r.paid === false ? 'Regjistruar si e papaguar' : 'E panjohur') + '<div class="provenance">' + (r.paid_date ? date(r.paid_date) : '') + '</div></td></tr>').join('') + '</tbody></table></div>';
}
async function renderFinance() {
  const d=await D.finance();
  const errors=Object.entries(d).filter(([,v])=>v.error).map(([k,v])=>notice(label(k) + ': ' + v.error,true)).join('');
  const contracts=d.contracts.rows.filter(r=>r.doc_type === 'contract' && ['signed','executed','nenshkruar'].includes(str(r.status).toLowerCase()));
  const contractValue=d.contracts.error || !contracts.length ? 'E panjohur' : contracts.map(r=>amount(r.amount_eur,'EUR') + '<div class="provenance">'+text(r.title || r.doc_nr)+'</div>').join('');
  const unpaidSales=d.sales.rows.filter(r=>r.paid===false);
  const unpaidSuppliers=d.suppliers.rows.filter(r=>r.paid===false);
  const financeSummary='<dl class="facts"><div><dt>Vlera e kontratës së nënshkruar në regjistër</dt><dd>' + contractValue + '</dd></div><div><dt>Kostot sipas faturave të furnitorëve</dt><dd>' + (d.suppliers.error ? 'E panjohur' : totals(d.suppliers.rows,r=>r.amount ?? r.net_amount)) + '</dd></div><div><dt>Kostot e importuesit</dt><dd>E panjohur</dd></div><div><dt>Shuma e mbajtur si garanci</dt><dd>E panjohur</dd></div><div><dt>Për arkëtim · vlerat nominale të faturave të papaguara</dt><dd>' + (d.sales.error?'E panjohur':totals(unpaidSales,r=>r.gross_amount ?? r.net_amount)) + '</dd></div><div><dt>Për pagesë · vlerat nominale të faturave të papaguara</dt><dd>' + (d.suppliers.error?'E panjohur':totals(unpaidSuppliers,r=>r.amount ?? r.net_amount)) + '</dd></div></dl><p class="metrics-note">Shumat paraqiten veçmas sipas monedhës nga një listë e kufizuar. Vlerat nominale nuk përfshijnë pagesat e pjesshme dhe nuk janë bilance bankare. Faturat e furnitorëve nuk përbëjnë plan të miratuar të kostove.</p>';
  const plans=d.documents.rows.filter(r=>r.payment_plan).slice(0,8);
  const planBody=plans.length?plans.map(r=>'<details><summary>'+text(r.doc_nr)+' <span class="muted small">· '+text(label(r.offer_state || 'Zotimi i paverifikuar'))+'</span></summary><p class="muted small">Plan pagese i regjistruar; nuk përbën kërkesë për arkëtim ose kontratë të konfirmuar.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:11px">' + escape(JSON.stringify(r.payment_plan,null,2)) + '</pre></details>').join(''):empty('Nuk u kthye plan pagese për projektin.');
  const guarantees=d.guarantees.rows.length?d.guarantees.rows.map(g=>row(g.bank_name || 'Garancia bankare',label(g.guarantee_type)+' · '+label(g.status)+' · Skadimi '+date(g.expiry_date),'<p class="muted small">'+amount(g.amount_guaranteed,'· monedha nuk është regjistruar')+'</p>')).join(''):empty('Nuk u kthye garanci e lidhur me projektin.');
  return pageHeader('Financat','Pasqyrë e regjistrave financiarë vetëm për këtë projekt. Nuk nxirret gjendja e parave dhe nuk bëhen ndryshime financiare.') + errors + section('Pasqyra e financave dhe kontratës',financeSummary) + section('Faturat e klientit',d.sales.error?empty('Leximi dështoi; nuk mund të nxirret përfundim për bilancin.'):invoiceTable(d.sales.rows,false)) + section('Faturat e furnitorëve',d.suppliers.error?empty('Leximi dështoi; nuk mund të nxirret përfundim për bilancin.'):invoiceTable(d.suppliers.rows,true)) + section('Afatet e pagesave',d.documents.error?empty('Leximi dështoi; afatet janë të panjohura.'):planBody) + section('Garancitë bankare',d.guarantees.error?empty('Leximi dështoi; statusi i garancisë është i panjohur.'):guarantees) + '<p class="view-footer">Kufijtë: '+D.LIMITS.invoices+' për çdo regjistër faturash, '+D.LIMITS.guarantees+' garanci, '+D.LIMITS.documents+' dokumente me plan pagese. Arritja e kufirit mund të lërë jashtë regjistra më të vjetër të papaguar.</p>' + footer();
}
async function renderPartners() {
  const rows=await D.contacts();
  const spie=rows.filter(r=>/@spie\.com$/i.test(str(r.email)) || /^spie(?: sag)?(?: gmbh)?$/i.test(str(r.company)));
  const aktiva=rows.filter(r=>/@aktiva\.com\.mk$/i.test(str(r.email)) || /^aktiva$/i.test(str(r.company)));
  const importer=rows.filter(r=>/\b(importer|import\/customs|cbam)\b/i.test(str(r.role)));
  const logistics=rows.filter(r=>/\b(logistics|subcontractor|transport)\b/i.test(str(r.role)));
  const contactRows=list=>list.length?list.map(r=>row(r.name || r.email,str(r.email)+' · '+label(r.role || 'Rol i paspecifikuar'),provenance('Kontakt i projektit · '+str(r.source),r.last_seen))).join(''):empty('Nuk ka të dhëna të verifikuara për kontaktin e projektit në këtë rol.');
  const covered=new Set([...spie,...aktiva,...importer,...logistics].map(r=>r.id));
  return pageHeader('Partnerët','Kompanitë dhe kontaktet e lidhura me projektin. Rolet nuk nënkuptojnë përzgjedhje furnitori ose zotim kontraktual.')
    + section('SPIE · Klienti',contactRows(spie))
    + section('AKTIVA · Prodhuesi', '<p class="muted small">Roli është dhënë nga operatori. Nuk nënkuptohet zotim ndaj furnitorit.</p>'+contactRows(aktiva))
    + section('Importuesi gjerman · Import / doganë / CBAM',importer.length?'<p class="muted small">Rol importi i regjistruar; territori gjerman dhe zotimi kontraktual mbeten të paverifikuar.</p>'+contactRows(importer):empty('E panjohur — kontaktet e kthyera të projektit nuk përmbajnë identitet importuesi me rol të qartë.'))
    + section('Logjistika dhe nënkontraktorët',contactRows(logistics))
    + section('Kontaktet e tjera të lidhura',contactRows(rows.filter(r=>!covered.has(r.id))))
    + '<p class="view-footer">Deri në '+D.LIMITS.contacts+' kontakte të projektit nga PPPP; pa kërkim në të gjitha kontaktet.</p>' + footer();
}
function installFilters(name) {
  if(name==='offers' || name==='projects') {
    const prefix=name==='offers'?'offer':'workflow';
    const selector=document.getElementById(prefix+(name==='offers'?'-side':'-party'));
    const search=document.getElementById(prefix+'-search');
    const results=document.getElementById(prefix+'-results');
    const generation=routeGeneration;
    const apply=async()=>{
      const {model}=await ensureOperational();
      if(generation!==routeGeneration||!results?.isConnected)return;
      const q=search.value.trim().toLowerCase();
      results.innerHTML=name==='offers'?offerSections(model.offers.filter(o=>(!selector.value||o.side===selector.value)&&[o.title,o.state,o.terms].join(' ').toLowerCase().includes(q))):workflowRows({...model,timeline:model.timeline.filter(m=>(!selector.value||m.party===selector.value)&&[m.title,m.body].join(' ').toLowerCase().includes(q))});
    };
    selector?.addEventListener('change',apply);search?.addEventListener('input',apply);
  }
  if(name==='files') {
    const apply=async()=>{ const {model}=await ensureOperational(); const rows=model.files; const category=document.getElementById('file-category'); const search=document.getElementById('file-search'); const results=document.getElementById('file-results'); if(!category||!search||!results)return; const q=search.value.toLowerCase();results.innerHTML=fileRows(rows.filter(r=> (category.value==='All'||D.metadata(r).category===category.value) && [r.title,r.file_name,r.doc_nr,D.metadata(r).revision].map(str).join(' ').toLowerCase().includes(q))); };
    document.getElementById('file-category')?.addEventListener('change',apply);
    document.getElementById('file-search')?.addEventListener('input',apply);
  }
  if(name==='emails') {
    const apply=async()=>{ const {model}=await ensureOperational(); const rows=model.mails; const company=document.getElementById('email-company');const ctx=document.getElementById('email-context');const search=document.getElementById('email-search'); const results=document.getElementById('email-results');if(!company||!ctx||!search||!results)return;results.innerHTML=emailRows(rows.filter(r=>(!company.value||str(r.from_email).endsWith('@'+company.value))&&(!ctx.value||context(r)===ctx.value)&&[r.subject,r.from_name,r.from_email,...arr(r.to_emails),...arr(r.cc_emails)].map(str).join(' ').toLowerCase().includes(search.value.toLowerCase())));};
    ['email-company','email-context'].forEach(id=>document.getElementById(id)?.addEventListener('change',apply));
    document.getElementById('email-search')?.addEventListener('input',apply);
  }
}
async function route() {
  const requested=location.hash.slice(1).toLowerCase();
  const name=allowedViews.includes(requested)?requested:'overview';
  const generation=++routeGeneration;
  const current=D.session();
  if(current?.access_token!==authenticatedToken) { snapshotPromise=null;overviewPromise=null;operationalPromise=null;authenticatedToken=current?.access_token||''; }
  document.querySelectorAll('[data-view]').forEach(a=>a.setAttribute('aria-current',a.dataset.view===name?'page':'false'));
  view.setAttribute('aria-busy','true');
  view.innerHTML='<div class="loading-surface">'+pageHeader(label(name),'Duke lexuar të dhënat e verifikuara të projektit…')+'</div>';
  readStatus.textContent='Duke lexuar PPPP…';
  try {
    if(!current) throw new Error('SESSION_REQUIRED: Hapni PPPP për të hyrë ose rinovuar sesionin, pastaj kthehuni te SPIE.');
    let html;
    if(name==='overview') { const {data,model}=await ensureOverview();html=renderOverview(data,model);readStatus.textContent='Pasqyra · '+date(data.generated_at)+' '+time(data.generated_at); }
    else if(name==='projects') html=await renderProjects();
    else html=await ({offers:renderOffers,files:renderFiles,emails:renderEmails,finance:renderFinance,partners:renderPartners}[name])();
    if(generation!==routeGeneration || D.session()?.access_token!==authenticatedToken)return;
    view.innerHTML=html;
    if(name!=='overview') readStatus.textContent='Regjistrat e projektit · vetëm për lexim';
    installFilters(name);
  } catch(error) {
    if(generation!==routeGeneration)return;
    readStatus.textContent='Të dhënat nuk janë verifikuar';
    view.innerHTML='<div class="error-state">'+pageHeader('Të dhënat e projektit nuk janë të disponueshme','Dështimi i leximit nuk lejon përfundim për gjendjen e biznesit.')+notice(error.message,true)+'<p><a class="btn" href="../pristeel-procurement.html">Hap PPPP</a></p><button class="btn" id="retry">Riprovo këtë faqe</button></div>';
    document.getElementById('retry')?.addEventListener('click',()=>{D.invalidate();snapshotPromise=null;overviewPromise=null;operationalPromise=null;route();},{once:true});
  } finally { if(generation===routeGeneration)view.setAttribute('aria-busy','false'); }
}
window.addEventListener('hashchange',route);
window.addEventListener('storage',event=>{if(event.key==='pristeel_session'||event.key===null)route();else if(event.key==='pst_google_workspace_token_v2'){overviewPromise=null;operationalPromise=null;route();}});
window.addEventListener('pageshow',event=>{if(event.persisted)route();});
route();
