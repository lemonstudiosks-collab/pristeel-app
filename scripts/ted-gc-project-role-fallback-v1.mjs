import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';
import {evaluateGcAwardPrecision,VERSION as PRECISION_VERSION} from './ted-gc-award-precision-v3.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='ted-gc-project-role-fallback-v1.1';
const text=(v,max=5000)=>String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,max);
const norm=v=>text(v,10000).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const array=v=>Array.isArray(v)?v:[];
const unique=a=>[...new Set(array(a).filter(Boolean).map(String))];
const today=()=>new Date().toISOString().slice(0,10);
function payload(r){return r?.payload&&typeof r.payload==='object'?r.payload:{};}
function winner(r){const w=payload(r).winner;return w&&typeof w==='object'?w:{};}
function names(w){return unique([...(array(w.names)),w.name].map(x=>text(x,500)).filter(Boolean));}
function dueDate(row){const d=new Date(`${row.published_date||today()}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+5);const x=d.toISOString().slice(0,10);return x<today()?today():x;}
async function rest(access,path,{method='GET',body,prefer}={}){const r=await fetch(`${access.supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await r.text();if(!r.ok)throw new Error(`${method} ${path} failed: HTTP ${r.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];}
function awardCategory(row){const parts=text(row?.title,6000).split(/\s+[–—-]\s+/).map(x=>x.trim()).filter(Boolean);return norm(parts.length>=3?parts[1]:'');}
function isConstructionDeliveryAward(row){
  const c=awardCategory(row),t=norm(row?.title);
  return /(?:construction work|construction works|civil engineering|assembly and erection|erection of (?:steel|prefabricated|structural)|structural steel erection|bridge construction|building construction|industrial construction|installation work|works for (?:bridges|power lines|pipelines|substations)|bauarbeiten|bauleistung|montagearbeiten|errichtung)/i.test(c)
    || /(?:\bconstruction work\b|\bassembly and erection\b|\bmain contract\b|\bhauptauftrag\b|\bhauptentreprise\b|\bgeneralunternehmer\b|\bgeneral contractor\b|\bdesign and build\b|\bplanung und bau\b)/i.test(t);
}
function domainOf(v){try{const raw=text(v,800);if(!raw)return'';const u=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);return u.hostname.toLowerCase().replace(/^www\./,'');}catch{return'';}}
function emailDomain(v){const m=text(v,400).toLowerCase().match(/@([^>\s]+)$/);return m?m[1].replace(/^www\./,''):'';}
function officialDomains(row){
  const w=winner(row),winnerNames=names(w).map(norm),out=[];
  for(const v of [...array(w.websites),w.website]){const d=domainOf(v);if(d&&!out.includes(d))out.push(d);}
  for(const org of array(w?.contact_enrichment?.organizations)){
    const sameCompany=winnerNames.some(n=>n&&norm(org?.name)===n);
    if(!sameCompany)continue;
    for(const v of [org?.official_website,org?.website,org?.domain]){const d=domainOf(v);if(d&&!out.includes(d))out.push(d);}
  }
  return out;
}
function emailBelongsToWinner(email,domains){const d=emailDomain(email);return !!d&&domains.some(x=>d===x||d.endsWith(`.${x}`)||x.endsWith(`.${d}`));}
function bestEmail(row,outreach){
  const w=winner(row),o=outreach||{},domains=officialDomains(row),candidates=[];
  for(const v of [o.contact_email,w?.contact_ranking?.email,w?.ranked_contact?.email,w.email,...array(w.emails)])if(text(v,400))candidates.push(text(v,400));
  for(const org of array(w?.contact_enrichment?.organizations)){
    const sameCompany=names(w).map(norm).some(n=>n&&norm(org?.name)===n);
    if(!sameCompany)continue;
    for(const c of array(org?.contacts))if(c?.type==='email'&&text(c?.value,400))candidates.push(text(c.value,400));
  }
  const uniqueCandidates=unique(candidates);
  if(!domains.length)return'';
  return uniqueCandidates.find(e=>emailBelongsToWinner(e,domains))||'';
}
async function upsertAction(access,row,email,precision,mode){
  const w=winner(row),company=w.name||names(w)[0]||'Fituesi',project=text(row.title,400),buyer=text(row.authority,250);
  const type=email?'gc_project_outreach_draft':'gc_contact_research',key=`TENDER:${row.id}:${type}`;
  const brief=email
    ?`${company} është award-holder për “${project}”${buyer?` për ${buyer}`:''}. Corporate type ende nuk është zgjidhur, por TED e përshkruan award-in si construction/erection works dhe relevanca për PriSteel është verifikuar. Përgatit outreach specifik për projektin duke ofruar steel fabrication/subcontracting capacity. Draft vetëm; mos dërgo automatikisht.`
    :`${company} është award-holder për “${project}”. TED e përshkruan award-in si construction/erection works me relevancë të verifikuar për PriSteel, por nuk kemi procurement/project email që përputhet me domain-in e fituesit. Gjej kontaktin e verifikuar para draftit.`;
  const body={tender_watch_id:row.id,project_id:row.project_id||null,action_key:key,action_type:type,route:'TED_GC',status:'draft_review',priority:Number(row.relevance_score||0)>=94?'larte':'mesatare',due_date:dueDate(row),target_company:company,target_email:email||null,subject_hint:type==='gc_project_outreach_draft'?`Fabrication support · ${project.slice(0,130)}`:`GC contact research · ${company}`,draft_brief:brief,payload:{engine_version:VERSION,routing_basis:'ted_construction_award_scope',award_role:'gc_epc',award_role_confidence:precision.score>=94?'high':'medium',corporate_company_type:'unknown',precision_version:PRECISION_VERSION,winner_domain_verified:!!email,human_approval_required:true},updated_at:new Date().toISOString()};
  if(mode==='apply'){
    await rest(access,'pppp_opportunity_actions?on_conflict=action_key',{method:'POST',body:[body],prefer:'resolution=merge-duplicates,return=minimal'});
    await rest(access,'tasks?on_conflict=source,source_ref',{method:'POST',body:[{project_id:row.project_id||null,title:body.subject_hint,detail:brief,due_date:body.due_date,priority:body.priority,status:'hapur',source:'opportunity_engine_v2',contact_email:email||null,category:'klient',source_ref:`OPPORTUNITY:${row.id}:${type}`}],prefer:'resolution=merge-duplicates,return=minimal'});
  }
  return{type,key,company,email:email||null};
}
async function writeSummary(s){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-gc-project-role-fallback-v1.json',JSON.stringify(s,null,2));}
export async function runTedGcProjectRoleFallbackV1({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_GC_MIN_SCORE||82),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const access=await resolveSupabaseWorkflowAccess({supabaseUrl});
  const [rows,outreach]=await Promise.all([
    rest(access,'kek_tender_watch?select=*&relevance_score=gte.82&order=published_date.desc&limit=2000'),
    rest(access,'pppp_ted_sales_outreach_v1?select=*&limit=3000')
  ]);
  const outreachBy=new Map(array(outreach).map(x=>[String(x.tender_watch_id),x]));
  const candidates=array(rows).filter(r=>{const p=payload(r),w=winner(r),type=String(w.company_type||w.company_classification?.company_type||'unknown');return String(p.source||'').toUpperCase()==='TED'&&p.notice_phase==='award'&&p.discovery_lane==='gc_project_award'&&r.status!=='ignored'&&type==='unknown'&&names(w).length===1&&isConstructionDeliveryAward(r);});
  const routed=[];
  for(const row of candidates){
    const precision=evaluateGcAwardPrecision(row,{minScore});
    if(!precision.relevant)continue;
    const p=payload(row),now=new Date().toISOString(),role={version:VERSION,type:'gc_epc',confidence:precision.score>=94?'high':'medium',basis:'ted_construction_award_scope',precision_version:PRECISION_VERSION,assigned_at:now};
    if(mode==='apply')await rest(access,`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{payload:{...p,award_role:role,cooperation_angle:p.cooperation_angle==='verify_company_role'?'steel_fabrication_subcontractor':p.cooperation_angle},updated_at:now},prefer:'return=minimal'});
    const o=outreachBy.get(String(row.id)),alreadyContacted=!!o&&(['sent','replied','meeting'].includes(String(o.outreach_status||'').toLowerCase())||o.replied||o.meeting||o.closed);
    if(alreadyContacted){routed.push({id:row.id,company:names(w)[0],skipped:'already_contacted'});continue;}
    const action=await upsertAction(access,row,bestEmail(row,o),precision,mode);
    routed.push({id:row.id,score:precision.score,...action});
  }
  const summary={mode,version:VERSION,auth_mode:access.authMode,candidates:candidates.length,routed:routed.length,with_draft:routed.filter(x=>x.type==='gc_project_outreach_draft').length,contact_research:routed.filter(x=>x.type==='gc_contact_research').length,already_contacted:routed.filter(x=>x.skipped==='already_contacted').length,rows:routed,generated_at:new Date().toISOString()};
  await writeSummary(summary);console.log(`TED GC project-role fallback ${mode}: candidates=${summary.candidates}, routed=${summary.routed}, drafts=${summary.with_draft}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;if(direct)runTedGcProjectRoleFallbackV1().catch(async e=>{try{await writeSummary({error:String(e?.message||e),version:VERSION});}catch{}console.error(e);process.exit(1);});
