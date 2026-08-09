const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const src=fs.readFileSync('pristeel-email-offer-draft-editor-bridge-v1.js','utf8');
  new Function(src);
  assert(!/MutationObserver|setInterval\s*\(/.test(src),'Draft editor bridge must not poll or observe globally');
  const html=`<!doctype html><html><body>
    <select id="oe-proj"><option value="p1" selected>P1</option></select>
    <input id="oe-sup" value="Sector Construction"><input id="oe-sup-q" value="Sector Construction">
    <textarea id="oe-notes">TVSH condition\n[SOURCE_EMAIL:m1]</textarea>
    <table><tbody id="oe-rows"><tr><td>1</td><td></td><td><input></td><td><input></td><td><input value="kg"></td><td><input></td><td><input></td><td id="oe-t0"></td></tr></tbody></table>
  </body></html>`;
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/'}),w=dom.window;
  w.__pstIntegrityLastData={emails:[{gmail_message_id:'m1',from_name:'Sector Construction',body_text:'offer'}]};
  w.PSTEmailOfferStructuredFallbackV1={
    _test:{structured:()=>({positions:[{kind:'base',description:'Furnizimi me material dhe punimi i konstruksionit metalik sipas vizatimeve',unit:'kg',unit_price:1.85}]})},
    openDraft:async()=>{}
  };
  const state={};w.pstPos=(i,k,v)=>{state[k]=v;};w.pstCalc=()=>{};
  let patches=[];
  w.supaFetch=async(path,method,body)=>{
    if(method==='PATCH'){patches.push({path,body});return[];}
    if(String(path).startsWith('offers?project_id=eq.'))return[{id:'o1',supplier:'Sector Construction',price_kg:null,notes:'TVSH condition\n[SOURCE_EMAIL:m1]'}];
    return[];
  };
  w.pstSaveOffer=async()=>{};
  w.eval(src);
  assert.strictEqual(w.PSTEmailOfferDraftEditorBridgeV1.applyBaseRow('m1'),true);
  const row=w.document.querySelector('#oe-rows tr');const c=row.children;
  assert.strictEqual(c[2].querySelector('input').value,'Furnizimi me material dhe punimi i konstruksionit metalik sipas vizatimeve');
  assert.strictEqual(c[3].querySelector('input').value,'','Unknown quantity must stay blank');
  assert.strictEqual(c[4].querySelector('input').value,'kg');
  assert.strictEqual(c[5].querySelector('input').value,'1.85');
  assert.strictEqual(c[6].querySelector('input').value,'1.85');
  assert.strictEqual(Number(state.price_orig),1.85);
  const cap=w.PSTEmailOfferDraftEditorBridgeV1.captureDraftForSave();
  assert(cap&&cap.price===1.85&&cap.projectId==='p1','Draft capture must preserve unit rate without quantity');
  await w.pstSaveOffer();
  assert.strictEqual(patches.length,1,'Saved Gmail offer with unknown quantity must receive one price_kg preservation patch');
  assert.strictEqual(patches[0].body.price_kg,1.85);
  dom.window.close();
  console.log('Email offer draft editor bridge smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
