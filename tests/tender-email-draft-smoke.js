const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8');
const projectCentric=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
const draftStateSource=fs.readFileSync('pristeel-opportunity-draft-state-v1.js','utf8');
const askBridgeSource=fs.readFileSync('pristeel-home-ask-functional-owner-v1.js','utf8');
const securityHardening=fs.readFileSync('supabase/migrations/20260903111000_tender_security_hardening_v1.sql','utf8');
const sandbox={
  window:{},
  document:{getElementById:()=>null,addEventListener:()=>{},head:{appendChild:()=>{}},createElement:()=>({})},
  setTimeout:()=>0,
  clearTimeout:()=>{},
  URL,
  console,
  Date,
  Promise,
  encodeURIComponent,
  decodeURIComponent,
  isFinite,
  btoa:(value)=>Buffer.from(value,'binary').toString('base64'),
  unescape,
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);

const T=sandbox.window.PSTTenderPriorityActionsV1;
assert.ok(T,'Tender email API must load');

function award(country,companyType='unknown'){
  return{
    id:'t1',
    title:'Portugal – Transformer substation – Construction of the Pico Vermelho substation',
    authority:'Public authority',
    relevance_score:96,
    category:'steel_structure',
    status:'new',
    payload:{source:'TED',notice_phase:'award',workflow:'winner_outreach',winner:{name:'MARQUES, S.A.',country,email:'d.comercial@grupomarques.org',company_type:companyType}}
  };
}

assert.strictEqual(T._test.languageFor(award('DEU')),'de');
assert.strictEqual(T._test.languageFor(award('AUT')),'de');
assert.strictEqual(T._test.languageFor(award('CHE')),'de');
assert.strictEqual(T._test.languageFor(award('LIE')),'de');
assert.strictEqual(T._test.languageFor(award('HRV')),'sh');
assert.strictEqual(T._test.languageFor(award('MNE')),'sh');
assert.strictEqual(T._test.languageFor(award('SRB')),'sh');
assert.strictEqual(T._test.languageFor(award('PRT')),'en');
assert.strictEqual(T._test.languageFor(award('ALB')),'en');

const english=T._test.fallbackDraft(award('PRT'),{name:'MARQUES, S.A.',email:'d.comercial@grupomarques.org'},'en');
assert.ok(english.subject.includes('Transformer substation'));
assert.ok(english.body.includes('MARQUES, S.A.'));
assert.ok(english.body.includes('DAP delivery'));
assert.ok(english.body.includes('EN 1090-2 up to EXC-4'));
assert.ok(english.body.endsWith('Kind regards'));

const serboCroatian=T._test.fallbackDraft(award('HRV'),{name:'MARQUES, S.A.',email:'d.comercial@grupomarques.org'},'sh');
assert.ok(serboCroatian.subject.includes('Dodatni kapacitet'));
assert.ok(serboCroatian.body.startsWith('Poštovani,'));
assert.ok(serboCroatian.body.endsWith('S poštovanjem'));

const german=T._test.fallbackDraft(award('CHE'),{name:'MARQUES, S.A.',email:'d.comercial@grupomarques.org'},'de');
assert.ok(german.subject.includes('Zusätzliche Stahlbau-Fertigungskapazität'));
assert.ok(german.body.startsWith('Sehr geehrte Damen und Herren,'));
assert.ok(german.body.endsWith('Mit freundlichen Grüßen'));

assert.ok(projectCentric.includes('data-pcw-ti="draft"')&&projectCentric.includes('Përgatit emailin'),'Action Console must expose email preparation for every TED winner');
assert.ok(source.includes('/users/me/drafts'),'Email workflow must create a Gmail draft');
assert.ok(source.includes('pst:tender-gmail-draft-created'),'Successful Gmail creation must emit a direct persistence event instead of relying only on button polling');
assert.ok(source.includes('gmail_draft_id')&&source.includes('gmail_message_id'),'The draft event must retain Gmail identifiers for reliable duplicate protection');
assert.ok(source.includes("preferred='arianit.vllahiu@prissteel.com'"),'The Arianit Gmail alias must be preferred for the real signature');
assert.ok(!/messages\/send|GmailApp\.send|sendEmail\s*\(/.test(source),'Email must remain human-gated');

assert.ok(draftStateSource.includes("outreach_draft"),'Opportunity draft state must persist on the canonical tender payload');
assert.ok(draftStateSource.includes("pst-pcw-has-draft")&&draftStateSource.includes('DRAFT EMAILI U KRIJUA'),'Persisted draft state must visibly distinguish the Opportunity card');
assert.ok(draftStateSource.includes("Drafti ekziston · Hap Gmail"),'Existing draft state must prevent the normal create-draft CTA from appearing unchanged');
assert.ok(draftStateSource.includes("human_send_required:true"),'Persisted draft state must preserve the human-send requirement');
assert.ok(draftStateSource.includes('bindCreatedEvent')&&draftStateSource.includes("source:created?'gmail_api'"),'Draft state must persist the direct Gmail success event as its canonical source');
assert.ok(!/messages\/send|GmailApp\.send|sendEmail\s*\(/.test(draftStateSource),'Draft-state persistence must never send email');

const workflowSandbox={window:{addEventListener:()=>{}},document:{readyState:'loading',addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null},console,Date,Promise,URL,encodeURIComponent,isFinite,setTimeout:()=>0,clearTimeout:()=>{}};
vm.createContext(workflowSandbox);vm.runInContext(projectCentric,workflowSandbox);
const W=workflowSandbox.window.PSTProjectCentricWorkflowV1;
const duplicateBase={title:'Portugal transformer substation',authority:'Public authority',publication_no:'TED-123',status:'new',relevance_score:91,payload:{source:'TED',notice_phase:'award',winner:{name:'MARQUES, S.A.'}}};
const duplicatePlain=Object.assign({id:'plain'},duplicateBase),duplicateDraft=Object.assign({id:'drafted'},duplicateBase,{relevance_score:88,payload:{source:'TED',notice_phase:'award',winner:{name:'MARQUES, S.A.'},outreach_draft:{status:'created',gmail_draft_id:'g-draft-1'}}});
const uniqueReview={id:'unique',title:'Another award',authority:'Other',publication_no:'TED-999',status:'review',relevance_score:80,payload:{source:'TED',notice_phase:'award',winner:{name:'OTHER WINNER'}}};
const deduped=W._test.dedupeOpportunities([duplicatePlain,duplicateDraft,uniqueReview]);
assert.strictEqual(deduped.length,2,'Exact award duplicates must collapse to one Opportunity');
assert.strictEqual(deduped.find(x=>x.publication_no==='TED-123').id,'drafted','Deduplication must retain the row carrying the Gmail draft state');
W._state.rows=[duplicatePlain,duplicateDraft,uniqueReview];W.setOpportunityContext({focus:'review'});
assert.strictEqual(W._test.opportunityRows().map(x=>x.id).join(','),'unique','Home review context must show only Opportunities waiting for review');

assert.ok(askBridgeSource.includes('MutationObserver'),'Ask bridge must survive the late Project Control Home owner instead of expiring after early startup retries');
assert.ok(askBridgeSource.includes('installAskOwnerQueryBridge')&&askBridgeSource.includes("PSTProjectControlHomeV1.render"),'Visible Ask shell must remain connected to the canonical owner render path after DOM adoption');
assert.ok(askBridgeSource.includes('90000'),'Ask bridge must remain bounded but cover the known long ordered bootstrap window');

assert.ok(/alter table public\.tender_email_links enable row level security/i.test(securityHardening),'TED email links must have RLS enabled');
assert.ok(/tender_email_links_select_authenticated/.test(securityHardening),'Authenticated TED email-link reads must be explicit');
assert.ok(/tender_email_links_(insert|update|delete)_can_write/.test(securityHardening),'TED email-link writes must remain can_write gated');
assert.ok(/pppp_tender_operating_lanes_v1 set \(security_invoker=true\)/i.test(securityHardening),'Tender lane view must respect caller RLS');
assert.ok(/pppp_ted_sales_outreach_v1 set \(security_invoker=true\)/i.test(securityHardening),'TED outreach view must respect caller RLS');
assert.ok(/pppp_ted_award_candidates_by_email_v1[\s\S]*security invoker/i.test(securityHardening),'TED award lookup RPC must not elevate privileges');
assert.ok(/tender_email_links_gmail_message_id_idx/.test(securityHardening),'TED email-link Gmail FK must have a covering index');
assert.ok(!/messages\/send|sendEmail\s*\(/.test(securityHardening),'Security hardening must not introduce external email sending');

console.log('Tender email draft language, persistence, duplicate guard, Ask owner bridge and security smoke test passed.');
