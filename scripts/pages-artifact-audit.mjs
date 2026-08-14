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
    if (entry.name === '.git' || entry.name === 'node_modules' || (base === '' && entry.name === '_site')) continue;
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

const mode = artifactManifest.mode;
if (mode !== 'PRODUCTION_ARTIFACT') {
  fail(`Expected PRODUCTION_ARTIFACT mode, got ${mode || '(missing)'}.`);
}
if (artifactManifest.productionArtifactDeploymentEnabled !== true) {
  fail('productionArtifactDeploymentEnabled must be true in production artifact mode.');
}

const deployment = artifactManifest.currentDeployment || {};
const expectedUploadPath = String(deployment.uploadPath || '').trim();
if (expectedUploadPath !== '_site') {
  fail(`Production Pages uploadPath must be '_site', got ${expectedUploadPath || '(missing)'}.`);
}
if (deployment.wholeRepository !== false) {
  fail('currentDeployment.wholeRepository must be false in production artifact mode.');
}

const workflowPath = artifactManifest.deploymentWorkflow || '.github/workflows/static.yml';
const workflow = read(workflowPath);
if (workflow) {
  const buildNeedle = 'node scripts/pages-artifact-build.mjs';
  const uploadActionNeedle = 'uses: actions/upload-pages-artifact@v3';
  const uploadPathNeedleSingle = `path: '${expectedUploadPath}'`;
  const uploadPathNeedleDouble = `path: "${expectedUploadPath}"`;
  const uploadPathNeedleBare = `path: ${expectedUploadPath}`;

  const buildIndex = workflow.indexOf(buildNeedle);
  const uploadActionIndex = workflow.indexOf(uploadActionNeedle);
  let uploadPathIndex = workflow.indexOf(uploadPathNeedleSingle);
  if (uploadPathIndex < 0) uploadPathIndex = workflow.indexOf(uploadPathNeedleDouble);
  if (uploadPathIndex < 0) uploadPathIndex = workflow.indexOf(uploadPathNeedleBare);

  if (buildIndex < 0) fail(`${workflowPath} does not build the verified Pages artifact before deployment.`);
  if (uploadActionIndex < 0) fail(`${workflowPath} does not use actions/upload-pages-artifact@v3.`);
  if (uploadPathIndex < 0) fail(`${workflowPath} does not upload path '${expectedUploadPath}'.`);
  if (buildIndex >= 0 && uploadActionIndex >= 0 && buildIndex > uploadActionIndex) {
    fail(`${workflowPath} uploads Pages before building the verified artifact.`);
  }
  if (uploadActionIndex >= 0 && uploadPathIndex >= 0 && uploadPathIndex < uploadActionIndex) {
    fail(`${workflowPath} production upload path is not attached to the Pages upload step.`);
  }
  if (/path:\s*['"]?\.['"]?(?:\s|$)/m.test(workflow)) {
    fail(`${workflowPath} still contains a whole-repository Pages upload path '.'.`);
  }
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
const bootstrapModules = extractBootstrapModules(bootstrapSource);
for (const file of bootstrapModules) add(candidate, file);

for (const item of Array.isArray(runtime.dynamicRuntime) ? runtime.dynamicRuntime : []) add(candidate, item.module);
for (const item of Array.isArray(artifactManifest.additionalPublicAssets) ? artifactManifest.additionalPublicAssets : []) add(candidate, item.path);
for (const item of Array.isArray(artifactManifest.compatibilityPublicAssets) ? artifactManifest.compatibilityPublicAssets : []) add(candidate, item.path);

for (const rel of candidate) {
  if (!exists(rel)) fail(`Production public artifact source is missing: ${rel}`);
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
const excludedFiles = allRepoFiles.filter((rel) => !candidate.has(rel));

const candidateBytes = bytes(candidateFiles);
const repoBytes = bytes(allRepoFiles);
const pct = repoBytes ? (candidateBytes / repoBytes) * 100 : 0;

console.log('PPPP GitHub Pages production artifact audit');
console.log(`Mode: ${mode}`);
console.log(`Production switch baseline commit: ${artifactManifest.productionSwitchBaselineCommit || '(not recorded)'}`);
console.log(`Production Pages upload path: ${expectedUploadPath}`);
console.log(`Runtime bootstrap modules discovered: ${bootstrapModules.length}`);
console.log(`Production public artifact source files: ${candidateFiles.length}`);
console.log(`Production public artifact size: ${human(candidateBytes)}`);
console.log(`Repository checkout files (excluding .git/node_modules/_site): ${allRepoFiles.length}`);
console.log(`Repository checkout size: ${human(repoBytes)}`);
console.log(`Production artifact share of checkout bytes: ${pct.toFixed(1)}%`);
console.log(`Repository files excluded from production Pages: ${excludedFiles.length}`);
console.log('Production Pages deployment policy verified: build first, upload _site only.');

if (failed) process.exitCode = 1;
else console.log('Pages production artifact audit OK.');
