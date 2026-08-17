const fs=require('fs');
const src=fs.readFileSync('pristeel-login-transition-v2.js','utf8');
function must(re,msg){if(!re.test(src)){throw new Error(msg);}}
must(/detectExistingSession\(\)/,'missing authenticated reload detector');
must(/authGetSession/,'reload detector must use real session helper');
must(/__pstModulesReady/,'transition must wait for ordered runtime');
must(/setTimeout\(function\(\)\{[\s\S]*renderBaseHome\(\)[\s\S]*\},3150\)/,'final base Home render must happen after bounded decorators settle');
must(/Date\.now\(\)-started>2800/,'base Home wait must be bounded');
must(/age>15000/,'transition must have a hard failsafe');
must(/pstWorkspaceGo\('home'\)/,'final paint must come from Workspace Architecture');
if(/MutationObserver/.test(src)&&!/No MutationObserver/.test(src.split('\n')[1]||''))throw new Error('reload transition must not add MutationObserver');
console.log('home reload transition smoke: ok');
