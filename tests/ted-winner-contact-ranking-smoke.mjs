import assert from 'node:assert/strict';
import { chooseBestWinnerEmail, rankWinnerPayload, winnerNeedsRanking } from '../scripts/ted-winner-contact-ranking.mjs';

const kattner={id:'k1',payload:{source:'TED',notice_phase:'award',winner:{name:'Kattner Stahlbau GmbH',names:['Kattner Stahlbau GmbH'],email:'hr@kattner-stahlbau.de',emails:['info@kattner-stahlbau.de','hr@kattner-stahlbau.de'],contact_enrichment:{status:'found',contact_count:3,organizations:[{name:'Kattner Stahlbau GmbH',contacts:[
 {type:'email',value:'hr@kattner-stahlbau.de',purpose:'person',source_type:'official_website',confidence:'high',score:96},
 {type:'email',value:'info@kattner-stahlbau.de',purpose:'general',source_type:'TED',confidence:'high',score:88},
 {type:'email',value:'einkauf@kattner-stahlbau.de',purpose:'procurement',source_type:'official_website',confidence:'high',score:110}
]}]}}}};
const best=chooseBestWinnerEmail(kattner);
assert.equal(best.contact.value,'einkauf@kattner-stahlbau.de','procurement must outrank HR, generic and person contacts');
const ranked=rankWinnerPayload(kattner,'2026-08-17T13:00:00Z');
assert.equal(ranked.changed,true);
assert.equal(ranked.row.payload.winner.email,'einkauf@kattner-stahlbau.de');
assert.equal(ranked.row.payload.winner.contact_ranking.purpose,'procurement');

const noProc={id:'k2',payload:{source:'TED',notice_phase:'award',winner:{name:'Kattner Stahlbau GmbH',names:['Kattner Stahlbau GmbH'],email:'hr@kattner-stahlbau.de',contact_enrichment:{status:'found',organizations:[{name:'Kattner Stahlbau GmbH',contacts:[
 {type:'email',value:'hr@kattner-stahlbau.de',purpose:'person',source_type:'official_website',confidence:'high',score:96},
 {type:'email',value:'info@kattner-stahlbau.de',purpose:'general',source_type:'TED',confidence:'high',score:88}
]}]}}}};
assert.equal(chooseBestWinnerEmail(noProc).contact.value,'info@kattner-stahlbau.de','general business contact must outrank HR when procurement/sales are unavailable');


const unsafeFirst={id:'unsafe',payload:{source:'TED',notice_phase:'award',winner:{name:'Simon Metallverarbeitung GmbH',names:['Simon Metallverarbeitung GmbH'],email:'info@yourdomain.com',contact_enrichment:{status:'found',organizations:[{name:'Simon Metallverarbeitung GmbH',contacts:[
 {type:'email',value:'info@yourdomain.com',purpose:'procurement',source_type:'official_website',confidence:'low',score:999,company_attribution:'external_domain',draft_eligible:false},
 {type:'email',value:'office@simon-metall.de',purpose:'general',source_type:'TED',confidence:'high',score:88}
]}]}}}};
assert.equal(chooseBestWinnerEmail(unsafeFirst).contact.value,'office@simon-metall.de','unsafe/off-domain/placeholder email must never win even with a higher score');

const onlyUnsafe={payload:{source:'TED',notice_phase:'award',winner:{name:'Unsafe GmbH',names:['Unsafe GmbH'],contact_enrichment:{status:'found',organizations:[{name:'Unsafe GmbH',contacts:[
 {type:'email',value:'info@yourdomain.com',purpose:'procurement',source_type:'official_website',confidence:'low',score:999,company_attribution:'external_domain',draft_eligible:false}
]}]}}}};
assert.equal(chooseBestWinnerEmail(onlyUnsafe),null,'no draft candidate is better than an unverified recipient');

const inheritedUnsafe={id:'unsafe-legacy',payload:{source:'TED',notice_phase:'award',winner:{name:'MEB Technical Sp. z o.o.',names:['MEB Technical Sp. z o.o.'],email:'energy@meb-group.eu',emails:['energy@meb-group.eu'],contact_enrichment:{status:'found',organizations:[{name:'MEB Technical Sp. z o.o.',contacts:[
 {type:'email',value:'energy@meb-group.eu',purpose:'general',source_type:'official_website',confidence:'low',score:60,company_attribution:'external_domain',draft_eligible:false}
]}]}}}};
const sanitized=rankWinnerPayload(inheritedUnsafe,'2026-09-23T18:00:00Z');
assert.equal(sanitized.changed,true,'an inherited primary that enrichment proves unsafe must be actively cleared');
assert.equal(sanitized.row.payload.winner.email,null);
assert.deepEqual(sanitized.row.payload.winner.emails,[]);
assert.equal(sanitized.row.payload.winner.contact_ranking.selected_email,null);

const detachedPlaceholder={id:'unsafe-detached',payload:{source:'TED',notice_phase:'award',winner:{name:'Legacy GmbH',names:['Legacy GmbH'],email:'sales@yourcompany.com',emails:['sales@yourcompany.com'],contact_enrichment:{status:'found',organizations:[{name:'Legacy GmbH',contacts:[
 {type:'email',value:'info@legacy-gmbh.de',purpose:'general',source_type:'TED',confidence:'high',score:88}
]}]}}}};
const detachedClean=rankWinnerPayload(detachedPlaceholder,'2026-09-24T04:30:00Z');
assert.equal(detachedClean.changed,true,'legacy placeholder must be cleared even when it is no longer present in enrichment evidence');
assert.equal(detachedClean.row.payload.winner.email,'info@legacy-gmbh.de');
assert.equal(winnerNeedsRanking({status:'watch',relevance_score:10,payload:{source:'TED',notice_phase:'award',winner:{email:'nao.disponivel@example.com'}}},85),true,'legacy placeholders must be sanitized even below outreach relevance threshold');
assert.equal(winnerNeedsRanking({status:'watch',relevance_score:10,payload:{source:'TED',notice_phase:'award',winner:{email:'info@real.example',contact_enrichment:{organizations:[]}}}},85),false,'low-relevance records must not become outreach ranking targets merely because enrichment exists');
assert.deepEqual(detachedClean.row.payload.winner.emails,['info@legacy-gmbh.de']);

const multi={payload:{source:'TED',notice_phase:'award',winner:{names:['A GmbH','B GmbH'],contact_enrichment:{status:'found',organizations:[{name:'A GmbH',contacts:[{type:'email',value:'info@a.de',purpose:'general'}]},{name:'B GmbH',contacts:[{type:'email',value:'info@b.de',purpose:'general'}]}]}}}};
assert.equal(chooseBestWinnerEmail(multi),null,'multi-winner records must not choose one global email');
assert.equal(rankWinnerPayload(multi).changed,false);

console.log('TED winner contact ranking smoke: OK');
