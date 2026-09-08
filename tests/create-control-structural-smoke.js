const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('pristeel-workspace-architecture-v1.js','utf8');
const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
const core=fs.readFileSync('pristeel-native-ui-v4-core.js','utf8');
function wait(ms){return new Promise(r=>setTimeout(r,ms));}

assert(src.includes('function createControlMarkup()'),'workspace must own canonical create markup');
assert(src.includes("window.PSTWorkspaceCreateControlV1={owner:'pristeel-workspace-architecture-v1'"),'workspace create owner contract missing');
assert(src.includes('width="16" height="16" aria-hidden="true" focusable="false"'),'create SVG dimensions must be explicit in component markup');
assert(!entry.includes('snapshotCreateControl'),'v3 may not snapshot create DOM');
assert(!entry.includes('repairCreateControl'),'v3 may not repair create DOM');
assert(!core.includes("create.textContent='+"),'Home owner may not replace create DOM');

(async()=>{
  const dom=new JSDOM('<!doctype html><html><head></head><body class="pst-ui-v2"><div class="sidebar" id="pst-v2-sidebar"></div><main class="content"></main></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.scrollTo=()=>{};
  w.supaFetch=()=>Promise.resolve([]);
  let project=0,documents=[],selected=0,pages=[];
  w.newProject=()=>{project++;};
  w.pstOpenDocumentCenter=(type)=>{documents.push(type);};
  w.pstCreateSelectedDocument=()=>{selected++;};
  w.showPage=(page)=>{pages.push(page);};
  w.eval(src);
  await wait(360);
  const wrap=w.document.getElementById('pst-ws-create');
  assert(wrap,'workspace did not render + Krijo');
  assert.strictEqual(wrap.getAttribute('data-pst-create-owner'),'workspace-v1','unexpected + Krijo structural owner');
  const main=wrap.querySelector('.pst-ws-create-main');
  const items=[...wrap.querySelectorAll('.pst-ws-create-item[data-create-type]')];
  assert(main,'canonical create button missing');
  assert.strictEqual(items.length,4,'canonical menu must contain exactly four options');
  assert.deepStrictEqual(items.map(x=>x.dataset.createType),['project','offer','invoice','task'],'canonical create option order/types changed');
  for(const svg of wrap.querySelectorAll('svg')){
    assert.strictEqual(svg.getAttribute('width'),'16','create SVG width must be 16');
    assert.strictEqual(svg.getAttribute('height'),'16','create SVG height must be 16');
  }
  assert.strictEqual(main.getAttribute('aria-haspopup'),'menu');
  assert.strictEqual(main.getAttribute('aria-expanded'),'false');
  const before=wrap.innerHTML;
  w.PSTWorkspaceCreateControlV1.ensure();
  assert.strictEqual(wrap.innerHTML,before,'ensure() must not repair/rewrite a healthy canonical component');
  w.pstWsToggleCreate({preventDefault(){},stopPropagation(){}});
  assert(wrap.classList.contains('open'),'dropdown did not open');
  assert.strictEqual(main.getAttribute('aria-expanded'),'true','aria-expanded did not follow open state');
  assert.strictEqual(project+selected,0,'opening the menu must not create any object');
  w.pstWsCreate('project');
  assert.strictEqual(project,1,'Projekt route was not preserved');
  w.pstWsCreate('offer');
  await wait(90);
  assert(documents.includes('offer'),'Ofertë route was not preserved');
  w.pstWsCreate('invoice');
  await wait(90);
  assert(documents.includes('invoice'),'Faturë route was not preserved');
  w.pstWsCreate('task');
  assert(pages.includes('qendra'),'Detyrë route was not preserved');
  assert(selected>=2,'commercial create handoff was not preserved for offer/invoice');
  dom.window.close();
  console.log('Structural + Krijo functional smoke passed.');
})().catch(e=>{console.error(e);process.exit(1);});