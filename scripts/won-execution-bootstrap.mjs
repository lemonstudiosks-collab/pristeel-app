import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const SOURCE='execution_won';
const STAGE_ORDER=['rfq_in','technical_review','supplier_selection','pricing','client_offer','commercial','production_control','factory_audit','transport'];
const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

export function isWonStatus(value){return /^(fituar|won|closedwon)$/.test(norm(value));}
export function isTerminalStatus(value){return /^(mbyllur|closed|realizuar|arkivuar|humbur|lost|closedlost|cancelled)$/.test(norm(value));}
export function addDays(dateValue,days){
  const raw=/^\d{4}-\d{2}-\d{2}$/.test(text(dateValue))?text(dateValue):new Date().toISOString().slice(0,10);
  const d=new Date(`${raw}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
function context(project){return [text(project.client),text(project.ref)].filter(Boolean).join(' · ');}
function task(project,key,title,days,category,priority,today){return{
  project_id:project.id,
  title:`[AUTO] ${title}`,
  detail:[text(project.name)||'Projekt',context(project)].filter(Boolean).join(' · '),
  due_date:addDays(today,days),
  priority,
  status:'hapur',
  done_at:null,
  source:SOURCE,
  source_ref:`${project.id}:${key}`,
  contact_email:null,
  category
};}

/* Initial bootstrap contract kept stable for legacy governance/tests. */
export function buildExecutionTasks(project,{hasSupplier=false,today}={}){
  if(!project?.id)return[];
  const rows=[
    task(project,'scope_lock','Finalizo scope-in dhe paketën e ekzekutimit',1,'intern','e larte',today),
    task(project,'buyer_confirmation','Konfirmo fillimin e ekzekutimit me klientin',1,'klient','e larte',today),
    task(project,'execution_schedule','Konfirmo planin e prodhimit / dorëzimit',3,hasSupplier?'furnitor':'intern','mesatare',today)
  ];
  if(hasSupplier)rows.splice(2,0,task(project,'supplier_confirmation','Konfirmo furnitorin / prodhuesin para porosisë finale',1,'furnitor','e larte',today));
  return rows;
}

/* Stage-aware checklist is additive and idempotent. It never changes stage/status. */
export function buildStageTasks(project,{hasSupplier=false,today,stage='production_control'}={}){
  if(!project?.id)return[];
  if(stage==='factory_audit')return[
    task(project,'quality_dossier','Verifiko dosjen e cilësisë dhe dokumentet para release-it',1,'intern','e larte',today),
    task(project,'factory_audit_release','Kryej auditin / release-in e prodhimit para transportit',2,'intern','e larte',today)
  ];
  if(stage==='transport')return[
    task(project,'transport_plan','Konfirmo transportin, adresën dhe dritaren e dorëzimit',1,'intern','e larte',today),
    task(project,'shipping_docs','Përgatit dhe verifiko CMR / dokumentet finale të dërgesës',1,'intern','e larte',today),
    task(project,'client_invoice','Kontrollo dhe lësho faturën e klientit sipas kushteve reale',2,'intern','e larte',today),
    task(project,'payment_terms_capture','Regjistro afatin real të pagesës dhe planifiko follow-up-in financiar',3,'intern','mesatare',today),
    task(project,'closure_review','Konfirmo dorëzimin final dhe gatishmërinë për Realizuar / Mbyllur',5,'intern','mesatare',today)
  ];
  const rows=buildExecutionTasks(project,{hasSupplier,today});
  rows.push(task(project,'production_docs','Kontrollo vizatimet e prodhimit dhe dokumentacionin teknik aktiv',5,'intern','mesatare',today));
  return rows;
}
function stageRank(stage){const i=STAGE_ORDER.indexOf(text(stage));return i<0?-1:i;}
function taskBaseDate(project,patch,today){
  const raw=text(project.execution_bootstrapped_at||patch?.execution_bootstrapped_at).slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:today;
}

export function planExecutionBootstrap({projects=[],wonOffers=[],invoicesOut=[],supplierOffers=[],rfqs=[],existingTasks=[],today=new Date().toISOString().slice(0,10),nowIso=new Date().toISOString()}){
  const byId=new Map((projects||[]).map(p=>[String(p.id),p]));
  const wonIds=new Set();
  const wonOfferIds=new Set();
  const invoiceEvidenceIds=new Set();
  for(const p of projects||[])if(isWonStatus(p.status))wonIds.add(String(p.id));
  for(const o of wonOffers||[])if(o?.project_id){const id=String(o.project_id);wonIds.add(id);wonOfferIds.add(id);}
  for(const inv of invoicesOut||[]){
    if(!inv?.project_id)continue;
    const id=String(inv.project_id),p=byId.get(id);
    if(p&&stageRank(p.pipeline_stage)>=stageRank('production_control')){wonIds.add(id);invoiceEvidenceIds.add(id);}
  }

  const supplierProjects=new Set();
  for(const o of supplierOffers||[])if(o?.project_id)supplierProjects.add(String(o.project_id));
  for(const r of rfqs||[])if(r?.project_id)supplierProjects.add(String(r.project_id));
  const existingRefs=new Set((existingTasks||[]).filter(t=>text(t.source)===SOURCE&&text(t.source_ref)).map(t=>text(t.source_ref)));

  const projectPatches=[];const taskCreates=[];const skipped=[];
  for(const id of wonIds){
    const p=byId.get(id);if(!p){skipped.push({project_id:id,reason:'missing_project'});continue;}
    if(isTerminalStatus(p.status)){skipped.push({project_id:id,reason:'terminal_status'});continue;}
    const alreadyBootstrapped=!!text(p.execution_bootstrapped_at);
    const patch={};
    if(!isWonStatus(p.status))patch.status='fituar';
    if(stageRank(p.pipeline_stage)<stageRank('production_control'))patch.pipeline_stage='production_control';

    if(!alreadyBootstrapped){
      const bootstrapSource=isWonStatus(p.status)?'project_status':wonOfferIds.has(id)?'won_quote':invoiceEvidenceIds.has(id)?'invoice_execution':'won_evidence';
      patch.execution_bootstrapped_at=nowIso;
      patch.execution_bootstrap_source=bootstrapSource;
      for(const t of buildExecutionTasks(p,{hasSupplier:supplierProjects.has(id),today})){
        if(!existingRefs.has(t.source_ref)){taskCreates.push(t);existingRefs.add(t.source_ref);}
      }
    }

    if(Object.keys(patch).length)projectPatches.push({project:p,patch,alreadyBootstrapped});
  }
  return{projectPatches,taskCreates,skipped,wonProjectIds:[...wonIds]};
}

export function planExecutionStageTasks({projects=[],supplierOffers=[],rfqs=[],existingTasks=[],baseTaskCreates=[],projectPatches=[],eligibleProjectIds=[],today=new Date().toISOString().slice(0,10)}){
  const byId=new Map((projects||[]).map(p=>[String(p.id),p]));
  const eligible=new Set((eligibleProjectIds||[]).map(String));
  if(!eligible.size)for(const p of projects||[])if(isWonStatus(p.status))eligible.add(String(p.id));
  const supplierProjects=new Set();
  for(const o of supplierOffers||[])if(o?.project_id)supplierProjects.add(String(o.project_id));
  for(const r of rfqs||[])if(r?.project_id)supplierProjects.add(String(r.project_id));
  const patchMap=new Map((projectPatches||[]).map(x=>[String(x?.project?.id||''),x.patch||{}]));
  const existingRefs=new Set();
  for(const t of [...(existingTasks||[]),...(baseTaskCreates||[])])if(text(t.source)===SOURCE&&text(t.source_ref))existingRefs.add(text(t.source_ref));
  const taskCreates=[];const skipped=[];
  for(const id of eligible){
    const p=byId.get(id);if(!p){skipped.push({project_id:id,reason:'missing_project'});continue;}
    const patch=patchMap.get(id)||{};
    const effectiveStatus=text(patch.status||p.status);
    if(isTerminalStatus(effectiveStatus)){skipped.push({project_id:id,reason:'terminal_status'});continue;}
    const stage=text(patch.pipeline_stage||p.pipeline_stage);
    if(stageRank(stage)<stageRank('production_control')){skipped.push({project_id:id,reason:'pre_execution_stage'});continue;}
    const stageKey=stage==='transport'?'transport':stage==='factory_audit'?'factory_audit':'production_control';
    const baseDate=taskBaseDate(p,patch,today);
    for(const t of buildStageTasks(p,{hasSupplier:supplierProjects.has(id),today:baseDate,stage:stageKey})){
      if(!existingRefs.has(t.source_ref)){taskCreates.push(t);existingRefs.add(t.source_ref);}
    }
  }
  return{taskCreates,skipped};
}

export function combineExecutionTasks({basePlan,stagePlan,projects=[]}){
  const byId=new Map((projects||[]).map(p=>[String(p.id),p]));
  const patchMap=new Map((basePlan?.projectPatches||[]).map(x=>[String(x?.project?.id||''),x.patch||{}]));
  const keepBase=(basePlan?.taskCreates||[]).filter(t=>{
    const p=byId.get(String(t.project_id));if(!p)return true;
    const patch=patchMap.get(String(t.project_id))||{};
    const stage=text(patch.pipeline_stage||p.pipeline_stage);
    return stageRank(stage)<=stageRank('production_control');
  });
  const seen=new Set();const out=[];
  for(const t of [...keepBase,...(stagePlan?.taskCreates||[])]){if(!t?.source_ref||seen.has(t.source_ref))continue;seen.add(t.source_ref);out.push(t);}
  return out;
}

async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){
  const res=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await res.text();if(!res.ok)throw new Error(`${method} ${path} failed: HTTP ${res.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];
}
async function readState(access){
  const{supabaseUrl,apiKey,bearerToken}=access;
  const [projects,wonOffers,invoicesOut,supplierOffers,rfqs,tasks]=await Promise.all([
    rest({supabaseUrl,apiKey,bearerToken,path:'projects?select=id,name,client,ref,status,pipeline_stage,deal_type,deadline,execution_bootstrapped_at,execution_bootstrap_source&limit=5000'}),
    rest({supabaseUrl,apiKey,bearerToken,path:'documents_registry?series=eq.QUO&followup_status=eq.won&project_id=not.is.null&select=id,project_id,doc_nr,created_at&limit=5000'}),
    rest({supabaseUrl,apiKey,bearerToken,path:'invoices_out?select=id,project_id,invoice_nr,date,paid&project_id=not.is.null&limit=5000'}),
    rest({supabaseUrl,apiKey,bearerToken,path:'offers?select=id,project_id,supplier&project_id=not.is.null&limit=10000'}),
    rest({supabaseUrl,apiKey,bearerToken,path:'rfq_log?select=id,project_id,supplier_name,status&project_id=not.is.null&limit=10000'}),
    rest({supabaseUrl,apiKey,bearerToken,path:`tasks?select=id,project_id,status,source,source_ref&source=eq.${SOURCE}&limit=10000`})
  ]);return{projects,wonOffers,invoicesOut,supplierOffers,rfqs,tasks};
}
async function applyPlan({access,plan}){
  const{supabaseUrl,apiKey,bearerToken}=access;
  if(plan.taskCreates.length)await rest({supabaseUrl,apiKey,bearerToken,path:'tasks?on_conflict=source,source_ref',method:'POST',body:plan.taskCreates,prefer:'resolution=merge-duplicates,return=minimal'});
  for(const item of plan.projectPatches)await rest({supabaseUrl,apiKey,bearerToken,path:`projects?id=eq.${encodeURIComponent(item.project.id)}`,method:'PATCH',body:item.patch,prefer:'return=minimal'});
}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/won-execution-bootstrap.json',JSON.stringify(summary,null,2));}
export async function runWonExecutionBootstrap({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',
  bearerToken='',
  mode=process.env.SYNC_MODE||'preview',
  today=process.env.SYNC_TODAY||new Date().toISOString().slice(0,10),
  nowIso=new Date().toISOString()
}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
  const state=await readState(access);
  const basePlan=planExecutionBootstrap({projects:state.projects,wonOffers:state.wonOffers,invoicesOut:state.invoicesOut,supplierOffers:state.supplierOffers,rfqs:state.rfqs,existingTasks:state.tasks,today,nowIso});
  const stagePlan=planExecutionStageTasks({projects:state.projects,supplierOffers:state.supplierOffers,rfqs:state.rfqs,existingTasks:state.tasks,baseTaskCreates:basePlan.taskCreates,projectPatches:basePlan.projectPatches,eligibleProjectIds:basePlan.wonProjectIds,today});
  const taskCreates=combineExecutionTasks({basePlan,stagePlan,projects:state.projects});
  const plan={...basePlan,taskCreates,skipped:[...basePlan.skipped,...stagePlan.skipped]};
  if(mode==='apply')await applyPlan({access,plan});
  const summary={mode,auth_mode:access.authMode,today,won_projects:plan.wonProjectIds.length,project_patches:plan.projectPatches.length,tasks_create:plan.taskCreates.length,skipped:plan.skipped.length,projects:plan.projectPatches.map(x=>({id:x.project.id,name:x.project.name,already_bootstrapped:x.alreadyBootstrapped,patch:x.patch})),tasks:plan.taskCreates.map(t=>({project_id:t.project_id,title:t.title,due_date:t.due_date,category:t.category,source_ref:t.source_ref}))};
  await writeSummary(summary);console.log(`Won execution bootstrap ${mode} (${summary.auth_mode}): ${summary.won_projects} won project(s), ${summary.project_patches} project patch(es), ${summary.tasks_create} task(s).`);return summary;
}
const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runWonExecutionBootstrap().catch(async e=>{const s={mode:process.env.SYNC_MODE||'preview',error:String(e?.message||e)};try{await writeSummary(s);}catch{}console.error(s.error);process.exit(1);});
