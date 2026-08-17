import assert from 'node:assert/strict';
import { companyKey, seedWinnerFromHistory } from '../scripts/ted-winner-contact-history-reuse.mjs';

assert.equal(companyKey('Kattner Stahlbau GmbH'),'kattner stahlbau');
assert.equal(companyKey('Kattner Stahlbau GmbH & Co. KG'),'kattner stahlbau');

const historyKattner={id:'old-k',procurement_no:'TED-544643-2026',publication_no:'544643-2026',relevance_score:88,payload:{source:'TED',notice_phase:'award',winner:{name:'Kattner Stahlbau GmbH',names:['Kattner Stahlbau GmbH'],email:'info@kattner-stahlbau.de',emails:['info@kattner-stahlbau.de']}}};
const currentKattner={id:'new-k',procurement_no:'TED-558371-2026',publication_no:'558371-2026',relevance_score:96,payload:{source:'TED',notice_phase:'award',winner:{name:'Kattner Stahlbau GmbH',names:['Kattner Stahlbau GmbH'],contact_enrichment:{version:'winner-contact-v1',status:'not_found',researched_at:'2026-08-17T12:06:02Z',contact_count:0,organizations:[]}}}};
const seeded=seedWinnerFromHistory(currentKattner,[currentKattner,historyKattner],'2026-08-17T13:00:00Z');
assert.equal(seeded.changed,true);
assert.equal(seeded.row.payload.winner.email,'info@kattner-stahlbau.de');
assert(seeded.row.payload.winner.emails.includes('info@kattner-stahlbau.de'));
assert.equal(seeded.row.payload.winner.contact_enrichment,undefined,'not_found research should be cleared so enrichment retries immediately');
assert.equal(seeded.row.payload.winner.history_contact_seed.sources[0].procurement_no,'TED-544643-2026');

const unrelated={id:'x',procurement_no:'TED-X',payload:{source:'TED',notice_phase:'award',winner:{name:'Another Steel GmbH',names:['Another Steel GmbH'],email:'info@another.example',emails:['info@another.example']}}};
const noCross=seedWinnerFromHistory(currentKattner,[currentKattner,unrelated]);
assert.equal(noCross.changed,false,'different company history must never be reused');

const historicMulti={id:'old-m',procurement_no:'TED-OLD-M',payload:{source:'TED',notice_phase:'award',winner:{names:['Kovoreal - Holic s.r.o.','Rudolf Metallbau GmbH'],name:'Kovoreal - Holic s.r.o.',emails:['Angebot@rudolf-metallbau.at','kovoreal4@kovoreal.sk'],email:'Angebot@rudolf-metallbau.at'}}};
const currentMulti={id:'new-m',procurement_no:'TED-NEW-M',relevance_score:96,payload:{source:'TED',notice_phase:'award',winner:{names:['Kovoreal - Holic s.r.o.','Rudolf Metallbau GmbH'],name:'Kovoreal - Holic s.r.o.',email:null,emails:[],contact_enrichment:{version:'winner-contact-v1',status:'not_found',contact_count:0,organizations:[]}}}};
const multiSeed=seedWinnerFromHistory(currentMulti,[currentMulti,historicMulti]);
assert.equal(multiSeed.changed,true);
assert(multiSeed.row.payload.winner.emails.includes('kovoreal4@kovoreal.sk'));
assert(multiSeed.row.payload.winner.emails.includes('Angebot@rudolf-metallbau.at'));
assert.equal(multiSeed.row.payload.winner.email,null,'multi-winner history reuse must not assign one company email to the first winner');

console.log('TED winner contact history reuse smoke: OK');
