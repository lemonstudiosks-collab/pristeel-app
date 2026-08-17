import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='winner-contact-rank-v1';
const LOW_VALUE_LOCAL=/^(hr|humanresources|human\.resources|jobs?|careers?|karriere|bewerbung|recruiting|recruitment|privacy|datenschutz|dpo|rechnung|invoice|buchhaltung|accounting|support|it|webmaster)([._+-]|$)/i;
const PURPOSE_WEIGHT={procurement:500,tender:450,sales:400,general:300,person:200,contact_point:180};
const text=v=>String(v==null?'':v).trim();
const unique=a=>[...new Set((a||[]).filter(Boolean).map(String))];
function payload(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function winner(r){const w=payload(r).winner;return w&&typeof w==='object'?w:{};}
function winnerNames(w){return unique([...(Array.isArray(w.names)?w.names:[]),w.name].map(text));}
function localPart(email){return text(email).split('@')[0]||'';}
function contactRank(c){
 if(!c||c.type!=='email'||!c.value)return-1;
 const local=localPart(c.value);if(LOW_VALUE_LOCAL.test(local))return 40;
 let score=PURPOSE_WEIGHT[c.purpose]??170;
 if(c.source_type==='TED')score+=25;
 if(c.source_type==='official_website')score+=15;
 if(c.confidence==='high')score+=15;else if(c.confidence==='medium')score+=5;
 score+=Math.min(20,Math.max(0,Number(c.score||0)/10));
 return score;
}
export function chooseBestWinnerEmail(row){
 const w=winner(row),names=winnerNames(w);if(names.length!==1)return null;
 const e=w.contact_enrichment;if(!e||!Array.isArray(e.organizations)||!e.organizations.length)return null;
 const org=e.organizations[0],emails=(Array.isArray(org&&org.contacts)?org.contacts:[]).filter(c=>c&&c.type==='email'&&c.value);
 if(!emails.length)return null;
 return emails.map(c=>({contact:c,rank:contactRank(c)})).sort((a,b)=>b.rank-a.rank)[0]||null;
}
export function rankWinnerPayload(row,rankedAt=new Date().toISOString()){
 const best=chooseBestWinnerEmail(row);if(!best)return{changed:false,row,best:null};
 const p={...payload(row)},w={...winner(row)},selected=text(best.contact.value);if(!selected)return{changed:false,row,best:null};
 const prior=text(w.email);w.email=selected;w.emails=unique([...(Array.isArray(w.emails)?w.emails:[]),selected]);
 w.contact_ranking={version:VERSION,ranked_at:rankedAt,selected_email:selected,purpose:best.contact.purpose||null,source_type:best.contact.source_type||null,confidence:best.contact.confidence||null,rank:best.rank};
 p.winner=w;return{changed:prior.toLowerCase()!==selected.toLowerCase()||!winner(row).contact_ranking,row:{...row,payload:p},best};
}
async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await response.text();if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];}
async function patchRow(access,row){await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'PATCH',body:{payload:row.payload,updated_at:new Date().toISOString()},prefer:'return=minimal'});}
async function writeSummary(summary){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-winner-contact-ranking.json',JSON.stringify(summary,null,2));}
export async function runTedWinnerContactRanking({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_CONTACT_MIN_SCORE||85),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',bearerToken=''}={}){
 if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
 const access=apiKey?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}:await resolveSupabaseWorkflowAccess({supabaseUrl});
 const rows=await rest({...access,path:`kek_tender_watch?select=id,procurement_no,relevance_score,status,payload&relevance_score=gte.${encodeURIComponent(minScore)}&order=published_date.desc&limit=500`});
 const targets=(Array.isArray(rows)?rows:[]).filter(r=>{const p=payload(r);return String(p.source||'').toUpperCase()==='TED'&&p.notice_phase==='award'&&r.status!=='ignored'&&winner(r).contact_enrichment;});
 const results=[];
 for(const row of targets){const ranked=rankWinnerPayload(row);if(!ranked.changed)continue;if(mode==='apply')await patchRow(access,ranked.row);results.push({id:row.id,procurement_no:row.procurement_no,selected_email:ranked.best.contact.value,purpose:ranked.best.contact.purpose||null,source_type:ranked.best.contact.source_type||null,rank:ranked.best.rank});}
 const summary={mode,version:VERSION,auth_mode:access.authMode||'service_key',rows_scanned:targets.length,rows_changed:results.length,results};await writeSummary(summary);console.log(`TED winner contact ranking ${mode}: scanned=${summary.rows_scanned}, changed=${summary.rows_changed}.`);return summary;
}
const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedWinnerContactRanking().catch(async error=>{try{await writeSummary({error:String(error?.message||error),mode:process.env.SYNC_MODE||'preview'});}catch{}console.error(error?.message||error);process.exit(1);});
