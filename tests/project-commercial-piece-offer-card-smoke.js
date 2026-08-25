const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const simplified=fs.readFileSync('pristeel-project-commercial-simplified-v1.js','utf8');
const bridge=fs.readFileSync('pristeel-offer-revision-email-bridge-v1.js','utf8');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-project" class="pf2-on"><div class="pst-pi-tabs"><button class="on" data-pf2-tab="commercial">Komercialja</button></div><div id="pst-pi-body"></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
w.__pstIntegrityLastData={supplierOffers:[{
 supplier:'Sector Construction',currency:'EUR',pricing_unit:'pc',vat_pct:18,total_eur:null,
 inclusions:'Steel material; fabrication; hot-dip galvanizing; pole erection/installation',
 positions:[
  {key:'pole_6m',qty:1,unit:'pc',desc:'Shtyllë sirene 6 m',price_neg:686.44,total_neg:686.44,price_gross:810,vat_pct:18,main_chs:{od_mm:244.5,t_mm:6,length_mm:6000},top_spigot:{od_mm:88.9,t_mm:4,length_mm:1500}},
  {key:'pole_9m',qty:1,unit:'pc',desc:'Shtyllë sirene 9 m',price_neg:1144.07,total_neg:1144.07,price_gross:1350,vat_pct:18,main_chs:{od_mm:273,t_mm:6.3,length_mm:9000},top_spigot:{od_mm:88.9,t_mm:4,length_mm:1500}},
  {key:'pole_12m',qty:1,unit:'pc',desc:'Shtyllë sirene 12 m',price_neg:2245.76,total_neg:2245.76,price_gross:2650,vat_pct:18,main_chs:{od_mm:323.9,t_mm:8,length_mm:12000},top_spigot:{od_mm:88.9,t_mm:4,length_mm:1500}}
 ]
}],ourOffers:[]};
w.eval(simplified);
w.eval(bridge);
w.PSTProjectCommercialSimplifiedV1.render();
w.PSTOfferRevisionEmailBridgeV1.wrapCommercialRender();
w.PSTOfferRevisionEmailBridgeV1.decoratePieceOfferCards();

const card=w.document.querySelector('.pst-csf-supplier');
assert.ok(card,'supplier card should render');
assert.equal(card.getAttribute('data-pst-piece-offer'),'1','per-piece offer should be decorated');
assert.equal(card.querySelector('header>b').textContent,'3 çmime / copë');
const text=card.querySelector('.pst-csf-kvs').textContent.replace(/\s+/g,' ');
assert.ok(text.includes('6 m')&&text.includes('224,31 kg')&&text.includes('686,44 EUR/pc net')&&text.includes('3,060 EUR/kg net'));
assert.ok(text.includes('9 m')&&text.includes('385,49 kg')&&text.includes('1.144,07 EUR/pc net')&&text.includes('2,968 EUR/kg net'));
assert.ok(text.includes('12 m')&&text.includes('760,46 kg')&&text.includes('2.245,76 EUR/pc net')&&text.includes('2,953 EUR/kg net'));
assert.ok(text.includes('810,00 EUR/pc bruto')&&text.includes('3,611 EUR/kg bruto'));
assert.ok(text.includes('TVSH')&&text.includes('18%'));
assert.ok(text.toLowerCase().includes('zinkim + montim'));
assert.ok(text.includes('Ø244,5×6')&&text.includes('Ø88,9×4'));
assert.equal(w.PSTOfferRevisionEmailBridgeV1._test.piecePositions(w.__pstIntegrityLastData.supplierOffers[0]).length,3);
assert.ok(Math.abs(w.PSTOfferRevisionEmailBridgeV1._test.pieceWeight(w.__pstIntegrityLastData.supplierOffers[0].positions[0])-224.306)<0.02);
assert.ok(Math.abs(w.PSTOfferRevisionEmailBridgeV1._test.pieceNetKg(w.__pstIntegrityLastData.supplierOffers[0].positions[0])-3.0603)<0.001);

console.log('Project Commercial per-piece supplier card weight and EUR/kg smoke test passed.');
dom.window.close();
