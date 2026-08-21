'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const guardSource=fs.readFileSync('pristeel-home-runtime-owner-guard-v1.js','utf8');
const rolesSource=fs.readFileSync('pristeel-roles.js','utf8');
assert(rolesSource.includes('pristeel-home-runtime-owner-guard-v1.js'));
assert(!guardSource.includes("Object.defineProperty(window,'pstWorkspaceGo'"),'Home owner must not trap the global router with a permanent property descriptor');
['window.__pstDashboardCalmLoaded=true;','window.__pstDashboardFocusLoaded=true;','window.__pstOperationalHomeLoaded=true;','window.__pstUiV2Loaded=true;','window.__pstUiV2PolishLoaded=true;','window.__pstDashboardActionControlsV2Loaded=true;','window.__pstHomeLiveFixV1=true;','window.__pstHomeStabilityV2=true;','window.__pstHomeProjectRecoveryV3=true;','window.__pstHomeOperationalPriorityV1=true;','window.__pstHomeVisualCleanupV1=true;','window.__pstLoginTransitionV2=true;'].forEach(x=>assert(guardSource.includes(x),x));

function cls(){const s=new Set();return{add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x),toggle(x,on){if(on)s.add(x);else s.delete(x)}};}
function node(id){return{id,style:{},classList:cls(),attrs:{},children:[],parentNode:null,setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]||null},remove(){delete nodes[this.id]},insertBefore(ch){ch.parentNode=this;this.children.unshift(ch);if(ch.id)nodes[ch.id]=ch}};}
const nodes={'page-workspace-home':node('page-workspace-home'),'pst-ws-home-actions':node('pst-ws-home-actions'),'pst-ws-home-projects':node('pst-ws-home-projects'),'page-home':node('page-home'),'app-sidebar':node('app-sidebar'),'pst-login-transition-v2':node('pst-login-transition-v2'),'pst-login-transition-v2-style':node('pst-login-transition-v2-style')};
nodes['page-workspace-home'].classList.add('active');nodes['page-workspace-home'].style.display='block';nodes['pst-login-transition-v2'].parentNode=nodes['app-sidebar'];nodes['pst-login-transition-v2-style'].parentNode=nodes['app-sidebar'];

const listeners={};const scripts=[];let canonicalScript=null,interactionScript=null,renders=0,activations=0,visual=0,capturedLegacy=null;const calls=[];
function scriptNode(){return{tagName:'SCRIPT',attrs:{},listeners:{},style:{},setAttribute(k,v){this.attrs[k]=String(v)},getAttribute(k){return this.attrs[k]||null},addEventListener(n,f){this.listeners[n]=f},remove(){const i=scripts.indexOf(this);if(i>=0)scripts.splice(i,1)}};}
const document={
 body:{classList:cls()},documentElement:{classList:cls()},
 getElementById:id=>nodes[id]||null,
 querySelector(sel){
   if(sel==='.sidebar')return nodes['app-sidebar'];
   const m=sel.match(/^script\[([^\]]+)\]$/);if(m)return scripts.find(s=>s.attrs[m[1]]!=null)||null;
   return null;
 },
 querySelectorAll(){return[];},
 createElement(tag){if(tag==='script')return scriptNode();if(tag==='style')return{id:'',tagName:'STYLE',textContent:'',parentNode:null};if(tag==='div')return node('');throw Error(tag);},
 head:{appendChild(el){
   if(el.tagName==='STYLE'){nodes[el.id]=el;return el;}
   scripts.push(el);
   if(el.attrs['data-pst-home-canonical-v1']){
     canonicalScript=el;
     setTimeout(()=>{
       capturedLegacy=context.window.pstWorkspaceGo;
       const legacy=capturedLegacy;
       function canonicalGo(key){if(String(key||'home').toLowerCase()==='home'){activations++;renders++;return true;}return legacy.apply(this,arguments);}
       canonicalGo.__mockCanonical=true;
       context.window.PSTHomeCanonicalV1={activateHome(){activations++},render(){renders++;return Promise.resolve(true)}};
       context.window.pstWorkspaceGo=canonicalGo;
       if(el.onload)el.onload();
     },0);
   }else if(el.attrs['data-pst-home-canonical-interaction-v1']){
     interactionScript=el;setTimeout(()=>{context.window.PSTHomeCanonicalInteractionV1={decorate(){}};if(el.onload)el.onload();},0);
   }else if(el.attrs['data-pst-home-command-final']){
     setTimeout(()=>{context.window.PSTHomeCommandCenterV2={decorate(){}};if(el.onload)el.onload();},0);
   }else if(el.attrs['data-pst-home-happy-v1']){
     setTimeout(()=>{context.window.PSTHomeHappyV1={decorate(){}};if(el.onload)el.onload();},0);
   }else setTimeout(()=>{if(el.onload)el.onload();},0);
   return el;
 }},
 addEventListener:(n,f)=>listeners[n]=f,
 dispatchEvent(){return true;}
};
const context=vm.createContext({console,document,setTimeout,clearTimeout,Promise,Date,CustomEvent:function(){}});context.window=context;context.window.open=()=>true;context.PSTStartupGuard={visualReady(){visual++}};
vm.runInContext(guardSource,context);
assert(!nodes['pst-login-transition-v2']);if(listeners.DOMContentLoaded)listeners.DOMContentLoaded();assert(nodes['pst-v2-sidebar']);

function baseGo(key){calls.push('base:'+String(key));return'base:'+String(key);}context.window.pstWorkspaceGo=baseGo;
const beforeRelease=context.window.pstWorkspaceGo;context.window.pstWorkspaceGo=function releaseWrapper(key){calls.push('release:'+String(key));return beforeRelease.apply(this,arguments);};
const afterRelease=context.window.pstWorkspaceGo;context.window.pstWorkspaceGo=function laterWrapper(key){calls.push('later:'+String(key));return afterRelease.apply(this,arguments);};

(async()=>{
 await new Promise(r=>setTimeout(r,160));
 assert.strictEqual(canonicalScript,null,'Canonical must not load before modules-ready');
 assert.strictEqual(interactionScript,null,'Home decorators must not load before canonical ownership is ready');
 calls.length=0;context.window.pstWorkspaceGo('projects');
 assert.deepStrictEqual(calls,['later:projects','release:projects','base:projects'],'Before modules-ready non-Home routing must stay intact');

 assert(listeners['pst:modules-ready'],'Guard must listen for modules-ready');
 listeners['pst:modules-ready']();
 await new Promise(r=>setTimeout(r,220));
 assert(canonicalScript,'Canonical must load from the modules-ready handoff');
 assert(interactionScript,'Interaction decorator must load only after canonical render');
 assert.strictEqual(capturedLegacy.name,'laterWrapper','Canonical must capture the complete ordinary router chain');
 assert(context.window.pstWorkspaceGo.__pstCanonicalFinalRouter,'Final Home wrapper must be installed after canonical loads');
 assert(visual>=1,'Canonical render must release startup visibility');
 assert(context.window.PSTHomeRuntimeOwnerGuardV13.isHomeReady(),'Guard must report Home ready');

 calls.length=0;context.window.pstWorkspaceGo('projects');
 assert.deepStrictEqual(calls,['later:projects','release:projects','base:projects'],'Final router must preserve each non-Home wrapper exactly once');
 calls.length=0;const beforeHomeRenders=renders;context.window.pstWorkspaceGo('home');await new Promise(r=>setTimeout(r,20));
 assert.deepStrictEqual(calls,[],'Final Home route must not enter legacy wrappers');
 assert(renders>beforeHomeRenders,'Final Home route must render canonical Home');

 const finalRouter=context.window.pstWorkspaceGo;context.window.pstWorkspaceGo=function dynamicWrapper(key){calls.push('dynamic:'+String(key));return finalRouter.apply(this,arguments);};
 calls.length=0;context.window.pstWorkspaceGo('projects');
 assert.deepStrictEqual(calls,['dynamic:projects','later:projects','release:projects','base:projects'],'A later wrapper must compose safely around final routing');
 calls.length=0;context.window.pstWorkspaceGo('home');await new Promise(r=>setTimeout(r,20));
 assert.deepStrictEqual(calls,['dynamic:home'],'A later wrapper must still reach canonical Home without recursion');

 console.log('Home runtime owner guard event-driven non-recursive smoke: OK');
})().catch(e=>{console.error(e);process.exit(1)});
