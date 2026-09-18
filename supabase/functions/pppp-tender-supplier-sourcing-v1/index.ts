/* PPPP Tender Supplier Sourcing v5
 * Production-parity continuation of live v4. Read-only sourcing only:
 * canonical BOM first when a unique project can be resolved; dossier fallback otherwise.
 * External discovery is on-demand and review-only. No Supplier Master/RFQ/email writes.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')||'';
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};

type Requirement={id:string,family:string,label:string,description:string,dimensions:any,standards:string[],certifications:string[],grades:string[],delivery_terms:string|null,source_lines:string[]};
type ExternalCandidate={name:string,domain:string,website:string,email:string|null,source_tier:string,query:string,title:string,snippet:string,product_evidence:boolean,standard_evidence:boolean,certificate_evidence:boolean,grade_evidence:boolean,dimension_evidence:boolean,contact_ready:boolean,verification_status:string,score:number};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});}
function text(v:unknown,max=6000){return String(v==null?'':v).trim().slice(0,max);}
function arr(v:unknown){return Array.isArray(v)?v:[];}
function isUuid(v:unknown){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(v,80));}
function clean(v:unknown){return text(v,1200).replace(/\s+/g,' ').trim();}
function uniq<T>(rows:T[],key:(x:T)=>string){const seen=new Set<string>(),out:T[]=[];for(const row of rows){const k=key(row);if(!k||seen.has(k))continue;seen.add(k);out.push(row);}return out;}
function norm(v:unknown){return clean(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function visibleTender(auth:string,tenderId:string){return fetch(`${SUPABASE_URL}/rest/v1/kek_tender_watch?id=eq.${encodeURIComponent(tenderId)}&select=id,project_id,title,authority,procurement_no,publication_no,deadline,estimated_value,currency,relevance_score,payload&limit=1`,{headers:{apikey:ANON_KEY,Authorization:auth,'Content-Type':'application/json'}}).then(async r=>{const raw=await r.text();let body:any=null;try{body=raw?JSON.parse(raw):null;}catch{}if(!r.ok)throw new Error(`tender_visibility_${r.status}`);return Array.isArray(body)?body[0]:null;});}
function strings(v:any){return arr(v).map(x=>clean(x)).filter(Boolean);}
function familyOf(line:string){
  const s=norm(line);
  if(/\b(gyp|tube|pipe|rohr|boru|tub)\b/.test(s))return'tubes';
  if(/shufer.*rreth|round bar|rundstahl|steel rod|\brod\b/.test(s))return'profiles';
  if(/\b(hea|heb|hem|ipe|ipn|upn|upe|profil|profile|beam|angle|channel)\b/.test(s))return'profiles';
  if(/heavy plate|quarto|\bplate\b|pllak|blech/.test(s))return'heavy_plate';
  if(/sheet|coil|llamarin|\blim\b/.test(s))return'sheet';
  if(/\b(bolt|bulon|anker|anchor|fastener|washer|nut|screw)s?\b/.test(s))return'hardware';
  if(/fabricat|fabrik|konstruksion|steelwork|weld/.test(s))return'fabrication';
  return'';
}
function labelFor(family:string,line:string){
  const s=norm(line);
  if(family==='tubes'&&/(pa tegel|seamless|nahtlos)/.test(s))return'Gyp çeliku pa tegel';
  if(family==='tubes')return'Gyp / tub çeliku';
  if(family==='profiles'&&/(shufer.*rreth|round bar|rundstahl)/.test(s))return'Shufër rrethore çeliku';
  if(family==='profiles')return'Profile / shufra çeliku';
  if(family==='heavy_plate')return'Pllaka çeliku';
  if(family==='sheet')return'Llamarinë / fletë çeliku';
  if(family==='hardware')return'Bulona / ankera / lidhëse';
  if(family==='fabrication')return'Punime / fabrikim çeliku';
  return clean(line)||'Material çeliku';
}
function standardsFrom(all:string){
  const out:string[]=[];
  const patterns=[/\bEN\s*10204(?:\s*3[.]?[12])?\b/gi,/\bEN\s*10060\b/gi,/\bEN\s*10025(?:-\d+)?\b/gi,/\bEN\s*10083(?:-\d+)?\b/gi,/\bEN\s*10210(?:-\d+)?\b/gi,/\bEN\s*10219(?:-\d+)?\b/gi,/\bEN\s*10216(?:-\d+)?\b/gi,/\bEN\s*10297(?:-\d+)?\b/gi,/\bDIN\s*\d+[A-Z0-9-]*\b/gi,/\bASTM\s*[A-Z]\d+[A-Z0-9-]*\b/gi];
  for(const re of patterns)for(const m of all.matchAll(re))out.push(clean(m[0]).toUpperCase());
  return uniq(out,x=>x);
}
function certificationsFrom(all:string){
  const out:string[]=[];
  if(/ISO\s*9001(?:\s*:?[ -]?2015)?/i.test(all))out.push('ISO 9001');
  if(/ISO\s*14001/i.test(all))out.push('ISO 14001');
  if(/ISO\s*45001/i.test(all))out.push('ISO 45001');
  return out;
}
function canonicalGrade(v:string){
  const x=clean(v).toUpperCase();
  if(x==='42CRMO4')return'42CrMo4';
  if(x==='50MN7')return'50Mn7';
  if(x==='25CRMO4')return'25CrMo4';
  if(x==='S355J2H')return'S355J2H';
  if(x==='ST52')return'ST52';
  if(x==='E235')return'E235';
  if(x==='E355')return'E355';
  if(x==='C45')return'C45';
  return x;
}
function gradesFrom(all:string){
  const re=/\b(?:S(?:235|275|355|420|460)(?:JR|J0|J2|N|M|MC|NL|ML|J2H)?|42CrMo4|50Mn7|25CrMo4|C45|E235|E355|ST52)\b/gi;
  return uniq((all.match(re)||[]).map(canonicalGrade),x=>x);
}
function roundDimensions(all:string){
  const out:any[]=[];
  const re=/[Øø]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/gi;
  for(const m of all.matchAll(re))out.push({diameter_mm:Number(m[1].replace(',','.')),length_mm:Number(m[2].replace(',','.'))});
  return out;
}
function tubeDimensions(all:string){
  const out:any[]=[];
  const re=/D\s*=\s*(\d+(?:[.,]\d+)?)\s*mm[\s\S]{0,180}?d\s*=\s*(\d+(?:[.,]\d+)?)\s*mm[\s\S]{0,180}?S\s*=\s*(\d+(?:[.,]\d+)?)\s*mm/gi;
  for(const m of all.matchAll(re))out.push({outer_diameter_mm:Number(m[1].replace(',','.')),inner_diameter_mm:Number(m[2].replace(',','.')),wall_mm:Number(m[3].replace(',','.'))});
  return out;
}
function deliveryFrom(all:string){
  const m=all.match(/\b(EXW|FCA|FAS|FOB|CFR|CIF|CPT|CIP|DAP|DPU|DDP)\b/i);return m?m[1].toUpperCase():null;
}
function extractRequirements(tender:any){
  const analysis=tender?.payload?.dossier_analysis?.analysis||{};
  const scope=strings(analysis.steel_scope),tech=strings(analysis.technical_requirements),qty=strings(analysis.known_quantities_specs),commercial=strings(analysis.commercial_requirements),delivery=strings(analysis.delivery_terms);
  const allLines=[...scope,...tech,...qty,...commercial,...delivery],all=allLines.join('\n');
  const standards=standardsFrom(all),certs=certificationsFrom(all),grades=gradesFrom(all),deliveryTerm=deliveryFrom(all);
  const sourceCandidates=uniq(scope.filter(x=>familyOf(x)),x=>norm(x));
  const byFamily=new Map<string,string[]>();
  for(const line of sourceCandidates){const fam=familyOf(line);if(!fam)continue;if(!byFamily.has(fam))byFamily.set(fam,[]);byFamily.get(fam)!.push(line);}
  const requirements:Requirement[]=[];
  for(const [family,lines] of byFamily){
    if(family==='tubes'){
      const dims=tubeDimensions(all);
      const seamless=lines.some(x=>/(pa tegel|seamless|nahtlos)/i.test(x));
      requirements.push({id:'tubes',family:'tubes',label:seamless?'Gyp çeliku pa tegel':'Gyp / tub çeliku',description:lines.slice(0,5).join(' · '),dimensions:dims,standards,certifications:certs,grades,delivery_terms:deliveryTerm,source_lines:lines.slice(0,8)});
      continue;
    }
    if(family==='profiles'){
      const roundLines=lines.filter(x=>/shuf[eë]r.*rreth|round bar|rundstahl/i.test(x));
      if(roundLines.length){
        const dims=roundDimensions(roundLines.join('\n')+'\n'+all);
        requirements.push({id:'round_bar',family:'profiles',label:'Shufër rrethore çeliku',description:roundLines.slice(0,5).join(' · '),dimensions:dims,standards,certifications:certs,grades,delivery_terms:deliveryTerm,source_lines:roundLines.slice(0,8)});
      }
      const other=lines.filter(x=>roundLines.indexOf(x)<0);
      if(other.length)requirements.push({id:'profiles',family:'profiles',label:'Profile / shufra çeliku',description:other.slice(0,5).join(' · '),dimensions:[],standards,certifications:certs,grades,delivery_terms:deliveryTerm,source_lines:other.slice(0,8)});
      continue;
    }
    requirements.push({id:family,family,label:labelFor(family,lines[0]||''),description:lines.slice(0,5).join(' · '),dimensions:[],standards,certifications:certs,grades,delivery_terms:deliveryTerm,source_lines:lines.slice(0,8)});
  }
  if(!requirements.length){
    const title=clean(tender?.title),family=familyOf(title);
    if(family)requirements.push({id:family,family,label:labelFor(family,title),description:title,dimensions:family==='tubes'?tubeDimensions(all):roundDimensions(all),standards,certifications:certs,grades,delivery_terms:deliveryTerm,source_lines:[title]});
  }
  return requirements.slice(0,6);
}

function safeToken(v:unknown){return norm(v).replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80);}
function bomTubeDimensions(v:string){
  const out:any[]=[];
  const re=/OD\s*(\d+(?:[.,]\d+)?)\s*\/\s*ID\s*(\d+(?:[.,]\d+)?)\s*\/\s*WT\s*(\d+(?:[.,]\d+)?)(?:\s*[x×]\s*(\d+(?:[.,]\d+)?))?/gi;
  for(const m of v.matchAll(re))out.push({outer_diameter_mm:Number(m[1].replace(',','.')),inner_diameter_mm:Number(m[2].replace(',','.')),wall_mm:Number(m[3].replace(',','.')),length_mm:m[4]?Number(m[4].replace(',','.')):null});
  return out.length?out:tubeDimensions(v);
}
function uniqueStrings(v:any[]){return uniq(v.map(x=>clean(x)).filter(Boolean),x=>norm(x));}
function requirementStandards(row:any,globalStandards:string[]){
  return uniqueStrings([clean(row?.std),...globalStandards.filter(x=>/^EN\s*10204/i.test(x))]);
}
function tenderCompliance(tender:any){
  const analysis=tender?.payload?.dossier_analysis?.analysis||{};
  const all=[...strings(analysis.technical_requirements),...strings(analysis.commercial_requirements),...strings(analysis.delivery_terms),...strings(analysis.known_quantities_specs)].join('\n');
  return {standards:standardsFrom(all),certifications:certificationsFrom(all),delivery_terms:deliveryFrom(all),source_lines:strings(analysis.technical_requirements).filter(x=>/ISO\s*9001|EN\s*10204|certifikat|test raport/i.test(x)).slice(0,8)};
}
async function resolveProjectId(tender:any){
  if(isUuid(tender?.project_id))return text(tender.project_id,80);
  const ref=clean(tender?.procurement_no);if(!ref)return null;
  const {data,error}=await db.from('projects').select('id,ref,business_ref').or('ref.ilike.%'+ref+'%,business_ref.ilike.%'+ref+'%').limit(5);
  if(error){console.warn('project resolution unavailable',error.message);return null;}
  const exact=uniq((data||[]).filter((x:any)=>[clean(x?.ref),clean(x?.business_ref)].some(v=>v&&v.includes(ref))),x=>text((x as any).id,80));
  return exact.length===1?text((exact[0] as any).id,80):null;
}
function rowFamily(row:any){
  const s=norm([row?.profile,row?.materiali,row?.material,row?.dimensionet,row?.dim].filter(Boolean).join(' '));
  if(/seamless|pa tegel|\btube\b|\bpipe\b|\bgyp\b/.test(s))return'tubes';
  if(/round bar|shufer|rrethore/.test(s))return'round_bar';
  return familyOf(s);
}
function rowDimensions(row:any,family:string){
  const s=[clean(row?.dim),clean(row?.dimensionet)].filter(Boolean).join(' ');
  if(family==='tubes')return bomTubeDimensions(s);
  if(family==='round_bar')return roundDimensions(s);
  return[];
}
async function requirementsFromProjectBom(projectId:string,tender:any){
  const {data,error}=await db.from('bom_items').select('id,pozicioni,materiali,dimensionet,profile,dim,grade,std,len_mm,kg,cert,needs_review').eq('project_id',projectId).order('id',{ascending:true}).limit(1000);
  if(error){console.warn('canonical BOM unavailable',error.message);return[];}
  const rows=(data||[]).filter((x:any)=>x?.needs_review!==true),compliance=tenderCompliance(tender),out:Requirement[]=[];
  const round=rows.filter((x:any)=>rowFamily(x)==='round_bar'),normal=new Map<string,any[]>();
  for(const row of round){
    const dims=rowDimensions(row,'round_bar'),max=Math.max(0,...dims.map((x:any)=>Number(x?.diameter_mm||0)));
    const grade=clean(row?.grade)||'unspecified';
    if(max>=300){
      out.push({id:'round_bar_'+safeToken(grade)+'_'+String(max||row?.id),family:'profiles',label:'Shufër rrethore '+(max?'Ø'+max:'')+(row?.len_mm?'×'+row.len_mm:''),description:[clean(row?.materiali),clean(row?.dim),grade,clean(row?.std)].filter(Boolean).join(' · '),dimensions:dims,standards:requirementStandards(row,compliance.standards),certifications:compliance.certifications,grades:grade==='unspecified'?[]:[grade],delivery_terms:compliance.delivery_terms,source_lines:[clean(row?.materiali),clean(row?.dim),...compliance.source_lines].filter(Boolean)});
    }else{
      const key=grade+'|'+clean(row?.std);if(!normal.has(key))normal.set(key,[]);normal.get(key)!.push(row);
    }
  }
  for(const [key,group] of normal){
    const dims=group.flatMap((x:any)=>rowDimensions(x,'round_bar')),ds=dims.map((x:any)=>Number(x?.diameter_mm||0)).filter((x:number)=>x>0),grade=clean(group[0]?.grade),std=clean(group[0]?.std),lo=ds.length?Math.min(...ds):0,hi=ds.length?Math.max(...ds):0;
    out.push({id:'round_bar_'+safeToken(grade||key)+'_'+String(lo)+'_'+String(hi),family:'profiles',label:'Shufra rrethore '+(lo&&hi?'Ø'+lo+'–Ø'+hi:grade||''),description:[grade,std,group.length+' pozicione'].filter(Boolean).join(' · '),dimensions:dims,standards:requirementStandards(group[0],compliance.standards),certifications:compliance.certifications,grades:grade?[grade]:[],delivery_terms:compliance.delivery_terms,source_lines:group.slice(0,8).map((x:any)=>[clean(x?.pozicioni),clean(x?.materiali),clean(x?.dim)].filter(Boolean).join(' · ')).concat(compliance.source_lines)});
  }
  for(const row of rows.filter((x:any)=>rowFamily(x)==='tubes')){
    const dims=rowDimensions(row,'tubes'),x=dims[0]||{},grade=clean(row?.grade),label='Gyp pa tegel '+(x.outer_diameter_mm?String(x.outer_diameter_mm)+'×'+String(x.wall_mm||'?'):'');
    out.push({id:'tube_'+safeToken(String(row?.pozicioni||row?.id)),family:'tubes',label,description:[clean(row?.materiali),clean(row?.dim),grade,clean(row?.std)].filter(Boolean).join(' · '),dimensions:dims,standards:requirementStandards(row,compliance.standards),certifications:compliance.certifications,grades:grade?[grade]:[],delivery_terms:compliance.delivery_terms,source_lines:[clean(row?.materiali),clean(row?.dim),...compliance.source_lines].filter(Boolean)});
  }
  return out.slice(0,30);
}
function supplierIdentityKey(x:any){
  const site=clean(x?.website||x?.website_url),domain=site?domainOf(site):clean(x?.company_domain||x?.domain);
  return domain||norm(x?.name||x?.company_name||x?.email||'');
}
function combinedStrictCount(internal:any,catalog:any){
  const rows=[...arr(internal?.candidates).filter((x:any)=>x?.strict_fit===true),...arr(catalog?.candidates).filter((x:any)=>x?.rfq_ready_candidate===true)];
  return new Set(rows.map(supplierIdentityKey).filter(Boolean)).size;
}
async function workflowStatus(projectId:string|null){
  if(!projectId)return{rfq_prepared:0,rfq_sent:0,replies:0,offers_received:0};
  const {data,error}=await db.from('rfq_log').select('status,sent_at,replied_at,offer_id').eq('project_id',projectId).limit(1000);
  if(error)return{rfq_prepared:0,rfq_sent:0,replies:0,offers_received:0};
  const rows=data||[];
  return{
    rfq_prepared:rows.filter((x:any)=>!x?.sent_at&&['draft_review','planned','scheduled','draft'].includes(clean(x?.status).toLowerCase())).length,
    rfq_sent:rows.filter((x:any)=>!!x?.sent_at).length,
    replies:rows.filter((x:any)=>!!x?.replied_at).length,
    offers_received:rows.filter((x:any)=>!!x?.offer_id).length
  };
}

function matcherRequirement(r:Requirement,tender:any){
  return {family:r.family,description:r.description||r.label,standards:r.standards,certifications:r.certifications,grades:r.grades,dimensions:r.dimensions,delivery_terms:r.delivery_terms||(tender?.payload?.source==='KRPP'?'Kosovo':null)};
}
async function internalMatch(r:Requirement,tender:any,projectId:string|null){
  const {data,error}=await db.rpc('pppp_chatgpt_supplier_intelligence_v1',{p_requirement:matcherRequirement(r,tender),p_project_id:projectId,p_min_qualified:3,p_threshold:70,p_limit:12});
  if(error)throw error;
  const req=arr(data?.requirements)[0]||{};
  return {summary:data?.summary||{},coverage_sufficient:req.coverage_sufficient===true,discovery_needed:req.discovery_needed!==false,strict_rfq_ready_existing:Number(req.strict_rfq_ready_existing||0),review_rfq_ready_existing:Number(req.review_rfq_ready_existing||0),explicit_conflicts:Number(req.explicit_conflicts||0),evidence_gaps:Number(req.evidence_gaps||0),candidates:arr(req.candidates).filter((x:any)=>!x.explicit_conflict).slice(0,10),conflicts:arr(req.candidates).filter((x:any)=>x.explicit_conflict).slice(0,6)};
}
function catalogFamilies(r:Requirement){if((r.id==='round_bar'||r.id.startsWith('round_bar_')))return['round_bar','profiles'];if(r.family==='tubes')return['seamless_pipe','tubes'];return[r.family];}
function evidenceMatch(required:string,available:any[]){const req=norm(required);return arr(available).some((x:any)=>{const a=norm(x);return !!a&&(a.includes(req)||req.includes(a));});}
function near(a:any,b:any,tol=.11){return Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<=tol;}
function catalogDimensionEvidence(r:Requirement,row:any){
  const ds=arr(r.dimensions);if(!ds.length)return{verified:true,conflict:false,reason:'no_dimension_constraint'};
  if((r.id==='round_bar'||r.id.startsWith('round_bar_'))){
    const req=Math.max(...ds.map((x:any)=>Number(x?.diameter_mm||0)).filter((x:number)=>x>0));if(!req)return{verified:false,conflict:false,reason:'round_dimension_unparsed'};
    const max=Number(row?.max_diameter_mm||0);if(max&&max<req)return{verified:false,conflict:true,reason:`max Ø${max} mm < required Ø${req} mm`};
    return{verified:!!(max&&max>=req),conflict:false,reason:max?`official range through Ø${max} mm`:'diameter range not explicitly catalogued'};
  }
  if(r.family==='tubes'){
    const exact=arr(row?.verified_dimensions),allExact=ds.length>0&&ds.every((req:any)=>exact.some((x:any)=>near(x?.outer_diameter_mm,req?.outer_diameter_mm)&&(!Number(req?.wall_mm)||near(x?.wall_mm,req?.wall_mm))));
    if(allExact)return{verified:true,conflict:false,reason:'official dimensional table covers requested OD/wall'};
    const maxOd=Number(row?.max_outer_diameter_mm||0),maxWall=Number(row?.max_wall_mm||0),reqOd=Math.max(...ds.map((x:any)=>Number(x?.outer_diameter_mm||0)).filter((x:number)=>x>0)),reqWall=Math.max(...ds.map((x:any)=>Number(x?.wall_mm||0)).filter((x:number)=>x>0));
    if(maxOd&&reqOd&&maxOd<reqOd)return{verified:false,conflict:true,reason:`max OD ${maxOd} mm < required ${reqOd} mm`};
    if(maxWall&&reqWall&&maxWall<reqWall)return{verified:false,conflict:true,reason:`max wall ${maxWall} mm < required ${reqWall} mm`};
    const verified=!!(maxOd&&reqOd&&maxOd>=reqOd&&(!reqWall||!maxWall||maxWall>=reqWall));
    return{verified,conflict:false,reason:verified?`official OD range through ${maxOd} mm`:'requested dimensions require supplier confirmation'};
  }
  return{verified:false,conflict:false,reason:'dimension evidence not structured for this family'};
}
async function catalogMatch(r:Requirement){
  const {data,error}=await db.from('pppp_supplier_public_catalog_v1').select('canonical_key,name,country,source_tier,families,product_focus,grades,standards,certifications,max_diameter_mm,max_outer_diameter_mm,max_wall_mm,verified_dimensions,email,website,evidence_url,contact_url,evidence_note,verification_status,evidence_checked_at').eq('active',true).limit(100);
  if(error){console.warn('supplier catalog unavailable',error.message);return{candidates:[],conflicts:[],rfq_ready_count:0,review_count:0};}
  const families=catalogFamilies(r),rows:any[]=[],conflicts:any[]=[];
  for(const row of data||[]){
    if(!arr(row.families).some((x:any)=>families.includes(text(x,80))))continue;
    const dim=catalogDimensionEvidence(r,row);if(dim.conflict){conflicts.push({...row,source:'verified_public_catalog',catalog_verified:true,product_evidence:true,dimension_evidence:dim,rfq_ready_candidate:false,verification_status:'catalog_explicit_conflict',score:0});continue;}
    const standardEvidence=!r.standards.length||r.standards.every(x=>evidenceMatch(x,row.standards));
    const certificateEvidence=!r.certifications.length||r.certifications.every(x=>evidenceMatch(x,row.certifications));
    const gradeEvidence=!r.grades.length||r.grades.every(x=>evidenceMatch(x,row.grades));
    const contactReady=!!text(row.email,320),rfqReady=contactReady&&dim.verified&&standardEvidence&&certificateEvidence&&gradeEvidence;
    let score=55+(contactReady?15:0)+(dim.verified?10:0)+(standardEvidence?8:0)+(certificateEvidence?8:0)+(gradeEvidence?4:0);
    rows.push({...row,source:'verified_public_catalog',catalog_verified:true,product_evidence:true,dimension_evidence:dim,standard_evidence:standardEvidence,certificate_evidence:certificateEvidence,grade_evidence:gradeEvidence,contact_ready:contactReady,rfq_ready_candidate:rfqReady,verification_status:rfqReady?'rfq_ready_evidence_candidate':'catalog_verified_review',score:Math.min(100,score)});
  }
  rows.sort((a,b)=>Number(b.rfq_ready_candidate)-Number(a.rfq_ready_candidate)||Number(b.contact_ready)-Number(a.contact_ready)||b.score-a.score||String(a.name).localeCompare(String(b.name)));
  return{candidates:rows.slice(0,12),conflicts:conflicts.slice(0,8),rfq_ready_count:rows.filter(x=>x.rfq_ready_candidate).length,review_count:rows.filter(x=>!x.rfq_ready_candidate&&x.contact_ready).length};
}
function tierLocations(tier:string){if(tier==='local')return['Kosovo'];if(tier==='regional')return['North Macedonia','Serbia'];if(tier==='turkey')return['Turkey'];if(tier==='greece')return['Greece'];return['Germany','Italy','Romania','Poland'];}
function familySearch(r:Requirement){
  if((r.id==='round_bar'||r.id.startsWith('round_bar_')))return'steel round bar';
  if(r.family==='tubes')return /pa tegel|seamless/i.test(r.label+' '+r.description)?'seamless steel tube':'steel tube';
  if(r.family==='heavy_plate')return'heavy steel plate';
  if(r.family==='sheet')return'steel sheet coil';
  if(r.family==='hardware')return'steel bolts anchors';
  if(r.family==='profiles')return'structural steel profiles';
  if(r.family==='fabrication')return'structural steel fabrication';
  return'steel supplier';
}
function dimensionSearch(r:Requirement){
  const ds=arr(r.dimensions);if(!ds.length)return'';
  const x=ds[0]||{};
  if(x.diameter_mm)return `${x.diameter_mm} mm diameter`;
  if(x.outer_diameter_mm)return `${x.outer_diameter_mm} mm OD ${x.wall_mm||''} mm wall`;
  return'';
}
function buildQuery(r:Requirement,location:string){
  const product=familySearch(r),dim=dimensionSearch(r),largeRound=(r.id==='round_bar'||r.id.startsWith('round_bar_'))&&arr(r.dimensions).some((x:any)=>Number(x?.diameter_mm||0)>=300);
  const productTerm=largeRound?'"large diameter steel round bar"':`"${product}"`;
  return [productTerm,r.grades[0]||'',r.standards.find(x=>!/^EN\s*10204/i.test(x))||'',dim,'manufacturer supplier',location].filter(Boolean).join(' ');
}
function decodeXml(v:string){return v.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function rssItems(xml:string){
  const out:any[]=[];for(const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)){const b=m[1],title=decodeXml((b.match(/<title>([\s\S]*?)<\/title>/i)||[])[1]||''),link=decodeXml((b.match(/<link>([\s\S]*?)<\/link>/i)||[])[1]||''),desc=decodeXml((b.match(/<description>([\s\S]*?)<\/description>/i)||[])[1]||'');if(title&&/^https?:\/\//i.test(link))out.push({title,link,description:desc});}return out;
}
function domainOf(u:string){try{return new URL(u).hostname.toLowerCase().replace(/^www\./,'');}catch{return'';}}
function badDomain(d:string){return !d||/(bing\.com|microsoft\.com|google\.|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|wikipedia\.org|alibaba\.|made-in-china\.|indiamart\.|europages\.|kompass\.|globalsources\.|pinterest\.|worldsteel\.org|mysteel\.com|steel-orbis\.|steelorbis\.)/i.test(d);}
function emailFrom(html:string){
  const mail=(html.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)||[])[1]||(html.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)||[])[1]||'';
  return mail&&!/example\.|wixpress|sentry|cloudflare|wordpress/i.test(mail)?mail.toLowerCase():null;
}
function contactHref(html:string,base:string){for(const m of html.matchAll(/href=["']([^"']+)["']/gi)){const href=m[1];if(!/(contact|kontakt|iletisim|iletişim|contatti|kontaktai|contacts?)/i.test(href))continue;try{return new URL(href,base).toString();}catch{}}return'';}
function productEvidence(r:Requirement,s:string){
  s=norm(s);
  if((r.id==='round_bar'||r.id.startsWith('round_bar_')))return /(round bar|rundstahl|bright bar|steel bar|rolled bar|forged bar)/.test(s);
  if(r.family==='tubes')return /(seamless|steel tube|steel pipe|boru|rohr)/.test(s);
  if(r.family==='heavy_plate')return /(heavy plate|steel plate|quarto)/.test(s);
  if(r.family==='sheet')return /(steel sheet|coil|sheet metal)/.test(s);
  if(r.family==='hardware')return /(bolt|anchor|fastener)/.test(s);
  if(r.family==='profiles')return /(steel profile|beam|channel|angle|round bar)/.test(s);
  return /(steel|metal)/.test(s);
}
async function fetchText(url:string,timeout=4500){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeout);
  try{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 PPPP Supplier Discovery/1.0','Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'},redirect:'follow',signal:ac.signal});if(!r.ok)return'';return text(await r.text(),220000);}catch{return'';}finally{clearTimeout(timer);}
}
async function discoverRequirement(r:Requirement){
  const tiers=['local','regional','turkey','greece','eu'],all:ExternalCandidate[]=[],queries:any[]=[];let pageFetches=0;
  const evidenceComplete=()=>all.filter(x=>x.verification_status==='evidence_complete_review').length;
  for(const tier of tiers){
    if(evidenceComplete()>=3||pageFetches>=20)break;
    let tierFetches=0;
    for(const location of tierLocations(tier)){
      if(evidenceComplete()>=3||pageFetches>=20||tierFetches>=4)break;
      const query=buildQuery(r,location),url='https://www.bing.com/search?format=rss&setlang=en-us&mkt=en-US&q='+encodeURIComponent(query);
      const xml=await fetchText(url,5000);queries.push({tier,location,query,ok:!!xml});
      const items=rssItems(xml).slice(0,8);
      for(const item of items){
        if(pageFetches>=20||tierFetches>=4)break;
        const d=domainOf(item.link);if(badDomain(d)||all.some(x=>x.domain===d))continue;
        const searchEvidence=[item.title,item.description].join('\n');
        pageFetches++;tierFetches++;let page=await fetchText(item.link,3500),evidence=[searchEvidence,page].join('\n');
        const prod=productEvidence(r,evidence);if(!prod)continue;
        let email=emailFrom(page),home='';if(!email&&pageFetches<20&&tierFetches<4){pageFetches++;tierFetches++;home=await fetchText('https://'+d+'/',3000);email=emailFrom(home);if(home)evidence+='\n'+home;}
        if(!email&&pageFetches<20&&tierFetches<4){const contact=contactHref(page||home,item.link);if(contact){pageFetches++;tierFetches++;const cp=await fetchText(contact,3000);email=emailFrom(cp);if(cp)evidence+='\n'+cp;}}
        const ev=norm(evidence),std=r.standards.length?r.standards.every(s=>ev.includes(norm(s))):true,cert=r.certifications.length?r.certifications.every(s=>ev.includes(norm(s))):true,grade=r.grades.length?r.grades.every(s=>ev.includes(norm(s))):true,dimTerm=dimensionSearch(r),dimEvidence=!dimTerm||ev.includes(norm(dimTerm));
        const complete=!!email&&std&&cert&&grade&&dimEvidence;
        const score=45+(email?20:0)+(std?12:0)+(cert?8:0)+(grade?8:0)+(dimEvidence?5:0)+(tier==='local'?8:tier==='regional'?6:tier==='turkey'||tier==='greece'?5:3);
        all.push({name:clean(item.title).replace(/\s*[-|–].*$/,'').slice(0,120)||d,domain:d,website:item.link,email,source_tier:tier,query,title:item.title,snippet:item.description,product_evidence:true,standard_evidence:std,certificate_evidence:cert,grade_evidence:grade,dimension_evidence:dimEvidence,contact_ready:!!email,verification_status:complete?'evidence_complete_review':email?'contact_ready_review':'verification_required',score});
      }
    }
  }
  all.sort((a,b)=>Number(b.verification_status==='evidence_complete_review')-Number(a.verification_status==='evidence_complete_review')||Number(b.contact_ready)-Number(a.contact_ready)||b.score-a.score||a.name.localeCompare(b.name));
  return {queries,candidates:all.slice(0,12),contact_ready_count:all.filter(x=>x.contact_ready).length,evidence_complete_review_count:evidenceComplete(),page_fetches:pageFetches};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  try{
    const auth=req.headers.get('Authorization')||'';
    if(!auth.toLowerCase().startsWith('bearer '))return json({ok:false,error:'unauthorized'},401);
    if(!SUPABASE_URL||!SERVICE_KEY||!ANON_KEY)return json({ok:false,error:'supabase_environment_missing'},500);
    let body:any={};try{body=await req.json();}catch{}
    const tenderId=text(body?.tender_id,80);if(!isUuid(tenderId))return json({ok:false,error:'valid_tender_id_required'},400);
    const tender=await visibleTender(auth,tenderId);if(!tender)return json({ok:false,error:'tender_not_found_or_not_visible'},404);
    const projectId=await resolveProjectId(tender),bomRequirements=projectId?await requirementsFromProjectBom(projectId,tender):[],requirements=bomRequirements.length?bomRequirements:extractRequirements(tender),requirementSource=bomRequirements.length?'canonical_bom':'dossier_analysis';if(!requirements.length)return json({ok:true,tender_id:tenderId,project_id:projectId,title:tender.title,requirements:[],summary:{requirements:0,strict_ready:0,review_ready:0,external_discovery_needed:true},message:'PPPP nuk gjeti ende artikuj furnizimi të strukturuar në analizën e dosjes.'});
    const discover=body?.discover===true,only=text(body?.requirement_id,80),rows:any[]=[];let strict=0,review=0,catalogReady=0,catalogReview=0,needs=false;
    for(const requirement of requirements){
      if(only&&requirement.id!==only)continue;
      const [internal,catalog]=await Promise.all([internalMatch(requirement,tender,projectId),catalogMatch(requirement)]);
      const combinedStrict=combinedStrictCount(internal,catalog);strict+=combinedStrict;review+=internal.review_rfq_ready_existing;catalogReady+=catalog.rfq_ready_count;catalogReview+=catalog.review_count;
      const covered=combinedStrict>=3;needs=needs||!covered;
      let external:any=null;if(discover&&!covered)external=await discoverRequirement(requirement);
      rows.push({...requirement,internal,catalog,external,strict_rfq_ready_combined:combinedStrict,minimum_rfq_ready:3,coverage_sufficient:covered,discovery_needed:!covered});
    }
    const workflow=await workflowStatus(projectId);
    return json({ok:true,sourcing_version:5,read_only:true,tender_id:tenderId,project_id:projectId,requirement_source:requirementSource,title:tender.title,authority:tender.authority,deadline:tender.deadline,estimated_value:tender.estimated_value,currency:tender.currency,requirements:rows,workflow,summary:{requirements:rows.length,strict_ready:strict,review_ready:review,catalog_rfq_ready:catalogReady,catalog_review_ready:catalogReview,external_discovery_needed:needs,external_search_executed:discover},policy:{supplier_selection_allowed:false,supplier_commitment_allowed:false,email_send_allowed:false,rfq_draft_preparation_allowed:true,external_discovery_on_demand_only:true,verified_catalog_is_evidence_cache_not_supplier_selection:true,no_supplier_master_write:true,no_rfq_write:true}});
  }catch(e){console.error('pppp-tender-supplier-sourcing-v1',e);return json({ok:false,error:'supplier_sourcing_failed',message:text((e as any)?.message||e,700)},500);}
});
