/* PRISTEEL dashboard calm compatibility stub
 * Retired during PPPP stabilization on 2026-08-17.
 * The legacy #page-home renderer repeatedly wrapped goHome and could replace
 * the modern Workspace Home after refresh. It is now intentionally inert.
 * Home is owned by pristeel-home-canonical-v1.js inside #page-workspace-home.
 */
(function(){
'use strict';
if(window.__pstDashboardCalmLoaded)return;
window.__pstDashboardCalmLoaded=true;
window.PSTDashboardCalm={retired:true,render:function(){return false;}};
})();
