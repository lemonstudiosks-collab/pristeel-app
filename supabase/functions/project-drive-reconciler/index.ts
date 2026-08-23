import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const SA_JSON=Deno.env.get('GOOGLE_SA_JSON')||'';
const DRIVE_USER=Deno.env.get('GMAIL_USER')||'';
const ROOT_FOLDER_NAME='PRISTEEL — Projektet';
const FOLDER_MIME='application/vnd.google-apps.folder';
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret',
  'Access-Control-Allow-Methods':'POST, GET, OPTIONS',
  'Content-Type':'application/json'
};

function text(v:any){return String(v??'').trim();}
function safeName(v:any){return text(v||'Projekt').replace(/[\\/:*?"<>|]/g,'-').slice(0,90)||'Projekt';}
function b64url(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function pem(p:string){const x=p.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');const bin=atob(x),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b.buffer;}
function escDriveQuery(v:string){return v.replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

let cached:{token:string,exp:number}|null=null;
async function driveToken(){
  const now=Math.floor(Date.now()/1000);
  if(cached&&cached.exp>now+90)return cached.token;
  if(!SA_JSON||!DRIVE_USER)throw new Error('Google service account or delegated Drive user is not configured.');
  const sa=JSON.parse(SA_JSON),head={alg:'RS256',typ:'JWT'};
  const claim={iss:sa.client_email,sub:DRIVE_USER,scope:'https://www.googleapis.com/auth/drive',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const unsigned=`${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(claim))}`;
  const key=await crypto.subtle.importKey('pkcs8',pem(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const assertion=`${unsigned}.${b64url(sig)}`;
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  const j=await r.json();if(!r.ok)throw new Error(`Google token ${r.status}: ${text(j?.error_description||j?.error).slice(0,300)}`);
  cached={token:j.access_token,exp:now+Number(j.expires_in||3600)};return cached.token;
}
async function drive(path:string,options:any={}){
  const token=await driveToken();
  const r=await fetch(`https://www.googleapis.com/drive/v3${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
  const raw=await r.text();let j:any={};try{j=raw?JSON.parse(raw):{};}catch{j={raw};}
  if(!r.ok)throw new Error(`Google Drive ${r.status}: ${text(j?.error?.message||raw).slice(0,500)}`);
  return j;
}
async function findFolders(name:string,parentId:string|null){
  let q=`name='${escDriveQuery(name)}' and mimeType='${FOLDER_MIME}' and trashed=false`;
  if(parentId)q+=` and '${escDriveQuery(parentId)}' in parents`;
  const p=new URLSearchParams({q,spaces:'drive',fields:'files(id,name,webViewLink,parents)',pageSize:'20'});
  const j=await drive(`/files?${p.toString()}`);return Array.isArray(j.files)?j.files:[];
}
async function createFolder(name:string,parentId:string|null){
  const body:any={name,mimeType:FOLDER_MIME};if(parentId)body.parents=[parentId];
  return drive('/files?fields=id,name,webViewLink,parents',{method:'POST',body:JSON.stringify(body)});
}
async function root(mode:string){
  const found=await findFolders(ROOT_FOLDER_NAME,null);
  if(found.length===1)return{folder:found[0],created:false};
  if(found.length>1)throw new Error(`Multiple root folders named ${ROOT_FOLDER_NAME}; human review required.`);
  if(mode!=='apply')return{folder:null,created:false};
  return{folder:await createFolder(ROOT_FOLDER_NAME,null),created:true};
}
async function authorized(req:Request){const provided=req.headers.get('x-pppp-cron-secret')||'';if(!provided)return false;const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});return !error&&data===true;}

async function reconcile(mode='preview',limit=10){
  const max=Math.max(1,Math.min(25,Number(limit)||10));
  const {data:projects,error}=await db.from('projects')
    .select('id,name,client,ref,status,drive_folder_id,drive_folder_url,created_at')
    .is('drive_folder_id',null)
    .is('drive_folder_url',null)
    .not('status','in','("humbur","lost","arkivuar","archived","mbyllur","closed","realizuar")')
    .order('created_at',{ascending:true}).limit(max);
  if(error)throw error;
  const summary:any={mode,checked:(projects||[]).length,linked:0,created:0,ambiguous:0,errors:0,root_created:false,items:[]};
  if(!(projects||[]).length)return summary;
  const rr=await root(mode);summary.root_created=rr.created;
  if(!rr.folder){for(const p of projects||[])summary.items.push({project_id:p.id,name:p.name,action:'would_create_root_then_reconcile'});return summary;}
  for(const p of projects||[]){
    try{
      const name=safeName(p.name),found=await findFolders(name,rr.folder.id);
      if(found.length>1){summary.ambiguous++;summary.items.push({project_id:p.id,name,action:'review',reason:'multiple_matching_folders',matches:found.map((x:any)=>x.id)});continue;}
      let folder=found[0]||null,created=false;
      if(!folder&&mode==='apply'){folder=await createFolder(name,rr.folder.id);created=true;}
      if(mode!=='apply'){summary.items.push({project_id:p.id,name,action:folder?'would_link_existing':'would_create'});continue;}
      if(!folder)continue;
      const url=folder.webViewLink||`https://drive.google.com/drive/folders/${folder.id}`;
      const {data:updated,error:patchError}=await db.from('projects').update({drive_folder_id:folder.id,drive_folder_url:url,updated_at:new Date().toISOString()}).eq('id',p.id).is('drive_folder_id',null).select('id').limit(1);
      if(patchError)throw patchError;
      if((updated||[]).length){summary.linked++;if(created)summary.created++;summary.items.push({project_id:p.id,name,action:created?'created_and_linked':'linked_existing',folder_id:folder.id});}
      else summary.items.push({project_id:p.id,name,action:'skipped_already_linked'});
    }catch(e){summary.errors++;summary.items.push({project_id:p.id,name:p.name,action:'error',error:text((e as any)?.message||e).slice(0,600)});}
  }
  return summary;
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:cors});
  try{
    const u=new URL(req.url);let body:any={};if(req.method==='POST')try{body=await req.json();}catch{}
    const mode=text(u.searchParams.get('mode')||body.mode||'preview').toLowerCase();
    if(!['preview','apply'].includes(mode))return new Response(JSON.stringify({ok:false,error:'mode must be preview or apply'}),{status:400,headers:cors});
    const limit=Number(u.searchParams.get('limit')||body.limit||10);
    const result=await reconcile(mode,limit);
    return new Response(JSON.stringify({ok:true,...result}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:text((e as any)?.message||e)}),{status:500,headers:cors});}
});
