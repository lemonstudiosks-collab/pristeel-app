'use strict';
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const source=fs.readFileSync('pristeel-login-transition-v2.js','utf8');

assert(!/position:fixed;inset:0/.test(source),'Login handoff must not own a full-screen overlay');
assert(!/pst-login-switching[^\n]*classList\.add/.test(source),'Login handoff must not add a blocking root class');
assert(/clearLegacyBlocker/.test(source),'Login handoff must clear historical blocker artifacts');
assert(/PSTHomeRuntimeOwnerGuardV2\|\|window\.PSTHomeRuntimeOwnerGuardV1/.test(source),'Login handoff must target canonical Home owner');

function cls(){const s=new Set(['pst-login-switching']);return{add(x){s.add(x)},remove(x){s.delete(x)},contains(x){return s.has(x)}}}
const root={classList:cls()};
const nodes={};
function n(id){return nodes[id]={id,parentNode:{removeChild(){delete nodes[id]}},remove(){delete nodes[id]}};}
n('pst-login-transition-v2');n('pst-login-transition-v2-style');
const listeners={};
const document={
 documentElement:root,head:{appendChild(){}},readyState:'complete',
 getElementById(id){return nodes[id]||null},
 querySelector(){return null},
 addEventListener(name,fn){listeners[name]=fn},
 createElement(){return{setAttribute(){}}}
};
const context=vm.createContext({console,document,setTimeout,clearTimeout,Promise});context.window=context;
context.authGetSession=()=>({access_token:'x'});
context.__pstModulesReady=true;
context.PSTHomeRuntimeOwnerGuardV2={renderCanonical(){return true}};
vm.runInContext(source,context,{filename:'pristeel-login-transition-v2.js'});
assert(!root.classList.contains('pst-login-switching'),'Blocking root class survived compatibility load');
assert(!nodes['pst-login-transition-v2'],'Blocking overlay survived compatibility load');
assert(!nodes['pst-login-transition-v2-style'],'Blocking CSS survived compatibility load');
console.log('Login transition retirement smoke: OK');
