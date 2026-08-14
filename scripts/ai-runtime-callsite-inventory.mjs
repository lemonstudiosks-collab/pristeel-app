import fs from 'node:fs';

const manifestPath = 'runtime-manifest.json';
const registryPath = 'runtime-bootstrap-order.json';

function fail(message) {
  console.error(`AI CALLSITE INVENTORY ERROR: ${message}`);
  process.exit(1);
}

function parseJson(path) {
  if (!fs.existsSync(path)) fail(`Missing ${path}`);
  try { return JSON.parse(fs.readFileSync(path, 'utf8')); }
  catch (error) { fail(`${path} is invalid JSON: ${error.message}`); }
}

function clean(entry) {
  return String(entry || '').split('?')[0].trim();
}

const manifest = parseJson(manifestPath);
const registry = parseJson(registryPath);
const runtimeFiles = new Set();

runtimeFiles.add(clean(manifest.entrypoints && manifest.entrypoints.applicationHtml));
for (const file of manifest.applicationDirectRuntime || []) runtimeFiles.add(clean(file));
for (const file of registry.files || []) runtimeFiles.add(clean(file));
for (const item of manifest.dynamicRuntime || []) runtimeFiles.add(clean(item && item.module));

const files = [...runtimeFiles].filter(Boolean).sort();
for (const file of files) {
  if (!fs.existsSync(file)) fail(`Active runtime inventory references missing file: ${file}`);
}

const patterns = {
  groq_chat_endpoint: /api\.groq\.com\/openai\/v1\/chat\/completions/g,
  gemini_api_base: /generativelanguage\.googleapis\.com\/v1beta\/models/g,
  legacy_ai_key: /pristeel_apikey/g,
  gemini_key: /pristeel_gemini_apikey/g,
  gemini_model_key: /pristeel_gemini_model/g,
  groq_key: /pristeel_groq_apikey/g,
  active_provider_key: /pristeel_ai_provider/g,
  pstai_api: /\bPSTAI\b/g,
  fetch_monkey_patch: /window\.fetch\s*=\s*function/g,
  xhr_transport: /\bXMLHttpRequest\b/g,
  render_settings_contract: /\brenderSettings\b/g,
  save_api_key_contract: /\bsaveApiKey\b/g,
  legacy_fast_model: /llama-3\.1-8b-instant/g,
  legacy_main_model: /llama-3\.3-70b-versatile/g,
  gpt_oss_model: /openai\/gpt-oss-20b/g
};

const inventory = {};
for (const key of Object.keys(patterns)) inventory[key] = [];

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const [key, regex] of Object.entries(patterns)) {
    regex.lastIndex = 0;
    let count = 0;
    while (regex.exec(source)) count += 1;
    if (count) inventory[key].push({ file, count });
  }
}

const report = {
  generatedFrom: {
    manifest: manifestPath,
    registry: registryPath,
    activeRuntimeFilesScanned: files.length
  },
  inventory
};

console.log('PPPP active runtime AI callsite inventory');
console.log(JSON.stringify(report, null, 2));
