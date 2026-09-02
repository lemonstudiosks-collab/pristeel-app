const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-auth-persistence.js','utf8');
const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');

assert(!/setInterval\s*\(|BroadcastChannel|MutationObserver/.test(source),'Remembered login must stay event-driven and bounded');
assert(!/auth-pass[^\n;]*\.value|pass(?:word)?\s*[:=][^\n]*(localStorage|sessionStorage)/i.test(source),'Remembered login must never read or persist the password value');
assert(source.includes("var SESSION_KEY='pristeel_session'"),'Remembered login must reuse the canonical application session');
assert(source.includes("var BACKUP_KEY='pst_auth_remembered_session_v3'"),'Remembered login backup key is missing');
assert(source.includes("var REFRESH_LOCK_KEY='pst_auth_refresh_lock_v1'"),'Cross-caller refresh lock is missing');
assert(source.includes('refreshInFlight'),'Single-flight refresh guard is missing');
assert(source.includes('s.expires_at=0'),'Expired restored sessions must force refresh-token validation');
assert(source.includes("localStorage.removeItem(BACKUP_KEY)"),'Explicit clearing of the remembered session is missing');
assert(source.includes("autocomplete','current-password'"),'Login password field should use browser credential autocomplete');
assert(source.includes("autocomplete','username'"),'Login email field should use browser credential autocomplete');
const authPos=bootstrap.indexOf('pristeel-auth-persistence.js?v=');
const brandPos=bootstrap.indexOf('pristeel-login-brand-v1.js?v=');
assert(authPos>=0&&brandPos>=0&&authPos<brandPos,'Remembered session recovery must load before login presentation modules');

async function main(){
  const dom=new JSDOM('<!doctype html><html><body><div id="auth-gate" style="display:flex"><form id="auth-form"><input id="auth-email"><input id="auth-pass" type="password"><button type="submit">Hyr</button></form></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const remembered={access_token:'old-access',refresh_token:'refresh-1',expires_at:Date.now()-1000,email:'user@example.com'};
  w.localStorage.setItem('pst_auth_remembered_session_v3',JSON.stringify({at:Date.now(),session:remembered}));
  w.eval(source);
  const api=w.PSTAuthPersistence;
  assert(api,'Remembered login API did not initialize');
  assert.strictEqual(api.restoreOnce(),true,'Remembered session was not restored');
  const restored=JSON.parse(w.localStorage.getItem('pristeel_session'));
  assert.strictEqual(restored.refresh_token,'refresh-1','Refresh token changed during pre-validation restore');
  assert.strictEqual(restored.expires_at,0,'Expired restored session was not forced through token refresh validation');
  api.enhanceForm();
  assert.strictEqual(w.document.getElementById('auth-email').getAttribute('autocomplete'),'username');
  assert.strictEqual(w.document.getElementById('auth-pass').getAttribute('autocomplete'),'current-password');
  api.clear();
  assert.strictEqual(w.localStorage.getItem('pst_auth_remembered_session_v3'),null,'Remembered session was not cleared');
  dom.window.close();

  const dom2=new JSDOM('<!doctype html><html><body><div id="auth-gate" style="display:none"></div></body></html>',{runScripts:'outside-only',url:'http://localhost:3000/'});
  const w2=dom2.window;
  const expired={access_token:'expired-access',refresh_token:'refresh-2',expires_at:Date.now()-1000,email:'user@example.com'};
  w2.localStorage.setItem('pristeel_session',JSON.stringify(expired));
  let refreshCalls=0;
  w2.authRefreshIfNeeded=function(){
    refreshCalls++;
    return new Promise(resolve=>w2.setTimeout(()=>{
      const fresh={access_token:'fresh-access',refresh_token:'refresh-3',expires_at:Date.now()+3600000,email:'user@example.com'};
      w2.localStorage.setItem('pristeel_session',JSON.stringify(fresh));
      resolve(fresh);
    },25));
  };
  w2.eval(source);
  const api2=w2.PSTAuthPersistence;
  assert(api2.installRefreshSingleFlight(),'Refresh guard did not install');
  const calls=Array.from({length:25},()=>w2.authRefreshIfNeeded());
  const results=await Promise.all(calls);
  assert.strictEqual(refreshCalls,1,'Concurrent expired-session callers must share one refresh request');
  assert(results.every(x=>x&&x.access_token==='fresh-access'),'All concurrent callers must receive the refreshed session');
  assert.strictEqual(w2.authRefreshIfNeeded.__pstSingleFlightV1,true,'Guard marker missing');
  dom2.window.close();

  console.log('Remembered login smoke test passed.');
}
main().catch(err=>{console.error(err);process.exit(1);});
