'use strict';
const fs=require('fs');
const path=require('path');
const assert=require('assert');

const ROOT=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'runtime-manifest.json'),'utf8'));
const seen=new Set();
const queue=[];
const missing=[];

function add(file,from){
  if(!file||/^https?:|^\/\//i.test(file))return;
  file=String(file).split('?')[0].split('#')[0].replace(/^\.\//,'');
  if(!file.endsWith('.js'))return;
  const full=path.join(ROOT,file);
  if(!fs.existsSync(full)){
    missing.push({file,from:from||'runtime manifest'});
    return;
  }
  if(!seen.has(file)){seen.add(file);queue.push(file);}
}

(manifest.applicationDirectRuntime||[]).forEach(x=>add(x,'runtime manifest: applicationDirectRuntime'));
add(manifest.entrypoints&&manifest.entrypoints.bootstrapLoader,'runtime manifest: bootstrapLoader');
add(manifest.entrypoints&&manifest.entrypoints.bootstrap,'runtime manifest: bootstrap');
(manifest.foundationRequired||[]).forEach(x=>add(x,'runtime manifest: foundationRequired'));
(manifest.compatibilityLayers||[]).forEach(x=>add(x,'runtime manifest: compatibilityLayers'));
(manifest.legacyFallbackRequired||[]).forEach(x=>add(x,'runtime manifest: legacyFallbackRequired'));
(manifest.dynamicRuntime||[]).forEach(x=>add(x.module,'runtime manifest: dynamicRuntime'));
(manifest.areas||[]).forEach(a=>(a.finalOwners||[]).forEach(x=>add(x,'runtime manifest: '+a.area)));

const staticRefPatterns=[
  /(?:\.src|\bsrc)\s*=\s*['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g,
  /\bloadScript(?:Once)?\s*\(\s*['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g,
  /\bloadLocalScript\s*\(\s*['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g
];

while(queue.length){
  const file=queue.shift();
  const source=fs.readFileSync(path.join(ROOT,file),'utf8');

  // Ordered bootstrap lists modules as string literals rather than direct src assignments.
  if(file===(manifest.entrypoints&&manifest.entrypoints.bootstrap)){
    const listMatch=source.match(/var\s+files\s*=\s*\[([\s\S]*?)\];/);
    assert(listMatch,'Ordered bootstrap must expose its files[] list');
    const lit=/['"]([^'"]+\.js(?:\?[^'"]*)?)['"]/g;
    let m;while((m=lit.exec(listMatch[1])))add(m[1],file+' files[]');
  }

  for(const re0 of staticRefPatterns){
    const re=new RegExp(re0.source,re0.flags);
    let m;while((m=re.exec(source)))add(m[1],file);
  }
}

if(missing.length){
  const unique=[];const keys=new Set();
  for(const x of missing){const k=x.file+'|'+x.from;if(!keys.has(k)){keys.add(k);unique.push(x);}}
  console.error('Missing local runtime modules:');
  unique.forEach(x=>console.error(' - '+x.file+' <- '+x.from));
  assert.fail(unique.length+' active/dynamic local runtime reference(s) are missing');
}

assert(seen.size>100,'Runtime closure unexpectedly small; audit may not be following the real production graph');

const askBridge=fs.readFileSync(path.join(ROOT,'pristeel-home-ask-functional-owner-v1.js'),'utf8');
assert.doesNotThrow(()=>new Function(askBridge),'Home Ask functional-owner bridge must remain valid JavaScript');
assert(askBridge.includes('function portfolioAnswer('),'Home Ask must aggregate company/client portfolios');
assert(askBridge.includes('function confirmedVisit('),'Home Ask must recognize confirmed execution visit evidence');
assert(askBridge.includes("N(p.pipeline_stage)==='offer submitted'"),'Home Ask portfolio must surface submitted-offer records');
assert(askBridge.includes("src==='email'&&ev==='confirmed'"),'Confirmed raw email evidence must outrank derived summaries');
const nativeEntry=fs.readFileSync(path.join(ROOT,'pristeel-native-ui-v3.js'),'utf8');
assert(nativeEntry.includes('pristeel-home-ask-functional-owner-v1.js?v=20260904-ask3'),'Native UI must fetch the current Home Ask bridge version');

console.log('Dynamic runtime reference closure: OK ('+seen.size+' local JS modules verified).');
