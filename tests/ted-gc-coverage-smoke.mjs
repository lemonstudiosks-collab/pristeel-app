import assert from 'node:assert/strict';
import { gcEvidence, queryForAwards } from '../scripts/ted-gc-award-sync-v2.mjs';
import { evaluateGcAwardPrecision } from '../scripts/ted-gc-award-precision-v3.mjs';

const genericGc={
  'notice-title':{eng:'Germany – Construction work – Neubau Logistikzentrum'},
  'classification-cpv':['45000000'],
  'title-proc':{eng:'Neubau Logistikzentrum'},
  'description-proc':{eng:'General construction of a new logistics building.'}
};
const genericEv=gcEvidence(genericGc);
assert.ok(genericEv.score>=82,'general construction award must remain a GC/GU candidate even without an explicit steel word');
assert.equal(genericEv.general_project,true);

const specialist={
  'notice-title':{eng:'Germany – Painting work – Neubau Grundschule'},
  'classification-cpv':['45442100'],
  'description-proc':{eng:'Painting and coating works only.'}
};
const specialistEv=gcEvidence(specialist);
assert.equal(specialistEv.score,0,'specialist trade packages must not be treated as GC/GU projects merely because the project itself is a new build');

const steelPackage={
  'notice-title':{eng:'Germany – Metalworking – Stahlbau- und Schlosserarbeiten'},
  'classification-cpv':['45262670'],
  'description-proc':{eng:'Fabrication and installation of steel stairs and railings.'}
};
const steelEv=gcEvidence(steelPackage);
assert.ok(steelEv.score>=82,'direct steel packages must remain eligible even when the category is specialist metalworking');
assert.equal(steelEv.direct_steel,true);

const q=queryForAwards(14);
assert.ok(q.includes('notice-type IN (can-standard can-social can-desg can-tran)'));
assert.ok(q.includes('classification-cpv IN (45000000)'),'GC award collector must scan the construction CPV family');
assert.ok(q.includes('publication-date = ('),'GC award collector must use a bounded overlap window');

const genericPrecision=evaluateGcAwardPrecision({
  title:'Germany – Construction work – Neubau Logistikzentrum',
  payload:{gc_project_evidence:{score:84,cpv:['45000000'],general_project:true,direct_steel:false,reasons:['general construction award / GC-GU candidate']}}
});
assert.equal(genericPrecision.relevant,true,'precision filter must retain general construction GC/GU candidates');
assert.equal(genericPrecision.reason,'general_construction_gc_candidate');

const specialistPrecision=evaluateGcAwardPrecision({
  title:'Germany – Painting work – Neubau Grundschule',
  payload:{gc_project_evidence:{score:84,cpv:['45442100'],general_project:false,direct_steel:false,reasons:['general construction award / GC-GU candidate']}}
});
assert.equal(specialistPrecision.relevant,false,'precision filter must remove specialist non-steel packages');
assert.equal(specialistPrecision.reason,'specialist_trade_not_gc_project');

console.log('TED GC coverage smoke: OK');
