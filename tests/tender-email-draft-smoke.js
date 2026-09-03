const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8');
const projectCentric=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
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

console.log('Tender email draft language, template, signature and human-gate smoke test passed.');
