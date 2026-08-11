import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const SOURCE='execution_won';
const STAGE_ORDER=['rfq_in','technical_review','supplier_selection','pricing','client_offer','commercial','production_control','factory_audit','transport'];
const text=v=>String(v==null?'':v).trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

export function isWonStatus(value){return /^(fituar|won|realizuar)$/.test(norm(value));}
export function isTerminalStatus(value){return /^(mbyllur|closed|arkivuar|humbur|lost)$/.test(norm(value));}
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
function stageRank(stage){const i=STAGE_ORDER.indexOf(text(stage));return i<0?-1:i;}
export function planExecutionBootstrap({projects=[],wonOffers=[],invoicesOut=[],supplierOffers=[],rfqs=[],existingTasks=[],today=new Date().toISOString().slice(0,10)}){
  const byId=new Map((projects||[]).map(p=>[String(p.id),p]));
  const wonIds=new Set();
  for(const p of projects||[])if(isWonStatus(p.status))wonIds.add(String(p.id));
  for(const o of wonOffers||[])if(o?.project_id)wonIds.add(String(o.project_id));
  for(const inv of invoicesOut||[]){
    if(!inv?.project_id)continue;
    const id=String(inv.project_id),p=byId.get(id);
    // A linked client invoice is treated as won evidence only once the project is already
    // in execution. This repairs stale "pritje" statuses without promoting early-stage projects.
    if(p&&stageRank(p.pipeline_stage)>=stageRank('production_control'))wonIds.add(id);
  }

  const supplierProjects=new Set();
  for(const o of supplierOffers||[])if(o?.project_id)supplierProjects.add(String(o.project_id));
  for(const r of rfqs||[])if(r?.project_id)supplierProjects.add(String(r.project_id));
  const existingRefs=new Set((existingTasks||[]).filter(t=>text(t.source)===SOURCE&&text(t.source_ref)).map(t=>text(t.source_ref)));

  const projectPatches=[];const taskCreates=[];const skipped=[];
  for(const id of wonIds){
    const p=byId.get(id);if(!p){skipped.push({project_id:id,reason:'missing_project'});continue;}
    if(isTerminalStatus(p.status)){skipped.push({project_id:id,reason:'terminal_status'});continue;}
    const patch={};
    if(!isWonStatus(p.status))patch.status='fituar';
    if(stageRank(p.pipeline_stage)<stageRank('production_control'))patch.pipeline_stage='production_control';
    if(Object.keys(patch).length)projectPatches.push({project:p,patch});

    for(const t of buildExecutionTasks(p,{hasSupplier:supplierProjects.has(id),today})){
      if(!existingRefs.has(t.source_ref)){taskCreates.push(t);existingRefs.add(t.source_ref);}
    }
  }
  return{projectPatches,taskCreates,skipped,wonProjectIds:[...wonIds]};
}
async function rest({supabaseUrl,apiKey,path,method='GET',body,prefer}){
  const res=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await res.text();if(!res.ok)throw new Error(`${method} ${path} failed: HTTP ${res.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];
}
async function readState({supabaseUrl,apiKey}){
  const [projects,wonOffers,invoicesOut,supplierOffers,rfqs,tasks]=await Promise.all([
    rest({supabaseUrl,apiKey,path:'projects?select=id,name,client,ref,status,pipeline_stage,deal_type,deadline&limit=5000'}),
    rest({supabaseUrl,apiKey,path:'documents_registry?series=eq.QUO&followup_status=eq.won&project_id=not.is.null&select=id,project_id,doc_nr,created_at&limit=5000'}),
    rest({supabaseUrl,apiKey,path:'invoices_out?select=id,project_id,invoice_nr,date,paid&project_id=not.is.null&limit=5000'}),
    rest({supabaseUrl,apiKey,path:'offers?select=id,project_id,supplier&project_id=not.is.null&limit=10000'}),
    rest({supabaseUrl,apiKey,path:'rfq_log?select=id,project_id,supplier_name,status&project_id=not.is.null&limit=10000'}),
    rest({supabaseUrl,apiKey,path:`tasks?select=id,project_id,status,source,source_ref&source=eq.${SOURCE}&limit=10000`})
  ]);return{projects,wonOffers,invoicesOut,supplierOffers,rfqs,tasks};
}
async function applyPlan({supabaseUrl,apiKey,plan}){
  for(const item of plan.projectPatches){
    await rest({supabaseUrl,apiKey,path:`projects?id=eq.${encodeURIComponent(item.project.id)}`,method:'PATCH',body:item.patch,prefer:'return=minimal'});
  }
  if(plan.taskCreates.length){
    await rest({supabaseUrl,apiKey,path:'tasks?on_conflict=source,source_ref',method:'POST',body:plan.taskCreates,prefer:'resolution=merge-duplicates,return=minimal'});
  }
}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/won-execution-bootstrap.json',JSON.stringify(summary,null,2));}
export async function runWonExecutionBootstrap({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'',
  mode=process.env.SYNC_MODE||'preview',
  today=process.env.SYNC_TODAY||new Date().toISOString().slice(0,10)
}={}){
  if(!apiKey)throw new Error('Supabase server-side key is not configured.');
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const state=await readState({supabaseUrl,apiKey});
  const plan=planExecutionBootstrap({projects:state.projects,wonOffers:state.wonOffers,invoicesOut:state.invoicesOut,supplierOffers:state.supplierOffers,rfqs:state.rfqs,existingTasks:state.tasks,today});
  if(mode==='apply')await applyPlan({supabaseUrl,apiKey,plan});
  const summary={mode,today,won_projects:plan.wonProjectIds.length,project_patches:plan.projectPatches.length,tasks_create:plan.taskCreates.length,skipped:plan.skipped.length,projects:plan.projectPatches.map(x=>({id:x.project.id,name:x.project.name,patch:x.patch})),tasks:plan.taskCreates.map(t=>({project_id:t.project_id,title:t.title,due_date:t.due_date,category:t.category,source_ref:t.source_ref}))};
  await writeSummary(summary);console.log(`Won execution bootstrap ${mode}: ${summary.won_projects} won project(s), ${summary.project_patches} project patch(es), ${summary.tasks_create} task(s).`);return summary;
}
const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runWonExecutionBootstrap().catch(async e=>{const s={mode:process.env.SYNC_MODE||'preview',error:String(e?.message||e)};try{await writeSummary(s);}catch{}console.error(s.error);process.exit(1);});
