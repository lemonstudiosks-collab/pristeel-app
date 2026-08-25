import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const INTERNAL_DOMAIN='prissteel.com';

function str(v){return String(v??'');}
function clean(v){return str(v).trim();}
function list(v){if(Array.isArray(v))return v;if(typeof v==='string'&&v.trim()){try{const parsed=JSON.parse(v);return Array.isArray(parsed)?parsed:[];}catch{return v.split(',').map(x=>x.trim()).filter(Boolean);}}return[];}
export function normalizeEmail(value){
  let v=clean(value).toLowerCase();
  const angle=v.match(/<([^<>]+)>/);if(angle)v=angle[1].trim();
  v=v.replace(/^mailto:/,'').replace(/[>,;]+$/g,'').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?v:'';
}
export function isExternalEmail(value){
  const email=normalizeEmail(value);if(!email)return false;
  const [local,domain]=email.split('@');
  if(domain===INTERNAL_DOMAIN||domain.endsWith(`.${INTERNAL_DOMAIN}`))return false;
  if(/^(?:no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?)(?:[+._-]|$)/i.test(local))return false;
  return true;
}
export function isRfqSubject(subject){
  const s=clean(subject).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return /\brfq\b|request\s+for\s+(?:quotation|quote|offer)|kerkese\s+per\s+oferte|zahtev\s+za\s+ponudu|upit\s+za\s+ponudu/.test(s);
}
function supplierNameFromEmail(email){
  const domain=normalizeEmail(email).split('@')[1]||'';
  const root=domain.split('.')[0]||domain;
  return root.replace(/[-_]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())||email;
}
function subjectKey(subject){return clean(subject).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function existingKey(projectId,email,subject){return `${clean(projectId)}|${normalizeEmail(email)}|${subjectKey(subject)}`;}
export function planRfqEmailRows(emails=[],existing=[]){
  const known=new Set(existing.map(r=>existingKey(r.project_id,r.supplier_email,r.subject)));
  const rows=[];
  for(const email of emails){
    if(!email?.project_id||email?.needs_review===true)continue;
    if(clean(email.direction).toLowerCase()!=='outgoing')continue;
    if(!isRfqSubject(email.subject))continue;
    const recipients=list(email.to_emails).map(normalizeEmail).filter(isExternalEmail);
    for(const recipient of [...new Set(recipients)]){
      const key=existingKey(email.project_id,recipient,email.subject);if(known.has(key))continue;
      known.add(key);
      rows.push({
        project_id:email.project_id,
        project_name:clean(email.project_name)||null,
        supplier_name:supplierNameFromEmail(recipient),
        supplier_email:recipient,
        lang:'en',
        subject:clean(email.subject)||'RFQ',
        body:clean(email.snippet)||null,
        sent_at:email.sent_at||null,
        status:'sent',
        notes:`Auto-created from linked outgoing Gmail message ${clean(email.gmail_message_id)||'unknown'} by project-rfq-email-reconcile.`
      });
    }
  }
  return rows;
}

async function request({supabaseUrl,key,path,method='GET',body,prefer='return=minimal'}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',Prefer:prefer},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: ${response.status} ${raw.slice(0,700)}`);if(response.status===204||!raw)return[];return JSON.parse(raw);
}
async function fetchAll(access,table,select='*'){const rows=[];for(let offset=0;;offset+=1000){const batch=await request({...access,path:`${table}?select=${encodeURIComponent(select)}&limit=1000&offset=${offset}`});rows.push(...batch);if(batch.length<1000)break;}return rows;}
async function insertRows(access,rows){for(let i=0;i<rows.length;i+=100){const chunk=rows.slice(i,i+100);if(chunk.length)await request({...access,path:'rfq_log',method:'POST',body:chunk});}}
async function writeSummary(report){await mkdir('tmp',{recursive:true});await writeFile('tmp/project-rfq-email-reconcile.json',JSON.stringify(report,null,2));}

export async function runProjectRfqEmailReconcile({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||'',
  mode=process.env.RFQ_EMAIL_RECONCILE_MODE||process.env.SYNC_MODE||(String(process.env.APPLY||'false').toLowerCase()==='true'?'apply':'preview')
}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported RFQ_EMAIL_RECONCILE_MODE: ${mode}`);
  if(!key)throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY');
  const access={supabaseUrl,key};
  const [projects,emails,existing]=await Promise.all([
    fetchAll(access,'projects','id,name'),
    fetchAll(access,'project_emails','gmail_message_id,project_id,sent_at,direction,subject,to_emails,snippet,needs_review'),
    fetchAll(access,'rfq_log','id,project_id,supplier_email,subject')
  ]);
  const names=new Map(projects.map(p=>[clean(p.id),clean(p.name)]));
  const enriched=emails.map(row=>({...row,project_name:names.get(clean(row.project_id))||''}));
  const candidates=planRfqEmailRows(enriched,existing);
  if(mode==='apply')await insertRows(access,candidates);
  const report={mode,emails:emails.length,existing_rfq:existing.length,candidates:candidates.length,applied:mode==='apply'?candidates.length:0,rows:candidates};
  await writeSummary(report);
  console.log(JSON.stringify(report,null,2));
  console.log(`PROJECT_RFQ_EMAIL_RECONCILE_SUMMARY mode=${mode} emails=${report.emails} existing_rfq=${report.existing_rfq} candidates=${report.candidates} applied=${report.applied}`);
  return report;
}

const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runProjectRfqEmailReconcile().catch(async error=>{const report={mode:process.env.RFQ_EMAIL_RECONCILE_MODE||process.env.SYNC_MODE||'preview',error:String(error?.message||error)};try{await writeSummary(report);}catch{}console.error(report.error);process.exit(1);});
