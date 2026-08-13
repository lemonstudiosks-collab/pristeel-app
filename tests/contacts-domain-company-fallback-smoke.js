const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-contacts-provenance-ui-v1.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Contacts fallback must not observe or poll');

  const dom=new JSDOM('<!doctype html><html><head></head><body><div><input id="ct-search"></div><div id="ct-stats"></div><div id="contacts-list"></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w._ctFilter='all';
  w._contacts=[
    {id:'c1',person:'',company:'',email:'celik@kovac-celik.hr',kind:'client'},
    {id:'c2',person:'',company:'',email:'sales.ham@ungersteel.com',kind:'client'},
    {id:'c3',person:'Jane Doe',company:'Acme GmbH',email:'jane@acme.de',kind:'client'},
    {id:'c4',person:'',company:'',email:'person@gmail.com',kind:'client'}
  ];
  w.supaFetch=async()=>[];
  w.renderContactStats=()=>{};
  w.loadContacts=async()=>{};
  w.renderContacts=function(){
    const list=w.document.getElementById('contacts-list');
    list.innerHTML=(w._contacts||[]).map(c=>'<div class="ct" onclick="openContactModal(\''+c.id+'\')"><div class="ct-body"><div class="ct-name">'+(c.person||c.company||'(pa emër)')+'</div><div class="ct-meta">'+(c.email||'')+'</div></div><span class="ct-tag client">KLIENT</span></div>').join('');
  };
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await new Promise(r=>setTimeout(r,30));

  const T=w.PSTContactsProvenanceUI._test;
  assert.strictEqual(T.companyFromEmail('celik@kovac-celik.hr'),'Kovac Celik');
  assert.strictEqual(T.companyFromEmail('fh@haumann-fuchs.de'),'Haumann Fuchs');
  assert.strictEqual(T.companyFromEmail('info@akcelik.com.tr'),'Akcelik');
  assert.strictEqual(T.companyFromEmail('stahlbau@goettler-group.eu'),'Goettler Group');
  assert.strictEqual(T.companyFromEmail('person@gmail.com'),'','Free email providers must not be presented as companies');

  const names=Array.from(w.document.querySelectorAll('.ct-name')).map(n=>n.textContent.trim());
  assert.strictEqual(names[0],'Kovac Celik','Unnamed business contact should display company from domain');
  assert.strictEqual(names[1],'Ungersteel','Business domain fallback should be readable');
  assert.strictEqual(names[2],'Jane Doe','Real person names must remain authoritative');
  assert.strictEqual(names[3],'(pa emër)','Personal email domain must not invent a company');

  dom.window.close();
  console.log('Contacts domain company fallback smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});