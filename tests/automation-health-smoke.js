const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const migration=fs.readFileSync('supabase/migrations/20260823073000_automation_operational_readiness_phase_a.sql','utf8');
  assert.match(migration,/pppp_automation_health_v1/i,'health RPC missing');
  assert.match(migration,/where analysis_status='needs_vision'/i,'legacy Vision migration missing');
  assert.match(migration,/analysis_status='needs_ocr'/i,'legacy OCR route missing');
  assert.match(migration,/smime\.p7s/i,'S\/MIME noise reconciliation missing');
  assert.match(migration,/partition by project_id,content_sha256/i,'SHA-scoped duplicate reconciliation missing');
  assert.match(migration,/project-drive-reconciler-hourly/i,'Drive reconciler cron missing');
  assert.match(migration,/revoke all on function public\.pppp_automation_health_v1\(\) from public, anon/i,'health RPC public ACL guard missing');
  assert.match(migration,/revoke all on function public\.project_drive_reconciler_internal_request\(integer\) from public, anon, authenticated/i,'Drive internal caller ACL guard missing');

  const asyncGuard=fs.readFileSync('supabase/migrations/20260825211500_automation_health_async_http_guard.sql','utf8');
  assert.match(asyncGuard,/net\._http_response/i,'health v2 must inspect pg_net HTTP responses');
  assert.match(asyncGuard,/http_recent_failed/i,'health v2 must expose recent async failures');
  assert.match(asyncGuard,/status_code,0\) >= 400/i,'health v2 must treat HTTP 4xx\/5xx as failures');
  assert.match(asyncGuard,/revoke all on function public\.pppp_automation_health_v1\(\) from public, anon/i,'health v2 must preserve RPC ACL guard');

  const drive=fs.readFileSync('supabase/functions/project-drive-reconciler/index.ts','utf8');
  assert.match(drive,/gmail_tracker_cron_authorized/,'Drive function must use existing cron authorization');
  assert.match(drive,/mode!=='apply'/,'Drive preview gate missing');
  assert.match(drive,/Multiple root folders/i,'Drive ambiguity guard missing');
  assert.match(drive,/multiple_matching_folders/,'per-project folder ambiguity guard missing');
  assert.match(drive,/\.is\('drive_folder_id',null\)/,'Drive reconciler must only target unlinked projects');

  const theme=fs.readFileSync('pristeel-section-theme-v1.js','utf8');
  assert.match(theme,/pristeel-automation-health-v1\.js\?v=/,'current section layer does not load Automation Health');

  const dom=new JSDOM(`<!doctype html><html><head></head><body><div id="page-workspace-apps" class="active"><div class="pst-ws-app-grid"></div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const payload={
    generated_at:'2026-08-25T21:30:00Z',
    crons:{active:13,latest_succeeded:13,latest_failed:0,http_recent_failed:2,http_recent_5xx:2,http_latest_failed_at:'2026-08-25T21:29:00Z',jobs:[{name:'gmail-fast-ingest-5m',schedule:'*/5 * * * *',status:'succeeded',started_at:'2026-08-25T21:25:00Z'}]},
    workers:{ocr:[{worker_id:'mac-mini-01',enabled:true,last_seen_at:'2026-08-25T21:29:00Z'}],semantic:[{label:'Mac mini local semantic worker v2',active:true,last_used_at:'2026-08-25T21:28:00Z'}]},
    queues:{ocr:{completed:14,failed:0},semantic:{completed:48,superseded:25,pending:4}},
    backlog:{legacy_needs_vision:0,needs_ocr:0,local_ocr_queued:0,local_ocr_failed:0,document_review_tasks:4,rfq_draft_review:10,projects_without_drive:0,project_discovery_open:22}
  };
  let calls=0;
  w.supaFetch=async(path,method,body)=>{calls++;assert.strictEqual(path,'rpc/pppp_automation_health_v1');assert.strictEqual(method,'POST');assert.strictEqual(JSON.stringify(body),'{}');return payload;};
  w.eval(fs.readFileSync('pristeel-automation-health-v1.js','utf8'));
  await new Promise(r=>setTimeout(r,30));
  const panel=w.document.getElementById('pst-auto-health');
  assert.ok(panel,'Automation Health panel did not mount on Modules');
  assert.match(panel.textContent,/Shëndeti i automatizimeve/);
  assert.match(panel.textContent,/13 cron sukses/);
  assert.match(panel.textContent,/2 HTTP problem/,'async HTTP failure count must be visible even when cron scheduler says success');
  assert.match(panel.textContent,/Edge HTTP failures/,'real pg_net failure row must be visible');
  assert.match(panel.textContent,/RFQ draft review/);
  assert.ok(calls>=1,'Automation Health did not read its RPC');
  assert.doesNotMatch(fs.readFileSync('pristeel-automation-health-v1.js','utf8'),/supaFetch\([^\n]*['"](?:PATCH|PUT|DELETE)['"]/,'Automation Health UI must stay read-only');
  dom.window.close();
  console.log('Automation health async HTTP guard smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
