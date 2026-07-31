/* PRISTEEL Gmail: one daily check on first Outreach open */
(function(){
'use strict';
var A=window.PSTEmail;
if(!A) return;

function today(){ return new Date().toISOString().slice(0,10); }
function due(){
  var last=localStorage.getItem(A.keys.daily)||'';
  return localStorage.getItem(A.keys.done)==='1' && last.slice(0,10)!==today();
}
async function run(){
  if(!due()||A.busy) return;
  try{
    A.set('pec-state','Kontrolli ditor po kërkon emailat e rinj…');
    var r=await A.daily();
    A.set('pec-state','Kontrolli ditor përfundoi: '+r.processed+' emaila u kontrolluan, '+r.inserted+' ishin të rinj.','var(--green-text)');
    if(typeof window.pstEmailCenterLoad==='function') await window.pstEmailCenterLoad();
  }catch(e){
    A.set('pec-state','Kontrolli ditor pret autorizimin e Google. Kliko “Kontrollo emailat e rinj”.','var(--text3)');
  }
}
function hook(){
  if(typeof window.showPage!=='function'||window.showPage.__pecDaily) return false;
  var original=window.showPage;
  window.showPage=function(page){
    var result=original.apply(this,arguments);
    if(String(page||'').toLowerCase()==='outreach') run();
    return result;
  };
  window.showPage.__pecDaily=true;
  return true;
}
var tries=0,iv=setInterval(function(){
  if(hook()||++tries>50) clearInterval(iv);
},400);
})();
