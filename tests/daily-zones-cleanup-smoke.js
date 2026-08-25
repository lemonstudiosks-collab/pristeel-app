const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-daily-zones-cleanup-v1.js','utf8');
new Function(source);
assert(!/supaFetch\s*\(/.test(source),'daily-zone cleanup must not read/write Supabase');
assert(!/MutationObserver|setInterval\s*\(/.test(source),'daily-zone cleanup must remain bounded and event-driven');
assert(!/pstOpenProjectWorkspace|pstWorkspaceGo|showPage\s*\(/.test(source),'daily-zone cleanup must not own navigation');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-contacts" class="page active">
 <header class="pcm-head"><div><h1>Kontaktet</h1><p>Old technical copy</p></div><div class="pcm-head-actions"><button data-pcm-refresh>Rifresko</button><button data-pcm-classic>Pamja klasike</button></div></header>
 <div class="pcm-business-cards"><button class="pcm-business-card" data-pcm-business="client">Klient <b data-pcm-business-count>24</b></button><button class="pcm-business-card" data-pcm-business="supplier">Furnitor <b data-pcm-business-count>18</b></button></div>
 <section class="pcm-card"><div class="pcm-card-head"><b>Contact Master</b><small id="pcm-count">42 kontakte</small></div></section>
</div>
<div id="page-workspace-project" class="page"><section class="pwf-project-context"><div class="pwf-project-kpis">4 RFQ · 3 oferta</div></section></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
w.eval(source);
w.PSTDailyZonesCleanupV1.apply();
const contacts=w.document.getElementById('page-workspace-contacts');
assert.equal(contacts.querySelector('.pcm-head h1').textContent,'Partners');
assert.match(contacts.querySelector('.pcm-head p').textContent,/një identitet/i);
assert.equal(contacts.querySelector('.pcm-card-head b').textContent,'Marrëdhëniet');
assert(contacts.querySelector('[data-pcm-refresh]').classList.contains('pst-daily-system-only'));
assert(contacts.querySelector('[data-pcm-classic]').classList.contains('pst-daily-system-only'));
assert([...contacts.querySelectorAll('[data-pcm-business-count],#pcm-count')].every(x=>x.classList.contains('pst-daily-passive-count')));
const css=w.document.getElementById('pst-daily-zones-cleanup-css').textContent;
assert(css.includes('#page-workspace-contacts.active .pst-daily-system-only{display:none!important}'));
assert(css.includes('#page-workspace-contacts.active .pst-daily-passive-count{display:none!important}'));

contacts.classList.remove('active');
w.document.getElementById('page-workspace-project').classList.add('active');
w.PSTDailyZonesCleanupV1.apply();
assert(w.document.querySelector('.pwf-project-kpis').classList.contains('pst-daily-passive-count'));
assert(css.includes('#page-workspace-project.active .pst-daily-passive-count{display:none!important}'));

dom.window.close();
console.log('Daily zones cleanup smoke test passed.');