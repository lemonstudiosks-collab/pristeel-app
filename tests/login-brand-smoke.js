const fs=require('fs');
const assert=require('assert');
const brand=fs.readFileSync('pristeel-login-brand-v1.js','utf8');
const transition=fs.readFileSync('pristeel-login-transition-v2.js','utf8');
const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');

assert(brand.includes('#auth-gate.pst-auth-branded'),'Login brand must style the existing auth gate');
assert(brand.includes('#auth-form'),'Login brand must preserve and target the existing auth form');
assert(brand.includes('.auth-logo{display:none!important}'),'Legacy bronze PRISTEEL wordmark must be hidden');
assert(brand.includes('.auth-title{font-size:22px!important'),'Login title is still too small');
assert(brand.includes('input{min-height:44px!important;font-size:14px!important'),'Login inputs are still below the approved readable size');
assert(brand.includes('button[type="submit"]{min-height:44px!important;font-size:14px!important'),'Login action is still below the approved readable size');
assert(!/addEventListener\(['\"]submit/.test(brand),'Brand layer must not intercept authentication submit');
assert(!/POST|PATCH|DELETE/.test(brand),'Brand layer must not write data');
assert(transition.includes("form.addEventListener('submit',begin,true)"),'Bounded login transition must remain attached to the existing form');
assert(/pristeel-login-brand-v1\.js\?v=[^'\"]+/.test(bootstrap),'Login brand must be loaded by the real bootstrap');
assert(/pristeel-login-transition-v2\.js\?v=[^'\"]+/.test(bootstrap),'Login transition must be loaded by the real bootstrap with a cache key');
console.log('Login branding smoke test passed.');
