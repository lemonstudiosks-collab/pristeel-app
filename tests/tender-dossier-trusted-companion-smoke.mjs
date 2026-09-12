import fs from 'node:fs';
import assert from 'node:assert/strict';

const importer=fs.readFileSync('supabase/functions/pppp-tender-dossier-import/index.ts','utf8');

assert.match(importer,/if\(!familyCompatible\(extension\(candidate\.name\),extension\(expected\)\)\)continue;/,'identity confidence must never override an incompatible DOCX/XLSX/PDF family');
assert.match(importer,/function hasTrustedArchiveAnchor\(/,'trusted ZIP fallback must require an explicit batch anchor');
assert.match(importer,/function resolveTrustedCompanions\(/,'trusted ZIPs must support conservative companion resolution');
assert.match(importer,/compatible\.length!==1/,'companion candidate must be unique inside its file family');
assert.match(importer,/sameFamilyExpected\.length!==1/,'expected document must also be unique inside its file family');
assert.match(importer,/verdicts\.get\(c\.path\)\?\.status!==['"]mismatch['"]/,'cross-tender mismatch candidates must remain excluded from fallback');
assert.match(importer,/actualExt===['"]zip['"]&&hasTrustedArchiveAnchor\(candidates,matches,verdicts\)/,'companion fallback must be ZIP-only and batch-trust gated');
assert.doesNotMatch(importer,/if\(hinted&&hinted===normalizeName\(expected\)\)score\s*\+=\s*\d+/,'row hints must not blindly force an otherwise unqualified match');

console.log('Tender trusted archive companion matching smoke passed.');
