import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const BASELINE = 'a73881e6670fb8e8226461dd17297931e106505f';
const compatPath = 'pristeel-groq-rate-limit.js';
const intakePath = 'pristeel-email-offer-intake-v1.js';
const registryPath = 'runtime-bootstrap-order.json';
const manifestPath = 'runtime-manifest.json';
const sequenceGuardPath = 'scripts/bootstrap-sequence-check.mjs';

function die(message) {
  console.error(`CLEANUP 15C MIGRATION ERROR: ${message}`);
  process.exit(1);
}
function read(path) {
  if (!fs.existsSync(path)) die(`Missing file: ${path}`);
  return fs.readFileSync(path, 'utf8');
}
function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) die(`Expected source contract not found: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) die(`Source contract is ambiguous: ${label}`);
  return source.slice(0, first) + after + source.slice(first + before.length);
}
function sha256Sequence(files) {
  return crypto.createHash('sha256').update(`${files.join('\n')}\n`, 'utf8').digest('hex');
}
function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(Buffer.from(`blob ${body.length}\0`, 'utf8')).update(body).digest('hex');
}

let compat = read(compatPath);
let intake = read(intakePath);

const configuredModelLine = "function configuredModel(){try{return String(localStorage.getItem('pristeel_gemini_model')||MODEL_PREFERRED).trim()||MODEL_PREFERRED}catch(e){return MODEL_PREFERRED}}\n";
const sharedHelpers = configuredModelLine +
  "function legacyKey(){try{return String(localStorage.getItem('pristeel_apikey')||'').trim()}catch(e){return''}}\n" +
  "function parseModelJson(v){var s=String(v||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();try{return JSON.parse(s)}catch(e){var a=s.indexOf('{'),b=s.lastIndexOf('}');if(a>-1&&b>a)return JSON.parse(s.slice(a,b+1));throw e}}\n";
compat = replaceOnce(compat, configuredModelLine, sharedHelpers, 'Gemini configuredModel helper');

const compatLines = compat.split('\n');
const configureIndex = compatLines.findIndex((line) => line.startsWith('window.PSTAI.configureGemini=function('));
if (configureIndex < 0) die('PSTAI.configureGemini assignment not found.');
if (compatLines.some((line) => line.startsWith('window.PSTAI.requestJson='))) die('PSTAI.requestJson already exists.');
compatLines.splice(configureIndex + 1, 0,
  "window.PSTAI.hasApiKey=function(){return !!legacyKey()};",
  "window.PSTAI.requestJson=async function(options){var o=options||{},key=legacyKey();if(!key)throw new Error('Mungon AI API Key te Cilësimet.');var body={model:String(o.model||'llama-3.3-70b-versatile'),messages:Array.isArray(o.messages)?o.messages:[],temperature:o.temperature==null?0:o.temperature,max_tokens:Number(o.max_tokens)||5000,response_format:o.response_format||{type:'json_object'}};var r=await window.fetch('https://'+LEGACY_GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body)});var text=await r.text(),data={};try{data=JSON.parse(text)}catch(e){}if(!r.ok)throw new Error((data.error&&data.error.message)||('Groq '+r.status+': '+text.slice(0,180)));var c=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;if(!c)throw new Error('AI nuk ktheu rezultat.');return parseModelJson(c)};"
);
compat = compatLines.join('\n');

const intakePrefix = "async function extractAI(t,m){var key=localStorage.getItem('pristeel_apikey')||'';if(!key)return fallback(t,m);";
const migratedPrefix = "async function extractAI(t,m){var ai=window.PSTAI;if(!ai||typeof ai.hasApiKey!=='function'||typeof ai.requestJson!=='function'||!ai.hasApiKey())return fallback(t,m);";
intake = replaceOnce(intake, intakePrefix, migratedPrefix, 'email offer intake legacy key prefix');

const transportStart = "var r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'system',content:'Je analist i ofertave të furnitorëve për projekte çeliku. Kthe vetëm JSON të vlefshëm dhe mos shpik të dhëna.'},{role:'user',content:prompt}],temperature:0,max_tokens:2400,response_format:{type:'json_object'}})});var body=await r.text(),j={};try{j=JSON.parse(body);}catch(e){}if(!r.ok)throw new Error((j.error&&j.error.message)||('Groq '+r.status));var c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content;if(!c)throw new Error('AI nuk ktheu rezultat.');return safeJson(c);";
const serviceCall = "return ai.requestJson({model:'llama-3.3-70b-versatile',messages:[{role:'system',content:'Je analist i ofertave të furnitorëve për projekte çeliku. Kthe vetëm JSON të vlefshëm dhe mos shpik të dhëna.'},{role:'user',content:prompt}],temperature:0,max_tokens:2400,response_format:{type:'json_object'}});";
intake = replaceOnce(intake, transportStart, serviceCall, 'email offer intake direct Groq transport');

fs.writeFileSync(compatPath, compat, 'utf8');
fs.writeFileSync(intakePath, intake, 'utf8');

const registry = JSON.parse(read(registryPath));
const oldCompatEntry = 'pristeel-groq-rate-limit.js?v=20260801-2';
const newCompatEntry = 'pristeel-groq-rate-limit.js?v=20260814-ai1';
const oldIntakeEntry = 'pristeel-email-offer-intake-v1.js?v=20260809-1';
const newIntakeEntry = 'pristeel-email-offer-intake-v1.js?v=20260814-ai1';
let changed = 0;
registry.files = (registry.files || []).map((entry) => {
  if (entry === oldCompatEntry) { changed += 1; return newCompatEntry; }
  if (entry === oldIntakeEntry) { changed += 1; return newIntakeEntry; }
  return entry;
});
if (changed !== 2) die(`Expected exactly two bootstrap cache-version replacements, got ${changed}.`);
const sequenceDigest = sha256Sequence(registry.files);
registry.sequenceSha256 = sequenceDigest;
fs.writeFileSync(registryPath, `${JSON.stringify(registry)}\n`, 'utf8');

let sequenceGuard = read(sequenceGuardPath);
sequenceGuard = sequenceGuard.replace(/const EXPECTED_DIGEST = '[0-9a-f]{64}';/, `const EXPECTED_DIGEST = '${sequenceDigest}';`);
if (!sequenceGuard.includes(`const EXPECTED_DIGEST = '${sequenceDigest}';`)) die('Could not synchronize bootstrap sequence guard digest.');
fs.writeFileSync(sequenceGuardPath, sequenceGuard, 'utf8');

execFileSync(process.execPath, ['scripts/generate-bootstrap.mjs'], { stdio: 'inherit' });
const bootstrap = read(registry.runtimeArtifact || 'pristeel-project-emails.js');
const bootstrapBlob = gitBlobSha(bootstrap);

const manifest = JSON.parse(read(manifestPath));
manifest.auditedAtCommit = BASELINE;
manifest.entrypoints.bootstrapGitBlobSha = bootstrapBlob;
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log('Cleanup 15C migration applied.');
console.log(`Sequence SHA-256: ${sequenceDigest}`);
console.log(`Bootstrap Git blob SHA: ${bootstrapBlob}`);
console.log('Migrated caller: pristeel-email-offer-intake-v1.js');
