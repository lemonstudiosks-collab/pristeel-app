import fs from 'node:fs';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const BASELINE = '81127fb06e898692bf6604bf95d76c760afc95e1';
const compatPath = 'pristeel-groq-rate-limit.js';
const gmailAuditPath = 'pristeel-gmail-audit.js';
const registryPath = 'runtime-bootstrap-order.json';
const manifestPath = 'runtime-manifest.json';
const sequenceGuardPath = 'scripts/bootstrap-sequence-check.mjs';

function die(message) {
  console.error(`CLEANUP 15D MIGRATION ERROR: ${message}`);
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
let gmailAudit = read(gmailAuditPath);

const oldRequest = "window.PSTAI.requestJson=async function(options){var o=options||{},key=legacyKey();if(!key)throw new Error('Mungon AI API Key te Cilësimet.');var body={model:String(o.model||'llama-3.3-70b-versatile'),messages:Array.isArray(o.messages)?o.messages:[],temperature:o.temperature==null?0:o.temperature,max_tokens:Number(o.max_tokens)||5000,response_format:o.response_format||{type:'json_object'}};var r=await window.fetch('https://'+LEGACY_GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body)});var text=await r.text(),data={};try{data=JSON.parse(text)}catch(e){}if(!r.ok)throw new Error((data.error&&data.error.message)||('Groq '+r.status+': '+text.slice(0,180)));var c=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;if(!c)throw new Error('AI nuk ktheu rezultat.');return parseModelJson(c)};";
const newRequest = "function pstAiError(code,message,cause){var e=new Error(message);e.pstAiCode=code;if(cause)e.cause=cause;return e}\nwindow.PSTAI.requestJson=async function(options){var o=options||{},key=legacyKey();if(!key)throw pstAiError('MISSING_KEY','Mungon AI API Key te Cilësimet.');var body={model:String(o.model||'llama-3.3-70b-versatile'),messages:Array.isArray(o.messages)?o.messages:[],temperature:o.temperature==null?0:o.temperature,max_tokens:Number(o.max_tokens)||5000,response_format:o.response_format||{type:'json_object'}};var r=await window.fetch('https://'+LEGACY_GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify(body)});var text=await r.text(),data={};try{data=JSON.parse(text)}catch(e){}if(!r.ok)throw pstAiError('HTTP',(data.error&&data.error.message)||('Groq '+r.status+': '+text.slice(0,180)));var c=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;if(!c)throw pstAiError('EMPTY','AI nuk ktheu rezultat.');try{return parseModelJson(c)}catch(e){throw pstAiError('INVALID_JSON',String(e&&e.message||'AI returned invalid JSON.'),e)}};";
compat = replaceOnce(compat, oldRequest, newRequest, 'typed PSTAI.requestJson error contract');

const oldSleep = "function sleep(ms){return new Promise(function(r){setTimeout(r,ms);});}\n";
const newSleep = oldSleep + "function aiService(){var ai=window.PSTAI;return ai&&typeof ai.hasApiKey==='function'&&typeof ai.requestJson==='function'?ai:null;}\n";
gmailAudit = replaceOnce(gmailAudit, oldSleep, newSleep, 'Gmail Audit AI service helper insertion');

gmailAudit = replaceOnce(
  gmailAudit,
  "async function groqClassify(items,token){\n  var key=localStorage.getItem('pristeel_apikey')||'';if(!key||!items.length)return{};",
  "async function groqClassify(items,token,ai){\n  if(!ai||typeof ai.requestJson!=='function'||!items.length)return{};",
  'Gmail Audit classifier direct key contract'
);

const oldTransport = "    var r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},body:JSON.stringify({model:'llama-3.1-8b-instant',temperature:0,max_tokens:4000,response_format:{type:'json_object'},messages:[{role:'system',content:'Je klasifikues konservativ i emailave të projekteve. Kthe vetëm JSON.'},{role:'user',content:prompt}]})});\n    var txt=await r.text(),data={};try{data=JSON.parse(txt);}catch(e){}if(!r.ok)continue;\n    var content=data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content,obj={};try{obj=JSON.parse(String(content||'').replace(/^```(?:json)?/i,'').replace(/```$/,'').trim());}catch(e){continue;}";
const newTransport = "    var obj={};try{obj=await ai.requestJson({model:'llama-3.1-8b-instant',temperature:0,max_tokens:4000,response_format:{type:'json_object'},messages:[{role:'system',content:'Je klasifikues konservativ i emailave të projekteve. Kthe vetëm JSON.'},{role:'user',content:prompt}]});}catch(e){var code=String(e&&e.pstAiCode||'');if(code==='HTTP'||code==='EMPTY'||code==='INVALID_JSON')continue;throw e;}";
gmailAudit = replaceOnce(gmailAudit, oldTransport, newTransport, 'Gmail Audit direct Groq transport');

gmailAudit = replaceOnce(
  gmailAudit,
  "    var last=parseInt(localStorage.getItem(KEYS.last)||'0',10)||0,token=await A.auth(),key=localStorage.getItem('pristeel_apikey')||'';",
  "    var last=parseInt(localStorage.getItem(KEYS.last)||'0',10)||0,token=await A.auth(),ai=aiService(),hasAi=!!(ai&&ai.hasApiKey());",
  'Gmail Audit loop direct key availability check'
);

gmailAudit = replaceOnce(
  gmailAudit,
  "      if(key&&ambiguous.length){setStatus('Po kontrollohen me AI '+ambiguous.length+' emaila të paqartë në këtë bllok…');var ai=await groqClassify(ambiguous,token);ambiguous.forEach(function(x){x.decision=applyAi(x,ai[x.row.gmail_message_id]);});}",
  "      if(hasAi&&ambiguous.length){setStatus('Po kontrollohen me AI '+ambiguous.length+' emaila të paqartë në këtë bllok…');var aiResult=await groqClassify(ambiguous,token,ai);ambiguous.forEach(function(x){x.decision=applyAi(x,aiResult[x.row.gmail_message_id]);});}",
  'Gmail Audit loop AI classification call'
);

if (!gmailAudit.includes("var VERSION='20260801-1';")) die('Gmail Audit internal progress VERSION changed unexpectedly.');
if (gmailAudit.includes("localStorage.getItem('pristeel_apikey')")) die('Gmail Audit still reads pristeel_apikey directly after migration.');
if (gmailAudit.includes('https://api.groq.com/openai/v1/chat/completions')) die('Gmail Audit still contains direct Groq endpoint after migration.');

fs.writeFileSync(compatPath, compat, 'utf8');
fs.writeFileSync(gmailAuditPath, gmailAudit, 'utf8');

const registry = JSON.parse(read(registryPath));
const replacements = new Map([
  ['pristeel-gmail-audit.js?v=20260801-1', 'pristeel-gmail-audit.js?v=20260814-ai1'],
  ['pristeel-groq-rate-limit.js?v=20260814-ai1', 'pristeel-groq-rate-limit.js?v=20260814-ai2']
]);
let changed = 0;
registry.files = (registry.files || []).map((entry) => {
  if (!replacements.has(entry)) return entry;
  changed += 1;
  return replacements.get(entry);
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

console.log('Cleanup 15D migration applied.');
console.log(`Sequence SHA-256: ${sequenceDigest}`);
console.log(`Bootstrap Git blob SHA: ${bootstrapBlob}`);
console.log('Migrated caller: pristeel-gmail-audit.js');
console.log('Gmail Audit internal progress VERSION preserved: 20260801-1');
