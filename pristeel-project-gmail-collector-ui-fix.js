/* PRISTEEL - butoni i qendrueshem Mblidh nga Gmail */
(function(){
'use strict';
if(window.__pstProjectGmailCollectorUiFixLoaded)return;
window.__pstProjectGmailCollectorUiFixLoaded=true;

var currentProjectId='';
var resolving=false;
var retryTimer=null;
var projectsCache=null;
var projectsCacheAt=0;
var SUPPLIERS=['biomek','zincometal','eurosteel','r t group','rt group','tehnoburimi','vating','mitas','isiklar','elmet'];

var css=document.createElement('style');
css.textContent=`
.ov-head .pgc-head-actions{display:flex;align-items:center;gap:8px;margin-left:auto;margin-right:8px;flex-wrap:wrap;justify-content:flex-end}
.ov-head .pgc-head-actions .pgc-btn{height:36px;padding:0 13px;border-radius:11px;font-size:10.5px;font-weight:750}
@media(max-width:720px){.ov-head{align-items:flex-start;gap:10px;flex-wrap:wrap}.ov-head .pgc-head-actions{order:3;width:100%;margin:4px 0 0;justify-content:flex-start}.ov-head .pgc-head-actions .pgc-btn{flex:1}}
`;
document.head.appendChild(css);

function str(v){return String(v==null?'':v).trim()}
function norm(v){return str(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function arr(v){return Array.isArray(v)?v:[]}
function visible(el){if(!el)return false;var s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'}
function modal(){return document.getElementById('ov-backdrop')}
function projectTitle(){var el=document.getElementById('ov-title');return str(el&&el.textContent)}
function projectClient(){var el=document.getElementById('ov-client');return str(el&&el.textContent).split('·')[0].trim()}
function remember(id){id=str(id);if(!id)return;currentProjectId=id;window.__pstCurrentProjectId=id;var bd=modal();if(bd)bd.setAttribute('data-project-id',id)}
function idFromElement(el){if(!el)return'';var direct=el.getAttribute('data-project-id')||el.getAttribute('data-project')||'';if(direct)return str(direct);var code=el.getAttribute('onclick')||'',m=code.match(/(?:openOverview|pstV2OpenProject)\s*\(\s*['"]([^'"]+)['"]/);return m?str(m[1]):''}

async function loadProjects(){
  if(projectsCache&&Date.now()-projectsCacheAt<30000)return projectsCache;
  projectsCache=await supaFetch('projects?select=id,name,client,ref,status&order=created_at.asc&limit=3000');
  projectsCache=arr(projectsCache);projectsCacheAt=Date.now();return projectsCache
}
function isSupplierClient(client){var c=norm(client);return SUPPLIERS.some(function(x){return c.indexOf(norm(x))>-1})}
function isShadow(p){var t=norm((p&&p.name)+' '+(p&&p.client)+' '+(p&&p.ref));return isSupplierClient(p&&p.client)&&/ssp|smart city|camera pole|steel poles/.test(t)}
function masterScore(p){
  var t=norm((p&&p.name)+' '+(p&&p.client)+' '+(p&&p.ref)),s=0;
  if(/smart city|smartct/.test(t))s+=90;
  if(/camera pole|camera poles|shtyll/.test(t))s+=90;
  if(/ssp|sspfz/.test(t))s+=55;
  if(/46 qytete|46 cities/.test(t))s+=30;
  if(isSupplierClient(p&&p.client))s-=180;
  return s
}
async function canonicalProject(id){
  var ps=await loadProjects(),current=ps.filter(function(p){return String(p.id)===String(id)})[0]||null;
  if(!current)return{id:id,name:'',redirected:false};
  if(!isShadow(current))return{id:current.id,name:current.name,redirected:false};
  var ranked=ps.map(function(p){return{p:p,s:masterScore(p)}}).sort(function(a,b){return b.s-a.s});
  var master=ranked[0]&&ranked[0].s>=140?ranked[0].p:null;
  if(!master)throw new Error('Ky është projekt furnitori dhe projekti qendror SSP nuk u identifikua. Importimi u ndal për siguri.');
  return{id:master.id,name:master.name,redirected:true,from:current.name}
}
async function resolveByTitle(){
  if(currentProjectId)return currentProjectId;
  var bd=modal(),stored=str((bd&&bd.getAttribute('data-project-id'))||window.__pstCurrentProjectId||'');
  if(stored){remember(stored);return stored}
  if(resolving)return'';
  var title=projectTitle();if(!title||title==='Pasqyra e projektit')return'';
  resolving=true;
  try{
    var rows=await supaFetch('projects?name=eq.'+encodeURIComponent(title)+'&select=id,name,client&limit=10');rows=arr(rows);
    if(rows.length>1){var client=projectClient().toLowerCase(),exact=rows.filter(function(p){return str(p.client).toLowerCase()===client});if(exact.length)rows=exact}
    if(rows[0]&&rows[0].id){remember(rows[0].id);return str(rows[0].id)}
  }finally{resolving=false}
  return''
}
function actionHost(){
  var hd=document.querySelector('#ov-backdrop .ov-head');if(!hd)return null;
  var host=hd.querySelector('.pgc-head-actions');
  if(!host){host=document.createElement('div');host.className='pgc-head-actions';var close=hd.querySelector('.ov-close');hd.insertBefore(host,close||null)}
  return host
}
function makeStableButton(old,host){
  var btn=document.createElement('button');
  btn.id='pgc-open';btn.type='button';btn.className='pgc-btn';btn.textContent='Mblidh nga Gmail';
  btn.title='Gjej dhe lidh emailat, thread-et dhe skedarët e këtij projekti';btn.dataset.pgcStable='1';
  btn.addEventListener('click',async function(ev){
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
    if(typeof window.pstCollectProjectGmail!=='function'){alert('Moduli i Gmail-it nuk është ngarkuar ende. Rifresko faqen dhe provo përsëri.');return}
    btn.disabled=true;var label=btn.textContent;btn.textContent='Duke hapur…';
    try{
      var id=currentProjectId||await resolveByTitle();if(!id)throw new Error('Nuk u identifikua projekti i hapur. Mbylle dhe hape përsëri projektin.');
      var target=await canonicalProject(id);
      if(target.redirected)console.info('PRISTEEL: Gmail collector u ridrejtua nga',target.from,'te',target.name);
      window.pstCollectProjectGmail(target.id)
    }catch(e){alert(String(e&&e.message||e))}
    finally{btn.disabled=false;btn.textContent=label}
  },true);
  if(old&&old.parentNode)old.parentNode.replaceChild(btn,old);else host.appendChild(btn);
  return btn
}
function ensureButton(){
  var bd=modal();if(!visible(bd))return false;
  var host=actionHost();if(!host)return false;
  var btn=document.getElementById('pgc-open');
  if(!btn||btn.dataset.pgcStable!=='1')btn=makeStableButton(btn,host);
  if(btn.parentNode!==host)host.appendChild(btn);
  resolveByTitle();return true
}
function schedule(){clearTimeout(retryTimer);var attempts=0;function run(){if(ensureButton())return;if(++attempts<50)retryTimer=setTimeout(run,100)}retryTimer=setTimeout(run,20)}
function wrap(name){
  var fn=window[name];if(typeof fn!=='function'||fn.__pgcUiFix)return false;
  var wrapped=function(){var id=str(arguments[0]&&typeof arguments[0]==='object'?arguments[0].id:arguments[0]);if(id)remember(id);var result=fn.apply(this,arguments);schedule();return result};
  wrapped.__pgcUiFix=true;wrapped.__pgcOriginal=fn;window[name]=wrapped;return true
}
function init(){
  wrap('openOverview');wrap('pstV2OpenProject');wrap('renderOverviewModal');
  document.addEventListener('click',function(e){var el=e.target&&e.target.closest?e.target.closest('[data-project-id],[data-project],[onclick]'):null,id=idFromElement(el);if(id)remember(id)},true);
  var observer=new MutationObserver(function(){wrap('openOverview');wrap('pstV2OpenProject');wrap('renderOverviewModal');if(visible(modal()))schedule()});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
  if(visible(modal()))schedule()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,250)});else setTimeout(init,250)
})();
