/* PRISTEEL Gmail: incremental sync while the platform is open */
(function(){
'use strict';
var A=window.PSTEmail;
if(!A)return;

var INTERVAL_MS=10*60*1000;
var MIN_GAP_MS=8*60*1000;
var running=false;
var lastAttempt=0;

function lastSync(){var v=localStorage.getItem(A.keys.daily)||'';var n=Date.parse(v);return isNaN(n)?0:n}
function historyReady(){return localStorage.getItem(A.keys.done)==='1'}
function due(){return historyReady()&&Date.now()-lastSync()>MIN_GAP_MS&&Date.now()-lastAttempt>60000}
function status(msg,color){A.set('pec-state',msg,color)}

async function run(reason){
  if(running||A.busy||!due())return;
  running=true;lastAttempt=Date.now();
  try{
    status('Sinkronizimi i Gmail-it po kontrollon emailat e rinj…');
    var r=await A.daily();
    status('Gmail u sinkronizua: '+r.processed+' emaila u kontrolluan, '+r.inserted+' ishin të rinj.','var(--green-text)');
    if(typeof window.pstEmailCenterLoad==='function')await window.pstEmailCenterLoad();
    window.dispatchEvent(new CustomEvent('pst:gmail-synced',{detail:{reason:reason||'interval',result:r}}));
  }catch(e){
    status('Sinkronizimi automatik pret autorizimin e Google. Hape Inbox & Mundësitë dhe kliko “Kontrollo emailat e rinj”.','var(--text3)');
  }finally{running=false}
}
function hook(){
  if(typeof window.showPage!=='function'||window.showPage.__pecDaily)return false;
  var original=window.showPage;
  window.showPage=function(page){
    var result=original.apply(this,arguments);
    if(String(page||'').toLowerCase()==='outreach')setTimeout(function(){run('outreach-open')},250);
    return result;
  };
  window.showPage.__pecDaily=true;
  return true;
}
function start(){
  var tries=0,iv=setInterval(function(){if(hook()||++tries>60)clearInterval(iv)},300);
  setTimeout(function(){run('app-open')},2200);
  setInterval(function(){if(!document.hidden)run('interval')},INTERVAL_MS);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(function(){run('visibility')},500)});
  window.addEventListener('focus',function(){setTimeout(function(){run('focus')},500)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
