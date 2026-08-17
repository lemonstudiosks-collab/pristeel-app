import fs from 'node:fs';
import crypto from 'node:crypto';

const REGISTRY_PATH = 'runtime-bootstrap-order.json';
const CHECK_ONLY = process.argv.includes('--check');

function fail(message) {
  console.error(`BOOTSTRAP GENERATOR ERROR: ${message}`);
  process.exit(1);
}

function sequenceDigest(files) {
  return crypto.createHash('sha256').update(`${files.join('\n')}\n`, 'utf8').digest('hex');
}

function gitBlobSha(text) {
  const body = Buffer.from(text, 'utf8');
  return crypto
    .createHash('sha1')
    .update(Buffer.from(`blob ${body.length}\0`, 'utf8'))
    .update(body)
    .digest('hex');
}

function render(files) {
  const registry = files
    .map((file, index) => `  '${file}'${index === files.length - 1 ? '' : ','}`)
    .join('\n');

  return `/* PRISTEEL email modules bootstrap */
(function(){
'use strict';
var files=[
${registry}
];
var completed=false,timeoutMs=8000,maxAttempts=2;
var diag=window.__pstBootstrapDiagnostics=window.__pstBootstrapDiagnostics||{started_at:new Date().toISOString(),total:files.length,loaded:0,errors:[],timeouts:[],retries:[],completed:false};
function ready(){if(completed)return;completed=true;diag.completed=true;diag.completed_at=new Date().toISOString();window.__pstModulesReady=true;try{document.dispatchEvent(new CustomEvent('pst:modules-ready'));}catch(e){}}
function next(i){if(window.__pstAbortBootstrap){ready();return;}load(i+1,1);}
function load(i,attempt){
 if(i>=files.length){ready();return;}
 if(window.__pstAbortBootstrap){ready();return;}
 attempt=attempt||1;
 var base=files[i],src=base+(attempt>1?(base.indexOf('?')>-1?'&':'?')+'pst_retry='+Date.now():'');
 var el=document.createElement('script'),settled=false,timer=null;
 el.src=src;el.defer=true;el.setAttribute('data-pst-bootstrap-index',String(i));el.setAttribute('data-pst-bootstrap-attempt',String(attempt));
 function finish(kind,error){
  if(settled)return;settled=true;if(timer)clearTimeout(timer);el.onload=null;el.onerror=null;
  if(kind==='load'){diag.loaded++;next(i);return;}
  try{el.remove();}catch(e){}
  var row={index:i,module:base,attempt:attempt,at:new Date().toISOString(),error:error?String(error):null};
  if(kind==='timeout')diag.timeouts.push(row);else diag.errors.push(row);
  if(attempt<maxAttempts){diag.retries.push({index:i,module:base,attempt:attempt+1,reason:kind,at:new Date().toISOString()});load(i,attempt+1);return;}
  console.error('Nuk u ngarkua moduli pas '+maxAttempts+' tentimeve:',base,kind,error||'');next(i);
 }
 el.onload=function(){finish('load');};
 el.onerror=function(e){finish('error',e&&e.message||'script error');};
 timer=setTimeout(function(){finish('timeout','>'+timeoutMs+'ms');},timeoutMs);
 document.head.appendChild(el);
}
load(0,1);
})();`;
}

if (!fs.existsSync(REGISTRY_PATH)) fail(`Missing registry: ${REGISTRY_PATH}`);

let registry;
try {
  registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (error) {
  fail(`${REGISTRY_PATH} is invalid JSON: ${error.message}`);
}

if (registry.schemaVersion !== 1) fail(`Unsupported schemaVersion: ${registry.schemaVersion}`);
if (!registry.runtimeArtifact) fail('runtimeArtifact is required.');
if (!Array.isArray(registry.files) || !registry.files.length) fail('files must be a non-empty ordered array.');
if (registry.moduleCount !== registry.files.length) {
  fail(`moduleCount mismatch. declared=${registry.moduleCount} actual=${registry.files.length}`);
}

const seen = new Set();
for (const file of registry.files) {
  if (typeof file !== 'string' || !file.endsWith('.js') && !file.includes('.js?')) {
    fail(`Invalid bootstrap entry: ${String(file)}`);
  }
  if (/[\r\n']/.test(file)) fail(`Unsafe bootstrap entry: ${file}`);
  if (seen.has(file)) fail(`Duplicate bootstrap entry: ${file}`);
  seen.add(file);
}

const digest = sequenceDigest(registry.files);
if (digest !== registry.sequenceSha256) {
  fail(`Registry sequence fingerprint mismatch. declared=${registry.sequenceSha256} actual=${digest}`);
}

const generated = render(registry.files);
const artifactPath = registry.runtimeArtifact;

if (CHECK_ONLY) {
  if (!fs.existsSync(artifactPath)) fail(`Missing generated runtime artifact: ${artifactPath}`);
  const current = fs.readFileSync(artifactPath, 'utf8');
  if (current !== generated) {
    fail(
      `${artifactPath} is not the deterministic output of ${REGISTRY_PATH}. ` +
      'Run `node scripts/generate-bootstrap.mjs` and review the resulting runtime change deliberately.'
    );
  }
  console.log('PPPP bootstrap generator check');
  console.log(`Registry: ${REGISTRY_PATH}`);
  console.log(`Runtime artifact: ${artifactPath}`);
  console.log(`Ordered modules: ${registry.files.length}`);
  console.log(`Sequence SHA-256: ${digest}`);
  console.log(`Runtime Git blob SHA: ${gitBlobSha(generated)}`);
  console.log('Generated bootstrap artifact is exact.');
} else {
  fs.writeFileSync(artifactPath, generated, 'utf8');
  console.log(`Wrote ${artifactPath} from ${REGISTRY_PATH}.`);
  console.log(`Ordered modules: ${registry.files.length}`);
  console.log(`Sequence SHA-256: ${digest}`);
  console.log(`Runtime Git blob SHA: ${gitBlobSha(generated)}`);
}
