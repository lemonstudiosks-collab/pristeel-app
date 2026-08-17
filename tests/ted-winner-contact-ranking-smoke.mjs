import assert from 'node:assert/strict';
import { chooseBestWinnerEmail, rankWinnerPayload } from '../scripts/ted-winner-contact-ranking.mjs';

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

const multi={payload:{source:'TED',notice_phase:'award',winner:{names:['A GmbH','B GmbH'],contact_enrichment:{status:'found',organizations:[{name:'A GmbH',contacts:[{type:'email',value:'info@a.de',purpose:'general'}]},{name:'B GmbH',contacts:[{type:'email',value:'info@b.de',purpose:'general'}]}]}}}};
assert.equal(chooseBestWinnerEmail(multi),null,'multi-winner records must not choose one global email');
assert.equal(rankWinnerPayload(multi).changed,false);

console.log('TED winner contact ranking smoke: OK');
