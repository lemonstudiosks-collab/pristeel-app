const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const src=fs.readFileSync('pristeel-rfq-gmail-history-sync-v1.js','utf8');
const document={
  querySelectorAll(){return[];},querySelector(){return null;},getElementById(){return null;},
  addEventListener(){},createElement(){return{style:{},setAttribute(){}};},
  head:{appendChild(){}},body:{insertAdjacentHTML(){}}
};
const window={
  __pstIntegrityLastData:{project:{name:'PROJEKT TENNET · SPIE',client:'Spie'}},
  __pstCurrentProjectId:'p-tennet'
};
const ctx={window,document,console,setTimeout,clearTimeout,alert(){},encodeURIComponent};
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'pristeel-rfq-gmail-history-sync-v1.js'});
const T=window.PSTRfqGmailHistorySyncV2&&window.PSTRfqGmailHistorySyncV2._test;
assert(T,'RFQ history test API missing');

const bodySignal={
  subject:'PROJEKTI I NENSTACIONEVE - GJERMANI (2027-2035)',
  snippet:'Te bashkengjitur e gjene nje dokument me kerkesat e SPIE per te ofertuar per keto nenstacione.'
};
assert.strictEqual(T.rfqIntent(bodySignal).snippet,true,'Albanian body RFQ signal must be recognized');
const bodyScore=T.score(bodySignal);
assert.strictEqual(bodyScore.hits,1,'fixture should prove a single project-token match');
assert.strictEqual(bodyScore.intent,true,'strong body RFQ intent must be retained');
assert.strictEqual(T.eligible(bodyScore),true,'strong body RFQ intent + one project hit must be eligible for user review');

const coordination={
  subject:'PROJEKTI I NENSTACIONEVE - GJERMANI (2027-2035)',
  snippet:'SPIE kushtet teknike dhe komerciale do ti koordinojme se bashku.'
};
const coordinationScore=T.score(coordination);
assert.strictEqual(coordinationScore.hits,1);
assert.strictEqual(coordinationScore.intent,false,'generic technical/commercial coordination must not become RFQ intent');
assert.strictEqual(T.eligible(coordinationScore),false,'one weak project hit without RFQ intent must stay out');

const unrelated={subject:'Dokumentacion',snippet:'Ju lutem shikoni materialin per te ofertuar.'};
const unrelatedScore=T.score(unrelated);
assert.strictEqual(unrelatedScore.hits,0);
assert.strictEqual(unrelatedScore.intent,true);
assert.strictEqual(T.eligible(unrelatedScore),false,'RFQ language without project relevance must not be accepted');

const classic={subject:'RFQ TENNET',snippet:'Please review the attached package.'};
const classicScore=T.score(classic);
assert.strictEqual(classicScore.intent,true);
assert.strictEqual(T.eligible(classicScore),true,'existing subject-based RFQ path must remain valid');

assert(/function showCandidates\(\)/.test(src),'candidate review UI must remain present');
assert(/data-rhg-save/.test(src),'explicit user save action must remain present');
assert(/for\(var i=0;i<sel\.length;i\+\+\)\{await linkEmail\(sel\[i\]\.meta\);await upsertRfq\(sel\[i\]\);\}/.test(src),'writes must remain behind saveSelected user confirmation');
assert(!/async function scan\(\)[\s\S]*?await upsertRfq\(/.test(src.match(/async function scan\(\)[\s\S]*?function closeModal/)[0]),'scan must remain read-only');

console.log('RFQ Gmail history sync smoke: OK');
