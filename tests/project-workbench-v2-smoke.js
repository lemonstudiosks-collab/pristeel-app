'use strict';
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','pristeel-project-workbench-v2.js'),'utf8');
new Function(src);
function must(v,msg){if(!v)throw new Error(msg);}
must(src.includes('MutationObserver'),'workbench must wait persistently for late project data');
must(src.includes("'pst:project-ready'"),'workbench must react to canonical project readiness');
must(src.includes('data-pwf-stage=\\"comparison\\"'),'comparison must route to canonical workflow');
must(src.includes('data-pwf-stage=\\"pricing\\"'),'pricing must route to canonical workflow');
must(src.includes('data-pwf-stage=\\"client_offer\\"'),'client offer must route to canonical workflow');
must(src.includes('data-pwf-area=\\"execution\\"'),'won projects must route to canonical execution');
must(src.includes('data-pwf-area=\\"communication\\"'),'customer activity must route to canonical communication');
must(src.includes('data-pwf-area=\\"files\\"'),'files must route to canonical project files');
must(src.includes('Shqyrto aktivitetin e ri pas ofertës'),'post-offer activity must override stale supplier-collection guidance');
must(src.includes('Çmimi final dhe dërgimi mbeten human-gated'),'final offer pricing/send must stay visibly gated');
must(!/supaFetch\s*\(/.test(src),'presentation workbench must not access Supabase directly');
must(!/\b(PATCH|POST|DELETE)\b/.test(src),'presentation workbench must not perform REST writes');
console.log('project-workbench-v2 smoke: ok');
