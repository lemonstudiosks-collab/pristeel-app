const fs = require('fs');
const assert = require('assert');

const ui = fs.readFileSync('pristeel-finance-receipts-v1.js','utf8');
const stability = fs.readFileSync('pristeel-finance-stability-v2.js','utf8');
const canonical = fs.readFileSync('pristeel-finance-canonical-v1.js','utf8');
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

assert(ui.includes("accept=\"image/*\" capture=\"environment\""), 'Camera file input fallback must still request the environment camera on supporting devices');
assert(ui.includes("accept=\"image/*,application/pdf\""), 'Receipt inbox must accept image and PDF upload');
assert(ui.includes('onclick="finReceiptCameraOpen()"'), 'Bëj foto must open the real browser camera flow instead of the file picker');
assert(ui.includes("navigator.mediaDevices.getUserMedia"), 'Desktop camera flow must request a real browser MediaStream');
assert(ui.includes("facingMode:{ideal:'environment'}"), 'Camera flow should prefer the rear/environment camera when available');
assert(ui.includes("canvas.toBlob"), 'Camera flow must capture the live video frame as an image');
assert(ui.includes("uploadReceiptFile(file,'camera',null)"), 'Captured camera image must reuse the canonical receipt upload path');
assert(ui.includes("if(fallback)fallback.click()"), 'Devices without MediaDevices support must retain the native camera/file fallback');
assert(ui.includes("edgeFetch('pppp-expense-receipt-upload'"), 'Receipt upload must use the authenticated receipt Edge Function');
assert(ui.includes("rpc/pppp_confirm_expense_receipt_v1"), 'Receipt confirmation must use the dedicated confirmation RPC');
assert(ui.includes("rpc/pppp_ignore_expense_receipt_v1"), 'Receipt ignore flow must use the dedicated ignore RPC');
assert(ui.includes("confirm('Konfirmon që i ke kontrolluar të dhënat"), 'Expense creation must retain an explicit human confirmation gate');
assert(!/window\.showPage\s*=/.test(ui), 'Receipt inbox must not take ownership of primary page routing');
assert(!/window\.finSwitchTab\s*=/.test(ui), 'Receipt inbox must not take ownership of the Finance tab router');
assert(ui.includes('window.finShowHub=wrapped'), 'Receipt inbox may only decorate the Finance hub so its tile survives hub rerenders');

// Regression: Finance recovery considers its mounted hub the healthy surface. The
// receipt inbox must therefore keep that canonical surface alive instead of hiding
// it and triggering a late recovery that makes the click look like a no-op.
assert(stability.includes("computedVisible(hub)&&grid&&grid.children&&grid.children.length>0"), 'Finance stability still uses the canonical hub as its ready signal');
assert(canonical.includes("computedVisible(hub)&&grid&&grid.children&&grid.children.length"), 'Canonical Finance guard still accepts the mounted hub as healthy');
assert(ui.includes("function setReceiptSurface(open)"), 'Receipt inbox must own an explicit subview surface transition');
assert(ui.includes("page.setAttribute('data-pst-finance-subview','receipts')"), 'Receipt view must mark its Finance subview state');
assert(ui.includes("if(hub) hub.style.display=''"), 'Opening receipts must keep the canonical Finance hub mounted');
assert(!ui.includes("if(hub)hub.style.display='none'"), 'Receipt opening must not hide the Finance hub and trigger recovery');
assert(ui.includes("var d=document.createElement('button')"), 'Receipt tile must be a real button control');
assert(ui.includes("d.addEventListener('click'"), 'Receipt tile must have an explicit click handler');
assert(ui.includes("e.stopPropagation()"), 'Receipt click must not leak into competing Finance click owners');
assert(ui.includes("setReceiptSurface(true)"), 'Receipt click must switch to the receipt surface');
assert(ui.includes("setReceiptSurface(false)"), 'Back navigation must restore the normal Finance surface');

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

console.log('Finance receipt inbox smoke passed: surface stays open, Bëj foto uses a real browser camera with fallback, upload/OCR stays isolated, and human confirmation is preserved.');
