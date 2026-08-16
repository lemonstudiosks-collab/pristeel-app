import assert from 'node:assert/strict';
import { classifyTedNotice, normalizeTedNotice, reconcileTedOpportunityLifecycle, reconcileTenderDeadlineTaskLifecycle, tenderDeadlineTaskRows, runTedTenderSync } from '../scripts/ted-tender-sync.mjs';

const steel=classifyTedNotice({title:'Stahlbauarbeiten mit technischer Plattform',cpv:['45223210']});
assert.equal(steel.category,'steel_structure');
assert.ok(steel.relevance_score>=90);
const raw=classifyTedNotice({title:'Supply of structural steel profiles',cpv:['44334000']});
assert.equal(raw.category,'raw_material');
assert.ok(raw.relevance_score>=90);
const generic=classifyTedNotice({title:'Emergency training dolls',cpv:['44211100']});
assert.equal(generic.relevance_score,0,'generic 4421 structures must not be promoted as steel work by CPV alone');
const secondaryOnly=classifyTedNotice({title:'General building construction',cpv:['45000000','45223210']});
assert.ok(secondaryOnly.relevance_score<75,'secondary steel CPV inside a general contract must stay below the operational threshold');
const explicitSteelTitle=classifyTedNotice({title:'Stahlbauarbeiten mit Alu-Plattform',cpv:['45223000','45223210']});
assert.ok(explicitSteelTitle.relevance_score>=75,'explicit steel title must remain eligible even when the scope also mentions aluminium');
const aluminiumOnly=classifyTedNotice({title:'Vorhangfassade Alu / Neubau Kombibad',cpv:['45223110']});
assert.ok(aluminiumOnly.relevance_score<75,'clear aluminium-only metalwork must not become a steel opportunity from CPV alone');
const aluminiumCladding=classifyTedNotice({title:'Fahrzeughalle, Dämmung- und Alu-Wandbekleidung',cpv:['45223110']});
assert.ok(aluminiumCladding.relevance_score<75,'aluminium cladding must not be promoted as fabricated steel work');
const supervision=classifyTedNotice({title:'Fachbauüberwachung Stahlbau',cpv:['71000000','45223210']});
assert.ok(supervision.relevance_score<75,'steel supervision/service tenders are not fabrication opportunities');

const fixture={
  notices:[
    {
      'publication-number':'562840-2026',
      'notice-title':{eng:'Stahlbauarbeiten mit Alu-Plattform und technischer Ausrüstung'},
      'notice-type':'can-standard',
      'publication-date':'2026-08-13',
      'buyer-name':{eng:'Test Buyer Germany'},
      'classification-cpv':['44212000','45223210'],
      'deadline-receipt-tender-date-lot':['2026-09-15'],
      'place-of-performance':['DEU']
    },
    {
      'publication-number':'600001-2026',
      'notice-title':{eng:'Supply of structural steel profiles'},
      'notice-type':'cn-standard',
      'publication-date':'2026-08-14',
      'buyer-name':{eng:'Infrastructure Buyer'},
      'classification-cpv':['44334000'],
      'deadline-receipt-tender-date-lot':['2026-09-30','2026-10-15'],
      'deadline-receipt-request-date-lot':['2026-09-25'],
      'place-of-performance':['DEU']
    }
  ]
};
const row=normalizeTedNotice(fixture.notices[1],'opportunity','2026-08-14T06:00:00.000Z');
assert.equal(row.source_key,'TED:600001-2026');
assert.equal(row.procurement_no,'TED-600001-2026');
assert.equal(row.fpp,'44334000');
assert.equal(row.deadline,'2026-09-25','collector must use the nearest valid lot-level tender/participation deadline');
assert.equal(row.payload.source,'TED');
assert.equal(row.payload.notice_phase,'opportunity');
const awardRow=normalizeTedNotice(fixture.notices[0],'award','2026-08-14T06:00:00.000Z');
assert.equal(awardRow.deadline,null,'award records must not present a bidding deadline');

const calls=[];
async function fakeFetch(url,opts){
  calls.push({url,body:JSON.parse(opts.body)});
  const query=JSON.parse(opts.body).query;
  const notices=query.includes('can-standard')?[fixture.notices[0]]:[fixture.notices[1]];
  return new Response(JSON.stringify({notices}),{status:200,headers:{'content-type':'application/json'}});
}
const summary=await runTedTenderSync({mode:'preview',minScore:75,opportunityDays:45,awardDays:14,fetchImpl:fakeFetch});
assert.equal(calls.length,2,'collector should make separate opportunity and award searches');
assert.ok(calls[0].body.query.includes('notice-type IN (cn-standard cn-social pin-cfc-standard pin-cfc-social qu-sy subco)'));
assert.ok(calls[0].body.query.includes('classification-cpv = 45223210'));
assert.ok(!calls[0].body.query.includes('classification-cpv = 4421*'),'broad generic structures CPV must not be queried');
assert.ok(calls[0].body.query.includes('publication-date = ('),'opportunities should use a bounded publication window');
assert.ok(calls[0].body.fields.includes('deadline-receipt-tender-date-lot'),'collector must request the official lot tender deadline field');
assert.ok(calls[0].body.fields.includes('deadline-receipt-request-date-lot'),'collector must request the participation-request deadline for multi-stage procedures');
assert.equal(calls[0].body.scope,'ACTIVE');
assert.equal(calls[0].body.checkQuerySyntax,false);
assert.equal(calls[0].body.paginationMode,'PAGE_NUMBER');
assert.equal(summary.opportunity_lookback_days,45,'open TED scan should cover long-running active procedures');
assert.equal(summary.opportunities,1);
assert.equal(summary.opportunities_with_deadline,1);
assert.equal(summary.awards,1);
assert.equal(summary.relevant_rows,2);
assert.ok(summary.tenders.some(x=>x.publication_no==='600001-2026'&&x.phase==='opportunity'&&x.deadline==='2026-09-25'));

const taskRows=tenderDeadlineTaskRows([
  {source_key:'TED:URGENT',title:'Urgent steel structure',authority:'Buyer A',category:'steel_structure',relevance_score:96,deadline:'2026-08-17',source_url:'https://ted.example/urgent',payload:{notice_phase:'opportunity'}},
  {source_key:'TED:SOON',title:'Steel profiles',authority:'Buyer B',category:'raw_material',relevance_score:95,deadline:'2026-08-21',source_url:'https://ted.example/soon',payload:{notice_phase:'opportunity'}},
  {source_key:'TED:LOW',title:'Weak signal',authority:'Buyer C',category:'steel_structure',relevance_score:80,deadline:'2026-08-18',payload:{notice_phase:'opportunity'}},
  {source_key:'TED:LATER',title:'Later steel work',authority:'Buyer D',category:'steel_structure',relevance_score:96,deadline:'2026-08-30',payload:{notice_phase:'opportunity'}},
  {source_key:'TED:AWARD',title:'Already awarded',authority:'Buyer E',category:'steel_structure',relevance_score:100,deadline:'2026-08-17',payload:{notice_phase:'award'}}
],{today:'2026-08-16',withinDays:7,minScore:88});
assert.equal(taskRows.length,2,'only high-confidence open TED opportunities due within seven days may create tasks');
assert.deepEqual(taskRows.map(x=>x.source_ref),['TED:URGENT','TED:SOON'],'task source_ref must be the stable TED source key');
assert.equal(taskRows[0].due_date,'2026-08-16','deadline within two days should require review today');
assert.equal(taskRows[0].priority,'urgjent');
assert.equal(taskRows[1].due_date,'2026-08-19','normal urgent tender review should be due two days before bid deadline');
assert.equal(taskRows[1].priority,'e larte');
assert.ok(taskRows.every(x=>x.source==='tender_deadline_auto'&&x.project_id===null&&x.category==='intern'),'deadline automation must create internal review tasks only, never projects');
assert.ok(taskRows[0].detail.includes('verifiko scope/kriteret'),'task must explicitly require human verification');

const originalFetch=globalThis.fetch;
const deletes=[];
const lifecycleRows=[
  {id:'reject-new',source_key:'TED:REJECT',status:'new',project_id:null,deadline:'2026-09-10',payload:{source:'TED',notice_phase:'opportunity'}},
  {id:'expired-new',source_key:'TED:EXPIRED',status:'new',project_id:null,deadline:'2026-08-15',payload:{source:'TED',notice_phase:'opportunity'}},
  {id:'expired-review',source_key:'TED:REVIEW',status:'review',project_id:null,deadline:'2026-08-15',payload:{source:'TED',notice_phase:'opportunity'}},
  {id:'expired-promoted',source_key:'TED:PROMOTED',status:'promoted',project_id:'project-1',deadline:'2026-08-15',payload:{source:'TED',notice_phase:'opportunity'}},
  {id:'relevant-new',source_key:'TED:KEEP',status:'new',project_id:null,deadline:'2026-09-10',payload:{source:'TED',notice_phase:'opportunity'}},
  {id:'app-expired',source_key:'APP:X',status:'new',project_id:null,deadline:'2026-08-15',payload:{source:'APP_AL',notice_phase:'opportunity'}}
];
globalThis.fetch=async(url,opts={})=>{
  if((opts.method||'GET')==='GET')return new Response(JSON.stringify(lifecycleRows),{status:200});
  if(opts.method==='DELETE'){deletes.push(decodeURIComponent(String(url).match(/id=eq\.([^&]+)/)?.[1]||''));return new Response(null,{status:204});}
  throw new Error(`Unexpected lifecycle request ${opts.method} ${url}`);
};
try{
  const lifecycle=await reconcileTedOpportunityLifecycle(
    {supabaseUrl:'https://supabase.test',apiKey:'test',bearerToken:'test'},
    {evaluatedKeys:new Set(['TED:REJECT','TED:KEEP']),relevantKeys:new Set(['TED:KEEP']),today:'2026-08-16'}
  );
  assert.deepEqual(lifecycle,{rejected:1,expired:1});
  assert.deepEqual(deletes.sort(),['expired-new','reject-new'],'only untouched machine-new rejected/expired TED opportunities may be removed');
  assert.ok(!deletes.includes('expired-review'),'human-reviewed expired tender must be preserved');
  assert.ok(!deletes.includes('expired-promoted'),'promoted tender must be preserved');
  assert.ok(!deletes.includes('relevant-new'),'currently relevant tender must be preserved');
  assert.ok(!deletes.includes('app-expired'),'TED lifecycle must not touch another source');
}finally{globalThis.fetch=originalFetch;}

const taskLifecyclePatches=[];
globalThis.fetch=async(url,opts={})=>{
  const method=opts.method||'GET';
  if(method==='GET'&&String(url).includes('/tasks?'))return new Response(JSON.stringify([
    {id:'task-promoted',source_ref:'TED:PROMOTED',status:'hapur'},
    {id:'task-ignored',source_ref:'TED:IGNORED',status:'hapur'},
    {id:'task-linked',source_ref:'TED:LINKED',status:'hapur'},
    {id:'task-overdue',source_ref:'TED:OVERDUE',status:'hapur'},
    {id:'task-missing',source_ref:'TED:MISSING',status:'hapur'}
  ]),{status:200});
  if(method==='GET'&&String(url).includes('/kek_tender_watch?'))return new Response(JSON.stringify([
    {source_key:'TED:PROMOTED',status:'promoted',project_id:'project-1'},
    {source_key:'TED:IGNORED',status:'ignored',project_id:null},
    {source_key:'TED:LINKED',status:'review',project_id:'project-2'},
    {source_key:'TED:OVERDUE',status:'new',project_id:null}
  ]),{status:200});
  if(method==='PATCH'&&String(url).includes('/tasks?')){
    taskLifecyclePatches.push({id:decodeURIComponent(String(url).match(/id=eq\.([^&]+)/)?.[1]||''),body:JSON.parse(opts.body)});
    return new Response(null,{status:204});
  }
  throw new Error(`Unexpected task lifecycle request ${method} ${url}`);
};
try{
  const closed=await reconcileTenderDeadlineTaskLifecycle(
    {supabaseUrl:'https://supabase.test',apiKey:'test',bearerToken:'test'},
    {doneAt:'2026-08-16T10:30:00.000Z'}
  );
  assert.equal(closed,3,'promoted, ignored or already-linked tenders should close their open deadline tasks');
  assert.deepEqual(taskLifecyclePatches.map(x=>x.id).sort(),['task-ignored','task-linked','task-promoted']);
  assert.ok(taskLifecyclePatches.every(x=>x.body.status==='kryer'&&x.body.done_at==='2026-08-16T10:30:00.000Z'),'auto-close should only mark the task done with an audit timestamp');
  assert.ok(!taskLifecyclePatches.some(x=>x.id==='task-overdue'),'overdue unresolved tender must remain open as a missed-opportunity signal');
  assert.ok(!taskLifecyclePatches.some(x=>x.id==='task-missing'),'missing tender record must not silently close the task');
}finally{globalThis.fetch=originalFetch;}

console.log('TED tender sync smoke: OK');
