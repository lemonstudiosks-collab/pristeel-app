import assert from 'node:assert/strict';
import fs from 'node:fs';

const src=fs.readFileSync('pristeel-tender-priority-actions-v1.js','utf8');

assert.match(src,/prepareDraftBatch\(target\)/,'batch draft entrypoint must exist');
assert.match(src,/Math\.min\(40,/,'batch draft target must be capped at 40');
assert.match(src,/contact_identity_verified===true/,'batch must require verified contact identity');
assert.match(src,/winner_role_verified===true/,'batch must require verified company role');
assert.match(src,/human_approved:true/,'each selected action must use the explicit human-approved draft route');
assert.doesNotMatch(src,/cooldown_override:true[^\n]*prepareDraftBatch/,'batch must not bypass communication cooldowns');
assert.match(src,/auto_send:false/,'batch result must state that auto-send is disabled');
assert.match(src,/Përgatit 40 draft-e/,'the control must state the exact bounded action');

console.log('opportunity batch draft safety smoke passed');
