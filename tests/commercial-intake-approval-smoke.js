const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const migration=fs.readFileSync('supabase/migrations/20260823090000_commercial_candidate_approval_and_rfq_reconcile.sql','utf8');
  const ui=fs.readFileSync('pristeel-commercial-intake-review-v1.js','utf8');
  const theme=fs.readFileSync('pristeel-section-theme-v1.js','utf8');

  assert.match(migration,/pppp_approve_supplier_offer_candidate_v1/);
  assert.match(migration,/pppp_approve_invoice_candidate_v1/);
  assert.match(migration,/security invoker/ig,'approval RPCs should not add authenticated SECURITY DEFINER exposure');
  assert.match(migration,/if not public\.can_write\(\)/i,'explicit write permission gate missing');
  assert.match(migration,/status<>'review'/i,'candidate review-state gate missing');
  assert.match(migration,/Currency must be reviewed before approval/i);
  assert.match(migration,/commercial price or total is required/i);
  assert.match(migration,/Only incoming supplier invoices may be approved here/i);
  assert.match(migration,/newer RFQ review revision is current/i,'RFQ revision reconciliation missing');
  assert.match(migration,/pppp_rfq_single_current_review_v1/i,'future RFQ single-current trigger missing');
  assert.doesNotMatch(migration,/set\s+status\s*=\s*'sent'/i,'migration must not mark an RFQ sent');

  assert.match(theme,/pristeel-commercial-intake-review-v1\.js\?v=20260823-1/,'runtime child loader missing');
  assert.match(ui,/window\.confirm/,'approval must require an explicit user confirmation');
  assert.match(ui,/rpc\/pppp_approve_supplier_offer_candidate_v1/);
  assert.match(ui,/rpc\/pppp_approve_invoice_candidate_v1/);
  assert.doesNotMatch(ui,/gmail.*send|messages\.send|sendMessage\s*\(/i,'review UI must never send email');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="pf2-on"><button class="pst-pi-tab on" data-pf2-tab="procurement"></button><div id="pst-pi-body"></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstCurrentProjectId='p1';
  w.__pstIntegrityLastData={project:{id:'p1'}};
  let rpcCalls=0,confirmCalls=0;
  w.confirm=()=>{confirmCalls++;return true;};
  w.alert=(m)=>{throw new Error('Unexpected alert: '+m);};
  w.supaFetch=async(path,method,body)=>{
    if(path.startsWith('supplier_offer_candidates?'))return[{id:'c1',project_id:'p1',gmail_message_id:'gm1',supplier_name:'Supplier A',supplier_email:'a@supplier.test',subject:'Offer 1',extracted:{currency:'EUR',price_kg:1.85,total_amount:18500,qty_kg:10000,incoterms:'DAP'},confidence:91,status:'review',updated_at:'2026-08-23T08:00:00Z'}];
    if(path.startsWith('invoice_candidates?'))return[];
    if(path==='rpc/pppp_approve_supplier_offer_candidate_v1'){rpcCalls++;assert.strictEqual(method,'POST');assert.strictEqual(body.p_candidate_id,'c1');return{ok:true,offer_id:'o1'};}
    if(path==='rpc/pppp_ignore_commercial_candidate_v1')return{ok:true};
    throw new Error('Unexpected Supabase path '+path);
  };
  w.eval(ui);
  await new Promise(r=>setTimeout(r,430));
  const panel=w.document.getElementById('pst-commercial-intake-review');
  assert.ok(panel,'commercial intake review panel did not render');
  assert.match(panel.textContent,/Supplier A/);
  assert.match(panel.textContent,/1\.85/);
  assert.strictEqual(rpcCalls,0,'candidate was approved without a human click');
  const btn=panel.querySelector('[data-cir-approve]');
  assert.ok(btn,'strong reviewed candidate should expose an approval button');
  btn.click();
  await new Promise(r=>setTimeout(r,80));
  assert.strictEqual(confirmCalls,1,'approval confirmation was not requested');
  assert.strictEqual(rpcCalls,1,'approval RPC was not called exactly once after confirmation');
  assert.strictEqual(w.PSTCommercialIntakeReviewV1.directOfferReady({extracted:{price_kg:1.85,currency:null}}),false,'missing currency must block direct approval');
  assert.strictEqual(w.PSTCommercialIntakeReviewV1.directInvoiceReady({extracted:{invoice_number:'INV-1',total_amount:100,currency:'EUR'}}),true);
  dom.window.close();
  console.log('Commercial intake approval human-gate smoke: OK');
})().catch(e=>{console.error(e);process.exit(1);});
