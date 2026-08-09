/* PRISTEEL cross-thread Gmail safety v1
 * Conservative post-filter for project Gmail discovery.
 * Auto-select requires project-specific anchors, never client name alone.
 * Cross-thread discovery links emails first; file import stays in linked-email recovery.
 * No polling, no MutationObserver, no OAuth popup, no relation writes.
 */
(function(){
'use strict';
if(window.__pstGmailCrossThreadSafetyV1)return;window.__pstGmailCrossThreadSafetyV1=true;
var currentId='',ctx=null,seq=0;
var STOP={project:1,projekti:1,projekt:1,italian:1,style:1,steel:1,construction:1,konstrukcija:1,konstrukcije:1,restoran:1,restaurant:1,seafront:0};
function arr(v){return Array.isArray(v)?v:[];}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._+\-]+/g,' ').replace(/\s+/g,' ').trim();}
function uniq(a){var m={};return arr(a).filter(function(x){x=String(x||'').trim();if(!x||m[x])return false;m[x]=1;return true;});}
function tokens(v){return norm(v).split(' ').filter(function(x){return x.length>=5&&!STOP[x];});}
function emailKey(v){
  var s=String(v||'').toLowerCase().trim(),m=s.match(/([a-z0-9._%+\-]+)@([a-z0-9.\-]+\.[a-z]{2,})/i);if(!m)return'';
  var local=m[1],domain=m[2];
  if(domain==='googlemail.com')domain='gmail.com';
  if(domain==='gmail.com'){local=local.split('+')[0].replace(/\./g,'');}
  return local+'@'+domain;
}
function canonicalEmailText(v){return String(v||'').toLowerCase().replace(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/ig,function(e){return emailKey(e)||e.toLowerCase();});}
function rowSourceText(row){if(!row)return'';var c=row.cloneNode(true);c.querySelectorAll('.pgc-safety-note').forEach(function(n){n.remove();});return String(c.textContent||'');}
async function safe(path){try{return arr(await window.supaFetch(path));}catch(e){return[];}}
async function loadContext(id,mySeq){
  var p=(await safe('projects?id=eq.'+encodeURIComponent(id)+'&select=id,name,client,ref,location&limit=1'))[0]||{},cs=await safe('project_contacts?project_id=eq.'+encodeURIComponent(id)+'&select=email,contact_name,name,company&limit=500');
  if(mySeq!==seq)return null;
  var clientTokens=tokens(p.client||''),anchors=[];
  tokens(p.name||'').forEach(function(t){if(clientTokens.indexOf(t)<0)anchors.push(t);});
  tokens(p.location||'').forEach(function(t){anchors.push(t);});
  var ref=norm(p.ref||'');if(ref.length>=4)anchors.push(ref);tokens(p.ref||'').forEach(function(t){anchors.push(t);});
  anchors=uniq(anchors).filter(function(x){return x.length>=5;}).slice(0,18);
  var contacts=uniq(cs.map(function(c){return emailKey(c.email||'');}).filter(Boolean));
  ctx={project:p,anchors:anchors,contacts:contacts};return ctx;
}
function scoreOf(row){var e=row&&row.querySelector('.pgc-score'),m=String(e&&e.textContent||'').match(/\d+/);return m?Number(m[0]):0;}
function classify(row){
  var raw=rowSourceText(row),text=norm(raw),emailText=canonicalEmailText(raw),hits=(ctx&&ctx.anchors||[]).filter(function(a){return text.indexOf(a)>-1;}),contacts=(ctx&&ctx.contacts||[]).filter(function(e){return emailText.indexOf(e)>-1;}),score=scoreOf(row);
  var strong=hits.length>=2||(hits.length>=1&&contacts.length>=1)||(hits.length>=1&&score>=70);
  return{strong:strong,hits:hits,contacts:contacts,score:score,emailText:emailText};
}
function tag(row,c){
  var main=row.querySelector('.pgc-main');if(!main)return;var old=main.querySelector('.pgc-safety-note');if(old)old.remove();var n=document.createElement('span');n.className='pgc-safety-note '+(c.strong?'ok':'manual');
  n.textContent=c.strong?'Përputhje projekti: '+(c.hits.slice(0,2).join(', ')+(c.contacts.length?' + kontakt':'')||'sinjale të forta'):'Sugjerim për kontroll manual';main.appendChild(n);
}
function apply(){
  var modal=document.getElementById('pgc-bg');if(!modal||!ctx)return false;var rows=[].slice.call(modal.querySelectorAll('.pgc-row'));
  if(!rows.length)return false;
  rows.forEach(function(row){var cb=row.querySelector('.pgc-thread'),c=classify(row);if(cb)cb.checked=!!c.strong;tag(row,c);});
  modal.querySelectorAll('.pgc-attachment').forEach(function(x){x.checked=false;x.disabled=true;});
  var imp=modal.querySelector('#pgc-import');if(imp){imp.disabled=true;imp.textContent='Importo pas lidhjes';imp.title='Për siguri, skedarët importohen vetëm pasi emailat të jenë lidhur me projektin.';}
  var link=modal.querySelector('#pgc-link');if(link)link.textContent='Lidhi emailat e zgjedhur';
  var all=modal.querySelector('#pgc-all-threads');if(all){all.textContent='Hiqi të gjitha';all.onclick=function(){modal.querySelectorAll('.pgc-thread').forEach(function(x){x.checked=false;});};}
  var latest=modal.querySelector('#pgc-latest-files');if(latest){latest.disabled=true;latest.textContent='Pas lidhjes';}
  var st=modal.querySelector('#pgc-status');if(st){st.textContent='Zgjidhen automatikisht vetëm thread-et me sinjale specifike të projektit. Skedarët importohen më pas vetëm nga emailat e lidhur.';st.className='pgc-status ok';}
  return true;
}
function schedule(){[0,120,400,900,1700,3000].forEach(function(ms){setTimeout(apply,ms);});}
function install(){
  var f=window.pstCollectProjectGmail;
  if(typeof f!=='function'||f.__pstCrossThreadSafe)return false;
  if(typeof window.pstRecoverLinkedProjectGmail==='function'&&f===window.pstRecoverLinkedProjectGmail)return false;
  var target=f;
  function wrapped(id){currentId=String(id||window.__pstCurrentProjectId||'');var my=++seq;ctx=null;if(currentId)loadContext(currentId,my).then(function(){schedule();});var r=target.apply(this,arguments);schedule();return r;}
  wrapped.__pstCrossThreadSafe=true;wrapped.__base=target;window.pstCollectProjectGmail=wrapped;return true;
}
function css(){if(document.getElementById('pgc-safety-css'))return;var s=document.createElement('style');s.id='pgc-safety-css';s.textContent='.pgc-safety-note{display:block;margin-top:5px;font-size:8.5px;font-weight:700}.pgc-safety-note.ok{color:#2F7657}.pgc-safety-note.manual{color:#9A6A25}.pgc-attachment:disabled{cursor:not-allowed}.pgc-att-row:has(.pgc-attachment:disabled){opacity:.48}';document.head.appendChild(s);}
css();install();setTimeout(install,120);setTimeout(install,500);
document.addEventListener('click',function(e){var t=e.target;if(t&&t.id==='pgc-search')schedule();},true);
document.addEventListener('pst:modules-ready',function(){install();},{once:true});
window.PSTGmailCrossThreadSafetyV1={apply:apply,install:install,emailKey:emailKey,canonicalEmailText:canonicalEmailText,debug:function(row){return{context:ctx,result:classify(row),raw:rowSourceText(row)}}};
})();