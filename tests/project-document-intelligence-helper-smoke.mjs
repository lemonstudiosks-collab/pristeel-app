import assert from 'node:assert/strict';
import { analyzeText, classifyUnsupported, extOf, mimeGuess } from '../supabase/functions/project-document-intake/document-intelligence.mjs';

assert.equal(extOf('drawing.DXF'), 'dxf');
assert.equal(mimeGuess('table.xlsx', ''), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

const clear = analyzeText(`
Project: H24X
Drawing No: A-103
Revision: B
Execution class EXC3
EN 1090-2
HEB 300 S355 qty 8 L=6200 mm weight=915 kg
`, { name: 'A-103.txt', mime: 'text/plain' });
assert.deepEqual(clear.facts.steel_grades, ['S355']);
assert.deepEqual(clear.facts.execution_classes, ['EXC3']);
assert.equal(clear.bom_candidates.length, 1);
assert.equal(clear.auto_bom_candidates.length, 1, 'complete explicit row must qualify for controlled auto-BOM');
assert.equal(clear.auto_bom_candidates[0].profile, 'HEB');
assert.equal(clear.auto_bom_candidates[0].dim, '300');
assert.equal(clear.auto_bom_candidates[0].pcs, 8);
assert.equal(clear.auto_bom_candidates[0].len_mm, 6200);
assert.equal(clear.auto_bom_candidates[0].kg, 915);
assert(clear.auto_bom_candidates[0].confidence >= 0.96);

const unclear = analyzeText('IPE 240 qty 12 L=4850 mm', { name: 'unclear.txt', mime: 'text/plain' });
assert.equal(unclear.auto_bom_candidates.length, 0, 'missing material/weight must never auto-write BOM');
assert.equal(unclear.review_bom_candidates.length, 1, 'unclear technical row must stay review-first');

const plateSchedule = analyzeText(`
SPECIFIKACIJA I PRORAČUN TEŽINE ČELIČNIH LIMOVA
Kvaliteta: AH36 | Zahtjev za ponudu s 3.2 BV certifikatom
Količina (kom)
Kvaliteta
Dužina L (mm)
Širina W (mm)
Debljina T (mm)
Težina / kom (kg)
Ukupna težina (kg)
Ukupna težina (t)
172AH3613,4202,38061,504.36108,313.57108.314
28AH3612,0002,60061,469.5211,756.1611.756
UKUPNO80-----120,069.73120.070 t
`, { name: 'plates.pdf', mime: 'application/pdf' });
assert.deepEqual(plateSchedule.facts.steel_grades, ['AH36']);
assert(plateSchedule.facts.certificates.includes('3.2 BV'));
assert.equal(plateSchedule.auto_bom_candidates.length, 2, 'validated plate schedule rows should qualify for auto-BOM');
assert.equal(plateSchedule.auto_bom_candidates[0].dim, '13420x2380x6');
assert.equal(plateSchedule.auto_bom_candidates[0].pcs, 72);
assert.equal(plateSchedule.auto_bom_candidates[0].validated_schedule_total, true);

const badTotal = analyzeText(`
Količina Dužina Širina Debljina Težina / kom
172AH3613,4202,38061,504.36108,313.57108.314
UKUPNO71-----108,313.57108.314 t
`, { name: 'bad-plates.pdf', mime: 'application/pdf' });
assert.equal(badTotal.auto_bom_candidates.length, 0, 'plate schedule with inconsistent stated totals must not auto-write');
assert.equal(badTotal.review_bom_candidates.length, 1);

const dxf = analyzeText('0\nTEXT\n1\nHEA 200 S355 qty 4 L=3000 mm weight=168 kg\n0\nENDSEC\n', { name: 'drawing.dxf', mime: 'application/dxf' });
assert.equal(dxf.auto_bom_candidates.length, 1, 'ASCII DXF text entities should feed the same guarded extractor');

const dwg = classifyUnsupported('model.dwg', 'application/acad');
assert.equal(dwg.status, 'needs_conversion');
assert.match(dwg.reason, /dedicated CAD conversion/i);

console.log('project document intelligence helper smoke: ok');
