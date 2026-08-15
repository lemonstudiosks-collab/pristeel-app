/* PRISTEEL Project Intelligence conversation v1
 * Conversational, read-only extension of the existing Project Intelligence brief.
 * Uses the latest saved analysis plus current project data already loaded by PPPP.
 * AI is called only after an explicit user question. No email, task, project, status or database writes.
 */
(function(){
'use strict';
if(window.__pstProjectIntelligenceConversationV1)return;
window.__pstProjectIntelligenceConversationV1=true;

var sessions={};
var MAX_TURNS=10;

function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v==null?'':v);}
function enc(v){return encodeURIComponent(str(v));}
function esc(v){return str(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function activeId(id){return str(id||window.__pstCurrentProjectId||window._curProjId||(window.__pstIntegrityLastData&&window.__pstIntegrityLastData.project&&window.__pstIntegrityLastData.project.id)||'').trim();}
function session(pid){pid=activeId(pid);if(!sessions[pid])sessions[pid]={turns:[],busy:false};return sessions[pid];}
function sameProjectData(pid){var d=window.__pstIntegrityLastData,p=d&&d.project;return p&&str(p.id)===str(pid)?d:null;}
function cap(v,n){var s=str(v).replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n)+'…':s;}
function pick(row,keys){var out={};keys.forEach(function(k){if(row&&row[k]!=null&&str(row[k]).trim()!=='')out[k]=row[k];});return out;}
function slim(rows,keys,limit){return arr(rows).slice(0,limit).map(function(r){return pick(r,keys);});}
async function safe(path){try{return arr(await window.supaFetch(path));}catch(e){return[];}}

async function latestAnalysis(pid){
  var rows=await safe('project_analyses?project_id=eq.'+enc(pid)+'&order=created_at.desc&limit=1');
  if(rows[0])return rows[0];
  try{return JSON.parse(localStorage.getItem('pst_project_analysis_'+pid)||'null');}catch(e){return null;}
}
async function context(pid){
  var d=sameProjectData(pid)||{},p=d.project||{},rec=await latestAnalysis(pid),tasks=await safe('tasks?project_id=eq.'+enc(pid)+'&select=id,title,status,due_date,priority,detail,category,source&order=due_date.asc&limit=250');
  return{
    project:pick(p,['id','name','client','ref','reference','location','status','pipeline_stage','deal_type','deadline','created_at','updated_at','drive_folder_id']),
    analysis:rec?{created_at:rec.created_at,engine:rec.engine,model:rec.model,analysis:rec.analysis,source_manifest:rec.source_manifest,source_counts:rec.source_counts}:null,
    current:{
      deal:pick(d.deal||{},['amount','stage','status','currency','updated_at']),
      open_tasks:tasks.filter(function(t){return !/done|closed|mbyll|complete|kryer|arkiv|cancel|resolved/i.test(str(t&&t.status));}).slice(0,40),
      emails:slim(d.emails,['subject','sent_at','direction','from_name','from_email','to_emails','snippet','needs_review'],35),
      contacts:slim(d.contacts,['person','name','email','company','role','phone','last_seen'],35),
      files:slim(d.files,['name','mimeType','modifiedTime','webViewLink','size'],45),
      bom:slim(d.bom,['description','name','profile','material','grade','quantity','qty','unit','weight','total_weight'],120),
      rfqs:slim(d.rfqs,['rfq_ref','supplier','supplier_name','supplier_email','status','sent_at','deadline','created_at'],45),
      supplier_offers:slim(d.supplierOffers,['supplier','supplier_name','currency','total','total_amount','total_price','status','created_at','valid_until'],45),
      our_offers:slim(d.ourOffers,['offer_no','reference','currency','total','total_amount','total_price','status','created_at','valid_until'],25),
      invoices_out:slim(d.invoicesOut,['invoice_no','number','currency','amount','total','status','due_date','created_at'],25),
      invoices_in:slim(d.invoicesIn,['invoice_no','number','supplier','currency','amount','total','status','due_date','created_at'],25),
      adjustments:slim(d.adjustments,['type','currency','amount','reason','created_at'],20),
      guarantees:slim(d.guarantees,['type','amount','currency','status','expiry_date','created_at'],20)
    }
  };
}
function allowedSources(ctx){var ids=arr(ctx&&ctx.analysis&&ctx.analysis.source_manifest).map(function(x){return str(x&&x.id);}).filter(Boolean);ids.unshift('CURRENT');return ids;}
function historyMessages(s){var turns=s.turns.slice(-8),out=[];turns.forEach(function(t){out.push({role:t.role,content:cap(t.content,5000)});});return out;}
function responseText(r){var parts=[str(r&&r.answer).trim()];if(r&&r.uncertainty)parts.push('Pasiguri: '+str(r.uncertainty).trim());if(r&&r.suggested_next_step)parts.push('Une do te beja: '+str(r.suggested_next_step).trim());return parts.filter(Boolean).join('\n\n');}
async function askAi(pid,question){
  var ai=window.PSTAI;if(!ai||typeof ai.hasApiKey!=='function'||typeof ai.requestJson!=='function'||!ai.hasApiKey())throw new Error('AI API Key nuk eshte konfiguruar te Cilesimet.');
  var ctx=await context(pid),ids=allowedSources(ctx),s=session(pid),allowed={};ids.forEach(function(id){allowed[id]=1;});
  var shape={answer:'',confidence:'high|medium|low',evidence:[{source_id:'CURRENT or an allowed source id',reason:''}],uncertainty:'',suggested_next_step:'',follow_up:''};
  var system='Je PPPP, bashkepunetor i larte i PRISTEEL per prokurim dhe projekte celiku. Bisedo natyrshem me perdoruesin, si koleg qe e njeh projektin, jo si raport automatik. Jep pergjigjen kryesore drejtperdrejt. Shpjego arsyetimin me fakte, dallo faktin nga interpretimi dhe thuaj qarte kur dicka nuk dihet. Mos shpik scope, sasi, cmime, afate, kontakte, kerkesa, vendime apo ngjarje. Perdori vetem te dhenat e dhena. Kur perdor analizen ekzistuese, respekto source_ids e saj. CURRENT do te thote te dhenat aktuale te PPPP. Mos pretendo se ke derguar email, krijuar task, ndryshuar status, krijuar projekt apo bere ndonje veprim; kjo bisede eshte vetem read-only dhe mund te propozoje veprime. Pergjigju ne te njejten gjuhe si pyetja; nese eshte e paqarte, perdor shqip. Mbaje tonin profesional, conversational dhe konkret. Kthe vetem JSON sipas formes se kerkuar.';
  var prompt='PYETJA E PERDORUESIT:\n'+question+'\n\nBURIMET E LEJUARA PER EVIDENCE:\n'+ids.join(', ')+'\n\nKONTEKSTI AKTUAL I PROJEKTIT:\n'+JSON.stringify(ctx)+'\n\nKthe vetem JSON ne kete forme:\n'+JSON.stringify(shape)+'\n\nRregulla shtese: evidence duhet te kete 0-4 pika dhe source_id duhet te jete vetem CURRENT ose nje ID nga lista e lejuar. Nese nuk ka baze te mjaftueshme, thuaje qarte ne answer/uncertainty ne vend se te hamendesosh. suggested_next_step dhe follow_up mund te jene bosh.';
  var out=await ai.requestJson({messages:[{role:'system',content:system}].concat(historyMessages(s),[{role:'user',content:prompt}]),temperature:0.15,max_tokens:2600,response_format:{type:'json_object'}});out=out&&typeof out==='object'?out:{};out.evidence=arr(out.evidence).filter(function(e){return e&&allowed[str(e.source_id)];}).slice(0,4);return out;
}

function ensureCss(){if(document.getElementById('pst-pic-css'))return;var css=document.createElement('style');css.id='pst-pic-css';css.textContent=`
.pst-pic{margin:22px 0 6px;border-top:1px solid #DCE7EA;padding-top:18px}.pst-pic-hd{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.pst-pic-kicker{font-size:8px;letter-spacing:.85px;font-weight:850;color:#315F72;text-transform:uppercase}.pst-pic-title{font-size:16px;font-weight:800;color:#273A42;margin-top:3px}.pst-pic-sub{font-size:9.5px;color:#73858C;line-height:1.5;margin-top:3px;max-width:760px}.pst-pic-clear{border:1px solid #D7E3E7;background:#fff;color:#60747C;border-radius:8px;padding:7px 9px;font-size:8px;font-weight:750;cursor:pointer}.pst-pic-log{display:flex;flex-direction:column;gap:10px;max-height:460px;overflow:auto;padding:4px 2px 10px}.pst-pic-row{display:flex}.pst-pic-row.user{justify-content:flex-end}.pst-pic-bubble{max-width:min(820px,88%);border-radius:14px;padding:11px 13px;font-size:11.5px;line-height:1.62;white-space:pre-wrap}.pst-pic-row.assistant .pst-pic-bubble{background:#fff;border:1px solid #DCE7EA;color:#33474F}.pst-pic-row.user .pst-pic-bubble{background:#315F72;color:#fff}.pst-pic-welcome{background:#EEF6F8!important;border-color:#D0E3E9!important}.pst-pic-meta{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.pst-pic-chip{font-size:7.5px;font-weight:750;border-radius:10px;padding:3px 6px;background:#EDF2F4;color:#60747C}.pst-pic-why{font-size:8px;color:#7B8A90;margin-top:5px}.pst-pic-prompts{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px}.pst-pic-prompt{border:1px solid #D7E3E7;background:#fff;color:#46616C;border-radius:999px;padding:7px 10px;font-size:8.5px;font-weight:700;cursor:pointer}.pst-pic-prompt:hover{border-color:#9DBAC5;background:#F4F9FA}.pst-pic-compose{display:flex;align-items:flex-end;gap:8px;border:1px solid #CBDDE3;background:#fff;border-radius:12px;padding:8px}.pst-pic-input{flex:1;resize:vertical;min-height:42px;max-height:130px;border:0;outline:0;background:transparent;color:#263940;font:inherit;font-size:11px;line-height:1.5;padding:4px}.pst-pic-send{border:0;border-radius:9px;background:#315F72;color:#fff;padding:10px 14px;font-size:9px;font-weight:800;cursor:pointer;white-space:nowrap}.pst-pic-send:disabled,.pst-pic-input:disabled{opacity:.55;cursor:not-allowed}.pst-pic-state{min-height:16px;font-size:8.5px;color:#778A91;margin-top:6px;padding-left:3px}.pst-pic-state.err{color:#A64B42}@media(max-width:700px){.pst-pic-bubble{max-width:95%}.pst-pic-compose{display:block}.pst-pic-send{width:100%;margin-top:6px}.pst-pic-hd{display:block}.pst-pic-clear{margin-top:8px}}
`;document.head.appendChild(css);}
function section(pid){return '<section class="pst-pic" id="pst-pic-'+esc(pid)+'" data-project-id="'+esc(pid)+'"><div class="pst-pic-hd"><div><div class="pst-pic-kicker">PPPP Conversation</div><div class="pst-pic-title">Bisedo me projektin</div><div class="pst-pic-sub">Pyet lirshem. PPPP perdor brief-in ekzistues dhe te dhenat aktuale te projektit, dhe duhet te te thote edhe kur nuk ka evidence te mjaftueshme.</div></div><button type="button" class="pst-pic-clear">Pastro biseden</button></div><div class="pst-pic-log"></div><div class="pst-pic-prompts"><button type="button" class="pst-pic-prompt">Cka po ndodh realisht ketu?</button><button type="button" class="pst-pic-prompt">Ku e sheh rrezikun me te madh?</button><button type="button" class="pst-pic-prompt">Cka do te beje ti tani?</button><button type="button" class="pst-pic-prompt">A kemi informacion te mjaftueshem?</button></div><div class="pst-pic-compose"><textarea class="pst-pic-input" rows="2" placeholder="Pyet PPPP per kete projekt…"></textarea><button type="button" class="pst-pic-send">Pyet PPPP</button></div><div class="pst-pic-state"></div></section>';}
function render(pid){var root=document.getElementById('pst-pic-'+pid);if(!root)return;var s=session(pid),log=root.querySelector('.pst-pic-log'),html='<div class="pst-pic-row assistant"><div class="pst-pic-bubble pst-pic-welcome">E kam brief-in e projektit dhe gjendjen aktuale te PPPP. Me pyet lirshem per situaten, rrezikun, vendimet ose hapin e ardhshem.</div></div>';
  s.turns.forEach(function(t){var r=t.result||null;html+='<div class="pst-pic-row '+(t.role==='user'?'user':'assistant')+'"><div class="pst-pic-bubble">'+esc(t.content)+(r&&arr(r.evidence).length?'<div class="pst-pic-meta">'+arr(r.evidence).slice(0,4).map(function(e){return '<span class="pst-pic-chip">'+esc(e.source_id||'evidence')+'</span>';}).join('')+'</div>'+arr(r.evidence).slice(0,2).map(function(e){return e.reason?'<div class="pst-pic-why">'+esc(e.reason)+'</div>':'';}).join(''):'')+(r&&r.follow_up?'<div class="pst-pic-why">'+esc(r.follow_up)+'</div>':'')+'</div></div>';});
  log.innerHTML=html;log.scrollTop=log.scrollHeight;var input=root.querySelector('.pst-pic-input'),send=root.querySelector('.pst-pic-send');input.disabled=!!s.busy;send.disabled=!!s.busy;send.textContent=s.busy?'Po mendoj…':'Pyet PPPP';}
function setState(pid,text,err){var root=document.getElementById('pst-pic-'+pid),e=root&&root.querySelector('.pst-pic-state');if(!e)return;e.textContent=text||'';e.className='pst-pic-state'+(err?' err':'');}
async function ask(pid,question){pid=activeId(pid);question=str(question).trim();if(!pid||!question)return null;var s=session(pid);if(s.busy)return null;s.busy=true;s.turns.push({role:'user',content:question});if(s.turns.length>MAX_TURNS*2)s.turns=s.turns.slice(-MAX_TURNS*2);render(pid);setState(pid,'Po e lidh pyetjen me brief-in dhe te dhenat aktuale te projektit…',false);
  try{var r=await askAi(pid,question);var text=responseText(r)||'Nuk mora nje pergjigje te perdorshme nga AI.';s.turns.push({role:'assistant',content:text,result:r});setState(pid,'',false);return r;}
  catch(e){var msg=str(e&&e.message||e);s.turns.push({role:'assistant',content:'Nuk mund ta vazhdoj biseden semantike tani. '+msg});setState(pid,msg,true);return null;}
  finally{s.busy=false;render(pid);}
}
function clear(pid){pid=activeId(pid);sessions[pid]={turns:[],busy:false};render(pid);setState(pid,'Biseda u pastrua vetem nga ky sesion. Analiza e projektit nuk u ndryshua.',false);}
function bind(pid){var root=document.getElementById('pst-pic-'+pid);if(!root||root.dataset.bound==='1')return;root.dataset.bound='1';var input=root.querySelector('.pst-pic-input'),send=root.querySelector('.pst-pic-send'),clearBtn=root.querySelector('.pst-pic-clear');send.onclick=function(){var q=input.value.trim();if(!q)return;input.value='';ask(pid,q);};input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send.click();}});clearBtn.onclick=function(){clear(pid);};Array.prototype.slice.call(root.querySelectorAll('.pst-pic-prompt')).forEach(function(btn){btn.onclick=function(){input.value=str(btn.textContent).trim();send.click();};});}
function mount(pid){pid=activeId(pid);if(!pid)return false;ensureCss();var bg=document.getElementById('pst-project-summary-bg'),wrap=bg&&bg.querySelector('.pst-ps-wrap'),analysis=document.getElementById('pai-'+pid);if(!wrap||!analysis)return false;var root=document.getElementById('pst-pic-'+pid);if(!root){var holder=document.createElement('div');holder.innerHTML=section(pid);root=holder.firstChild;if(analysis.nextSibling)analysis.parentNode.insertBefore(root,analysis.nextSibling);else analysis.parentNode.appendChild(root);}bind(pid);render(pid);return true;}
function scheduleMount(pid){[0,120,450].forEach(function(ms){setTimeout(function(){mount(pid);},ms);});}
document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('[data-pst-project-summary]');if(b)scheduleMount(activeId());},true);
document.addEventListener('pst:modules-ready',function(){if(document.getElementById('pst-project-summary-bg'))scheduleMount(activeId());},{once:true});

window.PSTProjectIntelligenceConversationV1={mount:mount,ask:ask,clear:clear,_test:{context:context,allowedSources:allowedSources,responseText:responseText,session:session}};
})();