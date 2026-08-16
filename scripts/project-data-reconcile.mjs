import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const TABLES=[
  {name:'documents_registry',select:'*'},
  {name:'offers',select:'*'},
  {name:'bom_items',select:'*'},
  {name:'rfq_log',select:'*'},
  {name:'project_docs',select:'*'},
  {name:'project_attachment_links',select:'*'},
  {name:'offers_inbox',select:'id,created_at,gmail_msg_id,sender,subject,received_at,snippet,file_name,processed,project_id'},
  {name:'files',select:'id,file_name,file_type,size_kb,created_at,project_id,page_context'}
];
const MIN_PREVIEW_SCORE=820;
const MIN_APPLY_SCORE=960;
const MIN_APPLY_MARGIN=150;

export function norm(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function unique(values){return[...new Set(values.filter(Boolean))];}
function aliasText(project){return Array.isArray(project?.identity_aliases)?project.identity_aliases.join(' '):'';}
export function identifiers(project){const source=norm(`${project?.name||''} ${project?.ref||''} ${project?.business_ref||''} ${aliasText(project)}`);return unique(source.match(/\b(?:[a-z]{1,6}[-_\/]?)?\d{4,}(?:[-_\/]?[a-z0-9]+)*\b/g)||[]);}
export function projectProfile(project){return{...project,nName:norm(project?.name),nRef:norm(project?.business_ref||project?.ref),ids:identifiers(project)};}
function primitiveText(row){return norm(Object.entries(row||{}).filter(([key,value])=>key!=='file_base64'&&value!=null&&typeof value!=='object').map(([,value])=>value).join(' '));}
function dedicatedValues(row){const keys=['project','project_name','project_ref','project_business_ref','business_ref','ref','reference','rfq_ref','request_ref','title','subject','doc_nr','document_nr','file_name','filename'];return keys.map(key=>norm(row?.[key])).filter(Boolean);}
export function relationScore(row,project){const dedicated=dedicatedValues(row),text=primitiveText(row);let points=0;if(project.nName&&dedicated.some(v=>v===project.nName))points=Math.max(points,1200);if(project.nRef&&dedicated.some(v=>v===project.nRef))points=Math.max(points,1180);if(project.nRef&&project.nRef.length>=4&&dedicated.some(v=>v.includes(project.nRef)))points=Math.max(points,1050);if(project.nName&&project.nName.length>=7&&dedicated.some(v=>v.includes(project.nName)||project.nName.includes(v)))points=Math.max(points,980);if(project.ids.some(id=>dedicated.some(v=>v.includes(id))))points=Math.max(points,960);if(project.ids.some(id=>text.includes(id)))points=Math.max(points,900);if(project.nRef&&project.nRef.length>=4&&text.includes(project.nRef))points=Math.max(points,850);if(project.nName&&project.nName.length>=10&&text.includes(project.nName))points=Math.max(points,820);return points;}

export function planProjectRelation(row,projects,validProjectIds){
  const current=row?.project_id==null?'':String(row.project_id);
  const ranked=(projects||[]).map(project=>({project,score:relationScore(row,project)})).filter(x=>x.score>=MIN_PREVIEW_SCORE).sort((a,b)=>b.score-a.score);
  if(current&&validProjectIds.has(current)){
    const conflict=ranked.length&&String(ranked[0].project.id)!==current&&ranked[0].score>=MIN_APPLY_SCORE;
    return{kind:conflict?'conflict':'already_linked',current,ranked,safe:false};
  }
  const best=ranked[0]||null,second=ranked[1]||null;
  const margin=best?(second?best.score-second.score:9999):0;
  const safe=!!best&&best.score>=MIN_APPLY_SCORE&&margin>=MIN_APPLY_MARGIN;
  return{kind:safe?'repair':'unresolved',current,ranked,best,second,margin,safe};
}

function strictNumber(raw,{allowDecimal=false}={}){
  const s=String(raw||'').trim();
  if(/^\d+$/.test(s))return Number(s);
  if(/^\d{1,3}(?:\s\d{3})+$/.test(s))return Number(s.replace(/\s/g,''));
  if(allowDecimal&&/^\d+[.,]\d{1,2}$/.test(s))return Number(s.replace(',','.'));
  return null;
}
function explicitLabelValue(textValue,labels,{allowDecimal=false}={}){
  const source=String(textValue||'');
  for(const label of labels){
    const re=new RegExp(`(?:^|[\\n;|])\\s*${label}\\s*[:=]\\s*([0-9][0-9 .,:]*)`,'i');
    const m=source.match(re);if(!m)continue;
    const token=String(m[1]||'').trim().split(/[^0-9., ]/)[0].trim();
    const value=strictNumber(token,{allowDecimal});
    if(value!=null&&Number.isFinite(value)&&value>=0)return value;
    return null;
  }
  return null;
}
export function offerFieldPatch(offer){
  const source=[offer?.notes,offer?.raw_text].filter(Boolean).join('\n');
  const patch={};
  if(offer?.qty_kg==null){const qty=explicitLabelValue(source,['qty[_ ]?kg','quantity[_ ]?kg']);if(qty!=null)patch.qty_kg=qty;}
  if(offer?.transport_eur==null){const transport=explicitLabelValue(source,['transport[_ ]?eur','transport[_ ]?total[_ ]?eur'],{allowDecimal:true});if(transport!=null)patch.transport_eur=transport;}
  return patch;
}
export function planOfferFieldRepairs(offers=[]){
  const candidates=[],ambiguous=[];
  for(const offer of offers){
    const patch=offerFieldPatch(offer);
    if(Object.keys(patch).length)candidates.push({id:offer.id,project_id:offer.project_id||null,supplier:offer.supplier||'',patch});
    else if((offer?.qty_kg==null||offer?.transport_eur==null)&&/(qty[_ ]?kg|transport[_ ]?eur)/i.test(String(offer?.notes||'')+' '+String(offer?.raw_text||'')))ambiguous.push({id:offer.id,project_id:offer.project_id||null,supplier:offer.supplier||'',reason:'explicit_label_present_but_number_not_unambiguous'});
  }
  return{candidates,ambiguous};
}

async function request({supabaseUrl,key,path,method='GET',body}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:'return=minimal'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: ${response.status} ${raw.slice(0,700)}`);if(response.status===204||!raw)return[];return JSON.parse(raw);
}
async function fetchAll(access,table,select='*'){const rows=[];for(let offset=0;;offset+=1000){const batch=await request({...access,path:`${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}`});rows.push(...batch);if(batch.length<1000)break;}return rows;}
async function patchRow(access,table,id,patch){await request({...access,path:`${table}?id=eq.${encodeURIComponent(id)}`,method:'PATCH',body:patch});}
async function writeSummary(report){await mkdir('tmp',{recursive:true});await writeFile('tmp/project-data-reconcile.json',JSON.stringify(report,null,2));}

export async function runProjectDataReconcile({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'',
  mode=process.env.SYNC_MODE||(String(process.env.APPLY||'false').toLowerCase()==='true'?'apply':'preview')
}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  if(!key)throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  const access={supabaseUrl,key};
  const projects=(await fetchAll(access,'projects','id,name,client,ref,business_ref,identity_aliases,status,created_at')).map(projectProfile);
  const validProjectIds=new Set(projects.map(p=>String(p.id)));
  const report={mode,projects:projects.length,project_relations:{applied:[],candidates:[],unresolved:[],conflicts:[]},offer_fields:{applied:[],candidates:[],ambiguous:[]},tables:{}};

  for(const table of TABLES){
    let rows;try{rows=await fetchAll(access,table.name,table.select);}catch(error){report.tables[table.name]={error:error.message};continue;}
    const stats={total:rows.length,alreadyLinked:0,repairCandidates:0,applied:0,unresolved:0,conflicts:0};
    for(const row of rows){
      const plan=planProjectRelation(row,projects,validProjectIds);
      if(plan.kind==='already_linked'){stats.alreadyLinked++;continue;}
      if(plan.kind==='conflict'){stats.conflicts++;report.project_relations.conflicts.push({table:table.name,id:row.id,currentProjectId:plan.current,suggestedProjectId:plan.ranked[0]?.project?.id||null,score:plan.ranked[0]?.score||0});continue;}
      if(plan.kind==='unresolved'){stats.unresolved++;report.project_relations.unresolved.push({table:table.name,id:row.id,label:row.doc_nr||row.file_name||row.subject||row.title||row.project||row.project_name||'',candidates:plan.ranked.slice(0,3).map(x=>({id:x.project.id,name:x.project.name,score:x.score}))});continue;}
      stats.repairCandidates++;const item={table:table.name,id:row.id,projectId:plan.best.project.id,project:plan.best.project.name,score:plan.best.score,margin:plan.margin};report.project_relations.candidates.push(item);
      if(mode==='apply'){await patchRow(access,table.name,row.id,{project_id:plan.best.project.id});stats.applied++;report.project_relations.applied.push(item);}
    }
    report.tables[table.name]=stats;
  }

  let offers=[];try{offers=await fetchAll(access,'offers','id,project_id,supplier,qty_kg,transport_eur,notes,raw_text');}catch(error){report.offer_fields.error=error.message;}
  if(offers.length){
    const fieldPlan=planOfferFieldRepairs(offers);report.offer_fields.candidates=fieldPlan.candidates;report.offer_fields.ambiguous=fieldPlan.ambiguous;
    if(mode==='apply')for(const item of fieldPlan.candidates){await patchRow(access,'offers',item.id,item.patch);report.offer_fields.applied.push(item);}
  }

  await writeSummary(report);
  console.log(JSON.stringify(report,null,2));
  console.log(`PROJECT_RECONCILE_SUMMARY mode=${mode} projects=${report.projects} relation_candidates=${report.project_relations.candidates.length} relation_applied=${report.project_relations.applied.length} unresolved=${report.project_relations.unresolved.length} conflicts=${report.project_relations.conflicts.length} offer_field_candidates=${report.offer_fields.candidates.length} offer_field_applied=${report.offer_fields.applied.length} offer_field_ambiguous=${report.offer_fields.ambiguous.length}`);
  return report;
}

const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runProjectDataReconcile().catch(async error=>{const report={mode:process.env.SYNC_MODE||'preview',error:String(error?.message||error)};try{await writeSummary(report);}catch{}console.error(report.error);process.exit(1);});
