const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const code=fs.readFileSync('pristeel-our-offer-history-ui-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project">
      <div class="pf2-card"><header><div><b>Ofertat tona</b><span>2 dokumente</span></div><button>Ofertë e re</button></header><div><div>legacy body</div></div></div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstIntegrityLastData={
    ourOffers:[
      {id:'new',series:'QUO',doc_nr:'PST-QUO-2026-020',currency:'EUR',total_amount:133153.35,total_eur:133153.35,created_at:'2026-07-24T12:51:08Z'},
      {id:'old',series:'QUO',doc_nr:'D-23/26',currency:'EUR',total_amount:133155,total_eur:133155,created_at:'2026-07-09T10:00:00Z'}
    ],
    currentOurOffer:{id:'new',series:'QUO',doc_nr:'PST-QUO-2026-020',currency:'EUR',total_amount:133153.35,total_eur:133153.35,created_at:'2026-07-24T12:51:08Z'},
    ourOfferHistory:[{id:'old',series:'QUO',doc_nr:'D-23/26',currency:'EUR',total_amount:133155,total_eur:133155,created_at:'2026-07-09T10:00:00Z'}]
  };
  w.eval(code);
  assert(w.PSTOurOfferHistoryUiV1.render(),'Revision UI must render');
  const card=w.document.querySelector('.pf2-card');
  const text=card.textContent.replace(/\s+/g,' ');
  assert(text.includes('1 aktuale · 1 revizione'),'Header must distinguish current quote from history');
  assert(text.includes('PST-QUO-2026-020'),'Newest quote must be visible as current');
  assert(text.includes('AKTUALE'),'Current quote must be labelled');
  assert(text.includes('Historiku i revizioneve (1)'),'Older quote must be kept in revision history');
  assert(text.includes('D-23/26'),'Historic quote must remain accessible');
  assert.strictEqual(card.querySelectorAll('.pst-quo-row.current').length,1,'Exactly one quote must be visually current');
  dom.window.close();
  console.log('Our-offer revision UI smoke test passed.');
})();