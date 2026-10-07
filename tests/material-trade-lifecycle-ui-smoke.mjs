import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync('pristeel-dach-steel-sales-v1.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts', 'utf8');

const lifecycleSource = ui.match(/function lifecycle\(r\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(lifecycleSource, 'Material Trade lifecycle owner must exist');

const N = value => String(value == null ? '' : value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
let queue = null;
const lifecycle = new Function('N', 'outboundFor', `${lifecycleSource}; return lifecycle;`)(N, () => queue);
const target = { id: 'target-1', outreach_status: '' };

queue = null;
assert.equal(lifecycle(target), 'action', 'A: target without outreach must remain actionable');

queue = { status: 'candidate', gmail_draft_id: 'draft-1', gmail_draft_message_id: 'message-1', gmail_thread_id: 'thread-1' };
assert.equal(lifecycle(target), 'draft', 'B/C: a successful live Gmail draft must remain Draft gati');

queue = { ...queue, status: 'sent', sent_at: '2026-09-24T12:00:00Z' };
assert.equal(lifecycle(target), 'waiting', 'D: Gmail Sent evidence must become waiting');
assert.match(ui, /function draftReady/,'Readiness must exclude existing outreach history');
assert.match(ui, /if\(life==='waiting'\)/,'Sent evidence must render a contacted state');

queue = { ...queue, status: 'replied', replied_at: '2026-09-24T13:00:00Z' };
assert.equal(lifecycle(target), 'replied', 'G: reply evidence must become replied/active');
assert.match(ui, /if\(life==='replied'\)return 'Përgjigje e marrë'/,'Reply state is rendered separately');

queue = { status: 'stale', suppression_reason: 'gmail_draft_missing', gmail_draft_id: 'draft-1', gmail_thread_id: 'thread-1' };
assert.equal(lifecycle(target), 'action', 'H: missing/stale draft without Sent evidence must never become waiting');

const syncSource = edge.match(/async function syncLifecycle\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(syncSource, 'canonical Material Trade Gmail sync must exist');
assert.match(syncSource, /threadLifecycle\(q\.gmail_thread_id\)/, 'sent detection must use the exact canonical Gmail thread');
assert.match(syncSource, /if\(life\.sent\)/, 'sent transition must require real Gmail Sent evidence');
assert.doesNotMatch(syncSource, /\.insert\(/, 'I: repeated lifecycle sync must not create outbound rows');

const css=fs.readFileSync('pristeel-spie-standard.css','utf8');
assert.match(css, /#page-dach-steel-sales :is\(\.pst-dss-primary-wide[^}]+background:#fff!important[^}]+var\(--pst-accent\)/,'Gmail button uses the shared calm design');

assert.match(ui, /state\.gmailOpenedAt=Date\.now\(\);window\.open\(gu,'_blank','noopener'\)/, 'opening Gmail must arm one lifecycle refresh');
assert.match(ui, /state\.gmailOpenedAt=0;syncLifecycleUi\(true\)/, 'returning from Gmail must consume the refresh marker before syncing');
assert.match(ui, /syncLifecycleUi\(false\)/, 'foreground return also reconciles sends made outside the module, with a throttle');
assert.match(css, /minmax\(56px,\.35fr\)/, 'country heading has enough space');
assert.match(css, /pst-dss-table-head > span[^}]*white-space:nowrap/, 'header words never break onto another line');
assert.match(ui, /window\.addEventListener\('focus',syncAfterGmailReturn\)/, 'window focus must trigger the bounded Gmail-return sync');
assert.match(ui, /document\.addEventListener\('visibilitychange',syncAfterGmailReturn\)/, 'tab visibility return must trigger the bounded Gmail-return sync');
assert.match(ui, /Date\.now\(\)-state\.lifecycleSyncedAt<300000/, 'ordinary automatic sync must retain the five-minute throttle');

console.log('Material Trade lifecycle UI smoke: PASS');


