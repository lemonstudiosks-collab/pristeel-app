/* PRISTEEL — Tender Business Flow v2
 * KRPP + APP + TED opportunities are assessed against PRISTEEL capabilities.
 * TED awards remain awarded-contract intelligence / winner outreach.
 * Review-first UI layer; does not replace collectors or controlled project promotion.
 */
(function(){
'use strict';
if(window.__pstTenderBusinessFlowV1)return;
window.__pstTenderBusinessFlowV1=true;

var bizRows=[];
var installed=false;
var loading=false;
var originalLoad=null,originalSetStatus=null,originalPromote=null;
var homeSignalLoading=false,homeSignalLastFetch=0,homeSignalCache=[],homeSignalTimer=null;

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function n(v){return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function payload(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function source(r){var s=String(payload(r).source||'KRPP').toUpperCase();if(s==='TED')return'TED';if(s==='APP_AL'||s==='APP')return'APP_AL';return'KRPP';}
function phase(r){return payload(r).notice_phase==='award'?'award':'opportunity';}
function sourceLabel(r){var s=source(r);return s==='TED'?'EU · TED':s==='APP_AL'?'Shqipëri · APP':'Kosovë · KRPP';}
function sourceButton(r){var s=source(r);return s==='TED'?'TED ↗':s==='APP_AL'?'APP ↗':'KRPP ↗';}
function sourceClass(r){var s=source(r);return s==='TED'?'ted':s==='APP_AL'?'app':'krpp';}
function codeLabel(r){return source(r)==='KRPP'?'FPP':'CPV';}
function catLabel(v){return v==='raw_material'?'Lëndë e parë / armaturë':v==='steel_structure'?'Fabrikim / struktura':'Kontekst për shqyrtim';}
function dateText(v){var d=v?new Date(v+'T00:00:00'):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}
function safeHttp(v){var s=String(v||'').trim();return /^https?:\/\//i.test(s)?s:'';}
function truthy(v){return v===true||String(v).toLowerCase()==='true';}
function capabilityMatches(r){var m=payload(r).capability_matches;return Array.isArray(m)?m:[];}
function capabilityReviewRequired(r){return truthy(payload(r).capability_review_required);}
function capabilityDirectEvidence(r){return truthy(payload(r).capability_direct_evidence);}
function capabilityFit(r){
 var f=String(payload(r).capability_fit||'').toLowerCase();
 if(f==='strong'||f==='possible'||f==='weak')return f;
 var s=Number(r&&r.relevance_score)||0;
 return s>=95?'strong':s>=85?'possible':'weak';
}
function capabilityFitLabel(v){return v==='strong'?'Strong':v==='possible'?'Për shqyrtim':'Low';}
function capabilityReason(r){
 var cm=capabilityMatches(r),parts=[];
 cm.slice(0,2).forEach(function(x){var t=String((x&&x.reason)||(x&&x.label)||'').trim();if(t)parts.push(t);});
 if(!parts.length&&Array.isArray(r&&r.match_reasons))parts=r.match_reasons.filter(Boolean).slice(0,2).map(String);
 return parts.join(' · ')||'Kërkon verifikim të scope-it dhe dokumenteve.';
}
function winner(r){
 var w=payload(r).winner;
 if(!w||typeof w!=='object')return{name:'',email:'',website:'',country:'',city:'',names:[]};
 var names=Array.isArray(w.names)?w.names.filter(Boolean):(w.name?[w.name]:[]);
 return{name:String(w.name||names[0]||''),email:String(w.email||(Array.isArray(w.emails)&&w.emails[0])||''),website:String(w.website||(Array.isArray(w.websites)&&w.websites[0])||''),country:String(w.country||(Array.isArray(w.countries)&&w.countries[0])||''),city:String(w.city||(Array.isArray(w.cities)&&w.cities[0])||''),names:names};
}
function bizStatus(r){
 if(source(r)==='TED'&&phase(r)==='award'&&payload(r).ted_contact_status==='contacted')return'contacted';
 return r.status||'new';
}
function hasTedWinner(r){return source(r)==='TED'&&phase(r)==='award'&&!!winner(r).name;}
function statusLabel(r){
 var st=bizStatus(r);
 if(source(r)==='TED'&&phase(r)==='award'){
  if(!hasTedWinner(r)&&st!=='ignored')return'Fituesi i papublikuar';
  return({new:'Fitues i ri',review:'Për kontakt',contacted:'Kontaktuar',ignored:'Anashkaluar',promoted:'Projekt'})[st]||st;
 }
 return({new:'E re',review:'Në shqyrtim',ignored:'Anashkaluar',promoted:'Projekt',contacted:'Kontaktuar'})[st]||st||'—';
}
function isOperationalFocus(r){return phase(r)==='opportunity'||(source(r)==='TED'&&phase(r)==='award'&&hasTedWinner(r));}
function isOpen(r){var st=bizStatus(r);return st==='new'||st==='review';}
function operationalRows(rows){return(Array.isArray(rows)?rows:[]).filter(function(r){return isOperationalFocus(r)&&isOpen(r);});}
function homeSignalSummary(rows){
 var list=operationalRows(rows),opportunities=0,tedWinners=0;
 list.forEach(function(r){if(source(r)==='TED'&&phase(r)==='award')tedWinners++;else opportunities++;});
 return{total:list.length,opportunities:opportunities,ted_winners:tedWinners};
}
function capabilitySummary(rows){
 rows=Array.isArray(rows)?rows:[];
 var focus=rows.filter(isOperationalFocus);
 return{
  strong:focus.filter(function(r){return isOpen(r)&&capabilityFit(r)==='strong';}).length,
  review:focus.filter(function(r){return isOpen(r)&&(capabilityFit(r)==='possible'||capabilityReviewRequired(r));}).length,
  new:focus.filter(function(r){return bizStatus(r)==='new';}).length,
  ignored:rows.filter(function(r){return bizStatus(r)==='ignored';}).length
 };
}
function openTenderMonitor(){
 if(typeof window.pstWsKekTenders==='function'){window.pstWsKekTenders();return;}
 if(typeof window.showPage==='function')window.showPage('kek-tenders');
}
window.pstTenderBizOpenMonitor=openTenderMonitor;
function homeSignalLabel(s){
 if(s.opportunities&&s.ted_winners)return'<b>'+s.total+'</b> sinjale tenderash · '+s.opportunities+' mundësi · '+s.ted_winners+' fitues TED';
 if(s.opportunities)return'<b>'+s.opportunities+'</b> mundësi për PRISTEEL';
 return'<b>'+s.ted_winners+'</b> fitues TED për outreach';
}
function renderHomeSignal(rows){
 var bar=document.getElementById('pst-ws-alertbar');if(!bar)return;
 var s=homeSignalSummary(rows),old=document.getElementById('pst-tender-home-signal'),sep=bar.querySelector('[data-pst-tender-signal-sep]');
 if(!s.total){if(old)old.remove();if(sep)sep.remove();return;}
 var signature=[s.total,s.opportunities,s.ted_winners].join(':');
 if(old&&old.getAttribute('data-pst-signature')===signature)return;
 if(!old){
  var hasExisting=!!bar.querySelector('.pst-ws-alertitem');
  if(!hasExisting)bar.innerHTML='';
  else{
   sep=document.createElement('span');sep.setAttribute('data-pst-tender-signal-sep','1');sep.textContent='·';sep.style.color='#A0A6AB';bar.appendChild(sep);
  }
  old=document.createElement('button');old.type='button';old.id='pst-tender-home-signal';old.className='pst-ws-alertitem';old.style.cursor='pointer';old.title='Hap Tender Monitor';old.addEventListener('click',openTenderMonitor);bar.appendChild(old);
 }
 old.setAttribute('data-pst-signature',signature);old.innerHTML=homeSignalLabel(s);
}
async function refreshHomeSignal(force){
 var now=Date.now();
 if(!force&&homeSignalLastFetch&&now-homeSignalLastFetch<30000){renderHomeSignal(homeSignalCache);return homeSignalCache;}
 if(homeSignalLoading||typeof window.supaFetch!=='function')return homeSignalCache;
 homeSignalLoading=true;
 try{
  var rows=await db('kek_tender_watch?select=id,status,payload&status=in.(new,review)&limit=2000');
  homeSignalCache=Array.isArray(rows)?rows:[];homeSignalLastFetch=Date.now();renderHomeSignal(homeSignalCache);return homeSignalCache;
 }catch(e){return homeSignalCache;}
 finally{homeSignalLoading=false;}
}
function scheduleHomeSignal(force){
 if(homeSignalTimer)clearTimeout(homeSignalTimer);
 homeSignalTimer=setTimeout(function(){refreshHomeSignal(!!force);},80);
}
function afterHomeRender(force){
 setTimeout(function(){refreshHomeSignal(!!force);},220);
 setTimeout(function(){renderHomeSignal(homeSignalCache);},900);
 setTimeout(function(){renderHomeSignal(homeSignalCache);},2200);
}
function installHomeNavigationHooks(){
 if(typeof window.pstWorkspaceGo==='function'&&!window.pstWorkspaceGo.__pstTenderHomeSignal){
  var go=window.pstWorkspaceGo;
  var wrappedGo=function(key){var result=go.apply(this,arguments);if(key==='home')afterHomeRender(false);return result;};
  wrappedGo.__pstTenderHomeSignal=true;window.pstWorkspaceGo=wrappedGo;
 }
 if(typeof window.pstWsRefreshHome==='function'&&!window.pstWsRefreshHome.__pstTenderHomeSignal){
  var refresh=window.pstWsRefreshHome;
  var wrappedRefresh=function(){var result=refresh.apply(this,arguments);afterHomeRender(true);return result;};
  wrappedRefresh.__pstTenderHomeSignal=true;window.pstWsRefreshHome=wrappedRefresh;
 }
}

function intelligenceMode(r){
 if(phase(r)==='opportunity')return'direct_bid';
 if(source(r)!=='TED')return'direct_bid';
 return r.category==='raw_material'?'supplier_relation':'winner_outreach';
}
function fallbackPriority(r){var s=Number(r&&r.relevance_score)||0;return s>=95?'high':s>=88?'medium':'low';}
function fallbackFit(r){return capabilityFit(r);}
function tenderBriefFallback(r,reason){
 var mode=intelligenceMode(r),w=winner(r),why=[];
 capabilityMatches(r).slice(0,5).forEach(function(x){var t=String((x&&x.reason)||(x&&x.label)||'').trim();if(t)why.push(t);});
 if(!why.length&&Array.isArray(r.match_reasons))why=r.match_reasons.filter(Boolean).slice(0,5);
 if(!why.length)why.push('Tenderi ka një sinjal potencial për një paketë që PRISTEEL mund ta furnizojë, fabrikojë ose realizojë; scope-i duhet verifikuar.');
 var checks=[],next='',angle=null;
 if(mode==='direct_bid'){
  checks=['Hap njoftimin zyrtar dhe verifiko objektin teknik dhe paketën konkrete për PRISTEEL.','Verifiko afatin, kriteret e kualifikimit dhe dokumentet e kërkuara.','Konfirmo sasitë, materialet, proceset dhe kufijtë e scope-it para krijimit të projektit ose ofertimit.'];
  next='Hap burimin zyrtar, verifiko scope-in dhe afatin; krijo projekt vetëm pas kontrollit njerëzor.';
 }else if(mode==='winner_outreach'){
  checks=['Verifiko scope-in e kontratës së dhënë dhe rolin real të fituesit.','Kontrollo nëse fituesi ka nevojë për kapacitet fabrikimi, furnizim, galvanizim, dokumentacion ose logjistikë.','Verifiko kontaktin para çdo outreach.'];
  next=w.email?'Shqyrto fituesin dhe përgatit një outreach të personalizuar; mos e dërgo automatikisht.':'Hap TED/web dhe gjej kontakt të verifikuar para outreach.';
  angle='Poziciono PRISTEEL sipas paketës konkrete që mund të furnizojë ose fabrikojë, jo si ofertues për kontratën tashmë të dhënë.';
 }else{
  checks=['Verifiko produktin/materialin, volumin dhe specifikimin kur është publik.','Kontrollo profilin e fituesit: prodhues, trader apo distributor.','Verifiko kontaktin dhe mundësinë reale për sourcing/partneritet.'];
  next=w.email?'Shqyrto kompaninë fituese si kontakt potencial për sourcing/partneritet dhe përgatit outreach vetëm nëse ka kuptim.':'Hap TED/web dhe verifiko kompaninë e fituesit para çdo kontakti.';
  angle='Trajtoje si lead furnizimi/partneriteti për material ose kapacitet prodhimi, jo si mundësi për të ofertuar në kontratën e përfunduar.';
 }
 return{priority:fallbackPriority(r),fit:fallbackFit(r),business_mode:mode,summary:mode==='direct_bid'?'Mundësi për shqyrtim nga PRISTEEL bazuar në Capability Fit dhe të dhënat publike të tenderit.':mode==='winner_outreach'?'Kontratë TED e dhënë me fitues të identifikuar; vlera për PRISTEEL është një paketë e mundshme furnizimi/fabrikimi për fituesin, jo ofertimi në tender.':'Kontratë TED e dhënë; fituesi mund të jetë relevant për sourcing ose partneritet sipas paketës së identifikuar.',why_relevant:why,checks:checks,next_action:next,outreach_angle:angle,engine:'rules',fallback_reason:reason||null};
}
function tenderBriefContext(r){
 var w=winner(r),p=payload(r);
 return{source:source(r),phase:phase(r),title:r.title||'',authority:r.authority||'',procurement_no:r.procurement_no||'',publication_no:r.publication_no||'',category:r.category||'',relevance_score:Number(r.relevance_score)||0,match_reasons:Array.isArray(r.match_reasons)?r.match_reasons:[],capability_profile_version:p.capability_profile_version||null,capability_fit:capabilityFit(r),capability_review_required:capabilityReviewRequired(r),capability_direct_evidence:capabilityDirectEvidence(r),capability_matches:capabilityMatches(r).slice(0,5),published_date:r.published_date||null,deadline:r.deadline||null,code:r.fpp||null,code_description:r.fpp_description||null,estimated_value:r.estimated_value==null?null:r.estimated_value,currency:r.currency||null,winner:source(r)==='TED'&&phase(r)==='award'?{name:w.name||null,country:w.country||null,city:w.city||null,email:w.email||null,website:w.website||null}:null};
}
function tenderBriefMessages(r){
 var mode=intelligenceMode(r),ctx=tenderBriefContext(r);
 var system='You are PRISTEEL Tender Intelligence. Assess whether PRISTEEL can realistically supply, fabricate, subcontract or execute a meaningful package in the tender; do not require the words steel, metal or fabrication to appear. PRISTEEL capabilities include steel raw material and B500/B500C rebar; fabricated structures, frames, supports, platforms, walkways, stairs, handrails, grating, fences, halls and structural packages; energy/grid steelwork including lattice towers, masts, transmission-line steel, substation portals, gantries and equipment supports; industrial packages including conveyors, chutes, hoppers, bunkers, silos, ducts, pipe racks, maintenance platforms and industrial supports; and fabrication services including cutting, drilling, welding, galvanizing, coating and applicable assembly/installation. Generic civil works, software/digital platforms, office furniture, vehicles, medical goods and unrelated finished products are not a fit without concrete evidence of a meaningful PRISTEEL deliverable. Use only the supplied tender data and capability metadata. Never invent scope, quantities, contract value, certifications, contacts, deadlines or buyer requirements. If information is unknown, say it is unknown and require verification. TED award notices are already awarded: never recommend bidding on them; assess only winner outreach or supplier relationship. TED/KRPP/APP opportunity notices may be assessed for direct bid, but final review and project creation remain human decisions. Return only valid JSON.';
 var user={task:'Assess this record for practical PRISTEEL follow-up using Capability Fit, including hidden packages that may not use the word steel.',business_mode_must_be:mode,tender:ctx,required_json:{priority:'high|medium|low',fit:'strong|possible|weak',business_mode:mode,summary:'short factual summary',why_relevant:['2-5 factual reasons tied to a PRISTEEL capability'],checks:['2-5 things a person must verify'],next_action:'one controlled next action',outreach_angle:mode==='direct_bid'?null:'short angle or null'}};
 return[{role:'system',content:system},{role:'user',content:JSON.stringify(user)}];
}
function cleanList(v,max){return(Array.isArray(v)?v:[]).map(function(x){return String(x||'').trim();}).filter(Boolean).slice(0,max||5);}
function normalizeTenderBrief(raw,r){
 var fb=tenderBriefFallback(r),x=raw&&typeof raw==='object'?raw:{};
 var priority=['high','medium','low'].indexOf(String(x.priority||''))>-1?String(x.priority):fb.priority;
 var fit=['strong','possible','weak'].indexOf(String(x.fit||''))>-1?String(x.fit):fb.fit;
 var why=cleanList(x.why_relevant,5),checks=cleanList(x.checks,5);
 return{priority:priority,fit:fit,business_mode:intelligenceMode(r),summary:String(x.summary||fb.summary).trim().slice(0,1200),why_relevant:why.length?why:fb.why_relevant,checks:checks.length?checks:fb.checks,next_action:String(x.next_action||fb.next_action).trim().slice(0,900),outreach_angle:intelligenceMode(r)==='direct_bid'?null:String(x.outreach_angle||fb.outreach_angle||'').trim().slice(0,900)||null,engine:'ai',fallback_reason:null};
}
async function generateTenderBrief(r){
 var ai=window.PSTAI;
 if(!ai||typeof ai.requestJson!=='function'||typeof ai.hasApiKey!=='function'||!ai.hasApiKey())return tenderBriefFallback(r,'AI API Key nuk është konfiguruar; po përdoret analiza operative me rregulla.');
 try{
  var raw=await ai.requestJson({messages:tenderBriefMessages(r),temperature:0,max_tokens:1200,response_format:{type:'json_object'}});
  return normalizeTenderBrief(raw,r);
 }catch(e){return tenderBriefFallback(r,'AI nuk ishte i disponueshëm ('+String((e&&e.pstAiCode)||'error')+'); po përdoret analiza operative me rregulla.');}
}
function intelligenceLabel(v){return({high:'Prioritet i lartë',medium:'Prioritet mesatar',low:'Prioritet i ulët',strong:'Përshtatje e fortë',possible:'Për shqyrtim',weak:'Përshtatje e dobët',direct_bid:'Direct bid',winner_outreach:'Winner outreach',supplier_relation:'Supplier relation'})[v]||v;}
function briefList(title,items){items=cleanList(items,6);return items.length?'<div style="margin-top:14px"><div style="font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:#6F7780;margin-bottom:6px">'+esc(title)+'</div><ul style="margin:0;padding-left:18px;color:#30363B;font-size:12px;line-height:1.6">'+items.map(function(x){return'<li>'+esc(x)+'</li>';}).join('')+'</ul></div>':'';}
function ensureIntelligenceModal(){
 var old=document.getElementById('pst-ti-backdrop');if(old)return old;
 var b=document.createElement('div');b.id='pst-ti-backdrop';b.style.cssText='position:fixed;inset:0;z-index:10080;background:rgba(28,32,35,.46);display:none;align-items:center;justify-content:center;padding:18px';
 b.innerHTML='<div id="pst-ti-card" style="width:min(720px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:14px;border:1px solid #D9DEE2;box-shadow:0 20px 70px rgba(0,0,0,.18);padding:20px"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px"><div><div style="font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#8A4E24">PRISTEEL Tender Intelligence</div><div id="pst-ti-title" style="font-size:17px;font-weight:750;color:#252A2E;margin-top:3px"></div><div id="pst-ti-meta" style="font-size:10.5px;color:#7A8187;margin-top:4px"></div></div><button type="button" onclick="pstTenderIntelligenceClose()" style="border:1px solid #D9DEE2;background:#fff;border-radius:8px;padding:6px 9px;cursor:pointer">Mbyll</button></div><div id="pst-ti-body" style="margin-top:16px"></div><div style="margin-top:16px;padding-top:10px;border-top:1px solid #ECEFF1;font-size:9.5px;color:#8A9095">Read-only decision support · nuk krijon projekt, nuk ndryshon status dhe nuk dërgon email.</div></div>';
 b.addEventListener('click',function(e){if(e.target===b)window.pstTenderIntelligenceClose();});document.body.appendChild(b);return b;
}
function renderTenderBrief(r,brief){
 var b=ensureIntelligenceModal(),w=winner(r),body=document.getElementById('pst-ti-body');
 document.getElementById('pst-ti-title').textContent=r.title||'Tender';
 document.getElementById('pst-ti-meta').textContent=sourceLabel(r)+(w.name&&phase(r)==='award'?' · '+w.name:'')+' · Capability Fit '+capabilityFitLabel(capabilityFit(r))+' · '+String(r.relevance_score||0)+'%';
 var engine=brief.engine==='ai'?'AI':'Rregulla operative';
 body.innerHTML='<div style="display:flex;gap:7px;flex-wrap:wrap"><span class="pst-kek-chip">'+esc(intelligenceLabel(brief.priority))+'</span><span class="pst-kek-chip">'+esc(intelligenceLabel(brief.fit))+'</span><span class="pst-kek-chip">'+esc(intelligenceLabel(brief.business_mode))+'</span><span class="pst-kek-chip">'+esc(engine)+'</span></div><div style="font-size:12.5px;line-height:1.65;color:#2C3237;margin-top:14px">'+esc(brief.summary)+'</div>'+briefList('Pse është për PRISTEEL',brief.why_relevant)+briefList('Çfarë duhet verifikuar',brief.checks)+'<div style="margin-top:14px;padding:11px 12px;border-radius:9px;background:#F6F8F9;font-size:12px;line-height:1.55;color:#30363B"><b>Hapi i rekomanduar:</b> '+esc(brief.next_action)+'</div>'+(brief.outreach_angle?'<div style="margin-top:10px;padding:11px 12px;border-radius:9px;background:#F8F5F2;font-size:12px;line-height:1.55;color:#4B4038"><b>Angle:</b> '+esc(brief.outreach_angle)+'</div>':'')+(brief.fallback_reason?'<div style="font-size:9.5px;color:#8B6B4E;margin-top:10px">'+esc(brief.fallback_reason)+'</div>':'');
 b.style.display='flex';
}
window.pstTenderIntelligenceClose=function(){var b=document.getElementById('pst-ti-backdrop');if(b)b.style.display='none';};
window.pstTenderIntelligence=async function(id){
 var r=bizRows.find(function(x){return String(x.id)===String(id);});if(!r||!isOperationalFocus(r))return null;
 var b=ensureIntelligenceModal();document.getElementById('pst-ti-title').textContent=r.title||'Tender';document.getElementById('pst-ti-meta').textContent=sourceLabel(r)+' · Capability Fit '+capabilityFitLabel(capabilityFit(r))+' · '+String(r.relevance_score||0)+'%';document.getElementById('pst-ti-body').innerHTML='<div style="font-size:12px;color:#6F7780">Duke përgatitur brief-in…</div>';b.style.display='flex';
 var brief=await generateTenderBrief(r);renderTenderBrief(r,brief);return brief;
};

function addCapabilityCss(){
 if(document.getElementById('pst-tender-capability-css'))return;
 var s=document.createElement('style');s.id='pst-tender-capability-css';s.textContent='\
#pst-tender-fit-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 14px}.pst-tender-kpi{appearance:none;text-align:left;border:1px solid #DEE7EA;background:#fff;border-radius:12px;padding:11px 12px;cursor:pointer;min-height:66px;transition:border-color .15s ease,box-shadow .15s ease}.pst-tender-kpi:hover{border-color:#BFD7E0;box-shadow:0 3px 14px rgba(39,69,80,.06)}.pst-tender-kpi-label{display:block;font-size:8.5px;letter-spacing:.65px;text-transform:uppercase;font-weight:800;color:#8B969C}.pst-tender-kpi-value{display:block;font-size:21px;line-height:1.1;font-weight:800;color:#273238;margin-top:5px}.pst-tender-kpi-note{display:block;font-size:9px;color:#8B969C;margin-top:2px}.pst-cap-fit{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;font-size:8.7px;font-weight:800;white-space:nowrap}.pst-cap-fit.strong{background:#E7F4EC;color:#2E7254}.pst-cap-fit.possible{background:#FAF1DF;color:#895F21}.pst-cap-fit.weak{background:#F1F3F4;color:#778187}.pst-cap-detail{font-size:9.5px;line-height:1.45;color:#768188;max-width:280px;margin-top:4px}.pst-cap-score{font-size:9px;color:#8B969C;margin-top:4px}.pst-kek-table .pst-capability-col{min-width:135px}.pst-kek-table .pst-reason-col{min-width:220px}@media(max-width:980px){#pst-tender-fit-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-kek-table{min-width:1180px}}\
';document.head.appendChild(s);
}
function ensureFitFilter(){
 var existing=document.getElementById('pst-kek-fit');if(existing)return existing;
 var fit=document.createElement('select');fit.id='pst-kek-fit';fit.innerHTML='<option value="all">Të gjitha përshtatjet</option><option value="strong">Strong</option><option value="possible">Për shqyrtim</option><option value="weak">Low</option>';fit.onchange=window.pstKekRender;
 var cat=document.getElementById('pst-kek-category');
 if(cat&&cat.parentNode){if(cat.nextSibling)cat.parentNode.insertBefore(fit,cat.nextSibling);else cat.parentNode.appendChild(fit);}
 return fit;
}
function ensureSummary(){
 var page=document.getElementById('page-kek-tenders');if(!page)return null;
 var box=document.getElementById('pst-tender-fit-summary');if(box)return box;
 box=document.createElement('div');box.id='pst-tender-fit-summary';
 var filter=page.querySelector('.pst-kek-filter'),list=document.getElementById('pst-kek-list');
 if(filter&&filter.parentNode)filter.parentNode.insertBefore(box,filter);
 else if(list&&list.parentNode)list.parentNode.insertBefore(box,list);
 else page.appendChild(box);
 return box;
}
function renderSummary(){
 var box=ensureSummary();if(!box)return;
 var s=capabilitySummary(bizRows);
 box.innerHTML='<button class="pst-tender-kpi" type="button" onclick="pstTenderQuickFilter(\'strong\')"><span class="pst-tender-kpi-label">Strong</span><span class="pst-tender-kpi-value">'+s.strong+'</span><span class="pst-tender-kpi-note">përshtatje e fortë</span></button><button class="pst-tender-kpi" type="button" onclick="pstTenderQuickFilter(\'review\')"><span class="pst-tender-kpi-label">Për shqyrtim</span><span class="pst-tender-kpi-value">'+s.review+'</span><span class="pst-tender-kpi-note">duhet verifikuar scope-i</span></button><button class="pst-tender-kpi" type="button" onclick="pstTenderQuickFilter(\'new\')"><span class="pst-tender-kpi-label">Të reja</span><span class="pst-tender-kpi-value">'+s.new+'</span><span class="pst-tender-kpi-note">ende pa vendim</span></button><button class="pst-tender-kpi" type="button" onclick="pstTenderQuickFilter(\'ignored\')"><span class="pst-tender-kpi-label">Të anashkaluara</span><span class="pst-tender-kpi-value">'+s.ignored+'</span><span class="pst-tender-kpi-note">të ruajtura në histori</span></button>';
}
window.pstTenderQuickFilter=function(key){
 var ph=document.getElementById('pst-kek-phase'),st=document.getElementById('pst-kek-status'),fit=ensureFitFilter();
 if(ph)ph.value=key==='ignored'?'all':'focus';
 if(st)st.value=key==='new'?'new':key==='ignored'?'ignored':'open';
 if(fit)fit.value=key==='strong'?'strong':key==='review'?'possible':'all';
 render();
};
function setupShell(){
 var page=document.getElementById('page-kek-tenders');if(!page)return;
 addCapabilityCss();ensureSummary();ensureFitFilter();
 var title=page.querySelector('.pst-kek-title');if(title)title.textContent='Mundësi për PRISTEEL';
 var sub=page.querySelector('.pst-kek-sub');
 if(sub)sub.textContent='KRPP, APP dhe TED monitorohen automatikisht. Çdo njoftim vlerësohet kundrejt kapaciteteve reale të PRISTEEL, edhe kur titulli nuk përmend çelik. Strong kalon në fokus; sinjalet kontekstuale mbeten Për shqyrtim. Projekti krijohet vetëm pas aprovimit tonë.';
 var eye=page.querySelector('.pst-kek-eye');if(eye)eye.textContent='PUBLIC PROCUREMENT INTELLIGENCE · CAPABILITY FIT';
 var tile=page.querySelector('[data-pst-kek-app] .pst-ws-app-sub');if(tile)tile.textContent='KRPP + APP + TED · mundësi të vlerësuara sipas kapaciteteve PRISTEEL';
 var ph=document.getElementById('pst-kek-phase');
 if(ph&&ph.getAttribute('data-pst-capability-ready')!=='1'){ph.innerHTML='<option value="focus">Fokus operativ</option><option value="opportunity">Mundësi aktive · TED/KRPP/APP</option><option value="award">Rezultate / fitues TED</option><option value="all">Të gjitha</option>';ph.value='focus';ph.onchange=window.pstKekRender;ph.setAttribute('data-pst-capability-ready','1');}
 var cat=document.getElementById('pst-kek-category');
 if(cat&&cat.getAttribute('data-pst-capability-ready')!=='1'){cat.innerHTML='<option value="all">Të gjitha kategoritë</option><option value="raw_material">Lëndë e parë / armaturë</option><option value="steel_structure">Fabrikim / struktura</option><option value="possible">Kontekst për shqyrtim</option>';cat.value='all';cat.setAttribute('data-pst-capability-ready','1');}
 var st=document.getElementById('pst-kek-status');
 if(st&&st.getAttribute('data-pst-capability-ready')!=='1'){st.innerHTML='<option value="open">Të hapura / për veprim</option><option value="new">Vetëm të reja</option><option value="review">Në shqyrtim / për kontakt</option><option value="contacted">Kontaktuar · TED</option><option value="promoted">Të kthyera në projekt</option><option value="ignored">Të anashkaluara</option><option value="all">Të gjitha</option>';st.value='open';st.onchange=window.pstKekRender;st.setAttribute('data-pst-capability-ready','1');}
}
function updateBadge(){
 var badge=document.getElementById('pst-kek-nav-badge');if(!badge)return;
 var c=operationalRows(bizRows).length;
 badge.textContent=String(c);badge.style.display=c?'inline-flex':'none';
}
async function load(){
 var h=document.getElementById('pst-kek-list');if(h)h.innerHTML='<div class="pst-kek-empty">Duke ngarkuar mundësitë…</div>';
 setupShell();loading=true;
 try{
  if(originalLoad)await originalLoad();
  bizRows=await db('kek_tender_watch?select=*&order=published_date.desc,relevance_score.desc&limit=2000');
  bizRows=Array.isArray(bizRows)?bizRows:[];
  homeSignalCache=bizRows;homeSignalLastFetch=Date.now();
  setupShell();updateBadge();renderHomeSignal(bizRows);loading=false;render();
 }catch(e){loading=false;if(h)h.innerHTML='<div class="pst-kek-empty">Tabela e tenderëve nuk u ngarkua: '+esc(e.message)+'</div>';}
}
function statusMatch(r,st){var bs=bizStatus(r);if(st==='all')return true;if(st==='open')return bs==='new'||bs==='review';return bs===st;}
function phaseMatch(r,ph){
 if(ph==='focus')return isOperationalFocus(r);
 if(ph==='opportunity')return phase(r)==='opportunity';
 if(ph==='award')return phase(r)==='award';
 return true;
}
function winnerHtml(r){
 if(source(r)!=='TED'||phase(r)!=='award')return'';
 var w=winner(r);
 if(!w.name)return'<div class="pst-kek-meta" style="margin-top:6px;color:#9A6B45"><strong>Fituesi:</strong> ende nuk është publikuar në të dhënat e TED.</div>';
 var extra=[w.city,w.country].filter(Boolean).join(', ');var more=w.names.length>1?' · +'+(w.names.length-1)+' fitues tjetër':'';
 return'<div class="pst-kek-meta" style="margin-top:6px;color:#455B9A"><strong>Fituesi:</strong> '+esc(w.name)+(extra?' · '+esc(extra):'')+more+(w.email?' · '+esc(w.email):'')+'</div>';
}
function tedActions(r){
 var w=winner(r),a='';
 a+='<button class="pst-kek-btn" onclick="pstKekOpenSource(\''+esc(r.id)+'\')">TED ↗</button>';
 if(!w.name){
  if(r.status!=='ignored')a+='<button class="pst-kek-btn danger" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'ignored\')">Anashkalo</button>';
  return a;
 }
 if(isOperationalFocus(r))a+='<button class="pst-kek-btn" onclick="pstTenderIntelligence(\''+esc(r.id)+'\')">AI Brief</button>';
 if(w.email)a+='<button class="pst-kek-btn" onclick="pstTenderBizEmail(\''+esc(r.id)+'\')">Email ↗</button>';
 if(safeHttp(w.website))a+='<button class="pst-kek-btn" onclick="pstTenderBizWebsite(\''+esc(r.id)+'\')">Web ↗</button>';
 var st=bizStatus(r);
 if(st==='new')a+='<button class="pst-kek-btn primary" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'review\')">Për kontakt</button>';
 else if(st==='review')a+='<button class="pst-kek-btn primary" onclick="pstTenderBizMarkContacted(\''+esc(r.id)+'\')">Kontaktuar</button>';
 else if(st==='contacted')a+='<button class="pst-kek-btn" onclick="pstTenderBizReopen(\''+esc(r.id)+'\')">Rihap</button>';
 if(r.status!=='ignored')a+='<button class="pst-kek-btn danger" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'ignored\')">Anashkalo</button>';
 return a;
}
function localActions(r){
 var a='';
 if((r.detail_url||r.source_url))a+='<button class="pst-kek-btn" onclick="pstKekOpenSource(\''+esc(r.id)+'\')">'+sourceButton(r)+'</button>';
 if(r.status==='promoted'&&r.project_id)return a+'<button class="pst-kek-btn primary" onclick="pstKekOpenProject(\''+esc(r.project_id)+'\')">Hap projektin</button>';
 if(isOperationalFocus(r))a+='<button class="pst-kek-btn" onclick="pstTenderIntelligence(\''+esc(r.id)+'\')">AI Brief</button>';
 a+='<button class="pst-kek-btn" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'review\')">Shqyrto</button>';
 if(phase(r)==='opportunity')a+='<button class="pst-kek-btn primary" onclick="pstTenderBizPromote(\''+esc(r.id)+'\')">Krijo projekt</button>';
 a+='<button class="pst-kek-btn danger" onclick="pstTenderBizSetStatus(\''+esc(r.id)+'\',\'ignored\')">Anashkalo</button>';
 return a;
}
function render(){
 var h=document.getElementById('pst-kek-list');if(!h||loading)return;
 setupShell();renderSummary();
 var q=n((document.getElementById('pst-kek-search')||{}).value||'');
 var src=(document.getElementById('pst-kek-source')||{}).value||'all';
 var ph=(document.getElementById('pst-kek-phase')||{}).value||'focus';
 var cat=(document.getElementById('pst-kek-category')||{}).value||'all';
 var fit=(document.getElementById('pst-kek-fit')||{}).value||'all';
 var st=(document.getElementById('pst-kek-status')||{}).value||'open';
 var list=bizRows.filter(function(r){
  if(!phaseMatch(r,ph))return false;
  if(src!=='all'&&source(r)!==src)return false;
  if(cat!=='all'&&r.category!==cat)return false;
  if(fit!=='all'&&capabilityFit(r)!==fit)return false;
  if(!statusMatch(r,st))return false;
  if(q&&n([r.title,r.authority,r.procurement_no,r.publication_no,r.fpp,r.fpp_description,winner(r).name,winner(r).email,capabilityReason(r)].join(' ')).indexOf(q)<0)return false;
  return true;
 });
 if(!list.length){h.innerHTML='<div class="pst-kek-empty">Nuk ka mundësi që përputhen me filtrin. KRPP, APP dhe TED vlerësohen sipas Capability Fit të PRISTEEL; sinjalet kontekstuale mbeten për shqyrtim njerëzor.</div>';return;}
 h.innerHTML='<table class="pst-kek-table"><thead><tr><th>Tenderi</th><th>Burimi</th><th class="pst-capability-col">Capability Fit</th><th class="pst-reason-col">Pse për PRISTEEL</th><th>Publikuar</th><th>Afati</th><th>Statusi</th><th></th></tr></thead><tbody>'+list.map(function(r){
  var cf=capabilityFit(r),reason=capabilityReason(r),meta=esc(r.procurement_no||'')+(r.fpp?' · '+codeLabel(r)+' '+esc(r.fpp):'')+(r.authority?' · '+esc(r.authority):'');
  var isAward=phase(r)==='award';var actions=source(r)==='TED'&&isAward?tedActions(r):localActions(r);
  return'<tr><td><div class="pst-kek-name">'+esc(r.title)+'</div><div class="pst-kek-meta">'+meta+'</div>'+winnerHtml(r)+'</td><td><span class="pst-kek-chip source '+sourceClass(r)+'">'+sourceLabel(r)+'</span>'+(isAward?'<span class="pst-kek-chip award">Rezultat</span>':'')+'</td><td><span class="pst-cap-fit '+cf+'">'+esc(capabilityFitLabel(cf))+'</span><div class="pst-cap-score">'+esc(r.relevance_score)+'% · '+esc(catLabel(r.category))+'</div></td><td><div class="pst-cap-detail">'+esc(reason)+'</div></td><td>'+dateText(r.published_date)+'</td><td>'+(isAward?'—':dateText(r.deadline))+'</td><td>'+esc(statusLabel(r))+'</td><td><div class="pst-kek-rowacts">'+actions+'</div></td></tr>';
 }).join('')+'</tbody></table>';
}
async function refreshOwnRows(){
 bizRows=await db('kek_tender_watch?select=*&order=published_date.desc,relevance_score.desc&limit=2000');bizRows=Array.isArray(bizRows)?bizRows:[];homeSignalCache=bizRows;homeSignalLastFetch=Date.now();updateBadge();renderHomeSignal(bizRows);render();
}
window.pstTenderBizSetStatus=async function(id,status){
 try{
  if(originalSetStatus)await originalSetStatus(id,status);else await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{status:status,updated_at:new Date().toISOString()});
  var r=bizRows.find(function(x){return String(x.id)===String(id);});if(r)r.status=status;updateBadge();renderHomeSignal(bizRows);render();
 }catch(e){alert('Gabim: '+e.message);}
};
window.pstTenderBizMarkContacted=async function(id){
 try{
  var r=bizRows.find(function(x){return String(x.id)===String(id);});if(!r||source(r)!=='TED'||phase(r)!=='award')return;
  var p=Object.assign({},payload(r),{ted_contact_status:'contacted',ted_contacted_at:new Date().toISOString()});
  await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{payload:p,updated_at:new Date().toISOString()});r.payload=p;updateBadge();renderHomeSignal(bizRows);render();
 }catch(e){alert('Gabim: '+e.message);}
};
window.pstTenderBizReopen=async function(id){
 try{
  var r=bizRows.find(function(x){return String(x.id)===String(id);});if(!r||source(r)!=='TED'||phase(r)!=='award')return;
  var p=Object.assign({},payload(r));delete p.ted_contact_status;delete p.ted_contacted_at;
  await db('kek_tender_watch?id=eq.'+encodeURIComponent(id),'PATCH',{payload:p,status:'review',updated_at:new Date().toISOString()});r.payload=p;r.status='review';updateBadge();renderHomeSignal(bizRows);render();
 }catch(e){alert('Gabim: '+e.message);}
};
window.pstTenderBizEmail=function(id){var r=bizRows.find(function(x){return String(x.id)===String(id);}),e=r&&phase(r)==='award'&&winner(r).email;if(e)window.location.href='mailto:'+encodeURIComponent(e);};
window.pstTenderBizWebsite=function(id){var r=bizRows.find(function(x){return String(x.id)===String(id);}),u=r&&phase(r)==='award'&&safeHttp(winner(r).website);if(u)window.open(u,'_blank','noopener');};
window.pstTenderBizPromote=async function(id){try{var r=bizRows.find(function(x){return String(x.id)===String(id);});if(!r||phase(r)!=='opportunity')return;if(originalPromote)await originalPromote(id);await refreshOwnRows();}catch(e){alert('Gabim: '+e.message);}};

function install(){
 if(installed)return true;
 if(typeof window.pstKekLoad!=='function'||typeof window.pstKekRender!=='function')return false;
 installed=true;originalLoad=window.pstKekLoad;originalSetStatus=window.pstKekSetStatus;originalPromote=window.pstKekPromote;
 window.pstKekLoad=load;window.pstKekRender=render;
 var page=document.getElementById('page-kek-tenders');if(page&&page.style.display!=='none')setTimeout(load,50);
 return true;
}
[400,900,1600,2800,4800,8000].forEach(function(ms){setTimeout(function(){install();installHomeNavigationHooks();},ms);});
[700,1800,4200,8000].forEach(function(ms){setTimeout(function(){scheduleHomeSignal(ms===700);},ms);});
window.addEventListener('pst:modules-ready',function(){installHomeNavigationHooks();afterHomeRender(true);});
window.pstTenderBusinessFlow={source:source,phase:phase,bizStatus:bizStatus,isOperationalFocus:isOperationalFocus,phaseMatch:phaseMatch,winner:winner,operationalRows:operationalRows,homeSignalSummary:homeSignalSummary,capabilityFit:capabilityFit,capabilityMatches:capabilityMatches,capabilityReason:capabilityReason,capabilitySummary:capabilitySummary,renderHomeSignal:renderHomeSignal,refreshHomeSignal:refreshHomeSignal,intelligenceMode:intelligenceMode,tenderBriefFallback:tenderBriefFallback,tenderBriefContext:tenderBriefContext,tenderBriefMessages:tenderBriefMessages,normalizeTenderBrief:normalizeTenderBrief,generateTenderBrief:generateTenderBrief};
})();