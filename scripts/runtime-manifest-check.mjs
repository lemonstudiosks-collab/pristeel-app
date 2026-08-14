import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const manifestPath = path.join(root, 'runtime-manifest.json');

function fail(message) {
  console.error(`RUNTIME MANIFEST ERROR: ${message}`);
  process.exitCode = 1;
}

function read(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    fail(`Missing file: ${rel}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto
    .createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function cleanModule(entry) {
  return String(entry || '').split('?')[0].trim();
}

function extractBootstrapModules(source) {
  const match = source.match(/var\s+files\s*=\s*\[([\s\S]*?)\];/);
  if (!match) {
    fail('Could not find the ordered `var files=[...]` bootstrap list.');
    return [];
  }
  const entries = [];
  for (const m of match[1].matchAll(/['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g)) {
    entries.push(cleanModule(m[1]));
  }
  if (!entries.length) fail('Bootstrap module list was found but no JavaScript entries were parsed.');
  return entries;
}

function extractLocalScriptTags(source) {
  const entries = [];
  for (const m of source.matchAll(/<script\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/gi)) {
    const raw = String(m[1] || '').trim();
    if (!raw || /^(?:https?:)?\/\//i.test(raw) || /^data:/i.test(raw)) continue;
    const module = cleanModule(raw.replace(/^\.\//, ''));
    if (/\.js$/i.test(module)) entries.push(module);
  }
  return entries;
}

function headInfo() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return '(git HEAD unavailable)';
  }
}

if (!fs.existsSync(manifestPath)) {
  fail('runtime-manifest.json is missing.');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`runtime-manifest.json is invalid JSON: ${error.message}`);
  process.exit(1);
}

const requiredEntryKeys = [
  'pagesEntry',
  'applicationHtml',
  'bootstrapLoader',
  'bootstrapLoaderGitBlobSha',
  'bootstrap',
  'bootstrapGitBlobSha'
];
for (const key of requiredEntryKeys) {
  if (!manifest.entrypoints || !manifest.entrypoints[key]) fail(`Manifest entrypoints.${key} is required.`);
}

const pagesEntry = manifest.entrypoints?.pagesEntry || '';
const applicationHtml = manifest.entrypoints?.applicationHtml || '';
const bootstrapLoaderPath = manifest.entrypoints?.bootstrapLoader || '';
const bootstrapPath = manifest.entrypoints?.bootstrap || '';

const indexSource = read(pagesEntry);
const applicationSource = read(applicationHtml);
const bootstrapLoaderSource = read(bootstrapLoaderPath);
const bootstrapSource = read(bootstrapPath);

if (indexSource && applicationHtml && !indexSource.includes(applicationHtml)) {
  fail(`${pagesEntry} no longer references ${applicationHtml}.`);
}

const directRuntime = (Array.isArray(manifest.applicationDirectRuntime) ? manifest.applicationDirectRuntime : []).map(cleanModule);
if (!directRuntime.length) fail('applicationDirectRuntime must list the local scripts loaded directly by the application HTML.');

const actualDirectRuntime = extractLocalScriptTags(applicationSource);
if (JSON.stringify(actualDirectRuntime) !== JSON.stringify(directRuntime)) {
  fail(
    `${applicationHtml} local <script src> runtime changed.\n` +
    `  manifest: ${JSON.stringify(directRuntime)}\n` +
    `  actual:   ${JSON.stringify(actualDirectRuntime)}\n` +
    'Review the direct application runtime and update runtime-manifest.json deliberately.'
  );
}

for (const module of directRuntime) {
  if (!module) continue;
  if (!exists(module)) fail(`Application direct runtime file is missing: ${module}`);
}

if (bootstrapLoaderPath && !directRuntime.includes(bootstrapLoaderPath)) {
  fail(`Bootstrap loader ${bootstrapLoaderPath} is not registered in applicationDirectRuntime.`);
}

if (bootstrapLoaderSource && manifest.entrypoints?.bootstrapLoaderGitBlobSha) {
  const actualBlob = gitBlobSha(bootstrapLoaderSource);
  if (actualBlob !== manifest.entrypoints.bootstrapLoaderGitBlobSha) {
    fail(
      `${bootstrapLoaderPath} changed (expected Git blob ${manifest.entrypoints.bootstrapLoaderGitBlobSha}, actual ${actualBlob}). ` +
      'Review its dynamic runtime loading and then update runtime-manifest.json.'
    );
  }
}

if (bootstrapLoaderSource && bootstrapPath && !bootstrapLoaderSource.includes(bootstrapPath)) {
  fail(`${bootstrapLoaderPath} no longer loads ${bootstrapPath}. If boot ownership changed, update the manifest deliberately.`);
}

if (bootstrapSource && manifest.entrypoints?.bootstrapGitBlobSha) {
  const actualBlob = gitBlobSha(bootstrapSource);
  if (actualBlob !== manifest.entrypoints.bootstrapGitBlobSha) {
    fail(
      `${bootstrapPath} changed (expected Git blob ${manifest.entrypoints.bootstrapGitBlobSha}, actual ${actualBlob}). ` +
      'Review the new runtime/load order and then update runtime-manifest.json.'
    );
  }
}

const modules = extractBootstrapModules(bootstrapSource);
const moduleSet = new Set(modules);

const seen = new Set();
for (const module of modules) {
  if (seen.has(module)) fail(`Duplicate bootstrap module: ${module}`);
  seen.add(module);
  if (!exists(module)) fail(`Bootstrap references a missing runtime file: ${module}`);
}

const dynamic = Array.isArray(manifest.dynamicRuntime) ? manifest.dynamicRuntime : [];
const dynamicSet = new Set(dynamic.map((x) => cleanModule(x.module)));

for (const item of dynamic) {
  const module = cleanModule(item.module);
  const loader = cleanModule(item.loader);
  if (!module) fail('dynamicRuntime entry is missing module.');
  if (!loader) fail(`dynamicRuntime ${module || '(unknown)'} is missing loader.`);
  if (module && !exists(module)) fail(`Dynamic runtime module does not exist: ${module}`);
  if (loader && !exists(loader)) fail(`Dynamic runtime loader does not exist: ${loader}`);
  if (module && loader && exists(loader)) {
    const loaderSource = read(loader);
    if (!loaderSource.includes(module)) {
      fail(`Dynamic loader ${loader} no longer references ${module}.`);
    }
  }
}

const expectedCurrent = new Set();
for (const area of Array.isArray(manifest.areas) ? manifest.areas : []) {
  for (const owner of Array.isArray(area.finalOwners) ? area.finalOwners : []) expectedCurrent.add(cleanModule(owner));
}
for (const module of Array.isArray(manifest.compatibilityLayers) ? manifest.compatibilityLayers : []) expectedCurrent.add(cleanModule(module));
for (const module of Array.isArray(manifest.foundationRequired) ? manifest.foundationRequired : []) expectedCurrent.add(cleanModule(module));
for (const module of Array.isArray(manifest.legacyFallbackRequired) ? manifest.legacyFallbackRequired : []) expectedCurrent.add(cleanModule(module));
for (const module of Array.isArray(manifest.loadedLegacyReviewCandidates) ? manifest.loadedLegacyReviewCandidates : []) expectedCurrent.add(cleanModule(module));

for (const module of expectedCurrent) {
  if (!module) continue;
  if (!moduleSet.has(module) && !dynamicSet.has(module) && !directRuntime.includes(module)) {
    fail(`Manifest-classified current runtime module is no longer loaded: ${module}`);
  }
  if (!exists(module)) fail(`Manifest-classified runtime file is missing: ${module}`);
}

for (const constraint of Array.isArray(manifest.loadOrderConstraints) ? manifest.loadOrderConstraints : []) {
  const before = cleanModule(constraint.before);
  const after = cleanModule(constraint.after);
  const beforeIndex = modules.indexOf(before);
  const afterIndex = modules.indexOf(after);
  if (beforeIndex < 0) fail(`Load-order constraint references missing bootstrap module: ${before}`);
  if (afterIndex < 0) fail(`Load-order constraint references missing bootstrap module: ${after}`);
  if (beforeIndex >= 0 && afterIndex >= 0 && beforeIndex >= afterIndex) {
    fail(`Load order changed: ${before} must load before ${after}. ${constraint.reason || ''}`.trim());
  }
}

for (const forbidden of Array.isArray(manifest.deprecatedForbidden) ? manifest.deprecatedForbidden : []) {
  const module = cleanModule(forbidden);
  if (moduleSet.has(module) || dynamicSet.has(module) || directRuntime.includes(module)) {
    fail(`Deprecated/forbidden module returned to current runtime: ${module}`);
  }
}

const classifiedBootstrap = new Set([...expectedCurrent].filter((m) => moduleSet.has(m)));
const unclassified = modules.filter((m) => !classifiedBootstrap.has(m));

console.log('PPPP runtime manifest check');
console.log(`HEAD: ${headInfo()}`);
console.log(`Audited baseline commit: ${manifest.auditedAtCommit || '(not recorded)'}`);
console.log(`Application HTML: ${applicationHtml}`);
console.log(`Direct local runtime modules: ${directRuntime.length}`);
console.log(`Bootstrap loader: ${bootstrapLoaderPath}`);
console.log(`Ordered bootstrap: ${bootstrapPath}`);
console.log(`Bootstrap modules: ${modules.length}`);
console.log(`Explicitly classified bootstrap modules: ${classifiedBootstrap.size}`);
console.log(`Safe-default LOADED_CURRENT_UNCLASSIFIED modules: ${unclassified.length}`);
console.log(`Registered additional dynamic runtime modules: ${dynamic.length}`);

if (unclassified.length) {
  console.log('Unclassified modules remain loaded by design; they are NOT treated as dead code.');
}

if (!process.exitCode) {
  console.log('Runtime manifest OK.');
}
