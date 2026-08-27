const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('pristeel-project-emails.js', 'utf8');
const finalizer = fs.readFileSync('pristeel-redesign-finalizer-v1.js', 'utf8');
const openaiAssistant = fs.readFileSync('pristeel-openai-operating-assistant-v1.js', 'utf8');
const projectCentric = fs.readFileSync('pristeel-project-centric-workflow-v1.js', 'utf8');
const required = [
  'pristeel-login-brand-v1.js','pristeel-login-transition-v2.js','pristeel-ui-corrections-v2.js','pristeel-dashboard-task-cards-v1.js','pristeel-business-command-center-v1.js','pristeel-gmail-deep-search-v1.js','pristeel-business-command-center-deep-gmail-v1.js','pristeel-search-stable-v2.js','pristeel-project-command-view-v1.js','pristeel-home-command-center-v2.js','pristeel-home-live-fix-v1.js','pristeel-home-stability-v2.js','pristeel-home-visual-cleanup-v1.js','pristeel-gmail-live-inbox-v2.js','pristeel-gmail-intake-v3.js','pristeel-project-load-stability-v2.js','pristeel-rfq-stability-v2.js','pristeel-offer-pricing-stability-v2.js','pristeel-our-offer-stability-v2.js','pristeel-finance-stability-v2.js','pristeel-document-center-stable-v2.js','pristeel-modal-navigation-safety-v2.js','pristeel-redesign-finalizer-v1.js'
];
required.forEach(entry => assert(source.includes(entry), `${entry} is missing from the current redesign bootstrap`));
[
  'pristeel-gmail-intake-create-project-fix-v1.js','pristeel-gmail-live-inbox-v1.js','pristeel-document-center-v2.js','pristeel-dashboard-focus.js','pristeel-dashboard-operations.js'
].forEach(entry=>assert(!source.includes(entry),`${entry} is retired and must not return to the bootstrap`));

const searchPos=source.indexOf('pristeel-search-stable-v2.js');
const homePos=source.indexOf('pristeel-home-command-center-v2.js');
const livePos=source.indexOf('pristeel-home-live-fix-v1.js');
const stabilityPos=source.indexOf('pristeel-home-stability-v2.js');
const cleanupPos=source.indexOf('pristeel-home-visual-cleanup-v1.js');
assert(searchPos>=0,'Stable search must be loaded');
assert(homePos>=0&&livePos>homePos,'Approved Home live layer must load after the Home command center');
assert(stabilityPos>livePos,'Home stability must load after the approved Home live layer');
assert(cleanupPos>stabilityPos,'Home visual cleanup must load after Home stability');
assert(source.includes("document.dispatchEvent(new CustomEvent('pst:modules-ready'))"), 'Bootstrap readiness event is missing');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source), 'Bootstrap must not poll or observe the platform');

assert(finalizer.includes('pristeel-openai-operating-assistant-v1.js?v=20260827-home1'), 'Finalizer must load the server-side OpenAI operating assistant');
assert(finalizer.includes('data-pst-openai-assistant-v1'), 'OpenAI assistant loader must be idempotent');
assert(openaiAssistant.includes('/functions/v1/pppp-openai-assistant'), 'OpenAI assistant must use the authenticated server-side Edge Function');
assert(openaiAssistant.includes('PSTProjectContextBridge'), 'OpenAI assistant must extend the project context bridge instead of creating a second project store');
assert(openaiAssistant.includes('PSTProjectIntelligenceConversationV2'), 'Existing project conversation surface must be upgraded to the server assistant');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(openaiAssistant), 'OpenAI assistant must stay bounded and observer-free');
assert(!/\.supaFetch\([^\n]*['\"](?:PATCH|POST|DELETE)['\"]/.test(openaiAssistant), 'OpenAI assistant must not write business data through Supabase REST');
assert(!/gmail\/v1\/.*send|mark.*won|mark.*lost|supplier_orders.*POST/i.test(openaiAssistant), 'OpenAI assistant must not bypass human commitment gates');

// Project-centric final layer: Projects are the daily center, TED is awards-only, and operator text can drive safe internal organization.
assert(finalizer.includes('pristeel-project-centric-workflow-v1.js?v=20260827-owner2'), 'Finalizer must load the current project-centric workflow layer');
assert(finalizer.includes('data-pst-project-centric-workflow-v2'), 'Project-centric loader must be idempotent for the current generation');
new Function(projectCentric);
assert(projectCentric.includes("tenderSource(r)==='TED'?'award':'local'"), 'TED must have a dedicated award mode');
assert(projectCentric.includes("if(src==='TED')return phase==='award'"), 'Open TED opportunities must stay out of the daily Opportunities surface');
assert(projectCentric.includes('Për ofertim') && projectCentric.includes('Fitues nga TED'), 'Daily tender filters must separate bid opportunities from TED winners in Albanian');
assert(projectCentric.includes('pppp-project-operator-update'), 'Project operator update must use the authenticated safe Edge Function');
assert(projectCentric.includes('pppp_contact_master_v1?contact_id=eq.') && projectCentric.includes('project_emails?'), 'Contact popup must refresh canonical live relationships and recent project email data');
assert(projectCentric.includes('PSTOpenAIAssistantV1') && projectCentric.includes('candidate_partners'), 'Tender analysis must use server AI plus registered PPPP partners');
assert(projectCentric.includes("if(src==='APP_AL')") && projectCentric.includes('nuk ka lidhje të drejtpërdrejtë të sigurt'), 'APP active workflow must refuse the unsafe generic external page and keep dossier retrieval inside PPPP');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(projectCentric), 'Project-centric layer must remain bounded and observer-free');
assert(!/messages\/send|GmailApp\.send|sendEmail\s*\(/.test(projectCentric), 'Project-centric layer must never send external mail');
assert(!/mark.*won|mark.*lost|supplier_orders.*POST/i.test(projectCentric), 'Project-centric layer must preserve commitment gates');

console.log('Redesign bootstrap + OpenAI + project-centric workflow contract smoke test passed.');
assert(projectCentric.includes('Merr dhe analizo dosjen') && projectCentric.includes('dossierReady(id)'), 'Project creation must be gated behind explicit dossier analysis');

assert(finalizer.includes('pristeel-project-control-home-v1.js?v=20260827-owner6'),'Finalizer must cache-bust the current Home owner');
assert(finalizer.includes('data-pst-project-control-home-v6'),'Finalizer must not accept a stale Home script tag');
assert(finalizer.includes('pristeel-tender-dossier-analysis-v1.js?v=20260827-readable2'),'Finalizer must load the readable dossier generation');
assert(projectCentric.includes('__pstProjectCentricWorkflowV2'),'Project-centric runtime must expose its current generation marker');
assert(projectCentric.includes("p.setAttribute('data-pcw-opportunities-owner','2')"),'whole-card Opportunities must claim visible ownership');
