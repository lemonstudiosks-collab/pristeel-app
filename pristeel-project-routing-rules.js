/* PRISTEEL - canonical project routing rules
   Enriches master projects with aliases/suppliers and suppresses known supplier-shadow projects.
*/
(function(){
'use strict';
if(window.__pstProjectRoutingRulesLoaded)return;
window.__pstProjectRoutingRulesLoaded=true;

var A=window.PSTEmail;
if(!A||typeof A.profiles!=='function')return;
var originalProfiles=A.profiles;

function arr(v){return Array.isArray(v)?v:[]}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i})}
function add(q,key,values){q[key]=uniq(arr(q[key]).concat(values||[]))}

var SSP={
  aliases:['ssp','sspfz','smart city','smartct','camera pole','camera poles','shtyllat e kamerave','shtyllave te kamerave','steel poles albania','rfq steel poles','17s 25','pst ssp sc 001 2026'],
  refs:['17s-25','pst-ssp-sc-001-2026','smartct'],
  tokens:['camera','poles','pole','steel poles','rfq','quotation','smartct','foundations','foundation','bazamentet','bazamenteve','montimi','installation','fabrication','civil','boq','eurosteel','biomek','zincometal','tehnoburimi','vating'],
  emails:['ermalrula@gmail.com','aldo@rt-grp.com','tani@rt-grp.com','renis.tershana@rt-grp.com','tsotas@biomek.gr','biomek@biomek.gr','info@zincometal.gr','sales@zincometal.gr','burim.fazliu@tehnoburimi.com','sasa.sacic@tehnoburimi.com','dimitar.zakov@vating.com.mk','varis.mehmeti@sspfz.com','legal@sspfz.com','elvin.luci@sspfz.com','valon@fivainvestment.com','fitim@fivainvestment.com','shpend.kusari@fivainvestment.com'],
  suppliers:['biomek','eurosteel','r t group','rt group','tehnoburimi','vating','zincometal','mitas','isiklar','elmet']
};
function sspMasterScore(q){
  var t=norm((q.p&&q.p.name)+' '+(q.p&&q.p.client)+' '+(q.p&&q.p.ref)),s=0;
  if(/smart city|smartct/.test(t))s+=80;
  if(/camera pole|camera poles|shtyll/.test(t))s+=80;
  if(/ssp|sspfz/.test(t))s+=60;
  if(/46 qytete|46 cities/.test(t))s+=30;
  if(SSP.suppliers.some(function(x){return norm(q.p&&q.p.client).indexOf(x)>-1}))s-=140;
  return s
}
function shadowOfSsp(q,master){
  if(!master||String(q.p.id)===String(master.p.id))return false;
  var n=norm(q.p&&q.p.name),c=norm(q.p&&q.p.client),r=norm(q.p&&q.p.ref);
  var supplier=SSP.suppliers.some(function(x){return c.indexOf(x)>-1});
  var theme=/ssp|smart city|smartct|camera pole|steel poles/.test(n+' '+r);
  var generic=/steel poles|camera poles|rfq steel poles|ssp steel/.test(n);
  return supplier&&theme&&generic
}
function enrichSsp(profiles){
  var ranked=profiles.map(function(q){return{q:q,s:sspMasterScore(q)}}).sort(function(a,b){return b.s-a.s});
  var master=ranked[0]&&ranked[0].s>=120?ranked[0].q:null;
  if(!master)return profiles;
  add(master,'refs',SSP.refs);
  add(master,'names',SSP.aliases);
  add(master,'tokens',SSP.tokens);
  add(master,'emails',SSP.emails);
  master.routing_profile='ssp-camera-poles-master';
  return profiles.filter(function(q){
    if(!shadowOfSsp(q,master))return true;
    q.routing_suppressed=true;
    q.routing_master_project_id=master.p.id;
    return false
  })
}
A.profiles=async function(){
  var profiles=await originalProfiles.apply(A,arguments);
  profiles=enrichSsp(arr(profiles));
  A.projects=profiles.map(function(q){return q.p});
  return profiles
};
})();
