const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-native-ui-v3-core.js','utf8');
  const dom=new JSDOM('<!doctype html><html><head></head><body><main id="page-workspace-home"></main></body></html>',{
    runScripts:'outside-only',
    url:'https://example.test/'
  });
  const w=dom.window;
  const action={
    id:'a-christina',
    project_id:'p-kosovo-ewas',
    project_name:'Kosovo EWAS Project',
    client:'EWAS',
    title:'Analizo përgjigjen e Christina-s',
    detail:'Konfirmo përvojën me shtylla të ngjashme dhe përgatit përgjigjen.',
    due_date:'2026-09-03',
    priority:'high',
    status:'open',
    source:'project_email',
    created_at:'2026-09-02T12:43:00Z'
  };
  w.supaFetch=async path=>{
    if(path.startsWith('projects?'))return[{id:action.project_id,name:action.project_name,client:action.client,status:'active',last_activity_at:action.created_at}];
    if(path.startsWith('pppp_home_current_actions_v1?'))return[action];
    if(path==='rpc/pppp_automation_health_v1')return{};
    return[];
  };
  const opened=[];
  w.pstOpenProjectWorkspace=id=>{opened.push(String(id));return true;};

  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
  await new Promise(resolve=>setTimeout(resolve,30));

  const row=w.document.querySelector('[data-pn-action-id="a-christina"]');
  assert(row,'Priority Actions must render a dedicated full-card action target');
  assert.strictEqual(row.tagName,'BUTTON','The entire priority row must be clickable, not only its right-side affordance');
  assert(row.textContent.includes(action.title),'The priority row must show the exact action title');
  assert(row.textContent.includes(action.detail),'The priority row must explain the action before the project is opened');
  row.querySelector('.pn-priority-detail').click();
  assert.deepStrictEqual(opened,[action.project_id],'Clicking the text area of the priority card must open its project');

  const stored=JSON.parse(w.sessionStorage.getItem('pst_priority_action_context_v1'));
  assert.strictEqual(stored.project_id,action.project_id,'Priority navigation must retain the selected project');
  assert.strictEqual(stored.title,action.title,'Priority navigation must retain the exact selected action');
  assert.strictEqual(stored.detail,action.detail,'Priority navigation must retain the next-step explanation');
  assert.strictEqual(stored.source,action.source,'Priority navigation must retain the action source for contextual routing');
  assert(Number(stored.captured_at)>0,'Priority context must include an expiry timestamp');

  dom.window.close();
  console.log('Native UI priority context smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
