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
  const request=D.emails();storage.clear();finish(response([{subject:'private'}]));
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
test('unsafe links and unverified latest revisions cannot appear as verified sources', () => {
  assert.equal(D.safeLink('javascript:alert(1)','drive'),'');
  assert.equal(D.safeLink('https://drive.google.com.evil.test/x','drive'),'');
  assert.equal(D.safeLink('https://evil.test/a','gmail'),'');
  assert.equal(D.metadata({file_name:'drawing_rev99_latest.pdf',doc_type:'drawing'}).latest,false);
  assert.equal(D.metadata({notes:'{"revision":"C","is_latest":true}'}).latest,false);
  assert.equal(D.metadata({notes:'{"revision":"C","is_latest":true,"revision_verified":true}'}).latest,true);
});
