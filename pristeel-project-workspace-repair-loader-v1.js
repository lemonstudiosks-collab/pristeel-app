/* Loads the project workspace repair as soon as this file is evaluated. */
(function(){
'use strict';
if(window.__pstProjectWorkspaceRepairLoaderV1)return;
window.__pstProjectWorkspaceRepairLoaderV1=true;
if(window.__pstProjectWorkspaceRepairV1)return;
var s=document.createElement('script');
s.src='pristeel-project-workspace-repair-v1.js?v=20260830-workspace1';
s.defer=true;s.setAttribute('data-pst-project-workspace-repair-critical','1');
document.head.appendChild(s);
})();