import fs from 'node:fs';

const path='pristeel-project-centric-workflow-v1.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(oldText,newText,label){
  const first=source.indexOf(oldText);
  if(first<0)throw new Error(`Guard failed: missing ${label}`);
  if(source.indexOf(oldText,first+oldText.length)>=0)throw new Error(`Guard failed: duplicate ${label}`);
  source=source.slice(0,first)+newText+source.slice(first+oldText.length);
}

replaceOnce(
  "function tenderSource(r){var x=S(tenderPayload(r).source||'KRPP').toUpperCase();return x==='TED'?'TED':(x==='APP'||x==='APP_AL')?'APP_AL':'KRPP';}",
  `var TENDER_SOURCE_ORDER=['TED','KRPP','APP_AL','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','UNDP_KOSOVO','EU_OFFICE_KOSOVO'];
var TENDER_SOURCE_META={
 TED:{label:'EU · TED',tab:'TED'},KRPP:{label:'Kosovë · KRPP',tab:'KRPP'},APP_AL:{label:'Shqipëri · APP',tab:'APP'},
 MCA_KOSOVO:{label:'Kosovë · MCA',tab:'MCA Kosovo'},KCF:{label:'Kosovë · KCF',tab:'KCF'},RCF:{label:'Kosovë · RCF',tab:'RCF'},
 EBRD_ECEPP:{label:'EBRD · ECEPP',tab:'EBRD'},WORLD_BANK:{label:'World Bank',tab:'World Bank'},UNGM:{label:'UNGM',tab:'UNGM'},
 UNDP_KOSOVO:{label:'Kosovë · UNDP',tab:'UNDP Kosovo'},EU_OFFICE_KOSOVO:{label:'Kosovë · EU Office',tab:'EU Office Kosovo'}
};
function normalizeTenderSource(v){
 var x=S(v).trim().toUpperCase().replace(/[\\s-]+/g,'_');
 var aliases={APP:'APP_AL',APP_ALBANIA:'APP_AL',MCA:'MCA_KOSOVO',EBRD:'EBRD_ECEPP',WB:'WORLD_BANK',WORLDBANK:'WORLD_BANK',UNDP:'UNDP_KOSOVO',EEAS:'EU_OFFICE_KOSOVO',EU_OFFICE:'EU_OFFICE_KOSOVO'};
 return aliases[x]||x;
}
function tenderSource(r){var p=tenderPayload(r),x=normalizeTenderSource(p.source||(r&&r.source_key)||'KRPP');return x||'KRPP';}`,
  'tenderSource'
);

replaceOnce(
  "function sourceLabel(r){return tenderSource(r)==='TED'?'EU · TED':tenderSource(r)==='APP_AL'?'Shqipëri · APP':'Kosovë · KRPP';}",
  "function sourceLabel(r){var src=tenderSource(r),m=TENDER_SOURCE_META[src];return m?m.label:src;}",
  'sourceLabel'
);

replaceOnce(
  "if(eye)eye.textContent='MONITORI AUTOMATIK I TENDERËVE TË ÇELIKUT';if(title)title.textContent='Mundësitë';if(sub)sub.textContent='KRPP, APP dhe TED mblidhen në prapaskenë. Këtu punojmë vetëm me mundësitë që mund të kthehen në projekt.';",
  "if(eye)eye.textContent='MONITORI AUTOMATIK I MUNDËSIVE TË NDËRTIMIT & INDUSTRISË';if(title)title.textContent='Mundësitë';if(sub)sub.textContent='TED, KRPP, APP dhe burimet donor/IFI mblidhen në një radhë të vetme për shqyrtim, kualifikim dhe veprim.';",
  'opportunities heading'
);

replaceOnce(
  "var all=dedupeOpportunities(tenderState.rows.filter(tenderVisible)),rows=opportunityRows(),counts={new:0,draft:0,waiting:0,replied:0},sources={TED:0,KRPP:0,APP_AL:0};all.forEach(function(r){var src=tenderSource(r);if(Object.prototype.hasOwnProperty.call(sources,src))sources[src]++;counts[opportunityLifecycle(r)]++;});",
  "var all=dedupeOpportunities(tenderState.rows.filter(tenderVisible)),rows=opportunityRows(),counts={new:0,draft:0,waiting:0,replied:0},sources={};TENDER_SOURCE_ORDER.forEach(function(src){sources[src]=0;});all.forEach(function(r){var src=tenderSource(r);if(Object.prototype.hasOwnProperty.call(sources,src))sources[src]++;counts[opportunityLifecycle(r)]++;});",
  'source counters'
);

replaceOnce(
  "tabs.innerHTML='<button data-pcw-source=\"all\" class=\"'+(tenderState.source==='all'?'on':'')+'\"><span>Të gjitha</span><i>'+all.length+'</i></button><button data-pcw-source=\"TED\" class=\"'+(tenderState.source==='TED'?'on':'')+'\"><span>TED</span><i>'+sources.TED+'</i></button><button data-pcw-source=\"KRPP\" class=\"'+(tenderState.source==='KRPP'?'on':'')+'\"><span>KRPP</span><i>'+sources.KRPP+'</i></button><button data-pcw-source=\"APP_AL\" class=\"'+(tenderState.source==='APP_AL'?'on':'')+'\"><span>APP</span><i>'+sources.APP_AL+'</i></button>';",
  "tabs.innerHTML='<button data-pcw-source=\"all\" class=\"'+(tenderState.source==='all'?'on':'')+'\"><span>Të gjitha</span><i>'+all.length+'</i></button>'+TENDER_SOURCE_ORDER.map(function(src){var m=TENDER_SOURCE_META[src]||{tab:src};return '<button data-pcw-source=\"'+E(src)+'\" class=\"'+(tenderState.source===src?'on':'')+'\"><span>'+E(m.tab)+'</span><i>'+Number(sources[src]||0)+'</i></button>';}).join('');",
  'source tabs'
);

replaceOnce(
  "context=typeof context==='string'?{focus:context}:(context||{});var f=S(context.focus).toLowerCase(),src=S(context.source).toUpperCase(),mode=f==='award'||f==='local'?f:S(context.mode||'all').toLowerCase();\n if(src==='APP')src='APP_AL';\n tenderState.focus=['due','review'].indexOf(f)>-1?f:'';\n tenderState.source=['TED','KRPP','APP_AL'].indexOf(src)>-1?src:(mode==='award'?'TED':'all');",
  "context=typeof context==='string'?{focus:context}:(context||{});var f=S(context.focus).toLowerCase(),src=normalizeTenderSource(context.source),mode=f==='award'||f==='local'?f:S(context.mode||'all').toLowerCase();\n tenderState.focus=['due','review'].indexOf(f)>-1?f:'';\n tenderState.source=TENDER_SOURCE_ORDER.indexOf(src)>-1?src:(mode==='award'?'TED':'all');",
  'source context'
);

fs.writeFileSync(path,source);
console.log('guarded multilateral Opportunities patch applied');
