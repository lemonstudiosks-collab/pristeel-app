import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../pristeel-project-centric-workflow-v1.js',import.meta.url),'utf8');
const partner=source.slice(source.indexOf('async function partnerContext()'),source.indexOf('async function serverTenderAnalysis'));
const analysis=source.slice(source.indexOf('async function serverTenderAnalysis'),source.indexOf('function tenderFactsHtml'));
function fixture(fail=false) {
  const calls=[],asks=[],tenderState={partners:null};
  const ctx={tenderState,A:x=>Array.isArray(x)?x:[],N:x=>String(x||'').toLowerCase(),winnerRole:()=> 'unknown',tenderMode:()=> 'local',
    db:async path=>{calls.push(path);if(fail)throw new Error('read unavailable');return [{name:'Manufacturer',relation:['manufacturer']},{name:'Customer only',relation:['client']}];},
    window:{PSTOpenAIAssistantV1:{ask:async(q,options)=>{asks.push(options);return {answer:'Review only'};}}}};
  vm.createContext(ctx);vm.runInContext(partner+'\n'+analysis,ctx);return {ctx,calls,asks};
}
test('manual tender analysis passes bounded canonical review candidates and reuses the cache',async()=>{
  const f=fixture();assert.equal(f.calls.length,0);
  await f.ctx.serverTenderAnalysis({id:'tender'});await f.ctx.serverTenderAnalysis({id:'tender'});
  assert.equal(f.calls.length,1);assert(f.calls[0].endsWith('limit=80'));
  assert.deepEqual(Array.from(f.asks[0].context.candidate_partners,x=>x.name),['Manufacturer']);
  assert.equal(f.asks[0].context.partner_context_complete,false);
  assert.match(f.asks[0].context.partner_context_note,/human approval/);
});
test('unavailable partner data stays explicitly incomplete',async()=>{
  const f=fixture(true);await f.ctx.serverTenderAnalysis({id:'tender'});
  assert.equal(f.asks[0].context.candidate_partners.length,0);
  assert.equal(f.asks[0].context.partner_context_complete,false);
  assert.match(f.asks[0].context.partner_context_note,/absence is not proof/);
});
