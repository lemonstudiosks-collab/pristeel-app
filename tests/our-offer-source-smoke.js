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
    docs:[
      {id:'q-old',series:'QUO',doc_nr:'D-23/26',created_at:'2026-07-09T10:00:00Z'},
      {id:'q-new',series:'QUO',doc_nr:'PST-QUO-2026-020',created_at:'2026-07-24T12:51:08Z'},
      {id:'x1',series:'INV'}
    ],
    offers:[{id:'l1',supplier:'OFERTA JONE',created_at:'2026-07-09T18:00:00Z'},{id:'s1',supplier:'Sector Construction'}]
  };
  api.canonicalize(overlap);
  assert.strictEqual(overlap.ourOfferSource,'documents_registry','QUO registry must win when both sources exist');
  assert.deepStrictEqual(Array.from(overlap.ourOffers,x=>x.id),['q-new','q-old'],'Canonical QUO list must be newest first');
  assert.strictEqual(overlap.currentOurOffer.id,'q-new','Newest QUO must be the current client quote');
  assert.deepStrictEqual(Array.from(overlap.ourOfferHistory,x=>x.id),['q-old'],'Older QUO must remain as revision history');
  assert(!overlap.ourOffers.some(x=>x.id==='l1'),'Legacy our-offer must not duplicate registry QUO');

  const legacy={docs:[],offers:[
    {id:'l-old',supplier:'PRISTEEL -> Client',created_at:'2026-07-01T00:00:00Z'},
    {id:'l-new',supplier:'OUR OFFER',created_at:'2026-07-03T00:00:00Z'},
    {id:'s2',supplier:'Supplier'}
  ]};
  api.canonicalize(legacy);
  assert.strictEqual(legacy.ourOfferSource,'legacy_offers','Legacy source must remain available as fallback');
  assert.strictEqual(legacy.currentOurOffer.id,'l-new','Newest legacy quote must be current when registry is absent');
  assert.deepStrictEqual(Array.from(legacy.ourOfferHistory,x=>x.id),['l-old'],'Older legacy quote must remain history');

  const empty={docs:[],offers:[]};
  api.canonicalize(empty);
  assert.strictEqual(empty.ourOfferSource,'none');
  assert.strictEqual(empty.currentOurOffer,null);
  assert.strictEqual(empty.ourOffers.length,0);
  assert.strictEqual(empty.ourOfferHistory.length,0);

  dom.window.close();
  console.log('Our-offer canonical source smoke test passed.');
})();