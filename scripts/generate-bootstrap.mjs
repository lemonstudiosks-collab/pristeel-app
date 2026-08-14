import fs from 'node:fs';
import crypto from 'node:crypto';

const REGISTRY_PATH = 'runtime-bootstrap-order.json';
const CHECK_ONLY = process.argv.includes('--check');

function fail(message) {
  console.error(`BOOTSTRAP GENERATOR ERROR: ${message}`);
  process.exit(1);
}

function sequenceDigest(files) {
  return crypto.createHash('sha256').update(`${files.join('\n')}\n`, 'utf8').digest('hex');
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto
    .createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function render(files) {
  const registry = files
    .map((file, index) => `  '${file}'${index === files.length - 1 ? '' : ','}`)
    .join('\n');

  return `/* PRISTEEL email modules bootstrap */\n(function(){\n'use strict';\nvar files=[\n${registry}\n];\nvar completed=false;\nfunction ready(){if(completed)return;completed=true;window.__pstModulesReady=true;try{document.dispatchEvent(new CustomEvent('pst:modules-ready'));}catch(e){}}\nfunction load(i){if(i>=files.length||window.__pstAbortBootstrap){ready();return;}var s=document.createElement('script');s.src=files[i];s.defer=true;s.onload=function(){if(window.__pstAbortBootstrap)ready();else load(i+1);};s.onerror=function(){console.error('Nuk u ngarkua moduli:',files[i]);if(window.__pstAbortBootstrap)ready();else load(i+1);};document.head.appendChild(s);}\nload(0);\n})();`;
}

if (!fs.existsSync(REGISTRY_PATH)) fail(`Missing registry: ${REGISTRY_PATH}`);

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (error) {
  fail(`${REGISTRY_PATH} is invalid JSON: ${error.message}`);
}

if (registry.schemaVersion !== 1) fail(`Unsupported schemaVersion: ${registry.schemaVersion}`);
if (!registry.runtimeArtifact) fail('runtimeArtifact is required.');
if (!Array.isArray(registry.files) || !registry.files.length) fail('files must be a non-empty ordered array.');
if (registry.moduleCount !== registry.files.length) {
  fail(`moduleCount mismatch. declared=${registry.moduleCount} actual=${registry.files.length}`);
}

const seen = new Set();
for (const file of registry.files) {
  if (typeof file !== 'string' || !file.endsWith('.js') && !file.includes('.js?')) {
    fail(`Invalid bootstrap entry: ${String(file)}`);
  }
  if (/[\r\n']/.test(file)) fail(`Unsafe bootstrap entry: ${file}`);
  if (seen.has(file)) fail(`Duplicate bootstrap entry: ${file}`);
  seen.add(file);
}

const digest = sequenceDigest(registry.files);
if (digest !== registry.sequenceSha256) {
  fail(`Registry sequence fingerprint mismatch. declared=${registry.sequenceSha256} actual=${digest}`);
}

const generated = render(registry.files);
const artifactPath = registry.runtimeArtifact;

if (CHECK_ONLY) {
  if (!fs.existsSync(artifactPath)) fail(`Missing generated runtime artifact: ${artifactPath}`);
  const current = fs.readFileSync(artifactPath, 'utf8');
  if (current !== generated) {
    fail(
      `${artifactPath} is not the deterministic output of ${REGISTRY_PATH}. ` +
      'Run `node scripts/generate-bootstrap.mjs` and review the resulting runtime change deliberately.'
    );
  }
  console.log('PPPP bootstrap generator check');
  console.log(`Registry: ${REGISTRY_PATH}`);
  console.log(`Runtime artifact: ${artifactPath}`);
  console.log(`Ordered modules: ${registry.files.length}`);
  console.log(`Sequence SHA-256: ${digest}`);
  console.log(`Runtime Git blob SHA: ${gitBlobSha(generated)}`);
  console.log('Generated bootstrap artifact is exact.');
} else {
  fs.writeFileSync(artifactPath, generated, 'utf8');
  console.log(`Wrote ${artifactPath} from ${REGISTRY_PATH}.`);
  console.log(`Ordered modules: ${registry.files.length}`);
  console.log(`Sequence SHA-256: ${digest}`);
  console.log(`Runtime Git blob SHA: ${gitBlobSha(generated)}`);
}
