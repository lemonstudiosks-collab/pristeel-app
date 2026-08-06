/* PRISTEEL Gmail intake revision selection fix
 * Applies once per rendered intake modal and remains overridable by the user afterwards.
 * No MutationObserver or interval.
 */
(function(){
'use strict';
if(window.__pstGmailIntakeRevisionFixV1)return;
window.__pstGmailIntakeRevisionFixV1=true;

function base(name){
  return String(name||'').toLowerCase()
    .replace(/\.[^.]+$/,'')
    .replace(/(?:^|[._ -])(signed|finale?|approved|draft|preliminary)(?=$|[._ -])/g,' ')
    .replace(/(?:^|[._ -])rev(?:ision)?[._ -]*\d+(?:[._-]\d+)?/g,' ')
    .replace(/(?:^|[._ -])ver(?:sion)?[._ -]*\d+(?:[._-]\d+)?/g,' ')
    .replace(/(?:^|[._ -])\d{1,2}[._-]\d{1,2}[._-]20\d{2}(?=$|[._ -])/g,' ')
    .replace(/[^a-z0-9à-ž]+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function rank(name){
  var n=String(name||'').toLowerCase(),score=0;
  var r=n.match(/rev(?:ision)?[._ -]*(\d+(?:[._-]\d+)?)/);if(r)score+=parseFloat(r[1].replace('_','.'))*100;
  var v=n.match(/ver(?:sion)?[._ -]*(\d+(?:[._-]\d+)?)/);if(v)score+=parseFloat(v[1].replace('_','.'))*80;
  if(/signed|approved/.test(n))score+=10000;
  if(/final/.test(n))score+=5000;
  if(/draft|preliminary/.test(n))score-=2000;
  return score;
}
function normalize(root){
  root=root||document.getElementById('pgi2-bg');
  if(!root||root.dataset.pstRevisionReviewed==='1')return false;
  var groups={};
  root.querySelectorAll('.pgi2-file-row').forEach(function(row,index){
    var nameEl=row.querySelector('.pgi2-file-main b'),box=row.querySelector('.pgi2-file');
    if(!nameEl||!box)return;
    var name=String(nameEl.textContent||''),key=base(name)||name.toLowerCase();
    (groups[key]=groups[key]||[]).push({row:row,box:box,name:name,index:index,score:rank(name)});
  });
  Object.keys(groups).forEach(function(key){
    var rows=groups[key];if(rows.length<2)return;
    rows.sort(function(a,b){return b.score-a.score||a.index-b.index;});
    rows.forEach(function(item,index){item.box.checked=index===0;item.row.classList.toggle('muted',index>0);var tag=item.row.querySelector('i');if(tag)tag.textContent=index===0?'Versioni më i ri':'Version më i vjetër';});
  });
  root.dataset.pstRevisionReviewed='1';
  return true;
}
function schedule(){[0,350,900,1800,3500].forEach(function(ms){setTimeout(function(){normalize();},ms);});}
document.addEventListener('pst:gmail-intake-request',schedule);
document.addEventListener('pst:gmail-handoff-fallback',schedule);
document.addEventListener('click',function(event){var root=event.target&&event.target.closest?event.target.closest('#pgi2-bg'):null;if(root)normalize(root);},true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTGmailIntakeRevisionFixV1={base:base,rank:rank,normalize:normalize};
})();
