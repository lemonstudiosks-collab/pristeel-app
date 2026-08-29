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

function isExternal(ref) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref);
}

function resolveRuntimeJsReference(sourceRel, rawRef) {
  const ref = String(rawRef || '').trim();
  if (!ref || isExternal(ref)) return '';
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean || /[{}<>]/.test(clean) || !/\.js$/i.test(clean)) return '';
  const sourceDir = path.posix.dirname(sourceRel);
  const resolved = clean.startsWith('/')
    ? clean.replace(/^\/+/, '')
    : path.posix.normalize(path.posix.join(sourceDir === '.' ? '' : sourceDir, clean));
  return /(^|\/)pristeel-[A-Za-z0-9._-]+\.js$/i.test(resolved) ? resolved : '';
}

function expandRuntimeJsDependencies(candidate) {
  const queue = [...candidate].filter((rel) => /\.js$/i.test(rel));
  const scanned = new Set();
  let added = 0;
  while (queue.length) {
    const sourceRel = queue.shift();
    if (!sourceRel || scanned.has(sourceRel)) continue;
    scanned.add(sourceRel);
    const full = path.join(root, sourceRel);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    const source = fs.readFileSync(full, 'utf8');
    for (const match of source.matchAll(/['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g)) {
      const resolved = resolveRuntimeJsReference(sourceRel, match[1]);
      if (!resolved) continue;
      const dependency = path.join(root, resolved);
      if (!fs.existsSync(dependency) || !fs.statSync(dependency).isFile()) {
        fail(`${sourceRel} references runtime dependency '${match[1]}', but ${resolved} is missing from the repository.`);
        continue;
      }
      if (!candidate.has(resolved)) {
        candidate.add(resolved);
        queue.push(resolved);
        added += 1;
      }
    }
  }
  return added;
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

function versionDirectRuntimeScripts(htmlRel) {
  const full = path.join(outputDir, htmlRel);
  if (!fs.existsSync(full)) return 0;
  let text = fs.readFileSync(full, 'utf8');
  let count = 0;
  text = text.replace(/(<script\b[^>]*\bsrc=["'])([^"']+\.js)(?:\?[^"']*)?(["'][^>]*><\/script>)/gi, (whole, before, raw, after) => {
    const ref = String(raw || '').trim();
    if (!ref || isExternal(ref)) return whole;
    const clean = ref.replace(/^\.\//, '').replace(/^\/+/, '');
    if (!clean || !fs.existsSync(path.join(outputDir, clean))) return whole;
    const digest = sha256(path.join(outputDir, clean)).slice(0, 16);
    count += 1;
    return `${before}${raw}?v=${digest}${after}`;
  });
  fs.writeFileSync(full, text, 'utf8');
  return count;
}

console.log('PPPP Pages production site builder');
console.log('Safety mode: derive, verify and build the exact artifact uploaded by production Pages.');

try {
  execFileSync(process.execPath, ['scripts/pages-artifact-audit.mjs'], { cwd: root, stdio: 'inherit' });
} catch (error) {
  fail('Pre-build Pages production artifact audit failed.');
}

const artifactManifest = readJson('pages-artifact-manifest.json');
const runtime = readJson(artifactManifest.runtimeManifest || 'runtime-manifest.json');

if (artifactManifest.mode !== 'PRODUCTION_ARTIFACT') {
  fail(`Expected PRODUCTION_ARTIFACT manifest mode, got ${artifactManifest.mode || '(missing)'}.`);
}
if (artifactManifest.productionArtifactDeploymentEnabled !== true) {
  fail('productionArtifactDeploymentEnabled must be true.');
}
const configuredUploadPath = String(artifactManifest.currentDeployment?.uploadPath || '').trim();
if (configuredUploadPath !== outputName) {
  fail(`Builder output '${outputName}' does not match production upload path '${configuredUploadPath || '(missing)'}.`);
}
if (artifactManifest.currentDeployment?.wholeRepository !== false) {
  fail('Production deployment must not be configured as wholeRepository.');
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

const discoveredRuntimeDependencies = expandRuntimeJsDependencies(candidate);

for (const rel of candidate) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) fail(`Production artifact source is missing: ${rel}`);
  else if (!fs.statSync(full).isFile()) fail(`Production artifact source is not a file: ${rel}`);
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

const applicationHtml = cleanModule(entry.applicationHtml);
const versionedRuntimeScripts = applicationHtml ? versionDirectRuntimeScripts(applicationHtml) : 0;
if (applicationHtml && versionedRuntimeScripts === 0) {
  fail(`No local direct runtime <script src> references were content-versioned in ${applicationHtml}.`);
}

fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');

const siteFiles = walk(outputDir).sort();
const expectedFiles = [...candidate].sort();
const actualCandidateFiles = siteFiles.filter((rel) => rel !== '.nojekyll');

if (actualCandidateFiles.length !== expectedFiles.length) {
  fail(`Expected ${expectedFiles.length} production files in ${outputName}, found ${actualCandidateFiles.length}.`);
}
for (const rel of expectedFiles) {
  if (!actualCandidateFiles.includes(rel)) fail(`Built production site is missing file: ${rel}`);
}
for (const rel of actualCandidateFiles) {
  if (!candidate.has(rel)) fail(`Unexpected file in built production site: ${rel}`);
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
    fail(`Repository-only file leaked into production site: ${rel}`);
  }
}

for (const rel of actualCandidateFiles.filter((file) => file.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', path.join(outputDir, rel)], { encoding: 'utf8' });
  if (result.status !== 0) fail(`JavaScript syntax failed in production site: ${rel}\n${result.stderr || result.stdout}`);
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
console.log(`Verified production source files: ${expectedFiles.length}`);
console.log(`Discovered dynamic runtime dependencies: ${discoveredRuntimeDependencies}`);
console.log(`Built files including .nojekyll: ${siteFiles.length}`);
console.log(`Built production artifact size: ${human(totalBytes)}`);
console.log(`JavaScript files syntax-checked: ${actualCandidateFiles.filter((file) => file.endsWith('.js')).length}`);
console.log(`Direct runtime scripts content-versioned: ${versionedRuntimeScripts}`);
console.log('Repository-only classes absent: yes');
console.log(`Production Pages upload path matched: ${configuredUploadPath}`);

if (failed) process.exitCode = 1;
else console.log('Pages production site build OK.');
