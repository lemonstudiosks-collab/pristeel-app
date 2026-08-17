import assert from 'node:assert/strict';
import { normalizeTedAward, preserveContactEnrichment, runTedAwardWinnerSync } from '../scripts/ted-award-winner-sync.mjs';

const sample={
  'publication-number':'563865-2026',
  'notice-title':{eng:'Structural steelworks for station stairs'},
  'notice-type':'can-standard',
  'publication-date':'2026-08-14',
  'buyer-name':{eng:'Rail Infrastructure GmbH'},
  'classification-cpv':['45223210'],
  'place-of-performance':['DE'],
  'winner-name':['Steel Winner GmbH'],
  'winner-email':['tenders@steelwinner.example'],
  'winner-internet-address':['https://steelwinner.example'],
  'winner-country':['DE'],
  'winner-city':['Berlin'],
  'winner-identifier':['DE-123456'],
  'winner-decision-date':['2026-08-12'],
  'winner-contact-point':['Procurement Team']
};

const row=normalizeTedAward(sample,'2026-08-14T10:00:00.000Z');
assert.equal(row.source_key,'TED:563865-2026');
assert.equal(row.payload.source,'TED');
assert.equal(row.payload.notice_phase,'award');
assert.equal(row.payload.workflow,'winner_outreach');
assert.equal(row.payload.winner.name,'Steel Winner GmbH');
assert.equal(row.payload.winner.email,'tenders@steelwinner.example');
assert.equal(row.payload.winner.website,'https://steelwinner.example');
assert.equal(row.payload.winner.decision_date,'2026-08-12');
assert.equal(row.deadline,null,'TED awards are not application opportunities');
assert.ok(row.relevance_score>=75,'steel award should pass operational relevance');

const savedResearch={version:'winner-contact-v1',status:'found',researched_at:'2026-08-17T10:00:00Z',organizations:[{name:'Steel Winner GmbH',contacts:[{type:'email',value:'einkauf@steelwinner.example'}]}]};
preserveContactEnrichment([row],[{source_key:row.source_key,payload:{winner:{contact_enrichment:savedResearch}}}]);
assert.deepEqual(row.payload.winner.contact_enrichment,savedResearch,'normal TED upsert must preserve winner contact research');

let calls=0;
const fetchImpl=async (_url,opts)=>{
  calls++;
  const body=JSON.parse(opts.body);
  assert.match(body.query,/notice-type IN \(can-standard can-social can-desg can-tran\)/);
  assert.ok(!/cn-standard/.test(body.query),'award workflow must never query open contract notices');
  assert.ok(body.fields.includes('winner-name'));
  assert.ok(body.fields.includes('winner-email'));
  return {ok:true,status:200,text:async()=>JSON.stringify({notices:[sample]})};
};
const summary=await runTedAwardWinnerSync({mode:'preview',minScore:75,days:30,fetchImpl});
assert.equal(calls,1);
assert.equal(summary.awards,1);
assert.equal(summary.winners_found,1);
assert.equal(summary.without_winner,0);
assert.equal(summary.workflow,'award_winner_outreach');
console.log('TED award winner sync smoke: OK');
