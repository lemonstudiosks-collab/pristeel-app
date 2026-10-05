import * as D from './data.mjs?v=20261005-2';

const view = document.getElementById('view');
const readStatus = document.getElementById('read-status');
const allowedViews = ['overview', 'projects', 'files', 'emails', 'finance', 'partners'];
const stages = ['RFQ', 'Offer', 'Negotiation', 'Samples', 'Contract', 'Production', 'Delivery', 'Payment'];
let routeGeneration = 0;
let snapshotPromise;
let snapshotAt = 0;
let overviewPromise;
let authenticatedToken = '';
const str = x => String(x ?? '');
const arr = x => Array.isArray(x) ? x : [];
const escape = x => str(x).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const text = (x, cap = 500) => escape(typeof x === 'string' || typeof x === 'number' ? str(x).slice(0, cap) : '');
const date = x => { if (!x) return 'Unknown'; const d = new Date(x); return Number.isNaN(d.getTime()) ? 'Unknown' : new Intl.DateTimeFormat('en-GB', { day:'2-digit', month:'short', year:'numeric', timeZone:'Europe/Budapest' }).format(d); };
const badge = (status = 'Unknown') => '<span class="pill ' + escape(status.toLowerCase().replace(/ /g,'-')) + '">' + escape(status) + '</span>';
const empty = msg => '<p class="empty">' + escape(msg || 'No verified records available.') + '</p>';
const sourceLink = (href, label = 'Source') => href ? '<a class="evidence-link" href="' + escape(href) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + ' ↗</a>' : '';
const provenance = (label, timestamp, href) => '<div class="provenance">' + escape(label) + (timestamp ? ' · ' + date(timestamp) : '') + (href ? ' · ' + sourceLink(href) : '') + '</div>';
const row = (title, detail = '', evidence = '') => '<div class="row"><div class="row-title">' + text(title) + '</div>' + (detail ? '<div class="muted">' + text(detail) + '</div>' : '') + evidence + '</div>';
const section = (title, body, link = '') => '<section class="section"><div class="section-head"><h2>' + escape(title) + '</h2>' + (link ? '<a href="#' + escape(link) + '">View all →</a>' : '') + '</div>' + body + '</section>';
const notice = (msg, error = false) => '<div class="notice' + (error ? ' error' : '') + '" role="' + (error ? 'alert' : 'note') + '">' + escape(msg) + '</div>';
const pageHeader = (name, detail) => '<div class="hero"><p class="eyebrow">SPIE WORKSPACE · TENNET</p><h1>' + escape(name) + '</h1><p class="muted">' + escape(detail) + '</p></div>';
const footer = () => '<p class="view-footer">Read-only view · Project records remain in PPPP · Original files in Drive and communications in Gmail.</p>';

function ensureSnapshot() {
  if (!snapshotPromise || Date.now() - snapshotAt > 300000) { snapshotAt = Date.now(); snapshotPromise = D.snapshot(); overviewPromise = null; }
  return snapshotPromise;
}
function ensureOverview() {
  if (Date.now() - snapshotAt > 300000) { snapshotPromise = null; overviewPromise = null; }
  if (!overviewPromise) overviewPromise = Promise.all([ensureSnapshot(), D.latestFiles().then(rows => ({ rows }), error => ({ rows: [], error: error.message }))]);
  return overviewPromise;
}
function phase(data) {
  const project = data.project;
  const mapping = { rfq:'RFQ', sourcing:'RFQ', offer:'Offer', pricing:'Offer', negotiation:'Negotiation', samples:'Samples', sample:'Samples', contract:'Contract', production:'Production', execution:'Production', delivery:'Delivery', payment:'Payment' };
  const canonical = mapping[str(project.pipeline_stage).toLowerCase()];
  if (canonical && stages.indexOf(canonical) > 3) return canonical;
  const evidence = D.workspaceEvidence(data)?.value?.workspace_phase;
  return evidence && stages.includes(evidence.status) && evidence.evidence && D.safeLink(evidence.source_url, 'gmail') ? evidence.status : 'Samples';
}
function phaseNote(data) {
  const project = data.project;
  const fact = D.workspaceEvidence(data), evidence = fact?.value?.workspace_phase;
  if (evidence && phase(data) === evidence.status && evidence.evidence && D.safeLink(evidence.source_url, 'gmail')) return provenance('Project phase verified from SPIE communication; stored in canonical PPPP context', evidence.observed_at, D.safeLink(evidence.source_url, 'gmail'));
  if (str(project.pipeline_stage).toLowerCase() === 'samples') return '';
  if (stages.indexOf(phase(data)) > 3) return '';
  return notice('Samples is the operator-declared workspace phase (05 Oct 2026). PPPP records "' + str(project.pipeline_stage || 'Unknown') + '". Review the canonical phase before updating it.');
}
function stageTrack(data) {
  return '<ol class="stage-track" aria-label="Project stages">' + stages.map(name => '<li' + (name === phase(data) ? ' aria-current="step"' : '') + '>' + name + '</li>').join('') + '</ol><p class="provenance">Stage position only; earlier stages are not marked completed and no completion percentage is inferred.</p>';
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
    return '<div><span>' + domain + '</span>' + badge(status) + '</div>' + (status !== 'Unknown' ? provenance(str(evidence.evidence), healthFact.updated_at, factSource(healthFact)) : '');
  }).join('') + '</div><p class="metrics-note">Health requires explicit, source-backed status. Missing evidence stays Unknown.</p>';
}
function summary(data) {
  const latest = observedFacts(data).find(f => typeof f.value?.situation_summary === 'string' || typeof f.value?.executive_summary === 'string');
  if (latest) return text(latest.value.situation_summary || latest.value.executive_summary, 700) + provenance(latest.subject || 'Project context',latest.updated_at,factSource(latest));
  return 'TenneT is in ' + escape(phase(data)) + '. ' + (data.recent_emails?.length ? 'Review the latest linked communication, technical requirements and open decisions below.' : 'Current communication and readiness still require verification.');
}
function sampleEvidence(data) { return arr(data.recent_emails).find(m=>m.gmail_message_id === '1a0fb8a8d5040dc9' && !m.needs_review); }
function currentActions(data) {
  const sample = sampleEvidence(data);
  const proposal = sample ? row('Confirm the technical basis and achievable sample delivery window', 'Review proposal based on the SPIE request for 2 samples, targeting around 12 Oct 2026 if possible. The request is not a confirmed delivery commitment.', provenance('SPIE sample request',sample.sent_at,D.gmailLink(sample))) : '';
  const f = observedFacts(data).find(f => f.value?.current_operator_action && f.source_ref);
  if (f && typeof f.value.current_operator_action === 'string') return row(f.value.current_operator_action, '', provenance(f.subject, f.updated_at, factSource(f)));
  const recent = arr(data.operator_actions).filter(a => a.created_at && Date.now() - new Date(a.created_at).getTime() < 14*86400000);
  const list = recent.slice(0,3).map(a => row(a.title, a.detail, provenance('Canonical operator action', a.created_at))).join('');
  return proposal + (list || (proposal ? '' : empty('No recent, source-backed operator action in this bounded snapshot. This does not prove that the project has no open work.')));
}
function waitingFor(data) {
  const f = observedFacts(data).find(f => f.value?.waiting_for && f.source_ref);
  if (!f) {
    const sample = sampleEvidence(data);
    return sample ? row('Official sample order · receipt unverified', 'SPIE stated that the official order would follow. Verify the current thread; no later receipt is assumed.', provenance('Statement in the SPIE request',sample.sent_at,D.gmailLink(sample))) : empty('Waiting party and commitment are not verified in the current snapshot.');
  }
  const values = Array.isArray(f.value.waiting_for) ? f.value.waiting_for : [f.value.waiting_for];
  return values.filter(x => typeof x === 'string').slice(0,3).map(x => row(x, '', provenance(f.subject,f.updated_at,factSource(f)))).join('') || empty();
}
function fileRows(rows, compact = false) {
  if (!rows.length) return empty('No project document metadata was returned. Check the existing Drive folder for the complete dossier.');
  if (compact) return rows.slice(0,3).map(f => {
    const m=D.metadata(f);
    return row(f.title || f.file_name || f.doc_nr || 'Document', m.category + ' · Revision: ' + (m.revision ?? 'Unknown'), provenance(f.source || 'PPPP document metadata', f.created_at, D.safeLink(f.drive_url, 'drive')));
  }).join('');
  return '<div class="table-wrap"><table><thead><tr><th style="width:40%">Document</th><th style="width:18%">Category</th><th style="width:20%">Revision</th><th style="width:22%">Source / date</th></tr></thead><tbody>' + rows.map(f => {
    const m=D.metadata(f), link=D.safeLink(f.drive_url,'drive');
    return '<tr><td class="file-title">' + text(f.title || f.file_name || f.doc_nr || 'Document') + (m.documentKey ? '<div class="provenance">' + text(m.documentKey) + '</div>' : '') + '</td><td>' + escape(m.category) + (m.categorySuggested ? '<div class="provenance">Suggested from title</div>' : '') + '</td><td>' + text(m.revision ?? 'Unknown') + (m.latest ? '<div class="provenance">Verified latest revision</div>' : '<div class="provenance">Latest: Unknown</div>') + '</td><td>' + (sourceLink(link,'Drive') || '<span class="muted">Drive link unavailable</span>') + '<div class="provenance">' + date(f.doc_date || f.created_at) + (f.source_observed_at ? ' · Metadata checked ' + date(f.source_observed_at) : '') + '</div></td></tr>';
  }).join('') + '</tbody></table></div>';
}
function communication(data) {
  const mails=arr(data.recent_emails);
  return mails.length ? mails.slice(0,3).map(m=>row(m.subject,m.from_name || m.from_email,provenance(m.needs_review ? 'Project association needs review' : 'Linked Gmail communication',m.sent_at,D.gmailLink(m)))).join('') : empty('No linked communication in the bounded snapshot.');
}
function contractSnapshot(data) {
  const documents=arr(data.documents);
  const lastOffer=documents.find(d=>d.series === 'QUO');
  return '<dl class="facts"><div><dt>Contract value</dt><dd>Unknown</dd></div><div><dt>Contract / PO commitment</dt><dd>Unverified</dd></div><div><dt>Last registered offer</dt><dd>' + text(lastOffer?.doc_nr || 'Unknown') + '</dd></div><div><dt>Receivables / payables</dt><dd><a class="evidence-link" href="#finance">Read project Finance →</a></dd></div></dl><p class="metrics-note">An offer is not a signed contract. Invoice and payment records load only in Finance.</p>';
}
function milestones(data) {
  const f=observedFacts(data).find(f=>Array.isArray(f.value?.milestones) && f.source_ref);
  if (f) return f.value.milestones.slice(0,4).map(m=>row(m.title || m.name || 'Milestone', (m.due_date ? date(m.due_date) + ' · ' : '') + str(m.status || 'Unknown'), provenance(f.subject,f.updated_at,factSource(f)))).join('');
  return empty('No confirmed milestone schedule in the current snapshot. A requested date in an email must be confirmed before it becomes a commitment.');
}
function renderOverview(data, latest) {
  const p=data.project;
  return '<div class="hero"><p class="eyebrow">SPIE WORKSPACE / EXECUTIVE OVERVIEW</p><h1>' + text(p.name) + '</h1><div class="hero-meta"><span>Current phase · <strong>' + escape(phase(data)) + '</strong></span>' + badge(p.operational_state === 'action_required' ? 'Attention' : 'Unknown') + '<span>PPPP state: ' + text(p.operational_state || p.status || 'Unknown') + '</span></div><div class="summary">' + summary(data) + '</div>' + stageTrack(data) + phaseNote(data) + '</div>'
  + '<div class="columns"><div>' + section('Needs attention now',currentActions(data)) + section('Waiting for',waitingFor(data))
  + section('What changed', '<p class="muted small">Latest recorded evidence; no historical comparison is claimed.</p>' + (facts(data).length ? facts(data).slice(0,3).map(f=>row(f.subject || f.fact_key, f.fact_status === 'suggested' ? 'Suggested · requires review' : 'Recorded observation', provenance('PPPP context update',f.updated_at,factSource(f)))).join('') : empty('No recent context evidence returned.')))
  + section('Latest files',latest.error ? notice(latest.error,true) : fileRows(D.evidenceFiles(data,latest.rows).sort((a,b)=>str(b.created_at).localeCompare(str(a.created_at))),true),'files')
  + '</div><div>' + section('Finance & Contract',contractSnapshot(data),'finance') + section('Next milestones',milestones(data)) + section('Project health',health(data)) + section('Latest communication',communication(data),'emails') + '</div></div>' + footer();
}
function renderProjects(data) {
  const p=data.project;
  return pageHeader('Projects','One canonical TenneT project. No duplicate project or parallel project registry.')
    + section(p.name, '<dl class="facts"><div><dt>Client</dt><dd>' + text(p.client) + '</dd></div><div><dt>Current workspace phase</dt><dd>' + phase(data) + '</dd></div><div><dt>Reference</dt><dd>' + text(p.business_ref || p.ref || 'Unknown') + '</dd></div><div><dt>Canonical operating state</dt><dd>' + text(p.operational_state || 'Unknown') + '</dd></div><div><dt>Canonical pipeline</dt><dd>' + text(p.pipeline_stage || 'Unknown') + '</dd></div><div><dt>Last linked email</dt><dd>' + date(p.last_email_at) + '</dd></div></dl>' + stageTrack(data) + phaseNote(data))
    + section('Project evidence', '<p>' + sourceLink(D.safeLink(p.drive_folder_url,'drive'),'Existing Drive folder') + '</p><a class="btn" href="#overview">Executive overview →</a>') + footer();
}
async function renderFiles() {
  const [data,records] = await Promise.all([ensureSnapshot(),D.files()]);
  const rows=D.evidenceFiles(data,records);
  const folder=D.safeLink(data.project.drive_folder_url,'drive');
  return pageHeader('Files','Project metadata and links. Original documents remain in the existing Google Drive folder.')
  + '<p>' + sourceLink(folder,'Open project Drive folder') + '</p>'
  + '<div class="toolbar"><label>Category <select id="file-category"><option>All</option>' + ['Technical','Commercial','Contracts','Finance','Quality','Logistics','Unclassified'].map(c=>'<option>'+c+'</option>').join('') + '</select></label><label>Find document <input id="file-search" type="search" placeholder="Name, reference or revision"></label></div>'
  + '<p class="muted small">Revisions use explicit document metadata. The latest drawing revision is Unknown unless explicitly verified. Includes canonical document records and the verified folder metadata snapshot. Categories marked suggested need review. Folder coverage and released revisions remain unverified.</p>'
  + '<div id="file-results">' + fileRows(rows) + '</div>'
  + '<p class="view-footer">Up to ' + D.LIMITS.files + ' canonical document rows plus bounded Drive metadata · ' + rows.length + ' shown' + (records.length===D.LIMITS.files?' · Canonical limit reached; the complete dossier remains in Drive.':'') + '</p>' + footer();
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
  return rows.length ? rows.map(m=>'<details><summary><strong>' + text(m.subject || '(No subject)') + '</strong><div class="provenance">' + text(m.from_name || m.from_email) + ' · ' + date(m.sent_at) + ' · ' + text(m.direction || 'Unknown') + ' · ' + context(m) + (m.needs_review ? ' · Association needs review' : '') + '</div></summary><dl class="facts"><div><dt>From</dt><dd>' + text(m.from_email) + '</dd></div><div><dt>To / CC</dt><dd>' + text(arr(m.to_emails).concat(arr(m.cc_emails)).join(', '),700) + '</dd></div></dl><p>' + sourceLink(D.gmailLink(m),'Read original Gmail thread') + '</p></details>').join('') : empty('No linked emails match these filters.');
}
async function renderEmails() {
  const rows=await D.emails();
  const domains=[...new Set(rows.map(m=>str(m.from_email).split('@')[1]).filter(Boolean))].sort();
  return pageHeader('Emails','TenneT-linked communication. Gmail remains the original source; no emails are sent here.')
    + '<div class="toolbar"><label>Company / contact <select id="email-company"><option value="">All senders</option>' + domains.map(d=>'<option value="'+escape(d)+'">'+escape(d)+'</option>').join('') + '</select></label><label>Context <select id="email-context"><option value="">All contexts</option>' + ['Samples','Technical','Commercial','Contracts','Finance','Logistics','General'].map(c=>'<option>'+c+'</option>').join('') + '</select></label><label>Search <input id="email-search" type="search" placeholder="Subject or contact"></label></div>'
    + '<p class="muted small">Context labels are suggestions from the subject. Only existing project links are used; associations marked for review remain visible as unverified.</p><div id="email-results">' + emailRows(rows) + '</div><p class="view-footer">Up to ' + D.LIMITS.emails + ' linked messages · ' + rows.length + ' returned' + (rows.length===D.LIMITS.emails?' · Limit reached.':'') + '</p>' + footer();
}
function amount(x,currency) { return x===null || x===undefined || x==='' || !Number.isFinite(Number(x)) ? 'Unknown' : Number(x).toLocaleString('en-GB',{maximumFractionDigits:2,minimumFractionDigits:2}) + ' ' + escape(currency || '· currency Unknown'); }
function totals(rows, pick) {
  const list=D.currencyTotals(rows,pick);
  return list.length ? '<div class="metric-lines">' + list.map(t=>'<span>' + amount(t.amount,t.currency) + '</span>').join('') + '</div>' : 'Unknown';
}
function invoiceTable(rows,supplier) {
  if(!rows.length) return empty('No linked invoices returned. This is not a zero-balance assertion.');
  return '<div class="table-wrap"><table><thead><tr><th style="width:27%">Invoice / party</th><th style="width:25%">Amount</th><th style="width:24%">Due</th><th style="width:24%">Payment evidence</th></tr></thead><tbody>' + rows.map(r=>'<tr><td>' + text(supplier ? r.supplier_invoice_nr : r.invoice_nr) + '<div class="provenance">' + text(supplier ? r.supplier : r.client) + '</div></td><td>' + amount(supplier ? r.amount ?? r.net_amount : r.gross_amount ?? r.net_amount,r.currency) + '</td><td>' + date(r.due_date) + '</td><td>' + (r.paid === true ? 'Recorded paid' : r.paid === false ? 'Recorded unpaid' : 'Unknown') + '<div class="provenance">' + (r.paid_date ? date(r.paid_date) : '') + '</div></td></tr>').join('') + '</tbody></table></div>';
}
async function renderFinance() {
  const d=await D.finance();
  const errors=Object.entries(d).filter(([,v])=>v.error).map(([k,v])=>notice(k + ': ' + v.error,true)).join('');
  const contracts=d.contracts.rows.filter(r=>r.doc_type === 'contract' && ['signed','executed','nenshkruar'].includes(str(r.status).toLowerCase()));
  const contractValue=d.contracts.error || !contracts.length ? 'Unknown' : contracts.map(r=>amount(r.amount_eur,'EUR') + '<div class="provenance">'+text(r.title || r.doc_nr)+'</div>').join('');
  const unpaidSales=d.sales.rows.filter(r=>r.paid===false);
  const unpaidSuppliers=d.suppliers.rows.filter(r=>r.paid===false);
  const financeSummary='<dl class="facts"><div><dt>Recorded signed contract value</dt><dd>' + contractValue + '</dd></div><div><dt>Supplier invoice costs</dt><dd>' + (d.suppliers.error ? 'Unknown' : totals(d.suppliers.rows,r=>r.amount ?? r.net_amount)) + '</dd></div><div><dt>Importer costs</dt><dd>Unknown</dd></div><div><dt>Retention</dt><dd>Unknown</dd></div><div><dt>Receivables · unpaid invoice face values</dt><dd>' + (d.sales.error?'Unknown':totals(unpaidSales,r=>r.gross_amount ?? r.net_amount)) + '</dd></div><div><dt>Payables · unpaid invoice face values</dt><dd>' + (d.suppliers.error?'Unknown':totals(unpaidSuppliers,r=>r.amount ?? r.net_amount)) + '</dd></div></dl><p class="metrics-note">Separate currency totals from a bounded list. Face values do not account for partial payments and are not bank balances. Supplier invoices are not an approved supplier cost plan.</p>';
  const plans=d.documents.rows.filter(r=>r.payment_plan).slice(0,8);
  const planBody=plans.length?plans.map(r=>'<details><summary>'+text(r.doc_nr)+' <span class="muted small">· '+text(r.offer_state || 'Commitment unverified')+'</span></summary><p class="muted small">Registered payment plan; not a receivable or a confirmed contract.</p><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:11px">' + escape(JSON.stringify(r.payment_plan,null,2)) + '</pre></details>').join(''):empty('No project payment plan returned.');
  const guarantees=d.guarantees.rows.length?d.guarantees.rows.map(g=>row(g.bank_name || 'Bank guarantee',str(g.guarantee_type)+' · '+str(g.status)+' · Expiry '+date(g.expiry_date),'<p class="muted small">'+amount(g.amount_guaranteed,'· currency not recorded')+'</p>')).join(''):empty('No project-linked guarantee returned.');
  return pageHeader('Finance','Project-only view of existing Finance registries. No cash inference or financial changes.') + errors + section('Finance & Contract snapshot',financeSummary) + section('Customer invoices',d.sales.error?empty('Read failed; no balance conclusion.'):invoiceTable(d.sales.rows,false)) + section('Supplier invoices',d.suppliers.error?empty('Read failed; no balance conclusion.'):invoiceTable(d.suppliers.rows,true)) + section('Payment milestones',d.documents.error?empty('Read failed; milestones Unknown.'):planBody) + section('Bank guarantees',d.guarantees.error?empty('Read failed; guarantee status Unknown.'):guarantees) + '<p class="view-footer">Limits: '+D.LIMITS.invoices+' per invoice registry, '+D.LIMITS.guarantees+' guarantees, '+D.LIMITS.documents+' payment-plan documents. Reaching a limit may omit older unpaid records.</p>' + footer();
}
async function renderPartners() {
  const rows=await D.contacts();
  const spie=rows.filter(r=>/@spie\.com$/i.test(str(r.email)) || /^spie(?: sag)?(?: gmbh)?$/i.test(str(r.company)));
  const aktiva=rows.filter(r=>/@aktiva\.com\.mk$/i.test(str(r.email)) || /^aktiva$/i.test(str(r.company)));
  const importer=rows.filter(r=>/\b(importer|import\/customs|cbam)\b/i.test(str(r.role)));
  const logistics=rows.filter(r=>/\b(logistics|subcontractor|transport)\b/i.test(str(r.role)));
  const contactRows=list=>list.length?list.map(r=>row(r.name || r.email,str(r.email)+' · '+str(r.role || 'Role unspecified'),provenance('Project contact · '+str(r.source),r.last_seen))).join(''):empty('No verified project contact metadata for this role.');
  const covered=new Set([...spie,...aktiva,...importer,...logistics].map(r=>r.id));
  return pageHeader('Partners','Project-linked companies and contacts. Roles do not imply supplier selection or contractual commitment.')
    + section('SPIE · Client',contactRows(spie))
    + section('AKTIVA · Manufacturer', '<p class="muted small">Workspace role supplied by the operator. No supplier commitment is inferred.</p>'+contactRows(aktiva))
    + section('German importer · Import / customs / CBAM',importer.length?'<p class="muted small">Recorded import role; German territory and contractual commitment remain unverified.</p>'+contactRows(importer):empty('Unknown — no importer identity with an explicit role is recorded in the returned project contacts.'))
    + section('Logistics & subcontractors',contactRows(logistics))
    + section('Other linked contacts',contactRows(rows.filter(r=>!covered.has(r.id))))
    + '<p class="view-footer">Up to '+D.LIMITS.contacts+' canonical project contacts; no global contact scan.</p>' + footer();
}
function installFilters(name) {
  if(name==='files') {
    const apply=async()=>{ const [data,records]=await Promise.all([ensureSnapshot(),D.files()]); const rows=D.evidenceFiles(data,records); const category=document.getElementById('file-category'); const search=document.getElementById('file-search'); const results=document.getElementById('file-results'); if(!category||!search||!results)return; const q=search.value.toLowerCase();results.innerHTML=fileRows(rows.filter(r=> (category.value==='All'||D.metadata(r).category===category.value) && [r.title,r.file_name,r.doc_nr,D.metadata(r).revision].map(str).join(' ').toLowerCase().includes(q))); };
    document.getElementById('file-category')?.addEventListener('change',apply);
    document.getElementById('file-search')?.addEventListener('input',apply);
  }
  if(name==='emails') {
    const apply=async()=>{ const rows=await D.emails(); const company=document.getElementById('email-company');const ctx=document.getElementById('email-context');const search=document.getElementById('email-search'); const results=document.getElementById('email-results');if(!company||!ctx||!search||!results)return;results.innerHTML=emailRows(rows.filter(r=>(!company.value||str(r.from_email).endsWith('@'+company.value))&&(!ctx.value||context(r)===ctx.value)&&[r.subject,r.from_name,r.from_email,...arr(r.to_emails),...arr(r.cc_emails)].map(str).join(' ').toLowerCase().includes(search.value.toLowerCase())));};
    ['email-company','email-context'].forEach(id=>document.getElementById(id)?.addEventListener('change',apply));
    document.getElementById('email-search')?.addEventListener('input',apply);
  }
}
async function route() {
  const requested=location.hash.slice(1).toLowerCase();
  const name=allowedViews.includes(requested)?requested:'overview';
  const generation=++routeGeneration;
  const current=D.session();
  if(current?.access_token!==authenticatedToken) { snapshotPromise=null;overviewPromise=null;authenticatedToken=current?.access_token||''; }
  document.querySelectorAll('[data-view]').forEach(a=>a.setAttribute('aria-current',a.dataset.view===name?'page':'false'));
  view.setAttribute('aria-busy','true');
  view.innerHTML='<div class="loading-surface">'+pageHeader(name[0].toUpperCase()+name.slice(1),'Reading verified project data…')+'</div>';
  readStatus.textContent='Reading PPPP…';
  try {
    if(!current) throw new Error('SESSION_REQUIRED: Open PPPP to sign in or renew your session, then return to SPIE.');
    let html;
    if(name==='overview') { const [data,latest]=await ensureOverview();html=renderOverview(data,latest);readStatus.textContent='Snapshot · '+date(data.generated_at)+' '+new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Europe/Budapest'}).format(new Date(data.generated_at)); }
    else if(name==='projects') html=renderProjects(await ensureSnapshot());
    else html=await ({files:renderFiles,emails:renderEmails,finance:renderFinance,partners:renderPartners}[name])();
    if(generation!==routeGeneration || D.session()?.access_token!==authenticatedToken)return;
    view.innerHTML=html;
    if(name!=='overview') readStatus.textContent='Project records · read-only';
    installFilters(name);
  } catch(error) {
    if(generation!==routeGeneration)return;
    readStatus.textContent='Data not verified';
    view.innerHTML='<div class="error-state">'+pageHeader('Project data unavailable','No business-state conclusion can be made from this read failure.')+notice(error.message,true)+'<p><a class="btn" href="../pristeel-procurement.html">Open PPPP</a></p><button class="btn" id="retry">Retry this view</button></div>';
    document.getElementById('retry')?.addEventListener('click',()=>{D.invalidate();snapshotPromise=null;overviewPromise=null;route();},{once:true});
  } finally { if(generation===routeGeneration)view.setAttribute('aria-busy','false'); }
}
window.addEventListener('hashchange',route);
window.addEventListener('storage',event=>{if(event.key==='pristeel_session'||event.key===null)route();});
window.addEventListener('pageshow',event=>{if(event.persisted)route();});
route();
