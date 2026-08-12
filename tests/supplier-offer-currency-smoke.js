const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const code=fs.readFileSync('pristeel-supplier-offer-currency-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><body>
    <div id="oe-bg">
      <div class="oe-sec">Pozicionet</div>
      <div class="oe-f"><label>Zinktim EUR/kg</label><input id="oe-zinc"></div>
      <div class="oe-f"><label>Transport EUR</label><input id="oe-transp"></div>
      <input id="oe-vat"><div id="oe-msg"></div><div id="oe-sum"></div>
      <table class="oe-tbl"><thead><tr><th>#</th><th>Lloji</th><th>Përshkrimi</th><th>Sasia</th><th>Njësia</th><th>Çmimi €/njësi</th><th>Pas negocimit €</th><th>Totali €</th></tr></thead><tbody></tbody></table>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const writes=[];
  w.supaFetch=async(path,method,body)=>{if(method==='POST'||method==='PATCH')writes.push({path,method,body});return[];};
  w.pstCalc=function(){w.document.getElementById('oe-sum').innerHTML='<div>Totali <span>200,00 €</span></div>';};
  w.pstOpenOffer=async()=>true;
  w.pstSaveOffer=async function(){
    await w.supaFetch('offers','POST',{positions:[{desc:'Tower',qty:1,unit:'pc',price_orig:200,price_neg:200,total_orig:200,total_neg:200}],total_eur:200,price_kg:null});
    return true;
  };

  w.eval(code);
  const api=w.PSTSupplierOfferCurrencyV1;
  assert(api,'Supplier currency module must install');
  await w.pstOpenOffer(null,null);
  assert(w.document.getElementById('oe-currency'),'Currency selector must be injected when the editor opens');

  api.setControls('USD',null);
  writes.length=0;
  const blocked=await w.pstSaveOffer();
  assert.strictEqual(blocked,false,'Foreign currency save without FX must fail closed');
  assert.strictEqual(writes.length,0,'Blocked foreign save must not write');
  assert(/kursin USD/i.test(w.document.getElementById('oe-msg').textContent),'Missing FX warning must be visible');

  api.setControls('USD',0.8);
  const ok=await w.pstSaveOffer();
  assert.strictEqual(ok,true,'Foreign save with explicit FX must pass');
  assert.strictEqual(writes.length,1,'Valid save must write once');
  const rec=writes[0].body;
  assert.strictEqual(rec.currency,'USD');
  assert.strictEqual(rec.exchange_rate_to_eur,0.8);
  assert.strictEqual(rec.total_amount,200,'Original-currency total must be preserved');
  assert.strictEqual(rec.total_eur,160,'EUR total must be normalized');
  assert.strictEqual(rec.pricing_unit,'pc','Single position unit must become pricing_unit');

  const once=w.pstSaveOffer;
  api.install();
  assert.strictEqual(w.pstSaveOffer,once,'Reinstall must not double-wrap save');

  dom.window.close();
  console.log('Supplier-offer currency smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});