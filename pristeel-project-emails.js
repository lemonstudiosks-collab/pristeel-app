/* PRISTEEL email modules bootstrap */
(function(){
'use strict';
var files=[
  'pristeel-auth-persistence.js?v=20260801-1',
  'pristeel-gmail-tab-handoff.js?v=20260803-1',
  'pristeel-single-instance.js?v=20260803-3',
  'pristeel-email-core.js?v=20260801-2',
  'pristeel-google-workspace-auth.js?v=20260802-2',
  'pristeel-project-routing-rules.js?v=20260802-2',
  'pristeel-gmail-project-search-expansion.js?v=20260802-2',
  'pristeel-gmail-auth-gate.js?v=20260803-1',
  'pristeel-email-outreach.js?v=20260801-1',
  'pristeel-email-project.js?v=20260801-1',
  'pristeel-email-daily.js?v=20260802-1',
  'pristeel-drive-import.js?v=20260802-4',
  'pristeel-drive-intelligence.js?v=20260801-1',
  'pristeel-drive-workspace.js?v=20260801-1',
  'pristeel-project-attachments.js?v=20260801-1',
  'pristeel-gmail-intake.js?v=20260801-1',
  'pristeel-gmail-intake-ux.js?v=20260802-1',
  'pristeel-gmail-intake-client.js?v=20260801-1',
  'pristeel-gmail-linked-guard.js?v=20260801-1',
  'pristeel-gmail-open-project.js?v=20260801-1',
  'pristeel-email-relations.js?v=20260801-1',
  'pristeel-project-contacts.js?v=20260801-1',
  'pristeel-email-multi-link-ui.js?v=20260801-1',
  'pristeel-project-gmail-collector.js?v=20260802-1',
  'pristeel-project-gmail-collector-ui-fix.js?v=20260802-2',
  'pristeel-project-gmail-safety.js?v=20260802-3',
  'pristeel-gmail-audit.js?v=20260801-1',
  'pristeel-project-discovery.js?v=20260801-1',
  'pristeel-project-discovery-create-fix.js?v=20260801-1',
  'pristeel-supplier-project-guard.js?v=20260802-2',
  'pristeel-project-schema-compat.js?v=20260801-2',
  'pristeel-historical-project-audit.js?v=20260801-1',
  'pristeel-groq-rate-limit.js?v=20260801-2',
  'pristeel-project-analysis.js?v=20260801-1',
  'pristeel-project-intelligence-ui.js?v=20260802-5',
  'pristeel-project-workspace.js?v=20260802-1',
  'pristeel-ui-v2.js?v=20260801-1',
  'pristeel-ui-session.js?v=20260801-1',
  'pristeel-ui-v2-polish.js?v=20260801-1',
  'pristeel-dashboard-focus.js?v=20260801-1',
  'pristeel-dashboard-action-controls.js?v=20260803-1',
  'pristeel-utilities.js?v=20260801-1',
  'pristeel-email-shortcuts.js?v=20260801-1',
  'pristeel-visual-refresh.js?v=20260801-2',
  'pristeel-project-board-layout.js?v=20260802-2'
];
function load(i){
  if(i>=files.length||window.__pstAbortBootstrap)return;
  var s=document.createElement('script');
  s.src=files[i];
  s.defer=true;
  s.onload=function(){if(!window.__pstAbortBootstrap)load(i+1)};
  s.onerror=function(){console.error('Nuk u ngarkua moduli:',files[i]);if(!window.__pstAbortBootstrap)load(i+1)};
  document.head.appendChild(s);
}
load(0);
})();
