import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('pristeel-dach-steel-sales-v1.js','utf8');
const edge = fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts','utf8');
const targetBridge = fs.readFileSync('supabase/live-migration-history/20260922110424_chatgpt_dach_steel_target_bridge_v21.sql','utf8');
const outreachBridge = fs.readFileSync('supabase/live-migration-history/20260922112601_add_dach_steel_outreach_draft_bridge_v22.sql','utf8');
const euScope = fs.readFileSync('supabase/live-migration-history/20260924060157_expand_material_trade_buyers_to_eu_v1.sql','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');

assert.match(ui,/BLERËSIT E MATERIALIT TË ÇELIKUT · EU/,'Home card must expose EU Material Trade scope');
assert.match(ui,/Blerësit e materialit të çelikut · EU/,'Material Trade page must use EU scope');
assert.match(ui,/EU · MATERIAL ÇELIKU · DAP · PA TED/,'Home chip must make EU material/DAP/no-TED boundary explicit');
assert.match(ui,/data-dss-filter="action">Për t’u kontaktuar/,'ready-to-contact stage must exist');
assert.match(ui,/data-dss-filter="draft">Draft gati/,'draft-ready stage must be distinct');
assert.match(ui,/data-dss-filter="waiting">Në pritje të përgjigjes/,'sent/waiting stage must be distinct');
assert.match(ui,/data-dss-filter="replied">Përgjigje \/ Aktiv/,'reply-active stage must be distinct');
assert.match(ui,/return'draft'/,'lifecycle must classify a live Gmail draft separately from sent');
assert.match(ui,/buyerTierLabel/,'UI must expose Tier 1/Tier 2 buyer qualification');
assert.match(ui,/T1 · konsumator direkt/,'direct steel consumers must be Tier 1');
assert.match(ui,/T2 · ndërtim \/ GC-GU/,'construction buyers must be Tier 2');
assert.match(ui,/source_key\)\.indexOf\('eu:'\)===0/,'Material Trade UI must hide legacy non-EU-prefixed TED seeds');
assert.match(ui,/Additional steel material supply source/,'non-project EU buyer copy must not invent a project');
assert.match(bootstrap,/pristeel-dach-steel-sales-v1\\.js\\?v=20260924-eu-material2/,'runtime must cache-bust the EU Material Trade module');

assert.match(edge,/pppp-dach-steel-draft-generator-v12-eu-material-trade/,'Edge source must carry the EU Material Trade version');
assert.doesNotMatch(edge,/kek_tender_watch/,'Material Trade Edge must never read the TED/tender table');
assert.doesNotMatch(edge,/syncProjectLinks/,'Material Trade lifecycle must not auto-link targets through TED projects');
assert.doesNotMatch(edge,/tedPublication/,'Material Trade lifecycle must not parse TED publication identities');
assert.match(edge,/ted_opportunities_touched:false/,'sync result must explicitly preserve the TED boundary');
assert.match(edge,/Additional steel material supply source/,'EU general material buyer draft copy must exist');
assert.match(edge,/Zusätzliche Beschaffungsquelle für Stahlmaterial/,'DACH-language material buyer draft copy must exist');
assert.match(edge,/pppp_global_communication_guard_v1/,'buyer outreach must use the shared global communication guard');
assert.match(edge,/pppp_dach_steel_contact_resolution_v1/,'buyer contact resolution must remain canonical');
assert.match(edge,/async function existingSupplierRfq/,'supplier RFQ dedupe guard must exist');
assert.match(edge,/\.from\("rfq_log"\)/,'supplier RFQ dedupe must respect canonical project RFQ history where relevant');
assert.match(edge,/\{in:sent in:drafts\} to:/,'supplier RFQ dedupe must inspect Gmail sent/draft history');
assert.match(edge,/human_send_required:true,external_email_sent:false/,'Edge responses must preserve the human-send gate');
assert.doesNotMatch(edge,/\/drafts\/send|\/messages\/send/,'Edge must not contain a Gmail send endpoint');

for (const code of ['DE','AT','FR','IT','NL','PL','SE','ES','RO','CH']) {
  assert.match(euScope,new RegExp("'"+code+"'"),'EU scope migration must allow '+code);
}
assert.match(euScope,/Discovery is independent from TED\/Mundësitë/,'migration must document the TED separation');
assert.match(euScope,/dach_steel_target_discovery_excludes_ted',true/,'manifest protocol must explicitly exclude TED');
assert.match(euScope,/tier_1/,'manifest must document Tier 1 direct buyers');
assert.match(euScope,/tier_2/,'manifest must document Tier 2 construction buyers');
assert.match(euScope,/legacy dach_steel_\* identifiers are backward-compatible names only/,'manifest must explain legacy DACH identifiers');

assert.match(targetBridge,/dach_steel_target_never_creates_project/,'target registration must remain pre-project');
assert.match(targetBridge,/dach_steel_target_never_creates_partner_or_contact/,'target registration must not create CRM entities');
assert.match(targetBridge,/dach_steel_target_never_creates_outbound_or_sends_email/,'target registration must not create outbound or send');
assert.match(outreachBridge,/dach_steel_outreach_draft_uses_shared_outbound/,'buyer drafts must use the shared outbound queue');
assert.match(outreachBridge,/dach_steel_outreach_draft_requires_human_send_approval/,'buyer drafts must remain human gated');

console.log('EU Material Trade automation contract smoke: PASS');
