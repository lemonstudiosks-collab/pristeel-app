import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {assessPristeelTender} from './pristeel-capability-profile.mjs';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='opportunity-engine-v2.1';
const text=(v,max=5000)=>String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,max);
const norm=v=>text(v,20000).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const array=v=>Array.isArray(v)?v:[];
const unique=a=>[...new Set(array(a).filter(Boolean).map(String))];
const today=()=>new Date().toISOString().slice(0,10);
const source=row=>{const s=String(row?.payload?.source||'KRPP').toUpperCase();return s==='APP'||s==='APP_AL'?'APP_AL':s==='TED'?'TED':'KRPP';};
const phase=row=>String(row?.payload?.notice_phase||'opportunity').toLowerCase();
const daysUntil=d=>{if(!d)return 999;const t=new Date(`${d}T00:00:00Z`).getTime();return Number.isFinite(t)?Math.ceil((t-Date.now())/86400000):999;};

async function rest(access,path,{method='GET',body,prefer}={}){
  const r=await fetch(`${access.supabaseUrl}/rest/v1/${path}`,{
    method,
    headers:{apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const raw=await r.text();
  if(!r.ok)throw new Error(`${method} ${path} failed: HTTP ${r.status} ${raw.slice(0,700)}`);
  return raw?JSON.parse(raw):[];
}

function precisionAssessment(row){
  const a=assessPristeelTender(row);
  const title=text(row?.title,4000), corpus=norm([row?.title,row?.fpp_description,row?.document_type,row?.contract_type,row?.procedure].filter(Boolean).join(' '));
  const software=/(?:\baplikacion(?:i|e|et)?\b|\bmobile app\b|\bweb portal\b|\bportal web\b|\bwebsite\b|\bfaqe interneti\b|\bsoftware\b|\bsistem informatik\b|\bplatforme digjitale\b|\bdigital platform\b)/i.test(corpus);
  const realMetal=/(?:konstruks|struktur|llamarin|profil|shufr|trar|tub|gyp|material metal|metalike|armatur|rebar|b500|steel\s+(?:plate|beam|pipe|structure)|fabrik|sald|weld|galvan|nenstacion|substation|transmission line|linje transmetimi|gantry|portal beam|portal frame|steel portal)/i.test(corpus);
  if(software&&!realMetal){
    return{...a,category:'possible',relevance_score:0,capability_fit:'weak',capability_matches:[],capability_review_required:false,capability_direct_evidence:false,exclusion_reason:'software_or_digital_scope',match_reasons:['jashtë profilit PRISTEEL: software / aplikacion / portal digjital']};
  }

  const celikPlace=/\bÇelik\s*[-–]\s*[A-ZÇË]/.test(title)||/\bcelik\s*[-–]\s*(?:gjilan|prisht|feriz|gjakov|pej|mitrov|prizren)/i.test(norm(title));
  const materialSupport=/(?:furnizim|material|profil|llamarin|shufr|trar|tub|gyp|metal|armatur|rebar|b500|steel|konstruks|struktur|fabrik|sald|weld|galvan)/i.test(corpus.replace(/\bcelik(?:u|ut)?\b/g,' '));
  const onlyCelik=array(a.capability_matches).length===1&&a.capability_matches[0]?.key==='raw_material'&&/celik/i.test(String(a.capability_matches[0]?.reason||''));
  if(celikPlace&&onlyCelik&&!materialSupport){
    return{...a,category:'possible',relevance_score:0,capability_fit:'weak',capability_matches:[],capability_review_required:false,capability_direct_evidence:false,exclusion_reason:'celik_place_name_collision',match_reasons:['jashtë profilit PRISTEEL: “Çelik” u identifikua si emër vendi/emërtim, jo material']};
  }

  return a;
}

function changedAssessment(row,a){
  const p=row?.payload||{};
  return Number(row.relevance_score||0)!==Number(a.relevance_score||0)
    ||String(row.category||'')!==String(a.category||'')
    ||String(p.capability_fit||'')!==String(a.capability_fit||'')
    ||String(p.capability_profile_version||'')!==String(a.capability_profile_version||'')
    ||String(p.capability_exclusion_reason||'')!==String(a.exclusion_reason||'');
}

async function patchAssessment(access,row,a,mode){
  const strictIgnore=Number(a.relevance_score||0)<=20&&!!a.exclusion_reason;
  const p={...(row.payload||{}),capability_profile_version:a.capability_profile_version,capability_fit:a.capability_fit,capability_matches:a.capability_matches||[],capability_review_required:!!a.capability_review_required,capability_direct_evidence:!!a.capability_direct_evidence,capability_exclusion_reason:a.exclusion_reason||null,opportunity_precision_version:VERSION,opportunity_precision_checked_at:new Date().toISOString()};
  const body={category:a.category,relevance_score:a.relevance_score,match_reasons:a.match_reasons||[],payload:p,updated_at:new Date().toISOString()};
  if(strictIgnore&&['new','review','watch'].includes(String(row.status||'')))body.status='ignored';
  if(mode==='apply')await rest(access,`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body,prefer:'return=minimal'});
  return{...row,...body};
}

async function callDossier(access,row,{force=false}={}){
  const r=await fetch(`${access.supabaseUrl}/functions/v1/pppp-tender-dossier-analysis`,{
    method:'POST',
    headers:{apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`,'Content-Type':'application/json'},
    body:JSON.stringify({tender_id:row.id,force})
  });
  const raw=await r.text();let data=null;try{data=raw?JSON.parse(raw):null;}catch{}
  if(!r.ok||!data||data.ok===false)throw new Error(`dossier ${r.status}: ${text(data?.message||data?.error||raw,800)}`);
  return data;
}

function dossierFingerprint(row,out){
  const docs=array(out?.documents).map(d=>({name:text(d?.name,500),url:text(d?.url,1000)})).sort((a,b)=>(a.name+a.url).localeCompare(b.name+b.url));
  const a=out?.analysis||{};
  const stable={source:source(row),deadline:row.deadline||null,complete:out?.dossier_complete!==false,protected:unique(out?.protected_documents).sort(),documents:docs,technical:array(a.technical_requirements),commercial:array(a.commercial_requirements),submission:array(a.submission_requirements),quantities:array(a.known_quantities_specs)};
  return createHash('sha256').update(JSON.stringify(stable)).digest('hex');
}

function routeFrom(row,out){
  const a=out?.analysis||{}, cap=String(a?.capability_fit?.rating||'unknown').toLowerCase(), euro=String(a?.eurosteel_fit?.rating||'unknown').toLowerCase(), rec=String(a?.recommendation||'REVIEW').toUpperCase(), complete=out?.dossier_complete!==false, partners=array(a?.suggested_partners);
  if(!complete)return{route:'DOSSIER_REQUIRED',gate:'blocked_dossier',reason:'Dosja kryesore nuk është e plotë ose ka dokumente të mbrojtura.'};
  if(rec==='NO_GO')return{route:'NO_GO_REVIEW',gate:'no_go',reason:'Analiza e dosjes rekomandon NO_GO; vendimi final mbetet njerëzor.'};
  if(String(row.category)==='raw_material'){
    const qualified=rec==='GO'&&cap==='strong'&&Number(row.relevance_score||0)>=65&&daysUntil(row.deadline)>=2;
    return{route:'DIRECT_RAW_MATERIAL',gate:qualified?'qualified':'review_required',reason:'Tender për furnizim me lëndë/material; PriSteel mund të ofertojë direkt pas sourcing dhe kontrollit komercial.'};
  }
  if(cap==='strong'){
    const qualified=rec==='GO'&&Number(row.relevance_score||0)>=65&&daysUntil(row.deadline)>=2;
    return{route:'DIRECT_FABRICATION',gate:qualified?'qualified':'review_required',reason:'Scope i fabrikimit/strukturës përputhet fort me kapacitetet e PriSteel.'};
  }
  if(partners.length||['strong','possible'].includes(euro))return{route:'PARTNER_REQUIRED',gate:'review_required',reason:'Tenderi ka potencial, por analiza sugjeron partner/prodhues për scope të plotë.'};
  return{route:'REVIEW_REQUIRED',gate:'review_required',reason:'Ka sinjal relevant, por nuk ka prova të mjaftueshme për auto-qualification.'};
}

function dueFor(row){
  if(!row.deadline)return today();
  const d=new Date(`${row.deadline}T00:00:00Z`);d.setUTCDate(d.getUTCDate()-7);
  const iso=d.toISOString().slice(0,10);return iso<today()?today():iso;
}
function priorityFor(row){const d=daysUntil(row.deadline),s=Number(row.relevance_score||0);return d<=5||s>=90?'larte':d<=12||s>=75?'mesatare':'normale';}
function actionFor(row,out,route,amendment=false){
  const a=out?.analysis||{}, steel=array(a.steel_scope).slice(0,5), qty=array(a.known_quantities_specs).slice(0,5), risks=array(a.risks).slice(0,4), partners=array(a.suggested_partners).slice(0,5);
  if(amendment)return{type:'dossier_amendment_review',subject:'Ndryshim në dosjen e tenderit',brief:`PPPP zbuloi ndryshim në dosjen zyrtare për “${text(row.title,300)}”. Rilexo ndryshimet para çdo ofertimi. Afati: ${row.deadline||'—'}.`};
  if(route.route==='DIRECT_RAW_MATERIAL')return{type:'supplier_rfq_plan',subject:`Sourcing plan · ${text(row.title,180)}`,brief:`Tender direkt për lëndë/material. Përmbledhje: ${text(a.summary,900)}. Material/sasi: ${[...steel,...qty].join(' | ')||'duhet verifikuar'}. Kushtet/rreziqet: ${risks.join(' | ')||'—'}. Përgatit RFQ-të për furnitorët; asgjë nuk dërgohet pa miratim.`};
  if(route.route==='DIRECT_FABRICATION')return{type:'bid_execution_review',subject:`Bid plan · ${text(row.title,180)}`,brief:`Tender me përshtatje të fortë për PriSteel. Scope: ${steel.join(' | ')||text(a.scope,900)}. Sasi/specifika: ${qty.join(' | ')||'duhet verifikuar'}. Hapi: ${text(a.next_step,900)}. Vendimi final për ofertim/çmim mbetet njerëzor.`};
  if(route.route==='PARTNER_REQUIRED')return{type:'partner_outreach_plan',subject:`Partner plan · ${text(row.title,180)}`,brief:`Tender relevant ku nevojitet partner/prodhues. Kandidatë nga PPPP: ${partners.map(p=>`${p.name}: ${p.reason}`).join(' | ')||'ende pa kandidat të fortë'}. Scope: ${steel.join(' | ')||text(a.scope,700)}. Përgatit kontaktet/draftet; mos dërgo automatikisht.`};
  if(route.route==='DOSSIER_REQUIRED')return{type:'krpp_authenticated_fetch_required',subject:`Dosja e plotë kërkohet · ${text(row.title,160)}`,brief:`PPPP nuk e ka dosjen e plotë. Dokumente të mbrojtura: ${unique(out?.protected_documents).join(', ')||'dokumentacioni kryesor'}. Queue për authenticated fetch është krijuar. Mos krijo ofertë finale pa dosjen e plotë.`};
  if(route.route==='NO_GO_REVIEW')return{type:'no_go_review',subject:`NO_GO review · ${text(row.title,180)}`,brief:`Analiza rekomandon NO_GO: ${text(a?.capability_fit?.reason,900)}. Ky është rekomandim, jo vendim automatik. Verifiko para mbylljes.`};
  return{type:'opportunity_review',subject:`Opportunity review · ${text(row.title,180)}`,brief:`PPPP gjeti një mundësi që kërkon verifikim. ${text(a.summary,900)} Hapi: ${text(a.next_step,900)}`};
}

async function upsertAction(access,row,out,route,{amendment=false,mode='apply'}={}){
  const x=actionFor(row,out,route,amendment), key=`TENDER:${row.id}:${x.type}`;
  const body={tender_watch_id:row.id,project_id:row.project_id||null,action_key:key,action_type:x.type,route:route.route,status:'draft_review',priority:priorityFor(row),due_date:dueFor(row),target_company:row.authority||null,target_email:null,subject_hint:x.subject,draft_brief:x.brief,payload:{engine_version:VERSION,recommendation:out?.analysis?.recommendation||null,dossier_complete:out?.dossier_complete!==false,protected_documents:out?.protected_documents||[],suggested_partners:out?.analysis?.suggested_partners||[],human_approval_required:true},updated_at:new Date().toISOString()};
  if(mode==='apply'){
    await rest(access,'pppp_opportunity_actions?on_conflict=action_key',{method:'POST',body:[body],prefer:'resolution=merge-duplicates,return=minimal'});
    const task={project_id:row.project_id||null,title:x.subject,detail:x.brief,due_date:body.due_date,priority:body.priority,status:'hapur',source:'opportunity_engine_v2',category:'intern',source_ref:`OPPORTUNITY:${row.id}:${x.type}`};
    await rest(access,'tasks?on_conflict=source,source_ref',{method:'POST',body:[task],prefer:'resolution=merge-duplicates,return=minimal'});
  }
  return{x,key};
}

async function recordVersion(access,row,out,fingerprint,mode){
  const existing=await rest(access,`pppp_tender_dossier_versions?tender_watch_id=eq.${encodeURIComponent(row.id)}&select=fingerprint,analyzed_at&order=analyzed_at.desc&limit=1`);
  const previous=Array.isArray(existing)?existing[0]:null, amendment=!!previous&&previous.fingerprint!==fingerprint;
  const snap={documents:out?.documents||[],protected_documents:out?.protected_documents||[],access_failures:out?.access_failures||[],analysis:out?.analysis||{},provider:out?.provider||null,file_mode:out?.file_mode||null,warnings:out?.warnings||[]};
  if(mode==='apply')await rest(access,'pppp_tender_dossier_versions?on_conflict=tender_watch_id,fingerprint',{method:'POST',body:[{tender_watch_id:row.id,fingerprint,source:source(row),dossier_complete:out?.dossier_complete!==false,document_count:array(out?.documents).length,recommendation:out?.analysis?.recommendation||null,analyzed_at:new Date().toISOString(),snapshot:snap}],prefer:'resolution=ignore-duplicates,return=minimal'});
  return{amendment,previous};
}

async function updateFetchQueue(access,row,out,mode){
  if(source(row)!=='KRPP')return;
  const incomplete=out?.dossier_complete===false, protectedDocs=unique(out?.protected_documents);
  const body={tender_watch_id:row.id,source:'KRPP',status:incomplete?'queued':'complete',auth_required:incomplete&&protectedDocs.length>0,protected_documents:protectedDocs,requested_at:new Date().toISOString(),last_error:incomplete?text(array(out?.access_failures).join(' | '),1200):null,payload:{title:row.title,detail_url:row.detail_url,procurement_no:row.procurement_no,reason:incomplete?'official_dossier_incomplete':'public_dossier_complete'},updated_at:new Date().toISOString()};
  if(mode==='apply')await rest(access,'pppp_tender_fetch_queue?on_conflict=tender_watch_id',{method:'POST',body:[body],prefer:'resolution=merge-duplicates,return=minimal'});
}

async function processDirect(access,rows,{mode,maxDossiers}){
  const assessed=[],ignored=[];
  for(const original of rows){
    const a=precisionAssessment(original);let row=original;
    if(changedAssessment(row,a)||String(row?.payload?.opportunity_precision_version||'')!==VERSION)row=await patchAssessment(access,row,a,mode);
    assessed.push(row);if(row.status==='ignored'||Number(row.relevance_score||0)<=20)ignored.push(row.id);
  }

  const eligible=assessed.filter(r=>['KRPP','APP_AL'].includes(source(r))&&phase(r)==='opportunity'&&r.status!=='ignored'&&Number(r.relevance_score||0)>=35&&(!r.deadline||r.deadline>=today()));
  eligible.sort((a,b)=>Number(!!b.project_id)-Number(!!a.project_id)||Number(b.status==='review')-Number(a.status==='review')||Number(b.relevance_score||0)-Number(a.relevance_score||0)||daysUntil(a.deadline)-daysUntil(b.deadline));
  const selected=eligible.slice(0,Math.max(0,maxDossiers)),results=[];

  for(const row0 of selected){
    try{
      const out=await callDossier(access,row0,{force:false}),fp=dossierFingerprint(row0,out),version=await recordVersion(access,row0,out,fp,mode),route=routeFrom(row0,out);
      await updateFetchQueue(access,row0,out,mode);
      const freshRows=await rest(access,`kek_tender_watch?id=eq.${encodeURIComponent(row0.id)}&select=*&limit=1`),fresh=freshRows?.[0]||row0,p={...(fresh.payload||{}),opportunity_engine_version:VERSION,opportunity_route:route.route,opportunity_gate:route.gate,opportunity_route_reason:route.reason,opportunity_dossier_fingerprint:fp,opportunity_dossier_checked_at:new Date().toISOString(),opportunity_recommendation:out?.analysis?.recommendation||null,opportunity_dossier_complete:out?.dossier_complete!==false,opportunity_human_approval_required:true};
      let nextStatus=fresh.status;
      if(['qualified','review_required','blocked_dossier','no_go'].includes(route.gate)&&fresh.status==='new')nextStatus='review';
      if(mode==='apply')await rest(access,`kek_tender_watch?id=eq.${encodeURIComponent(row0.id)}`,{method:'PATCH',body:{payload:p,status:nextStatus,updated_at:new Date().toISOString()},prefer:'return=minimal'});
      const row={...fresh,payload:p,status:nextStatus};
      await upsertAction(access,row,out,route,{mode});
      if(version.amendment)await upsertAction(access,row,out,route,{amendment:true,mode});
      results.push({id:row.id,source:source(row),title:row.title,score:row.relevance_score,route:route.route,gate:route.gate,recommendation:out?.analysis?.recommendation||null,dossier_complete:out?.dossier_complete!==false,documents:array(out?.documents).length,amendment:version.amendment,cached:!!out?.cached});
    }catch(error){
      const msg=text(error?.message||error,1000);results.push({id:row0.id,source:source(row0),title:row0.title,error:msg});
      if(mode==='apply'){
        await rest(access,'pppp_opportunity_actions?on_conflict=action_key',{method:'POST',body:[{tender_watch_id:row0.id,project_id:row0.project_id||null,action_key:`TENDER:${row0.id}:dossier_analysis_failure`,action_type:'dossier_analysis_failure',route:'REVIEW_REQUIRED',status:'review',priority:'larte',due_date:today(),target_company:row0.authority||null,subject_hint:`Dossier analysis failed · ${text(row0.title,160)}`,draft_brief:`PPPP nuk arriti ta analizojë dosjen automatikisht: ${msg}. Provo përsëri ose merre dosjen manualisht.`,payload:{engine_version:VERSION,error:msg},updated_at:new Date().toISOString()}],prefer:'resolution=merge-duplicates,return=minimal'});
      }
    }
  }
  return{assessed:assessed.length,precision_ignored:ignored.length,eligible:eligible.length,selected:selected.length,results};
}

async function runPromotion(access,mode){if(mode!=='apply')return null;const out=await rest(access,'rpc/pppp_tender_project_promotion_reconcile_v2',{method:'POST',body:{p_apply:true,p_limit:100}});return out;}
async function writeSummary(s){await mkdir('tmp',{recursive:true});await writeFile('tmp/opportunity-engine-v2.json',JSON.stringify(s,null,2));}

export async function runOpportunityEngineV2({mode=process.env.SYNC_MODE||'preview',maxDossiers=Number(process.env.PPPP_OPPORTUNITY_DOSSIER_MAX||8),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const access=await resolveSupabaseWorkflowAccess({supabaseUrl});
  const rows=await rest(access,'kek_tender_watch?select=*&order=published_date.desc&limit=1000');
  const direct=(Array.isArray(rows)?rows:[]).filter(r=>['KRPP','APP_AL'].includes(source(r))&&phase(r)==='opportunity');
  const processed=await processDirect(access,direct,{mode,maxDossiers});
  const promotion=await runPromotion(access,mode);
  const summary={mode,version:VERSION,auth_mode:access.authMode,direct_rows:direct.length,...processed,promotion,generated_at:new Date().toISOString()};
  await writeSummary(summary);console.log(`Opportunity Engine v2 ${mode}: direct=${direct.length}, eligible=${processed.eligible}, dossiers=${processed.selected}, ignored=${processed.precision_ignored}.`);return summary;
}

const directRun=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(directRun)runOpportunityEngineV2().catch(async e=>{try{await writeSummary({error:String(e?.message||e),mode:process.env.SYNC_MODE||'preview',version:VERSION});}catch{}console.error(e);process.exit(1);});
