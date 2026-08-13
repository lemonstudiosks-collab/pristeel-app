import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL = 'https://isymxqfqzkchbsrbhucf.supabase.co';
const RECEIVABLE_SOURCE = 'invoice_receivable';
const PAYABLE_SOURCE = 'invoice_payable';
const DUE_DATE_SOURCE = 'invoice_due_date_missing';

const text = value => String(value == null ? '' : value).trim();
const bool = value => value === true || String(value).toLowerCase() === 'true';

export function dateOnly(value) {
  const v = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
}

export function daysFromToday(dueDate, today = new Date().toISOString().slice(0, 10)) {
  const due = dateOnly(dueDate);
  const now = dateOnly(today);
  if (!due || !now) return null;
  const a = Date.parse(`${now}T00:00:00Z`);
  const b = Date.parse(`${due}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function priorityForDays(days) {
  if (days == null) return 'mesatare';
  if (days < 0) return 'urgjent';
  if (days <= 3) return 'e larte';
  return 'mesatare';
}

function amountText(invoice, kind) {
  const raw = kind === 'out'
    ? (invoice.gross_amount ?? invoice.total_price)
    : invoice.amount;
  const n = Number(raw);
  const currency = text(invoice.currency) || 'EUR';
  return Number.isFinite(n) && n > 0
    ? `${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
    : currency;
}

function timingText(days) {
  if (days < 0) return `${Math.abs(days)} ditë vonë`;
  if (days === 0) return 'afati sot';
  if (days === 1) return 'afati nesër';
  return `afati pas ${days} ditësh`;
}

function invoiceNr(invoice, kind) {
  return text(kind === 'out' ? invoice?.invoice_nr : invoice?.supplier_invoice_nr) || 'pa numër';
}
function partyText(invoice, kind) {
  return text(kind === 'out' ? invoice?.client : invoice?.supplier) || (kind === 'out' ? 'Klient' : 'Furnitor');
}
function projectText(invoice) {
  return text(invoice?.project) || 'Pa projekt';
}
function paymentSource(kind) {
  return kind === 'out' ? RECEIVABLE_SOURCE : PAYABLE_SOURCE;
}
function dueDateSourceRef(invoice, kind) {
  return `${kind}:${invoice?.id || ''}`;
}

export function taskFromInvoice(invoice, kind, today) {
  const due = dateOnly(invoice?.due_date);
  if (!invoice?.id || !due) return null;
  const days = daysFromToday(due, today);
  const outgoing = kind === 'out';
  const nr = invoiceNr(invoice, kind);
  const party = partyText(invoice, kind);
  const project = projectText(invoice);
  return {
    project_id: invoice.project_id || null,
    title: `[AUTO] ${outgoing ? 'Pagesë klienti' : 'Pagesë furnitori'} — ${nr}`,
    detail: `${party} · ${project} · ${amountText(invoice, kind)} · ${timingText(days)}`,
    due_date: due,
    priority: priorityForDays(days),
    status: 'hapur',
    done_at: null,
    source: paymentSource(kind),
    source_ref: String(invoice.id),
    contact_email: null,
    category: outgoing ? 'klient' : 'furnitor'
  };
}

export function missingDueDateTask(invoice, kind, today) {
  if (!invoice?.id || !dateOnly(today)) return null;
  const outgoing = kind === 'out';
  const nr = invoiceNr(invoice, kind);
  return {
    project_id: invoice.project_id || null,
    title: `[AUTO] Plotëso afatin e pagesës — ${nr}`,
    detail: `${partyText(invoice, kind)} · ${projectText(invoice)} · ${amountText(invoice, kind)} · Fatura është e papaguar dhe nuk ka afat pagese të regjistruar. Verifiko dokumentin/kushtet dhe plotëso due_date; mos e hamendëso.`,
    due_date: dateOnly(today),
    priority: 'e larte',
    status: 'hapur',
    done_at: null,
    source: DUE_DATE_SOURCE,
    source_ref: dueDateSourceRef(invoice, kind),
    contact_email: null,
    category: outgoing ? 'klient' : 'furnitor'
  };
}

export function planInvoiceTasks({ outgoing = [], incoming = [], existingTasks = [], today, lookaheadDays = 7 }) {
  const existing = new Map();
  for (const task of existingTasks || []) {
    const source = text(task?.source);
    const ref = text(task?.source_ref);
    if (source && ref) existing.set(`${source}::${ref}`, task);
  }

  const planned = [];
  const complete = [];
  const skipped = [];

  for (const [kind, rows] of [['out', outgoing], ['in', incoming]]) {
    for (const invoice of rows || []) {
      if (!invoice?.id) {
        skipped.push({ kind, id: null, reason: 'missing_invoice_id' });
        continue;
      }
      const paySource = paymentSource(kind);
      const paymentKey = `${paySource}::${invoice.id}`;
      const dueKey = `${DUE_DATE_SOURCE}::${dueDateSourceRef(invoice, kind)}`;
      const paymentCurrent = existing.get(paymentKey) || null;
      const dueCurrent = existing.get(dueKey) || null;
      const due = dateOnly(invoice.due_date);
      const paid = bool(invoice.paid);

      if (paid) {
        if (paymentCurrent && String(paymentCurrent.status || '').toLowerCase() !== 'kryer') {
          complete.push({ task: paymentCurrent, invoice, kind, reason: 'invoice_paid' });
        }
        if (dueCurrent && String(dueCurrent.status || '').toLowerCase() !== 'kryer') {
          complete.push({ task: dueCurrent, invoice, kind, reason: 'invoice_paid' });
        }
        continue;
      }

      if (!due) {
        const task = missingDueDateTask(invoice, kind, today);
        if (task) planned.push({ action: dueCurrent ? 'update' : 'create', task, invoice, kind, reason: 'missing_due_date' });
        else skipped.push({ kind, id: invoice.id, reason: 'invalid_today_for_due_review' });
        continue;
      }

      if (dueCurrent && String(dueCurrent.status || '').toLowerCase() !== 'kryer') {
        complete.push({ task: dueCurrent, invoice, kind, reason: 'due_date_filled' });
      }

      const days = daysFromToday(due, today);
      if (days == null) {
        skipped.push({ kind, id: invoice.id, reason: 'invalid_due_date' });
        continue;
      }

      if (days > lookaheadDays && !paymentCurrent) {
        skipped.push({ kind, id: invoice.id, reason: 'outside_window', days });
        continue;
      }

      const task = taskFromInvoice(invoice, kind, today);
      planned.push({ action: paymentCurrent ? 'update' : 'create', task, invoice, kind, reason: days < 0 ? 'overdue' : 'payment_due' });
    }
  }

  return { planned, complete, skipped };
}

async function rest({ supabaseUrl, apiKey, bearerToken = apiKey, path, method = 'GET', body, prefer }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0, 700)}`);
  return raw ? JSON.parse(raw) : [];
}

async function readState(access) {
  const {supabaseUrl,apiKey,bearerToken}=access;
  const [outgoing, incoming, tasks] = await Promise.all([
    rest({
      supabaseUrl, apiKey, bearerToken,
      path: 'invoices_out?select=id,invoice_nr,project_id,project,client,due_date,paid,paid_date,gross_amount,total_price,currency,payment_terms&order=date.asc&limit=5000'
    }),
    rest({
      supabaseUrl, apiKey, bearerToken,
      path: 'invoices_in?select=id,supplier_invoice_nr,project_id,project,supplier,due_date,paid,paid_date,amount,currency,payment_terms&order=date.asc&limit=5000'
    }),
    rest({
      supabaseUrl, apiKey, bearerToken,
      path: `tasks?select=id,project_id,title,detail,due_date,priority,status,done_at,source,source_ref,category&source=in.(${RECEIVABLE_SOURCE},${PAYABLE_SOURCE},${DUE_DATE_SOURCE})&limit=5000`
    })
  ]);
  return { outgoing, incoming, tasks };
}

async function upsertOpenTasks({ supabaseUrl, apiKey, bearerToken, rows }) {
  if (!rows.length) return;
  await rest({
    supabaseUrl,
    apiKey,
    bearerToken,
    path: 'tasks?on_conflict=source,source_ref',
    method: 'POST',
    body: rows,
    prefer: 'resolution=merge-duplicates,return=minimal'
  });
}

async function completeTask({ supabaseUrl, apiKey, bearerToken, task, doneAt }) {
  await rest({
    supabaseUrl,
    apiKey,
    bearerToken,
    path: `tasks?id=eq.${encodeURIComponent(task.id)}`,
    method: 'PATCH',
    body: { status: 'kryer', done_at: task.done_at || doneAt },
    prefer: 'return=minimal'
  });
}

async function writeSummary(summary) {
  await mkdir('tmp', { recursive: true });
  await writeFile('tmp/invoice-payment-task-sync.json', JSON.stringify(summary, null, 2));
}

export async function runInvoicePaymentTaskSync({
  supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
  apiKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '',
  bearerToken = '',
  mode = process.env.SYNC_MODE || 'preview',
  today = process.env.SYNC_TODAY || new Date().toISOString().slice(0, 10),
  lookaheadDays = Number(process.env.PAYMENT_TASK_LOOKAHEAD_DAYS || 7)
} = {}) {
  if (!['preview', 'apply'].includes(mode)) throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  if (!Number.isFinite(lookaheadDays) || lookaheadDays < 0 || lookaheadDays > 60) throw new Error('PAYMENT_TASK_LOOKAHEAD_DAYS must be between 0 and 60.');

  const access=apiKey
    ? {supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}
    : await resolveSupabaseWorkflowAccess({supabaseUrl});
  const state = await readState(access);
  const plan = planInvoiceTasks({
    outgoing: state.outgoing,
    incoming: state.incoming,
    existingTasks: state.tasks,
    today,
    lookaheadDays
  });

  const doneAt = new Date().toISOString();
  if (mode === 'apply') {
    await upsertOpenTasks({ ...access, rows: plan.planned.map(x => x.task) });
    for (const item of plan.complete) await completeTask({ ...access, task: item.task, doneAt });
  }

  const summary = {
    mode,
    auth_mode:access.authMode,
    today,
    lookahead_days: lookaheadDays,
    invoices_out: state.outgoing.length,
    invoices_in: state.incoming.length,
    existing_payment_tasks: state.tasks.length,
    create: plan.planned.filter(x => x.action === 'create').length,
    update: plan.planned.filter(x => x.action === 'update').length,
    complete: plan.complete.length,
    missing_due_date: plan.planned.filter(x => x.reason === 'missing_due_date').length,
    skipped: plan.skipped.length,
    actions: [
      ...plan.planned.map(x => ({
        action: x.action,
        reason: x.reason,
        kind: x.kind,
        invoice: invoiceNr(x.invoice, x.kind),
        due_date: x.task.due_date,
        priority: x.task.priority,
        source: x.task.source
      })),
      ...plan.complete.map(x => ({
        action: 'complete',
        reason: x.reason,
        kind: x.kind,
        invoice: invoiceNr(x.invoice, x.kind),
        source: x.task.source
      }))
    ]
  };

  await writeSummary(summary);
  console.log(`Invoice payment task sync ${mode} (${summary.auth_mode}): ${summary.create} create, ${summary.update} update, ${summary.complete} complete, ${summary.missing_due_date} missing due-date review, ${summary.skipped} skipped.`);
  return summary;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runInvoicePaymentTaskSync().catch(async error => {
    const summary = { error: String(error?.message || error), mode: process.env.SYNC_MODE || 'preview' };
    try { await writeSummary(summary); } catch {}
    console.error(summary.error);
    process.exit(1);
  });
}
