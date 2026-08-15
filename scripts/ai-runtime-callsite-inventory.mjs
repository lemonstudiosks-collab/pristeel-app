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
  pstai_error_code: /pstAiCode/g,
  fetch_monkey_patch: /window\.fetch\s*=\s*function/g,
  xhr_transport: /\bXMLHttpRequest\b/g,
  render_settings_contract: /\brenderSettings\b/g,
  save_api_key_contract: /\bsaveApiKey\b/g,
  legacy_fast_model: /llama-3\.1-8b-instant/g,
  legacy_main_model: /llama-3\.3-70b-versatile/g,
  gpt_oss_model: /openai\/gpt-oss-20b/g
};

const expected = {
  groq_chat_endpoint: [
    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 2 },
    { file: 'pristeel-groq-rate-limit.js', count: 1 }
  ],
  gemini_api_base: [
    { file: 'pristeel-gemini-test-ui-v1.js', count: 1 },
    { file: 'pristeel-groq-rate-limit.js', count: 1 }
  ],
  legacy_ai_key: [
    { file: 'pristeel-groq-rate-limit.js', count: 1 }
  ],
  gemini_key: [
    { file: 'pristeel-gemini-test-ui-v1.js', count: 1 },
    { file: 'pristeel-groq-rate-limit.js', count: 3 }
  ],
  gemini_model_key: [
    { file: 'pristeel-gemini-test-ui-v1.js', count: 1 },
    { file: 'pristeel-groq-rate-limit.js', count: 2 }
  ],
  groq_key: [
    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 4 },
    { file: 'pristeel-groq-rate-limit.js', count: 2 }
  ],
  active_provider_key: [
    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 3 }
  ],
  pstai_api: [
    { file: 'pristeel-email-offer-intake-v1.js', count: 1 },
    { file: 'pristeel-gemini-test-ui-v1.js', count: 3 },
    { file: 'pristeel-gmail-audit.js', count: 1 },
    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 17 },
    { file: 'pristeel-groq-rate-limit.js', count: 10 },
    { file: 'pristeel-procurement.html', count: 5 },
    { file: 'pristeel-project-analysis.js', count: 2 },
    { file: 'pristeel-project-intelligence-resilience-v1.js', count: 1 }
  ],
  pstai_error_code: [
    { file: 'pristeel-gmail-audit.js', count: 1 },
    { file: 'pristeel-groq-rate-limit.js', count: 1 },
    { file: 'pristeel-procurement.html', count: 3 },
    { file: 'pristeel-project-analysis.js', count: 1 }
  ],
  fetch_monkey_patch: [
    { file: 'pristeel-drive-intelligence.js', count: 1 }
  ],
  xhr_transport: [
    { file: 'pristeel-drive-import.js', count: 2 },
    { file: 'pristeel-drive.js', count: 1 },
    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 1 },
    { file: 'pristeel-project-workspace.js', count: 1 }
  ],
  render_settings_contract: [
    { file: 'pristeel-gemini-test-ui-v1.js', count: 2 },
    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 2 },
    { file: 'pristeel-groq-rate-limit.js', count: 2 },
    { file: 'pristeel-procurement.html', count: 4 }
  ],
  save_api_key_contract: [
    { file: 'pristeel-groq-rate-limit.js', count: 1 },
    { file: 'pristeel-procurement.html', count: 2 }
  ],
  legacy_fast_model: [
    { file: 'pristeel-gmail-audit.js', count: 1 },
    { file: 'pristeel-groq-rate-limit.js', count: 1 },
    { file: 'pristeel-procurement.html', count: 4 },
    { file: 'pristeel-project-analysis.js', count: 1 }
  ],
  legacy_main_model: [
    { file: 'pristeel-email-offer-intake-v1.js', count: 1 },
    { file: 'pristeel-groq-rate-limit.js', count: 2 },
    { file: 'pristeel-project-analysis.js', count: 1 }
  ],
  gpt_oss_model: [
    { file: 'pristeel-groq-gptoss-provider-v1.js', count: 1 }
  ]
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

for (const key of Object.keys(patterns)) {
  const actualJson = JSON.stringify(inventory[key] || []);
  const expectedJson = JSON.stringify(expected[key] || []);
  if (actualJson !== expectedJson) {
    fail(
      `Audited callsite set changed for ${key}.\n` +
      `expected=${expectedJson}\n` +
      `actual=${actualJson}\n` +
      'Review the runtime caller/provider migration deliberately before updating this allowlist.'
    );
  }
}

console.log('AI runtime callsite allowlist OK.');
