import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, x-pppp-cron-secret',
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Content-Type':'application/json'
};
const text=(v:any,max=10000)=>String(v==null?'':v).trim().slice(0,max);
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

const COUNTRY3_TO_2:Record<string,string>={
  AUT:'AT',BEL:'BE',BGR:'BG',HRV:'HR',CYP:'CY',CZE:'CZ',DNK:'DK',EST:'EE',FIN:'FI',FRA:'FR',DEU:'DE',GRC:'GR',GEL:'GR',HUN:'HU',IRL:'IE',ITA:'IT',LVA:'LV',LTU:'LT',LUX:'LU',MLT:'MT',NLD:'NL',POL:'PL',PRT:'PT',ROU:'RO',SVK:'SK',SVN:'SI',ESP:'ES',SWE:'SE',GBR:'GB',CHE:'CH',MNE:'ME',SRB:'RS'
};
const COUNTRY_NAMES:Record<string,string>={
  AT:'Austria',BE:'Belgium',BG:'Bulgaria',HR:'Croatia',CY:'Cyprus',CZ:'Czechia',DK:'Denmark',EE:'Estonia',FI:'Finland',FR:'France',DE:'Germany',GR:'Greece',HU:'Hungary',IE:'Ireland',IT:'Italy',LV:'Latvia',LT:'Lithuania',LU:'Luxembourg',MT:'Malta',NL:'Netherlands',PL:'Poland',PT:'Portugal',RO:'Romania',SK:'Slovakia',SI:'Slovenia',ES:'Spain',SE:'Sweden',GB:'United Kingdom',CH:'Switzerland',ME:'Montenegro',RS:'Serbia'
};
const ALLOWED=new Set(Object.keys(COUNTRY_NAMES));
const UNSAFE_EMAIL_DOMAINS=new Set([
  'gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','icloud.com','aol.com','gmx.com','gmx.de',
  'pec.it','pec.net','deutschebahn.com','ted.europa.eu','publications.europa.eu','lursoft.lv'
]);

function domain(v:any){
  let s=text(v,500).toLowerCase();
  s=s.replace(/^[a-z][a-z0-9+.-]*:\/\//i,'').split('/')[0].split('?')[0].split('#')[0].split(':')[0].replace(/^www\./,'');
  return s||null;
}
function emailDomain(v:any){const e=text(v,300).toLowerCase();const i=e.lastIndexOf('@');return i>0?domain(e.slice(i+1)):null;}
function validEmail(v:any){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(v,300).toLowerCase());}
function usablePublicEmail(v:any){
  const e=text(v,300).toLowerCase(),d=emailDomain(e);
  return validEmail(e)&&!!d&&!UNSAFE_EMAIL_DOMAINS.has(d);
}
function normalizeCompany(v:any){
  return text(v,500).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\b(gmbh|mbh|ag|se|kg|co|ltd|limited|plc|srl|s\.r\.l|spa|s\.p\.a|sa|sas|bv|nv|as|a\/s|doo|d\.o\.o|sp z o o|spolka|inc|corp)\b/g,' ').replace(/\s+/g,' ').trim();
}
function toIsoDate(d:Date){return d.toISOString().slice(0,10);}
function daysAgo(n:number){const d=new Date();d.setUTCDate(d.getUTCDate()-n);return toIsoDate(d);}
function safeUrl(v:any){const s=text(v,1200);try{const u=new URL(s);return /^https?:$/.test(u.protocol)?u.toString():null;}catch{return null;}}
function isCorporateEmailForDomain(email:string,d:string|null){
  if(!usablePublicEmail(email)||!d)return false;
  const ed=emailDomain(email);return !!ed&&(ed===d||ed.endsWith('.'+d)||d.endsWith('.'+ed));
}
function emailScore(e:string){
  const local=e.split('@')[0].toLowerCase();
  if(/(procurement|purchas|einkauf|beschaffung|supply|sourcing|subcontract|ausschreib|tender|estimating|estimation|kalkulation|vergabe)/.test(local))return 96;
  if(/(project|projekt|commercial|angebot|business|office|kontakt|contact)/.test(local))return 82;
  if(/^(info|mail|hello|reception|sekretariat|centrala|office)$/.test(local))return 72;
  return 78;
}
async function authorized(req:Request){
  const provided=req.headers.get('x-pppp-cron-secret')||'';if(!provided)return false;
  const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});
  return !error&&data===true;
}
async function fetchText(url:string,timeout=8000){
  try{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
    const r=await fetch(url,{signal:ctl.signal,redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (compatible; PriSteel-Public-Research/1.0)','Accept':'text/html,application/xhtml+xml'}});
    clearTimeout(timer);if(!r.ok)return null;
    const ct=r.headers.get('content-type')||'';if(!ct.includes('text')&&!ct.includes('html'))return null;
    return (await r.text()).slice(0,1200000);
  }catch{return null;}
}
function extractEmails(html:string,d:string){
  const found=new Set<string>();
  for(const m of html.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)){
    const e=m[0].toLowerCase().replace(/[).,;:]+$/,'');if(isCorporateEmailForDomain(e,d))found.add(e);
  }
  return [...found];
}
async function websiteContact(website:string|null,fallbackEmail:string|null,sourceUrl:string|null){
  const fb=fallbackEmail&&usablePublicEmail(fallbackEmail)?fallbackEmail.toLowerCase():null;
  let w=safeUrl(website),d=domain(w||emailDomain(fb));
  if(!w&&d){
    for(const scheme of ['https://','http://']){
      const candidate=scheme+d;const html=await fetchText(candidate,5000);if(html){w=candidate;break;}
    }
  }
  d=domain(w||d);
  let best:{email:string;source:string|null;confidence:number}|null=null;
  if(fb){best={email:fb,source:sourceUrl,confidence:82};}
  if(w&&d){
    let origin='';try{origin=new URL(w).origin;}catch{origin='';}
    if(origin){
      const paths=['','/contact','/kontakt','/impressum','/einkauf','/procurement','/purchasing','/about/contact'];
      for(const p of paths){
        const u=p?origin+p:w;const html=await fetchText(u);if(!html)continue;
        for(const e of extractEmails(html,d)){
          const score=emailScore(e);if(!best||score>best.confidence)best={email:e,source:u,confidence:score};
        }
        if(best&&best.confidence>=95)break;
      }
    }
  }
  return {website:w,email:best?.email||null,source:best?.source||sourceUrl||w,confidence:best?.confidence||0,domain:d};
}

function cpvCodesFromTed(payload:any){return Array.isArray(payload?.cpv)?payload.cpv.map((x:any)=>text(x,20)).filter(Boolean):[];}
function cpvCodesFromUk(r:any){
  const out=new Set<string>();
  const add=(c:any)=>{const id=text(c?.id||c,30);if(id)out.add(id);};
  add(r?.tender?.classification);for(const c of r?.tender?.additionalClassifications||[])add(c);
  for(const it of r?.tender?.items||[]){add(it?.classification);for(const c of it?.additionalClassifications||[])add(c);}
  for(const a of r?.awards||[])for(const it of a?.items||[]){add(it?.classification);for(const c of it?.additionalClassifications||[])add(c);}
  return [...out];
}
function relevantConstruction(title:string,cpvs:string[],base=0,category='works'){
  const t=title.toLowerCase();
  const negative=/(telephone|data transmission|radio broadcast|microscope|furniture|software|consultancy|inspection service|design service only|architectural service|satellite transmission)/i.test(t);
  const works=category==='works'||cpvs.some(c=>/^(45|44)/.test(c));
  const strongCpv=cpvs.some(c=>/^(45213|45221|45223|452238|45231|452314|452322|45234|45262|44212)/.test(c));
  const strongText=/(bridge|brücke|brucke|viaduct|railway|rail line|stahlbau|structural steel|steelwork|substation|transformer station|power line|overhead line|industrial|warehouse|factory|logistics|data cent|airport|terminal|general contractor|generalunternehmer|gu-leistung|design and build|design-build)/i.test(t);
  if(!works||negative&&!strongCpv)return 0;
  if(!strongCpv&&!strongText)return 0;
  return Math.min(100,Math.max(base||0,strongCpv?86:78,strongText?88:0));
}
function tedSource(row:any){return safeUrl(row.detail_url)||safeUrl(row.source_url)||null;}
function projectItem(name:string,date:string|null,url:string|null,location:string|null,reason:string){
  return {name,location,status:'awarded/recent',source_url:url||'',source_date:date,relevance_reason:reason};
}
function classifyCompanyType(raw:any){
  const s=text(raw,60).toLowerCase();if(s==='gc_epc')return 'GC/EPC';if(s==='producer')return 'producer';return 'GC/GU candidate';
}
function sourceEvidence(url:string|null,title:string,reason:string,type:string){return [{url:url||'',title,reason,source_type:type}];}

async function upsertCandidate(c:any,runId:string){
  const contact=await websiteContact(c.website_url||null,c.contact_email||null,c.contact_source_url||c.source_url||null);
  const params={
    p_company_name:c.company_name,p_company_domain:contact.domain||c.company_domain||null,p_website_url:contact.website||c.website_url||null,
    p_country:c.country,p_country_code:c.country_code,p_company_type:c.company_type,p_relevance_score:c.relevance_score,
    p_contact_name:c.contact_name||null,p_contact_email:contact.email,p_contact_role:c.contact_role||null,p_contact_source_url:contact.source,
    p_contact_confidence:contact.confidence,p_current_projects:c.current_projects||[],p_recent_projects:c.recent_projects||[],p_evidence:c.evidence||[],
    p_discovery_source:c.discovery_source,p_source_url:c.source_url||null,p_discovery_run_id:runId
  };
  const {data,error}=await db.rpc('pppp_gc_upsert_prospect_v1',params);if(error)throw error;
  return {...data,verified_email:contact.email,verified_domain:contact.domain,contact_confidence:contact.confidence};
}

async function tedCandidates(limit:number){
  const {data,error}=await db.from('kek_tender_watch')
    .select('id,publication_no,published_date,authority,title,relevance_score,source_url,detail_url,payload')
    .gte('published_date',daysAgo(180)).order('published_date',{ascending:false}).limit(1000);
  if(error)throw error;
  const rows=(data||[]).filter((r:any)=>text(r.payload?.source).toUpperCase()==='TED'&&text(r.payload?.notice_phase)==='award'&&text(r.payload?.winner?.name));
  const recentRows=rows.filter((r:any)=>String(r.published_date)>=daysAgo(14));
  const groups=new Map<string,any[]>();
  for(const r of rows){const k=normalizeCompany(r.payload?.winner?.name);if(!k)continue;const a=groups.get(k)||[];a.push(r);groups.set(k,a);}
  const out:any[]=[];
  for(const r of recentRows){
    const w=r.payload?.winner||{},name=text(w.name,400),key=normalizeCompany(name),code=COUNTRY3_TO_2[text(w.country,3).toUpperCase()]||'';
    if(!key||!ALLOWED.has(code))continue;
    const cpvs=cpvCodesFromTed(r.payload),score=relevantConstruction(text(r.title,1200),cpvs,Number(r.payload?.gc_project_evidence?.score||r.relevance_score||0),'works');
    if(score<78||classifyCompanyType(w.company_type)==='producer')continue;
    const history=(groups.get(key)||[]).filter((x:any)=>x.id!==r.id).slice(0,4);
    const src=tedSource(r),fallback=usablePublicEmail(w.email)?text(w.email,300).toLowerCase():null;
    const website=safeUrl(w.website)||null;
    out.push({
      company_name:name,company_domain:domain(website||emailDomain(fallback)),website_url:website,country:COUNTRY_NAMES[code],country_code:code,
      company_type:classifyCompanyType(w.company_type),relevance_score:score,contact_name:text(w.contact_point,250)||null,contact_email:fallback,
      contact_role:'Public award/contact point',contact_source_url:src,source_url:src,discovery_source:'ted_public_award',
      current_projects:[projectItem(text(r.title,1200),r.published_date,src,text(w.city,200)||null,`TED award; CPV ${cpvs.slice(0,5).join(', ')}`)],
      recent_projects:history.map((h:any)=>projectItem(text(h.title,1200),h.published_date,tedSource(h),text(h.payload?.winner?.city,200)||null,'Recent TED award for the same contractor')).slice(0,4),
      evidence:sourceEvidence(src,text(r.title,600),'Public TED contract award naming this company as winner','TED'),provider:'TED'
    });
  }
  const seen=new Set<string>();return out.filter(c=>{const k=normalizeCompany(c.company_name);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,Math.max(limit*2,20));
}

function ukSupplierParty(release:any,supplier:any){
  const id=text(supplier?.id,200),name=text(supplier?.name,400).toLowerCase();
  return (release?.parties||[]).find((p:any)=>(id&&text(p?.id,200)===id)||(name&&text(p?.name,400).toLowerCase()===name))||supplier||{};
}
async function ukCandidates(limit:number){
  const from=new Date();from.setUTCDate(from.getUTCDate()-3);from.setUTCHours(0,0,0,0);
  const to=new Date();
  let next=`https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages?updatedFrom=${encodeURIComponent(from.toISOString().slice(0,19))}&updatedTo=${encodeURIComponent(to.toISOString().slice(0,19))}&stages=award&limit=100`;
  const out:any[]=[];let pages=0;
  while(next&&pages<2&&out.length<Math.max(limit*2,20)){
    pages++;
    const r=await fetch(next,{headers:{'Accept':'application/json','User-Agent':'PriSteel-Public-Research/1.0'}});if(!r.ok)break;
    const pkg=await r.json();
    for(const rel of pkg?.releases||[]){
      const title=text(rel?.tender?.title||rel?.awards?.[0]?.title,1200),cpvs=cpvCodesFromUk(rel),category=text(rel?.tender?.mainProcurementCategory,40).toLowerCase()||'works';
      const score=relevantConstruction(title,cpvs,0,category);if(score<78)continue;
      const source=safeUrl(rel?.uri)||safeUrl(pkg?.uri)||'https://www.find-tender.service.gov.uk/';
      for(const award of rel?.awards||[]){
        for(const supplier of award?.suppliers||[]){
          const party=ukSupplierParty(rel,supplier),name=text(supplier?.name||party?.name,400);if(!name)continue;
          const cp=party?.contactPoint||{},addr=party?.address||{},email=usablePublicEmail(cp?.email)?text(cp.email,300).toLowerCase():null;
          const website=safeUrl(cp?.url)||safeUrl(party?.url)||null;
          out.push({
            company_name:name,company_domain:domain(website||emailDomain(email)),website_url:website,country:'United Kingdom',country_code:'GB',company_type:'GC/GU candidate',relevance_score:score,
            contact_name:text(cp?.name,250)||null,contact_email:email,contact_role:'Public Find a Tender supplier contact',contact_source_url:source,source_url:source,discovery_source:'uk_find_a_tender_public_api',
            current_projects:[projectItem(title,text(rel?.date,30).slice(0,10)||null,source,text(addr?.locality||addr?.region,200)||null,`UK Find a Tender award; CPV ${cpvs.slice(0,5).join(', ')}`)],recent_projects:[],
            evidence:sourceEvidence(source,title,'Public UK Find a Tender award naming this supplier','UK Find a Tender'),provider:'UK_FTS'
          });
        }
      }
    }
    const n=text(pkg?.links?.next,1500);next=safeUrl(n)||'';
    if(next)await sleep(1100);
  }
  const seen=new Set<string>();return out.filter(c=>{const k=normalizeCompany(c.company_name);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,Math.max(limit,12));
}

async function run(limit:number,lane:string,force:boolean){
  const day=toIsoDate(new Date()),safeLane=(lane||'EU_UK').slice(0,40);
  const {data:existing}=await db.from('pppp_gc_discovery_runs_v1').select('*').eq('run_date',day).eq('lane',safeLane).maybeSingle();
  if(existing?.status==='succeeded'&&!force)return {skipped:true,reason:'daily_run_already_succeeded',run_id:existing.id};
  const started=new Date().toISOString();
  const {data:runRow,error:runErr}=await db.from('pppp_gc_discovery_runs_v1').upsert({run_date:day,lane:safeLane,status:'running',requested_count:limit,started_at:started,finished_at:null,error_message:null},{onConflict:'run_date,lane'}).select('id').single();
  if(runErr)throw runErr;
  try{
    const [ted,uk]=await Promise.all([tedCandidates(limit),ukCandidates(limit)]);
    const combined=[...ted,...uk];
    const seen=new Set<string>();const candidates=combined.filter(c=>{const k=(c.company_domain||normalizeCompany(c.company_name));if(!k||seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>b.relevance_score-a.relevance_score).slice(0,limit);
    let accepted=0,duplicates=0,ready=0,failed=0;const results:any[]=[];
    for(const c of candidates){
      try{
        const up=await upsertCandidate(c,runRow.id),status=up?.status;
        if(status==='already_contacted')duplicates++;else accepted++;
        if(status==='contact_ready')ready++;
        results.push({company:c.company_name,country:c.country_code,provider:c.provider,status,domain:up?.verified_domain||c.company_domain,email:up?.verified_email||null,confidence:up?.contact_confidence||0});
      }catch(e){failed++;results.push({company:c.company_name,provider:c.provider,error:String(e instanceof Error?e.message:e).slice(0,400)});}
      await sleep(80);
    }
    const finished=new Date().toISOString();
    await db.from('pppp_gc_discovery_runs_v1').update({status:'succeeded',discovered_count:combined.length,accepted_count:accepted,duplicate_count:duplicates,contact_ready_count:ready,response_id:null,finished_at:finished,payload:{mode:'zero_cost_public_sources',providers:{ted:ted.length,uk_find_a_tender:uk.length},selected:candidates.length,failed,results:results.slice(0,30),no_paid_api:true,no_email_created:true}}).eq('id',runRow.id);
    return {run_id:runRow.id,mode:'zero_cost_public_sources',discovered:combined.length,selected:candidates.length,accepted,duplicates,contact_ready:ready,failed,results,human_send_required:true,no_email_created:true,no_paid_api:true};
  }catch(e){
    const msg=String(e instanceof Error?e.message:e).slice(0,1500);
    await db.from('pppp_gc_discovery_runs_v1').update({status:'failed',error_message:msg,finished_at:new Date().toISOString(),payload:{mode:'zero_cost_public_sources',no_paid_api:true}}).eq('id',runRow.id);
    throw e;
  }
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='GET')return new Response(JSON.stringify({ok:false,error:'GET required'}),{status:405,headers:cors});
  if(!(await authorized(req)))return new Response(JSON.stringify({ok:false,error:'unauthorized'}),{status:401,headers:cors});
  try{
    const u=new URL(req.url),limit=Math.min(20,Math.max(1,Number(u.searchParams.get('limit')||12))),lane=text(u.searchParams.get('lane')||'EU_UK',40),force=u.searchParams.get('force')==='true';
    const out=await run(limit,lane,force);
    return new Response(JSON.stringify({ok:true,...out}),{headers:cors});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e instanceof Error?e.message:e),no_paid_api:true}),{status:500,headers:cors});}
});
