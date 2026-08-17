const fs=require('fs');
const src=fs.readFileSync('pristeel-login-transition-v2.js','utf8');
function must(re,msg){if(!re.test(src)){throw new Error(msg);}}
function mustNot(re,msg){if(re.test(src)){throw new Error(msg);}}
must(/settleExistingSession\(\)/,'missing authenticated reload settlement');
must(/authGetSession/,'reload settlement must use real session helper');
must(/pst:modules-ready/,'existing session must settle after ordered runtime');
must(/PSTHomeRuntimeOwnerGuardV2\|\|window\.PSTHomeRuntimeOwnerGuardV1/,'handoff must prefer canonical Home owner');
must(/clearLegacyBlocker\(\)/,'legacy blocking transition must be actively removed');
must(/pstWorkspaceGo\('home'\)/,'compatibility Home route is required');
mustNot(/pst-login-switching[^\n]*add/,'transition must never add a blocking switching state');
mustNot(/position:fixed;inset:0/,'transition must not create a full-screen overlay');
mustNot(/MutationObserver/,'reload handoff must not add MutationObserver');
console.log('home reload transition smoke: ok');
