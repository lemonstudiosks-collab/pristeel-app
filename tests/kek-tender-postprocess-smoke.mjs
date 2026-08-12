import assert from 'node:assert/strict';
import { normalizeTenderRow } from '../scripts/kek-tender-postprocess.mjs';

assert.deepEqual(
  normalizeTenderRow({document_type:'B08 Njoftim për dhënie të kontratës',title:'Furnizim me elemente lidhese per rule',relevance_score:68,match_reasons:['FPP çelik: 27115000-4']}),
  {action:'delete',reason:'non_actionable_B08'}
);

assert.deepEqual(
  normalizeTenderRow({document_type:'B52 Njoftimi për nënshkrimin e kontratës',title:'Furnizim me shufra rrethore te çelikut',relevance_score:45,match_reasons:['sinjal lënde: shufr']}),
  {action:'delete',reason:'non_actionable_B52'}
);

assert.deepEqual(
  normalizeTenderRow({document_type:'B05 Njoftim per Kontrat',title:'Pastrimi i sipërfaqeve ngrohëse',fpp_description:'Shërbimet industriale te pastrimit',relevance_score:62,category:'possible',match_reasons:['lëndë e parë: ipe']}),
  {action:'delete',reason:'false_profile_substring_ipe'}
);

assert.deepEqual(
  normalizeTenderRow({document_type:'B05 Njoftim per Kontrat',title:'Furnizim me HEA 300 të çelikut',fpp_description:'Çelik',relevance_score:62,category:'possible',match_reasons:['lëndë e parë: hea']}).action,
  'patch'
);

const raw=normalizeTenderRow({document_type:'B05 Njoftim per Kontrat',title:'Furnizim me shufra rrethore te çelikut',fpp_description:'Produkte metalike',relevance_score:45,category:'possible',match_reasons:['sinjal lënde: shufr']});
assert.equal(raw.action,'patch');
assert.equal(raw.patch.category,'raw_material');
assert.ok(raw.patch.relevance_score>=75);

const structure=normalizeTenderRow({document_type:'B54 Formulari standard',title:'Korrigjim - konstruksione metalike dhe struktura çeliku',relevance_score:42,category:'possible',match_reasons:[]});
assert.equal(structure.action,'patch');
assert.equal(structure.patch.category,'steel_structure');
assert.ok(structure.patch.relevance_score>=82);

assert.equal(normalizeTenderRow({document_type:'B05 Njoftim per Kontrat',title:'Furnizim me printera',relevance_score:0,match_reasons:[]}).action,'keep');

console.log('KEK tender postprocess smoke: OK');
