/* PRISTEEL Project Mindmap compatibility retirement v2
 * The central Projects register is owned by PSTProjectsModernV2.
 * Project Detail is owned by PSTProjectWorkbenchV3.
 * This compatibility module removes stale mindmap surfaces and never creates a second UI owner.
 */
(function(){
'use strict';
if(window.__pstProjectMindmapRetiredV2)return;
window.__pstProjectMindmapRetiredV2=true;
window.__pstProjectMindmapV1=true;
function retire(){
  ['pst-projects-mindmap-v1','pst-project-map-v1'].forEach(function(id){var el=document.getElementById(id);if(el)el.remove();});
  var p=document.getElementById('page-workspace-projects');if(p){p.classList.remove('pmm-enabled');p.removeAttribute('data-pmm-view');}
}
function init(){retire();document.addEventListener('pst:project-workspace-rendered',retire,false);document.addEventListener('pst:modules-ready',retire,false);}
window.PSTProjectMindmapV1={apply:retire,decorateProjects:retire,decorateProject:retire,state:{retired:true},_test:{retired:true}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();