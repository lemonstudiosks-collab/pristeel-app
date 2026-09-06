/* Regression: manual supplier offer is project-agnostic, stable and supports flexible extra cost positions. */
'use strict';
const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-manual-supplier-offer-v1.js','utf8');
const workflowSource=fs.readFileSync('pristeel-project-workflow-canonical-v1.js','utf8');
const migrationSource=fs.readFileSync('supabase/migrations/20260906090000_manual_supplier_offer_extra_positions.sql','utf8');

assert(workflowSource.includes("if(!t||t.id==='page-workspace-project')return;"),
  'Canonical project workflow must not treat the workspace state root as a clickable workflow control');
assert.doesNotThrow(()=>new Function(source),'Manual supplier offer bridge must remain valid JavaScript');
assert(source.includes('.pst-csf-suppliers'),'Manual supplier bridge must recognize the current simplified commercial supplier card');
assert(source.includes('header h2'),'Manual supplier bridge must recognize the current supplier-card title');
assert(!/fc96208d-356c-410a-a356-96ce9e9b4d2f|Evosys/i.test(source),
  'Manual supplier offer runtime must not contain EVOSYS-specific routing');
assert(source.includes('data-mso-add-extra'),'Manual supplier offer must expose an extra-position action');
assert(source.includes('extra_positions:extraPositions()'),'Manual supplier offer payload must include flexible extra positions');
assert(source.includes('if(!panel||lastProject!==current){lastProject=current;renderManualPanel(card);'),
  'Repeated observer injections must not rebuild an already-mounted supplier panel');
assert(source.includes('function scheduleInject()'),
  'Mutation-driven injection must be debounced rather than scheduling an unbounded render burst');
assert(/create or replace function public\.pppp_create_manual_supplier_offer_v1\s*\(\s*p_project_id uuid,\s*p_payload jsonb\s*\)/i.test(migrationSource),
  'Migration must preserve the existing RPC signature');
assert(migrationSource.includes("p_payload->'extra_positions'"),
  'Migration must read extra positions from the existing JSON payload');
assert(migrationSource.includes(') || v_extra_positions;'),
  'Migration must append extra positions to canonical offers.positions JSONB');
assert(!migrationSource.includes('pppp_record_supplier_decision_v1'),
  'Extra-position migration must not alter or trigger supplier selection');

function makeDom(projectId){
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="page active pf2-on" data-pwf-area="procurement" data-pwf-stage="offers">
      <div id="pst-pi-body">
        <div class="pst-csf" data-pst-csf="1">
          <section class="pst-csf-suppliers">
            <header><div><span>HAPI 1</span><h2>Ofertat e furnitorëve</h2></div><b>0 oferta</b></header>
            <div class="pst-csf-supplier-grid"><div>Ende nuk ka oferta furnitorësh.</div></div>
          </section>
        </div>
      </div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const calls=[];
  w.__pstCurrentProjectId=projectId;
  w._curProjId=projectId;
  w.__pstIntegrityLastData={project:{id:projectId,name:'Projekt testues '+projectId.slice(0,8)}};
  w.supaFetch=async(path,method,body)=>{
    calls.push({path,method,body});
    if(path==='rpc/pppp_create_manual_supplier_offer_v1'){
      return {ok:true,offer_id:'99999999-9999-4999-8999-999999999999',project_id:projectId};
    }
    return[];
  };
  w.eval(source);
  return {dom,w,calls};
}

async function exerciseProject(projectId,withExtras){
  const {dom,w,calls}=makeDom(projectId);
  assert(w.PSTManualSupplierOfferV1,'Manual supplier bridge must install');
  assert.strictEqual(w.PSTManualSupplierOfferV1.inject(),true,
    'Manual supplier bridge must attach for arbitrary project '+projectId);
  await new Promise(r=>setTimeout(r,60));

  const card=w.document.querySelector('.pst-csf-suppliers');
  const btn=card.querySelector('[data-mso-open]');
  assert(btn,'Arbitrary project must expose the manual-offer action');

  const panel=card.querySelector('#pst-manual-offers-panel');
  assert(panel,'Manual-offer panel must be mounted once');
  const manualReadCount=()=>calls.filter(x=>String(x.path).startsWith('offers?')||String(x.path).startsWith('project_supplier_decisions?')).length;
  const readsAfterFirstRender=manualReadCount();
  assert.strictEqual(readsAfterFirstRender,2,'Initial panel render should perform exactly the two expected read queries');

  for(let i=0;i<20;i++)assert.strictEqual(w.PSTManualSupplierOfferV1.inject(),true);
  const noise=w.document.createElement('span');noise.textContent='unrelated mutation';card.appendChild(noise);
  await new Promise(r=>setTimeout(r,80));
  assert.strictEqual(card.querySelector('#pst-manual-offers-panel'),panel,
    'Repeated injects and unrelated DOM mutations must preserve the same panel node');
  assert.strictEqual(manualReadCount(),readsAfterFirstRender,
    'Repeated observer activity must not refetch or rerender an already-mounted panel');
  noise.remove();

  btn.click();
  assert(w.document.getElementById('pst-mso-modal'),
    'Manual-offer action must open the entry modal for arbitrary project');
  assert.strictEqual(w.document.querySelector('#pst-mso-title').textContent.trim(),'Shto ofertë furnitori');
  assert(!calls.some(x=>String(x.path).includes('pppp_record_supplier_decision_v1')),
    'Opening the manual-offer card must never select a supplier');
  assert(!calls.some(x=>String(x.path).includes('pppp_create_manual_supplier_offer_v1')),
    'Opening the manual-offer card must never create an offer before explicit save');

  if(withExtras){
    const modal=w.document.getElementById('pst-mso-modal');
    const add=modal.querySelector('[data-mso-add-extra]');
    assert(add,'Modal must expose add-extra-position control');
    add.click();
    add.click();
    const rows=modal.querySelectorAll('.pst-mso-extra-row');
    assert.strictEqual(rows.length,2,'User must be able to add multiple extra positions');

    rows[0].querySelector('[data-mso-extra-label]').value='Galvanizim';
    rows[0].querySelector('[data-mso-extra-amount]').value='250';
    rows[0].querySelector('[data-mso-extra-amount]').dispatchEvent(new w.Event('input',{bubbles:true}));
    rows[1].querySelector('[data-mso-extra-label]').value='Kontroll i cilësisë';
    rows[1].querySelector('[data-mso-extra-amount]').value='75.5';
    rows[1].querySelector('[data-mso-extra-amount]').dispatchEvent(new w.Event('input',{bubbles:true}));

    assert(w.document.querySelector('#pst-mso-total').textContent.includes('325,50'),
      'Extra positions must be included in the calculated total');

    w.document.querySelector('#pst-mso-supplier').value='Furnitor Testues';
    w.document.querySelector('#pst-mso-save').click();
    await new Promise(r=>setTimeout(r,30));

    const saveCall=calls.find(x=>x.path==='rpc/pppp_create_manual_supplier_offer_v1');
    assert(saveCall,'Explicit save must call the existing guarded manual-offer RPC');
    assert.strictEqual(saveCall.body.p_project_id,projectId,
      'Save must use the currently active arbitrary project');
    assert.deepStrictEqual(
      JSON.parse(JSON.stringify(saveCall.body.p_payload.extra_positions)),
      [{label:'Galvanizim',amount:250},{label:'Kontroll i cilësisë',amount:75.5}],
      'Extra positions must be carried in the existing JSON payload');
    assert(!calls.some(x=>String(x.path).includes('pppp_record_supplier_decision_v1')),
      'Saving a manual offer must still not select a supplier');
  }

  dom.window.close();
}

(async()=>{
  const projects=[
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333'
  ];
  for(let i=0;i<projects.length;i++)await exerciseProject(projects[i],i===0);
  console.log('Manual supplier offer universal-project, stability and flexible-position smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
