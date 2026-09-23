import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('pristeel-dach-steel-sales-v1.js','utf8');
const edge = fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts','utf8');
const targetBridge = fs.readFileSync('supabase/live-migration-history/20260922110424_chatgpt_dach_steel_target_bridge_v21.sql','utf8');
const outreachBridge = fs.readFileSync('supabase/live-migration-history/20260922112601_add_dach_steel_outreach_draft_bridge_v22.sql','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');

assert.match(ui,/Projekt → Material → Ofertë proaktive/,'Home card must use Albanian product naming');
assert.doesNotMatch(ui,/Project → Material → Proactive Offer/,'old English Home title must be retired');
assert.match(ui,/Blerësit e çelikut DACH/,'DACH page title must be Albanian');
assert.match(ui,/M3 · GATI PËR OFERTË/,'M3 presentation must be Albanian without changing M3 key semantics');
assert.match(bootstrap,/pristeel-dach-steel-sales-v1\.js\?v=20260923-sqguard8/,'runtime must cache-bust the Albanian/guarded DACH module');

assert.match(edge,/pppp-dach-steel-draft-generator-v9-supplier-rfq-dedupe/,'repo must carry the current guarded DACH Edge source');
assert.match(edge,/\["buyer","supplier","suppliers","contact","refresh"\]/,'live-supported interactive modes must stay present');
assert.match(edge,/mode!=="refresh"&&mode!=="sync"/,'internal cron credential must remain restricted to refresh/sync');
assert.match(edge,/pppp_global_communication_guard_v1/,'buyer outreach must use the shared global communication guard');
assert.match(edge,/pppp_dach_steel_contact_resolution_v1/,'buyer contact resolution must remain canonical');
assert.match(edge,/async function existingSupplierRfq/,'supplier RFQ dedupe guard must exist');
assert.match(edge,/\.from\("rfq_log"\)/,'supplier RFQ dedupe must respect canonical project RFQ history when a project link exists');
assert.match(edge,/\{in:sent in:drafts\} to:/,'supplier RFQ dedupe must inspect real Gmail sent/draft history');
assert.match(edge,/supplier_rfq_already_sent_for_target/,'a duplicate supplier RFQ send must be blocked');
assert.match(edge,/supplier_rfq_already_registered_for_project/,'a canonical project RFQ must block a parallel DACH RFQ');
assert.match(edge,/existing\?\.kind==="draft"/,'an existing Gmail draft must be reused instead of duplicated');

const supplierStart=edge.indexOf('async function supplierDraft');
const dedupe=edge.indexOf('existing=await existingSupplierRfq',supplierStart);
const create=edge.indexOf('const ct=supplierText',supplierStart);
assert.ok(supplierStart>=0&&dedupe>supplierStart&&create>dedupe,'supplier dedupe must run before Gmail draft creation');

assert.match(edge,/human_send_required:true,external_email_sent:false/,'DACH Edge responses must preserve the human-send gate');
assert.doesNotMatch(edge,/\/drafts\/send|\/messages\/send/,'DACH Edge must not contain a Gmail send endpoint');

assert.match(targetBridge,/dach_steel_target_never_creates_project/,'target registration must remain pre-project');
assert.match(targetBridge,/dach_steel_target_never_creates_partner_or_contact/,'target registration must not create CRM entities');
assert.match(targetBridge,/dach_steel_target_never_creates_outbound_or_sends_email/,'target registration must not create outbound or send');
assert.match(outreachBridge,/dach_steel_outreach_draft_uses_shared_outbound/,'buyer drafts must use the shared outbound queue');
assert.match(outreachBridge,/dach_steel_outreach_draft_requires_human_send_approval/,'buyer drafts must remain human gated');

console.log('DACH material automation contract smoke: PASS');
