'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const guardSource = fs.readFileSync('pristeel-home-runtime-owner-guard-v1.js', 'utf8');
const rolesSource = fs.readFileSync('pristeel-roles.js', 'utf8');

assert(rolesSource.includes("pristeel-home-runtime-owner-guard-v1.js"),'RBAC/bootstrap loader must load the Home runtime owner guard');
assert(rolesSource.includes('g.onload=loadProjectEmailsModule'),'Ordered runtime bootstrap must start from the guard onload callback');
assert(!rolesSource.includes('(function loadProjectEmailsModule(){'),'The old immediate project-emails bootstrap must not remain active');
[
  'window.__pstDashboardCalmLoaded=true;',
  'window.__pstDashboardFocusLoaded=true;',
  'window.__pstOperationalHomeLoaded=true;',
  'window.__pstUiV2Loaded=true;',
  'window.__pstHomeLiveFixV1=true;',
  'window.__pstHomeStabilityV2=true;',
  'window.__pstHomeProjectRecoveryV3=true;',
  'window.__pstHomeOperationalPriorityV1=true;',
  'window.__pstHomeVisualCleanupV1=true;'
].forEach(marker=>assert(guardSource.includes(marker),'Missing pre-bootstrap retirement marker: '+marker));

const listeners = Object.create(null);
function cls(){const set=new Set();return{add(x){set.add(x);},remove(x){set.delete(x);},contains(x){return set.has(x);},toggle(x,on){if(on)set.add(x);else set.delete(x);}};}
function node(id){return{id,style:{},classList:cls(),attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},insertBefore(ch){this.children.unshift(ch);nodes[ch.id]=ch;},appendChild(ch){this.children.push(ch);nodes[ch.id]=ch;}};}
const nodes={
  'page-workspace-home':node('page-workspace-home'),
  'pst-ws-home-actions':node('pst-ws-home-actions'),
  'pst-ws-home-projects':node('pst-ws-home-projects'),
  'page-home':node('page-home'),
  'app-sidebar':node('app-sidebar')
};
nodes['page-home'].classList.add('active');
let canonicalScript=null,legacyCalls=[],canonicalRenders=0,canonicalActivations=0,capturedLegacyDuringCanonicalLoad=null;

const document={
  body:{classList:cls()},
  documentElement:{classList:cls()},
  getElementById(id){return nodes[id]||null;},
  querySelector(sel){
    if(sel==='script[data-pst-home-canonical-v1]')return canonicalScript;
    if(sel==='.sidebar')return nodes['app-sidebar'];
    return null;
  },
  createElement(tag){
    if(tag==='script')return{tagName:'SCRIPT',attrs:{},addEventListener(){},setAttribute(k,v){this.attrs[k]=v;}};
    if(tag==='style')return{id:'',textContent:'',tagName:'STYLE'};
    if(tag==='div')return node('');
    throw new Error('Unexpected element '+tag);
  },
  head:{appendChild(el){
    if(el.tagName==='STYLE'){if(el.id)nodes[el.id]=el;return;}
    canonicalScript=el;
    setTimeout(()=>{
      capturedLegacyDuringCanonicalLoad=context.window.pstWorkspaceGo;
      context.window.pstWorkspaceGo=function ignoredCanonicalAssignment(){throw new Error('Guard must remain public router');};
      context.window.PSTHomeCanonicalV1={
        activateHome(){canonicalActivations+=1;},
        render(){canonicalRenders+=1;return Promise.resolve(true);}
      };
      if(typeof el.onload==='function')el.onload();
    },0);
  }},
  addEventListener(name,fn){listeners[name]=fn;}
};

const context=vm.createContext({console,document,setTimeout,clearTimeout,Promise});
context.window=context;
context.window.open=()=>true;
vm.runInContext(guardSource,context,{filename:'pristeel-home-runtime-owner-guard-v1.js'});

assert.strictEqual(context.window.__pstDashboardCalmLoaded,true);
assert.strictEqual(context.window.__pstDashboardFocusLoaded,true);
assert.strictEqual(context.window.__pstOperationalHomeLoaded,true);
assert.strictEqual(context.window.__pstUiV2Loaded,true,'UI V2 legacy dashboard must be retired before its file executes');
assert.strictEqual(context.window.__pstHomeLiveFixV1,true);
assert.strictEqual(context.window.__pstHomeStabilityV2,true);
assert.strictEqual(context.window.__pstHomeProjectRecoveryV3,true);
assert.strictEqual(context.window.__pstHomeOperationalPriorityV1,true);
assert.strictEqual(context.window.__pstHomeVisualCleanupV1,true);

if(listeners.DOMContentLoaded)listeners.DOMContentLoaded();
assert(nodes['pst-v2-sidebar'],'Compatibility sidebar scaffold must exist without legacy UI V2');
assert.strictEqual(typeof context.window.pstV2Go,'function','Compatibility navigation API must exist');
assert.strictEqual(typeof context.window.pstV2Refresh,'function','Compatibility refresh API must exist');

function workspaceGo(key){legacyCalls.push(String(key||'home'));return'legacy:'+String(key||'home');}
context.window.pstWorkspaceGo=workspaceGo;

(async function run(){
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.strictEqual(capturedLegacyDuringCanonicalLoad,workspaceGo,'Canonical must capture the real Workspace router while it loads');

  const beforeReady=context.window.pstWorkspaceGo('home');
  assert.strictEqual(beforeReady,'legacy:home','Workspace may build only its shell before modules-ready');
  assert.strictEqual(legacyCalls.filter(x=>x==='home').length,1);

  assert(listeners['pst:modules-ready'],'Guard must listen for real bootstrap completion event');
  listeners['pst:modules-ready']();
  await new Promise(resolve=>setTimeout(resolve,220));

  assert(canonicalRenders>=1,'Canonical Home must render after modules-ready');
  assert(canonicalActivations>=1,'Canonical Home must activate after modules-ready');
  assert.strictEqual(nodes['page-home'].style.display,'none','Legacy #page-home must be hidden after runtime is ready');
  assert.strictEqual(nodes['page-home'].attrs['aria-hidden'],'true','Legacy Home must be inaccessible after runtime is ready');

  const legacyHomeCount=legacyCalls.filter(x=>x==='home').length;
  context.window.pstWorkspaceGo('home');
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.strictEqual(legacyCalls.filter(x=>x==='home').length,legacyHomeCount,'Home must never route back to legacy renderers after modules-ready');
  assert(canonicalRenders>=2,'Later Home navigation must render Canonical directly');

  context.window.pstWorkspaceGo('projects');
  assert.strictEqual(legacyCalls[legacyCalls.length-1],'projects','Non-Home Workspace routes remain intact');

  console.log('Home runtime owner guard smoke: OK');
})().catch(error=>{console.error(error);process.exit(1);});
