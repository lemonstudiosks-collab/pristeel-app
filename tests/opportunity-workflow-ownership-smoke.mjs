import assert from 'node:assert/strict';
import fs from 'node:fs';

const direct=fs.readFileSync('.github/workflows/opportunity-direct-tender-v1.yml','utf8');
const ted=fs.readFileSync('.github/workflows/opportunity-engine-v2.yml','utf8');

assert.match(direct,/name:\s*PPPP Direct Tender Opportunity v1/,'Direct Tender workflow must remain explicit');
assert.match(direct,/run:\s*node scripts\/opportunity-protected-archive-runner\.mjs/,'Direct Tender must own protected archive analysis');
assert.match(direct,/run:\s*node scripts\/opportunity-engine-v2-runner\.mjs/,'Direct Tender must own KRPP\/APP dossier routing');
assert.match(direct,/run:\s*node scripts\/opportunity-rfq-drafts-v1\.mjs/,'Direct Tender must own supplier RFQ preparation');
assert.match(direct,/cron:\\s*'35 \\*\\/2 \\* \\* \\*'/,'Direct Tender cadence must remain aligned after the two-hour source ingest');

assert.match(ted,/name:\s*PPPP Opportunity Engine v2/,'TED workflow must remain explicit');
assert.match(ted,/run:\s*node scripts\/ted-gc-award-sync-v2\.mjs/,'TED workflow must retain award discovery');
assert.match(ted,/run:\s*node scripts\/ted-winner-company-classification\.mjs/,'TED workflow must retain winner classification');
assert.doesNotMatch(ted,/run:\s*node scripts\/opportunity-engine-v2-runner\.mjs/,'TED workflow must not duplicate Direct Tender dossier analysis');
assert.doesNotMatch(ted,/run:\s*node scripts\/opportunity-rfq-drafts-v1\.mjs/,'TED workflow must not duplicate Direct Tender RFQ preparation');
assert.doesNotMatch(ted,/PPPP_OPPORTUNITY_DOSSIER_MAX/,'TED workflow must not configure Direct Tender dossier batches');

console.log('Opportunity workflow single-owner smoke passed.');
