const fs = require('fs');
const assert = require('assert');
const { execFileSync } = require('child_process');

const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');
const matches = [...bootstrap.matchAll(/['"]([^'"]+\.js)\?v=[^'"]+['"]/g)].map(m => m[1]);
assert(matches.length > 40, 'Bootstrap module list was not parsed correctly');
assert.strictEqual(new Set(matches).size, matches.length, 'Bootstrap contains duplicate module entries');

for (const file of matches) {
  assert(fs.existsSync(file), `Bootstrap references missing module: ${file}`);
  execFileSync(process.execPath, ['--check', file], { stdio:'pipe' });
}

const required = [
  'pristeel-business-command-center-v1.js',
  'pristeel-business-command-center-deep-gmail-v1.js',
  'pristeel-search-stable-v2.js',
  'pristeel-gmail-live-inbox-v1.js',
  'pristeel-gmail-intake-v2.js',
  'pristeel-gmail-create-project-fix-v1.js',
  'pristeel-project-command-view-v1.js',
  'pristeel-home-command-center-v2.js',
  'pristeel-redesign-finalizer-v1.js'
];
required.forEach(file => assert(matches.includes(file), `Critical module missing from bootstrap: ${file}`));

console.log(`Bootstrap coverage smoke test passed for ${matches.length} modules.`);
