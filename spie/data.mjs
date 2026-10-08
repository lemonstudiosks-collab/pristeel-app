/* Same-origin PPPP session; read-only adapter. No SDK, auth mutation, storage or polling. */
export const PROJECT_ID = 'c937aea1-af5e-4807-ae1e-e36864e46794';
export const PROJECT_REF = 'awqfpnzqwfjrjefoktgd';
const API = 'https://' + PROJECT_REF + '.supabase.co/rest/v1/';
const PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cWZwbnpxd2ZqcmplZm9rdGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzY0MzQsImV4cCI6MjEwNTA1MjQzNH0.T3FFElqBw4mb6mvh_WkfS35CNAsacPimiGG2H9J2G7E';
const cache = new Map();
let cacheSession = '';
export const LIMITS = Object.freeze({ files: 50, emails: 120, attachments: 160, contacts: 40, invoices: 50, guarantees: 20, documents: 30 });

export function session() {
  let value;
  try { value = JSON.parse(localStorage.getItem('pristeel_session') || 'null'); } catch { return null; }
  const expiry=Number(value?.expires_at);const expiresMs=expiry<1e12?expiry*1000:expiry;
  if (!value?.access_token || !expiry || expiresMs <= Date.now()) return null;
  try {
    const part = value.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    const ref = claims.ref || String(claims.iss || '').match(/^https:\/\/([a-z0-9]+)\.supabase\.co(?:\/|$)/)?.[1];
    if (ref !== PROJECT_REF || claims.role !== 'authenticated' || !claims.exp || claims.exp * 1000 <= Date.now()) return null;
  } catch { return null; }
  return value;
}

export function invalidate() { cache.clear(); }

let refreshPromise=null;
export async function ensureSession(){
  const valid=session();if(valid)return valid;
  if(refreshPromise)return refreshPromise;
  let before;try{before=JSON.parse(localStorage.getItem('pristeel_session')||'null');}catch{return null;}
  if(!before?.refresh_token||!before.access_token)return null;
  try{const claims=JSON.parse(atob(before.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));const ref=claims.ref||String(claims.iss||'').match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];if(ref!==PROJECT_REF||claims.role!=='authenticated')return null;}catch{return null;}
  const lockKey='pst_auth_refresh_lock_v1',owner='spie-'+Date.now()+'-'+Math.random();
  let lock;try{lock=JSON.parse(localStorage.getItem(lockKey)||'null');}catch{}
  if(lock?.until>Date.now()){
    refreshPromise=new Promise(resolve=>{const timer=setTimeout(done,Math.min(9000,lock.until-Date.now()+300));function changed(e){if(e.key==='pristeel_session')done();}function done(){clearTimeout(timer);globalThis.removeEventListener?.('storage',changed);resolve(session());}globalThis.addEventListener?.('storage',changed);}).finally(()=>{refreshPromise=null;});return refreshPromise;
  }
  localStorage.setItem(lockKey,JSON.stringify({owner,until:Date.now()+15000}));
  refreshPromise=(async()=>{
    const response=await fetch('https://'+PROJECT_REF+'.supabase.co/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:PUBLIC_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:before.refresh_token}),signal:AbortSignal.timeout(12000)});
    if(!response.ok){const detail=await response.json().catch(()=>({}));throw new Error('PPPP auth '+response.status+': '+(detail.msg||detail.message||detail.error_description||response.statusText));}
    const fresh=await response.json();
    const now=JSON.parse(localStorage.getItem('pristeel_session')||'null');
    if(!now||now.access_token!==before.access_token)return session();
    if(!fresh.access_token||!fresh.refresh_token)throw new Error('PPPP auth: përgjigjja nuk përmban sesion të vlefshëm.');
    localStorage.setItem('pristeel_session',JSON.stringify({...before,...fresh,expires_at:(Number(fresh.expires_at)||Date.now()/1000+Number(fresh.expires_in))*1000}));
    const verified=session();if(!verified){localStorage.setItem('pristeel_session',JSON.stringify(before));throw new Error('PPPP auth: identiteti i sesionit nuk përputhet.');}invalidate();return verified;
  })().finally(()=>{try{if(JSON.parse(localStorage.getItem(lockKey)||'null')?.owner===owner)localStorage.removeItem(lockKey);}catch{}refreshPromise=null;});return refreshPromise;
}

export async function read(path, { refresh = false } = {}) {
  const current = await ensureSession();
  if (!current) { cache.clear(); cacheSession = ''; throw new Error('SESSION_REQUIRED: Hapni PPPP për të hyrë ose rinovuar sesionin, pastaj kthehuni te SPIE.'); }
  if (cacheSession !== current.access_token) { cache.clear(); cacheSession = current.access_token; }
  if (refresh) cache.delete(path);
  const old = cache.get(path);
  if (old && Date.now() - old.at < 300000) return old.promise;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const promise = fetch(API + path, { method: 'GET', cache: 'no-store', signal: controller.signal,
    headers: { apikey: PUBLIC_KEY, Authorization: 'Bearer ' + current.access_token, Accept: 'application/json' }
  }).then(async response => {
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error('PPPP ' + response.status + ': ' + (detail.message || response.statusText));
    }
    // Discard responses if logout/account switch happened during the request.
    if (session()?.access_token !== current.access_token) throw new Error('SESSION_CHANGED: Kthehuni te PPPP dhe rihapni SPIE.');
    return response.json();
  }).catch(error => {
    if (error.name === 'AbortError') throw new Error('Leximi nga PPPP tejkaloi afatin (12 sekonda). Të dhënat nuk mund të verifikoheshin.');
    throw error;
  }).finally(() => clearTimeout(timer));
  cache.set(path, { at: Date.now(), promise });
  return promise;
}

export function projectRows(table, fields, limit, order = 'created_at.desc') {
  const query = new URLSearchParams({ project_id: 'eq.' + PROJECT_ID, select: fields, limit: String(limit), order });
  return read(table + '?' + query);
}
export async function snapshot() {
  const query = new URLSearchParams({ p_project_id: PROJECT_ID, p_email_limit: '6', p_fact_limit: '8', p_task_limit: '6', p_document_limit: '3' });
  const data = await read('rpc/pppp_chatgpt_project_snapshot_v1?' + query);
  if (data?.project?.id !== PROJECT_ID || data.read_only_snapshot !== true) throw new Error('Identiteti i pasqyrës së projektit në PPPP nuk mund të verifikohej.');
  return data;
}
// The chat intelligence RPC includes the cross-project Home action projection.
// Do not make that global calculation a prerequisite for opening one project.
export async function workspaceSnapshot() {
  const expectedSession = (await ensureSession())?.access_token;
  const projectQuery = new URLSearchParams({ id: 'eq.' + PROJECT_ID, select: 'id,ref,name,client,status,deadline,location,deal_type,work_model,origin_type,business_ref,business_type,last_email_at,pipeline_stage,last_activity_at,operational_state,operational_state_at,operational_state_source,drive_folder_id,drive_folder_url,updated_at', limit: '1' });
  const factQuery = new URLSearchParams({ project_id: 'eq.' + PROJECT_ID, select: 'id,project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,fact_status,updated_at,created_by', fact_status: 'in.(observed,suggested)', order: 'updated_at.desc', limit: '8' });
  const [projectResult, factResult] = await Promise.allSettled([
    read('projects?' + projectQuery), read('pppp_project_context_current_v?' + factQuery)
  ]);
  if (session()?.access_token !== expectedSession) throw new Error('SESSION_CHANGED: Kthehuni te PPPP dhe rihapni SPIE.');
  if (projectResult.status !== 'fulfilled') throw projectResult.reason;
  const rows = projectResult.value;
  if (!Array.isArray(rows) || rows.length !== 1 || rows[0]?.id !== PROJECT_ID) throw new Error('Identiteti i projektit në PPPP nuk mund të verifikohej.');
  if (factResult.status === 'fulfilled' && (!Array.isArray(factResult.value) || factResult.value.some(f => f.project_id !== PROJECT_ID))) throw new Error('Identiteti i fakteve të projektit në PPPP nuk mund të verifikohej.');
  return { project: rows[0], context_facts: factResult.status === 'fulfilled' ? factResult.value : [],
    operator_actions: [], read_only_snapshot: true, generated_at: new Date().toISOString(),
    read_errors: factResult.status === 'rejected' ? [{ source: 'Konteksti i projektit', error: factResult.reason.message }] : [] };
}
export async function workspaceActions({ refresh = false } = {}) {
  const query = new URLSearchParams({ project_id: 'eq.' + PROJECT_ID, select: 'id,project_id,title,detail,due_date,priority,status,source,source_ref,category,created_at', order: 'due_date.asc.nullslast,created_at.desc', limit: '6' });
  const rows = await read('pppp_home_current_actions_v1?' + query, { refresh });
  if (!Array.isArray(rows) || rows.some(a => a.project_id !== PROJECT_ID)) throw new Error('Identiteti i veprimeve të projektit në PPPP nuk mund të verifikohej.');
  return rows;
}
const fileFields = 'id,project_id,title,file_name,doc_type,doc_nr,doc_date,party,status,drive_url,notes,created_at,amount_eur';
export const latestFiles = () => projectRows('project_docs', fileFields, 3);
export const files = () => projectRows('project_docs', fileFields, LIMITS.files);
// Reuse controlled, source-backed project context. No additional API read.
export function workspaceEvidence(data) {
  if (data?.project?.id !== PROJECT_ID) return null;
  const fact = data.context_facts?.find(f => f.fact_key === 'spie.workspace.evidence.v1' && f.fact_status === 'observed' && f.evidence_status === 'observed' && f.value?.project_id === PROJECT_ID);
  return fact || null;
}
export function evidenceFiles(data, rows = []) {
  const inventory = workspaceEvidence(data)?.value?.drive_inventory;
  if (!inventory || inventory.folder_id !== data.project.drive_folder_id || !Array.isArray(inventory.files)) return rows;
  const result = [...rows];
  const identity = raw => {
    const link = safeLink(raw, 'drive');
    return link.match(/\/d\/([^/]+)/)?.[1] || link;
  };
  const seen = new Set(rows.map(r => identity(r.drive_url)).filter(Boolean));
  for (const file of inventory.files.slice(0, LIMITS.files)) {
    const link = safeLink(file.drive_url, 'drive'), key = identity(link);
    if (!key || key !== file.drive_file_id || seen.has(key)) continue;
    seen.add(key);
    result.push({ project_id: PROJECT_ID, title: file.title, drive_url: link, created_at: file.modified_at,
      source: 'Drive metadata snapshot', source_observed_at: inventory.observed_at,
      notes: { category: file.category, category_verified: file.category_verified === true,
        revision: file.revision ?? null, revision_verified: file.revision_verified === true, is_latest: file.is_latest === true } });
  }
  return result;
}
export const emails = () => projectRows('project_emails', 'id,project_id,gmail_message_id,gmail_thread_id,from_email,from_name,to_emails,cc_emails,subject,snippet,has_attachments,sent_at,direction,gmail_url,needs_review,review_reason', LIMITS.emails, 'sent_at.desc.nullslast,id.desc');
export const suggestedEmails = () => read('project_emails?'+new URLSearchParams({project_id:'is.null',suggested_project_id:'eq.'+PROJECT_ID,select:'id,project_id,suggested_project_id,gmail_message_id,gmail_thread_id,from_email,from_name,to_emails,cc_emails,subject,snippet,has_attachments,sent_at,direction,gmail_url,needs_review,review_reason',limit:'12',order:'sent_at.desc.nullslast,id.desc'}));
export const attachments = () => projectRows('project_attachment_links', 'id,project_id,attachment_id,attachment_name,gmail_message_id,gmail_thread_id,drive_file_id,attachment_mime_type,attachment_size_bytes,content_sha256,analysis_status,created_at', LIMITS.attachments, 'created_at.desc,id.desc');
export const offerEvidence = () => read('project_attachment_links?'+new URLSearchParams({project_id:'eq.'+PROJECT_ID,select:'id,project_id,attachment_name,analysis_status,analysis_confidence,extracted_text,extracted_data,content_sha256',extracted_text:'not.is.null',or:'(attachment_name.ilike.*offer*,attachment_name.ilike.*angebot*,attachment_name.ilike.*quotation*,attachment_name.ilike.*ponud*,attachment_name.ilike.*tennet*bunt*dap*,attachment_name.ilike.*tennet*bunt*ddp*)',limit:'40',order:'created_at.desc,id.desc'}));
export const supplierOffers = () => projectRows('offers', 'id,project_id,supplier,offer_ref,created_at,currency,total_amount,total_eur,price_kg,qty_kg,delivery_weeks,incoterms,payment_terms,inclusions,exclusions,notes', 30);
export const clientOffers = () => projectRows('documents_registry', 'id,project_id,series,doc_nr,created_at,currency,total_amount,total_eur,offer_state,payment_plan', LIMITS.documents);
export const operationFacts = () => read('pppp_project_context_current_v?'+new URLSearchParams({project_id:'eq.'+PROJECT_ID,fact_key:'like.spie.*',select:'id,fact_key,value,fact_status,evidence_status,source_ref,updated_at',limit:'200',order:'updated_at.desc'}));
export async function liveDriveFiles(folderId){
  if(!/^[\w-]+$/.test(folderId||''))return [];
  const google=googleSession();if(!google)return [];
  let scopes='';try{scopes=localStorage.getItem('pst_google_workspace_scopes_v2')||'';}catch{}
  if(!/https:\/\/www.googleapis.com\/auth\/drive(?:\s|$)/.test(scopes))return [];
  const path='https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:"'"+folderId+"' in parents and trashed = false",fields:'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,sha256Checksum)',pageSize:'100',orderBy:'modifiedTime desc'});
  const r=await fetch(path,{method:'GET',headers:{Authorization:'Bearer '+google.token},signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error('Drive '+r.status+': dokumentet nuk mund të lexoheshin.');
  const d=await r.json();if(!session())throw new Error('SESSION_CHANGED');
  return {files:d.files||[],truncated:!!d.nextPageToken};
}
export const contacts = () => projectRows('project_contacts', 'id,project_id,email,name,company,role,source,last_seen,status,is_primary', LIMITS.contacts, 'last_seen.desc.nullslast');
export async function finance() {
  const jobs = [
    ['sales', () => projectRows('invoices_out', 'id,project_id,invoice_nr,date,client,currency,gross_amount,net_amount,paid,paid_date,due_date,contract_value,attachment_url,attachment_filename,notes', LIMITS.invoices, 'date.desc.nullslast')],
    ['suppliers', () => projectRows('invoices_in', 'id,project_id,supplier,supplier_invoice_nr,date,amount,net_amount,currency,paid,paid_date,due_date,notes,file_name', LIMITS.invoices, 'date.desc.nullslast')],
    ['guarantees', () => projectRows('bank_guarantees', 'id,project_id,bank_name,guarantee_type,amount_guaranteed,expiry_date,status', LIMITS.guarantees)],
    ['expenses', () => projectRows('expenses','id,project_id,category,supplier,invoice_nr,date,due_date,amount,net_amount,currency,paid,paid_date,notes',LIMITS.invoices,'date.desc.nullslast')],
    ['documents', clientOffers],
    ['contracts', files]
  ];
  const result = await Promise.allSettled(jobs.map(([, job]) => job()));
  return Object.fromEntries(jobs.map(([key], i) => [key, result[i].status === 'fulfilled'
    ? { rows: result[i].value, error: null } : { rows: [], error: result[i].reason.message }]));
}
export function safeLink(raw, kind) {
  try {
    const url = new URL(raw);
    const hosts = kind === 'gmail' ? ['mail.google.com'] : ['drive.google.com', 'docs.google.com'];
    return url.protocol === 'https:' && hosts.includes(url.hostname) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export function gmailLink(row) {
  return safeLink(row.gmail_url, 'gmail') || (/^[a-f0-9]+$/i.test(row.gmail_thread_id || '')
    ? 'https://mail.google.com/mail/u/0/#all/' + row.gmail_thread_id : '');
}
export function metadata(row) {
  let meta = {};
  try { const value = typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes; if (value && !Array.isArray(value) && typeof value === 'object') meta = value; } catch {}
  const categories = ['Technical', 'Commercial', 'Contracts', 'Finance', 'Quality', 'Logistics'];
  const type = String(meta.category || row.doc_type || '').toLowerCase();
  const mapping = { drawing: 'Technical', technical: 'Technical', commercial: 'Commercial', offer: 'Commercial', quotation: 'Commercial', contract: 'Contracts', contracts: 'Contracts', invoice: 'Finance', finance: 'Finance', certificate: 'Quality', quality: 'Quality', logistics: 'Logistics' };
  const category = categories.find(x => x.toLowerCase() === type) || mapping[type] || 'Unclassified';
  const revision = meta.revision ?? meta.drawing_revision ?? null;
  // Never infer a released/latest drawing revision from file timestamps or names.
  const latest = meta.is_latest === true && meta.revision_verified === true;
  return { category, categorySuggested: meta.category_verified === false, revision, documentKey: meta.document_key || row.doc_nr || '', latest, drawing: meta.document_kind === 'drawing' || type === 'drawing' };
}
export function currencyTotals(rows, amountField) {
  const totals = new Map();
  for (const row of rows) {
    const raw = amountField(row);
    if (raw === null || raw === undefined || raw === '' || !Number.isFinite(Number(raw))) continue;
    const currency = /^[A-Z]{3}$/.test(String(row.currency || '').toUpperCase()) ? row.currency.toUpperCase() : 'Unknown currency';
    totals.set(currency, (totals.get(currency) || 0) + Number(raw));
  }
  return [...totals].map(([currency, amount]) => ({ currency, amount }));
}

// Operational projection only: no business-state mutation or inferred commitments.
const list = value => Array.isArray(value) ? value : [];
const string = value => String(value ?? '');
const newest = rows => [...rows].sort((a,b) => string(b.sent_at || b.created_at).localeCompare(string(a.sent_at || a.created_at)));
export function messageText(mail) {
  return string(mail.snippet).replace(/\\n/g,'\n').split(/(?:-----\s*(?:Original|Urspr|Forwarded)|\n(?:Von:|From:|On .+wrote:))/i)[0].trim();
}
export function mailParty(mail) {
  const from = string(mail.from_email).toLowerCase();
  if (/@aktiva\.com\.mk$/.test(from)) return 'supplier';
  if (/@spie\.com$/.test(from)) return 'client';
  return /@prissteel\.com$/.test(from) ? 'pristeel' : 'other';
}
function recipients(mail, domain) { return list(mail.to_emails).some(x => string(x).toLowerCase().endsWith('@'+domain)); }
export function offerKind(name) {
  if (/vorlage|template|presentation|proposal|rfq|anfrage/i.test(name)) return '';
  if (/^PRISTEEL.*TENNET.*(?:DAP|DDP).*\.xlsx$/i.test(name)) return 'offer';
  if (!/offer|angebot|quotation|ponuda|ponud[ae]/i.test(name)) return '';
  return /bedingungen|terms|klarstellungen|conditions/i.test(name) ? 'terms' : 'offer';
}
function money(raw) {
  const value=string(raw).replace(/[\s"']/g,'');
  if(!value)return null;
  let normalized=value;
  if(value.includes(',')&&value.includes('.')) normalized=value.lastIndexOf('.')>value.lastIndexOf(',')?value.replace(/,/g,''):value.replace(/\./g,'').replace(',','.');
  else if((value.match(/,/g)||[]).length>1||/,\d{3}(?:,|$)/.test(value)) normalized=value.replace(/,/g,'');
  else normalized=value.replace(',','.');
  const number=Number(normalized);return Number.isFinite(number)?number:null;
}
function excerpt(textValue,pattern,max=220) {
  const found=string(textValue).match(pattern);return found?found[1].replace(/[,;\s]+/g,' ').trim().slice(0,max):'';
}
export function extractOfferFacts(row) {
  const raw=string(row.extracted_text), name=string(row.attachment_name), text=raw.replace(/\r/g,'');
  const lots=[];
  for(const part of text.split(/(?=Sheet:\s*Los\s+)/i)) {
    const lot=part.match(/^Sheet:\s*Los\s+([^\n,]+)/i);
    const sum=part.match(/Summe\s+Pos\.\s*OHNE\s+Montage[\s\S]{0,180}?["']?([0-9]{1,3}(?:[.,][0-9]{3})+[.,][0-9]{2})/i);
    const amount=money(sum?.[1]);
    if(lot&&amount!==null)lots.push({name:'Los '+lot[1].trim(),amount,currency:'EUR'});
  }
  const totalTable=text.match(/All four lots\s+\d+\s+substations\s+[\d,.]+\s*t\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)/i);
  const amount=lots.length?lots.reduce((total,lot)=>total+lot.amount,0):money(totalTable?.[3]);
  const terms=[...new Set(((name+'\n'+text.slice(0,5000)).match(/\b(?:DAP|DDP)\b/gi)||[]).map(x=>x.toUpperCase()))];
  const dateMatch=(name+'\n'+text.slice(0,4000)).match(/(?:Angebotsdatum|Preisstand|Offer\s*date|Date)[\s:,|-]*([0-3]?\d[.\/-][01]?\d[.\/-]20\d{2})/i)
    || name.match(/([0-3]?\d[.\/-][01]?\d[.\/-]20\d{2})/);
  const payment=excerpt(text,/(?:Zahlungsbedingungen|Payment\s+terms?)[\s:,]*([^\n]{3,220})/i);
  const validity=excerpt(text,/(?:bindend\s+bis|gültig\s+bis|valid\s+until|validity)[\s:,]*([^\n]{3,120})/i);
  const transport=/Fracht[^\n]{0,180}(?:enthalten|included)/i.test(text)?'Transporti përfshihet sipas dokumentit':/transport|fracht/i.test(text)?'Shiko kushtet e transportit në dokument':'Nuk u gjet në dokument';
  const cbam=/CBAM/i.test(text)?(/(?:buyer|SPIE|PRISTEEL|importer)[^\n]{0,160}(?:CBAM|declarant)|CBAM[^\n]{0,160}(?:buyer|SPIE|PRISTEEL|importer|declarant)/i.test(text)?'Përgjegjësia përshkruhet në dokument':'CBAM përmendet; përgjegjësia kërkon verifikim'):'Nuk u gjet në dokument';
  const painting=/painting|beschichtung|lackier/i.test(text)?(/separat|separate|not included|nicht enthalten/i.test(text)?'Paraqitet veçmas / nuk përfshihet në bazën kryesore':'Përshkruhet në dokument'):'Nuk u gjet në dokument';
  const customs=/customs|zoll|import/i.test(text)?'Importi/dogana përshkruhet në dokument':'Nuk u gjet në dokument';
  const statedIncoterm=text.match(/Delivery\s*:\s*(DAP|DDP)\b/i)?.[1]||text.match(/This offer is made\s+(DAP|DDP)\b/i)?.[1];
  return {lots,amount,currency:amount===null?null:'EUR',amount_without_painting:money(totalTable?.[1]),painting_amount:money(totalTable?.[2]),amount_basis:lots.length?'Shuma e loteve të nxjerra':totalTable?'Totali DAP me lyerje sipas tabelës së ofertës':'',terms:statedIncoterm||terms.join(' / '),offer_date:dateMatch?.[1]||'',payment_terms:payment||'',validity:validity||'',transport,cbam,painting,customs,
    evidence_status:raw&&row.analysis_status==='analyzed'?'E nxjerrë nga dokumenti i analizuar':raw?'Evidence tekstuale në PPPP':'Pa verifikim'};
}
export function operationalModel(data, bundle) {
  const mails = newest(list(bundle.emails.rows).filter(m => string(m.project_id || PROJECT_ID) === PROJECT_ID));
  const trusted = mails.filter(m => m.needs_review === false && !m.association_pending);
  const offerMails = mails.filter(m => m.needs_review === false);
  const byId = new Map(mails.map(m => [m.gmail_message_id,m]));
  const offerRows = [];
  for (const a of list(bundle.attachments.rows)) {
    if (string(a.project_id) !== PROJECT_ID || !offerKind(a.attachment_name)) continue;
    const m = byId.get(a.gmail_message_id);
    if (!m || m.needs_review !== false) continue;
    const supplier = mailParty(m) === 'supplier';
    const client = /^PRISTEEL/i.test(a.attachment_name) && (mailParty(m) === 'client' || (mailParty(m) === 'pristeel' && recipients(m,'spie.com')));
    if (!supplier && !client) continue;
    const sent = client && mailParty(m) === 'pristeel' && /^(outgoing|outbound|out)$/i.test(m.direction);
    const drive = /^[\w-]+$/.test(a.drive_file_id || '') ? 'https://drive.google.com/file/d/'+a.drive_file_id+'/view' : '';
    const facts=extractOfferFacts(a);
    offerRows.push({ id:'attachment:'+a.id, side:supplier?'supplier':'client', kind:offerKind(a.attachment_name), title:a.attachment_name,
      sent_at:m.sent_at, mail:m, source:a.source || 'Bashkëngjitje në PPPP', source_url:gmailLink(m), drive_url:drive,
      state:(supplier?'Pranuar nga Aktiva':sent?'Dërguar te SPIE':'Kopje në komunikim me SPIE')+(m.association_pending?' · lidhja me projektin për shqyrtim':''), sent,...facts,
      terms:facts.terms||(a.attachment_name.replace(/_/g,' ').match(/\b(?:DAP|DDP)\b/gi)||[]).map(x=>x.toUpperCase()).filter((v,i,all)=>all.indexOf(v)===i).join(' / '),
      content_key:a.content_sha256 || '', attachment_id:a.id,gmail_attachment_id:a.attachment_id,attachment_mime_type:a.attachment_mime_type,association_pending:m.association_pending===true });
  }
  // Exact filename/content identity, with direct sent evidence taking precedence over returned copies.
  const unique = new Map();
  for (const o of newest(offerRows)) {
    const key=o.side+':'+(o.content_key || o.id);
    const old=unique.get(key);
    const quality=o=>(o.sent?4:0)+(o.amount!==null?2:0)+(o.evidence_status!=='Pa verifikim'?1:0);
    if (!old || quality(o)>quality(old)) unique.set(key,o);
    if(old&&o.content_key){const best=unique.get(key),other=best===o?old:o;for(const field of ['amount','currency','lots','amount_basis','amount_without_painting','painting_amount','payment_terms','validity','transport','cbam','painting','customs'])if((best[field]===null||best[field]===undefined||best[field]===''||best[field]==='Nuk u gjet në dokument'||Array.isArray(best[field])&&!best[field].length)&&other[field])best[field]=other[field];}
  }
  const offers=[...unique.values()];
  for (const m of offerMails) {
    if (!m.has_attachments || !/angebot|offer|ponud/i.test(m.subject) || /anfrage|rfq|automatische|automatic/i.test(m.subject)) continue;
    const supplier=mailParty(m)==='supplier';
    const client=mailParty(m)==='pristeel' && recipients(m,'spie.com') && /^(outgoing|outbound|out)$/i.test(m.direction);
    if ((!supplier&&!client) || offerRows.some(o=>o.mail.gmail_message_id===m.gmail_message_id&&o.kind==='offer')) continue;
    offers.push({id:'mail:'+m.gmail_message_id,side:supplier?'supplier':'client',kind:'offer',title:m.subject,mail:m,
      sent_at:m.sent_at,state:(supplier?'Email nga Aktiva · kontrollo bashkëngjitjen':'Dërguar te SPIE · dokumentet në Gmail')+(m.association_pending?' · lidhja me projektin për shqyrtim':''),sent:client,
      source:m.association_pending?'PPPP · vetëm sugjerim për lidhjen me projektin':'Email i lidhur në PPPP',source_url:gmailLink(m),amount:null,currency:null,terms:(m.subject.match(/\b(?:DAP|DDP)\b/gi)||[]).join(' / '),metadata_missing:true,association_pending:m.association_pending===true});
  }
  for (const r of list(bundle.suppliers.rows)) offers.push({...r,id:'supplier:'+r.id,side:'supplier',kind:'offer',title:r.offer_ref||r.supplier||'Ofertë furnitori',sent_at:r.created_at,state:'Ofertë e regjistruar',source:'Regjistri i ofertave në PPPP',amount:r.total_amount ?? (r.currency==='EUR'?r.total_eur:null),terms:r.incoterms||'',source_url:''});
  for (const r of list(bundle.clients.rows).filter(r=>r.series==='QUO')) {
    const status=typeof r.offer_state==='object'?r.offer_state?.status:r.offer_state;
    offers.push({...r,id:'client:'+r.id,side:'client',kind:'offer',title:r.doc_nr,sent_at:r.created_at,state:status||'Ofertë e regjistruar',source:'Regjistri i dokumenteve në PPPP',amount:r.total_amount ?? (r.currency==='EUR'?r.total_eur:null),source_url:''});
  }
  const sample = trusted.find(m=>mailParty(m)==='client' && !/automatische antwort|automatic reply/i.test(m.subject) && /muster|sample|anfertigung\s*2/i.test(m.subject));
  const approval = trusted.find(m=>sample && m.gmail_thread_id===sample.gmail_thread_id && mailParty(m)==='client' && /vorgehen.*(?:in ordnung|einverstanden)|so machen wir das/i.test(messageText(m)));
  const currentRequest = trusted.find(m=>sample && m.gmail_thread_id===sample.gmail_thread_id && mailParty(m)==='client' && /zwei muster|2\s*(?:x|muster)|two samples/i.test(messageText(m)));
  const supplierSample=trusted.find(m=>mailParty(m)==='supplier' && /uzork|muster|sample|3207/i.test(m.subject));
  const timeline=trusted.filter(m=>!/automatische antwort|automatic reply|out of office/i.test(m.subject)).map(m=>({
    id:m.gmail_message_id,title:m.subject,date:m.sent_at,party:mailParty(m),direction:m.direction,body:messageText(m),source_url:gmailLink(m),external_source:m.external_source===true,
    files:offerRows.filter(o=>o.mail.gmail_message_id===m.gmail_message_id)
  }));
  const files=evidenceFiles(data,list(bundle.files.rows));
  const seenFiles=new Set(files.map(f=>f.drive_url).filter(Boolean));
  const seenAttachments=new Set();
  for(const a of list(bundle.attachments.rows)) {
    if(string(a.project_id)!==PROJECT_ID || /^(image\d*|logo|icon)\.(png|jpe?g|gif)$/i.test(a.attachment_name||''))continue;
    const m=byId.get(a.gmail_message_id);if(!m || m.needs_review!==false || m.association_pending)continue;
    const contentKey=a.content_sha256 || string(a.attachment_name).normalize('NFC').toLowerCase();
    if(seenAttachments.has(contentKey))continue;
    seenAttachments.add(contentKey);
    const link=/^[\w-]+$/.test(a.drive_file_id||'')?'https://drive.google.com/file/d/'+a.drive_file_id+'/view':'';
    if(link && seenFiles.has(link))continue;
    if(link)seenFiles.add(link);
    if(files.some(f=>f.gmail_message_id===a.gmail_message_id&&f.title===a.attachment_name))continue;
    const technical=/werkstatt|stückliste|zeichnung|drawing|\.x83$|\.dwg$|korrosionsschutz/i.test(a.attachment_name);
    files.push({project_id:PROJECT_ID,title:a.attachment_name,created_at:m.sent_at,drive_url:link,gmail_url:gmailLink(m),gmail_message_id:m.gmail_message_id,doc_type:offerKind(a.attachment_name)?'commercial':technical?'technical':'',notes:{category_verified:false},source:'Bashkëngjitje e emailit'});
  }
  return {offers:newest(offers.filter(o=>!o.association_pending)),reviewOffers:newest(offers.filter(o=>o.association_pending)),mails,trusted,timeline,files,sample,approval,currentRequest,supplierSample,
    errors:Object.entries(bundle).filter(([,v])=>v.error).map(([source,v])=>({source,error:v.error})),
    limits:{emails:mails.length===LIMITS.emails,attachments:bundle.attachments.rows.length===LIMITS.attachments},
    structuredMissing:!bundle.suppliers.error&&!bundle.clients.error&&!bundle.suppliers.rows.length&&!bundle.clients.rows.length};
}
export async function operational() {
  const jobs=[['files',files],['emails',emails],['attachments',attachments],['evidence',offerEvidence],['suppliers',supplierOffers],['clients',clientOffers],['suggested',suggestedEmails]];
  const settled=await Promise.allSettled(jobs.map(([,fn])=>fn()));
  const bundle=Object.fromEntries(jobs.map(([key],i)=>[key,settled[i].status==='fulfilled'?{rows:list(settled[i].value),error:null}:{rows:[],error:settled[i].reason.message}]));
  const evidenceById=new Map(bundle.evidence.rows.map(row=>[string(row.id),row]));
  bundle.attachments.rows=bundle.attachments.rows.map(row=>({...row,...(evidenceById.get(string(row.id))||{})}));
  // A suggestion is visible review evidence, never an assigned project email.
  for(const m of bundle.suggested.rows) {
    if(m.project_id!==null || m.suggested_project_id!==PROJECT_ID || m.needs_review!==false || !/tennet.*bunt|spie.*tennet/i.test(m.subject))continue;
    if(!bundle.emails.rows.some(e=>e.gmail_message_id===m.gmail_message_id))bundle.emails.rows.push({...m,association_pending:true});
  }
  bundle.emails.rows=newest(bundle.emails.rows);
  await enrichMissingOffers(bundle);
  return bundle;
}
// Reuse PPPP's existing Google session. No new consent, token persistence, scan or ingestion.
export function googleSession() {
  if(!session())return null;
  for(const storage of [globalThis.localStorage,globalThis.sessionStorage]) {
    try {
      const token=storage?.getItem('pst_google_workspace_token_v2');
      const expiry=Number(storage?.getItem('pst_google_workspace_token_exp_v2'));
      const scopes=string(storage?.getItem('pst_google_workspace_scopes_v2')).split(/\s+/);
      if(token && expiry>Date.now()+30000 && scopes.some(s=>['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/gmail.modify','https://mail.google.com/'].includes(s)))return {token,expiry};
    }catch{}
  }
  return null;
}
async function enrichMissingOffers(bundle) {
  const google=googleSession(),identity=session()?.access_token;
  if(!google || bundle.emails.error)return;
  async function googleRead(path) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
    try{
      const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{method:'GET',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+google.token}});
      if(!response.ok)throw new Error('Gmail '+response.status);
      const result=await response.json();
      if(session()?.access_token!==identity||googleSession()?.token!==google.token)throw new Error('SESSION_CHANGED');
      return result;
    }finally{clearTimeout(timer);}
  }
  // Exact business reference plus verified sender/recipient identity; external results remain display-only.
  const query='(from:aktiva.com.mk OR (in:sent to:spie.com)) subject:(TenneT) (subject:Angebot OR subject:offer OR subject:ponuda OR subject:ponude) has:attachment -in:trash -in:spam';
  const recentQuery='(from:spie.com OR to:spie.com OR from:aktiva.com.mk OR to:aktiva.com.mk) subject:TenneT (subject:BUNT OR subject:SPIE) -subject:"Automatische Antwort" -in:trash -in:spam';
  const discovery=await Promise.all([googleRead('messages?'+new URLSearchParams({q:query,maxResults:'6'})),googleRead('messages?'+new URLSearchParams({q:recentQuery,maxResults:'8'}))]).catch(error=>{bundle.google={rows:[],error:error.message};return [];});
  const found=new Map(discovery.flatMap(d=>list(d.messages)).map(m=>[m.id,m]));
  const missing=[...found.values()].filter(m=>/^[a-f0-9]+$/i.test(m.id||'')&&!bundle.emails.rows.some(r=>r.gmail_message_id===m.id)).slice(0,6);
  const external=await Promise.allSettled(missing.map(async item=>{
    const m=await googleRead('messages/'+encodeURIComponent(item.id)+'?format=full');
    if(m.id!==item.id)throw new Error('Gmail: identiteti nuk përputhet.');
    const headers=list(m.payload?.headers),header=name=>string(headers.find(h=>h.name.toLowerCase()===name.toLowerCase())?.value);
    const address=text=>string(text).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[];
    const from=(address(header('From'))[0]||'').toLowerCase(),to=address(header('To')).map(x=>x.toLowerCase());
    const subject=header('Subject'),incoming=/@(?:aktiva\.com\.mk|spie\.com)$/.test(from),outgoing=list(m.labelIds).includes('SENT')&&/@prissteel\.com$/.test(from)&&to.some(x=>/@(?:spie\.com|aktiva\.com\.mk)$/.test(x));
    if(list(m.labelIds).some(label=>['DRAFT','TRASH','SPAM'].includes(label)))return null;
    if(!/tennet.*bunt|spie.*tennet/i.test(subject)||(!incoming&&!outgoing))return null;
    let plain='';function body(part){if(part.mimeType==='text/plain'&&part.body?.data&&!plain){try{const bytes=Uint8Array.from(atob(part.body.data.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));plain=new TextDecoder().decode(bytes).slice(0,2200);}catch{}}for(const child of list(part.parts))body(child);}body(m.payload||{});
    const hasDocuments=part=>/\.(?:pdf|xlsx?|docx?|pptx?|zip|dwg|dxf|x83)$/i.test(part.filename||'')||list(part.parts).some(hasDocuments);
    const row={gmail_message_id:m.id,gmail_thread_id:m.threadId,from_email:from,from_name:header('From'),to_emails:to,cc_emails:address(header('Cc')),subject,snippet:plain||m.snippet,sent_at:new Date(Number(m.internalDate)).toISOString(),direction:incoming?'incoming':'outgoing',needs_review:false,has_attachments:hasDocuments(m.payload||{}),external_source:true};
    return {row,message:m};
  }));
  const prefetched=new Map();
  for(const result of external)if(result.status==='fulfilled'&&result.value){bundle.emails.rows.push(result.value.row);prefetched.set(result.value.row.gmail_message_id,result.value.message);}
  bundle.emails.rows=newest(bundle.emails.rows);
  const linked=new Set(bundle.attachments.rows.map(a=>a.gmail_message_id));
  const candidates=bundle.emails.rows.filter(m=>m.needs_review===false && m.has_attachments===true && /^[a-f0-9]+$/i.test(m.gmail_message_id||'') && !linked.has(m.gmail_message_id)
    && (prefetched.has(m.gmail_message_id)||/angebot|offer|ponud/i.test(m.subject)) && !/anfrage|rfq|automatic|automatische/i.test(m.subject)
    && (prefetched.has(m.gmail_message_id)||mailParty(m)==='supplier'||(mailParty(m)==='pristeel'&&recipients(m,'spie.com')))).slice(0,6);
  const settled=await Promise.allSettled(candidates.map(async m=>{
    {
      const message=prefetched.get(m.gmail_message_id)||await googleRead('messages/'+encodeURIComponent(m.gmail_message_id)+'?format=full');
      if(message.id!==m.gmail_message_id||message.threadId!==m.gmail_thread_id)throw new Error('Gmail: identiteti i mesazhit nuk përputhet.');
      const found=[];
      function walk(part){
        if(part.filename && /\.(?:pdf|xlsx?|docx?|pptx?|zip|dwg|dxf|x83)$/i.test(part.filename))found.push({id:'gmail:'+m.gmail_message_id+':'+found.length,project_id:PROJECT_ID,attachment_id:part.body?.attachmentId||'',attachment_name:part.filename,attachment_mime_type:part.mimeType||'',gmail_message_id:m.gmail_message_id,gmail_thread_id:m.gmail_thread_id,source:m.external_source?'Gmail · jashtë regjistrit PPPP':'Gmail · lexim i drejtpërdrejtë'});
        for(const child of list(part.parts))walk(child);
      }
      walk(message.payload||{});return found;
    }
  }));
  for(const result of settled)if(result.status==='fulfilled')bundle.attachments.rows.push(...result.value);
  // Missing metadata stays visible as a linked sent email even if Google is unavailable.
  const failures=[...settled,...external].filter(r=>r.status==='rejected');
  if(failures.length)bundle.google={rows:[],error:failures.map(r=>r.reason.message).join(' · ')};
}

export async function downloadAttachment({gmail_message_id,gmail_attachment_id,title,attachment_mime_type}) {
 const google=googleSession(),current=session();
 if(!google)throw new Error('Lidhe Gmail në PPPP për të hapur bashkëngjitjen.');
 if(!/^[a-f0-9]+$/i.test(gmail_message_id||'')||!gmail_attachment_id)throw new Error('Mungon identiteti i bashkëngjitjes.');
 const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(gmail_message_id)+'/attachments/'+encodeURIComponent(gmail_attachment_id),{method:'GET',headers:{Authorization:'Bearer '+google.token},signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new Error('Gmail '+r.status+': dokumenti nuk u hap.');
 if(session()?.access_token!==current.access_token)throw new Error('SESSION_CHANGED');
 const p=await r.json(),encoded=string(p.data).replace(/-/g,'+').replace(/_/g,'/');
 const bytes=Uint8Array.from(atob(encoded.padEnd(Math.ceil(encoded.length/4)*4,'=')),c=>c.charCodeAt(0));
 const url=URL.createObjectURL(new Blob([bytes],{type:attachment_mime_type||'application/octet-stream'}));
 const a=document.createElement('a');a.href=url;a.download=title||'Dokument';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}


