const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const html='<!doctype html><html><body><div id="pst-kek-list"><table><tbody><tr><td>TED-550551-2026 · Structural steel award</td><td><div class="pst-kek-rowacts"><button class="pst-kek-btn">TED ↗</button></div></td></tr></tbody></table></div></body></html>';
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
const calls=[];
const row={id:'award-1',procurement_no:'TED-550551-2026',publication_no:'550551-2026',payload:{source:'TED',notice_phase:'award',winner:{
 names:['Kovoreal - Holic s.r.o.','Rudolf Metallbau GmbH'],email:null,website:null,
 contact_enrichment:{version:'winner-contact-v1',status:'found',researched_at:'2026-08-17T10:00:00Z',contact_count:4,organizations:[
  {name:'Kovoreal - Holic s.r.o.',city:'Holic',country:'SVK',official_website:'https://kovoreal.sk',contacts:[{type:'email',value:'kovoreal4@kovoreal.sk',purpose:'sales',source_type:'TED',source_url:null,confidence:'high',score:92},{type:'phone',value:'+421123456',purpose:'general',source_type:'official_website',source_url:'https://kovoreal.sk/kontakt',confidence:'high',score:76}]},
  {name:'Rudolf Metallbau GmbH',city:'Wien',country:'AUT',official_website:'https://rudolf-metallbau.at',contacts:[{type:'email',value:'einkauf@rudolf-metallbau.at',purpose:'procurement',source_type:'official_website',source_url:'https://rudolf-metallbau.at/kontakt',confidence:'high',score:110},{type:'email',value:'Angebot@rudolf-metallbau.at',purpose:'tender',source_type:'TED',source_url:null,confidence:'high',score:96}]}
 ],unassigned_ted_contacts:{emails:[],websites:[]}}
}};
window.supaFetch=async(path,method,body)=>{calls.push({path,method,body});return [JSON.parse(JSON.stringify(row))];};
window.pstKekRender=()=>{};window.pstKekLoad=async()=>{};
const code=fs.readFileSync('pristeel-tender-winner-contacts-v1.js','utf8');
vm.runInContext(code,dom.getInternalVMContext());

(async()=>{
 const api=window.PSTTenderWinnerContactsV1;
 assert.ok(api,'winner contacts UI API should be exposed');
 await api.refresh(true);
 api.decorate();
 const btn=window.document.querySelector('[data-pst-winner-contacts]');
 assert.ok(btn,'awarded TED row should get a contacts button');
 assert.equal(btn.textContent,'Kontaktet (4)');
 await window.pstTenderWinnerContacts('award-1');
 const modal=window.document.getElementById('pst-twc-backdrop');
 assert.equal(modal.style.display,'flex');
 const text=modal.textContent;
 assert.ok(text.includes('Kovoreal - Holic s.r.o.'));
 assert.ok(text.includes('Rudolf Metallbau GmbH'));
 assert.ok(text.includes('kovoreal4@kovoreal.sk'));
 assert.ok(text.includes('einkauf@rudolf-metallbau.at'));
 assert.ok(text.includes('Prokurim'),'procurement-purpose contact should be labeled');
 assert.ok(text.includes('E verifikuar'),'confidence should be visible');
 assert.ok(calls.every(c=>!c.method||c.method==='GET'),'contacts UI must remain read-only');
 console.log('TED winner contacts UI smoke: OK');
 dom.window.close();
 process.exit(0);
})().catch(e=>{console.error(e);dom.window.close();process.exit(1);});
