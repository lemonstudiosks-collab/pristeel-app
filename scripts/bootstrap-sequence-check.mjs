import fs from 'node:fs';
import crypto from 'node:crypto';

const BOOTSTRAP = 'pristeel-project-emails.js';
const EXPECTED_COUNT = 149;
const EXPECTED_DIGEST = '96de57adc1d370cd160702e37e487c1046391f7b71c4c2db4a4021a6b843eacc';

function fail(message) {
  console.error(`BOOTSTRAP SEQUENCE ERROR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(BOOTSTRAP)) fail(`Missing bootstrap file: ${BOOTSTRAP}`);

const source = fs.readFileSync(BOOTSTRAP, 'utf8');
const match = source.match(/var\s+files\s*=\s*\[([\s\S]*?)\];/);
if (!match) fail('Could not find the current ordered `var files=[...]` registry.');

const entries = [];
for (const item of match[1].matchAll(/['\"]([^'\"]+\.js(?:\?[^'\"]*)?)['\"]/g)) {
  entries.push(item[1]);
}

if (entries.length !== EXPECTED_COUNT) {
  fail(`Module count changed. expected=${EXPECTED_COUNT} actual=${entries.length}`);
}

const duplicates = entries.filter((entry, index) => entries.indexOf(entry) !== index);
if (duplicates.length) fail(`Duplicate versioned bootstrap entries: ${[...new Set(duplicates)].join(', ')}`);

const digest = crypto
  .createHash('sha256')
  .update(`${entries.join('\n')}\n`, 'utf8')
  .digest('hex');

if (digest !== EXPECTED_DIGEST) {
  fail(
    `Ordered bootstrap fingerprint changed.\n` +
    `  expected: ${EXPECTED_DIGEST}\n` +
    `  actual:   ${digest}\n` +
    'A module, its position, or its cache-version query string changed. Review deliberately before updating the baseline.'
  );
}

console.log('PPPP bootstrap sequence guard');
console.log(`Bootstrap: ${BOOTSTRAP}`);
console.log(`Ordered versioned modules: ${entries.length}`);
console.log(`Sequence SHA-256: ${digest}`);
console.log('Bootstrap sequence OK.');
