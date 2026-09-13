import fs from 'node:fs';
import assert from 'node:assert/strict';

const src = fs.readFileSync(new URL('../pristeel-bom-rfq-autoflow-v1.js', import.meta.url), 'utf8');

assert.match(src, /function installLegacyProjectHydration\(\)/, 'legacy project hydration wrapper must exist');
assert.match(src, /page==='bom'\|\|page==='rfq'/, 'BOM and RFQ legacy handoffs must hydrate the selected project');
assert.match(src, /window\.loadProject\(id,true\)/, 'legacy handoff must reuse canonical loadProject hydration');
assert.match(src, /window\.pstPiLegacy=wrapped/, 'pstPiLegacy must be wrapped rather than replaced by a separate navigation path');
assert.match(src, /setTimeout\(installLegacyProjectHydration/, 'wrapper installation must retry across module load order');

console.log('bom legacy project hydration smoke: ok');
