const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
(async()=>{
 const src=fs.readFileSync('pristeel-offer-pricing-stability-v2.js','utf8');
 assert(!/setInterval\s*\(|MutationObserver\s*\(/.test(src),'Pricing stability guard must not poll or observe globally');
 const dom=new JSDOM('<!doctype html><html><body><div id="offer-list"></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w._curProjId='p1';let posts=0,patches=0,resolvePost;
 w.supaFetch=(path,method)=>{
   if(path==='offers'&&method==='POST'){posts++;return new Promise(r=>{resolvePost=r;});}
   if(path.startsWith('offers?id=eq.')&&method==='PATCH'){patches++;return Promise.resolve([{id:'db1'}]);}
   return Promise.resolve([]);
 };
 w.offers=[];w.renderOffers=function(){};
 w.eval(src);
 const o={id:'local1',dbId:null,supplier:'S',priceKg:1,totalEur:100,kg:100};
 const first=w.PSTOfferPricingStabilityV2.save(o);
 o.priceKg=1.1;await w.PSTOfferPricingStabilityV2.save(o);
 assert.strictEqual(posts,1,'Second edit started a duplicate POST while first save was in flight');
 resolvePost([{id:'db1'}]);await first;await new Promise(r=>setTimeout(r,10));
 assert.strictEqual(o.dbId,'db1','Database id was not retained after first POST');
 assert.strictEqual(posts,1,'Offer was inserted more than once');
 assert.strictEqual(patches,1,'Pending edit was not serialized into one PATCH');
 dom.window.close();console.log('Offer pricing stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
