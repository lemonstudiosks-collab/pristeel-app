const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const src=fs.readFileSync('pristeel-project-identity-lock-v1.js','utf8');
  new Function(src);
  assert(!/MutationObserver|setInterval\s*\(/.test(src),'Identity lock must not observe or poll globally');

  const dom=new JSDOM('<!doctype html><html><body><select id="global-proj"><option value="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee">Dukley</option><option value="11111111-2222-3333-4444-555555555555">Dukley</option></select></body></html>',{runScripts:'outside-only',url:'https://example.test/pristeel-procurement.html'});
  const w=dom.window;
  let opened=[];
  w.loadProject=function(id){opened.push(['legacy',id]);};
  w.pstOpenProjectWorkspace=function(id){opened.push(['workspace',id]);};
  w.eval(src);
  const good='11111111-2222-3333-4444-555555555555';
  w.PSTProjectIdentityLockV1.remember(good,true);
  assert.strictEqual(w.localStorage.getItem('pristeel_cur_proj'),good,'Legacy restore key must hold exact UUID');
  assert.strictEqual(w.localStorage.getItem('pst_exact_project_id_v1'),good,'Exact project key must persist');
  assert.strictEqual(w.sessionStorage.getItem('pst_exact_project_id_v1'),good,'Session exact project key must persist');
  assert.strictEqual(new URL(w.location.href).searchParams.get('project_id'),good,'URL must carry exact project UUID');
  w.loadProject(good);
  assert.strictEqual(w.localStorage.getItem('pristeel_cur_proj'),good,'Wrapped loadProject must preserve exact UUID after legacy reset window');
  w.pstOpenProjectWorkspace(good);
  await Promise.resolve();
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(w.PSTProjectIdentityLockV1.current(),good,'Workspace open must preserve exact identity');
  assert.deepStrictEqual(opened,[['legacy',good],['workspace',good]]);
  dom.window.close();
  console.log('Project identity lock smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
