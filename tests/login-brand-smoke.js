const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const brand=fs.readFileSync('pristeel-login-brand-v1.js','utf8');
const transition=fs.readFileSync('pristeel-login-transition-v2.js','utf8');
const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');

assert(brand.includes('#auth-gate.pst-auth-branded'),'Login brand must style the existing auth gate');
assert(brand.includes('#auth-form'),'Login brand must preserve and target the existing auth form');
assert(brand.includes('.auth-logo,#auth-gate.pst-auth-branded .pst-auth-legacy-brand{display:none!important}'),'Legacy login branding must be hidden whether or not the old markup has a class');
assert(brand.includes('.auth-title{font-size:22px!important'),'Login title is still too small');
assert(brand.includes('input{min-height:44px!important;font-size:14px!important'),'Login inputs are still below the approved readable size');
assert(brand.includes('button[type="submit"]{min-height:44px!important;font-size:14px!important'),'Login action is still below the approved readable size');
assert(!/addEventListener\(['\"]submit/.test(brand),'Brand layer must not intercept authentication submit');
assert(!/POST|PATCH|DELETE/.test(brand),'Brand layer must not write data');
assert(transition.includes("form.addEventListener('submit',begin,true)"),'Bounded login transition must remain attached to the existing form');
assert(/pristeel-login-brand-v1\.js\?v=[^'\"]+/.test(bootstrap),'Login brand must be loaded by the real bootstrap');
assert(/pristeel-login-transition-v2\.js\?v=[^'\"]+/.test(bootstrap),'Login transition must be loaded by the real bootstrap with a cache key');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="auth-gate">
  <div id="legacy-wrap">
    <div id="legacy-name" style="color:#A65F2E">PRISTEEL</div>
    <div id="legacy-sub">Procurement Platform</div>
    <form id="auth-form"><input id="auth-email"><input id="auth-pass"><button type="submit">Hyr</button></form>
  </div>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
w.eval(brand);
assert.strictEqual(w.PSTLoginBrandV1.apply(),true,'Login branding must apply to the real auth structure');
assert(w.document.getElementById('legacy-name').classList.contains('pst-auth-legacy-brand'),'Classless legacy PRISTEEL header was not marked for hiding');
assert(w.document.getElementById('legacy-sub').classList.contains('pst-auth-legacy-brand'),'Classless legacy Procurement Platform subtitle was not marked for hiding');
assert.strictEqual(w.document.querySelectorAll('#auth-form .pst-auth-brand').length,1,'Approved blue in-card brand must be inserted exactly once');
assert(w.document.getElementById('auth-form'),'Existing auth form must remain intact');
assert(w.document.getElementById('auth-email')&&w.document.getElementById('auth-pass'),'Existing login inputs must remain intact');
w.PSTLoginBrandV1.apply();
assert.strictEqual(w.document.querySelectorAll('#auth-form .pst-auth-brand').length,1,'Repeated apply must not duplicate the approved brand');
dom.window.close();

console.log('Login branding smoke test passed.');
