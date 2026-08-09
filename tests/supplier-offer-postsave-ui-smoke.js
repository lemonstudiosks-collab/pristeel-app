const fs=require('fs');
const vm=require('vm');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('pristeel-supplier-offer-postsave-ui-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><body>
<div id="page-workspace-project" class="pf2-on">
<section class="pf2-card"><header><div><b>Oferta furnitorësh</b><span>1 oferta</span></div></header><div>
<div class="pf2-line"><div><b>Sector Construction</b><span>Sector Construction · 0,00 EUR · 09 Aug 2026</span></div></div>
</div></section>
<div class="pf2-time"><span>Ofertë furnitori · 09 Aug 2026</span><b>Sector Construction</b><small>0,00 EUR</small></div>
</div>
<textarea id="oe-notes">[SOURCE_EMAIL:m1]</textarea><select id="oe-proj"><option value="p1" selected>P1</option></select>
</body></html>`,{url:'https://example.test'});
const w=dom.window;
w.__pstIntegrityLastData={supplierOffers:[{supplier:'Sector Construction',price_kg:1.85,total_eur:0,currency:'EUR',pricing_unit:'kg',created_at:'2026-08-09T08:00:00Z'}]};
let baseSaves=0,rendered='';
w.pstSaveOffer=async()=>{baseSaves++;return true;};
w.PSTProjectDataIntegrity={load:async id=>({project:{id},supplierOffers:[{supplier:'Sector Construction',price_kg:1.85,total_eur:0,currency:'EUR',pricing_unit:'kg',created_at:'2026-08-09T08:00:00Z'}]})};
w.PSTProjectFirstV2={render:t=>{rendered=t;return true;}};
const ctx=vm.createContext(w);ctx.window=w;ctx.document=w.document;ctx.console=console;ctx.setTimeout=setTimeout;ctx.clearTimeout=clearTimeout;
vm.runInContext(code,ctx);
const api=w.PSTSupplierOfferPostsaveUiV1;
if(!api)throw new Error('module missing');
api.decorate();
const meta=w.document.querySelector('.pf2-line span').textContent;
if(!meta.includes('1,85 EUR/kg')||!meta.includes('sasia e papërcaktuar'))throw new Error('unit-rate card not decorated: '+meta);
const tl=w.document.querySelector('.pf2-time small').textContent;
if(!tl.includes('1,85 EUR/kg'))throw new Error('timeline not decorated: '+tl);
(async()=>{
 await w.pstSaveOffer();
 if(baseSaves!==1)throw new Error('base save not called once');
 if(rendered!=='procurement')throw new Error('procurement not refreshed: '+rendered);
 if(!w.__pstIntegrityLastData||!w.__pstIntegrityLastData.supplierOffers.length)throw new Error('fresh integrity data not stored');
 console.log('supplier offer post-save UI smoke: ok');
 dom.window.close();
})().catch(e=>{console.error(e);process.exit(1);});
