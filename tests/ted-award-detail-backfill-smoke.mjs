import assert from 'node:assert/strict';
import { backfillCandidates, buildDetailPatch, fetchTedDetails } from '../scripts/ted-award-detail-backfill.mjs';

const rows=[
  {id:'a',publication_no:'656559-2026',published_date:'2026-09-23',status:'review',relevance_score:88,payload:{source:'TED',notice_phase:'award',winner:{name:'Global Rail Services Ltd',contact_enrichment:{status:'found'}}}},
  {id:'b',publication_no:'647529-2026',published_date:'2026-09-20',status:'review',relevance_score:96,payload:{source:'TED',notice_phase:'award',description:'Already complete',winner:{name:'RB IMPRA GmbH'}}},
  {id:'c',publication_no:'123',published_date:'2026-09-22',status:'ignored',relevance_score:99,payload:{source:'TED',notice_phase:'award'}},
  {id:'d',publication_no:'456',published_date:'2026-09-22',status:'review',relevance_score:99,payload:{source:'KRPP',notice_phase:'award'}}
];
const candidates=backfillCandidates(rows,{maxRows:20});
assert.deepEqual(candidates.map(x=>x.id),['a'],'only visible TED awards missing factual scope should be backfilled');

const notice={
  'publication-number':'656559-2026',
  'notice-title':{eng:'Works for complete or part construction and civil engineering work'},
  'notice-type':'can-standard',
  'publication-date':'2026-09-23',
  'buyer-name':{eng:'Iarnród Éireann'},
  'classification-cpv':['45200000','45262410'],
  'place-of-performance':['IE061','IRL'],
  'title-proc':{eng:'Pole Validator Installation Package 3 Works'},
  'title-lot':[{eng:'Package 3'}],
  'description-proc':{eng:'Rail civil engineering programme.'},
  'description-lot':[{eng:'Installation works including structural steel and associated civil works.'}],
  'result-value-notice':'2450000',
  'result-value-cur-notice':'EUR',
  'winner-decision-date':'2026-09-14'
};
const patch=buildDetailPatch(rows[0],notice,'2026-09-23T18:30:00.000Z');
assert.equal(patch.payload.description,'Installation works including structural steel and associated civil works.');
assert.equal(patch.payload.ted_details.award_date,'2026-09-14');
assert.deepEqual(patch.payload.ted_details.lot_titles,['Package 3']);
assert.equal(patch.estimated_value,2450000);
assert.equal(patch.currency,'EUR');
assert.equal(patch.payload.winner.name,'Global Rail Services Ltd','detail backfill must preserve winner identity');
assert.equal(patch.payload.winner.contact_enrichment.status,'found','detail backfill must preserve contact intelligence');

let request=null;
const fetched=await fetchTedDetails(['656559-2026','655048-2026'],{
  fetchImpl:async(_url,opts)=>{
    request=JSON.parse(opts.body);
    return {ok:true,status:200,text:async()=>JSON.stringify({timedOut:false,notices:[notice]})};
  }
});
assert.equal(fetched.length,1);
assert.match(request.query,/^publication-number IN \(656559-2026 655048-2026\)$/);
assert.ok(request.fields.includes('description-lot')&&request.fields.includes('description-proc'));
assert.ok(request.fields.includes('result-value-notice')&&request.fields.includes('winner-decision-date'));
assert.equal(request.scope,'ALL');
assert.equal(request.onlyLatestVersions,true);

let calls=0;
const split=await fetchTedDetails(['A-2026','B-2026'],{
  fetchImpl:async(_url,opts)=>{
    calls++;
    const body=JSON.parse(opts.body);
    if(body.query.includes('A-2026 B-2026'))return{ok:false,status:400,text:async()=>JSON.stringify({error:'forced batch error'})};
    const ref=body.query.match(/\(([^)]+)\)/)?.[1]||'';
    return{ok:true,status:200,text:async()=>JSON.stringify({notices:[{'publication-number':ref}]})};
  }
});
assert.equal(calls,3,'a failed batch should split into bounded exact lookups');
assert.deepEqual(split.map(x=>x['publication-number']),['A-2026','B-2026']);

console.log('TED award detail backfill smoke: OK');
