const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

async function main(){
  let calls = 0;
  const window = {
    __pstProjectIntegrityReuseMs: 250,
    PSTProjectDataIntegrity: {
      load: async function(id){
        calls += 1;
        await new Promise(resolve => setTimeout(resolve, 20));
        return { project: { id: String(id) } };
      }
    }
  };
  const document = {
    addEventListener: function(){},
    getElementById: function(){ return null; },
    createElement: function(){ return { style:{}, remove:function(){}, parentNode:null }; },
    body: { appendChild: function(){} }
  };
  const context = { window, document, console, Promise, Date, setTimeout, clearTimeout, isFinite, Number, String };
  vm.runInNewContext(fs.readFileSync('pristeel-project-integrity-safety-v2.js','utf8'), context, { filename:'pristeel-project-integrity-safety-v2.js' });

  assert.strictEqual(window.PSTProjectIntegritySafetyV2.loadDeduperInstalled, true, 'deduper must install');

  const a = window.PSTProjectDataIntegrity.load('p1');
  const b = window.PSTProjectDataIntegrity.load('p1');
  const pair = await Promise.all([a,b]);
  assert.strictEqual(calls, 1, 'concurrent identical project reads must be coalesced');
  assert.strictEqual(pair[0].project.id, 'p1');
  assert.strictEqual(pair[1].project.id, 'p1');

  const immediate = await window.PSTProjectDataIntegrity.load('p1');
  assert.strictEqual(immediate.project.id, 'p1');
  assert.strictEqual(calls, 1, 'immediate layered reload must reuse the successful result');

  await new Promise(resolve => setTimeout(resolve, 290));
  await window.PSTProjectDataIntegrity.load('p1');
  assert.strictEqual(calls, 2, 'explicit later refresh must still reach the underlying loader');

  await window.PSTProjectDataIntegrity.load('p2');
  assert.strictEqual(calls, 3, 'different projects must never reuse another project result');

  console.log('project integrity dedupe smoke: ok');
}

main().catch(err => { console.error(err); process.exit(1); });
