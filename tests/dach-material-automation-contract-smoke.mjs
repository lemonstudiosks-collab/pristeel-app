import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('pristeel-dach-steel-sales-v1.js','utf8');
const edge = fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts','utf8');
const targetBridge = fs.readFileSync('supabase/live-migration-history/20260922110424_chatgpt_dach_steel_target_bridge_v21.sql','utf8');
const outreachBridge = fs.readFileSync('supabase/live-migration-history/20260922112601_add_dach_steel_outreach_draft_bridge_v22.sql','utf8');
const euScope = fs.readFileSync('supabase/live-migration-history/20260924060157_expand_material_trade_buyers_to_eu_v1.sql','utf8');
const languagePromotion = fs.readFileSync('supabase/live-migration-history/20260924064541_material_trade_language_project_promotion_v1.sql','utf8');
const projectEmailContinuity = fs.readFileSync('supabase/live-migration-history/20260924065454_material_trade_project_email_continuity_v1.sql','utf8');
const contactResolutionFix = fs.readFileSync('supabase/live-migration-history/20260924072000_fix_material_trade_contact_resolution_claims_v1.sql','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');

assert.match(ui,/BLERËSIT E MATERIALIT TË ÇELIKUT · EUROPE/,'Home card must expose broader Material Trade scope');
assert.match(ui,/Blerësit e materialit të çelikut - Europe/,'Material Trade page must use broader European scope');
assert.match(ui,/EU \+ CH \+ RS \+ ME · MATERIAL ÇELIKU · DAP · PA TED/,'Home chip must expose the eligible geography and no-TED boundary');
assert.match(ui,/\['action','Të gjitha',actionable\.length\]/,'ready-to-contact stage must remain the default company list');
assert.match(ui,/life==='draft'\?'Draft gati'/,'draft-ready stage must be distinct');
assert.match(ui,/life==='waiting'\?'Në pritje të përgjigjes'/,'sent/waiting stage must be distinct');
assert.match(ui,/\['replied','Përgjigje të marra',replied\.length\]/,'reply-active stage must be distinct');
assert.match(ui,/return'draft'/,'lifecycle must classify a live Gmail draft separately from sent');
assert.match(ui,/buyerTierLabel/,'UI must expose Tier 1/Tier 2 buyer qualification');
assert.match(ui,/T1 · konsumator direkt/,'direct steel consumers must be Tier 1');
assert.match(ui,/T2 · ndërtim \/ GC-GU/,'construction buyers must be Tier 2');
assert.match(ui,/sk\.indexOf\('eu:'\)===0\|\|sk\.indexOf\('mt:'\)===0/,'Material Trade active/discovery UI must allow canonical eu:/mt: lanes only');
assert.match(ui,/function hasOutboundHistory\(r\)/,'Contacted history must be derived from canonical outbound evidence');
assert.match(ui,/contacted=all\.filter\(hasOutboundHistory\)/,'Contacted card must include canonical outbound history, including legacy target identities');
assert.doesNotMatch(ui,/contactedSorted\.slice\(0,12\)/,'Contacted card must not silently truncate older contacted companies');
assert.match(ui,/\['HR','ME','RS'\]/,'UI buyer language routing must use BCS for HR/ME/RS');
assert.match(ui,/Dodatni izvor nabavke čeličnog materijala/,'UI must include BCS outreach copy');
assert.match(ui,/data-dss-action="promote-project"/,'Reply/RFQ stage must expose project promotion');
assert.match(ui,/confirm_project_create:true/,'Project promotion must require explicit UI confirmation');
assert.match(ui,/Additional steel material supply source/,'non-project EU buyer copy must not invent a project');
assert.match(ui,/obj\.claim/,'Material Trade UI must parse contact emails stored in evidence.claim');
assert.match(ui,/Kontakti për blerje/,'Expanded buyer detail must surface purchasing contact prominently');
assert.match(ui,/Çfarë prodhon \/ konsumon/,'Expanded buyer detail must surface company/material intelligence');
assert.match(ui,/Target tregtar i kompanisë; nuk varet nga një tender apo projekt specifik\./,'Company-centric detail must explain when no specific project is required');
assert.match(ui,/Evidenca publike për kompaninë/,'Company evidence must be visible in the expanded buyer detail');
assert.match(bootstrap,/pristeel-dach-steel-sales-v1\.js\?v=20260924-contact-history1/,'runtime must cache-bust the Material Trade module');

assert.match(edge,/pppp-dach-steel-draft-generator-v14-project-thread-continuity/,'Edge source must carry the project-thread-continuity version');
assert.doesNotMatch(edge,/kek_tender_watch/,'Material Trade Edge must never read the TED/tender table');
assert.doesNotMatch(edge,/syncProjectLinks/,'Material Trade lifecycle must not auto-link targets through TED projects');
assert.doesNotMatch(edge,/tedPublication/,'Material Trade lifecycle must not parse TED publication identities');
assert.match(edge,/ted_opportunities_touched:false/,'sync result must explicitly preserve the TED boundary');
assert.match(edge,/Additional steel material supply source/,'EU general material buyer draft copy must exist');
assert.match(edge,/Zusätzliche Beschaffungsquelle für Stahlmaterial/,'DACH-language material buyer draft copy must exist');
assert.match(edge,/\["HR","ME","RS"\]/,'Edge buyer language routing must use BCS for HR/ME/RS');
assert.match(edge,/Dodatni izvor nabavke čeličnog materijala/,'Edge must include BCS buyer draft copy');
assert.match(edge,/async function promoteProject/,'Edge must implement project promotion');
assert.match(edge,/buyer_reply_required_before_project_promotion/,'Project promotion must require canonical buyer reply evidence');
assert.match(edge,/p_business_type:"trading"/,'Promoted Material Trade projects must be trading projects');
assert.match(edge,/target_status:"project_promoted"/,'Successful promotion must mark the target project_promoted');
assert.match(edge,/\.from\("project_emails"\)\.select\("id,project_id,gmail_message_id,direction"\)\.eq\("gmail_thread_id",q\.gmail_thread_id\)/,'Promotion must inspect exact Gmail-thread project identity before creating a project');
assert.match(edge,/gmail_thread_already_linked_to_project/,'Promotion must block an already-linked Gmail thread instead of overwriting it');
assert.match(edge,/match_method:"material_trade_promotion"/,'Promotion must link the buyer thread into project_emails');
assert.match(edge,/match_confidence:100/,'Promoted Gmail thread links must be exact/high-confidence');
assert.match(edge,/pppp_global_communication_guard_v1/,'buyer outreach must use the shared global communication guard');
assert.match(edge,/pppp_dach_steel_contact_resolution_v1/,'buyer contact resolution must remain canonical');
assert.match(edge,/async function existingSupplierRfq/,'supplier RFQ dedupe guard must exist');
assert.match(edge,/\.from\("rfq_log"\)/,'supplier RFQ dedupe must respect canonical project RFQ history where relevant');
assert.match(edge,/\{in:sent in:drafts\} to:/,'supplier RFQ dedupe must inspect Gmail sent/draft history');
assert.match(edge,/human_send_required:true,external_email_sent:false/,'Edge responses must preserve the human-send gate');
assert.doesNotMatch(edge,/\/drafts\/send|\/messages\/send/,'Edge must not contain a Gmail send endpoint');
assert.match(edge,/const sent=msgs\.filter\(\(m:any\)=>m\.labels\.includes\("SENT"\)\|\|m\.from===GU\)/,'Material Trade sent detection must require Gmail Sent/from-user evidence');
assert.match(edge,/threadLifecycle\(q\.gmail_thread_id\)/,'Material Trade lifecycle sync must inspect the exact Gmail thread');
assert.match(edge,/status,sent_at:q\.sent_at\|\|sent\.at\|\|now/,'canonical outbound must store sent status and the Gmail timestamp');

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

for (const code of ['ME','RS']) {
  assert.match(languagePromotion,new RegExp("'"+code+"'"),'Material Trade scope must allow '+code);
}
assert.match(languagePromotion,/material_trade_outreach_language_policy/,'manifest must publish language routing');
assert.match(languagePromotion,/material_trade_project_promotion/,'manifest must publish project-promotion rules');
assert.match(languagePromotion,/reply_evidence_required',true/,'manifest must require reply evidence before promotion');
assert.match(languagePromotion,/human_confirmation_required',true/,'manifest must preserve human confirmation for promotion');
assert.match(languagePromotion,/project_promoted/,'summary/protocol must remove promoted targets from Material Trade queue');
assert.match(projectEmailContinuity,/material_trade_project_email_continuity/,'manifest must document Gmail-thread continuity');
assert.match(projectEmailContinuity,/gmail_thread_id/,'Gmail thread must be the project-promotion identity key');
assert.match(projectEmailContinuity,/Never overwrite a project_emails row already linked to a different project/,'manifest must preserve project identity conflicts');
assert.match(contactResolutionFix,/e\.item->>'claim'/,'contact resolver must inspect evidence.claim');
assert.match(contactResolutionFix,/Purchasing \/ Procurement/,'contact resolver must classify procurement contacts');

console.log('Material Trade automation contract smoke: PASS');
