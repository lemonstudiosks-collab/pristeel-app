import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../spie/data.mjs';

const storage = new Map();
globalThis.localStorage = { getItem: key => storage.get(key) || null };
function login(ref = D.PROJECT_REF, marker = 'user') {
  const token = 'x.' + Buffer.from(JSON.stringify({ ref, role: 'authenticated', exp: Math.floor(Date.now()/1000) + 3600, sub: marker })).toString('base64url') + '.fixture';
  storage.set('pristeel_session', JSON.stringify({ access_token: token, expires_at: Date.now()+3500000 }));
}
const response = data => ({ ok: true, json: async () => data });
test('dedicated route and all public dependencies are packaged without loading global owners', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../pages-artifact-manifest.json',import.meta.url),'utf8'));
  for (const p of ['spie/index.html','spie/workspace.js','spie/data.mjs','spie/workspace.css']) {
    assert(manifest.additionalPublicAssets.some(x => x.path===p), p);
    assert(fs.existsSync(new URL('../'+p,import.meta.url)),p);
  }
  const html = fs.readFileSync(new URL('../spie/index.html',import.meta.url),'utf8');
  assert(!html.includes('pristeel-roles.js'));
  assert(!html.includes('pristeel-project-emails.js'));
});
test('unauthenticated, old-project and expired sessions cannot fetch project data', async () => {
  let calls = 0; globalThis.fetch = async () => { calls++; return response([]); };
  storage.clear(); await assert.rejects(D.files(),/SESSION_REQUIRED/);
  login('isymxqfqzkchbsrbhucf'); await assert.rejects(D.files(),/SESSION_REQUIRED/);
  login(); const s=JSON.parse(storage.get('pristeel_session')); s.expires_at=1;storage.set('pristeel_session',JSON.stringify(s));
  await assert.rejects(D.files(),/SESSION_REQUIRED/);assert.equal(calls,0);
});
test('project-scoped reads coalesce, never write and never request physical document bodies', async () => {
  login(); D.invalidate(); const calls=[];
  globalThis.fetch=async (url,opts)=>{calls.push({url,opts});return response([]);};
  await Promise.all([D.files(),D.files()]); await D.files();
  assert.equal(calls.length,1); const url=new URL(calls[0].url);
  assert.equal(calls[0].opts.method,'GET'); assert.equal(url.searchParams.get('project_id'),'eq.'+D.PROJECT_ID);
  assert.equal(url.searchParams.get('limit'),'50');assert(!url.searchParams.get('select').includes('base64'));
  login(D.PROJECT_REF,'other-user');await D.files();assert.equal(calls.length,2);
});
test('logout during in-flight read discards the response', async () => {
  login(); D.invalidate(); let finish;globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});
  const request=D.emails();await Promise.resolve();storage.clear();finish(response([{subject:'private'}]));
  await assert.rejects(request,/SESSION_CHANGED/);
});
test('read failures retain exact status and explicit retry can recover', async () => {
  login();D.invalidate();let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:false,status:403,json:async()=>({message:'permission denied'})};};
  await assert.rejects(D.files(),/PPPP 403: permission denied/);await assert.rejects(D.files(),/PPPP 403/);assert.equal(calls,1);
  D.invalidate();globalThis.fetch=async()=>response([]);assert.deepEqual(await D.files(),[]);
});
test('currencies remain separate and absent amounts/currencies are not fabricated', () => {
  const totals=D.currencyTotals([{amount:100,currency:'EUR'},{amount:5,currency:'USD'},{amount:0,currency:'EUR'},{amount:7},{amount:null,currency:'EUR'}],r=>r.amount);
  assert.deepEqual(totals,[{currency:'EUR',amount:100},{currency:'USD',amount:5},{currency:'Unknown currency',amount:7}]);
});

test('workspace startup reads only its project and bounded context, without the timed-out intelligence RPC', async () => {
  login();D.invalidate();const calls=[];
  globalThis.fetch=async(url,opts)=>{calls.push({url,opts});const u=new URL(url);assert.equal(opts.method,'GET');
    if(u.pathname.includes('/rpc/'))return {ok:false,status:500,json:async()=>({message:'canceling statement due to statement timeout'})};
    if(u.pathname.endsWith('/projects')){assert.equal(u.searchParams.get('id'),'eq.'+D.PROJECT_ID);assert.equal(u.searchParams.get('limit'),'1');return response([{id:D.PROJECT_ID,name:'SPIE'}]);}
    assert.equal(u.searchParams.get('project_id'),'eq.'+D.PROJECT_ID);assert.equal(u.searchParams.get('limit'),'8');return response([{project_id:D.PROJECT_ID,fact_key:'fixture',fact_status:'observed'}]);};
  const data=await D.workspaceSnapshot();assert.equal(data.project.id,D.PROJECT_ID);assert.equal(data.context_facts.length,1);assert.equal(calls.length,2);
  await D.workspaceSnapshot();assert.equal(calls.length,2);assert.deepEqual(data.read_errors,[]);
});
test('context timeout is explicit partial data; missing/foreign project identities still block startup', async () => {
  login();D.invalidate();globalThis.fetch=async url=>new URL(url).pathname.endsWith('/projects')?response([{id:D.PROJECT_ID}]):{ok:false,status:500,json:async()=>({message:'canceling statement due to statement timeout'})};
  const data=await D.workspaceSnapshot();assert.equal(data.project.id,D.PROJECT_ID);assert.deepEqual(data.context_facts,[]);assert.match(data.read_errors[0].error,/PPPP 500: canceling statement due to statement timeout/);
  for(const rows of [[],[{id:'foreign'}]]){D.invalidate();globalThis.fetch=async url=>response(new URL(url).pathname.endsWith('/projects')?rows:[]);await assert.rejects(D.workspaceSnapshot(),/Identiteti i projektit/);}
  D.invalidate();globalThis.fetch=async url=>response(new URL(url).pathname.endsWith('/projects')?[{id:D.PROJECT_ID}]:[{project_id:'foreign'}]);await assert.rejects(D.workspaceSnapshot(),/Identiteti i fakteve/);
});
test('action failure is cached without retry loops; explicit retry recovers only that query', async () => {
  login();D.invalidate();let calls=0;globalThis.fetch=async(url,opts)=>{calls++;const u=new URL(url);assert.equal(opts.method,'GET');assert.equal(u.searchParams.get('project_id'),'eq.'+D.PROJECT_ID);assert.equal(u.searchParams.get('limit'),'6');return {ok:false,status:500,json:async()=>({message:'canceling statement due to statement timeout'})};};
  await assert.rejects(D.workspaceActions(),/PPPP 500/);await assert.rejects(D.workspaceActions(),/PPPP 500/);assert.equal(calls,1);
  globalThis.fetch=async()=>{calls++;return response([{project_id:D.PROJECT_ID,title:'Canonical action'}]);};assert.equal((await D.workspaceActions({refresh:true}))[0].title,'Canonical action');assert.equal(calls,2);
  D.invalidate();globalThis.fetch=async()=>response([{project_id:'foreign'}]);await assert.rejects(D.workspaceActions(),/Identiteti i veprimeve/);
});
test('unsafe links and unverified latest revisions cannot appear as verified sources', () => {
  assert.equal(D.safeLink('javascript:alert(1)','drive'),'');
  assert.equal(D.safeLink('https://drive.google.com.evil.test/x','drive'),'');
  assert.equal(D.safeLink('https://evil.test/a','gmail'),'');
  assert.equal(D.metadata({file_name:'drawing_rev99_latest.pdf',doc_type:'drawing'}).latest,false);
  assert.equal(D.metadata({notes:'{"revision":"C","is_latest":true}'}).latest,false);
  assert.equal(D.metadata({notes:'{"revision":"C","is_latest":true,"revision_verified":true}'}).latest,true);
});

test('controlled folder metadata merges by exact Drive identity without inferring revisions', () => {
  const data={project:{id:D.PROJECT_ID,drive_folder_id:'folder'},context_facts:[{fact_key:'spie.workspace.evidence.v1',fact_status:'observed',evidence_status:'observed',value:{project_id:D.PROJECT_ID,drive_inventory:{folder_id:'folder',observed_at:'2026-10-05',files:[
    {drive_file_id:'abc',title:'Drawing',drive_url:'https://drive.google.com/file/d/abc/view',category:'Technical',category_verified:false},
    {drive_file_id:'bad',title:'Unsafe',drive_url:'https://evil.test/file/d/bad/view'},
    {drive_file_id:'wrong',title:'Wrong identity',drive_url:'https://drive.google.com/file/d/other/view'}
  ]}}}]};
  assert.equal(D.evidenceFiles(data).length,1);
  const item=D.evidenceFiles(data)[0];assert.equal(D.metadata(item).latest,false);assert.equal(D.metadata(item).categorySuggested,true);
  assert.equal(D.evidenceFiles(data,[{title:'Canonical',drive_url:'https://drive.google.com/file/d/abc/view?usp=drivesdk'}]).length,1);
  data.project.drive_folder_id='other';assert.equal(D.evidenceFiles(data).length,0);
  data.project.drive_folder_id='folder';data.context_facts[0].fact_status='suggested';assert.equal(D.evidenceFiles(data).length,0);
});

