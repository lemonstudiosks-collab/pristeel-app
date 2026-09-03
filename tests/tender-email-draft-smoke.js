const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8');
const projectCentric=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
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
assert.ok(source.includes("preferred='arianit.vllahiu@prissteel.com'"),'The Arianit Gmail alias must be preferred for the real signature');
assert.ok(!/messages\/send|GmailApp\.send|sendEmail\s*\(/.test(source),'Email must remain human-gated');

assert.ok(/alter table public\.tender_email_links enable row level security/i.test(securityHardening),'TED email links must have RLS enabled');
assert.ok(/tender_email_links_select_authenticated/.test(securityHardening),'Authenticated TED email-link reads must be explicit');
assert.ok(/tender_email_links_(insert|update|delete)_can_write/.test(securityHardening),'TED email-link writes must remain can_write gated');
assert.ok(/pppp_tender_operating_lanes_v1 set \(security_invoker=true\)/i.test(securityHardening),'Tender lane view must respect caller RLS');
assert.ok(/pppp_ted_sales_outreach_v1 set \(security_invoker=true\)/i.test(securityHardening),'TED outreach view must respect caller RLS');
assert.ok(/pppp_ted_award_candidates_by_email_v1[\s\S]*security invoker/i.test(securityHardening),'TED award lookup RPC must not elevate privileges');
assert.ok(/tender_email_links_gmail_message_id_idx/.test(securityHardening),'TED email-link Gmail FK must have a covering index');
assert.ok(!/messages\/send|sendEmail\s*\(/.test(securityHardening),'Security hardening must not introduce external email sending');

console.log('Tender email draft language, template, signature, human-gate and security hardening smoke test passed.');
