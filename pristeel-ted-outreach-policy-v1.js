/* One policy for TED UI, draft creation, follow-up and future dispatch.
 * Pure classification: no requests, writes, sends or invented verification. */
(function(root){
'use strict';
var version='ted-outreach-safety-20261008-v1';
function text(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function arr(v){return Array.isArray(v)?v:[];}
function official(v){try{var u=new URL(String(v||''));return u.protocol==='https:'&&!!u.hostname;}catch(e){return false;}}
function scope(t){
 t=t||{};var p=t.payload||t,d=p.ted_details||{},title=t.title||p.title||'',body=[title,p.description,d.description,d.procedure_description,d.procedure_title].concat(arr(d.lot_titles),arr(d.lot_descriptions)).map(text).join(' ');
 var cpv=arr(p.cpv).concat(arr(t.cpv),t.fpp||'',p.cpv_code||'').map(function(x){return String(x).replace(/\D/g,'').slice(0,8);});
 var steelCpv=cpv.some(function(c){return /^(4421|452231|45223210|452624|146220|44172)/.test(c);});
 var transportCpv=cpv.some(function(c){return /^(60|63)/.test(c);});
 var steel=/\b(steel structures?|structural steel|fabricated steel|steel fabrication|steel frames?|steel construction|metal structures?|metal fabrication|stahlbau|stahlkonstruktion\w*|stahltragwerk\w*|metallbau|charpente metallique|construction metallique|struktura? (?:te )?celik\w*|konstruk\w* (?:te )?celik\w*)\b/.test(body);
 var logistics=/\b(transport services|freight[- ]forwarding|third[- ]party logistics|3pl|warehousing services|warehouse and freight|logistics services|sh[e]?rbime(?: te)? transporti)\b/.test(body);
 if(transportCpv||logistics)return {ok:false,state:steel||steelCpv?'review':'excluded',reason:steel||steelCpv?'mixed_transport_scope':'transport_logistics_service',message:steel||steelCpv?'Furnizimi i çelikut duhet ndarë dhe verifikuar nga shërbimet logjistike.':'Tender për shërbime transporti / logjistike; pa outreach për çelik.',version:version};
 if(!steel&&!steelCpv)return {ok:false,state:'review',reason:'steel_scope_not_evidenced',message:'Mungon prova për paketë çeliku në titull, përshkrim ose CPV.',version:version};
 if(!official(t.source_url||p.source_url||t.detail_url||p.detail_url))return {ok:false,state:'review',reason:'tender_source_missing',message:'Mungon burimi i tenderit për verifikim.',version:version};
 return {ok:true,state:'eligible',reason:'steel_scope_evidenced',message:'Scope i çelikut i identifikuar në tender.',version:version};
}
function company(t,a,assessment){
 t=t||{};a=a||{};assessment=assessment||{};var p=t.payload||t,w=p.winner||{},c=assessment.company||assessment.company_summary||{},cl=w.company_classification||{},v=p.winner_role_v2||w.role_v2||{};
 var role=text(v.category||c.company_type||w.company_type||a.company_role),confidence=text(v.confidence||c.company_type_confidence||c.verification_status||cl.confidence||''),facts=arr(assessment.company_facts),evidence=arr(cl.evidence);
 var roleVerified=confidence==='high'||confidence==='verified'||confidence==='medium';
 var activity=[c.business_summary,w.business_summary,w.manufacturer_description].concat(facts.filter(function(f){return f.status==='confirmed'&&official(f.source_url);}).map(function(f){return f.value;}),evidence.map(function(f){return [f.claim,f.value,f.label,arr(f.examples).join(' ')].filter(Boolean).join(' ');})).map(text).join(' ');
 var source=official(c.source_url)||facts.some(function(f){return f.status==='confirmed'&&official(f.source_url);})||arr(cl.source_urls).some(official)||arr(v.source_urls).some(official)||arr(c.source_urls).some(function(url){try{return official(url)&&text(new URL(url).hostname).replace(/^www\./,'')===text(c.domain).replace(/^www\./,'');}catch(e){return false;}});
 if(/\b(logistics|freight forwarding|transport services|moving services|spedition)\b/.test(activity)&&!/(steel fabrication|stahlbau|structural steel|general contractor|construction contractor)/.test(activity))return {ok:false,state:'excluded',reason:'company_activity_outside_steel',message:'Aktiviteti i kompanisë nuk përputhet me këtë fushatë.'};
 var gc=/^(gc_epc|general_contractor|gc|epc)$/.test(role),producer=/^(producer|steel_fabricator|steel_producer_mill|manufacturer)$/.test(role);
 if(!gc&&!producer)return {ok:false,state:'review',reason:'company_role_unverified',message:'Verifiko aktivitetin e kompanisë përpara zgjedhjes së modelit.'};
 var businessEvidence=/(general contractor|construction contractor|engineering procurement construction|bauunternehmen|hochbau|tiefbau|steel fabrication|stahlbau|structural steel|steel producer|steel mill|steel manufacturer|metal fabrication)/.test(activity);
 if(!businessEvidence)return {ok:false,state:'review',reason:'company_activity_not_evidenced',message:'Mungon përshkrimi i verifikuar i aktivitetit; emri dhe etiketa e rolit nuk mjaftojnë.'};
 if(!source||(!roleVerified&&!facts.some(function(f){return f.status==='confirmed'&&official(f.source_url);})))return {ok:false,state:'review',reason:'company_activity_source_missing',message:'Mungon prova e verifikuar për aktivitetin e kompanisë.'};
 return {ok:true,state:'eligible',reason:'company_activity_evidenced',offer_model:producer?'steel_fabricator':'gc_epc'};
}
function assess(t,a,x){var s=scope(t);if(!s.ok)return s;var c=company(t,a,x);return Object.assign({version:version},c);}
function recipient(email,meta){meta=meta||{};var e=text(email).trim(),local=e.split('@')[0].replace(/\+.*/,''),role=text(meta.functional_role||meta.job_title||meta.role||meta.purpose||'');
 if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(e))return false;
 if(meta.do_not_contact===true||meta.draft_eligible===false||meta.bounced===true)return false;
 return !/^(karriere|career|careers|jobs|recruit\w*|hr|personal\w*|bewerbung\w*|airfreight|portagency|generalcargo|umzuege|umzug|newsletter|noreply|no-reply|privacy|gdpr|dpo|billing|invoice|accounts|accounting|press|presse|media|support|webmaster)$/.test(local)&&!/(human resources|recruit|karriere|career|personalwesen|airfreight|port agency|moving services|freight forwarding|\bhr\b)/.test(role);
}
function sendReadiness(r,now){r=r||{};now=now||Date.now();var at=Date.parse(r.verified_at||''),until=Date.parse(r.valid_until||'');return r.domain==='prissteel.com'&&r.spf===true&&r.dkim===true&&r.dmarc===true&&r.opt_out_handling===true&&r.campaign_approved===true&&Number.isFinite(at)&&Number.isFinite(until)&&at<=now&&until>now&&now-at<=30*86400000;}
root.PSTTedOutreachPolicyV1={version:version,scope:scope,company:company,assess:assess,recipient:recipient,sendReadiness:sendReadiness};
})(typeof window!=='undefined'?window:globalThis);
