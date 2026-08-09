const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
 const core=fs.readFileSync('pristeel-email-offer-intake-v1.js','utf8');
 const structured=fs.readFileSync('pristeel-email-offer-intake-structured-fallback-v1.js','utf8');
 new Function(structured);
 assert(!/MutationObserver|setInterval\s*\(/.test(structured),'Structured fallback must not observe or poll globally');
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w.alert=()=>{};w.eval(core);w.eval(structured);
 const mail={from_name:'Sector Construction',from_email:'sector.construction20@gmail.com',subject:'Restauranti Budva - Marko'};
 const text=`Direktor,\n\nPo ta jap cmimin ketu ne email.\n\n- Furnizimi me material dhe punimi i konstruksionit metalik sipas vizatimeve: 1.85€/kg pa TVSH.\n- Zinktimi i struktures metalike: 0.42 €/kg pa TVSH.\n- Ngjyrosja Powder Coating pas zinktimit: 0.56 €/kg pa TVSH.\n\nPra TVSH-n e Zinktimit dhe ngjyres duhet ta paguajme, kurse te konstruksionit mundemi mos me shtu nese e bejme export dhe faturimin nga Sectori drejt te klienti.\n\nCmimi i konstruksionit eshte final per me kap punen.`;
 const x=w.PSTEmailOfferStructuredFallbackV1._test.structured(text,mail);
 assert.strictEqual(x.supplier,'Sector Construction');
 assert.strictEqual(x.price_kg,1.85,'Base construction EUR/kg must be extracted');
 assert.strictEqual(x.zinc_eur_kg,0.42,'Galvanizing EUR/kg must be extracted');
 assert.strictEqual(x.coating_eur_kg,0.56,'Powder coating EUR/kg must be extracted');
 assert.strictEqual(x.vat_note,'Pa TVSH','Ex-VAT wording must be preserved as a note, not treated as 0%');
 assert.strictEqual(x.positions.length,3,'All three price components must be extracted');
 assert(x.notes.includes('TVSH'),'Specific VAT condition must be preserved');
 assert(x.confidence>=90,'Three structured price components should produce high confidence');
 dom.window.close();
 console.log('Structured supplier email offer smoke test passed.');
})();
