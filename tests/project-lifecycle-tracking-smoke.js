const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-lifecycle-tracking-v1.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Lifecycle tracking must not poll or globally observe');
  assert(source.includes('project_emails?project_id=not.is.null'),'Project cards must derive visible activity from linked project emails');
  assert(source.includes('Përmbledh projektin'),'Project Intelligence action must be visibly named');
  assert(!/messages\/send|drafts\/send|\/send\b/.test(source),'Lifecycle tracking must never send Gmail messages');

  const dom=new JSDOM(`<!doctype html><html><body>
    <div id="page-workspace-project" class="pf2-on">
      <div class="pst-pi-actions">
        <button class="pst-pi-btn">Projektet</button>
        <button class="pst-pi-btn">Rifresko</button>
        <button class="pst-pi-btn primary">Puno me projektin</button>
      </div>
    </div>
    <select id="pst-pm-sort"><option value="activity" selected>Aktiviteti</option></select>
    <div class="pst-pm-list">
      <article class="pst-pm-row" data-project-id="p1">
        <div class="pst-pm-meta">
          <div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Faza</div><div class="pst-pm-meta-value">Dorëzim</div></div>
          <div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Statusi</div><span class="pst-pm-badge">Realizuar</span></div>
          <div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Afati</div><div class="pst-pm-meta-value">Vonuar 22 ditë</div></div>
          <div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Aktiviteti</div><div class="pst-pm-meta-value">Para 32 ditësh</div></div>
        </div>
      </article>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.Date.now=()=>new Date('2026-08-15T12:00:00Z').getTime();
  w.__pstCurrentProjectId='p1';w._curProjId='p1';
  let opened='';
  w.PSTProjectSummaryCommandV1={open:id=>{opened=id;}};
  w.supaFetch=async path=>path.startsWith('project_emails?')?[{project_id:'p1',sent_at:'2026-08-14T10:42:45Z',subject:'Re: Reklamation BE-115083'}]:[];
  w.eval(source);
  await w.PSTProjectLifecycleTrackingV1.refreshProjectCards(true);
  w.PSTProjectLifecycleTrackingV1.decorateSummary();

  const button=w.document.querySelector('[data-pst-project-summary]');
  assert(button,'Modern project header must receive Project Intelligence action deterministically');
  assert.strictEqual(button.textContent,'Përmbledh projektin');
  assert(button.classList.contains('pst-plt-summary'),'Project summary action must use the prominent blue treatment');
  const buttons=[...w.document.querySelectorAll('.pst-pi-actions button')];
  assert(buttons.indexOf(button)<buttons.findIndex(x=>x.textContent==='Puno me projektin'),'Project summary must sit before the main work action');
  button.click();
  await new Promise(r=>setTimeout(r,0));
  assert.strictEqual(opened,'p1','Project summary action must open Project Intelligence for the active project');

  const blocks=[...w.document.querySelectorAll('.pst-pm-meta-block')];
  const value=label=>blocks.find(x=>x.querySelector('.pst-pm-meta-label').textContent===label).querySelector('.pst-pm-meta-value');
  assert.strictEqual(value('Aktiviteti').textContent,'Dje','Project activity must follow the latest linked email, not project creation time');
  assert.strictEqual(value('Afati').textContent,'Përfunduar','Terminal projects must not remain visually overdue');

  dom.window.close();
  console.log('Project lifecycle tracking smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
