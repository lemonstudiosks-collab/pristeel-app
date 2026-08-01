/* PRISTEEL Historical Project Audit: projekte të verifikuara nga historia e Gmail-it */
(function(){
'use strict';
if(window.__pstHistoricalProjectAuditLoaded)return;
window.__pstHistoricalProjectAuditLoaded=true;

var VERSION='20260801-1';
var STORE='pst_historical_project_audit_'+VERSION;
var RUN_EVERY=6*60*60*1000;
var running=false;

var CANDIDATES=[
  {
    key:'stacon-d22',name:'STACON – Erweiterung Logistik 3.+4. Ebene',client:'STACON',ref:'D-22/26',
    status:'Fituar',pipeline_stage:'execution',location:'Hamburg, DE',authoritative:true,
    aliases:['D-22/26','Auftrag 250919','Werkvertrag D-22/26','STACON Finkenwerder','Erweiterung Logistik 3 4 Ebene'],
    threads:['19ddcca8d5ba3124','19ef4c8cd18394ff','19f127fcfabb6503','19ef9d3d7794eea3']
  },
  {
    key:'stacon-d23',name:'STACON – Stahlbaupaket D-23/26',client:'STACON',ref:'D-23/26',
    status:'Në pritje',pipeline_stage:'offer',location:'Hamburg, DE',
    aliases:['D-23/26','STACON D-23/26','Stahlbaupaket D23'],threads:['19ddcd28f29d18ee']
  },
  {
    key:'evosys-8910',name:'EVOSYS – ANF-8910',client:'EVOSYS',ref:'ANF-8910',
    status:'Në pritje',pipeline_stage:'evaluation',location:'',
    aliases:['ANF-8910','EVOSYS 8910'],threads:['19ede49bb2d9937f','19ef4cbf94840ef4']
  },
  {
    key:'evosys-8915',name:'EVOSYS – ANF-8915',client:'EVOSYS',ref:'ANF-8915',
    status:'Në pritje',pipeline_stage:'evaluation',location:'',
    aliases:['ANF-8915','EVOSYS 8915'],threads:['19edf087ed2490ab','19ef4cbe5c9bfccb']
  },
  {
    key:'rsb-2540416',name:'RSB – Mercedes Sindelfingen, Brücke 30 Teil 1',client:'RSB',ref:'2540416',
    status:'Në pritje',pipeline_stage:'follow_up',location:'Sindelfingen, DE',
    aliases:['2540416','D-26/Sindelfingen-01','Mercedes Sindelfingen','BR 30 Teil 1'],
    threads:['19e8da9b462443e8','19ebbc36745677e8']
  },
  {
    key:'rsb-2540415',name:'RSB / Depenbrock – Hamburg CTB, Bühne 11',client:'RSB',ref:'2540415',
    status:'Në pritje',pipeline_stage:'follow_up',location:'Hamburg, DE',
    aliases:['2540415','PST-HH-001','D-25/Hamburg-02','Depenbrock Hamburg CTB','Bühne 11'],
    threads:['19e67fb5a714c8fd','19e8d764a6a44786','19f17a5c7b19badd','19ef981ed9dc4d4e']
  },
  {
    key:'geiger-110200063',name:'Geiger – Baubetriebshof Weil der Stadt, LV 0311',client:'Geiger Gruppe',ref:'110200063',
    status:'Në pritje',pipeline_stage:'follow_up',location:'Weil der Stadt, DE',
    aliases:['110200063','PST-GEI-001/26','Baubetriebshof Weil der Stadt','LV 0311 Schlosser'],
    threads:['19ecc3645b0d1ddf','19effd0ade3cf931','19ed59649731eb90','19ea0948f3add225']
  },
  {
    key:'ah36-netherlands',name:'De Jong & Lavino – AH36 Steel Plates, Netherlands',client:'De Jong & Lavino',ref:'',
    status:'Në pritje',pipeline_stage:'follow_up',location:'Netherlands',
    aliases:['AH36 773t','AH36 700t','Robert Pompen','De Jong Lavino'],
    threads:['19f5f3f7bfef63a7','19facd412a7bdbee']
  },
  {
    key:'tennet-bunt',name:'TenneT BUNT – Steel Structures',client:'SPIE',ref:'BUNT',
    status:'Në pritje',pipeline_stage:'evaluation',location:'Germany',
    aliases:['TenneT BUNT','BUNT Steel Structures','SPIE BUNT'],threads:['19fa8e136d17a99e']
  },
  {
    key:'camera-poles-albania',name:'Camera Poles – Albania',client:'',ref:'',
    status:'Në pritje',pipeline_stage:'procurement',location:'Albania',
    aliases:['Camera Poles','Shtylla kamerash','Biomek','Zincometal'],
    threads:['19df44cb05f86168','19cbe64dca43615e','19cbebb468df0e3d']
  }
];

var css=document.createElement('style');
css.id='pst-historical-audit-style';
css.textContent=`
.pha-card{position:relative;overflow:hidden;margin:0 0 16px;border:1px solid rgba(166,95,46,.16);border-radius:18px 18px 24px 14px;background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(249,244,239,.9));box-shadow:0 14px 38px rgba(46,37,31,.055);padding:15px 16px}
.pha-card:before{content:"";position:absolute;left:0;top:0;width:5px;height:100%;background:linear-gradient(180deg,#A65F2E,#D39A70)}
.pha-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}.pha-title{font-size:12.5px;font-weight:780;color:var(--text,#222)}.pha-sub{font-size:9.5px;line-height:1.55;color:var(--text3,#7A8086);margin-top:3px;max-width:760px}
.pha-actions{display:flex;gap:7px}.pha-btn{height:33px;border:1px solid var(--border2,#D9DDDF);border-radius:12px;background:#fff;color:var(--text2,#535A60);padding:0 12px;font-size:9.5px;font-weight:730;cursor:pointer}.pha-btn:hover{border-color:#A65F2E;color:#A65F2E}.pha-btn.primary{background:#A65F2E;border-color:#A65F2E;color:#fff}.pha-btn:disabled{opacity:.55;cursor:not-allowed}
.pha-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:12px}.pha-stat{background:rgba(255,255,255,.76);border:1px solid rgba(166,95,46,.09);border-radius:14px;padding:9px 11px}.pha-stat b{display:block;font-size:16px;color:#24282B}.pha-stat span{display:block;font-size:8.5px;color:var(--text3,#7A8086);margin-top:1px}.pha-note{font-size:9px;color:var(--text3,#7A8086);margin-top:9px}.pha-progress{height:4px;background:#ECEEEF;border-radius:5px;overflow:hidden;margin-top:9px;display:none}.pha-progress.on{display:block}.pha-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#A65F2E,#D39A70);transition:width .2s}
@media(max-width:760px){.pha-stats{grid-template-columns:repeat(2,1fr)}}
`;
document.head.appendChild(css);

function arr(v){return Array.isArray(v)?v:[]}
function enc(v){return encodeURIComponent(String(v==null?'':v))}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()}
function uniq(v){return arr(v).map(String).filter(function(x,i,a){return x&&a.indexOf(x)===i})}
function setNote(text,color){var e=document.getElementById('pha-note');if(e){e.textContent=text||'';e.style.color=color||'var(--text3,#7A8086)'}}
function progress(on,pct){var a=document.getElementById('pha-progress'),b=document.getElementById('pha-progress-fill');if(a)a.classList.toggle('on',!!on);if(b)b.style.width=Math.max(0,Math.min(100,Number(pct)||0))+'%'}
function busy(v){running=!!v;var b=document.getElementById('pha-run');if(b)b.disabled=!!v}
function showStats(s){['created','matched','linked','conflicts'].forEach(function(k){var e=document.getElementById('pha-'+k);if(e)e.textContent=String(Number(s&&s[k])||0)})}
function readStored(){try{return JSON.parse(localStorage.getItem(STORE)||'null')}catch(e){return null}}
function writeStored(v){try{localStorage.setItem(STORE,JSON.stringify(v))}catch(e){}}

function panel(){
  return '<div class="pha-card" id="pha-card"><div class="pha-top"><div><div class="pha-title">Audit historik i projekteve</div><div class="pha-sub">Rikthen projektet e verifikuara nga historia e Gmail-it, shmang dublimet dhe lidh thread-et me projektin e saktë. Lidhjet ekzistuese manuale nuk preken.</div></div><div class="pha-actions"><button class="pha-btn primary" id="pha-run" onclick="pstHistoricalProjectAuditRun(true)">Rifillo auditin</button></div></div><div class="pha-stats"><div class="pha-stat"><b id="pha-created">0</b><span>projekte të krijuara</span></div><div class="pha-stat"><b id="pha-matched">0</b><span>projekte të gjetura</span></div><div class="pha-stat"><b id="pha-linked">0</b><span>emaila të lidhur</span></div><div class="pha-stat"><b id="pha-conflicts">0</b><span>konflikte për kontroll</span></div></div><div class="pha-progress" id="pha-progress"><i id="pha-progress-fill"></i></div><div class="pha-note" id="pha-note">Gati për auditin historik.</div></div>'
}
function dashboardHost(){return document.querySelector('.pst-dash')||document.getElementById('pst-v2-dashboard')||document.getElementById('page-home')||document.querySelector('.content')}
function inject(){
  if(document.getElementById('pha-card'))return true;
  var h=dashboardHost();if(!h)return false;
  var holder=document.createElement('div');holder.innerHTML=panel();var card=holder.firstChild;
  var head=h.querySelector('.pst-dash-head');
  if(head&&head.nextSibling)h.insertBefore(card,head.nextSibling);else h.insertBefore(card,h.firstChild);
  var old=readStored();if(old){showStats(old);setNote(old.note||('Auditi i fundit: '+new Date(old.at).toLocaleString('sq-AL')),old.error?'#A64B42':'#2F7657')}
  return true
}

async function loadProjects(){return arr(await supaFetch('projects?select=id,name,client,ref,status,location,pipeline_stage,created_at&order=created_at.desc&limit=5000'))}
function exactRef(p,c){var r=norm(p.ref);return !!(r&&c.ref&&r===norm(c.ref))}
function candidateScore(p,c){
  if(exactRef(p,c))return 1000;
  var pn=norm(p.name),pc=norm(p.client),cn=norm(c.name),cc=norm(c.client),score=0;
  if(pn&&cn&&pn===cn)score+=500;
  else if(pn&&cn&&(pn.indexOf(cn)>-1||cn.indexOf(pn)>-1))score+=250;
  arr(c.aliases).forEach(function(a){var x=norm(a);if(!x)return;if((pn&&pn.indexOf(x)>-1)||(richer(p).indexOf(x)>-1))score+=180});
  if(cc&&pc&&cc===pc)score+=80;
  if(c.ref&&richer(p).indexOf(norm(c.ref))>-1)score+=360;
  return score
}
function richer(p){return norm((p.name||'')+' '+(p.client||'')+' '+(p.ref||'')+' '+(p.location||''))}
function findProject(list,c){
  var ranked=arr(list).map(function(p){return{p:p,s:candidateScore(p,c)}}).sort(function(a,b){return b.s-a.s});
  return ranked[0]&&ranked[0].s>=260?ranked[0].p:null
}
function createPayload(c){return{name:c.name,client:c.client||'',ref:c.ref||'',status:c.status||'Në pritje',pipeline_stage:c.pipeline_stage||'evaluation',location:c.location||''}}
async function createProject(c){
  var r=await supaFetch('projects','POST',createPayload(c));
  var p=arr(r)[0]||r;if(!p||!p.id){var rows=await loadProjects();p=findProject(rows,c)}
  if(!p||!p.id)throw new Error('Projekti u krijua, por ID-ja nuk u kthye.');
  return p
}
async function updateProject(p,c){
  var patch={},changed=false;
  ['client','ref','location'].forEach(function(k){if(!String(p[k]||'').trim()&&String(c[k]||'').trim()){patch[k]=c[k];changed=true}});
  if(!String(p.pipeline_stage||'').trim()&&c.pipeline_stage){patch.pipeline_stage=c.pipeline_stage;changed=true}
  if(!String(p.status||'').trim()&&c.status){patch.status=c.status;changed=true}
  if(c.authoritative){
    if(p.pipeline_stage!=='execution'){patch.pipeline_stage='execution';changed=true}
    if(p.status!=='Fituar'){patch.status='Fituar';changed=true}
  }
  if(changed){patch.updated_at=new Date().toISOString();await supaFetch('projects?id=eq.'+enc(p.id),'PATCH',patch);Object.assign(p,patch)}
  return p
}
async function rowsForThread(tid){try{return arr(await supaFetch('project_emails?select=id,gmail_message_id,gmail_thread_id,project_id,match_method&gmail_thread_id=eq.'+enc(tid)+'&limit=1000'))}catch(e){return[]}}
async function linkThread(pid,tid,stats){
  var rows=await rowsForThread(tid);
  for(var i=0;i<rows.length;i++){
    var r=rows[i],method=String(r.match_method||'').toLowerCase(),existing=String(r.project_id||'');
    if(method.indexOf('manual')===0&&existing!==String(pid)){stats.conflicts++;continue}
    if(existing&&existing!==String(pid)){stats.conflicts++;continue}
    if(existing===String(pid)){stats.linked++;continue}
    try{
      await supaFetch('project_emails?id=eq.'+enc(r.id),'PATCH',{project_id:pid,suggested_project_id:pid,match_method:'historical-reviewed',match_confidence:100,needs_review:false,review_reason:null,updated_at:new Date().toISOString()});
      try{await supaFetch('project_email_links?on_conflict=project_email_id,project_id','POST',{project_email_id:r.id,project_id:pid,gmail_message_id:r.gmail_message_id||null,gmail_thread_id:r.gmail_thread_id||tid,link_method:'historical-reviewed',confidence:100,updated_at:new Date().toISOString()})}catch(e){}
      stats.linked++
    }catch(e){if(method.indexOf('manual')===0)stats.conflicts++}
  }
}
async function refreshUi(){
  var fns=['pstV2RefreshDashboard','loadProjects','renderProjects','loadAll'];
  for(var i=0;i<fns.length;i++)if(typeof window[fns[i]]==='function')try{await window[fns[i]]()}catch(e){}
  try{document.dispatchEvent(new CustomEvent('pst:projects-updated'))}catch(e){}
}

async function run(manual){
  if(running)return;
  if(typeof window.supaFetch!=='function'){setNote('Platforma ende nuk është lidhur me databazën. Auditi do të provojë përsëri.','#9B6A22');return}
  busy(true);progress(true,2);setNote('Po krahasohen projektet e verifikuara me databazën…');
  var stats={at:new Date().toISOString(),version:VERSION,created:0,matched:0,linked:0,conflicts:0,projects:[],error:false,note:''};
  try{
    var projects=await loadProjects();
    for(var i=0;i<CANDIDATES.length;i++){
      var c=CANDIDATES[i];progress(true,5+Math.round(i/CANDIDATES.length*78));setNote('Po përpunohet: '+c.name);
      var p=findProject(projects,c);
      if(p){stats.matched++;p=await updateProject(p,c)}else{p=await createProject(c);projects.push(p);stats.created++}
      stats.projects.push({key:c.key,id:p.id,name:p.name,created:!findProject(projects.filter(function(x){return String(x.id)!==String(p.id)}),c)});
      for(var j=0;j<c.threads.length;j++)await linkThread(p.id,c.threads[j],stats);
      if(typeof window.pstSyncProjectContacts==='function')try{await window.pstSyncProjectContacts(p.id)}catch(e){}
    }
    progress(true,92);await refreshUi();
    stats.note='Auditi përfundoi: '+stats.created+' projekte u krijuan, '+stats.matched+' u gjetën dhe '+stats.linked+' emaila u lidhën.';
    writeStored(stats);showStats(stats);setNote(stats.note,'#2F7657');progress(false,100)
  }catch(e){
    stats.error=true;stats.note='Auditi u ndërpre: '+e.message;writeStored(stats);showStats(stats);setNote(stats.note,'#A64B42');progress(false,0)
  }finally{busy(false)}
}
window.pstHistoricalProjectAuditRun=function(){run(true)};
window.PSTHistoricalProjectAudit={run:run,candidates:CANDIDATES,version:VERSION};

function autoRun(){
  var old=readStored(),last=old&&Date.parse(old.at||'')||0;
  if(!old||old.version!==VERSION||old.error||Date.now()-last>RUN_EVERY)setTimeout(function(){run(false)},1200)
}
function init(){
  var tries=0,t=setInterval(function(){
    var ok=inject();
    if(ok&&typeof window.supaFetch==='function'){clearInterval(t);autoRun()}
    else if(++tries>160)clearInterval(t)
  },300)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,700)});else setTimeout(init,700)
})();
