/* PRISTEEL OpenAI Operating Assistant v1
 * Read-only OpenAI/ChatGPT-class reasoning layer for PPPP.
 * Uses the authenticated Supabase Edge Function pppp-openai-assistant.
 * Adds one compact Home command bar and upgrades the existing project conversation
 * transport without creating a second workflow engine.
 * No database writes, outbound communication, commercial approvals or status changes.
 */
(function(){
'use strict';
if(window.__pstOpenAIOperatingAssistantV1)return;
window.__pstOpenAIOperatingAssistantV1=true;

var state={busy:false,last:null,question:''};
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function A(v){return Array.isArray(v)?v:[];}
function activeHome(){var p=document.getElementById('page-workspace-home');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function activeProjectId(root){return S(root&&root.getAttribute('data-project-id')||window.__pstCurrentProjectId||window._curProjId).trim();}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edgeRequest(payload){
  var base=S(window._SB_URL).replace(/\/$/,'');
  var key=S(window._SB_KEY);
  if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
  var s=sessionNow();
  if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();
  var token=s&&s.access_token?s.access_token:'';
  if(!token)throw new Error('Sesioni ka skaduar. Hyr përsëri në PPPP.');
  async function run(access){
    return fetch(base+'/functions/v1/pppp-openai-assistant',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  }
  var res=await run(token);
  if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}
  var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){data=null;}
  if(!res.ok||!data||data.ok===false){var msg=data&&(data.message||data.error);throw new Error(S(msg||('Assistant HTTP '+res.status)).slice(0,700));}
  return data;
}
async function ask(question,options){
  question=S(question).trim();if(!question)throw new Error('Shkruaj pyetjen.');
  options=options||{};
  var payload={question:question,scope:options.scope==='project'?'project':'global'};
  if(options.project_id)payload.project_id=options.project_id;
  if(options.project_name)payload.project_name=options.project_name;
  if(options.project_ref)payload.project_ref=options.project_ref;
  if(options.context&&typeof options.context==='object')payload.context=options.context;
  return edgeRequest(payload);
}
function installBridge(){var b=window.PSTProjectContextBridge||{};b.ask=ask;b.assistant='pppp-openai-assistant';b.assistant_read_only=true;window.PSTProjectContextBridge=b;}
function navigate(result){var n=result&&result.navigation,pid=S(n&&n.project_id).trim();if(!pid)return false;try{var r=window.pstOpenProjectWorkspace&&window.pstOpenProjectWorkspace(pid);Promise.resolve(r).then(function(){var area=S(n&&n.area);if(area&&window.PSTCanonicalProjectWorkflowV1&&typeof window.PSTCanonicalProjectWorkflowV1.render==='function')setTimeout(function(){window.PSTCanonicalProjectWorkflowV1.render(area);},80);});return !!r||typeof window.pstOpenProjectWorkspace==='function';}catch(e){return false;}}
function answerHtml(r){
  if(!r)return'';
  var out='<div class="pst-ai-answer">'+E(r.answer||'').replace(/\n/g,'<br>')+'</div>';
  if(r.suggested_next_step)out+='<div class="pst-ai-next"><b>Hapi i radhës</b><span>'+E(r.suggested_next_step)+'</span></div>';
  if(r.uncertainty)out+='<div class="pst-ai-uncertainty">'+E(r.uncertainty)+'</div>';
  var n=r.navigation||{};if(n.project_id)out+='<button type="button" class="pst-ai-open" data-pst-ai-open="1">Hap '+E(n.project_name||'projektin')+' →</button>';
  var ev=A(r.evidence);if(ev.length)out+='<details class="pst-ai-evidence"><summary>Burimet që përdora ('+ev.length+')</summary><div>'+ev.map(function(x){return'<p><b>'+E(x.source||'PPPP')+'</b><span>'+E(x.reason||'')+'</span></p>';}).join('')+'</div></details>';
  return out;
}
function host(){
  var page=document.getElementById('page-workspace-home');if(!page||!activeHome())return null;
  var h=document.getElementById('pst-openai-assistant-v1');if(h)return h;
  h=document.createElement('section');h.id='pst-openai-assistant-v1';h.className='pst-ai-command';
  h.innerHTML='<div class="pst-ai-title"><span>PPPP AI</span><b>Pyete platformën</b><small>Projektet, emailat, ofertat dhe hapat e ardhshëm, pa kërkuar nëpër faqe.</small></div><form class="pst-ai-form"><textarea rows="1" class="pst-ai-input" aria-label="Pyet PPPP" placeholder="P.sh. Çfarë mungon te SSP? Cili projekt kërkon veprim? Çfarë kemi nga SPIE?"></textarea><button type="submit" class="pst-ai-send" aria-label="Dërgo pyetjen">↑</button></form><div class="pst-ai-state" aria-live="polite"></div><div class="pst-ai-result" hidden></div>';
  var operating=document.getElementById('pst-operating-home-v2');
  if(operating&&operating.parentNode)operating.parentNode.insertBefore(h,operating);else{var search=document.getElementById('pst-bcc')||page.querySelector('.pst-ws-search,.pst-bcc');if(search&&search.parentNode)search.insertAdjacentElement('afterend',h);else{var head=page.querySelector('.pst-ws-head');if(head)head.insertAdjacentElement('afterend',h);else page.prepend(h);}}
  bindHost(h);return h;
}
function renderHome(){var h=host();if(!h)return false;var input=h.querySelector('.pst-ai-input'),send=h.querySelector('.pst-ai-send'),st=h.querySelector('.pst-ai-state'),result=h.querySelector('.pst-ai-result');if(input)input.disabled=state.busy;if(send){send.disabled=state.busy;send.textContent=state.busy?'…':'↑';}if(st)st.textContent=state.busy?'Po lexoj gjendjen live të PPPP…':'';if(result){if(state.last){result.hidden=false;result.innerHTML=answerHtml(state.last);var open=result.querySelector('[data-pst-ai-open]');if(open)open.onclick=function(){navigate(state.last);};}else{result.hidden=true;result.innerHTML='';}}return true;}
function bindHost(h){if(!h||h.dataset.bound==='1')return;h.dataset.bound='1';var form=h.querySelector('.pst-ai-form'),input=h.querySelector('.pst-ai-input');form.onsubmit=async function(e){e.preventDefault();var q=S(input.value).trim();if(!q||state.busy)return;state.busy=true;state.question=q;renderHome();try{state.last=await ask(q,{scope:'global'});input.value='';}catch(err){state.last={answer:'Nuk arrita ta marr përgjigjen nga PPPP AI.',uncertainty:S(err&&err.message||err),suggested_next_step:'Kontrollo sesionin ose provo përsëri.',navigation:{project_id:null,project_name:null,area:null},evidence:[]};}finally{state.busy=false;renderHome();}};input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});}
function projectConversation(){return window.PSTProjectIntelligenceConversationV2||window.PSTProjectIntelligenceConversationV1||null;}
function projectSession(pid){var c=projectConversation();try{return c&&c._test&&typeof c._test.session==='function'?c._test.session(pid):null;}catch(e){return null;}}
function renderProject(root,s){if(!root||!s)return;var log=root.querySelector('.pst-pic-log'),input=root.querySelector('.pst-pic-input'),send=root.querySelector('.pst-pic-send');if(log){var html='<div class="pst-pic-row assistant"><div class="pst-pic-bubble pst-pic-welcome">Jam lidhur me PPPP AI në server. Pyet për scope-in, ofertat, emailat, dokumentet, rrezikun ose hapin e ardhshëm.</div></div>';A(s.turns).forEach(function(t){var r=t.result||{};html+='<div class="pst-pic-row '+(t.role==='user'?'user':'assistant')+'"><div class="pst-pic-bubble">'+E(t.content||'').replace(/\n/g,'<br>')+(r.suggested_next_step?'<div class="pst-pic-why"><b>Hapi i radhës:</b> '+E(r.suggested_next_step)+'</div>':'')+'</div></div>';});log.innerHTML=html;log.scrollTop=log.scrollHeight;}if(input)input.disabled=!!s.busy;if(send){send.disabled=!!s.busy;send.textContent=s.busy?'Po mendoj…':'Pyet PPPP';}}
async function projectAsk(root,question){
  var pid=activeProjectId(root),c=projectConversation(),s=projectSession(pid);question=S(question).trim();if(!pid||!question||!c||!s||s.busy)return;
  s.busy=true;s.turns.push({role:'user',content:question});if(s.turns.length>20)s.turns=s.turns.slice(-20);renderProject(root,s);
  var status=root.querySelector('.pst-pic-state');if(status){status.className='pst-pic-state';status.textContent='Po rifreskoj të dhënat e projektit dhe po pyes PPPP AI…';}
  try{
    var ctx=c._test&&typeof c._test.context==='function'?await c._test.context(pid):null;
    var p=ctx&&ctx.project||{};
    var r=await ask(question,{scope:'project',project_id:pid,project_name:p.name,project_ref:p.ref||p.business_ref,context:ctx});
    s.turns.push({role:'assistant',content:r.answer||'Nuk mora përgjigje.',result:r});
    if(status)status.textContent='';
  }catch(err){var msg=S(err&&err.message||err);s.turns.push({role:'assistant',content:'PPPP AI nuk u përgjigj: '+msg,result:null});if(status){status.className='pst-pic-state err';status.textContent=msg;}}
  finally{s.busy=false;renderProject(root,s);}
}
function installProjectConversationBridge(){
  if(document.__pstOpenAIProjectConversationBridge)return;
  document.__pstOpenAIProjectConversationBridge=true;
  document.addEventListener('click',function(e){var prompt=e.target&&e.target.closest&&e.target.closest('.pst-pic-prompt');if(prompt){var root=prompt.closest('.pst-pic');if(!root)return;e.preventDefault();e.stopImmediatePropagation();projectAsk(root,S(prompt.textContent));return;}var send=e.target&&e.target.closest&&e.target.closest('.pst-pic-send');if(!send)return;var root2=send.closest('.pst-pic'),input=root2&&root2.querySelector('.pst-pic-input');if(!root2||!input)return;e.preventDefault();e.stopImmediatePropagation();var q=S(input.value).trim();if(!q)return;input.value='';projectAsk(root2,q);},true);
  document.addEventListener('keydown',function(e){var input=e.target&&e.target.closest&&e.target.closest('.pst-pic-input');if(!input||e.key!=='Enter'||e.shiftKey)return;var root=input.closest('.pst-pic'),q=S(input.value).trim();if(!root||!q)return;e.preventDefault();e.stopImmediatePropagation();input.value='';projectAsk(root,q);},true);
}
function css(){if(document.getElementById('pst-openai-assistant-v1-css'))return;var s=document.createElement('style');s.id='pst-openai-assistant-v1-css';s.textContent=`
#pst-openai-assistant-v1{margin:10px 0 18px;padding:18px 20px;border:1px solid #DDE7EA;border-radius:16px;background:linear-gradient(135deg,#FFFFFF 0%,#F6FAFB 100%);box-shadow:0 8px 30px rgba(37,64,75,.06)}
.pst-ai-title{display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:baseline;margin-bottom:12px}.pst-ai-title>span{font-size:9px;letter-spacing:1.2px;font-weight:850;color:#2F7188}.pst-ai-title>b{font-size:17px;color:#253B44;letter-spacing:-.2px}.pst-ai-title>small{grid-column:2;font-size:10.5px;color:#71838B;margin-top:2px}
.pst-ai-form{display:flex;align-items:flex-end;gap:8px;border:1px solid #CADADF;border-radius:13px;background:#fff;padding:7px 8px 7px 12px;transition:border-color .15s,box-shadow .15s}.pst-ai-form:focus-within{border-color:#7DA9B8;box-shadow:0 0 0 3px rgba(49,113,136,.08)}.pst-ai-input{flex:1;min-height:38px;max-height:110px;resize:vertical;border:0!important;box-shadow:none!important;outline:0!important;background:transparent;font-size:13px;line-height:1.45;color:#263B43;padding:8px 2px}.pst-ai-send{width:38px;height:38px;border:0;border-radius:10px;background:#315F72;color:#fff;font-size:18px;line-height:1;cursor:pointer}.pst-ai-send:disabled{opacity:.55;cursor:not-allowed}.pst-ai-state{min-height:0;font-size:9.5px;color:#71838B;padding:5px 3px 0}.pst-ai-result{margin-top:11px;padding-top:12px;border-top:1px solid #E5ECEE}.pst-ai-answer{font-size:12.5px;line-height:1.62;color:#30464F}.pst-ai-next{display:flex;gap:8px;margin-top:10px;font-size:10.5px;line-height:1.5}.pst-ai-next b{color:#315F72;white-space:nowrap}.pst-ai-next span{color:#50666F}.pst-ai-uncertainty{font-size:9.5px;color:#8A6A43;margin-top:8px}.pst-ai-open{margin-top:10px;border:0;background:transparent;color:#2F7188;font-size:10px;font-weight:800;padding:0;cursor:pointer}.pst-ai-evidence{margin-top:8px;font-size:9px;color:#71838B}.pst-ai-evidence summary{cursor:pointer}.pst-ai-evidence p{display:grid;grid-template-columns:120px 1fr;gap:8px;margin-top:6px}.pst-ai-evidence p b{color:#50666F}.pst-ai-evidence p span{color:#71838B}
#page-workspace-home .pst-oa-project-summary{display:none!important}
.pst-pic-prompts{display:none!important}.pst-pic-clear{opacity:.55}.pst-pic-project-shell{box-shadow:none!important}.pst-pic-project-shell>summary{background:#F8FAFB!important}
@media(max-width:700px){#pst-openai-assistant-v1{padding:15px}.pst-ai-title{display:block}.pst-ai-title>span,.pst-ai-title>b,.pst-ai-title>small{display:block}.pst-ai-title>b{margin-top:3px}.pst-ai-title>small{margin-top:4px}.pst-ai-evidence p{grid-template-columns:1fr}.pst-ai-send{width:40px;flex:0 0 40px}}
`;document.head.appendChild(s);}
function apply(){css();installBridge();installProjectConversationBridge();renderHome();}
function schedule(){[0,100,350,900,1800,2800].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="showPage"],[data-pm-open]');if(t)[50,220,650].forEach(function(ms){setTimeout(apply,ms);});},true);
if(document.readyState!=='loading')schedule();
window.PSTOpenAIAssistantV1={ask:ask,apply:apply,navigate:navigate,_state:state,_test:{edgeRequest:edgeRequest,answerHtml:answerHtml,projectAsk:projectAsk,installBridge:installBridge}};
})();