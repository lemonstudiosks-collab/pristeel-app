import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge=fs.readFileSync('pristeel-opportunities-waiting-bridge-v1.js','utf8');
const polish=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const interaction=fs.readFileSync('pristeel-home-canonical-interaction-v1.js','utf8');

assert.doesNotThrow(()=>new Function(bridge),'waiting bridge must be valid JavaScript');
assert.doesNotThrow(()=>new Function(polish),'Opportunities mindmap must be valid JavaScript');
assert.match(bridge,/draft_pending\|draft_created/,'draft-created registry rows must be recognized');
assert.match(bridge,/row\.status='waiting_for_send'/,'draft rows must map to the waiting lane in memory only');
assert.match(bridge,/next==='draft'\?'waiting':next/,'legacy draft lifecycle must normalize to waiting');
assert.match(polish,/VERSION='20260916-mindmap4'/,'new mindmap revision must be active');
assert.match(polish,/data-pst-opp-source/,'source branches must be first-class functional controls');
assert.match(polish,/data-pst-opp-field/,'field branches must be first-class functional controls');
assert.match(polish,/data-pst-opp-lifecycle/,'status branches must be first-class functional controls');
assert.match(polish,/data-pst-opp-view="mindmap"/,'Mindmap view control must exist');
assert.match(polish,/data-pst-opp-view="list"/,'List view control must exist');
assert.match(polish,/PSTPrimaryNavResilienceV10/,'Kthehu must use the final navigation owner');
assert.match(polish,/Të gjitha burimet/,'source reset must be explicit and functional');
assert.match(polish,/Të gjitha fushat/,'field reset must be explicit and functional');
assert.match(polish,/classifyField/,'field filters must be computed from real opportunity records');
assert.doesNotMatch(polish,/data-pcw-lifecycle='draft'[^\n]*display:none/,'new visible owner must not depend on styling a hidden legacy draft button');
assert.match(interaction,/pristeel-opportunities-filter-polish-v1\.js\?v=20260916-mindmap4/,'runtime must cache-bust the new Opportunities mindmap');
console.log('Opportunities waiting/mindmap layout smoke: OK');
