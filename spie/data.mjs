/* Same-origin PPPP session; read-only adapter. No SDK, auth mutation, storage or polling. */
export const PROJECT_ID = 'c937aea1-af5e-4807-ae1e-e36864e46794';
export const PROJECT_REF = 'awqfpnzqwfjrjefoktgd';
const API = 'https://' + PROJECT_REF + '.supabase.co/rest/v1/';
const PUBLIC_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3cWZwbnpxd2ZqcmplZm9rdGdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0NzY0MzQsImV4cCI6MjEwNTA1MjQzNH0.T3FFElqBw4mb6mvh_WkfS35CNAsacPimiGG2H9J2G7E';
const cache = new Map();
let cacheSession = '';
export const LIMITS = Object.freeze({ files: 50, emails: 40, contacts: 40, invoices: 50, guarantees: 20, documents: 30 });

export function session() {
  let value;
  try { value = JSON.parse(localStorage.getItem('pristeel_session') || 'null'); } catch { return null; }
  if (!value?.access_token || !value.expires_at || Number(value.expires_at) <= Date.now()) return null;
  try {
    const part = value.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
    const ref = claims.ref || String(claims.iss || '').match(/^https:\/\/([a-z0-9]+)\.supabase\.co(?:\/|$)/)?.[1];
    if (ref !== PROJECT_REF || claims.role !== 'authenticated' || !claims.exp || claims.exp * 1000 <= Date.now()) return null;
  } catch { return null; }
  return value;
}

export function invalidate() { cache.clear(); }

export async function read(path) {
  const current = session();
  if (!current) { cache.clear(); cacheSession = ''; throw new Error('SESSION_REQUIRED: Open PPPP to sign in or renew your session, then return to SPIE.'); }
  if (cacheSession !== current.access_token) { cache.clear(); cacheSession = current.access_token; }
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
    if (session()?.access_token !== current.access_token) throw new Error('SESSION_CHANGED: Return to PPPP and reopen SPIE.');
    return response.json();
  }).catch(error => {
    if (error.name === 'AbortError') throw new Error('PPPP read timeout (12s). Data could not be verified.');
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
  if (data?.project?.id !== PROJECT_ID || data.read_only_snapshot !== true) throw new Error('Canonical project snapshot identity could not be verified.');
  return data;
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
export const emails = () => projectRows('project_emails', 'id,project_id,gmail_message_id,gmail_thread_id,from_email,from_name,to_emails,cc_emails,subject,sent_at,direction,gmail_url,needs_review,review_reason', LIMITS.emails, 'sent_at.desc.nullslast,id.desc');
export const contacts = () => projectRows('project_contacts', 'id,project_id,email,name,company,role,source,last_seen,status,is_primary', LIMITS.contacts, 'last_seen.desc.nullslast');
export async function finance() {
  const jobs = [
    ['sales', () => projectRows('invoices_out', 'id,project_id,invoice_nr,date,client,currency,gross_amount,net_amount,paid,paid_date,due_date,contract_value', LIMITS.invoices, 'date.desc.nullslast')],
    ['suppliers', () => projectRows('invoices_in', 'id,project_id,supplier,supplier_invoice_nr,date,amount,net_amount,currency,paid,paid_date,due_date', LIMITS.invoices, 'date.desc.nullslast')],
    ['guarantees', () => projectRows('bank_guarantees', 'id,project_id,bank_name,guarantee_type,amount_guaranteed,expiry_date,status', LIMITS.guarantees)],
    ['documents', () => projectRows('documents_registry', 'id,project_id,series,doc_nr,currency,total_amount,total_eur,payment_plan,offer_state,created_at', LIMITS.documents)],
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
