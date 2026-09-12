import fs from 'node:fs';
import assert from 'node:assert/strict';

const surface=fs.readFileSync('pristeel-ted-sales-surface-v1.js','utf8');
const register=fs.readFileSync('supabase/functions/pppp-opportunity-draft-register/index.ts','utf8');
new Function(surface);

assert.match(surface,/data-pcw-lifecycle=\"all\"/,'presentation bridge must target the duplicate lifecycle Të gjitha control');
assert.match(surface,/if\(all\)all\.remove\(\)/,'duplicate lifecycle Të gjitha must be removed while source Të gjitha stays owned by the canonical workflow');
assert.match(surface,/Email i dërguar/,'sent Gmail state must be named Email i dërguar');
assert.match(surface,/Draft i papërfunduar/,'a genuinely unsent draft must never be mislabeled as sent');
assert.match(surface,/gmail_thread_id=in\\\.\\\(/,'sent-email hydration must recognize the canonical project_emails thread query');
assert.match(surface,/ids\.length<=40/,'large Gmail thread lookups must be bounded into safe chunks');
assert.match(surface,/pst:tender-gmail-draft-created/,'successful Gmail draft creation must enter the lifecycle bridge immediately');
assert.match(surface,/pppp-opportunity-draft-register/,'manual Gmail drafts must be persisted through the authenticated canonical register');
assert.match(surface,/loadOpportunities\(true\)/,'after draft registration the existing Opportunities owner must refresh immediately');
assert.match(surface,/PSTProjectCentricWorkflowV1/,'the bridge must refresh the existing Opportunities owner instead of creating a parallel workflow');
assert.doesNotMatch(surface,/gmail-send|sendMessage|messages\/send|users\/messages\/send/,'presentation bridge must never send external email');

assert.match(register,/pppp_opportunity_outreach_registry_v1/,'manual drafts must use the existing outreach registry');
assert.match(register,/tender_watch_id:tenderId/,'draft lifecycle registration must be keyed to the tender, independent of TED\/KRPP\/APP source');
assert.match(register,/status:'draft_created'/,'successful manual Gmail draft must leave the new queue and become draft lifecycle');
assert.match(register,/gmail_thread_id:threadId/,'registered drafts must keep Gmail thread identity so later outgoing mail can become sent state');
assert.match(register,/human_send_required:true/,'manual draft registration must preserve the human send gate');
assert.match(register,/gmail_auto_send:false/,'manual draft registration must explicitly forbid auto-send');
assert.doesNotMatch(register,/messages\/send|drafts\/send|sendMessage|sendEmail/,'draft register must never send external email');

console.log('Opportunities draft/sent lifecycle smoke passed.');
