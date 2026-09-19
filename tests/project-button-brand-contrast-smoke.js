'use strict';
const fs=require('fs');
function must(ok,msg){if(!ok)throw new Error(msg);}
const wb=fs.readFileSync('pristeel-project-workbench-v2.js','utf8');
const mm=fs.readFileSync('pristeel-project-mindmap-v1.js','utf8');
must(wb.includes('.pwb3-now>button{min-height:48px;border:1px solid #4F97AF')&&wb.includes('background:#4F97AF;color:#fff'),'Vazhdo must use #4F97AF with white text');
must(wb.includes('.pwb3-nav-btn.on{background:#4F97AF;color:#fff;border-color:#4F97AF}'),'active Workbench button must use #4F97AF with white text');
must(wb.includes('.pst-blue-contrast-text{background:#4F97AF!important;border-color:#4F97AF!important;color:#fff!important}'),'filled blue project buttons must normalize to #4F97AF with white text');
must(mm.includes('.pmm-back{height:34px;border:1px solid #4F97AF')&&mm.includes('background:#4F97AF;color:#fff!important'),'Kthehu must use #4F97AF with white text');
must(mm.includes('.pmm-back *{color:#fff!important}'),'Kthehu nested arrow/text must remain white');
console.log('project button brand contrast smoke: ok');
