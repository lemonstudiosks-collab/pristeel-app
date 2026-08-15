import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const stages = [
  ['Tender business boundary', 'tests/tender-business-flow-smoke.js'],
  ['Project lifecycle stages', 'tests/project-flow-actions-smoke.js'],
  ['RFQ draft governance', 'tests/rfq-draft-governance-smoke.js'],
  ['Supplier offer persistence/UI', 'tests/supplier-offer-postsave-ui-smoke.js'],
  ['Commercial comparison and our offer', 'tests/project-first-commercial-smoke.js'],
  ['Won offer to project status', 'tests/offer-project-status-sync-smoke.js'],
  ['Won-project execution entry', 'tests/project-first-execution-smoke.js'],
  ['Execution task bootstrap', 'tests/won-execution-bootstrap-smoke.mjs'],
  ['Invoice and payment task automation', 'tests/invoice-payment-task-sync-smoke.mjs'],
  ['Project data reconciliation', 'tests/project-data-reconcile-smoke.mjs']
];

for (const [label, file] of stages) {
  assert.equal(fs.existsSync(file), true, `${label}: missing smoke ${file}`);
  process.stdout.write(`\n[PPPP lifecycle] ${label}\n`);
  const run = spawnSync(process.execPath, [file], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: process.env
  });
  if (run.status !== 0) {
    if (run.stdout) process.stdout.write(run.stdout);
    if (run.stderr) process.stderr.write(run.stderr);
    throw new Error(`${label} failed via ${file} (exit ${run.status})`);
  }
  const tail = String(run.stdout || '').trim().split('\n').filter(Boolean).slice(-1)[0] || 'OK';
  process.stdout.write(`  ✓ ${tail}\n`);
}

const runtime = fs.readFileSync('pristeel-project-emails.js', 'utf8');
for (const required of [
  'pristeel-rfq-draft-governance-v1.js',
  'pristeel-supplier-offer-postsave-ui-v1.js',
  'pristeel-project-first-commercial-v1.js',
  'pristeel-offer-project-status-sync-v1.js',
  'pristeel-project-first-execution-v1.js'
]) {
  assert(runtime.includes(required), `Live bootstrap is missing lifecycle module ${required}`);
}

console.log('\nPPPP operational lifecycle smoke passed: Tender → Project → RFQ → Supplier Offer → Commercial/Our Offer → Won → Execution → Invoice/Payment → Reconciliation.');
