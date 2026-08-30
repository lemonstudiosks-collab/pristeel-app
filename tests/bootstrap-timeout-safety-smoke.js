'use strict';
const fs=require('fs');const vm=require('vm');const assert=require('assert');
let source=fs.readFileSync('pristeel-project-emails.js','utf8').replace('timeoutMs=8000','timeoutMs=12');
const listeners={};let appendCount=0,readyEvents=0;
const document={
 createElement(tag){assert.strictEqual(tag,'script');return{src:'',defer:false,attrs:{},removed:false,setAttribute(k,v){this.attrs[k]=v;},remove(){this.removed=true;}};},
 head:{appendChild(el){appendCount++;const idx=Number(el.attrs['data-pst-bootstrap-index']);const attempt=Number(el.attrs['data-pst-bootstrap-attempt']);if(idx===0&&attempt===1)return el;setTimeout(()=>{if(typeof el.onload==='function')el.onload();},0);return el;}},
 dispatchEvent(){readyEvents++;}
};
const context=vm.createContext({console,document,setTimeout,clearTimeout,Date,CustomEvent:function(name){this.type=name;}});context.window=context;
/* This harness validates only the ordered files[] timeout/retry contract. The browser-only critical startup lane is covered by startup/navigation smokes and is intentionally disabled in this minimal VM. */
context.__pstCriticalStartupLaneV1=true;
vm.runInContext(source,context,{filename:'pristeel-project-emails.js'});
(async()=>{for(let i=0;i<100&&!context.__pstModulesReady;i++)await new Promise(r=>setTimeout(r,5));assert.strictEqual(context.__pstModulesReady,true,'bootstrap must complete after a timed-out module retry');const d=context.__pstBootstrapDiagnostics;assert(d&&d.completed,'diagnostics must mark completion');assert.strictEqual(d.timeouts.length,1,'first hung attempt must be recorded');assert.strictEqual(d.retries.length,1,'hung module must retry exactly once');assert.strictEqual(d.retries[0].index,0);assert.strictEqual(d.loaded,d.total,'all modules must eventually be counted as loaded');assert.strictEqual(readyEvents,1,'modules-ready must fire exactly once');assert(appendCount>d.total,'retry must append one additional script');console.log('Ordered bootstrap timeout safety smoke: OK');})().catch(e=>{console.error(e);process.exit(1);});
