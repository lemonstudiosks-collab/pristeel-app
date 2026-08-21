const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const source=fs.readFileSync('pristeel-task-source-actions-v1.js','utf8');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'Task source actions must not observe or poll the page');
  assert(!/supaFetch\s*\(|fetch\s*\(|new\s+XMLHttpRequest/.test(source),'Task source actions must remain read-only and query-free');
  assert(!/(?:window\.)?(?:pstWsActionOpen|pstWorkspaceGo|openTaskDetail)\s*=(?!=)/.test(source),'Task source actions must not override navigation or task behavior');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-home">
      <div id="pst-ws-home-actions">
        <div class="pst-ws-action" data-ws-action="ted-1" onclick="pstWsActionOpen('ted-1')">
          <div class="pst-ws-action-main">
            <div class="pst-ws-action-title">TED urgjent · Stahlbauarbeiten</div>
            <div class="pst-ws-action-meta">Afati nesër · Ref: 700001-2026 · https://ted.europa.eu/en/notice/700001-2026/html</div>
          </div>
          <span class="pst-ws-action-controls"><button class="done">Kryer</button><button class="dismiss">Hiqe</button></span>
        </div>
        <div class="pst-ws-action" data-ws-action="unsafe">
          <div class="pst-ws-action-main"><div class="pst-ws-action-title">Jo burim</div><div class="pst-ws-action-meta">http://example.com/not-secure</div></div>
          <span class="pst-ws-action-controls"><button>Kryer</button><button>Hiqe</button></span>
        </div>
      </div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});
  const w=dom.window;
  const opened=[];
  w.open=(url,target,features)=>{opened.push({url,target,features});return null;};
  w.eval(source);

  const api=w.PSTTaskSourceActionsV1;
  assert(api,'Task source action API missing');
  assert.strictEqual(api.sourceUrl('x https://ted.europa.eu/en/notice/1/html.'),'https://ted.europa.eu/en/notice/1/html','HTTPS source extraction failed');
  assert.strictEqual(api.sourceUrl('http://ted.europa.eu/not-allowed'),'','HTTP source must never be exposed as source shortcut');
  assert.strictEqual(api.sourceUrl('javascript:alert(1)'),'','non-HTTPS scheme must never be exposed');

  const row=w.document.querySelector('[data-ws-action="ted-1"]');
  const originalOnclick=row.getAttribute('onclick');
  const done=row.querySelector('.done');
  const dismiss=row.querySelector('.dismiss');
  assert.strictEqual(api.enhanceRow(row),true,'TED action row was not enhanced');
  assert.strictEqual(row.getAttribute('onclick'),originalOnclick,'Existing action handler changed');
  assert.strictEqual(row.querySelector('.done'),done,'Existing complete action was replaced');
  assert.strictEqual(row.querySelector('.dismiss'),dismiss,'Existing dismiss action was replaced');
  const button=row.querySelector('.pst-task-source-open');
  assert(button,'Source button missing');
  button.click();
  assert.deepStrictEqual(opened,[{url:'https://ted.europa.eu/en/notice/700001-2026/html',target:'_blank',features:'noopener,noreferrer'}],'Source button did not open the exact safe source');
  assert.strictEqual(api.enhanceRow(row),false,'Source button was duplicated');
  assert.strictEqual(api.enhanceRow(w.document.querySelector('[data-ws-action="unsafe"]')),false,'Unsafe HTTP row received a source button');

  const decorated=w.document.createElement('div');
  decorated.className='pst-ws-action';
  decorated.dataset.pstOriginalMeta='Vendi DEU · https://ted.europa.eu/en/notice/2/html';
  decorated.innerHTML='<div class="pst-ws-action-meta" title="Afati sot">Afati sot</div><span class="pst-ws-action-controls"><button>Kryer</button><span class="pst-dash-task-menu"></span></span>';
  w.document.getElementById('pst-ws-home-actions').appendChild(decorated);
  assert.strictEqual(api.enhanceRow(decorated),true,'Already-refined row did not use preserved original metadata');
  assert.strictEqual(decorated.querySelector('.pst-dash-task-menu').previousElementSibling.className,'pst-task-source-open','Source button was not placed before the task menu');

  dom.window.close();
  console.log('Workspace task source actions smoke: OK');
})();