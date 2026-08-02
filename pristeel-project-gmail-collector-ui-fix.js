/* PRISTEEL — siguron që butoni "Mblidh nga Gmail" shfaqet në çdo pasqyrë projekti */
(function(){
'use strict';
if(window.__pstProjectGmailCollectorUiFixLoaded)return;
window.__pstProjectGmailCollectorUiFixLoaded=true;

var currentProjectId='';
var resolving=false;
var observer=null;
var retryTimer=null;

var css=document.createElement('style');
css.textContent=`
.ov-head .pgc-head-actions{display:flex;align-items:center;gap:8px;margin-left:auto;margin-right:8px;flex-wrap:wrap;justify-content:flex-end}
.ov-head .pgc-head-actions .pgc-btn{height:36px;padding:0 13px;border-radius:11px;font-size:10.5px;font-weight:750}
@media(max-width:720px){.ov-head{align-items:flex-start;gap:10px;flex-wrap:wrap}.ov-head .pgc-head-actions{order:3;width:100%;margin:4px 0 0;justify-content:flex-start}.ov-head .pgc-head-actions .pgc-btn{flex:1}}
`;
document.head.appendChild(css);

function str(v){return String(v==null?'':v).trim()}
function visible(el){
  if(!el)return false;
  var s=getComputedStyle(el);
  return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'
}
function modal(){return document.getElementById('ov-backdrop')}
function projectTitle(){var el=document.getElementById('ov-title');return str(el&&el.textContent)}
function projectClient(){var el=document.getElementById('ov-client');return str(el&&el.textContent).split('·')[0].trim()}
function remember(id){
  id=str(id);
  if(!id)return;
  currentProjectId=id;
  window.__pstCurrentProjectId=id;
  var bd=modal();
  if(bd)bd.setAttribute('data-project-id',id)
}
function idFromElement(el){
  if(!el)return'';
  var direct=el.getAttribute('data-project-id')||el.getAttribute('data-project')||'';
  if(direct)return str(direct);
  var code=el.getAttribute('onclick')||'';
  var m=code.match(/(?:openOverview|pstV2OpenProject)\s*\(\s*['"]([^'"]+)['"]/);
  return m?str(m[1]):''
}
async function resolveByTitle(){
  if(currentProjectId)return currentProjectId;
  var bd=modal();
  var stored=str((bd&&bd.getAttribute('data-project-id'))||window.__pstCurrentProjectId||'');
  if(stored){remember(stored);return stored}
  if(resolving)return'';
  var title=projectTitle();
  if(!title||title==='Pasqyra e projektit')return'';
  resolving=true;
  try{
    var rows=await supaFetch('projects?name=eq.'+encodeURIComponent(title)+'&select=id,name,client&limit=10');
    rows=Array.isArray(rows)?rows:[];
    if(rows.length>1){
      var client=projectClient().toLowerCase();
      var exact=rows.filter(function(p){return str(p.client).toLowerCase()===client});
      if(exact.length)rows=exact
    }
    if(rows[0]&&rows[0].id){remember(rows[0].id);return str(rows[0].id)}
  }catch(e){console.warn('Nuk u gjet ID-ja e projektit për Gmail collector:',e)}
  finally{resolving=false}
  return''
}
function actionHost(){
  var hd=document.querySelector('#ov-backdrop .ov-head');
  if(!hd)return null;
  var host=hd.querySelector('.pgc-head-actions');
  if(!host){
    host=document.createElement('div');
    host.className='pgc-head-actions';
    var close=hd.querySelector('.ov-close');
    hd.insertBefore(host,close||null)
  }
  return host
}
function ensureButton(){
  var bd=modal();
  if(!visible(bd))return false;
  var host=actionHost();
  if(!host)return false;
  var btn=document.getElementById('pgc-open');
  if(!btn){
    btn=document.createElement('button');
    btn.id='pgc-open';
    btn.type='button';
    btn.className='pgc-btn';
    btn.textContent='Mblidh nga Gmail';
    btn.title='Gjej dhe lidh emailat, thread-et dhe skedarët e këtij projekti';
    btn.addEventListener('click',async function(){
      if(typeof window.pstCollectProjectGmail!=='function'){
        alert('Moduli i Gmail-it nuk është ngarkuar ende. Rifresko faqen dhe provo përsëri.');
        return
      }
      btn.disabled=true;
      var old=btn.textContent;
      btn.textContent='Duke hapur…';
      try{
        var id=currentProjectId||await resolveByTitle();
        if(!id)throw new Error('Nuk u identifikua projekti i hapur. Mbylle dhe hape përsëri projektin.');
        window.pstCollectProjectGmail(id)
      }catch(e){alert(String(e&&e.message||e))}
      finally{btn.disabled=false;btn.textContent=old}
    })
  }
  if(btn.parentNode!==host)host.appendChild(btn);
  resolveByTitle();
  return true
}
function schedule(){
  clearTimeout(retryTimer);
  var attempts=0;
  function run(){
    if(ensureButton())return;
    if(++attempts<40)retryTimer=setTimeout(run,100)
  }
  retryTimer=setTimeout(run,20)
}
function wrap(name){
  var fn=window[name];
  if(typeof fn!=='function'||fn.__pgcUiFix)return false;
  var wrapped=function(){
    var id=str(arguments[0]&&typeof arguments[0]==='object'?arguments[0].id:arguments[0]);
    if(id)remember(id);
    var result=fn.apply(this,arguments);
    schedule();
    return result
  };
  wrapped.__pgcUiFix=true;
  wrapped.__pgcOriginal=fn;
  window[name]=wrapped;
  return true
}
function init(){
  wrap('openOverview');
  wrap('pstV2OpenProject');
  wrap('renderOverviewModal');
  document.addEventListener('click',function(e){
    var el=e.target&&e.target.closest?e.target.closest('[data-project-id],[data-project],[onclick]'):null;
    var id=idFromElement(el);
    if(id)remember(id)
  },true);
  observer=new MutationObserver(function(){
    wrap('openOverview');
    wrap('pstV2OpenProject');
    wrap('renderOverviewModal');
    if(visible(modal()))schedule()
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class']});
  if(visible(modal()))schedule()
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,250)});else setTimeout(init,250)
})();
