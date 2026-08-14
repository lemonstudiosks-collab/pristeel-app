import fs from 'node:fs';

const files = {
  registry: 'runtime-bootstrap-order.json',
  manifest: 'runtime-manifest.json',
  appHtml: 'pristeel-procurement.html',
  compat: 'pristeel-groq-rate-limit.js',
  geminiUi: 'pristeel-gemini-test-ui-v1.js',
  groqProvider: 'pristeel-groq-gptoss-provider-v1.js',
  emailOfferIntake: 'pristeel-email-offer-intake-v1.js',
  gmailAudit: 'pristeel-gmail-audit.js',
  projectAnalysis: 'pristeel-project-analysis.js'
};

function fail(message) {
  console.error(`AI PROVIDER CONTRACT ERROR: ${message}`);
  process.exitCode = 1;
}

function read(path) {
  if (!fs.existsSync(path)) {
    fail(`Missing file: ${path}`);
    return '';
  }
  return fs.readFileSync(path, 'utf8');
}

function requireText(source, needle, label) {
  if (!source.includes(needle)) fail(`${label} no longer contains required contract: ${needle}`);
}

function forbidText(source, needle, label) {
  if (source.includes(needle)) fail(`${label} still contains forbidden direct contract: ${needle}`);
}

function clean(entry) {
  return String(entry || '').split('?')[0].trim();
}

function extractFunction(source, needle) {
  const start = source.indexOf(needle);
  if (start < 0) { fail(`Function not found for AI contract guard: ${needle}`); return ''; }
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false, end = -1;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i], nx = source[i + 1] || '';
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && nx === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && nx === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && nx === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) { fail(`Function closing brace not found for AI contract guard: ${needle}`); return ''; }
  return source.slice(start, end);
}

let registry = {};
let manifest = {};
try { registry = JSON.parse(read(files.registry)); } catch (e) { fail(`${files.registry} is invalid JSON: ${e.message}`); }
try { manifest = JSON.parse(read(files.manifest)); } catch (e) { fail(`${files.manifest} is invalid JSON: ${e.message}`); }

const appHtml = read(files.appHtml);
const compat = read(files.compat);
const geminiUi = read(files.geminiUi);
const groqProvider = read(files.groqProvider);
const emailOfferIntake = read(files.emailOfferIntake);
const gmailAudit = read(files.gmailAudit);
const projectAnalysis = read(files.projectAnalysis);
const startParsing = extractFunction(appHtml, 'async function startParsing()');
const parseOffer = extractFunction(appHtml, 'async function parseOffer()');

const ordered = Array.isArray(registry.files) ? registry.files.map(clean) : [];
const compatIndex = ordered.indexOf(files.compat);
const geminiIndex = ordered.indexOf(files.geminiUi);
if (compatIndex < 0) fail(`${files.compat} is missing from the ordered bootstrap registry.`);
if (geminiIndex < 0) fail(`${files.geminiUi} is missing from the ordered bootstrap registry.`);
if (compatIndex >= 0 && geminiIndex >= 0 && compatIndex >= geminiIndex) {
  fail(`${files.compat} must load before ${files.geminiUi}.`);
}

const compatibilityLayers = Array.isArray(manifest.compatibilityLayers) ? manifest.compatibilityLayers.map(clean) : [];
if (!compatibilityLayers.includes(files.compat)) fail(`${files.compat} is no longer classified as a compatibility layer.`);

const aiArea = (Array.isArray(manifest.areas) ? manifest.areas : []).find((x) => x && x.area === 'ai');
const aiOwners = aiArea && Array.isArray(aiArea.finalOwners) ? aiArea.finalOwners.map(clean) : [];
for (const owner of [files.geminiUi, files.groqProvider]) {
  if (!aiOwners.includes(owner)) fail(`AI final owner missing from runtime manifest: ${owner}`);
}

const dynamic = (Array.isArray(manifest.dynamicRuntime) ? manifest.dynamicRuntime : []).find((x) => clean(x && x.module) === files.groqProvider);
if (!dynamic) fail(`${files.groqProvider} is missing from dynamicRuntime.`);
else {
  if (clean(dynamic.loader) !== files.geminiUi) fail(`${files.groqProvider} loader changed from ${files.geminiUi}.`);
  if (dynamic.status !== 'ACTIVE_PROVIDER') fail(`${files.groqProvider} status changed from ACTIVE_PROVIDER.`);
}

const orderConstraint = (Array.isArray(manifest.loadOrderConstraints) ? manifest.loadOrderConstraints : []).some((x) =>
  clean(x && x.before) === files.compat && clean(x && x.after) === files.geminiUi
);
if (!orderConstraint) fail(`Runtime manifest no longer records the AI compatibility-before-settings load-order constraint.`);

for (const [needle, label] of [
  ["api.groq.com/openai/v1/chat/completions", 'legacy Groq-shaped endpoint'],
  ["https://generativelanguage.googleapis.com/v1beta/models/", 'Gemini API base'],
  ["pristeel_gemini_apikey", 'Gemini browser key storage'],
  ["pristeel_gemini_model", 'Gemini model storage'],
  ["pristeel_apikey", 'legacy compatibility key marker'],
  ["window.fetch=function", 'compatibility fetch wrapper'],
  ["window.PSTAI.configureGemini", 'Gemini configuration API'],
  ["window.PSTAI.hasApiKey", 'explicit AI availability API'],
  ["window.PSTAI.requestJson", 'explicit JSON request API'],
  ["function pstAiError", 'typed explicit-request error helper'],
  ["pstAiError('HTTP'", 'typed HTTP error'],
  ["pstAiError('EMPTY'", 'typed empty-response error'],
  ["pstAiError('INVALID_JSON'", 'typed invalid-JSON error'],
  ["window.saveApiKey=function", 'legacy settings save bridge']
]) requireText(compat, needle, `${files.compat}: ${label}`);

for (const [needle, label] of [
  ["window.PSTAI.testGeminiConnection", 'Gemini connectivity API'],
  ["pristeel-groq-gptoss-provider-v1.js?v=20260814-1", 'dynamic GPT-OSS provider loader'],
  ["oldRender=window.renderSettings", 'settings render wrapper']
]) requireText(geminiUi, needle, `${files.geminiUi}: ${label}`);

for (const [needle, label] of [
  ["openai/gpt-oss-20b", 'GPT-OSS model'],
  ["groq-gptoss", 'provider id'],
  ["pristeel_groq_apikey", 'Groq browser key storage'],
  ["pristeel_ai_provider", 'active provider storage'],
  ["__GROQ_GPTOSS_COMPAT__", 'legacy key compatibility marker'],
  ["previousFetch=window.fetch.bind(window)", 'provider wrapper chaining'],
  ["new XMLHttpRequest()", 'direct Groq transport bypass'],
  ["window.fetch=function", 'active provider fetch wrapper'],
  ["window.PSTAI.activateGroqGptOss", 'provider activation API'],
  ["window.PSTAI.deactivateGroqGptOss", 'provider deactivation API'],
  ["oldRender=window.renderSettings", 'settings render wrapper']
]) requireText(groqProvider, needle, `${files.groqProvider}: ${label}`);

for (const [needle, label] of [
  ["var ai=window.PSTAI", 'explicit AI service lookup'],
  ["ai.requestJson({", 'explicit AI request call'],
  ["model:'llama-3.3-70b-versatile'", 'preserved email offer model'],
  ["max_tokens:2400", 'preserved email offer token budget'],
  ["response_format:{type:'json_object'}", 'preserved JSON response request']
]) requireText(emailOfferIntake, needle, `${files.emailOfferIntake}: ${label}`);
forbidText(emailOfferIntake, "https://api.groq.com/openai/v1/chat/completions", files.emailOfferIntake);
forbidText(emailOfferIntake, "localStorage.getItem('pristeel_apikey')", files.emailOfferIntake);

for (const [needle, label] of [
  ["var VERSION='20260801-1';", 'preserved Gmail Audit progress namespace'],
  ["function aiService(){var ai=window.PSTAI", 'explicit Gmail Audit AI service lookup'],
  ["ai.requestJson({model:'llama-3.1-8b-instant'", 'explicit Gmail Audit request call'],
  ["max_tokens:4000", 'preserved Gmail Audit token budget'],
  ["code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON'", 'preserved soft batch failure semantics'],
  ["throw e;", 'preserved network/untyped failure propagation']
]) requireText(gmailAudit, needle, `${files.gmailAudit}: ${label}`);
forbidText(gmailAudit, "https://api.groq.com/openai/v1/chat/completions", files.gmailAudit);
forbidText(gmailAudit, "localStorage.getItem('pristeel_apikey')", files.gmailAudit);

for (const [needle, label] of [
  ["deterministicParseGermanMengenliste(text)", 'deterministic BOM parser-first path'],
  ["const ai=window.PSTAI", 'explicit inline AI service lookup'],
  ["ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:8000,temperature:0,response_format:{type:'json_object'}", 'preserved BOM AI request contract'],
  ["chunkTextByLines(text, 8000)", 'preserved BOM chunk size'],
  ["return out.slice(0, 12)", 'preserved BOM chunk cap'],
  ["const code=String(pe&&pe.pstAiCode||'')", 'typed chunk error lookup'],
  ["code==='HTTP'", 'soft HTTP chunk behavior'],
  ["code==='EMPTY'", 'soft empty chunk behavior'],
  ["code==='INVALID_JSON'", 'soft invalid-JSON chunk behavior'],
  ["throw pe;", 'network/untyped failure propagation'],
  ["Mungon Groq API Key — shko te Cilësimet.", 'preserved missing-key user message']
]) requireText(startParsing, needle, `${files.appHtml} startParsing: ${label}`);
forbidText(startParsing, "https://api.groq.com/openai/v1/chat/completions", `${files.appHtml} startParsing`);
forbidText(startParsing, "pristeel_apikey", `${files.appHtml} startParsing`);
if (startParsing.indexOf('deterministicParseGermanMengenliste(text)') > startParsing.indexOf('const ai=window.PSTAI')) {
  fail(`${files.appHtml} startParsing no longer runs the deterministic parser before AI availability.`);
}

for (const [needle, label] of [
  ["const ai=window.PSTAI", 'explicit supplier-offer AI service lookup'],
  ["ai.requestJson({model:'llama-3.1-8b-instant',max_tokens:3000,temperature:0,response_format:{type:'json_object'}", 'preserved supplier-offer AI request contract'],
  ["const code=String(aiErr&&aiErr.pstAiCode||'')", 'typed supplier-offer response error lookup'],
  ["code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON'", 'preserved supplier-offer response warning semantics'],
  ["throw aiErr;", 'supplier-offer network/untyped failure propagation'],
  ["Mungon API Key — shko te Cilësimet.", 'preserved supplier-offer missing-key message'],
  ["⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.", 'preserved supplier-offer response warning'],
  ["document.getElementById('pdf-status').textContent='Gabim: '+err.message", 'preserved supplier-offer outer error status']
]) requireText(parseOffer, needle, `${files.appHtml} parseOffer: ${label}`);
forbidText(parseOffer, "https://api.groq.com/openai/v1/chat/completions", `${files.appHtml} parseOffer`);
forbidText(parseOffer, "pristeel_apikey", `${files.appHtml} parseOffer`);

for (const [needle, label] of [
  ["MODEL_FAST='llama-3.1-8b-instant'", 'legacy fast-model caller contract'],
  ["MODEL_MAIN='llama-3.3-70b-versatile'", 'legacy main-model caller contract'],
  ["localStorage.getItem('pristeel_apikey')", 'legacy AI key caller contract'],
  ["https://api.groq.com/openai/v1/chat/completions", 'Groq-shaped project analysis call']
]) requireText(projectAnalysis, needle, `${files.projectAnalysis}: ${label}`);

console.log('PPPP AI provider contract guard');
console.log(`Bootstrap order: ${files.compat} -> ${files.geminiUi}`);
console.log(`Dynamic provider: ${files.geminiUi} -> ${files.groqProvider}`);
console.log(`Migrated explicit callers: ${files.emailOfferIntake}, ${files.gmailAudit}, ${files.appHtml}::startParsing, ${files.appHtml}::parseOffer`);
console.log('Storage contracts: pristeel_apikey, pristeel_gemini_apikey, pristeel_gemini_model, pristeel_groq_apikey, pristeel_ai_provider');
console.log('Two remaining inline HTML request flows and project analysis still retain their audited legacy contracts.');
if (!process.exitCode) console.log('AI provider runtime contracts OK.');
