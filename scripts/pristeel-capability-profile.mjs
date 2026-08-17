/* PRISTEEL Capability Profile v1
 * Shared procurement-fit rules for public tender intake.
 * Purpose: identify work PRISTEEL can supply/fabricate even when a notice never says "steel".
 * Review-first: contextual matches stay review-only unless the notice has direct technical evidence.
 */

export const PRISTEEL_CAPABILITY_PROFILE_VERSION='2026-08-17.1';

export const PRISTEEL_CAPABILITY_PROFILE=Object.freeze({
  version:PRISTEEL_CAPABILITY_PROFILE_VERSION,
  principle:'Assess whether PRISTEEL can realistically supply, fabricate or execute a meaningful package, not whether the notice contains the word steel.',
  families:Object.freeze([
    {key:'raw_material',label:'Lëndë e parë çeliku',examples:['plates/sheets/coils','IPE/HEA/HEB/UPN profiles','tubes/pipes','bars/wire','B500/B500C rebar']},
    {key:'fabricated_structures',label:'Struktura të fabrikuara',examples:['welded frames','supports','platforms/walkways','stairs/handrails','grating','fences','halls/canopies','bridges and structural packages']},
    {key:'energy_grid',label:'Energji dhe rrjet',examples:['lattice towers/masts','substation portals/gantries','transmission-line steel','equipment support steel']},
    {key:'industrial_steelwork',label:'Punime industriale',examples:['conveyors','chutes/hoppers/bunkers','silos/ducts','pipe racks','maintenance platforms','industrial supports']},
    {key:'fabrication_services',label:'Shërbime fabrikimi',examples:['fabrication','welding','cutting/drilling','galvanizing','coating','assembly/installation where applicable']},
    {key:'rebar',label:'Armaturë',examples:['B500/B500C','reinforcement bars/coils','cutting/bending supply']}
  ])
});

const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=v=>String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const EXACT=new Set(['ipe','ipn','hea','heb','hem','upe','upn','unp','b500','b500c','hekur','hekuri','hekurit','celik','celiku','celikut','steel','rebar']);
const PROFILE_CODES=['ipe','ipn','hea','heb','hem','upe','upn','unp'];

function token(h,t){return new RegExp(`(?:^|[^a-z0-9])${esc(norm(t))}(?=$|[^a-z0-9])`,'i').test(norm(h));}
function contains(h,t){const x=norm(t);return EXACT.has(x)?token(h,x):norm(h).includes(x);}
function first(h,terms){return terms.find(t=>contains(h,t))||'';}
function unique(v){return[...new Set((v||[]).filter(Boolean))];}

const DIRECT_MATERIAL=[
  'llamarine','llamarina','llamara','pllake celiku','pllake metalike','material celiku','material metalik','profile celiku','profile metalike','profile hekuri',
  'shufra celiku','shufer celiku','trar celiku','tuba celiku','gypa celiku','tel celiku','tela celiku','litar celiku','zinxhir celiku','rrjete celiku',
  'steel plate','steel sheet','steel coil','steel beam','steel tube','steel pipe','flat bar','angle steel','celik','celiku','celikut','steel','hekur','hekuri','hekurit'
];
const MATERIAL_REVIEW=['metal','profil metal','profil celik','shufr','llamar','trar metal','tub metal','gyp metal','bobine','coil','materiale metalike','produkte metalike'];
const REBAR=['armature','armaturë','rebar','b500','b500c','reinforcement bar','reinforcing steel'];
const DIRECT_STRUCTURE=[
  'konstruksion metalik','konstruksione metalike','konstruksion celiku','strukture celiku','struktura celiku','strukture metalike','struktura metalike','steel structure','steelwork',
  'halle metalike','mbulese metalike','platforme metalike','platforma metalike','shkalle metalike','rrethoje metalike','rrethim metalik','shtylle metalike','shtylla metalike',
  'support steel','steel support','frame steel','ura metalike','skela metalike','metal framework','structural steel'
];
const STRUCTURE_CONTEXT=[
  'platforme','platforma','walkway','catwalk','grating','shkalle','shkallë','stairs','handrail','parmak','rrethoje','rrethim','fence','mbulese','mbulesë','canopy',
  'halle','hala','warehouse','depo prefabrikuar','konstruksion prefabrikuar','urë','ura','bridge','footbridge','support','mbajtese','mbajtëse','frame','skelet'
];
const ENERGY_CONTEXT=[
  'nenstacion','nënstacion','substation','linje transmetimi','linjë transmetimi','transmission line','lattice tower','lattice mast','shtylle transmetimi','shtyllë transmetimi',
  'shtylla transmetimi','tower','mast','gantry','portal','portale','portal beam','earth wire peak','lightning mast'
];
const INDUSTRIAL_CONTEXT=[
  'transportues','conveyor','chute','hopper','bunker','silo','duct','pipe rack','piperack','termocentral','power plant','impiant industrial','pajisje industriale',
  'platforme mirembajtjeje','platformë mirëmbajtjeje','maintenance platform','industrial support','mbajtese industriale','mbajtëse industriale','mekanike industriale','mekanike në impiant','punime mekanike'
];
const FABRICATION=[
  'fabrikim','fabricim','fabrication','saldim','welding','galvaniz','hot dip galvan','prerje metal','cutting steel','shpim metal','drilling steel','lyerje industriale','coating steel','montim metal','steel erection','bravari'
];
const EXCLUSIONS=[
  'mobilje zyre','dollapa zyre','dollap metalik per zyre','dollapë metalikë për zyre','office furniture','office cabinet','instrumente kirurgjikale','instrumente mjekesore','instrumente mjekësore',
  'pajisje mjekesore','pajisje mjekësore','medical equipment','surgical instrument','ene kuzhine','enë kuzhine','kitchen utensil','pajisje shtepiake','pajisje shtëpiake','household appliance',
  'automjete','automjet','vehicle','pjese veture','pjesë veture','auto parts','printer','kompjuter','laptop','server','telefon'
];
const STRUCTURAL_FPP=['44212220','44212240','44212313','44212410','44212500','45223100','45223110','45223210'];

export const PRISTEEL_CANDIDATE_HINTS=Object.freeze(unique([
  ...DIRECT_MATERIAL,...REBAR,...DIRECT_STRUCTURE,...STRUCTURE_CONTEXT,...ENERGY_CONTEXT,...INDUSTRIAL_CONTEXT,...FABRICATION,...PROFILE_CODES,
  'rehabilitim','riparim','replacement','zevendesim','zëvendësim','mekanik','prefabrikuar'
]));

export function capabilityCandidateHint(value){return first(value,PRISTEEL_CANDIDATE_HINTS);}

function profileSignal(h){
  const n=norm(h);
  for(const code of PROFILE_CODES){
    if(!token(n,code))continue;
    const dim=new RegExp('(?:^|[^a-z0-9])'+code+'[ \\t]*[-x/]?[ \\t]*[0-9]{2,4}(?=$|[^a-z0-9])','i').test(n);
    if(dim||/(profil|profile|trar|beam|celik|steel|hekur)/.test(n))return code.toUpperCase();
  }
  return'';
}

export function assessPristeelTender(row={}){
  const corpus=[row.title,row.fpp_description,row.document_type,row.contract_type,row.procedure,payloadText(row.payload)].filter(Boolean).join(' ');
  const n=norm(corpus),fpp=text(row.fpp).replace(/\D/g,''),reasons=[],matches=[];
  let directEvidence=false;

  function add(key,label,score,reason,{direct=false}={}){
    if(!reason||!score)return;
    const prev=matches.find(x=>x.key===key);
    if(!prev)matches.push({key,label,score,reason});
    else if(score>prev.score){prev.score=score;prev.reason=reason;}
    reasons.push(reason);
    if(direct)directEvidence=true;
  }

  const rebar=first(n,REBAR);
  if(rebar)add('rebar','Armaturë',88,`armaturë: ${rebar}`,{direct:true});

  const material=first(n,DIRECT_MATERIAL),profile=profileSignal(n),materialReview=first(n,MATERIAL_REVIEW);
  if(material)add('raw_material','Lëndë e parë çeliku',82,`material/furnizim: ${material}`,{direct:true});
  else if(profile)add('raw_material','Lëndë e parë çeliku',82,`profil strukturor: ${profile}`,{direct:true});
  else if(materialReview)add('raw_material','Lëndë e parë çeliku',52,`sinjal material metalik: ${materialReview}`);

  const structure=first(n,DIRECT_STRUCTURE),structureContext=first(n,STRUCTURE_CONTEXT);
  if(structure)add('fabricated_structures','Struktura të fabrikuara',86,`strukturë direkte: ${structure}`,{direct:true});
  else if(structureContext)add('fabricated_structures','Struktura të fabrikuara',48,`paketë strukturore e mundshme: ${structureContext}`);

  const energy=first(n,ENERGY_CONTEXT);
  if(energy)add('energy_grid','Energji dhe rrjet',structure||material||profile?84:58,`kontekst energjetik relevant: ${energy}`,{direct:!!(structure||material||profile)});

  const industrial=first(n,INDUSTRIAL_CONTEXT);
  if(industrial)add('industrial_steelwork','Punime industriale',structure||material||profile?80:54,`paketë industriale e mundshme: ${industrial}`,{direct:!!(structure||material||profile)});

  const fabrication=first(n,FABRICATION);
  if(fabrication)add('fabrication_services','Shërbime fabrikimi',structureContext||energy||industrial||structure||material?78:58,`proces fabrikimi: ${fabrication}`,{direct:!!(structure||material||profile||structureContext||energy||industrial)});

  if(/^2711/.test(fpp))add('raw_material','Lëndë e parë çeliku',82,`FPP çelik/material bazë: ${row.fpp}`,{direct:true});
  else if(/^(273|4433)/.test(fpp)&&(material||materialReview||profile))add('raw_material','Lëndë e parë çeliku',68,`FPP produkt metalik + sinjal teknik: ${row.fpp}`,{direct:true});
  else if(/^28527/.test(fpp)&&(material||materialReview||profile))add('raw_material','Lëndë e parë çeliku',67,`FPP artikull metalik + sinjal teknik: ${row.fpp}`,{direct:true});
  else if(/^2700/.test(fpp)&&(material||materialReview||profile))add('raw_material','Lëndë e parë çeliku',68,`FPP metal bazë + sinjal teknik: ${row.fpp}`,{direct:true});
  else if(/^2800/.test(fpp)&&(material||materialReview||profile))add('raw_material','Lëndë e parë çeliku',62,`FPP produkt metalik + sinjal teknik: ${row.fpp}`);

  if(STRUCTURAL_FPP.some(p=>fpp.startsWith(p)))add('fabricated_structures','Struktura të fabrikuara',74,`FPP strukturë metalike: ${row.fpp}`,{direct:true});
  else if(/^4421/.test(fpp)&&(structure||structureContext||energy))add('fabricated_structures','Struktura të fabrikuara',66,`FPP strukturor + kontekst relevant: ${row.fpp}`,{direct:true});
  else if(/^45000000/.test(fpp)&&(structure||structureContext||energy||industrial||fabrication))add('fabricated_structures','Struktura të fabrikuara',Math.max(structure?72:0,structureContext||energy||industrial||fabrication?50:0),`FPP punë ndërtimi + paketë e mundshme PRISTEEL: ${row.fpp}`,{direct:!!structure});

  if(/\bfurnizim\b/.test(n))matches.forEach(x=>{if(x.key==='raw_material'||x.key==='rebar')x.score=Math.min(100,x.score+4);});
  if(/\b(pune|punime|montim|vendosja|ndertim|ndërtim|rehabilitim|riparim)\b/.test(n))matches.forEach(x=>{if(x.key!=='raw_material'&&x.key!=='rebar')x.score=Math.min(100,x.score+4);});

  const exclusion=first(n,EXCLUSIONS);
  const substantive=!!(structure||energy||industrial||fabrication||structureContext);
  if(exclusion&&!substantive){
    reasons.push(`jashtë profilit kryesor PRISTEEL: ${exclusion}`);
    matches.forEach(x=>{x.score=Math.min(x.score,20);});
    directEvidence=false;
  }

  matches.sort((a,b)=>b.score-a.score);
  const best=matches.length?Math.min(100,matches[0].score):0;
  const strongDirect=directEvidence&&best>=65;
  let category='possible';
  if(strongDirect){
    const winner=matches[0]?.key;
    category=(winner==='raw_material'||winner==='rebar')?'raw_material':'steel_structure';
  }
  const fit=best>=75&&directEvidence?'strong':best>=35?'possible':'weak';
  const reviewRequired=best>=35&&!strongDirect;

  return{
    category,
    relevance_score:best,
    match_reasons:unique(reasons),
    capability_profile_version:PRISTEEL_CAPABILITY_PROFILE_VERSION,
    capability_fit:fit,
    capability_matches:matches.slice(0,5),
    capability_review_required:reviewRequired,
    capability_direct_evidence:directEvidence,
    exclusion_reason:exclusion||null
  };
}

function payloadText(payload){
  if(!payload||typeof payload!=='object')return'';
  const keys=['technical_summary','scope','description','object','notice_summary'];
  return keys.map(k=>typeof payload[k]==='string'?payload[k]:'').filter(Boolean).join(' ');
}

export function attachCapabilityPayload(row,assessment=assessPristeelTender(row)){
  return{
    ...(row||{}),
    ...assessment,
    payload:{
      ...((row&&row.payload&&typeof row.payload==='object')?row.payload:{}),
      capability_profile_version:assessment.capability_profile_version,
      capability_fit:assessment.capability_fit,
      capability_matches:assessment.capability_matches,
      capability_review_required:assessment.capability_review_required,
      capability_direct_evidence:assessment.capability_direct_evidence,
      capability_exclusion_reason:assessment.exclusion_reason
    }
  };
}
