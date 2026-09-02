import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
export const VERSION='ted-gc-award-precision-v3.0';
const text=(v,max=10000)=>String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,max);
const norm=v=>text(v,30000).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const array=v=>Array.isArray(v)?v:[];
const unique=a=>[...new Set(array(a).filter(Boolean).map(String))];
const GC_CPVS=new Set(['45213200','45213250','45221100','45221115','45222100','45223000','45223100','45223110','45223200','45223210','45223800','45231200','45231400','45232210','45232220','45232221','45250000','45251000','45251100','45251140','45252000']);
const HIGH_STEEL_CPVS=new Set(['45221100','45221115','45223000','45223100','45223110','45223200','45223210','45231400','45232220','45232221']);

function titleCategory(title){
  const parts=text(title).split(/\s+[–—-]\s+/).map(x=>x.trim()).filter(Boolean);
  return norm(parts.length>=3?parts[1]:'');
}
function storedCpvs(row){
  return unique([
    ...array(row?.payload?.gc_project_evidence?.cpv),
    ...array(row?.payload?.cpvs),
    ...array(row?.payload?.classification_cpv)
  ].map(v=>(String(v).match(/\b\d{8}\b/)||[])[0]).filter(Boolean));
}
function strongProjectText(t){
  return /(?:\bsteelwork\b|\bsteel\s+(?:structure|frame|hall|bridge|tower)\b|\bstahlbau\b|\bstahlkonstruk|\bstahlhalle\b|\bbridge\b|\bbruecke\b|\bbrucke\b|\biron bridge\b|\bprefabricated structures?\b|\bassembly and erection of prefabricated structures\b|\bsubstation\b|\bumspannwerk\b|\bschaltanlage\b|\btransformer station\b|\bpower plant\b|\bkraftwerk\b|\bindustrial plant\b|\bindustrieanlage\b|\bwarehouse hall\b|\blagerhalle\b|\btransmission line\b|\bpower line\b|\belectricity power line\b|\bhochspannungsleitung\b|\belectricity transmission pylons?\b|\btransmission pylons?\b|\bpylons?\b|\btransmission towers?\b|\blattice towers?\b|\bpipeline\b|\b(?:110|132|220|400)\s*k?v\b|\boverhead line\b|\bgantry\b|\bportal frame\b|\bdatacenter\b|\bdata center\b|\brechenzentrum\b|\blogistics terminal\b|\bwarehouse\b)/i.test(t);
}
function negativeDomain(category,t){
  const catNegative=/(?:data[- ]transmission equipment|radio.*television|telecommunication|transmission electron microscope|furniture|data transmission services|satellite|software|information technology|medical equipment|laboratory equipment|office equipment|vehicles?|food|catering|cleaning|insurance|consulting|advertising|spectral analy[sz]ers?)/i.test(category);
  const bodyNegative=/(?:\bdata[- ]transmission\b|\btelecommunication\b|\bsatellite[- ]based transmission\b|\bsatellit.*transmission|\bspectral analy[sz]er|\bmicroscope\b|\bfurniture\b|\bchairs?\b.*\btables?\b|\bmobile app\b|\bsoftware\b)/i.test(t);
  return catNegative||bodyNegative;
}

export function evaluateGcAwardPrecision(row,{minScore=82}={}){
  const title=text(row?.title,6000),t=norm(title),category=titleCategory(title),cpvs=storedCpvs(row);
  const evidence=row?.payload?.gc_project_evidence||{};
  const oldScore=Number(evidence.score||0);
  const strongText=strongProjectText(t);
  const relevantCpvs=cpvs.filter(x=>GC_CPVS.has(x));
  const highCpvs=cpvs.filter(x=>HIGH_STEEL_CPVS.has(x));
  const neg=negativeDomain(category,t);
  const transmissionOnly=array(evidence.reasons).length>0&&array(evidence.reasons).every(r=>/project term:\s*transmission/i.test(String(r)));
  const powerContext=/(?:\bpower\b|\belectric|\bgrid\b|\bline\b|\bsubstation\b|\bhochspannung|\b110\s*k?v\b|\b132\s*k?v\b|\b220\s*k?v\b|\b400\s*k?v\b)/i.test(t);

  if(neg&&!strongText){
    return{relevant:false,score:0,reason:'explicit_non_pristeel_procurement_domain',cpvs,category,strong_text:false};
  }
  if(transmissionOnly&&!powerContext&&!strongText&&relevantCpvs.length===0){
    return{relevant:false,score:0,reason:'ambiguous_transmission_is_data_or_telecom',cpvs,category,strong_text:false};
  }
  if(relevantCpvs.length===0&&!strongText){
    return{relevant:false,score:0,reason:'no_gc_steel_project_evidence',cpvs,category,strong_text:false};
  }
  let score=oldScore;
  if(highCpvs.length)score=Math.max(score,94);
  else if(relevantCpvs.length)score=Math.max(score,86);
  if(strongText)score=Math.max(score,88);
  return{relevant:score>=minScore,score,reason:score>=minScore?'gc_project_evidence_confirmed':'below_precision_threshold',cpvs,category,strong_text:strongText};
}

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

async function closeStaleWork(access,row,mode){
  if(mode!=='apply')return;
  const now=new Date().toISOString();
  await rest(access,`pppp_opportunity_actions?tender_watch_id=eq.${encodeURIComponent(row.id)}&status=in.(background,draft_review)`,{
    method:'PATCH',body:{status:'resolved',updated_at:now},prefer:'return=minimal'
  }).catch(()=>{});
  const pattern=encodeURIComponent(`OPPORTUNITY:${row.id}:*`);
  await rest(access,`tasks?source=eq.opportunity_engine_v2&source_ref=like.${pattern}&status=eq.hapur`,{
    method:'PATCH',body:{status:'mbyllur'},prefer:'return=minimal'
  }).catch(()=>{});
}

async function writeSummary(s){
  await mkdir('tmp',{recursive:true});
  await writeFile('tmp/ted-gc-award-precision-v3.json',JSON.stringify(s,null,2));
}

export async function runTedGcAwardPrecisionV3({mode=process.env.SYNC_MODE||'preview',minScore=Number(process.env.TED_GC_MIN_SCORE||82),supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);
  const access=await resolveSupabaseWorkflowAccess({supabaseUrl});
  const rows=await rest(access,'kek_tender_watch?select=*&relevance_score=gte.70&order=published_date.desc&limit=2000');
  const candidates=array(rows).filter(r=>String(r?.payload?.source||'').toUpperCase()==='TED'&&r?.payload?.notice_phase==='award'&&r?.payload?.discovery_lane==='gc_project_award'&&r.status!=='ignored');
  const excluded=[];
  for(const row of candidates){
    const p=evaluateGcAwardPrecision(row,{minScore});
    if(p.relevant)continue;
    excluded.push({id:row.id,title:row.title,reason:p.reason,cpvs:p.cpvs});
    if(mode==='apply'){
      const now=new Date().toISOString();
      const payload={...(row.payload||{}),gc_precision:{version:VERSION,checked_at:now,relevant:false,reason:p.reason,cpvs:p.cpvs},company_verification_required:false};
      await rest(access,`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,{
        method:'PATCH',
        body:{status:'ignored',category:'possible',relevance_score:0,match_reasons:unique([...(row.match_reasons||[]),`TED GC precision exclusion: ${p.reason}`]),payload,updated_at:now},
        prefer:'return=minimal'
      });
      await closeStaleWork(access,row,mode);
    }
  }
  const summary={mode,version:VERSION,auth_mode:access.authMode,candidates:candidates.length,kept:candidates.length-excluded.length,excluded:excluded.length,excluded_rows:excluded,generated_at:new Date().toISOString()};
  await writeSummary(summary);
  console.log(`TED GC precision ${mode}: candidates=${summary.candidates}, kept=${summary.kept}, excluded=${summary.excluded}.`);
  return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(direct)runTedGcAwardPrecisionV3().catch(async e=>{try{await writeSummary({error:String(e?.message||e),version:VERSION});}catch{}console.error(e);process.exit(1);});
