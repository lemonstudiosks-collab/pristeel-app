import { pathToFileURL } from 'node:url';
import { resolveSupabaseWorkflowAccess } from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

function docCode(value){
  const m=text(value).match(/\b(B\d{2})\b/i);
  return m?m[1].toUpperCase():'';
}
function wholeWord(value,token){
  const escaped=token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`\\b${escaped}\\b`,'i').test(norm(value));
}
function hasAny(value,terms){
  const n=norm(value);
  return terms.some(term=>n.includes(norm(term)));
}
function reasons(row){return Array.isArray(row?.match_reasons)?row.match_reasons.map(text):[];}

export function normalizeTenderRow(row){
  const code=docCode(row?.document_type);
  if(code && code!=='B05' && code!=='B54'){
    return{action:'delete',reason:`non_actionable_${code}`};
  }

  const corpus=[row?.title,row?.fpp_description].filter(Boolean).join(' ');
  const n=norm(corpus);
  const currentReasons=reasons(row);
  const profileReason=currentReasons.map(norm).find(r=>/^lende e pare: (ipe|hea|heb|upe|upn)$/.test(r));
  if(profileReason){
    const token=profileReason.match(/(ipe|hea|heb|upe|upn)$/)?.[1]||'';
    const hasRealToken=wholeWord(corpus,token);
    const hasIndependentSteel=hasAny(corpus,['celik','steel','llamar','shufr','profile','trar','gyp metal','tub metal','konstruksion metal','strukture metal','rrethoje','grating']);
    if(!hasRealToken && !hasIndependentSteel){
      return{action:'delete',reason:`false_profile_substring_${token}`};
    }
  }

  const hasSteel=hasAny(n,['celik','steel']);
  const rawNoun=hasAny(n,['llamar','shufr','profile','trar','gyp','tub','litar','zinxhir','armatur','bobin','coil']);
  const structureNoun=hasAny(n,['konstruksion','strukture','platform','shkall','shtyll','rrethoje','grating','mbajtese metal']);
  const patch={};
  const added=[];

  if(hasSteel&&rawNoun){
    patch.category='raw_material';
    patch.relevance_score=Math.max(Number(row?.relevance_score)||0,75);
    added.push('kombinim material + çelik');
  }
  if((hasSteel&&structureNoun)||hasAny(n,['konstruksion metalik','strukture metalike','steel structure'])){
    patch.category='steel_structure';
    patch.relevance_score=Math.max(Number(row?.relevance_score)||0,82);
    added.push('kombinim strukturë + metal/çelik');
  }

  if(added.length){
    patch.match_reasons=[...new Set([...currentReasons,...added])];
    patch.updated_at=new Date().toISOString();
    return{action:'patch',patch,reason:'precision_upgrade'};
  }
  return{action:'keep',reason:'no_change'};
}

async function rest({supabaseUrl,apiKey,bearerToken=apiKey,path,method='GET',body,prefer}){
  const response=await fetch(`${supabaseUrl}/rest/v1/${path}`,{
    method,
    headers:{apikey:apiKey,Authorization:`Bearer ${bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const raw=await response.text();
  if(!response.ok)throw new Error(`${method} ${path} failed: HTTP ${response.status} ${raw.slice(0,700)}`);
  return raw?JSON.parse(raw):[];
}

export async function runKekTenderPostprocess({
  supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL,
  apiKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SERVICE_KEY||'',
  bearerToken=''
}={}){
  const access=apiKey
    ?{supabaseUrl,apiKey,bearerToken:bearerToken||apiKey,authMode:'service_key'}
    :await resolveSupabaseWorkflowAccess({supabaseUrl});
  const rows=await rest({...access,path:'kek_tender_watch?select=id,title,fpp_description,document_type,relevance_score,category,match_reasons,status&limit=2000'});
  const summary={scanned:Array.isArray(rows)?rows.length:0,deleted:0,patched:0,kept:0,auth_mode:access.authMode};
  for(const row of Array.isArray(rows)?rows:[]){
    const decision=normalizeTenderRow(row);
    if(decision.action==='delete'){
      await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'DELETE',prefer:'return=minimal'});
      summary.deleted++;
    }else if(decision.action==='patch'){
      await rest({...access,path:`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,method:'PATCH',body:decision.patch,prefer:'return=minimal'});
      summary.patched++;
    }else summary.kept++;
  }
  console.log(`KEK tender postprocess: scanned=${summary.scanned}, deleted=${summary.deleted}, patched=${summary.patched}, kept=${summary.kept}.`);
  return summary;
}

const isDirect=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;
if(isDirect)runKekTenderPostprocess().catch(error=>{console.error(error?.message||error);process.exit(1);});
