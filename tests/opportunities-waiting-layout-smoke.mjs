import fs from 'node:fs';
import assert from 'node:assert/strict';

const bridge=fs.readFileSync('pristeel-opportunities-waiting-bridge-v1.js','utf8');
const polish=fs.readFileSync('pristeel-opportunities-filter-polish-v1.js','utf8');
const interaction=fs.readFileSync('pristeel-home-canonical-interaction-v1.js','utf8');

assert.doesNotThrow(()=>new Function(bridge),'waiting bridge must be valid JavaScript');
assert.doesNotThrow(()=>new Function(polish),'filter polish must be valid JavaScript');

assert.match(bridge,/draft_pending\|draft_created/,'draft-created registry rows must be recognized');
assert.match(bridge,/row\.status='waiting_for_send'/,'draft registry rows must be mapped to the waiting lane in memory only');
assert.match(bridge,/next==='draft'\?'waiting':next/,'legacy draft lifecycle state must normalize to waiting');
assert.match(bridge,/if\(lifecycle==='all'\)state\.source='all'/,'top-level Të gjitha must also clear the source filter');
assert.doesNotMatch(bridge,/addEventListener\s*\(\s*['"]click/,'waiting bridge must not become a second click owner');

assert.match(polish,/data-pcw-lifecycle='draft'[^\n]*display:none|Draft-ready work belongs to "Në pritje"/,'Draft i përgatitur must not remain a visible filter');
assert.match(polish,/data-pcw-source='all'/,'duplicate source-level Të gjitha must be hidden');
assert.match(polish,/data-pcw-source='UNDP_KOSOVO'/,'UNDP Kosovo must be removed from the visible source row');
assert.match(polish,/flex-wrap:wrap!important;overflow:visible!important/,'source controls must remain fully visible instead of horizontal scrolling');
assert.doesNotMatch(polish,/overflow-x:auto!important/,'source row must not require horizontal scrolling');
assert.match(polish,/data-pcw-source='WORLD_BANK'/,'World Bank source must retain a compact icon');
assert.match(polish,/data-pcw-source='KRPP'/,'KRPP source must retain a compact icon');
assert.match(polish,/data-pcw-source='TED'/,'TED source must retain a compact icon');
assert.match(interaction,/pristeel-opportunities-filter-polish-v1\.js\?v=20260913-compact2/,'runtime must cache-bust the new Opportunities UI');

console.log('Opportunities waiting/layout smoke: OK');
