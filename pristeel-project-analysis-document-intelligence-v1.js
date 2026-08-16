/* PRISTEEL Project Analysis document intelligence bridge v1
 * Additive read-context adapter for the existing whole-project brief.
 * - Feeds analyzed project_attachment_links into the existing analysis read phase.
 * - Keeps OCR/document trust metadata explicit and caps excerpts aggressively.
 * - Exposes per-document DI* evidence IDs to Project Analysis without changing source documents.
 * - Normalizes AI-only 0-10 score responses to the UI's 0-100 scale.
 * - Marks saved briefs stale when newer analyzed documents exist.
 * - Corrects only the rule fallback's false "no documentation" conclusion.
 * - Does not create tasks, write BOM, send email, change project status, or mutate source documents.
 */
(function(){
'use strict';
if(window.__pstProjectAnalysisDocumentIntelligenceV1)return;
window.__pstProjectAnalysisDocumentIntelligenceV1=true;

function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v==null?'':v);}
function enc(v){return encodeURIComponent(str(v));}
function cap(v,n){var s=str(v).replace(/\u0000/g,'').trim();return s.length>n?s.slice(0,n)+'…':s;}
function norm(v){return str(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[\s-]+/g,'_').trim();}
function ts(v){var n=Date.parse(v||'');return isFinite(n)?n:0;}
function activeId(id){var d=window.__pstIntegrityLastData;return str(id||window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'').trim();}
async function safeWith(fetcher,path){try{return arr(await fetcher(path));}catch(e){return[];}}
function trustTier(row){return str(row&&row.extracted_data&&row.extracted_data.trust_tier).trim()||((/ocr/i.test(str(row&&row.analysis_method)))?'ocr':'text');}
function hasFacts(row){var f=row&&row.extracted_data&&row.extracted_data.facts;return !!(f&&typeof f==='object'&&Object.keys(f).length);}
function usable(row){return str(row&&row.analysis_status)==='analyzed'&&(str(row&&row.extracted_text).trim()||hasFacts(row));}
function reviewRequired(row){var b=norm(row&&row.bom_status),t=norm(trustTier(row));return t==='ocr'||b==='review'||b==='conflict_review';}
function compactFacts(row){var f=row&&row.extracted_data&&row.extracted_data.facts;if(!f||typeof f!=='object')return'';try{return cap(JSON.stringify(f),1100);}catch(e){return'';}}
function compactRow(row){
  var tier=trustTier(row),text=cap(row&&row.extracted_text,1400),facts=compactFacts(row);
  return{
    pppp_source:'project_attachment_intelligence',
    attachment_link_id:row.id,
    file_name:row.attachment_name||'',
    mime_type:row.attachment_mime_type||'',
    analysis_status:row.analysis_status||'',
    analysis_method:row.analysis_method||'',
    analysis_confidence:row.analysis_confidence==null?null:Number(row.analysis_confidence),
    analyzed_at:row.analyzed_at||null,
    trust_tier:tier,
    review_required:reviewRequired(row),
    bom_status:row.bom_status||'none',
    bom_applied_count:Number(row.bom_applied_count)||0,
    facts_excerpt:facts,
    extracted_text:text
  };
}
function intelSummary(rows){
  var all=arr(rows),good=all.filter(usable).sort(function(a,b){return ts(b&&b.analyzed_at)-ts(a&&a.analyzed_at);}),selected=good.slice(0,6),latest=good.length?good[0].analyzed_at:null;
  return{
    analyzed_count:good.length,
    review_count:good.filter(reviewRequired).length,
    latest_analyzed_at:latest,
    rows:selected.map(compactRow)
  };
}
async function readIntel(fetcher,pid){
  var cols='id,attachment_name,attachment_mime_type,analysis_status,analysis_method,analysis_confidence,extracted_text,extracted_data,analyzed_at,archived_at,bom_status,bom_applied_count';
  var rows=await safeWith(fetcher,'project_attachment_links?project_id=eq.'+enc(pid)+'&select='+enc(cols)+'&analysis_status=eq.analyzed&order=analyzed_at.desc&limit=120');
  return intelSummary(rows);
}
function docsQuery(path,pid){var p=str(path);return p.indexOf('documents_registry?')===0&&p.indexOf('project_id=eq.'+enc(pid))>-1;}
function syntheticRecord(intel){
  if(!intel||!intel.rows.length)return null;
  return{
    id:'pppp-document-intelligence',
    doc_type:'PPPP_DOCUMENT_INTELLIGENCE',
    title:'Dokumentet e analizuara automatikisht nga PPPP',
    source:'project_attachment_links',
    created_at:intel.latest_analyzed_at,
    analyzed_document_count:intel.analyzed_count,
    review_document_count:intel.review_count,
    interpretation_rule:'Perdor vetem extracted_text/facts. trust_tier=ocr ose review_required=true kerkon verifikim njerezor. Mos krijo BOM si fakt te konfirmuar nga OCR.',
    analyzed_documents:intel.rows
  };
}
function documentEvidence(intel){
  return arr(intel&&intel.rows).map(function(row,i){
    var id='DI'+(i+1),facts=cap(row&&row.facts_excerpt,1000),text=cap(row&&row.extracted_text,1400),parts=[];
    if(facts)parts.push('FACTS: '+facts);if(text)parts.push('TEXT: '+text);
    return{
      id:id,
      type:'document_intelligence',
      label:row&&row.file_name||('Dokument i analizuar '+(i+1)),
      date:row&&row.analyzed_at||null,
      url:null,
      text:cap(parts.join('\n'),2200),
      meta:{attachment_link_id:row&&row.attachment_link_id,analysis_method:row&&row.analysis_method||'',trust_tier:row&&row.trust_tier||'text',review_required:!!(row&&row.review_required),analysis_confidence:row&&row.analysis_confidence==null?null:Number(row.analysis_confidence)}
    };
  });
}
function evidenceManifest(intel){return documentEvidence(intel).map(function(s){return{id:s.id,type:s.type,label:s.label,date:s.date,url:s.url,meta:s.meta};});}
function evidenceIds(intel){return documentEvidence(intel).map(function(s){return s.id;});}
function evidencePrompt(intel){
  var xs=documentEvidence(intel);if(!xs.length)return'';
  return '\n\nBURIME PPPP DOCUMENT INTELLIGENCE - ID TE LEJUARA SHTESE:\n'+xs.map(function(s){return'=== ['+s.id+'] DOCUMENT_INTELLIGENCE | '+s.label+' ===\nData: '+(s.date||'')+'\nTrust: '+str(s.meta.trust_tier)+(s.meta.review_required?' | REVIEW_REQUIRED=true':' | REVIEW_REQUIRED=false')+'\n'+s.text;}).join('\n\n')+'\n\nKur nje fakt vjen nga nje attachment i analizuar, cito DI-ne perkatese. Per REVIEW_REQUIRED=true, trajtoje si evidence qe kerkon verifikim njerezor dhe jo si fakt automatik per BOM.';
}
function cloneAiOptions(opts){var out=Object.assign({},opts||{});out.messages=arr(opts&&opts.messages).map(function(m){return Object.assign({},m);});return out;}
function finalPromptText(opts){var ms=arr(opts&&opts.messages);for(var i=ms.length-1;i>=0;i--)if(str(ms[i]&&ms[i].role)==='user')return str(ms[i].content);return'';}
function augmentAiOptions(opts,intel){
  var out=cloneAiOptions(opts),ms=out.messages,text=finalPromptText(out),isFinal=/P[eë]rgatit analiz[eë]n p[eë]rfundimtare operative/i.test(text),isExtract=/Analizo k[eë]t[eë] pjes[eë] t[eë] nj[eë] projekti/i.test(text),hasIntel=/PPPP_DOCUMENT_INTELLIGENCE|project_attachment_intelligence/i.test(text),ids=evidenceIds(intel),extra='';
  if(isExtract&&hasIntel&&ids.length)extra=evidencePrompt(intel)+'\nID-te '+ids.join(', ')+' konsiderohen pjese e listes se lejuar te source_ids edhe nese lista e gjeneruar me siper permend vetem D1.';
  if(isFinal){
    extra+='\n\nRREGULL I DETYRUESHEM PER SCORE: health.score dhe confidence.score jane numra te plote nga 0 deri ne 100. Mos perdor shkallen 0-10.';
    if(ids.length)extra+='\nBURIME DOCUMENT INTELLIGENCE TE LEJUARA NE ANALIZEN PERFUNDIMTARE:\n'+JSON.stringify(evidenceManifest(intel))+'\nID-te DI jane source_ids ekzistuese dhe te vlefshme. Prefero DI-ne konkrete ne vend te D1 kur pika faktike mbeshtetet nga nje attachment i analizuar.';
  }
  if(extra){for(var j=ms.length-1;j>=0;j--)if(str(ms[j]&&ms[j].role)==='user'){ms[j].content=str(ms[j].content)+extra;break;}}
  out.__pstDocumentIntelFinal=isFinal;return out;
}
function normalizeAiScores(out){
  if(!out||typeof out!=='object')return out;
  ['health','confidence'].forEach(function(k){var box=out[k],n=Number(box&&box.score);if(!box||!isFinite(n)||n<=0)return;if(n<=1)box.score=Math.round(n*100);else if(n<=10)box.score=Math.round(n*10);});
  return out;
}
async function withAnalysisAi(intel,fn){
  var ai=window.PSTAI,base=ai&&ai.requestJson;if(typeof base!=='function')return fn();
  async function wrapped(opts){var aug=augmentAiOptions(opts,intel),out=await base.call(this,aug);return aug.__pstDocumentIntelFinal?normalizeAiScores(out):out;}
  ai.requestJson=wrapped;
  try{return await fn();}
  finally{if(ai.requestJson===wrapped)ai.requestJson=base;}
}
async function withIntelRead(pid,intel,fn){
  var base=window.supaFetch;if(typeof base!=='function')return fn();
  function scoped(path){
    var args=arguments,method=str(args[1]||'GET').toUpperCase();
    if(method==='GET'&&docsQuery(path,pid)){
      return Promise.resolve(base.apply(this,args)).then(function(rows){var s=syntheticRecord(intel);return s?[s].concat(arr(rows)):arr(rows);});
    }
    return base.apply(this,args);
  }
  window.supaFetch=scoped;
  try{return await fn();}
  finally{if(window.supaFetch===scoped)window.supaFetch=base;}
}
async function latestAnalysis(fetcher,pid){var r=await safeWith(fetcher,'project_analyses?project_id=eq.'+enc(pid)+'&order=created_at.desc&limit=1');return r[0]||null;}
function ruleDocumentationFix(analysis,intel){
  if(!analysis||!intel||!intel.analyzed_count)return false;
  var changed=false,missing=arr(analysis.missing_information),actions=arr(analysis.next_actions),req=arr(analysis.requirements),src=evidenceIds(intel);if(!src.length)src=['D1'];
  var nm=missing.filter(function(x){var hit=/dokumentacioni teknik dhe komercial/i.test(str(x&&x.text))&&/scope|verifik/i.test(str(x&&x.why_needed));if(hit)changed=true;return !hit;});
  var na=actions.filter(function(x){var hit=/importo dokumentet kryesore/i.test(str(x&&x.title));if(hit)changed=true;return !hit;});
  if(!req.some(function(x){return /dokumente.*analizuar.*pppp|pppp.*dokumente.*analizuar/i.test(str(x&&x.text));})){
    req.push({category:'documentation',text:'PPPP ka '+intel.analyzed_count+' dokumente/attachment-e te analizuara te lidhura me projektin'+(intel.review_count?' ('+intel.review_count+' kerkojne review).':'.'),status:'confirmed',priority:intel.review_count?'high':'medium',source_ids:src.slice(0,6)});changed=true;
  }
  if(changed){analysis.missing_information=nm;analysis.next_actions=na;analysis.requirements=req;}
  return changed;
}
async function patchFreshRecord(fetcher,pid,before,after,intel){
  if(!after||!after.id||!intel)return false;
  if(before&&str(before.id)===str(after.id)&&str(before.created_at)===str(after.created_at))return false;
  var counts=Object.assign({},after.source_counts||{}, {document_intelligence:intel.analyzed_count,document_intelligence_review:intel.review_count}),manifest=arr(after.source_manifest).filter(function(s){return !/^DI\d+$/i.test(str(s&&s.id));}).concat(evidenceManifest(intel));
  var payload={source_counts:counts,source_manifest:manifest},changed=false,engine=norm(after.engine);
  if(engine.indexOf('rules')===0&&after.analysis&&typeof after.analysis==='object'){
    var clone;try{clone=JSON.parse(JSON.stringify(after.analysis));}catch(e){clone=null;}
    if(clone&&ruleDocumentationFix(clone,intel)){payload.analysis=clone;changed=true;}
  }
  try{await fetcher('project_analyses?id=eq.'+enc(after.id),'PATCH',payload);return true;}catch(e){if(window.console&&console.warn)console.warn('Project Intelligence document metadata patch:',e&&e.message||e);return changed;}
}
function setFreshnessState(pid,text,color){var e=document.getElementById('pai-state-'+pid);if(!e)return;e.textContent=text;e.style.color=color||'var(--text3)';}
function analysisFailureState(pid){var e=document.getElementById('pai-state-'+pid),t=str(e&&e.textContent).trim();return /^Analiza d[eë]shtoi\s*:/i.test(t)?t:'';}
async function showFreshness(pid){
  pid=activeId(pid);var base=window.supaFetch;if(!pid||typeof base!=='function')return null;
  var q=await Promise.all([latestAnalysis(base,pid),readIntel(base,pid)]),rec=q[0],intel=q[1];
  if(!intel.analyzed_count)return{state:'no_docs',analysis:rec,intel:intel};
  if(!rec){setFreshnessState(pid,'PPPP ka '+intel.analyzed_count+' dokumente te analizuara. Krijo analizen e pare.','#9B6A22');return{state:'no_analysis',analysis:null,intel:intel};}
  if(ts(intel.latest_analyzed_at)>ts(rec.created_at)){setFreshnessState(pid,'Ka dokumente te reja te lexuara nga PPPP pas kesaj analize. Rifresko analizen.','#9B6A22');return{state:'stale',analysis:rec,intel:intel};}
  return{state:'current',analysis:rec,intel:intel};
}
function wrapLoad(){
  var original=window.pstProjectAnalysisLoad;if(typeof original!=='function')return false;if(original.__pstDocumentIntelV1)return true;
  async function wrapped(pid){var r=await original.apply(this,arguments);try{await showFreshness(pid);}catch(e){}return r;}
  wrapped.__pstDocumentIntelV1=true;wrapped.__pstOriginal=original;window.pstProjectAnalysisLoad=wrapped;return true;
}
function wrapAnalyze(){
  var original=window.pstAnalyzeProject;if(typeof original!=='function')return false;if(original.__pstDocumentIntelV1)return true;
  async function wrapped(pid){
    pid=activeId(pid);var base=window.supaFetch;if(!pid||typeof base!=='function')return original.apply(this,arguments);
    var before=await latestAnalysis(base,pid),intel=await readIntel(base,pid),self=this,args=arguments;
    var result=await withIntelRead(pid,intel,function(){return withAnalysisAi(intel,function(){return original.apply(self,args);});});
    var failure=analysisFailureState(pid),after=await latestAnalysis(base,pid);await patchFreshRecord(base,pid,before,after,intel);
    try{if(after&&after.id&&typeof window.pstProjectAnalysisLoad==='function')await window.pstProjectAnalysisLoad(pid);else if(!failure)await showFreshness(pid);}catch(e){}
    return result;
  }
  wrapped.__pstDocumentIntelV1=true;wrapped.__pstOriginal=original;window.pstAnalyzeProject=wrapped;return true;
}
function install(){wrapLoad();wrapAnalyze();var id=activeId();if(id)setTimeout(function(){showFreshness(id);},120);}
install();
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTProjectAnalysisDocumentIntelligenceV1={refresh:showFreshness,_test:{intelSummary:intelSummary,compactRow:compactRow,usable:usable,reviewRequired:reviewRequired,ruleDocumentationFix:ruleDocumentationFix,syntheticRecord:syntheticRecord,docsQuery:docsQuery,analysisFailureState:analysisFailureState,documentEvidence:documentEvidence,evidenceManifest:evidenceManifest,augmentAiOptions:augmentAiOptions,normalizeAiScores:normalizeAiScores}};
})();
