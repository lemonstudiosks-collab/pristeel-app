import {mkdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const DEFAULT_SUPABASE_URL='https://isymxqfqzkchbsrbhucf.supabase.co';
const VERSION='ted-opportunity-precision-v1';
const text=(v,max=5000)=>String(v==null?'':v).replace(/\s+/g,' ').trim().slice(0,max);
const norm=v=>text(v,30000).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const arr=v=>Array.isArray(v)?v:[];
const unique=a=>[...new Set(arr(a).filter(Boolean).map(String))];
const winner=row=>row?.payload?.winner&&typeof row.payload.winner==='object'?row.payload.winner:{};
const domainFromUrl=v=>{try{return new URL(/^https?:\/\//i.test(text(v))?text(v):`https://${text(v)}`).hostname.replace(/^www\./,'').toLowerCase();}catch{return'';}};
const emailDomain=v=>text(v,500).split('@')[1]?.toLowerCase().replace(/^www\./,'')||'';
const domainMatches=(a,b)=>!!a&&!!b&&(a===b||a.endsWith(`.${b}`)||b.endsWith(`.${a}`));

const STRONG_STEEL_CPVS=new Set(['45221115','45223100','45223110','45223210','45232220','45232221']);
const FREE_OR_SHARED_DOMAINS=new Set(['gmail.com','outlook.com','hotmail.com','yahoo.com','freenet.de','icloud.com','proton.me','gmx.de','gmx.net']);

function cpvs(row){return unique([...(row?.payload?.gc_project_evidence?.cpv||[]),...arr(row?.payload?.cpv_codes),...arr(row?.payload?.classification_cpv)]).map(x=>(String(x).match(/\b\d{8}\b/)||[])[0]).filter(Boolean);}
export function projectFit(row){
  const title=norm(row?.title),reasons=norm(arr(row?.match_reasons).join(' ')),corpus=`${title} ${reasons}`,codes=cpvs(row),evidence=[];
  const explicitSteel=/(structural steel|steelworks?|steel work|steel structure|steel construction|stahlbau|stahlkonstruk|metallbau|metalwork|metal structure|steel frame|steel hall|stahlhalle|steel bridge|st[aå]lkonstruk|charpente metallique)/.test(corpus);
  const telecom=/(telephone|telephony|data transmission|telecommunication|telecom|communications? network|fiber optic|fibre optic|broadband|ict service|information & communication|information and communication)/.test(corpus);
  const software=/(software|application development|web portal|digital platform|information system)/.test(corpus);
  const nonSteelProduct=/(display units?|information boards?|boulderwand|climbing wall|climbing volume|gymnastics equipment|sports equipment)/.test(corpus);
  const masonryConcreteOnly=/(masonry and concrete|masonry works?|concrete repairs?|brickwork)/.test(corpus)&&!explicitSteel;
  const powerTransmission=/(high voltage|hv line|overhead line|transmission line|hochspannungsleitung|freileitung|pylon|lattice tower|gantry|steel pole)/.test(corpus)&&!telecom;
  const substation=/(substation|umspannwerk|schaltanlage|transformer station)/.test(corpus);
  const industrial=/(industrial plant|industrieanlage|power plant|powerplant|kraftwerk|tank|reservoir|silo|warehouse|lagerhalle|logistics (?:centre|center|facility)|production hall|produktionshalle)/.test(corpus);
  const bridge=/(bridge|bruecke|brucke|brücke)/.test(corpus);
  const strongCpv=codes.some(x=>STRONG_STEEL_CPVS.has(x));
  if((telecom||software||nonSteelProduct)&&!explicitSteel&&!strongCpv){return{rating:'excluded',score:0,reason:telecom?'telecom/data scope, not power/steel transmission':software?'software/digital scope': 'non-steel product/equipment scope',evidence:[...codes]};}
  if(masonryConcreteOnly&&!strongCpv)return{rating:'excluded',score:10,reason:'bridge/civil scope is explicitly masonry/concrete without steel evidence',evidence:[...codes]};
  if(explicitSteel){evidence.push('explicit structural-steel wording');return{rating:'strong',score:100,reason:'explicit structural-steel/metalwork scope',evidence:[...evidence,...codes]};}
  if(strongCpv){evidence.push('strong steel/infrastructure CPV');return{rating:'strong',score:94,reason:`strong PriSteel-relevant CPV ${codes.filter(x=>STRONG_STEEL_CPVS.has(x)).join(', ')}`,evidence:[...evidence,...codes]};}
  if(substation){evidence.push('substation project');return{rating:'strong',score:90,reason:'substation construction normally contains relevant fabricated steel/gantry/support packages',evidence:[...evidence,...codes]};}
  if(powerTransmission){evidence.push('power/high-voltage transmission');return{rating:'strong',score:90,reason:'power-transmission/tower/gantry scope, not telecom data transmission',evidence:[...evidence,...codes]};}
  if(industrial){return{rating:'possible',score:70,reason:'industrial/building project may contain a steel package but steel scope is not explicit',evidence:codes};}
  if(bridge){return{rating:'possible',score:65,reason:'bridge project detected but structural-steel package is not explicit',evidence:codes};}
  return{rating:'weak',score:35,reason:'no sufficiently specific structural-steel package signal',evidence:codes};
}

function companyEvidence(w){return arr(w?.company_classification?.evidence);}
export function steelRole(row){
  const w=winner(row),name=norm([w.name,...arr(w.names)].join(' ')),type=text(w.company_type||w?.company_classification?.company_type||'unknown',80),ev=companyEvidence(w),evText=norm(ev.map(x=>`${x?.label||''} ${arr(x?.examples).join(' ')}`).join(' '));
  const explicitCompanySteel=/(stahlbau|metallbau|steel fabrication|structural steel|steel construction|steel structures?|stahlkonstruk|schlosserei|metal construction|metal structures?|smedevirksomhed|st[aå]l)/.test(`${name} ${evText}`);
  const steelProcesses=/(welding|schweiss|schweiß|laser cutting|plasma cutting|galvaniz|steel fabrication|metal fabrication)/.test(evText);
  if(type==='gc_epc')return{role:'gc_epc',confidence:'high',reason:'winner classified as GC/EPC with construction evidence'};
  if(type==='producer'&&explicitCompanySteel)return{role:'steel_fabricator_producer',confidence:'high',reason:'producer has explicit steel/metallbau/stahlbau fabrication evidence'};
  if((type==='producer'||type==='unknown')&&/(stahlbau|metallbau|steel|stahl|metalbau)/.test(name))return{role:'steel_fabricator_producer',confidence:'high',reason:'legal company name explicitly indicates steel/metal fabrication'};
  if(type==='producer'&&steelProcesses)return{role:'steel_fabricator_producer',confidence:'medium',reason:'fabrication-process evidence exists but steel specialization needs confirmation'};
  if(type==='producer')return{role:'other_manufacturer',confidence:'high',reason:'generic production/manufacturing evidence is insufficient for PriSteel capacity outreach'};
  if(type==='trader_consortium'||type==='consortium_mixed')return{role:'consortium',confidence:'medium',reason:'consortium members require member-specific routing'};
  return{role:'unknown',confidence:'low',reason:'winner steel/GC role is not sufficiently established'};
}

function officialDomains(w){const out=[];for(const v of [...arr(w.websites),w.website]){const d=domainFromUrl(v);if(d)out.push(d);}for(const o of arr(w?.contact_enrichment?.organizations)){for(const v of [o?.domain,o?.official_website,o?.website]){const d=o?.domain&&!String(o.domain).includes('/')?String(o.domain).replace(/^www\./,'').toLowerCase():domainFromUrl(v);if(d)out.push(d);}}return unique(out);}
function contactRecords(w,email){const needle=text(email,500).toLowerCase();const out=[];for(const o of arr(w?.contact_enrichment?.organizations))for(const c of arr(o?.contacts))if(text(c?.type,40)==='email'&&text(c?.value,500).toLowerCase()===needle)out.push(c);return out;}
export function contactFit(row,email){
  const w=winner(row),target=text(email,500).toLowerCase(),ed=emailDomain(target),official=officialDomains(w),records=contactRecords(w,target),declared=arr(w.emails).map(x=>text(x,500).toLowerCase()).includes(target);
  const domainOk=official.some(d=>domainMatches(ed,d));
  const highTrust=records.some(c=>['high','medium'].includes(text(c?.confidence,40).toLowerCase())&&['TED','official_website'].includes(text(c?.source_type,80)));
  if(!target||!ed)return{rating:'missing',ready:false,reason:'no target email'};
  if(domainOk)return{rating:'verified',ready:true,reason:`email domain matches official company domain (${ed})`,official_domains:official};
  if(declared)return{rating:'ted_declared',ready:true,reason:'email is declared on the TED award winner record',official_domains:official};
  if(highTrust&&!FREE_OR_SHARED_DOMAINS.has(ed))return{rating:'source_verified',ready:true,reason:'email is grounded in TED/official-website contact evidence',official_domains:official};
  if(official.length&& !domainOk)return{rating:'mismatch',ready:false,reason:`email domain ${ed} does not match grounded company domain(s): ${official.join(', ')}`,official_domains:official};
  if(FREE_OR_SHARED_DOMAINS.has(ed))return{rating:'review',ready:false,reason:`shared/free email domain ${ed} requires explicit TED grounding`,official_domains:official};
  return{rating:'review',ready:false,reason:'company domain/contact provenance is insufficiently grounded',official_domains:official};
}

export function evaluateTedOpportunityPrecision({row,action}){
  const project=projectFit(row),role=steelRole(row),contact=contactFit(row,action?.target_email),type=text(action?.action_type,100);let disposition='background',ready=false,reason='needs further research';
  if(type==='gc_project_outreach_draft'){
    if(project.rating==='excluded'||project.rating==='weak'){disposition='quarantined';reason=project.reason;}
    else if(role.role!=='gc_epc'){disposition='quarantined';reason=`winner role ${role.role} is not GC/EPC`;}
    else if(project.rating==='strong'&&contact.ready){disposition='draft_review';ready=true;reason='GC/EPC + strong steel-project fit + grounded contact';}
    else{disposition='background';reason=project.rating!=='strong'?project.reason:contact.reason;}
  }else if(type==='producer_capacity_outreach_draft'){
    if(project.rating==='excluded'||project.rating==='weak'){disposition='quarantined';reason=project.reason;}
    else if(role.role!=='steel_fabricator_producer'){disposition='quarantined';reason=role.reason;}
    else if(project.rating==='strong'&&role.confidence==='high'&&contact.ready){disposition='draft_review';ready=true;reason='steel fabricator + strong project fit + grounded contact';}
    else{disposition='background';reason=role.confidence!=='high'?role.reason:project.rating!=='strong'?project.reason:contact.reason;}
  }else if(type==='consortium_member_review'){
    disposition=project.rating==='excluded'?'quarantined':'background';reason=project.rating==='excluded'?project.reason:'consortium member classification stays in background until an actionable member route is proven';
  }else return{ready:false,disposition:'unchanged',reason:'action type is outside TED outbound precision gate',project,role,contact};
  return{version:VERSION,ready,disposition,reason,project,role,contact,evaluated_at:new Date().toISOString()};
}

async function rest(access,path,{method='GET',body,prefer}={}){const r=await fetch(`${access.supabaseUrl}/rest/v1/${path}`,{method,headers:{apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});const raw=await r.text();if(!r.ok)throw new Error(`${method} ${path}: HTTP ${r.status} ${raw.slice(0,700)}`);return raw?JSON.parse(raw):[];}
async function writeSummary(s){await mkdir('tmp',{recursive:true});await writeFile('tmp/ted-opportunity-precision-v1.json',JSON.stringify(s,null,2));}

export async function runTedOpportunityPrecisionV1({mode=process.env.SYNC_MODE||'preview',supabaseUrl=process.env.SUPABASE_URL||DEFAULT_SUPABASE_URL}={}){
  if(!['preview','apply'].includes(mode))throw new Error(`Unsupported SYNC_MODE: ${mode}`);const access=await resolveSupabaseWorkflowAccess({supabaseUrl});
  const [actions,tenders]=await Promise.all([
    rest(access,"pppp_opportunity_actions?select=*&action_type=in.(gc_project_outreach_draft,producer_capacity_outreach_draft,consortium_member_review)&status=in.(draft_review,background,quarantined)&limit=1000"),
    rest(access,"kek_tender_watch?select=id,title,authority,relevance_score,match_reasons,payload,status&limit=2000")
  ]);
  const byTender=new Map((tenders||[]).map(r=>[String(r.id),r])),results=[];
  for(const action of actions||[]){const row=byTender.get(String(action.tender_watch_id));if(!row||String(row?.payload?.source||'').toUpperCase()!=='TED')continue;const gate=evaluateTedOpportunityPrecision({row,action});const prior=action.payload&&typeof action.payload==='object'?action.payload:{};const nextPayload={...prior,precision_gate:gate};
    if(mode==='apply'){
      await rest(access,`pppp_opportunity_actions?id=eq.${encodeURIComponent(action.id)}`,{method:'PATCH',body:{status:gate.disposition,payload:nextPayload,updated_at:new Date().toISOString()},prefer:'return=minimal'});
      if(gate.disposition!=='draft_review')await rest(access,`tasks?source=eq.opportunity_engine_v2&source_ref=eq.${encodeURIComponent(`OPPORTUNITY:${row.id}:${action.action_type}`)}`,{method:'PATCH',body:{status:'mbyllur',done_at:new Date().toISOString()},prefer:'return=minimal'});
      const tp={...(row.payload||{}),ted_opportunity_precision:{version:VERSION,last_evaluated_at:gate.evaluated_at,last_action_type:action.action_type,ready:gate.ready,disposition:gate.disposition,project:gate.project,role:gate.role,contact:gate.contact,reason:gate.reason}};
      await rest(access,`kek_tender_watch?id=eq.${encodeURIComponent(row.id)}`,{method:'PATCH',body:{payload:tp,updated_at:new Date().toISOString()},prefer:'return=minimal'});
    }
    results.push({action_id:action.id,tender_watch_id:row.id,company:action.target_company,action_type:action.action_type,ready:gate.ready,disposition:gate.disposition,reason:gate.reason,project_fit:gate.project.rating,steel_role:gate.role.role,contact_fit:gate.contact.rating,had_gmail_draft:!!prior.gmail_draft_id});
  }
  const summary={mode,version:VERSION,auth_mode:access.authMode,evaluated:results.length,ready:results.filter(x=>x.ready).length,background:results.filter(x=>x.disposition==='background').length,quarantined:results.filter(x=>x.disposition==='quarantined').length,existing_drafts_quarantined:results.filter(x=>x.had_gmail_draft&&x.disposition==='quarantined').length,results,generated_at:new Date().toISOString()};await writeSummary(summary);console.log(`TED precision ${mode}: evaluated=${summary.evaluated}, ready=${summary.ready}, background=${summary.background}, quarantined=${summary.quarantined}.`);return summary;
}

const direct=process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href;if(direct)runTedOpportunityPrecisionV1().catch(async e=>{try{await writeSummary({error:String(e?.message||e),mode:process.env.SYNC_MODE||'preview',version:VERSION});}catch{}console.error(e);process.exit(1);});
