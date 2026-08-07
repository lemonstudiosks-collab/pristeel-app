/* PRISTEEL Home visual cleanup v1
 * Visual-only polish for priority cards.
 * No data reads/writes and no global observers/polling.
 */
(function(){
'use strict';
if(window.__pstHomeVisualCleanupV1)return;
window.__pstHomeVisualCleanupV1=true;

function css(){
  if(document.getElementById('pst-home-visual-cleanup-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-home-visual-cleanup-v1-css';
  s.textContent=`
#page-workspace-home .pst-ws-action.pst-dash-task-card{
  border:1px solid #E2E9EC!important;
  border-left:1px solid #E2E9EC!important;
  background:#fff!important;
  box-shadow:0 1px 2px rgba(31,55,66,.025)!important;
}
#page-workspace-home .pst-ws-action.pst-dash-task-card:hover{
  border-color:#CADCE4!important;
  border-left-color:#CADCE4!important;
  background:#FCFEFF!important;
  box-shadow:0 7px 22px rgba(45,82,97,.06)!important;
}
#page-workspace-home .pst-dash-task-overdue{
  border-color:#E7E3E2!important;
}
#page-workspace-home .pst-dash-task-overdue .pst-ws-action-tag{
  background:#FBF0EE!important;
  color:#A64B42!important;
  border:1px solid #F1DAD6!important;
}
#page-workspace-home .pst-dash-task-overdue .pst-dash-task-timing{
  color:#A64B42!important;
  font-weight:680!important;
}
#page-workspace-home .pst-dash-task-today .pst-ws-action-tag{
  background:#EEF6F8!important;
  color:#3F7F98!important;
  border:1px solid #D4E6EC!important;
}
`;
  document.head.appendChild(s);
}
css();
window.PSTHomeVisualCleanupV1={apply:css};
})();
