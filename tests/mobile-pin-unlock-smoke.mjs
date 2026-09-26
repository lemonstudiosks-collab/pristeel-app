import fs from 'node:fs';

function assert(cond,msg){if(!cond)throw new Error(msg);}
const html=fs.readFileSync('pristeel-procurement.html','utf8');
const js=fs.readFileSync('pristeel-mobile-pin-unlock-v1.js','utf8');
const runtime=JSON.parse(fs.readFileSync('runtime-manifest.json','utf8'));

assert((html.match(/pristeel-mobile-pin-unlock-v1\.js/g)||[]).length===1,'mobile PIN runtime must load exactly once');
assert(runtime.applicationDirectRuntime.includes('pristeel-mobile-pin-unlock-v1.js'),'mobile PIN runtime missing from manifest');
const shell=(runtime.areas||[]).find(x=>x.area==='application-shell');
assert(shell&&shell.finalOwners.includes('pristeel-mobile-pin-unlock-v1.js'),'mobile PIN must be registered as application-shell owner');

assert(!/supaFetch\s*\(/.test(js),'PIN unlock must not add Supabase calls');
assert(!/\bfetch\s*\(/.test(js),'PIN unlock must not add network fetches');
assert(!/setInterval\s*\(/.test(js),'PIN unlock must not poll');
assert(!/MutationObserver/.test(js),'PIN unlock must not add DOM ownership observer');
assert(!/serviceWorker\.register/.test(js),'PIN unlock must not alter service-worker behavior');

assert(js.includes("MAX_ATTEMPTS=5"),'PIN unlock must force full login after five failures');
assert(js.includes("PBKDF2_ITERATIONS=150000"),'PIN unlock must derive the local PIN hash with bounded PBKDF2 work');
assert(js.includes("name:'PBKDF2'"),'PBKDF2 derivation missing');
assert(js.includes("hash:'SHA-256'"),'PIN hash derivation must use SHA-256');
assert(js.includes("/^\\d{4}$/"),'PIN must be exactly four numeric digits');
assert(!/localStorage\.setItem\([^\n]*pin\b/i.test(js),'PIN must never be stored as plaintext');
assert(js.includes("pst_mobile_pin_v1"),'device-local PIN config key missing');
assert(js.includes("Hyr me email dhe fjalëkalim"),'full-login fallback missing');
assert(js.includes("clearSessionForFullLogin"),'full-login fallback must clear remembered auth session');
assert(js.includes("guardedLogout"),'explicit logout must clear device PIN state');
assert(js.includes("Math.min(iw,sw)<=900"),'PIN quick unlock must remain phone/tablet only');
assert(js.includes("z-index:2147483647"),'PIN gate must cover global mobile navigation while locked');
assert(js.includes("pst_mobile_pin_session_unlocked_v1"),'PIN unlock must persist for the current app session');
assert(js.includes("sessionUnlocked(s)"),'repeated startApp calls must honor the current-session unlock');
assert(js.includes("already=g.classList.contains('on')&&mode===which"),'repeated startApp calls must not reset an active PIN gate');
assert(js.includes("pst:mobile-pin-unlocked"),'PIN success must signal dependent startup owners');
console.log('mobile-pin-unlock-smoke: ok');
