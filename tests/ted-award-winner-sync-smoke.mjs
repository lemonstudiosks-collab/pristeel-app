import assert from 'node:assert/strict';
import { existingWinnerIntelligencePaths, normalizeTedAward, preserveWinnerIntelligence, runTedAwardWinnerSync } from '../scripts/ted-award-winner-sync.mjs';

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

const savedResearch={version:'winner-contact-v1',status:'found',researched_at:'2026-08-17T10:00:00Z',contact_count:2,organizations:[{name:'Steel Winner GmbH',contacts:[{type:'email',value:'einkauf@steelwinner.example',purpose:'procurement'}]}]};
const savedSeed={version:'ted-history-contact-v1',emails:['info@steelwinner.example']};
const savedRanking={version:'winner-contact-rank-v1',selected_email:'einkauf@steelwinner.example',purpose:'procurement'};
const oldSingle={source_key:row.source_key,payload:{winner:{name:'Steel Winner GmbH',names:['Steel Winner GmbH'],email:'einkauf@steelwinner.example',emails:['einkauf@steelwinner.example','info@steelwinner.example'],website:'https://verified.steelwinner.example',websites:['https://verified.steelwinner.example'],contact_enrichment:savedResearch,history_contact_seed:savedSeed,contact_ranking:savedRanking}}};
preserveWinnerIntelligence([row],[oldSingle]);
assert.deepEqual(row.payload.winner.contact_enrichment,savedResearch,'normal TED upsert must preserve winner contact research');
assert.deepEqual(row.payload.winner.history_contact_seed,savedSeed,'history seed must survive normal award sync');
assert.deepEqual(row.payload.winner.contact_ranking,savedRanking,'contact ranking must survive normal award sync');
assert.equal(row.payload.winner.email,'tenders@steelwinner.example','fresh direct TED email should remain primary for a single winner until ranking runs');
assert(row.payload.winner.emails.includes('einkauf@steelwinner.example'),'known researched/historical emails must not be discarded');
assert(row.payload.winner.websites.includes('https://verified.steelwinner.example'),'known researched websites must not be discarded');

const currentMissing=normalizeTedAward({...sample,'publication-number':'563866-2026','winner-email':[],'winner-internet-address':[],'winner-contact-point':[]},'2026-08-14T10:00:00.000Z');
const oldMissing={source_key:currentMissing.source_key,payload:{winner:{name:'Steel Winner GmbH',names:['Steel Winner GmbH'],email:'einkauf@steelwinner.example',emails:['einkauf@steelwinner.example'],website:'https://steelwinner.example',websites:['https://steelwinner.example'],contact_point:'Procurement Team',contacts:['Procurement Team'],contact_enrichment:savedResearch}}};
preserveWinnerIntelligence([currentMissing],[oldMissing]);
assert.equal(currentMissing.payload.winner.email,'einkauf@steelwinner.example','researched single-winner email should fill a missing TED email');
assert.equal(currentMissing.payload.winner.website,'https://steelwinner.example','researched single-winner website should fill a missing TED website');
assert.equal(currentMissing.payload.winner.contact_point,'Procurement Team');

const multiResearch={version:'winner-contact-v1',status:'found',contact_count:4,organizations:[{name:'Kovoreal - Holic s.r.o.',contacts:[{type:'email',value:'kovoreal4@kovoreal.sk'}]},{name:'Rudolf Metallbau GmbH',contacts:[{type:'email',value:'Angebot@rudolf-metallbau.at'}]}],unassigned_ted_contacts:{emails:[],websites:[]}};
const currentMulti={source_key:'TED:550551-2026',payload:{winner:{name:'Kovoreal - Holic s.r.o.',names:['Kovoreal - Holic s.r.o.','Rudolf Metallbau GmbH'],email:'Angebot@rudolf-metallbau.at',emails:['Angebot@rudolf-metallbau.at','kovoreal4@kovoreal.sk'],website:'https://wrong-first.example',websites:[],contact_point:'Wrong first contact'}}};
const oldMulti={source_key:'TED:550551-2026',payload:{winner:{name:'Kovoreal - Holic s.r.o.',names:['Kovoreal - Holic s.r.o.','Rudolf Metallbau GmbH'],email:null,website:null,contact_point:null,emails:['kovoreal4@kovoreal.sk','Angebot@rudolf-metallbau.at'],contact_enrichment:multiResearch,history_contact_seed:{version:'ted-history-contact-v1'},contact_ranking:null}}};
preserveWinnerIntelligence([currentMulti],[oldMulti]);
assert.deepEqual(currentMulti.payload.winner.contact_enrichment,multiResearch);
assert.equal(currentMulti.payload.winner.email,null,'multi-winner safety must survive the next TED upsert');
assert.equal(currentMulti.payload.winner.website,null,'multi-winner global website must remain unset');
assert.equal(currentMulti.payload.winner.contact_point,null,'multi-winner global contact point must remain unset');
assert(currentMulti.payload.winner.emails.includes('kovoreal4@kovoreal.sk'));
assert(currentMulti.payload.winner.emails.includes('Angebot@rudolf-metallbau.at'));

const exactPaths=existingWinnerIntelligencePaths([{source_key:'TED:563865-2026'},{source_key:'TED:550551-2026'}],1);
assert.equal(exactPaths.length,2,'exact source-key lookup should chunk rather than scan the whole table');
assert(exactPaths[0].includes('source_key=in.(TED%3A563865-2026)'));
assert(exactPaths[1].includes('source_key=in.(TED%3A550551-2026)'));
assert(exactPaths.every(p=>!p.includes('limit=2000')),'winner preservation must never depend on an arbitrary broad table slice');

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
