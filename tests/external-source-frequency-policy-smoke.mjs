import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(path, 'utf8');
const workflows = {
  APP_AL: await read('.github/workflows/app-albania-steel-sync.yml'),
  KRPP: await read('.github/workflows/krpp-public-steel-sync.yml'),
  MULTILATERAL: await read('.github/workflows/multilateral-procurement-sync.yml'),
  TED: await read('.github/workflows/ted-tender-sync.yml')
};

for (const [source, yaml] of Object.entries(workflows)) {
  const crons = [...yaml.matchAll(/cron:\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
  assert.equal(crons.length, 1, `${source} must have exactly one scheduled run`);
  assert.match(crons[0], /^\d+\s+5\s+\*\s+\*\s+\*$/, `${source} must run once in the UTC morning window`);
  assert.match(yaml, new RegExp(`external-source-daily-gate\\.mjs ${source}`), `${source} daily gate is missing`);
  assert.match(yaml, /steps\.source_gate\.outputs\.allowed == 'true'/, `${source} collector is not guarded`);
}

const kek = await read('.github/workflows/kek-tender-sync.yml');
const tedSecondary = await read('.github/workflows/opportunity-engine-v2.yml');
assert.doesNotMatch(kek, /^  schedule:/m, 'legacy KEK collector must not add a second KRPP schedule');
assert.doesNotMatch(tedSecondary, /^  schedule:/m, 'secondary TED pipeline must not add a second TED schedule');

const worker = await read('scripts/krpp-authenticated-fetch-worker.mjs');
const installer = await read('scripts/install-krpp-fetch-worker-macos.sh');
assert.doesNotMatch(worker, /runLoop|KRPP_FETCH_POLL_SECONDS|for\s*\(;;\)/, 'KRPP worker must not poll continuously');
assert.match(installer, /StartCalendarInterval/, 'KRPP worker must use a calendar schedule');
assert.match(installer, /<key>Hour<\/key><integer>6<\/integer>/, 'KRPP worker must run in the morning');
assert.match(installer, /<key>KeepAlive<\/key><false\/>/, 'KRPP worker must not be kept alive');
assert.doesNotMatch(installer, /kickstart/, 'installing the KRPP worker must not trigger an extra immediate access');

console.log('external source frequency policy smoke passed');
