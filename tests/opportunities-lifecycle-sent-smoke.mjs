import fs from 'node:fs';
import assert from 'node:assert/strict';

const surface=fs.readFileSync('pristeel-ted-sales-surface-v1.js','utf8');
new Function(surface);

assert.match(surface,/data-pcw-lifecycle=\"all\"/,'presentation bridge must target the duplicate lifecycle Të gjitha control');
assert.match(surface,/if\(all\)all\.remove\(\)/,'duplicate lifecycle Të gjitha must be removed while source Të gjitha stays owned by the canonical workflow');
assert.match(surface,/Email i dërguar/,'sent Gmail state must be named Email i dërguar');
assert.match(surface,/Draft i papërfunduar/,'a genuinely unsent draft must never be mislabeled as sent');
assert.match(surface,/gmail_thread_id=in\\\.\\\(/,'sent-email hydration must recognize the canonical project_emails thread query');
assert.match(surface,/ids\.length<=40/,'large Gmail thread lookups must be bounded into safe chunks');
assert.match(surface,/PSTProjectCentricWorkflowV1/,'the bridge must refresh the existing Opportunities owner instead of creating a parallel workflow');
assert.doesNotMatch(surface,/gmail-send|sendMessage|messages\/send|users\/messages\/send/,'presentation bridge must never send external email');

console.log('Opportunities sent-email lifecycle smoke passed.');
