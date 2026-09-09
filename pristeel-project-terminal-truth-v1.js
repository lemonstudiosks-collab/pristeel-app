/* PRISTEEL Project Terminal Truth v1
 * Final read-only guard for terminal project lifecycle truth.
 * Existing human-decided project.status is authoritative; this module never
 * changes won/lost, sends email, chooses suppliers, or writes commercial data.
 */
(function(){
'use strict';
if(window.__pstProjectTerminalTruthV1)return;
window.__pstProjectTerminalTruthV1=true;

var TERMINAL=/^(humbur|lost|arkivuar|archived|mbyllur|closed|closedlost|cancelled|canceled|refuzuar|rejected|realizuar|completed|complete)$/i;
var LOST=/^(humbur|lost|closedlost|cancelled|canceled|refuzuar|rejected)$/i;
var REALIZED=/^(realizuar|completed|complete)$/i;
var ARCHIVED=/^(arkivuar|archived)$/i;
var loadPromise=null,lastId='';

function arr(v){return Array.isArray(v)?v:[];}
function text(v){return String(v==null?'':v).trim();}
function esc(v){return text(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function isTerminal(status){return TERMINAL.test(text(status).toLowerCase());}
function activeId(){return text(window.__pstCurrentProjectId||window._curProjId||(window.__pstIntegrityLastData&&window.__pstIntegrityLastData.project&&window.__pstIntegrityLastData.project.id));}
function fmtDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}):'';}
function clip(v,n){v=text(v).replace(/\s+/g,' ');return v.length>n?v.slice(0,n-1)+'…':v;}
function mailUrl(x){return text(x&&x.gmail_url);}
function mailTime(x){var d=x&&x.sent_at?new Date(x.sent_at):null;return d&&!isNaN(d.getTime())?d.getTime():0;}
function latestIncoming(d){return arr(d&&d.emails).filter(function(x){return text(x&&x.direction).toLowerCase()==='incoming';}).sort(function(a,b){return mailTime(b)-mailTime(a);})[0]||null;}

function stateFor(status){
 status=text(status).toLowerCase();
 if(LOST.test(status))return{
   key:'lost',label:'Opportunity e humbur',
   summary:'Kjo opportunity është e mbyllur dhe nuk duhet të trajtohet si projekt aktiv.',
   next:'Asnjë follow-up për këtë opportunity. Kontakti i ardhshëm me klientin duhet të lidhet me një opportunity të re.',
   action:'Hap komunikimin',tab:'communication'
 };
 if(REALIZED.test(status))return{
   key:'realized',label:'Projekt i realizuar',
   summary:'Ky projekt është realizuar dhe nuk duhet të shfaqet në punën aktive.',
   next:'Nuk ka veprim aktiv. Ruaj dokumentacionin dhe historikun e projektit.',
   action:'Hap dokumentet',tab:'files'
 };
 if(ARCHIVED.test(status))return{
   key:'archived',label:'Projekt i arkivuar',
   summary:'Ky projekt është arkivuar dhe nuk duhet të shfaqet në punën aktive.',
   next:'Nuk ka veprim aktiv derisa një përdorues ta rikthejë shprehimisht projektin.',
   action:'Hap dokumentet',tab:'files'
 };
 return{
   key:'closed',label:'Projekt i mbyllur',
   summary:'Ky projekt është mbyllur dhe nuk duhet të shfaqet në punën aktive.',
   next:'Nuk ka veprim aktiv për këtë projekt.',
   action:'Hap projektin',tab:'overview'
 };
}

function evidenceHtml(d,status){
 var m=latestIncoming(d),parts=[];
 if(m){
   var meta=[fmtDate(m.sent_at),text(m.from_name||m.from_email),text(m.subject)].filter(Boolean).join(' · ');
   var snippet=clip(m.snippet,340);
   parts.push('<div class="pst-ptt-evidence"><span>EVIDENCA E FUNDIT NGA KLIENTI</span><b>'+esc(meta||'Email i lidhur me projektin')+'</b>'+(snippet?'<p>'+esc(snippet)+'</p>':'')+(mailUrl(m)?'<a href="'+esc(mailUrl(m))+'" target="_blank" rel="noopener">Hap emailin</a>':'')+'</div>');
 }else{
   parts.push('<div class="pst-ptt-evidence"><span>EVIDENCA E STATUSIT</span><b>Statusi i projektit: '+esc(status)+'</b><p>Nuk u gjet një email hyrës i lidhur që të shpjegojë arsyen. PPPP nuk duhet ta shpikë atë.</p></div>');
 }
 return parts.join('');
}

function applyPanel(d){
 var p=d&&d.project;if(!p||!isTerminal(p.status))return false;
 var panel=document.getElementById('pst-project-command-view');if(!panel)return false;
 var state=stateFor(p.status),box=panel.querySelector('.pst-pcv-state');if(!box)return false;
 var h=box.querySelector('h2'),summary=box.querySelector(':scope > p'),next=box.querySelector('.pst-pcv-next b'),primary=box.querySelector('#pst-pcv-action');
 if(h)h.textContent=state.label;
 if(summary)summary.textContent=state.summary;
 if(next)next.textContent=state.next;
 if(primary){primary.textContent=state.action;primary.setAttribute('data-tab',state.tab);}
 panel.classList.add('pst-ptt-terminal','pst-ptt-'+state.key);
 var old=box.querySelector('.pst-ptt-evidence');if(old)old.remove();
 var holder=document.createElement('div');holder.innerHTML=evidenceHtml(d,p.status);var ev=holder.firstElementChild;
 var nextBox=box.querySelector('.pst-pcv-next');if(ev&&nextBox)nextBox.insertAdjacentElement('afterend',ev);
 var signalHost=panel.querySelector('.pst-pcv-card:last-child > div');
 if(signalHost)signalHost.innerHTML='<div class="pst-pcv-signal ok"><i></i><span>Status terminal: ky projekt nuk kërkon veprim aktiv dhe nuk duhet të krijojë follow-up automatik.</span></div>';
 return true;
}

function installBoardGuard(){
 var fn=window.renderProjectBoard;
 if(typeof fn!=='function'||fn.__pstTerminalTruthGuard)return false;
 function guarded(){
   var original=window._allProjectsCache;
   if(!Array.isArray(original))return fn.apply(this,arguments);
   window._allProjectsCache=original.filter(function(p){return !isTerminal(p&&p.status);});
   try{return fn.apply(this,arguments);}finally{window._allProjectsCache=original;}
 }
 guarded.__pstTerminalTruthGuard=true;
 guarded.__pstTerminalTruthBase=fn;
 window.renderProjectBoard=guarded;
 try{guarded();}catch(e){if(window.console)console.warn('Project terminal board guard:',e);}
 return true;
}

function currentData(){
 var d=window.__pstIntegrityLastData,id=activeId();
 return d&&d.project&&text(d.project.id)===id?d:null;
}
async function refresh(force){
 var id=activeId();if(!id)return false;
 var d=currentData();
 if(d&&!force)return applyPanel(d);
 if(!window.PSTProjectDataIntegrity||typeof window.PSTProjectDataIntegrity.load!=='function')return false;
 if(loadPromise&&lastId===id)return loadPromise;
 lastId=id;
 loadPromise=window.PSTProjectDataIntegrity.load(id).then(function(data){loadPromise=null;return applyPanel(data);}).catch(function(err){loadPromise=null;if(window.console)console.warn('Project terminal truth:',err);return false;});
 return loadPromise;
}
function schedule(force){[0,120,420,900,1700].forEach(function(ms){setTimeout(function(){installBoardGuard();refresh(force);},ms);});}
function css(){
 if(document.getElementById('pst-project-terminal-truth-css'))return;
 var s=document.createElement('style');s.id='pst-project-terminal-truth-css';s.textContent='\
.pst-ptt-terminal .pst-pcv-state{border-color:#D6DEE1;background:#FBFCFC}.pst-ptt-terminal .pst-pcv-next{border-left-color:#7C8B91;background:#F3F5F6}.pst-ptt-terminal .pst-pcv-next b{color:#4D5A60}.pst-ptt-lost .pst-pcv-state>span,.pst-ptt-lost .pst-pcv-state h2{color:#7D514A}.pst-ptt-evidence{margin-top:10px;padding:11px 12px;border:1px solid #E2E8EA;border-radius:10px;background:#fff}.pst-ptt-evidence span{display:block!important;font-size:7px!important;letter-spacing:.7px!important;font-weight:800!important;color:#829197!important}.pst-ptt-evidence b{display:block;font-size:9.5px;color:#45545A;margin-top:4px}.pst-ptt-evidence p{font-size:8.6px!important;line-height:1.5!important;color:#68777D!important;margin:5px 0 0!important;max-width:none!important}.pst-ptt-evidence a{display:inline-block;margin-top:7px;font-size:8px;font-weight:750;color:#456F81;text-decoration:none}\
';document.head.appendChild(s);
}

css();
[0,250,800,1800].forEach(function(ms){setTimeout(installBoardGuard,ms);});
document.addEventListener('pst:modules-ready',function(){schedule(false);});
document.addEventListener('click',function(event){
 var opener=event.target.closest&&event.target.closest('[data-pm-open]');if(opener){schedule(false);return;}
 var refreshBtn=event.target.closest&&event.target.closest('[onclick*="pstPiRefresh"]');if(refreshBtn)schedule(true);
},true);
window.addEventListener('pageshow',function(){schedule(false);});
var observer=new MutationObserver(function(){var d=currentData();if(d&&isTerminal(d.project&&d.project.status))applyPanel(d);});
observer.observe(document.documentElement,{childList:true,subtree:true});
window.PSTProjectTerminalTruth={isTerminal:isTerminal,stateFor:stateFor,refresh:refresh,installBoardGuard:installBoardGuard};
schedule(false);
})();
