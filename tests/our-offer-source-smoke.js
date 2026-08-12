const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const code=fs.readFileSync('pristeel-our-offer-source-v1.js','utf8');
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.PSTProjectDataIntegrity={load:async()=>({})};
  w.eval(code);

  const api=w.PSTOurOfferSourceV1;
  assert(api,'Our-offer source module must install');

  const overlap={
    docs:[{id:'q1',series:'QUO',doc_nr:'PST-QUO-1'},{id:'x1',series:'INV'}],
    offers:[{id:'l1',supplier:'OFERTA JONE'},{id:'s1',supplier:'Sector Construction'}]
  };
  api.canonicalize(overlap);
  assert.strictEqual(overlap.ourOfferSource,'documents_registry','QUO registry must win when both sources exist');
  assert.deepStrictEqual(Array.from(overlap.ourOffers,x=>x.id),['q1'],'Legacy our-offer must not duplicate registry QUO');

  const legacy={docs:[],offers:[{id:'l2',supplier:'PRISTEEL -> Client'},{id:'s2',supplier:'Supplier'}]};
  api.canonicalize(legacy);
  assert.strictEqual(legacy.ourOfferSource,'legacy_offers','Legacy source must remain available as fallback');
  assert.deepStrictEqual(Array.from(legacy.ourOffers,x=>x.id),['l2'],'Legacy fallback must preserve the historic offer');

  const empty={docs:[],offers:[]};
  api.canonicalize(empty);
  assert.strictEqual(empty.ourOfferSource,'none');
  assert.strictEqual(empty.ourOffers.length,0);

  dom.window.close();
  console.log('Our-offer canonical source smoke test passed.');
})();