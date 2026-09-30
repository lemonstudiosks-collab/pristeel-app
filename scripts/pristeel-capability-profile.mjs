/* PRISTEEL Capability Profile v1
 * Procurement-fit rules for public tender intake.
 * A notice can be relevant without ever saying steel; contextual matches stay review-first.
 */

export const PRISTEEL_CAPABILITY_PROFILE_VERSION='2026-09-30.1';
export const PRISTEEL_CAPABILITY_PROFILE=Object.freeze({
  version:PRISTEEL_CAPABILITY_PROFILE_VERSION,
  principle:'Assess whether PRISTEEL can realistically supply, fabricate or execute a meaningful package, not whether the notice contains the word steel.',
  families:Object.freeze([
    {key:'raw_material',label:'Lëndë e parë çeliku'},
    {key:'fabricated_structures',label:'Struktura të fabrikuara'},
    {key:'energy_grid',label:'Energji dhe rrjet'},
    {key:'industrial_steelwork',label:'Punime industriale'},
    {key:'fabrication_services',label:'Shërbime fabrikimi'},
    {key:'rebar',label:'Armaturë'}
  ])
});

const text=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const esc=v=>String(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const EXACT=new Set(['ipe','ipn','hea','heb','hem','upe','upn','unp','b500','b500c','hekur','hekuri','hekurit','celik','celiku','celikut','steel','rebar']);
const PROFILE_CODES=['ipe','ipn','hea','heb','hem','upe','upn','unp'];
function token(h,t){return new RegExp(`(?:^|[^a-z0-9])${esc(norm(t))}(?=$|[^a-z0-9])`,'i').test(norm(h));}
function contains(h,t){const x=norm(t);return EXACT.has(x)||(!x.includes(' ')&&x.length<=4)?token(h,x):norm(h).includes(x);}
function first(h,terms){return terms.find(t=>contains(h,t))||'';}
function unique(v){return[...new Set((v||[]).filter(Boolean))];}

const DIRECT_MATERIAL=['llamarine','llamarina','llamara','pllake celiku','pllake metalike','material celiku','material metalik','lende e pare metalike','lëndë e parë metalike','profile celiku','profile metalike','profile hekuri','shufra celiku','shufer celiku','trar celiku','tuba celiku','gypa celiku','tubacione celiku','tubacion metalik','tel celiku','tela celiku','litar celiku','zinxhir celiku','rrjete celiku','steel plate','steel sheet','steel coil','steel beam','steel tube','steel pipe','flat bar','angle steel'];
const MATERIAL_REVIEW=['metal','profil metal','profil celik','shufr','llamar','trar metal','tub metal','gyp metal','bobine','coil','materiale metalike','produkte metalike'];
const REBAR=['armature','armaturë','rebar','b500','b500c','reinforcement bar','reinforcing steel'];
const DIRECT_STRUCTURE=['konstruksion metalik','konstruksione metalike','konstruksion celiku','strukture celiku','struktura celiku','strukture metalike','struktura metalike','steel structure','steelwork','halle metalike','mbulese metalike','mbuloje metalike','strehe metalike','strehë metalike','canopy metalik','çati metalike','cati metalike','platforme metalike','platforma metalike','shkalle metalike','rrethoje metalike','rrethojes metalike','rrethim metalik','gardh metalik','parmak metalik','dere metalike','dyer metalike','dyerve metalike','porta metalike','grating metalik','shtylle metalike','shtylla metalike','rezervuar metalik','rezervuare metalike','tank metalik','depo metalike','tubacion metalik','tubacione metalike','pipe rack','piperack','support steel','steel support','frame steel','ura metalike','ure metalike','steel bridge','skela metalike','metal framework','structural steel'];
const STRUCTURE_CONTEXT=['platforme','platforma','walkway','catwalk','grating','shkalle','shkallë','stairs','handrail','parmak','rrethoje','rrethim','fence','fencing','gardh','dere','dyer','porta','mbulese','mbulesë','mbuloje','canopy','çati','cati','halle','hala','warehouse','depo prefabrikuar','konstruksion prefabrikuar','rezervuar','rezervuare','tank','tanke','silo','tubacion','piping','urë','ure','ura','bridge','footbridge','support','mbajtese','mbajtëse','frame','skelet'];
const ENERGY_CONTEXT=['nenstacion','nënstacion','substation','linje transmetimi','linjë transmetimi','transmission line','lattice tower','lattice mast','shtylle transmetimi','shtyllë transmetimi','shtylla transmetimi','tower','mast','gantry','portal','portale','portal beam','earth wire peak','lightning mast'];
const INDUSTRIAL_CONTEXT=['transportues','conveyor','chute','hopper','silo','duct','pipe rack','piperack','termocentral','power plant','impiant industrial','impiant minerar','impiant i minieres','mining plant','pajisje industriale','platforme mirembajtjeje','platformë mirëmbajtjeje','maintenance platform','industrial support','mbajtese industriale','mbajtëse industriale','mekanike industriale','mekanike në impiant','punime mekanike'];
const FABRICATION=['fabrikim','fabricim','fabrication','saldim','welding','galvaniz','hot dip galvan','prerje metal','cutting steel','shpim metal','drilling steel','lyerje industriale','coating steel','montim metal','steel erection'];
const BRAVARI_CONTEXT=['punime bravari','bravari metalike','punime te bravarise','punime të bravarisë'];
const EXCLUSIONS=['mobilje zyre','dollapa zyre','dollap metalik per zyre','dollapa metalike per zyre','dollapë metalikë për zyre','office furniture','office cabinet','instrumente kirurgjikale','instrumente mjekesore','instrumente mjekësore','pajisje mjekesore','pajisje mjekësore','medical equipment','surgical instrument','ene kuzhine','enë kuzhine','kitchen utensil','pajisje shtepiake','pajisje shtëpiake','household appliance','automjete','automjet','vehicle','pjese veture','pjesë veture','auto parts','printer','kompjuter','laptop','server','telefon','licence','licencë','licenca','software','plagjiatur','antiplagjiatur','inteligjence artificiale','inteligjencë artificiale','abonim','subscription','sistem informatik'];
const GENERIC_CIVIL=['shesh','trotuar','kanalizim','asfalt','rruge','rrugë','objekt administrativ','shkolle','shkollë'];
const STRUCTURAL_FPP=['44212220','44212240','44212313','44212410','44212500','45223100','45223110','45223210'];

export const PRISTEEL_CANDIDATE_HINTS=Object.freeze(unique([...DIRECT_MATERIAL,...REBAR,...DIRECT_STRUCTURE,...STRUCTURE_CONTEXT,...ENERGY_CONTEXT,...INDUSTRIAL_CONTEXT,...FABRICATION,...BRAVARI_CONTEXT,...PROFILE_CODES,'bravari','rehabilitim','riparim','replacement','zevendesim','zëvendësim','mekanik','prefabrikuar']));
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
function flattenText(value,depth=0){
  if(depth>3||value==null)return'';
  if(typeof value==='string'||typeof value==='number')return text(value);
  if(Array.isArray(value))return value.slice(0,40).map(x=>flattenText(x,depth+1)).filter(Boolean).join(' ');
  if(typeof value==='object')return Object.values(value).slice(0,60).map(x=>flattenText(x,depth+1)).filter(Boolean).join(' ');
  return'';
}
function payloadText(payload){
  if(!payload||typeof payload!=='object')return'';
  const keys=['technical_summary','scope','description','short_description','full_description','technical_description','object','notice_summary','lots','lot','requirements','steel_scope','dossier_analysis','analysis'];
  return keys.map(k=>flattenText(payload[k])).filter(Boolean).join(' ').slice(0,16000);
}

export function assessPristeelTender(row={}){
  const corpus=[row.title,row.fpp_description,row.document_type,row.contract_type,row.procedure,payloadText(row.payload)].filter(Boolean).join(' ');
  const n=norm(corpus),fpp=text(row.fpp).replace(/\D/g,''),reasons=[],matches=[];
  const supplyContext=/(furniz|blerje|material|produkt|lende e pare|lëndë e parë|profil|shufr|llamar|pllak|tub|gyp|trar|coil|bobin)/.test(n);
  const genericSteel=first(n,['celik','celiku','celikut','steel','hekur','hekuri','hekurit']);
  const machineTool=/(makin|makine|makinë|pajisje|veg[eë]l|aparat).{0,80}(prer|cut|sald|weld|shpim|drill).{0,50}(metal|celik|steel)|(prer|cut|sald|weld|shpim|drill).{0,50}(metal|celik|steel).{0,80}(makin|pajisje|veg[eë]l|aparat)/.test(n);
  const digitalPlatform=/(software|licenc|abonim|subscription|sistem informatik|aplikacion|platform.{0,50}(digjital|online|elektronik|tregt|energji|testim|nettest|inteligjenc)|platforme?.{0,50}(software|licenc|digjital|online|elektronik))/.test(n);
  const celikPlaceName=/(rruge|rruga|lagj|fshat|lokacion|segment|kulle|kulla|monument|trashegimi|trashëgimi|restaurim|konservim).{0,80}\bcelik\b|\bcelik\b.{0,80}(gjilan|rruge|rruga|lagj|fshat|lokacion|monument|trashegimi|trashëgimi|restaurim|konservim)/.test(n);
  const specialistNegative=/(ventilim|klimatizim|ashensor|kushinet|bearing|gazra? (teknik|industrial)|bombol.{0,30}gaz|pelhur|thase? filtrues|filter bags)/.test(n);
  const genericRenovation=/(renov|ripar|mirembajt|mirëmbajt|ngjyros).{0,90}(shkall|dere|dyer|parahyrje)/.test(n)&&!/(metal|celik|steel|konstruks)/.test(n);
  const industrialTank=/(rezervuar|tank).{0,90}(mazut|karburant|termocentral|industrial)|(mazut|karburant|termocentral|industrial).{0,90}(rezervuar|tank)/.test(n);
  let directEvidence=false;
  function add(key,label,score,reason,{direct=false}={}){
    if(!reason||!score)return;
    const prev=matches.find(x=>x.key===key);
    if(!prev)matches.push({key,label,score,reason}); else if(score>prev.score){prev.score=score;prev.reason=reason;}
    reasons.push(reason);if(direct)directEvidence=true;
  }

  const rebar=first(n,REBAR);
  if(rebar)add('rebar','Armaturë',88,`armaturë: ${rebar}`,{direct:true});
  const material=first(n,DIRECT_MATERIAL),profile=profileSignal(n),materialReview=first(n,MATERIAL_REVIEW);
  if(material)add('raw_material','Lëndë e parë çeliku',82,`material/furnizim: ${material}`,{direct:true});
  else if(profile)add('raw_material','Lëndë e parë çeliku',82,`profil strukturor: ${profile}`,{direct:true});
  else if(genericSteel&&supplyContext)add('raw_material','Lëndë e parë çeliku',78,`material çeliku në kontekst furnizimi: ${genericSteel}`,{direct:true});
  else if(materialReview&&supplyContext)add('raw_material','Lëndë e parë çeliku',52,`sinjal material metalik: ${materialReview}`);

  const structure=first(n,DIRECT_STRUCTURE),structureContext=first(n,STRUCTURE_CONTEXT);
  if(structure)add('fabricated_structures','Struktura të fabrikuara',86,`strukturë direkte: ${structure}`,{direct:true});
  else if(industrialTank)add('fabricated_structures','Struktura të fabrikuara',86,'rezervuar/tank në kontekst industrial',{direct:true});
  else if(structureContext)add('fabricated_structures','Struktura të fabrikuara',48,`paketë strukturore e mundshme: ${structureContext}`);
  const energy=first(n,ENERGY_CONTEXT);
  if(energy)add('energy_grid','Energji dhe rrjet',structure||material||profile?84:58,`kontekst energjetik relevant: ${energy}`,{direct:!!(structure||material||profile)});
  const industrial=first(n,INDUSTRIAL_CONTEXT);
  if(industrial)add('industrial_steelwork','Punime industriale',structure||material||profile?80:54,`paketë industriale e mundshme: ${industrial}`,{direct:!!(structure||material||profile)});
  const fabrication=first(n,FABRICATION),bravari=first(n,BRAVARI_CONTEXT);
  if(fabrication)add('fabrication_services','Shërbime fabrikimi',structureContext||energy||industrial||structure||material?78:58,`proces fabrikimi: ${fabrication}`,{direct:!!(structure||material||profile||structureContext||energy||industrial)});
  else if(bravari)add('fabrication_services','Shërbime fabrikimi',48,`punime bravarie: ${bravari}`);

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

  const exclusion=first(n,EXCLUSIONS),genericCivil=first(n,GENERIC_CIVIL);
  const hardTechnical=!!(structure||energy||industrial||fabrication||bravari);
  if(machineTool||digitalPlatform||celikPlaceName||specialistNegative||genericRenovation){
    const why=machineTool?'makinë/vegël që vetëm përpunon metal':digitalPlatform?'platformë ose sistem digjital':celikPlaceName?"'Celik' si emër vendi/rruge":specialistNegative?'artikull/shërbim specialist pa paketë PRISTEEL':'renovim i përgjithshëm pa scope metalik';
    reasons.push(`jashtë profilit PRISTEEL: ${why}`);matches.forEach(x=>{x.score=Math.min(x.score,10);});directEvidence=false;
  }else if(exclusion&&!hardTechnical){
    reasons.push(`jashtë profilit kryesor PRISTEEL: ${exclusion}`);matches.forEach(x=>{x.score=Math.min(x.score,20);});directEvidence=false;
  }else if(genericCivil&&structureContext&&!structure&&!energy&&!industrial&&!fabrication&&!material&&!rebar){
    reasons.push(`kontekst civil i përgjithshëm, pa provë për paketë PRISTEEL: ${genericCivil}`);matches.forEach(x=>{x.score=Math.min(x.score,25);});directEvidence=false;
  }

  matches.sort((a,b)=>b.score-a.score);
  const best=matches.length?Math.min(100,matches[0].score):0,strongDirect=directEvidence&&best>=65;
  let category='possible';if(strongDirect){const winner=matches[0]?.key;category=(winner==='raw_material'||winner==='rebar')?'raw_material':'steel_structure';}
  const fit=best>=75&&directEvidence?'strong':best>=35?'possible':'weak';
  const layer=fit==='strong'?'main':fit==='possible'?'review':'excluded';
  return{category,relevance_score:best,match_reasons:unique(reasons),capability_profile_version:PRISTEEL_CAPABILITY_PROFILE_VERSION,capability_fit:fit,capability_matches:matches.slice(0,5),capability_review_required:layer==='review',capability_direct_evidence:directEvidence,relevance_layer:layer,exclusion_reason:exclusion||(machineTool?'machine_or_tool':digitalPlatform?'digital_platform':celikPlaceName?'celik_place_name':specialistNegative?'specialist_non_pristeel':genericRenovation?'generic_renovation':null)};
}

export function attachCapabilityPayload(row,assessment=assessPristeelTender(row)){
  return{...(row||{}),...assessment,payload:{...((row&&row.payload&&typeof row.payload==='object')?row.payload:{}),capability_profile_version:assessment.capability_profile_version,capability_fit:assessment.capability_fit,capability_matches:assessment.capability_matches,capability_review_required:assessment.capability_review_required,capability_direct_evidence:assessment.capability_direct_evidence,krpp_relevance_layer:assessment.relevance_layer,capability_exclusion_reason:assessment.exclusion_reason}};
}
