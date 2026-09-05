const fs = require('fs');
const assert = require('assert');

const ui = fs.readFileSync('pristeel-finance-receipts-v1.js','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');
const migration = fs.readFileSync('supabase/migrations/20260904052000_expense_receipt_inbox_v1.sql','utf8');
const cronMigration = fs.readFileSync('supabase/migrations/20260904053500_expense_drive_inbox_cron_v1.sql','utf8');
const localOcr = fs.readFileSync('supabase/functions/local-ocr-worker/index.ts','utf8');
const upload = fs.readFileSync('supabase/functions/pppp-expense-receipt-upload/index.ts','utf8');
const drive = fs.readFileSync('supabase/functions/pppp-expense-drive-ingest/index.ts','utf8');

assert.doesNotThrow(() => new Function(ui), 'Receipt inbox browser module must parse as JavaScript');

const stabilityMarker = "pristeel-finance-stability-v2.js?v=20260905-clickowner1";
const receiptMarker = "pristeel-finance-receipts-v1.js?v=20260905-1";
assert(bootstrap.includes(receiptMarker), 'Receipt inbox must be loaded by the ordered bootstrap');
assert(bootstrap.indexOf(receiptMarker) > bootstrap.indexOf(stabilityMarker), 'Receipt inbox must load after the Finance stability owner');

assert(ui.includes("accept=\"image/*\" capture=\"environment\""), 'Camera capture input must request the environment camera');
assert(ui.includes("accept=\"image/*,application/pdf\""), 'Receipt inbox must accept image and PDF upload');
assert(ui.includes("edgeFetch('pppp-expense-receipt-upload'"), 'Receipt upload must use the authenticated receipt Edge Function');
assert(ui.includes("rpc/pppp_confirm_expense_receipt_v1"), 'Receipt confirmation must use the dedicated confirmation RPC');
assert(ui.includes("rpc/pppp_ignore_expense_receipt_v1"), 'Receipt ignore flow must use the dedicated ignore RPC');
assert(ui.includes("confirm('Konfirmon që i ke kontrolluar të dhënat"), 'Expense creation must retain an explicit human confirmation gate');
assert(!/window\.showPage\s*=/.test(ui), 'Receipt inbox must not take ownership of primary page routing');
assert(!/window\.finSwitchTab\s*=/.test(ui), 'Receipt inbox must not take ownership of the Finance tab router');
assert(ui.includes('window.finShowHub=wrapped'), 'Receipt inbox may only decorate the Finance hub so its tile survives hub rerenders');

assert(migration.includes('create table if not exists public.pppp_expense_receipts_v1'), 'Receipt inbox table must be created');
assert(migration.includes("values('expense-receipts','expense-receipts',false"), 'Receipt storage bucket must remain private');
assert(migration.includes('create or replace function public.pppp_confirm_expense_receipt_v1'), 'Human-confirmed expense RPC must exist');
assert(migration.includes('grant execute on function public.pppp_confirm_expense_receipt_v1(uuid,jsonb) to authenticated,service_role'), 'Authenticated operator must be allowed to confirm reviewed receipts');
assert(migration.includes('expense_receipt_id uuid references public.pppp_expense_receipts_v1'), 'Local OCR queue must support receipt jobs');
assert(migration.includes("status='review'"), 'OCR completion must stop at review rather than auto-create an expense');

assert(localOcr.includes('expense_receipt_id'), 'Local OCR worker must understand receipt jobs');
assert(localOcr.includes("service:'local-ocr-worker-v4'"), 'Local OCR worker receipt-capable version must be exposed');
assert(upload.includes("human_confirmation_required:true"), 'Upload Edge Function must advertise the human confirmation gate');
assert(upload.includes("no_paid_api:true"), 'Upload Edge Function must remain local-first/no-paid-OCR');
assert(drive.includes("gmail_tracker_cron_authorized"), 'Drive ingestion must retain cron-secret authentication');
assert(drive.includes("human_confirmation_required:true"), 'Drive ingestion must also stop at human confirmation');
assert(cronMigration.includes("pppp-expense-drive-inbox-10m"), 'Drive receipt inbox cron must be installed');

console.log('Finance receipt inbox smoke passed: isolated Finance UI, local OCR, private storage and human confirmation gate verified.');
