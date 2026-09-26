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

assert(js.includes("MAX_ATTEMPTS=5"),'PIN unlock must retain a bounded failed-attempt threshold');
assert(js.includes("LOCK_MS=60*1000"),'PIN unlock must use a temporary lockout instead of falling back to password login');
assert(js.includes("PBKDF2_ITERATIONS=150000"),'PIN unlock must derive the local PIN hash with bounded PBKDF2 work');
assert(js.includes("name:'PBKDF2'"),'PBKDF2 derivation missing');
assert(js.includes("hash:'SHA-256'"),'PIN hash derivation must use SHA-256');
assert(js.includes("/^\\d{4}$/"),'PIN must be exactly four numeric digits');
assert(!/localStorage\.setItem\([^\n]*pin\b/i.test(js),'PIN must never be stored as plaintext');
assert(js.includes("pst_mobile_pin_v1"),'device-local PIN config key missing');
assert(js.includes("pst_pin_portable_v1"),'encrypted portable PIN bootstrap cookie missing');
assert(js.includes("name:'AES-GCM'"),'portable PIN bootstrap must use authenticated AES-GCM encryption');
assert(js.includes("SameSite=Strict"),'portable PIN bootstrap cookie must be SameSite=Strict');
assert(js.includes("Secure"),'portable PIN bootstrap cookie must require HTTPS');
assert(js.includes("Path=/pristeel-app/"),'portable PIN bootstrap cookie must be scoped to the PPPP app path');
assert(js.includes("PORTABLE_MAX_AGE=24*60*60"),'portable PIN bootstrap cookie must be short lived');
assert(js.includes("display-mode: standalone"),'PIN runtime must distinguish installed Home Screen app from Safari');
assert(js.includes("portableOpen"),'installed iOS web app must be able to import the encrypted PIN bootstrap');
assert(js.includes("seedPortableFromCurrent"),'Safari must seed the encrypted PIN bootstrap before installation');
assert(js.includes("imported_from:'ios_cookie'"),'portable PIN import marker missing');
assert(js.includes("JSON.stringify({at:Date.now(),session:s})"),'portable import must use the canonical remembered-session shape');
assert(!js.includes("Hyr me email dhe fjalëkalim"),'normal mobile PIN gate must not expose email/password fallback after PIN activation');
assert(js.includes("rememberedSession"),'PIN-only re-entry must be able to recover the remembered device session');
assert(js.includes("resumeWithPin"),'PIN success must restore/refresh the remembered device session before starting PPPP');
assert(js.includes("coverWithPin"),'configured or portable mobile devices must cover the legacy login gate with the PIN gate');
assert(js.includes("portableAvailable()"),'portable iOS PIN bootstrap must cover the legacy login gate before email/password appears');
assert(js.includes("stripLegacyAuthForTrustedDevice"),'trusted mobile devices must remove the legacy login form from the visible page');
assert(js.includes("form.parentNode.removeChild(form)"),'trusted mobile devices must remove the legacy auth form node');
assert(js.includes("err.parentNode.removeChild(err)"),'trusted mobile devices must remove the legacy auth error node');
assert(!js.includes("Emaili dhe fjalëkalimi nuk kërkohen"),'PIN page must not mention removed email/password controls');
assert(js.includes("setLock()"),'five incorrect PIN attempts must trigger a temporary PIN lockout');
assert(js.includes("guardedLogout"),'explicit logout must clear device PIN state');
assert(js.includes("Math.min(iw,sw)<=900"),'PIN quick unlock must remain phone/tablet only');
assert(js.includes("z-index:2147483647"),'PIN gate must cover global mobile navigation while locked');
assert(js.includes("pst_mobile_pin_session_unlocked_v1"),'PIN unlock must persist for the current app session');
assert(js.includes("sessionUnlocked(s)"),'repeated startApp calls must honor the current-session unlock');
assert(js.includes("already=g.classList.contains('on')&&mode===which"),'repeated startApp calls must not reset an active PIN gate');
assert(js.includes("pst:mobile-pin-unlocked"),'PIN success must signal dependent startup owners');
console.log('mobile-pin-unlock-smoke: ok');
