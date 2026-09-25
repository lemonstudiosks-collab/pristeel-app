import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

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
assert.match(ui, /actionable=all\.filter\(function\(r\)\{return operatingTarget\(r\)&&!hasOutboundHistory\(r\)\}\)/, 'E: targets with outbound history must not return to the actionable list');
assert.match(ui, /life==='waiting'\?'Në pritje'/, 'F: contacted card must render Në pritje after sent evidence');

queue = { ...queue, status: 'replied', replied_at: '2026-09-24T13:00:00Z' };
assert.equal(lifecycle(target), 'replied', 'G: reply evidence must become replied/active');
assert.match(ui, /lbl=life==='draft'\?'Draft gati':life==='stale'\?'Draft i mëparshëm':life==='waiting'\?'Në pritje':life==='replied'\?'Përgjigje \/ Aktiv':'Historik'/, 'G: contacted card must render Përgjigje / Aktiv');

queue = { status: 'stale', suppression_reason: 'gmail_draft_missing', gmail_draft_id: 'draft-1', gmail_thread_id: 'thread-1' };
assert.equal(lifecycle(target), 'action', 'H: missing/stale draft without Sent evidence must never become waiting');

const syncSource = edge.match(/async function syncLifecycle\(\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(syncSource, 'canonical Material Trade Gmail sync must exist');
assert.match(syncSource, /threadLifecycle\(q\.gmail_thread_id\)/, 'sent detection must use the exact canonical Gmail thread');
assert.match(syncSource, /if\(life\.sent\)/, 'sent transition must require real Gmail Sent evidence');
assert.doesNotMatch(syncSource, /\.insert\(/, 'I: repeated lifecycle sync must not create outbound rows');

assert.match(ui, /#page-dach-steel-sales \.pst-dss-primary-wide\{[^}]*background:#176fa8;[^}]*color:#fff!important;[^}]*-webkit-text-fill-color:#fff!important/, 'J: enabled Gmail button text must override global styles with true white');
assert.match(ui, /#page-dach-steel-sales \.pst-dss-primary-wide:hover,[^{]+\{[^}]*color:#fff!important;[^}]*-webkit-text-fill-color:#fff!important\}/, 'J: interactive Gmail button states must keep white text');
assert.match(ui, /#page-dach-steel-sales \.pst-dss-primary-wide:disabled\{opacity:1;cursor:not-allowed;color:#fff!important;-webkit-text-fill-color:#fff!important\}/, 'J: disabled draft button must keep full opacity and white text');
const buttonCss = ui.match(/'#page-dach-steel-sales \.pst-dss-primary-wide\{[^']+'/)?.[0]?.slice(1, -1);
assert.ok(buttonCss, 'J: draft button CSS rule must be extractable');
const dom = new JSDOM('<style></style><section id="page-dach-steel-sales"><button class="pst-dss-primary-wide">Enabled</button><button class="pst-dss-primary-wide" disabled>Disabled</button></section>');
dom.window.document.querySelector('style').textContent = 'button{color:#425e76!important}' + buttonCss;
const [enabledButton, disabledButton] = dom.window.document.querySelectorAll('button');
const enabledStyle = dom.window.getComputedStyle(enabledButton);
const disabledStyle = dom.window.getComputedStyle(disabledButton);
assert.equal(enabledStyle.color, 'rgb(255, 255, 255)', 'J: enabled computed text color must be white');
assert.equal(disabledStyle.color, 'rgb(255, 255, 255)', 'J: disabled computed text color must be white');
assert.equal(disabledStyle.opacity, '1', 'J: disabled computed opacity must not fade the whole button');

assert.match(ui, /state\.gmailOpenedAt=Date\.now\(\);window\.open\(gu,'_blank','noopener'\)/, 'opening Gmail must arm one lifecycle refresh');
assert.match(ui, /state\.gmailOpenedAt=0;\s*syncLifecycleUi\(true\)/, 'returning from Gmail must consume the refresh marker before syncing');
assert.match(ui, /window\.addEventListener\('focus',syncAfterGmailReturn\)/, 'window focus must trigger the bounded Gmail-return sync');
assert.match(ui, /document\.addEventListener\('visibilitychange',syncAfterGmailReturn\)/, 'tab visibility return must trigger the bounded Gmail-return sync');
assert.match(ui, /Date\.now\(\)-state\.lifecycleSyncedAt<300000/, 'ordinary automatic sync must retain the five-minute throttle');

console.log('Material Trade lifecycle UI smoke: PASS');
