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
type ExternalCandidate={name:string,domain:string,website:string,email:string|null,source_tier:string,query:string,title:string,snippet:string,product_evidence:boolean,standard_evidence:boolean,certificate_evidence:boolean,contact_ready:boolean,verification_status:string,score:number};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});}
function text(v:unknown,max=6000){return String(v==null?'':v).trim().slice(0,max);}
function arr(v:unknown){return Array.isArray(v)?v:[];}
function isUuid(v:unknown){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(v,80));}
function clean(v:unknown){return text(v,1200).replace(/\s+/g,' ').trim();}
function uniq<T>(rows:T[],key:(x:T)=>string){const seen=new Set<string>(),out:T[]=[];for(const row of rows){const k=key(row);if(!k||seen.has(k))continue;seen.add(k);out.push(row);}return out;}
function norm(v:unknown){return clean(v).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function visibleTender(auth:string,tenderId:string){return fetch(`${SUPABASE_URL}/rest/v1/kek_tender_watch?id=eq.${encodeURIComponent(tenderId)}&select=id,title,authority,procurement_no,publication_no,deadline,estimated_value,currency,relevance_score,payload&limit=1`,{headers:{apikey:ANON_KEY,Authorization:auth,'Content-Type':'application/json'}}).then(async r=>{const raw=await r.text();let body:any=null;try{body=raw?JSON.parse(raw):null;}catch{}if(!r.ok)throw new Error(`tender_visibility_${r.status}`);return Array.isArray(body)?body[0]:null;});}
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
  const patterns=[/\bEN\s*10204\b/gi,/\bEN\s*10025(?:-\d+)?\b/gi,/\bEN\s*10210(?:-\d+)?\b/gi,/\bEN\s*10219(?:-\d+)?\b/gi,/\bEN\s*10216(?:-\d+)?\b/gi,/\bEN\s*10297(?:-\d+)?\b/gi,/\bDIN\s*\d+[A-Z0-9-]*\b/gi,/\bASTM\s*[A-Z]\d+[A-Z0-9-]*\b/gi];
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
function gradesFrom(all:string){
  return uniq((all.match(/\bS(?:235|275|355|420|460)(?:JR|J0|J2|N|M|MC|NL|ML)?\b/gi)||[]).map(x=>x.toUpperCase()),x=>x);
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
function matcherRequirement(r:Requirement,tender:any){
  return {family:r.family,description:r.description||r.label,standards:r.standards,certifications:r.certifications,grades:r.grades,dimensions:r.dimensions,delivery_terms:r.delivery_terms||(tender?.payload?.source==='KRPP'?'Kosovo':null)};
}
async function internalMatch(r:Requirement,tender:any){
  const {data,error}=await db.rpc('pppp_chatgpt_supplier_intelligence_v1',{p_requirement:matcherRequirement(r,tender),p_project_id:null,p_min_qualified:3,p_threshold:70,p_limit:12});
  if(error)throw error;
  const req=arr(data?.requirements)[0]||{};
  return {summary:data?.summary||{},coverage_sufficient:req.coverage_sufficient===true,discovery_needed:req.discovery_needed!==false,strict_rfq_ready_existing:Number(req.strict_rfq_ready_existing||0),review_rfq_ready_existing:Number(req.review_rfq_ready_existing||0),explicit_conflicts:Number(req.explicit_conflicts||0),evidence_gaps:Number(req.evidence_gaps||0),candidates:arr(req.candidates).filter((x:any)=>!x.explicit_conflict).slice(0,10),conflicts:arr(req.candidates).filter((x:any)=>x.explicit_conflict).slice(0,6)};
}
function tierLocations(tier:string){if(tier==='local')return['Kosovo'];if(tier==='regional')return['North Macedonia','Serbia'];if(tier==='turkey')return['Turkey'];if(tier==='greece')return['Greece'];return['Germany','Italy','Romania','Poland'];}
function familySearch(r:Requirement){
  if(r.id==='round_bar')return'steel round bar';
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
  const product=familySearch(r),dim=dimensionSearch(r),largeRound=r.id==='round_bar'&&arr(r.dimensions).some((x:any)=>Number(x?.diameter_mm||0)>=300);
  const productTerm=largeRound?'"large diameter steel round bar"':`"${product}"`;
  return [productTerm,dim,'manufacturer supplier',location].filter(Boolean).join(' ');
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
  if(r.id==='round_bar')return /(round bar|rundstahl|bright bar|steel bar|rolled bar|forged bar)/.test(s);
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
  for(const tier of tiers){
    if(all.filter(x=>x.contact_ready).length>=3||pageFetches>=14)break;
    for(const location of tierLocations(tier)){
      if(all.filter(x=>x.contact_ready).length>=3||pageFetches>=14)break;
      const query=buildQuery(r,location),url='https://www.bing.com/search?format=rss&setlang=en-us&mkt=en-US&q='+encodeURIComponent(query);
      const xml=await fetchText(url,5000);queries.push({tier,location,query,ok:!!xml});
      const items=rssItems(xml).slice(0,8);
      for(const item of items){
        if(all.length>=12||pageFetches>=14)break;
        const d=domainOf(item.link);if(badDomain(d)||all.some(x=>x.domain===d))continue;
        const searchEvidence=[item.title,item.description].join('\n');
        pageFetches++;let page=await fetchText(item.link,3500),evidence=[searchEvidence,page].join('\n');
        const prod=productEvidence(r,evidence);if(!prod)continue;
        let email=emailFrom(page),home='';if(!email&&pageFetches<14){pageFetches++;home=await fetchText('https://'+d+'/',3000);email=emailFrom(home);if(home)evidence+='\n'+home;}
        if(!email&&pageFetches<14){const contact=contactHref(page||home,item.link);if(contact){pageFetches++;const cp=await fetchText(contact,3000);email=emailFrom(cp);if(cp)evidence+='\n'+cp;}}
        const std=r.standards.length?r.standards.some(s=>norm(evidence).includes(norm(s))):false,cert=r.certifications.length?r.certifications.some(s=>norm(evidence).includes(norm(s))):false;
        const score=45+(email?20:0)+(std?12:0)+(cert?8:0)+(tier==='local'?8:tier==='regional'?6:tier==='turkey'||tier==='greece'?5:3);
        all.push({name:clean(item.title).replace(/\s*[-|–].*$/,'').slice(0,120)||d,domain:d,website:item.link,email,source_tier:tier,query,title:item.title,snippet:item.description,product_evidence:true,standard_evidence:std,certificate_evidence:cert,contact_ready:!!email,verification_status:email?'contact_ready_review':'verification_required',score});
      }
    }
  }
  all.sort((a,b)=>Number(b.contact_ready)-Number(a.contact_ready)||b.score-a.score||a.name.localeCompare(b.name));
  return {queries,candidates:all.slice(0,10),contact_ready_count:all.filter(x=>x.contact_ready).length};
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
    const requirements=extractRequirements(tender);if(!requirements.length)return json({ok:true,tender_id:tenderId,title:tender.title,requirements:[],summary:{requirements:0,strict_ready:0,review_ready:0,external_discovery_needed:true},message:'PPPP nuk gjeti ende artikuj furnizimi të strukturuar në analizën e dosjes.'});
    const discover=body?.discover===true,only=text(body?.requirement_id,80),rows:any[]=[];let strict=0,review=0,needs=false;
    for(const requirement of requirements){
      if(only&&requirement.id!==only)continue;
      const internal=await internalMatch(requirement,tender);strict+=internal.strict_rfq_ready_existing;review+=internal.review_rfq_ready_existing;needs=needs||internal.discovery_needed;
      let external:any=null;if(discover&&internal.discovery_needed)external=await discoverRequirement(requirement);
      rows.push({...requirement,internal,external});
    }
    return json({ok:true,sourcing_version:1,read_only:true,tender_id:tenderId,title:tender.title,authority:tender.authority,deadline:tender.deadline,estimated_value:tender.estimated_value,currency:tender.currency,requirements:rows,summary:{requirements:rows.length,strict_ready:strict,review_ready:review,external_discovery_needed:needs,external_search_executed:discover},policy:{supplier_selection_allowed:false,supplier_commitment_allowed:false,email_send_allowed:false,rfq_draft_preparation_allowed:true,external_discovery_on_demand_only:true,no_supplier_master_write:true,no_rfq_write:true}});
  }catch(e){console.error('pppp-tender-supplier-sourcing-v1',e);return json({ok:false,error:'supplier_sourcing_failed',message:text((e as any)?.message||e,700)},500);}
});
