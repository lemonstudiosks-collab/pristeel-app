import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SA_JSON = Deno.env.get('GOOGLE_SA_JSON') || '';
const DRIVE_USER = Deno.env.get('GMAIL_USER') || '';
const COMMAND_SHEET_ID = '1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8';
const db = createClient(SUPABASE_URL, SERVICE_KEY);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Content-Type': 'application/json',
};

const ALLOWED_ACTIONS = new Set(['context_fact', 'task', 'create_project', 'supplier_offer']);
const ALLOWED_EVIDENCE = new Set(['unverified', 'observed', 'verbal', 'documented', 'confirmed']);
const ALLOWED_FACT_STATUS = new Set(['observed', 'suggested']);
const ALLOWED_BUSINESS_TYPES = new Set(['trading', 'fabrication', 'hybrid']);
const SUPPLIER_OFFER_FIELDS = new Set([
  'supplier', 'currency', 'price_kg', 'qty_kg', 'mechanical_eur', 'packaging_eur', 'transport_eur',
  'extra_positions', 'delivery_weeks', 'validity_days', 'exchange_rate_to_eur', 'incoterms', 'cert',
  'notes', 'payment_terms', 'inclusions', 'exclusions', 'offer_ref', 'contact_person', 'source',
]);

function text(v: unknown, max = 4000) {
  return String(v == null ? '' : v).trim().slice(0, max);
}
function validUuid(v: unknown) {
  const value = text(v, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}
function b64url(input: Uint8Array | string) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function pem(p: string) {
  const x = p.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
  const bin = atob(x);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b.buffer;
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

let cached: { token: string; exp: number } | null = null;
async function driveToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 90) return cached.token;
  if (!SA_JSON || !DRIVE_USER) throw new Error('Google service account or delegated Drive user is not configured.');
  const sa = JSON.parse(SA_JSON);
  const head = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    sub: DRIVE_USER,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey('pkcs8', pem(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  const assertion = `${unsigned}.${b64url(sig)}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Google token ${r.status}: ${text(j?.error_description || j?.error, 300)}`);
  cached = { token: j.access_token, exp: now + Number(j.expires_in || 3600) };
  return cached.token;
}

async function exportCommandsCsv() {
  const token = await driveToken();
  const url = `https://www.googleapis.com/drive/v3/files/${COMMAND_SHEET_ID}/export?mimeType=${encodeURIComponent('text/csv')}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const raw = await r.text();
  if (!r.ok) throw new Error(`Google Drive export ${r.status}: ${text(raw, 500)}`);
  return raw;
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; }
        else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function rowsAsObjects(rows: string[][]) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => text(h, 100));
  return rows.slice(1).map((r, idx) => {
    const obj: Record<string, string> = { _row: String(idx + 2) };
    headers.forEach((h, i) => { if (h) obj[h] = r[i] == null ? '' : String(r[i]); });
    return obj;
  });
}

async function authorized(req: Request) {
  const provided = req.headers.get('x-pppp-cron-secret') || '';
  if (!provided) return false;
  const { data, error } = await db.rpc('gmail_tracker_cron_authorized', { provided });
  return !error && data === true;
}

async function receipt(commandId: string) {
  const { data, error } = await db.from('pppp_chatgpt_command_receipts')
    .select('command_id,project_id,status,attempts')
    .eq('command_id', commandId)
    .maybeSingle();
  if (error) throw error;
  return data as { command_id: string; project_id: string | null; status: string; attempts: number } | null;
}

async function markReceipt(
  command: Record<string, string>,
  status: string,
  result: Record<string, unknown>,
  attempts: number,
  projectIdOverride: string | null = null,
) {
  const commandId = text(command.command_id, 160);
  let projectId = validUuid(projectIdOverride) || validUuid(command.project_id);
  if (!projectId && commandId) {
    const existing = await receipt(commandId);
    projectId = validUuid(existing?.project_id);
  }
  const payload = {
    command_id: commandId,
    project_id: projectId,
    action_type: text(command.action_type, 80).toLowerCase(),
    approval: text(command.approval, 40),
    requested_by: text(command.requested_by, 240) || null,
    source_ref: text(command.source_ref, 500) || null,
    sheet_row: Number(command._row || 0) || null,
    status,
    attempts,
    result,
    requested_at: text(command.created_at, 80) || null,
    processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await db.from('pppp_chatgpt_command_receipts').upsert(payload, { onConflict: 'command_id' });
  if (error) throw error;
}

async function processContextFact(command: Record<string, string>) {
  const projectId = text(command.project_id, 80);
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new Error('valid project_id is required');
  const factKey = text(command.fact_key, 240);
  if (!factKey) throw new Error('fact_key is required');
  let value: unknown = null;
  const rawValue = text(command.value_json, 12000);
  if (rawValue) {
    try { value = JSON.parse(rawValue); }
    catch { throw new Error('value_json must be valid JSON'); }
  }
  const evidence = ALLOWED_EVIDENCE.has(text(command.evidence_status, 40)) ? text(command.evidence_status, 40) : 'unverified';
  const factStatus = ALLOWED_FACT_STATUS.has(text(command.fact_status, 40)) ? text(command.fact_status, 40) : 'observed';
  const commandId = text(command.command_id, 160);
  const idem = await sha256(`${projectId}|${commandId}|${factKey}|${JSON.stringify(value)}`);
  const { data, error } = await db.rpc('pppp_ingest_context_fact_v1', {
    p_project_id: projectId,
    p_fact_key: factKey,
    p_value: value,
    p_category: text(command.category, 120) || 'general',
    p_subject: text(command.subject, 300) || null,
    p_source_type: 'chatgpt',
    p_source_ref: text(command.source_ref, 500) || `chatgpt-command:${commandId}`,
    p_evidence_status: evidence,
    p_confidence: null,
    p_fact_status: factStatus,
    p_idempotency_key: `chatgpt-command:${idem}`,
    p_created_by: 'chatgpt_pppp_bridge',
  });
  if (error) throw error;
  return { fact_id: data, fact_key: factKey, fact_status: factStatus, evidence_status: evidence };
}

async function processTask(command: Record<string, string>) {
  const projectId = text(command.project_id, 80);
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) throw new Error('valid project_id is required');
  let value: any = {};
  try { value = JSON.parse(text(command.value_json, 12000) || '{}'); }
  catch { throw new Error('task value_json must be valid JSON'); }
  const title = text(value?.title, 400);
  const dueDate = text(value?.due_date, 20);
  if (!title) throw new Error('task title is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('task due_date YYYY-MM-DD is required');
  const commandId = text(command.command_id, 160);
  const sourceRef = `CHATGPT:${commandId}`;
  const payload = {
    project_id: projectId,
    title,
    detail: text(value?.detail, 4000) || null,
    due_date: dueDate,
    priority: text(value?.priority, 60) || 'normal',
    status: 'hapur',
    source: 'chatgpt_bridge',
    category: text(value?.category, 80) || text(command.category, 80) || 'intern',
    source_ref: sourceRef,
  };
  const { data, error } = await db.from('tasks').upsert(payload, { onConflict: 'source,source_ref' }).select('id').single();
  if (error) throw error;
  return { task_id: data?.id || null, source_ref: sourceRef, title, due_date: dueDate };
}

async function processCreateProject(command: Record<string, string>) {
  let value: any = {};
  try { value = JSON.parse(text(command.value_json, 12000) || '{}'); }
  catch { throw new Error('create_project value_json must be valid JSON'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('create_project value_json must be a JSON object');

  const commandId = text(command.command_id, 160);
  const name = text(command.project_name, 500) || text(value?.name, 500);
  if (!name) throw new Error('project_name is required');

  const deadline = text(value?.deadline, 20);
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) throw new Error('deadline must be YYYY-MM-DD');
  const businessType = text(value?.business_type, 40);
  if (businessType && !ALLOWED_BUSINESS_TYPES.has(businessType)) throw new Error('business_type must be trading, fabrication, or hybrid');

  const metadata = {
    transport: 'command_sheet',
    sheet_row: Number(command._row || 0) || null,
    requested_by: text(command.requested_by, 240) || null,
    source_ref: text(command.source_ref, 500) || `chatgpt-command:${commandId}`,
  };
  const { data, error } = await db.rpc('pppp_chatgpt_create_project_v1', {
    p_command_id: commandId,
    p_name: name,
    p_client: text(value?.client, 500) || null,
    p_reference: text(value?.reference, 500) || null,
    p_location: text(value?.location, 500) || null,
    p_deadline: deadline || null,
    p_notes: text(value?.notes, 4000) || null,
    p_deal_type: text(value?.deal_type, 80) || null,
    p_business_type: businessType || null,
    p_source: 'chatgpt',
    p_metadata: metadata,
  });
  if (error) throw error;
  if (!data || data.ok !== true || !validUuid(data.project_id)) throw new Error('create_project did not return a valid project_id');
  return data as Record<string, unknown>;
}

async function processSupplierOffer(command: Record<string, string>) {
  const projectId = validUuid(command.project_id);
  if (!projectId) throw new Error('valid project_id is required');

  let value: any = {};
  try { value = JSON.parse(text(command.value_json, 12000) || '{}'); }
  catch { throw new Error('supplier_offer value_json must be valid JSON'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('supplier_offer value_json must be a JSON object');

  for (const key of Object.keys(value)) {
    if (!SUPPLIER_OFFER_FIELDS.has(key)) throw new Error(`supplier_offer field not allowed: ${text(key, 120)}`);
  }
  if (!text(value?.supplier, 500)) throw new Error('supplier is required');
  if (value?.extra_positions != null && !Array.isArray(value.extra_positions)) throw new Error('extra_positions must be an array');

  const commandId = text(command.command_id, 160);
  const payload: Record<string, unknown> = {};
  for (const key of SUPPLIER_OFFER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) payload[key] = value[key];
  }
  const metadata = {
    transport: 'command_sheet',
    sheet_row: Number(command._row || 0) || null,
    requested_by: text(command.requested_by, 240) || null,
    source_ref: text(command.source_ref, 500) || `chatgpt-command:${commandId}`,
  };
  const { data, error } = await db.rpc('pppp_chatgpt_create_supplier_offer_v1', {
    p_command_id: commandId,
    p_project_id: projectId,
    p_payload: payload,
    p_source: 'chatgpt',
    p_metadata: metadata,
  });
  if (error) throw error;
  if (!data || data.ok !== true || !validUuid(data.offer_id) || !validUuid(data.project_id)) {
    throw new Error('supplier_offer did not return valid offer_id and project_id');
  }
  if (data.selected !== false || data.human_supplier_selection_required !== true) {
    throw new Error('supplier_offer response did not preserve supplier-selection gate');
  }
  return data as Record<string, unknown>;
}

async function reconcile(limit = 50) {
  const max = Math.max(1, Math.min(200, Number(limit) || 50));
  const csv = await exportCommandsCsv();
  const commands = rowsAsObjects(parseCsv(csv));
  const summary: any = { checked: 0, processed: 0, succeeded: 0, rejected: 0, failed: 0, skipped: 0, items: [] };
  for (const command of commands) {
    if (summary.checked >= max) break;
    const commandId = text(command.command_id, 160);
    if (!commandId) continue;
    const approval = text(command.approval, 40).toLowerCase();
    if (approval !== 'approved') continue;
    const existing = await receipt(commandId);
    if (existing && ['succeeded', 'rejected'].includes(existing.status)) { summary.skipped++; continue; }
    const attempts = Math.max(1, Number(existing?.attempts || 0) + 1);
    if (attempts > 3) { summary.skipped++; continue; }
    summary.checked++;
    const actionType = text(command.action_type, 80).toLowerCase();
    if (!ALLOWED_ACTIONS.has(actionType)) {
      const result = { reason: 'action_type_not_allowed', allowed: Array.from(ALLOWED_ACTIONS) };
      await markReceipt(command, 'rejected', result, attempts);
      summary.rejected++; summary.processed++; summary.items.push({ command_id: commandId, status: 'rejected', ...result });
      continue;
    }
    let resultProjectId: string | null = validUuid(existing?.project_id);
    try {
      await markReceipt(command, 'processing', { action_type: actionType }, attempts, resultProjectId);
      let result: Record<string, unknown>;
      if (actionType === 'context_fact') result = await processContextFact(command);
      else if (actionType === 'task') result = await processTask(command);
      else if (actionType === 'supplier_offer') result = await processSupplierOffer(command);
      else result = await processCreateProject(command);
      resultProjectId = validUuid(result?.project_id) || resultProjectId;
      await markReceipt(command, 'succeeded', result, attempts, resultProjectId);
      summary.succeeded++; summary.processed++; summary.items.push({ command_id: commandId, status: 'succeeded', action_type: actionType, result });
    } catch (e) {
      const result = { error: text((e as any)?.message || e, 1000), action_type: actionType };
      await markReceipt(command, 'failed', result, attempts, resultProjectId);
      summary.failed++; summary.processed++; summary.items.push({ command_id: commandId, status: 'failed', ...result });
    }
  }
  return summary;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!(await authorized(req))) return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: cors });
  try {
    const u = new URL(req.url);
    let body: any = {};
    if (req.method === 'POST') try { body = await req.json(); } catch {}
    const limit = Number(u.searchParams.get('limit') || body.limit || 50);
    const result = await reconcile(limit);
    return new Response(JSON.stringify({ ok: true, bridge: 'chatgpt-command-v4', sheet_id: COMMAND_SHEET_ID, ...result }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: text((e as any)?.message || e, 1200) }), { status: 500, headers: cors });
  }
});