import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8');}
function write(path,content){fs.writeFileSync(path,content,'utf8');}
function replaceOnce(source,before,after,label){
  const first=source.indexOf(before);
  if(first<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,first+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,first)+after+source.slice(first+before.length);
}

{
  const path='pristeel-tender-business-flow-v1.js';
  let s=read(path);
  s=replaceOnce(s,
`function bizStatus(r){
 if(source(r)==='TED'&&payload(r).ted_contact_status==='contacted')return'contacted';
 return r.status||'new';
}
function statusLabel(r){
 var st=bizStatus(r);
 if(source(r)==='TED')return({new:'Fitues i ri',review:'Për kontakt',contacted:'Kontaktuar',ignored:'Anashkaluar',promoted:'Projekt'})[st]||st;
 return({new:'E re',review:'Në shqyrtim',ignored:'Anashkaluar',promoted:'Projekt',contacted:'Kontaktuar'})[st]||st||'—';
}
function isOperationalFocus(r){return source(r)==='TED'?phase(r)==='award':phase(r)==='opportunity';}`,
`function bizStatus(r){
 if(source(r)==='TED'&&payload(r).ted_contact_status==='contacted')return'contacted';
 return r.status||'new';
}
function hasTedWinner(r){return source(r)==='TED'&&!!winner(r).name;}
function statusLabel(r){
 var st=bizStatus(r);
 if(source(r)==='TED'){
  if(!hasTedWinner(r)&&st!=='ignored')return'Fituesi i papublikuar';
  return({new:'Fitues i ri',review:'Për kontakt',contacted:'Kontaktuar',ignored:'Anashkaluar',promoted:'Projekt'})[st]||st;
 }
 return({new:'E re',review:'Në shqyrtim',ignored:'Anashkaluar',promoted:'Projekt',contacted:'Kontaktuar'})[st]||st||'—';
}
function isOperationalFocus(r){return source(r)==='TED'?phase(r)==='award'&&hasTedWinner(r):phase(r)==='opportunity';}`,
    'TED operational focus/status block');

  s=replaceOnce(s,
`function tedActions(r){
 var w=winner(r),a='';
 a+='<button class="pst-kek-btn" onclick="pstKekOpenSource(\\''+esc(r.id)+'\\')">TED ↗</button>';
 if(w.email)a+='<button class="pst-kek-btn" onclick="pstTenderBizEmail(\\''+esc(r.id)+'\\')">Email ↗</button>';
 if(safeHttp(w.website))a+='<button class="pst-kek-btn" onclick="pstTenderBizWebsite(\\''+esc(r.id)+'\\')">Web ↗</button>';
 var st=bizStatus(r);`,
`function tedActions(r){
 var w=winner(r),a='';
 a+='<button class="pst-kek-btn" onclick="pstKekOpenSource(\\''+esc(r.id)+'\\')">TED ↗</button>';
 if(!w.name){
  if(r.status!=='ignored')a+='<button class="pst-kek-btn danger" onclick="pstTenderBizSetStatus(\\''+esc(r.id)+'\\',\\'ignored\\')">Anashkalo</button>';
  return a;
 }
 if(w.email)a+='<button class="pst-kek-btn" onclick="pstTenderBizEmail(\\''+esc(r.id)+'\\')">Email ↗</button>';
 if(safeHttp(w.website))a+='<button class="pst-kek-btn" onclick="pstTenderBizWebsite(\\''+esc(r.id)+'\\')">Web ↗</button>';
 var st=bizStatus(r);`,
    'TED no-winner action guard');
  write(path,s);
}

{
  const path='tests/tender-business-flow-smoke.js';
  let s=read(path);
  s=replaceOnce(s,
` {id:'ted-award',source_key:'TED:A',procurement_no:'TED-A',title:'Structural steel award',authority:'Buyer GmbH',category:'steel_structure',relevance_score:96,status:'new',published_date:'2026-08-14',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'award',winner:{name:'Winner Stahl GmbH',email:'sales@winner.example',website:'https://winner.example',city:'Berlin',country:'DE'}}},
 {id:'ted-open'`,
` {id:'ted-award',source_key:'TED:A',procurement_no:'TED-A',title:'Structural steel award',authority:'Buyer GmbH',category:'steel_structure',relevance_score:96,status:'new',published_date:'2026-08-14',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'award',winner:{name:'Winner Stahl GmbH',email:'sales@winner.example',website:'https://winner.example',city:'Berlin',country:'DE'}}},
 {id:'ted-no-winner',source_key:'TED:N',procurement_no:'TED-N',title:'Steel award awaiting winner publication',authority:'Buyer SA',category:'steel_structure',relevance_score:94,status:'new',published_date:'2026-08-14',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'award',winner:{name:'',email:'',website:'',city:'',country:''}}},
 {id:'ted-open'`,
    'missing-winner fixture');

  s=replaceOnce(s,
` assert.equal(window.pstTenderBusinessFlow.phaseMatch(rows[1],'all'),false,'TED opportunities must be hidden even under all');`,
` assert.equal(window.pstTenderBusinessFlow.phaseMatch(rows[2],'all'),false,'TED opportunities must be hidden even under all');`,
    'TED opportunity fixture index');

  s=replaceOnce(s,
` assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[0]),true,'TED award is operational');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[2]),true,'KRPP opportunity is operational');
 await window.pstKekLoad();
 let text=window.document.getElementById('pst-kek-list').textContent;`,
` assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[0]),true,'TED award with winner is operational');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[1]),false,'TED award without winner is intelligence-only until winner data exists');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[3]),true,'KRPP opportunity is operational');
 await window.pstKekLoad();
 let text=window.document.getElementById('pst-kek-list').textContent;
 assert.ok(!text.includes('Steel award awaiting winner publication'),'TED award without winner must stay out of operational focus');
 assert.equal(window.document.getElementById('pst-kek-nav-badge').textContent,'2','badge must count only actionable TED winners plus direct-bid opportunities');
 window.document.getElementById('pst-kek-phase').value='award';
 window.document.getElementById('pst-kek-status').value='all';
 window.pstKekRender();
 const noWinnerRow=[...window.document.querySelectorAll('#pst-kek-list tr')].find(tr=>tr.textContent.includes('Steel award awaiting winner publication'));
 assert.ok(noWinnerRow,'TED award without winner must remain visible under award intelligence');
 assert.ok(noWinnerRow.textContent.includes('ende nuk është publikuar'),'missing-winner intelligence message must remain visible');
 assert.ok(noWinnerRow.textContent.includes('Fituesi i papublikuar'),'missing-winner status must not claim a new winner exists');
 assert.ok(!noWinnerRow.textContent.includes('Për kontakt'),'missing-winner row must not offer outreach action');
 assert.ok(noWinnerRow.textContent.includes('TED ↗'),'missing-winner row must keep the official TED source action');
 window.document.getElementById('pst-kek-phase').value='focus';
 window.document.getElementById('pst-kek-status').value='open';
 window.pstKekRender();
 text=window.document.getElementById('pst-kek-list').textContent;`,
    'missing-winner operational assertions');
  write(path,s);
}

console.log('Applied TED missing-winner intelligence-only patch.');
