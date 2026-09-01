import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='opportunity-protected-archive-runner-v1';
const text=(v,max=1000)=>String(v==null?'':v).trim().slice(0,max);

async function rest(access,path){const r=await fetch(`${access.supabaseUrl}/rest/v1/${path}`,{headers:{apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`}});const raw=await r.text();if(!r.ok)throw new Error(`GET ${path}: HTTP ${r.status} ${raw.slice(0,500)}`);return raw?JSON.parse(raw):[];}
async function analyze(access,tenderId){const r=await fetch(`${access.supabaseUrl}/functions/v1/pppp-tender-protected-archive-analysis`,{method:'POST',headers:{apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`,'Content-Type':'application/json'},body:JSON.stringify({tender_id:tenderId})});const raw=await r.text();let body=null;try{body=raw?JSON.parse(raw):null;}catch{}if(!r.ok||!body||body.ok===false)throw new Error(`archive analysis HTTP ${r.status}: ${text(body?.message||body?.error||raw,700)}`);return body;}
async function summaryFile(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/opportunity-protected-archive-v1.json',JSON.stringify(summary,null,2));}

export async function runProtectedArchiveAnalysis({supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,limit=Number(process.env.PPPP_PROTECTED_ARCHIVE_MAX||10)}={}){
 const access=await resolveSupabaseWorkflowAccess({supabaseUrl,serviceKey:''});if(access.authMode!=='pppp_sync_account')throw new Error(`Protected archive analysis requires PPPP sync account, got ${access.authMode}`);
 const rows=await rest(access,`pppp_tender_fetch_queue?select=tender_watch_id,status,updated_at&status=eq.ready&order=updated_at.asc&limit=${Math.max(1,Math.min(50,limit))}`);const results=[];
 for(const row of rows||[]){try{const out=await analyze(access,row.tender_watch_id);results.push({tender_watch_id:row.tender_watch_id,ok:true,recommendation:out.recommendation||null,documents:Array.isArray(out.documents)?out.documents.length:0,analyzed_at:out.analyzed_at||null});}catch(e){results.push({tender_watch_id:row.tender_watch_id,ok:false,error:text(e?.message||e,900)});}}
 const summary={version:VERSION,auth_mode:access.authMode,candidates:(rows||[]).length,succeeded:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,results,generated_at:new Date().toISOString()};await summaryFile(summary);console.log(`Protected archive analysis: candidates=${summary.candidates}, succeeded=${summary.succeeded}, failed=${summary.failed}.`);if(summary.failed)process.exitCode=1;return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;if(direct)runProtectedArchiveAnalysis().catch(async e=>{try{await summaryFile({version:VERSION,error:String(e?.message||e),generated_at:new Date().toISOString()});}catch{}console.error(e);process.exit(1);});
