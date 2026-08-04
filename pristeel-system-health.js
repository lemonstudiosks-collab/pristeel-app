/* PRISTEEL system health
 * Bounded checks for core tables, Gmail configuration, HubSpot mirrors and functions.
 */
(function(){
'use strict';
if(window.__pstSystemHealthLoaded)return;
window.__pstSystemHealthLoaded=true;
var API=window.PSTSystemHealth=window.PSTSystemHealth||{};API.last=null;API.running=null;
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function bounded(p,ms,label){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(done)return;done=true;reject(new Error((label||'Kërkesa')+' nuk u përgjigj.'));},ms||4500);Promise.resolve(p).then(function(x){if(done)return;done=true;clearTimeout(t);resolve(x);},function(e){if(done)return;done=true;clearTimeout(t);reject(e);});});}
async function table(name){try{if(typeof window.supaFetch!=='function')throw new Error('supaFetch mungon');var r=await bounded(window.supaFetch(name+'?select=*&limit=1'),4500,name);return{name:name,status:'ok',detail:Array.isArray(r)&&r.length?'Tabela përgjigjet dhe ka të dhëna.':'Tabela përgjigjet, por nuk ka rreshta.'};}catch(e){return{name:name,status:'error',detail:e.message||String(e)};}}
function fn(name){return{name:name,status:typeof window[name]==='function'?'ok':'error',detail:typeof window[name]==='function'?'Funksioni është aktiv.':'Funksioni mungon.'};}
function integrationChecks(results){
 var cid='';try{cid=localStorage.getItem('pristeel_gclient')||'';}catch(e){}
 results.push({name:'Gmail core',status:window.PSTEmail&&typeof window.PSTEmail.gmail==='function'?'ok':'error',detail:window.PSTEmail?'Moduli Gmail është ngarkuar.':'Moduli Gmail mungon.'});
 results.push({name:'Google Client ID',status:cid?'ok':'warn',detail:cid?'Konfigurimi Google ekziston.':'Google Client ID nuk është ruajtur në Cilësime.'});
 var token=window.PSTEmail&&window.PSTEmail.token&&Date.now()<Number(window.PSTEmail.tokenExp||0);
 results.push({name:'Sesioni Gmail',status:token?'ok':'warn',detail:token?'Tokeni Gmail është aktiv.':'Gmail mund të kërkojë autorizim kur lexohen attachment-et.'});
}
function addCss(){if(document.getElementById('pst-health-css'))return;var s=document.createElement('style');s.id='pst-health-css';s.textContent=`
#pst-health-banner{margin:0 0 14px;padding:10px 13px;border:1px solid #E4B9B4;border-radius:11px;background:#FFF7F6;color:#873D35;font-size:10px;display:flex;align-items:center;justify-content:space-between;gap:10px}#pst-health-banner button,.ph-btn{height:29px;border:1px solid #D9E3E7;border-radius:8px;background:#fff;color:#56636A;padding:0 10px;font-size:9px;font-weight:730;cursor:pointer}.ph-bg{position:fixed;inset:0;z-index:7000;background:rgba(25,34,39,.48);display:flex;align-items:center;justify-content:center;padding:20px}.ph-modal{width:min(760px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(20,30,35,.28)}.ph-head{display:flex;justify-content:space-between;gap:12px;padding:17px 19px;border-bottom:1px solid #E7ECEE}.ph-title{font-size:15px;font-weight:780}.ph-sub{font-size:9.5px;color:#829097;margin-top:3px}.ph-body{padding:13px 19px}.ph-row{display:grid;grid-template-columns:170px 70px minmax(0,1fr);gap:10px;padding:9px 0;border-bottom:1px solid #EDF1F2;font-size:10px}.ph-row:last-child{border-bottom:0}.ph-status{font-weight:780}.ph-status.ok{color:#2F7657}.ph-status.warn{color:#9B6A22}.ph-status.error{color:#A64B42}.ph-foot{display:flex;justify-content:flex-end;gap:8px;padding:13px 19px;border-top:1px solid #E7ECEE}@media(max-width:650px){.ph-row{grid-template-columns:1fr}.ph-row div:nth-child(2){margin-top:-5px}}
`;document.head.appendChild(s);}
function banner(report){
 var old=document.getElementById('pst-health-banner');if(old)old.remove();
 var errors=report.results.filter(function(x){return x.status==='error';}),warns=report.results.filter(function(x){return x.status==='warn';});if(!errors.length&&!warns.length)return;
 var content=document.querySelector('.content'),active=document.querySelector('.page.active');if(!content)return;var target=active||content;
 var b=document.createElement('div');b.id='pst-health-banner';b.innerHTML='<span><b>Kontrolli i platformës:</b> '+errors.length+' gabime dhe '+warns.length+' paralajmërime.</span><button type="button" onclick="PSTSystemHealth.open()">Shiko detajet</button>';
 target.insertBefore(b,target.firstChild);
}
API.open=function(){
 addCss();var r=API.last;if(!r)return;var old=document.getElementById('pst-health-modal');if(old)old.remove();var bg=document.createElement('div');bg.id='pst-health-modal';bg.className='ph-bg';
 bg.innerHTML='<div class="ph-modal"><div class="ph-head"><div><div class="ph-title">Gjendja e platformës</div><div class="ph-sub">Kontrolli i fundit: '+new Date(r.at).toLocaleString('sq-AL')+'</div></div><button class="ph-btn" onclick="document.getElementById(\'pst-health-modal\').remove()">Mbyll</button></div><div class="ph-body">'+r.results.map(function(x){return'<div class="ph-row"><b>'+esc(x.name)+'</b><div class="ph-status '+x.status+'">'+(x.status==='ok'?'Në rregull':x.status==='warn'?'Kujdes':'Gabim')+'</div><div>'+esc(x.detail)+'</div></div>';}).join('')+'</div><div class="ph-foot"><button class="ph-btn" onclick="PSTSystemHealth.run(true)">Kontrollo përsëri</button></div></div>';
 document.body.appendChild(bg);bg.onclick=function(e){if(e.target===bg)bg.remove();};
};
API.run=function(show){
 if(API.running)return API.running;
 API.running=(async function(){
  addCss();var names=['projects','project_emails','project_email_links','documents_registry','invoices_out','invoices_in','commercial_adjustments','offers','rfq_log','bom_items','tasks','files','contracts','crm_deals','crm_contacts','crm_companies'],results=[];
  for(var i=0;i<names.length;i+=4){var part=await Promise.all(names.slice(i,i+4).map(table));results=results.concat(part);await new Promise(function(r){setTimeout(r,25);});}
  ['pstWorkspaceGo','pstReleaseOpenProject','pstOpenProjectWorkspace','pstOpenDocumentCenter','pstWsCreate','pstImportProjectEmailFiles','pstProjectFamilyRefresh','pstProjectGmailDocumentsRefresh'].forEach(function(x){results.push(fn(x));});
  integrationChecks(results);
  var hub=results.filter(function(x){return ['crm_deals','crm_contacts','crm_companies'].indexOf(x.name)>-1;});
  if(hub.every(function(x){return x.status==='ok'&&x.detail.indexOf('nuk ka rreshta')>-1;}))results.push({name:'HubSpot sync',status:'warn',detail:'Tabelat CRM ekzistojnë, por nuk u gjetën të dhëna. Tokeni ose sinkronizimi në Apps Script duhet kontrolluar.'});
  else if(hub.some(function(x){return x.status==='error';}))results.push({name:'HubSpot sync',status:'error',detail:'Një ose më shumë tabela CRM nuk përgjigjen.'});
  else results.push({name:'HubSpot sync',status:'ok',detail:'Tabelat CRM përgjigjen dhe të paktën njëra ka të dhëna.'});
  API.last={at:Date.now(),results:results};try{sessionStorage.setItem('pst_system_health_v1',JSON.stringify(API.last));}catch(e){}
  banner(API.last);if(show)API.open();console.info('PRISTEEL system health',API.last);return API.last;
 })().finally(function(){API.running=null;});return API.running;
};
setTimeout(function(){API.run(false);},3500);
})();