import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const functions = [
  'pppp-storage-path-repair',
  'pppp-gmail-fast-ingest-v2',
  'pppp-whatsapp-import-v1',
  'pppp-ted-price-enrichment-v1',
];

for (const name of functions) {
  const entrypoint = path.join(root, 'supabase/functions', name, 'index.ts');
  assert(fs.existsSync(entrypoint), `missing deployed Edge Function source: ${name}`);
  const source = fs.readFileSync(entrypoint, 'utf8');
  assert.match(source, /Deno\.serve\s*\(/, `${name} must contain its deployed entrypoint`);
  assert.doesNotMatch(source, /isymxqfqzkchbsrbhucf/, `${name} must not target legacy Supabase`);
  assert.doesNotMatch(source, /sb_secret_[a-zA-Z0-9_-]+/, `${name} must not contain a secret key`);
  assert.doesNotMatch(source, /eyJ[a-zA-Z0-9_-]{20,}/, `${name} must not contain a JWT literal`);
}

const retiredRepair = fs.readFileSync(
  path.join(root, 'supabase/retired-functions/pppp-storage-path-repair/index.ts'),
);
assert.equal(
  crypto.createHash('sha256').update(retiredRepair).digest('hex'),
  '53ec841ae0c5d345f0df0867a059a86fcb979d9f1aa649e8b0eff12674e1ae76',
  'the exact destructive repair implementation must remain archived for audit',
);
const repairTombstone = fs.readFileSync(
  path.join(root, 'supabase/functions/pppp-storage-path-repair/index.ts'),
  'utf8',
);
assert.match(repairTombstone, /function_retired/);
assert.match(repairTombstone, /status:\s*410/);
assert.doesNotMatch(repairTombstone, /SUPABASE_SERVICE_ROLE_KEY/);

const deployment = JSON.parse(fs.readFileSync(
  path.join(root, 'supabase/functions/PRODUCTION_DEPLOYMENT_SNAPSHOT_2026-09-22.json'),
  'utf8',
));
assert.equal(deployment.project_ref, 'awqfpnzqwfjrjefoktgd');
assert.equal(deployment.functions.length, 38, 'deployment snapshot must cover every live Edge Function');
for (const name of functions) {
  const item = deployment.functions.find((entry) => entry.slug === name);
  assert(item, `deployment metadata missing for ${name}`);
  assert.equal(item.status, 'ACTIVE');
  assert.equal(item.verify_jwt, true);
  assert.match(item.ezbr_sha256, /^[a-f0-9]{64}$/);
  const source = fs.readFileSync(path.join(root, 'supabase/functions', name, 'index.ts'));
  assert.equal(
    crypto.createHash('sha256').update(source).digest('hex'),
    item.source_export_sha256,
    `${name} source export must remain byte-identical`,
  );
}

const historyDir = path.join(root, 'supabase/live-migration-history');
const snapshots = fs.readdirSync(historyDir).filter((name) => name.endsWith('.sql')).sort();
assert.equal(snapshots.length, 15, 'all missing 2026-09-21/22 production migrations must be preserved');
const migrationManifest = JSON.parse(fs.readFileSync(path.join(historyDir, 'manifest.json'), 'utf8'));
assert.equal(migrationManifest.project_ref, 'awqfpnzqwfjrjefoktgd');
assert.equal(migrationManifest.migrations.length, snapshots.length);

for (const name of snapshots) {
  const sql = fs.readFileSync(path.join(historyDir, name), 'utf8').replace(/\r\n/g, '\n');
  assert(sql.trim().length > 0, `${name} must not be empty`);
  assert.doesNotMatch(sql, /sb_secret_[a-zA-Z0-9_-]+/, `${name} must not contain a secret key`);
  assert.doesNotMatch(sql, /eyJ[a-zA-Z0-9_-]{20,}/, `${name} must not contain a JWT literal`);
  assert(
    !fs.existsSync(path.join(root, 'supabase/migrations', name)),
    `${name} must stay outside the replayable migration directory`,
  );
  const expected = migrationManifest.migrations.find((entry) => entry.file === name);
  assert(expected, `manifest entry missing for ${name}`);
  const normalized = sql.replace(/\n$/, '');
  assert.equal(
    crypto.createHash('md5').update(normalized).digest('hex'),
    expected.normalized_md5,
    `${name} must match the statement stored in live production history`,
  );
}

const readme = fs.readFileSync(path.join(historyDir, 'README.md'), 'utf8');
assert.match(readme, /Do not move them into the active migration directory or replay them blindly/i);

console.log('Production source backfill smoke OK');
