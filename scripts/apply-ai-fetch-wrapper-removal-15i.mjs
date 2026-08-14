import fs from 'node:fs';

function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

// Remove only the compatibility layer's global fetch interception. Explicit requestTransport remains authoritative.
{
  const path='pristeel-groq-rate-limit.js';
  let s=fs.readFileSync(path,'utf8');
  s=replaceOnce(s,
    "window.fetch=function(input,init){if(!isLegacyGroq(input))return nativeFetch(input,init);var run=function(){return geminiCompatFetch(input,init)};var result=queue.then(run,run);queue=result.then(function(){},function(){});return result};\n",
    '',
    'compatibility global fetch wrapper');
  fs.writeFileSync(path,s,'utf8');
}

// Remove only the GPT-OSS global fetch interception. Explicit requestTransport remains authoritative.
{
  const path='pristeel-groq-gptoss-provider-v1.js';
  let s=fs.readFileSync(path,'utf8');
  const wrapper=`window.fetch=function(input,init){
  if(!active()||!isGroqUrl(input))return previousFetch(input,init);
  var run=function(){return groqFetch(input,init);};
  var result=queue.then(run,run);
  queue=result.then(function(){},function(){});
  return result;
};

`;
  s=replaceOnce(s,wrapper,'','GPT-OSS global fetch wrapper');
  fs.writeFileSync(path,s,'utf8');
}

// Update the permanent routing smoke to the wrapper-free architecture.
{
  const path='scripts/ai-provider-routing-smoke.mjs';
  let s=fs.readFileSync(path,'utf8');
  s=replaceOnce(s,
    "globalThis.fetch=async function nativeFetchStub(url,init={}){",
    "const nativeFetch=async function nativeFetchStub(url,init={}){",
    'native fetch declaration');
  s=replaceOnce(s,
    "};\n\nclass FakeXHR{",
    "};\nglobalThis.fetch=nativeFetch;\n\nclass FakeXHR{",
    'native fetch installation');
  s=replaceOnce(s,
    "vm.runInThisContext(compatSource,{filename:'pristeel-groq-rate-limit.js'});\nassert(typeof window.PSTAI.requestTransport==='function','compatibility explicit transport missing at runtime.');",
    "vm.runInThisContext(compatSource,{filename:'pristeel-groq-rate-limit.js'});\nassert(globalThis.fetch===nativeFetch,'compatibility layer changed global fetch after wrapper removal.');\nassert(typeof window.PSTAI.requestTransport==='function','compatibility explicit transport missing at runtime.');",
    'compatibility runtime fetch assertion');
  s=replaceOnce(s,
    "// Load GPT-OSS provider. It must chain requestTransport explicitly while leaving fetch wrapper fallback installed.\nvm.runInThisContext(groqSource,{filename:'pristeel-groq-gptoss-provider-v1.js'});\nassert(typeof window.PSTAI.requestTransport==='function','GPT-OSS explicit transport override missing at runtime.');",
    "// Load GPT-OSS provider. It must chain requestTransport explicitly without changing global fetch.\nvm.runInThisContext(groqSource,{filename:'pristeel-groq-gptoss-provider-v1.js'});\nassert(globalThis.fetch===nativeFetch,'GPT-OSS provider changed global fetch after wrapper removal.');\nassert(typeof window.PSTAI.requestTransport==='function','GPT-OSS explicit transport override missing at runtime.');",
    'GPT-OSS runtime fetch assertion');
  s=replaceOnce(s,
    "// Global fetch wrappers deliberately remain in this phase and must still delegate unrelated traffic.\nnativeCalls=[];xhrCalls=[];\nconst unrelated=await window.fetch('https://example.com/health');\nassert(unrelated.ok,'unrelated fetch did not succeed through retained wrapper chain.');\nassert(nativeCalls.length===1&&nativeCalls[0].url==='https://example.com/health','retained fetch wrappers no longer delegate unrelated traffic.');\nassert(xhrCalls.length===0,'unrelated traffic reached GPT-OSS XHR.');",
    "// With AI wrappers removed, unrelated fetch traffic remains direct/native.\nnativeCalls=[];xhrCalls=[];\nconst unrelated=await window.fetch('https://example.com/health');\nassert(unrelated.ok,'unrelated native fetch failed.');\nassert(nativeCalls.length===1&&nativeCalls[0].url==='https://example.com/health','unrelated fetch is no longer native/direct.');\nassert(xhrCalls.length===0,'unrelated traffic reached GPT-OSS XHR.');",
    'wrapper-free unrelated fetch assertion');
  fs.writeFileSync(path,s,'utf8');
}

const manifestPath='runtime-manifest.json';
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=replaceOnce(
  manifest,
  '"auditedAtCommit": "87a6f5c82d9350811ea09de9cd083470a0d6483c"',
  '"auditedAtCommit": "0dcffdf80fcb16f6198bdc43b1e82ec876b8bd34"',
  'runtime manifest audited baseline'
);
fs.writeFileSync(manifestPath,manifest,'utf8');

console.log('AI-specific global fetch wrappers removed from main baseline 0dcffdf80fcb16f6198bdc43b1e82ec876b8bd34.');
