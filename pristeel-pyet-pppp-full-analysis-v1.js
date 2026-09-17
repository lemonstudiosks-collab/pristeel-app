/* PRISTEEL Pyet PPPP full-analysis bridge v1
 * Narrow read-routing repair for the Home command surface.
 * Project/evidence questions go to the live server assistant before any compact
 * local fallback can short-circuit them. Explicit operator write commands are
 * left to the existing controller and all approval gates remain unchanged.
 */
(function(){
'use strict';
if(window.__pstPyetPpppFullAnalysisV1)return;
window.__pstPyetPpppFullAnalysisV1=true;

function S(v){return String(v==null?'':v);}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._+\-]+/g,' ').replace(/\s+/g,' ').trim();}
function state(){var x=window.PSTProjectControlHomeV1;return x&&x._state?x._state:null;}
function render(){try{var x=window.PSTProjectControlHomeV1;if(x&&typeof x.render==='function')x.render();}catch(e){}}
function identityValues(p){return [p&&p.name,p&&p.client,p&&p.business_ref,p&&p.ref].concat(Array.isArray(p&&p.identity_aliases)?p.identity_aliases:[]).map(N).filter(function(x){return x.length>=3;});}
function identityScore(q,p){var n=N(q),score=0;identityValues(p).forEach(function(x){if(n.indexOf(x)>-1)score=Math.max(score,100+x.length);x.split(' ').filter(function(w){return w.length>=4;}).forEach(function(w){if(n.indexOf(w)>-1)score=Math.max(score,20+w.length);});});return score;}
function uniqueLocalProject(q){
  var st=state(),hits=[];if(!st||!Array.isArray(st.projects))return false;
  st.projects.forEach(function(p){var score=identityScore(q,p);if(score)hits.push({p:p,score:score});});
  hits.sort(function(a,b){return b.score-a.score;});
  return !!(hits.length&&(!hits[1]||hits[0].score>hits[1].score+4));
}
function explicitWriteIntent(q){
  return /^(regjistro(?:je)?|ruaj(?:e)?|shto|sh[eë]no|p[eë]rdit[eë]so|ndrysho|vendos|marko|mbyll(?:e)?|krijo|record|save|add|update|change|close|create)\b/i.test(S(q).trim());
}
function evidenceReadIntent(q){
  var raw=S(q).trim(),n=N(raw);if(!raw||explicitWriteIntent(raw))return false;
  if(/[?？]/.test(raw))return true;
  if(/^(cka|çka|cfare|çfar[eë]|kush|ku|kur|pse|si|a ka|a kemi|me trego|trego|cil|what|which|who|where|when|why|how)\b/i.test(raw))return true;
  if(uniqueLocalProject(raw)&&n.split(' ').filter(Boolean).length<=4)return true;
  if(/\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(raw))return true;
  if(/\.(pdf|docx?|xlsx?|xls|zip|rar|dwg|dxf|step|stp|ifc|xml|csv)\b/i.test(raw))return true;
  if(/\b(rfq|rfi|ofert[eë]?|offer|quote|quotation|angebot|ponud[aeu]?|fatur[eë]?|invoice|rechnung|lieferschein|tender|dosje|dokument|document|file|skedar|vizatim|drawing|materialauszug|werkvertrag|vertrag|boq|bom|purchase order|en\s*1090|s235|s275|s355|s420|s460)\b/i.test(raw))return true;
  if(/\bpo\s*[-#: ]?\s*\d{2,}\b/i.test(raw))return true;
  if(/\b(?:ref|reference|nr|no|projekt|project)\s*[:#-]?\s*[a-z0-9][a-z0-9._\/-]{3,}\b/i.test(raw))return true;
  return false;
}
async function ensureAssistant(){
  var AI=window.PSTOpenAIAssistantV1;if(AI&&typeof AI.ask==='function')return AI;
  var existing=document.querySelector('script[data-pst-openai-assistant-v1],script[data-pst-home-openai-fallback]');
  if(!existing){existing=document.createElement('script');existing.src='pristeel-openai-operating-assistant-v1.js?v=20260827-home1';existing.defer=true;existing.setAttribute('data-pst-openai-assistant-v1','1');document.head.appendChild(existing);}
  await new Promise(function(resolve){var n=0;function check(){var x=window.PSTOpenAIAssistantV1;if(x&&typeof x.ask==='function'||++n>=40){resolve();return;}setTimeout(check,50);}check();});
  return window.PSTOpenAIAssistantV1||null;
}
function friendly(e){var msg=S(e&&e.message||e).trim();return msg||'PPPP nuk arriti ta marrë analizën e plotë. Provo përsëri.';}
async function runRead(form,input,q){
  var st=state();if(!st||st.busy)return;
  st.busy=true;st.pendingQuestion=q;st.busyStage=0;st.busyToken=Number(st.busyToken||0)+1;render();
  try{
    var AI=await ensureAssistant();if(!AI||typeof AI.ask!=='function')throw new Error('PPPP AI nuk është gati.');
    var out=await AI.ask(q,{scope:'global'});
    if(!out||out.ok===false||!S(out.answer).trim())throw new Error(S(out&&(out.message||out.error)||'PPPP nuk ktheu analizë.'));
    st.last={kind:'answer',data:out};
    if(input)input.value='';
  }catch(e){st.last={kind:'error',text:friendly(e)};}
  finally{st.busy=false;st.pendingQuestion='';st.busyStage=0;st.busyToken=Number(st.busyToken||0)+1;render();}
}
function onSubmit(e){
  var form=e.target&&e.target.closest?e.target.closest('.pst-live-command'):null;if(!form)return;
  var input=form.querySelector('.pst-live-input'),q=S(input&&input.value).trim();if(!q||!evidenceReadIntent(q))return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();runRead(form,input,q);
}
function css(){
  if(document.getElementById('pst-pyet-pppp-full-analysis-v1-css'))return;
  var s=document.createElement('style');s.id='pst-pyet-pppp-full-analysis-v1-css';s.textContent=`
#pst-home-launchpad-v1 .pst-live-result:not([hidden]){max-height:76vh!important;overflow:auto!important;overscroll-behavior:contain!important}
#pst-home-launchpad-v1 .pst-live-answer{overflow-wrap:anywhere!important;white-space:normal!important}
`;
  document.head.appendChild(s);
}
document.addEventListener('submit',onSubmit,true);
css();
window.PSTPyetPpppFullAnalysisV1={isReadIntent:evidenceReadIntent};
})();
