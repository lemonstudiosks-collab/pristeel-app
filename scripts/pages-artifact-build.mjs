import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

const root = process.cwd();
const outputName = process.env.PPPP_SITE_DIR || '_site';
const outputDir = path.join(root, outputName);
let failed = false;

function fail(message) {
  failed = true;
  console.error(`PAGES SITE BUILD ERROR: ${message}`);
}

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    fail(`Missing source file: ${rel}`);
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

function cleanModule(value) {
  return String(value || '').split('?')[0].replace(/^\.\//, '').trim();
}

function extractBootstrapModules(source) {
  const match = source.match(/var\s+files\s*=\s*\[([\s\S]*?)\];/);
  if (!match) {
    fail('Could not find ordered bootstrap array.');
    return [];
  }
  const out = [];
  for (const m of match[1].matchAll(/['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g)) {
    out.push(cleanModule(m[1]));
  }
  if (!out.length) fail('Bootstrap array contained no JavaScript modules.');
  return out;
}

function add(set, value) {
  const clean = cleanModule(value);
  if (clean) set.add(clean);
}

function walk(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

function sha256(full) {
  return crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}

function human(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / 1024 / 1024).toFixed(2)} MiB`;
}

function isExternal(ref) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref);
}

function checkLocalReference(sourceRel, rawRef) {
  const ref = String(rawRef || '').trim();
  if (!ref || isExternal(ref)) return;
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean || /[{}<>]/.test(clean)) return;
  if (!/\.(?:js|css|html?|json|svg|png|jpe?g|webp|ico|webmanifest)$/i.test(clean)) return;

  const sourceDir = path.posix.dirname(sourceRel);
  const resolved = clean.startsWith('/')
    ? clean.replace(/^\/+/, '')
    : path.posix.normalize(path.posix.join(sourceDir === '.' ? '' : sourceDir, clean));

  if (!fs.existsSync(path.join(outputDir, resolved))) {
    fail(`${sourceRel} references local asset '${rawRef}', but ${resolved} is missing from ${outputName}.`);
  }
}

console.log('PPPP Pages candidate site builder');
console.log('Safety mode: CI artifact only; production deployment is not changed.');

try {
  execFileSync(process.execPath, ['scripts/pages-artifact-audit.mjs'], { cwd: root, stdio: 'inherit' });
} catch (error) {
  fail('Pre-build Pages artifact audit failed.');
}

const artifactManifest = readJson('pages-artifact-manifest.json');
const runtime = readJson(artifactManifest.runtimeManifest || 'runtime-manifest.json');

if (artifactManifest.mode !== 'AUDIT_ONLY') {
  fail(`Expected AUDIT_ONLY manifest mode, got ${artifactManifest.mode || '(missing)'}.`);
}
if (artifactManifest.futureDeploymentChangeAuthorized !== false) {
  fail('futureDeploymentChangeAuthorized must remain false for this build-only cleanup.');
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
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) fail(`Candidate source is missing: ${rel}`);
  else if (!fs.statSync(full).isFile()) fail(`Candidate source is not a file: ${rel}`);
}

if (failed) process.exit(1);

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

for (const rel of [...candidate].sort()) {
  const from = path.join(root, rel);
  const to = path.join(outputDir, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  if (sha256(from) !== sha256(to)) fail(`Byte verification failed after copying ${rel}.`);
}

fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');

const siteFiles = walk(outputDir).sort();
const expectedFiles = [...candidate].sort();
const actualCandidateFiles = siteFiles.filter((rel) => rel !== '.nojekyll');

if (actualCandidateFiles.length !== expectedFiles.length) {
  fail(`Expected ${expectedFiles.length} candidate files in ${outputName}, found ${actualCandidateFiles.length}.`);
}
for (const rel of expectedFiles) {
  if (!actualCandidateFiles.includes(rel)) fail(`Built site is missing candidate file: ${rel}`);
}
for (const rel of actualCandidateFiles) {
  if (!candidate.has(rel)) fail(`Unexpected file in built site: ${rel}`);
}

const forbiddenPatterns = [
  /^\.github\//,
  /^tests\//,
  /^scripts\//,
  /^supabase\//,
  /(^|\/)package\.json$/,
  /(^|\/)package-lock\.json$/,
  /(^|\/)preview-server\.mjs$/,
  /\.sql$/i
];
for (const rel of siteFiles) {
  if (forbiddenPatterns.some((pattern) => pattern.test(rel))) {
    fail(`Repository-only file leaked into candidate site: ${rel}`);
  }
}

for (const rel of actualCandidateFiles.filter((file) => file.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', path.join(outputDir, rel)], { encoding: 'utf8' });
  if (result.status !== 0) fail(`JavaScript syntax failed in built site: ${rel}\n${result.stderr || result.stdout}`);
}

for (const rel of actualCandidateFiles.filter((file) => /\.html?$/i.test(file))) {
  const text = fs.readFileSync(path.join(outputDir, rel), 'utf8');
  for (const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    checkLocalReference(rel, match[1]);
  }
}
for (const rel of actualCandidateFiles.filter((file) => /\.css$/i.test(file))) {
  const text = fs.readFileSync(path.join(outputDir, rel), 'utf8');
  for (const match of text.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    checkLocalReference(rel, match[1]);
  }
}

let totalBytes = 0;
for (const rel of siteFiles) totalBytes += fs.statSync(path.join(outputDir, rel)).size;

console.log(`Output directory: ${outputName}`);
console.log(`Verified candidate files: ${expectedFiles.length}`);
console.log(`Built files including .nojekyll: ${siteFiles.length}`);
console.log(`Built artifact size: ${human(totalBytes)}`);
console.log(`JavaScript files syntax-checked: ${actualCandidateFiles.filter((file) => file.endsWith('.js')).length}`);
console.log('Repository-only classes absent: yes');
console.log('Production Pages workflow changed: no');

if (failed) process.exitCode = 1;
else console.log('Pages candidate site build OK.');
