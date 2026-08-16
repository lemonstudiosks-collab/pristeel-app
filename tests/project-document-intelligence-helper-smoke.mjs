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

const dxf = analyzeText('0\nTEXT\n1\nHEA 200 S355 qty 4 L=3000 mm weight=168 kg\n0\nENDSEC\n', { name: 'drawing.dxf', mime: 'application/dxf' });
assert.equal(dxf.auto_bom_candidates.length, 1, 'ASCII DXF text entities should feed the same guarded extractor');

const dwg = classifyUnsupported('model.dwg', 'application/acad');
assert.equal(dwg.status, 'needs_conversion');
assert.match(dwg.reason, /dedicated CAD conversion/i);

console.log('project document intelligence helper smoke: ok');
