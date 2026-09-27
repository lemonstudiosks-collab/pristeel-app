import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync('pristeel-eu-companies-v1.js','utf8');
const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
const mobile=fs.readFileSync('pristeel-mobile-app-v2.js','utf8');
const mig=fs.readFileSync('supabase/migrations/20260927065907_eu_direct_companies_v1.sql','utf8');
const guard=fs.readFileSync('supabase/migrations/20260927065952_eu_direct_outreach_guard_fix_v1.sql','utf8');
const security=fs.readFileSync('supabase/migrations/20260927071418_eu_direct_security_hardening_v1.sql','utf8');

assert.match(ui,/pppp_eu_direct_operational_v1/,'UI must read the canonical operational view');
assert.match(ui,/Kompanitë EU/,'Albanian EU Companies title missing');
assert.match(ui,/Kthehu/,'minimal back control missing');
assert.match(ui,/Kërko kompani/,'minimal search control missing');
assert.match(ui,/Rifresko/,'minimal refresh control missing');
assert.doesNotMatch(ui,/sendMail|messages\/send|dërgo email|create_project|insert\s+into/i,'EU Companies UI must not send email or create business records');

const loads=(bootstrap.match(/pristeel-eu-companies-v1\.js/g)||[]).length;
assert.equal(loads,1,'EU Companies runtime must load exactly once');

assert.match(mobile,/data-pma-discover="eu"/,'mobile EU Companies tab missing');
assert.match(mobile,/Material – Ofertë/,'mobile Material label must use the Albanian module name');
assert.match(mobile,/>Kompanitë EU</,'mobile EU Companies label missing');
assert.match(mobile,/>Ballina</,'mobile navigation must be Albanian');
assert.match(mobile,/>Projektet</,'mobile navigation must be Albanian');
assert.match(mobile,/>Zbulo</,'mobile navigation must be Albanian');
assert.match(mobile,/>Posta</,'mobile navigation must be Albanian');

assert.match(mig,/create table if not exists public\.pppp_eu_direct_targets_v1/,'canonical EU Direct table missing');
assert.match(mig,/security_invoker=true/,'operational view must respect caller security');
assert.match(mig,/manual_web_verified_2026-09-22/,'historical direct-web batch integration missing');
assert.doesNotMatch(mig,/discovery_source\s*=\s*'ted_public_award'/,'TED winners must not be imported into EU Direct');
assert.match(mig,/cross_module_identity_review_required/,'cross-module identity guard missing');
assert.match(mig,/pppp_dach_steel_targets_v1/,'Material – Ofertë collision check missing');
assert.match(mig,/pppp_representation_targets_v1/,'Representation collision check missing');
assert.match(mig,/pppp_opportunity_company_profiles_v1/,'Mundësitë collision check missing');
assert.match(mig,/pppp_outbound_queue_v1/,'shared outbound history check missing');
assert.match(mig,/pppp_contact_master_v1/,'shared contact history check missing');
assert.match(mig,/external_email_sent',false/,'registration must never send external email');
assert.match(mig,/project_created',false/,'registration must never create a project');
assert.match(mig,/outbound_created',false/,'registration must never create outbound automatically');
assert.match(mig,/chatgpt-command-v28/,'manifest v28 missing');
assert.match(mig,/eu_direct_target_never_sends_email/,'manifest send guard missing');

const cooldownPos=guard.indexOf("cooldown_30d");
const draftPos=guard.indexOf("existing_draft");
assert.ok(cooldownPos>=0&&draftPos>cooldownPos,'recent real contact must take precedence over a stale draft');

assert.match(security,/security invoker/i,'EU Direct read RPC must run with caller privileges');
assert.match(security,/revoke execute .*pppp_chatgpt_bridge_manifest_v28\(\).* authenticated/i,'direct authenticated execution of manifest v28 must stay revoked');

console.log('EU Direct Companies v1 smoke: OK');
