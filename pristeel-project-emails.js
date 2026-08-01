/* PRISTEEL email modules bootstrap */
(function(){
'use strict';
var files=[
  'pristeel-single-instance.js?v=20260731-1',
  'pristeel-email-core.js?v=20260801-2',
  'pristeel-gmail-auth-gate.js?v=20260801-1',
  'pristeel-email-outreach.js?v=20260801-1',
  'pristeel-email-project.js?v=20260801-1',
  'pristeel-email-daily.js?v=20260801-1',
  'pristeel-drive-import.js?v=20260801-1',
  'pristeel-project-attachments.js?v=20260801-1',
  'pristeel-gmail-intake.js?v=20260801-1',
  'pristeel-gmail-intake-client.js?v=20260801-1',
  'pristeel-gmail-linked-guard.js?v=20260801-1',
  'pristeel-gmail-open-project.js?v=20260801-1',
  'pristeel-email-relations.js?v=20260801-1',
  'pristeel-project-contacts.js?v=20260801-1',
  'pristeel-email-multi-link-ui.js?v=20260801-1',
  'pristeel-gmail-audit.js?v=20260801-1',
  'pristeel-project-analysis.js?v=20260801-1',
  'pristeel-project-intelligence-ui.js?v=20260801-2',
  'pristeel-ui-v2.js?v=20260801-1',
  'pristeel-ui-session.js?v=20260801-1',
  'pristeel-ui-v2-polish.js?v=20260801-1',
  'pristeel-dashboard-focus.js?v=20260801-1',
  'pristeel-utilities.js?v=20260801-1',
  'pristeel-email-shortcuts.js?v=20260801-1'
];
function load(i){
  if(i>=files.length||window.__pstAbortBootstrap)return;
  var s=document.createElement('script');
  s.src=files[i];
  s.defer=true;
  s.onload=function(){
    if(!window.__pstAbortBootstrap)load(i+1);
  };
  s.onerror=function(){
    console.error('Nuk u ngarkua moduli:',files[i]);
    if(!window.__pstAbortBootstrap)load(i+1);
  };
  document.head.appendChild(s);
}
load(0);
})();
