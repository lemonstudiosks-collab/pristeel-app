const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

async function testWorkspaceIntegritySafety() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://localhost/pristeel-procurement.html',
    runScripts: 'outside-only'
  });
  const w = dom.window;
  let contactSyncs = 0;
  let refreshes = 0;
  const writes = [];
  w.console = console;
  w.__pstIntegrityLastData = { project: { id: 'project-1' } };
  w.pstSyncProjectContacts = async id => { assert.strictEqual(id, 'project-1'); contactSyncs++; };
  w.pstPiRefresh = () => { refreshes++; };
  w.supaFetch = async (path, method, body) => { if (method && method !== 'GET') writes.push({ path, method, body }); return []; };
  w.pstPiRepair = async () => { await w.supaFetch('project_emails?id=eq.1', 'PATCH', { project_id: 'project-1' }); };
  w.eval(fs.readFileSync('pristeel-project-integrity-safety-v2.js', 'utf8'));

  await w.pstPiRepair();
  assert.strictEqual(contactSyncs, 1, 'Contact sync was not called');
  assert.strictEqual(refreshes, 1, 'Project workspace was not refreshed');
  assert.strictEqual(writes.length, 0, 'Safety patch must not rewrite email relations');
  dom.window.close();
}

async function testProjectCreateDedupeGuard() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://localhost/pristeel-procurement.html',
    runScripts: 'outside-only'
  });
  const w = dom.window;
  w.console = console;
  let rows = [
    { id:'p1', name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA', client:'ITALIAN STYLE', ref:'', business_ref:null, identity_aliases:[], status:'pritje', created_at:'2026-08-01T00:00:00Z' },
    { id:'pairbus', name:'Airbus H24X — Halle 24X ModOps — Übergänge Ebene 1 & 2 [260784]', client:'Stacon GmbH & Co. KG', ref:'25007HH', business_ref:'25007HH', identity_aliases:['260784','260784_Airbus H24X_Anfrage Fertigung'], status:'humbur', created_at:'2026-07-01T00:00:00Z' }
  ];
  let inserts = 0;
  const passthrough = [];
  w.supaFetch = async (path, method, body) => {
    if (path.indexOf('projects?select=id,name,client,ref,business_ref,identity_aliases,status,created_at') === 0) return rows.map(x => ({...x}));
    if (path === 'projects' && method === 'POST') {
      inserts++;
      const created = { id:'new-'+inserts, identity_aliases:[], ...body, created_at:'2026-08-11T00:00:00Z' };
      rows.push(created);
      return [created];
    }
    passthrough.push({path, method, body});
    return [{ok:true}];
  };

  w.eval(fs.readFileSync('pristeel-project-create-dedupe-guard-v1.js', 'utf8'));
  assert.strictEqual(w.PSTProjectCreateDedupeGuard.isInstalled(), true, 'Dedupe guard did not install');

  const reused = await w.supaFetch('projects','POST',{
    name:'Italian Style – Dukley Seafront Restoran – Budva',
    client:'ITALIAN STYLE',
    ref:''
  });
  assert.strictEqual(inserts, 0, 'Exact duplicate should not insert a new project');
  assert.strictEqual(reused[0].id, 'p1', 'Exact duplicate should reuse the existing project');
  assert.strictEqual(reused[0].__pst_reused_existing, true, 'Reuse marker missing');

  const aliasReused = await w.supaFetch('projects','POST',{
    name:'260784_Airbus H24X_Anfrage Fertigung',
    client:'Stacon',
    ref:'260784'
  });
  assert.strictEqual(inserts, 0, 'Airbus request alias must not create a duplicate project');
  assert.strictEqual(aliasReused[0].id, 'pairbus', 'Airbus 260784 alias must resolve to canonical Halle 24X project');
  assert.strictEqual(aliasReused[0].__pst_reuse_reason, 'identity_alias', 'Alias reuse must be auditable');

  const created = await w.supaFetch('projects','POST',{
    name:'Completely New Project',
    client:'New Client',
    ref:'RFQ-001'
  });
  assert.strictEqual(inserts, 1, 'New project should be inserted exactly once');
  assert.strictEqual(created[0].id, 'new-1');

  rows.push({ id:'p2', name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA', client:'ITALIAN STYLE', ref:'', business_ref:null, identity_aliases:[], status:'pritje', created_at:'2026-08-02T00:00:00Z' });
  await assert.rejects(
    () => w.supaFetch('projects','POST',{
      name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',
      client:'ITALIAN STYLE',
      ref:''
    }),
    error => error && error.code === 'PST_DUPLICATE_PROJECT_CONFLICT' && /Dublikatat/.test(error.message),
    'Two existing exact duplicates must block creation and require Duplicate Manager'
  );
  assert.strictEqual(inserts, 1, 'Conflict must not insert another project');

  const other = await w.supaFetch('contacts','POST',{name:'Not a project'});
  assert.deepStrictEqual(other, [{ok:true}], 'Non-project POST must pass through untouched');
  assert.strictEqual(passthrough.length, 1, 'Non-project POST should hit original supaFetch exactly once');
  dom.window.close();
}

(async () => {
  await testWorkspaceIntegritySafety();
  await testProjectCreateDedupeGuard();
  console.log('Workspace safety smoke test passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});