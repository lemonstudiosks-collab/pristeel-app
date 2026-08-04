const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
const w = dom.window;
w.console = console;
const calls = [];
const rows = {
  existing: { id: 1, gmail_message_id: 'msg-existing', project_id: 'project-a' },
  unassigned: { id: 2, gmail_message_id: 'msg-new', project_id: null }
};
w.supaFetch = async (path, method, body) => {
  method = method || 'GET';
  calls.push({ path, method, body });
  if (method === 'GET' && path.startsWith('project_emails?id=eq.1')) return [rows.existing];
  if (method === 'GET' && path.startsWith('project_emails?id=eq.2')) return [rows.unassigned];
  if (method === 'GET' && path.startsWith('project_email_links?')) return [];
  return [];
};
w.eval(fs.readFileSync('pristeel-email-relation-safety-v2.js', 'utf8'));

(async () => {
  await w.supaFetch('project_emails?id=eq.1', 'PATCH', {
    project_id: 'project-b', suggested_project_id: 'project-b', match_method: 'gmail-panel', match_confidence: 100
  });
  const protectedPatch = calls.find(c => c.path === 'project_emails?id=eq.1' && c.method === 'PATCH');
  assert.ok(protectedPatch, 'Protected patch did not reach the original client');
  assert.ok(!Object.prototype.hasOwnProperty.call(protectedPatch.body, 'project_id'), 'Existing project assignment was overwritten');
  assert.strictEqual(protectedPatch.body.suggested_project_id, 'project-b');
  assert.ok(calls.some(c => c.path === 'project_email_links' && c.method === 'POST' && c.body[0].project_id === 'project-b'), 'New multi-project relation was not added');

  calls.length = 0;
  await w.supaFetch('project_emails?id=eq.2', 'PATCH', {
    project_id: 'project-b', suggested_project_id: 'project-b', match_method: 'gmail-panel', match_confidence: 100
  });
  const firstAssignment = calls.find(c => c.path === 'project_emails?id=eq.2' && c.method === 'PATCH');
  assert.strictEqual(firstAssignment.body.project_id, 'project-b', 'A previously unassigned email should keep its first direct project assignment');
  assert.ok(calls.some(c => c.path === 'project_email_links' && c.method === 'POST'), 'First assignment should also create a relation row');

  console.log('Email relation safety smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
