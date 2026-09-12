import fs from 'node:fs';
import crypto from 'node:crypto';

function replaceOnce(text, oldText, newText, label) {
  const first = text.indexOf(oldText);
  if (first < 0) throw new Error(`Guard failed: missing ${label}`);
  if (text.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`Guard failed: duplicate ${label}`);
  return text.slice(0, first) + newText + text.slice(first + oldText.length);
}

function gitBlobSha(text) {
  const body = Buffer.from(text.replace(/\r\n/g, '\n'), 'utf8');
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function bootstrapDigest(text) {
  const match = text.match(/var\s+files\s*=\s*\[([\s\S]*?)\];/);
  if (!match) throw new Error('Guard failed: bootstrap registry missing');
  const entries = [...match[1].matchAll(/['\"]([^'\"]+\.js(?:\?[^'\"]*)?)['\"]/g)].map((m) => m[1]);
  if (entries.length !== 152) throw new Error(`Guard failed: bootstrap module count changed (${entries.length})`);
  return crypto.createHash('sha256').update(`${entries.join('\n')}\n`, 'utf8').digest('hex');
}

const finalizerPath = 'pristeel-redesign-finalizer-v1.js';
const bootstrapPath = 'pristeel-project-emails.js';
const manifestPath = 'runtime-manifest.json';
const sequenceCheckPath = 'scripts/bootstrap-sequence-check.mjs';

let finalizer = fs.readFileSync(finalizerPath, 'utf8');
finalizer = replaceOnce(
  finalizer,
  'pristeel-project-centric-workflow-v1.js?v=20260911-lifecycle1',
  'pristeel-project-centric-workflow-v1.js?v=20260912-multisource1',
  'project-centric cache key'
);
fs.writeFileSync(finalizerPath, finalizer);

let bootstrap = fs.readFileSync(bootstrapPath, 'utf8');
bootstrap = replaceOnce(
  bootstrap,
  'pristeel-redesign-finalizer-v1.js?v=20260906-krppzip1',
  'pristeel-redesign-finalizer-v1.js?v=20260912-multisource1',
  'redesign-finalizer cache key'
);
fs.writeFileSync(bootstrapPath, bootstrap);

const blobSha = gitBlobSha(bootstrap);
const digest = bootstrapDigest(bootstrap);

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.entrypoints || manifest.entrypoints.bootstrap !== bootstrapPath) {
  throw new Error('Guard failed: runtime manifest bootstrap owner changed');
}
manifest.entrypoints.bootstrapGitBlobSha = blobSha;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

let sequenceCheck = fs.readFileSync(sequenceCheckPath, 'utf8');
const oldDigestMatch = sequenceCheck.match(/const EXPECTED_DIGEST = '([0-9a-f]{64})';/);
if (!oldDigestMatch) throw new Error('Guard failed: bootstrap sequence digest baseline missing');
sequenceCheck = replaceOnce(
  sequenceCheck,
  `const EXPECTED_DIGEST = '${oldDigestMatch[1]}';`,
  `const EXPECTED_DIGEST = '${digest}';`,
  'bootstrap sequence digest'
);
fs.writeFileSync(sequenceCheckPath, sequenceCheck);

console.log(`cache-bust applied; bootstrapBlob=${blobSha}; sequenceSha256=${digest}`);
