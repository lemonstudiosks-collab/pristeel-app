const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const migration=fs.readFileSync('supabase/migrations/20260823093000_quality_readiness_and_ocr_final_reconcile.sql','utf8');
  const ui=fs.readFileSync('pristeel-quality-readiness-v1.js','utf8');
  const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');

  assert.match(migration,/pppp_project_readiness_v1\(p_project_id uuid\)/i);
  assert.match(migration,/security invoker/i,'readiness RPC must not use SECURITY DEFINER');
  assert.match(migration,/ready_for_human_release/i);
  assert.match(migration,/human_release_required',true/i,'readiness must preserve a human release gate');
  assert.doesNotMatch(migration,/gate_state[^\n]*released/i,'readiness must never report an automatic released state');
  assert.match(migration,/local-ocr-noise-reconcile-v2/i,'tiny Word image noise reconciliation missing');
  assert.match(migration,/partition by a\.project_id,a\.content_sha256/i,'photo dedupe must be exact project + SHA');
  assert.match(migration,/local-ocr-photo-sha-dedupe-v1/i);
  assert.match(migration,/analysis_status='image_review'/i,'unique OCR-empty photos must remain visual review items');
  assert.match(migration,/No content was inferred/i,'photo review must explicitly avoid inferred OCR content');

  assert.match(finalizer,/pristeel-quality-readiness-v1\.js\?v=20260823-1/,'quality readiness loader missing');
  assert.match(ui,/rpc\/pppp_project_readiness_v1/,'readiness UI must use the read-only RPC');
  assert.doesNotMatch(ui,/supaFetch\([^\n]*(?:PATCH|PUT|DELETE)/i,'readiness UI must not mutate data');
  assert.doesNotMatch(ui,/approve|release\s*\(/i,'readiness UI must not contain an approval/release action');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" data-pwf-area="execution"><div id="pst-pi-body"></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstCurrentProjectId='p1';
  w.__pstIntegrityLastData={project:{id:'p1'}};
  let reads=0;
  w.supaFetch=async(path,method,body)=>{
    assert.strictEqual(path,'rpc/pppp_project_readiness_v1');
    assert.strictEqual(method,'POST');
    assert.strictEqual(body.p_project_id,'p1');
    reads++;
    return {generated_at:'2026-08-23T08:00:00Z',gate_state:'blocked_review',human_release_required:true,requirements:{confirmed:381,review:26,categories:{standard:300}},documents:{review:6,image_review:0},supplier_decisions:{selected_producer:1,pricing_basis:1},execution:{open_tasks:2,quality_open_tasks:1}};
  };
  w.eval(ui);
  await new Promise(r=>setTimeout(r,360));
  const panel=w.document.getElementById('pst-quality-readiness');
  assert.ok(panel,'quality readiness panel did not render in Execution');
  assert.match(panel.textContent,/KËRKON REVIEW/);
  assert.match(panel.textContent,/381 të konfirmuara/);
  assert.match(panel.textContent,/26/);
  assert.match(panel.textContent,/lirimi final mbetet vendim njerëzor/i);
  assert.ok(reads>=1,'readiness RPC was not read');
  assert.strictEqual(panel.querySelectorAll('[data-release],.release,.approve').length,0,'readiness panel exposed an automatic release control');
  dom.window.close();
  console.log('Quality readiness + OCR final reconciliation smoke: OK');
})().catch(e=>{console.error(e);process.exit(1);});
