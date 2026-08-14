import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
let failed = false;

function fail(message) {
  failed = true;
  console.error(`PAGES ARTIFACT AUDIT ERROR: ${message}`);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`Missing file: ${rel}`);
    return '';
  }
  return fs.readFileSync(full, 'utf8');
}

function readJson(rel) {
  try {
    return JSON.parse(read(rel));
  } catch (error) {
    fail(`Invalid JSON in ${rel}: ${error.message}`);
    return {};
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function cleanModule(value) {
  return String(value || '').split('?')[0].replace(/^\.\//, '').trim();
}

function extractBootstrapModules(source) {
  const match = source.match(/var\s+files\s*=\s*\[([\s\S]*?)\];/);
  if (!match) {
    fail('Could not find the ordered bootstrap array in the runtime bootstrap.');
    return [];
  }
  const out = [];
  for (const m of match[1].matchAll(/['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g)) {
    out.push(cleanModule(m[1]));
  }
  if (!out.length) fail('Bootstrap array was found but no JavaScript modules were parsed.');
  return out;
}

function add(set, value) {
  const clean = cleanModule(value);
  if (clean) set.add(clean);
}

function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

function bytes(paths) {
  let total = 0;
  for (const rel of paths) {
    try { total += fs.statSync(path.join(root, rel)).size; } catch {}
  }
  return total;
}

function human(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / 1024 / 1024).toFixed(2)} MiB`;
}

const artifactManifest = readJson('pages-artifact-manifest.json');
const runtimeManifestPath = artifactManifest.runtimeManifest || 'runtime-manifest.json';
const runtime = readJson(runtimeManifestPath);

if (artifactManifest.mode !== 'AUDIT_ONLY') {
  fail(`Expected audit-only mode, got ${artifactManifest.mode || '(missing)'}. A deploy-mode change requires deliberate review.`);
}
if (artifactManifest.futureDeploymentChangeAuthorized !== false) {
  fail('futureDeploymentChangeAuthorized must remain false during the audit-only phase.');
}

const workflowPath = artifactManifest.deploymentWorkflow || '.github/workflows/static.yml';
const workflow = read(workflowPath);
if (workflow && !/upload-pages-artifact@v3[\s\S]*?path:\s*['"]?\.['"]?(?:\s|$)/m.test(workflow)) {
  fail(`${workflowPath} no longer clearly uploads path '.'. Review the deployment mode and update the artifact audit deliberately.`);
}

const candidate = new Set();
const entry = runtime.entrypoints || {};
add(candidate, entry.pagesEntry);
add(candidate, entry.applicationHtml);
add(candidate, entry.bootstrapLoader);
add(candidate, entry.bootstrap);

for (const file of Array.isArray(runtime.applicationDirectRuntime) ? runtime.applicationDirectRuntime : []) add(candidate, file);

const bootstrapPath = cleanModule(entry.bootstrap);
const bootstrapSource = bootstrapPath ? read(bootstrapPath) : '';
for (const file of extractBootstrapModules(bootstrapSource)) add(candidate, file);

for (const item of Array.isArray(runtime.dynamicRuntime) ? runtime.dynamicRuntime : []) add(candidate, item.module);
for (const item of Array.isArray(artifactManifest.additionalPublicAssets) ? artifactManifest.additionalPublicAssets : []) add(candidate, item.path);
for (const item of Array.isArray(artifactManifest.compatibilityPublicAssets) ? artifactManifest.compatibilityPublicAssets : []) add(candidate, item.path);

for (const rel of candidate) {
  if (!exists(rel)) fail(`Candidate public artifact is missing: ${rel}`);
}

for (const check of Array.isArray(artifactManifest.referenceChecks) ? artifactManifest.referenceChecks : []) {
  const source = cleanModule(check.source);
  const needle = String(check.contains || '');
  if (!source || !needle) {
    fail('referenceChecks entries require both source and contains.');
    continue;
  }
  const text = read(source);
  if (text && !text.includes(needle)) {
    fail(`${source} no longer references '${needle}'. ${check.reason || ''}`.trim());
  }
}

const allRepoFiles = walk(root).sort();
const candidateFiles = [...candidate].sort();
const extraFiles = allRepoFiles.filter((rel) => !candidate.has(rel));

const candidateBytes = bytes(candidateFiles);
const repoBytes = bytes(allRepoFiles);
const pct = repoBytes ? (candidateBytes / repoBytes) * 100 : 0;

console.log('PPPP GitHub Pages artifact audit');
console.log(`Mode: ${artifactManifest.mode}`);
console.log(`Audited baseline commit: ${artifactManifest.auditedAtCommit || '(not recorded)'}`);
console.log(`Current Pages upload path: ${artifactManifest.currentDeployment?.uploadPath || '(unknown)'}`);
console.log(`Runtime bootstrap modules discovered: ${extractBootstrapModules(bootstrapSource).length}`);
console.log(`Candidate public artifact files: ${candidateFiles.length}`);
console.log(`Candidate public artifact size: ${human(candidateBytes)}`);
console.log(`Repository checkout files (excluding .git/node_modules): ${allRepoFiles.length}`);
console.log(`Repository checkout size: ${human(repoBytes)}`);
console.log(`Candidate artifact share of checkout bytes: ${pct.toFixed(1)}%`);
console.log(`Files currently deployed only because Pages uploads the whole repo: ${extraFiles.length}`);
console.log('No deployment path was changed by this audit.');

if (failed) process.exitCode = 1;
else console.log('Pages artifact audit OK.');
