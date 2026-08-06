/* PRISTEEL email modules bootstrap */
(function(){
'use strict';
var files=[
  'pristeel-gmail-tab-handoff.js?v=20260806-2',
  'pristeel-email-core.js?v=20260801-2',
  'pristeel-google-workspace-auth.js?v=20260806-3',
  'pristeel-project-routing-rules.js?v=20260802-2',
  'pristeel-gmail-project-search-expansion.js?v=20260802-2',
  'pristeel-email-outreach.js?v=20260801-1',
  'pristeel-email-project.js?v=20260801-1',
  'pristeel-email-daily.js?v=20260802-1',
  'pristeel-drive-import.js?v=20260802-4',
  'pristeel-drive-intelligence.js?v=20260801-1',
  'pristeel-drive-workspace.js?v=20260801-1',
  'pristeel-project-attachments.js?v=20260801-1',
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
  'pristeel-dashboard-action-controls-v2.js?v=20260803-1',
  'pristeel-utilities.js?v=20260801-1',
  'pristeel-email-shortcuts.js?v=20260801-1',
  'pristeel-visual-refresh.js?v=20260801-2',
  'pristeel-project-board-layout.js?v=20260802-2',
  'pristeel-project-loss.js?v=20260803-1',
  'pristeel-document-shortcuts.js?v=20260803-1',
  'pristeel-invoice-copy-fix.js?v=20260803-1',
  'pristeel-document-center-core.js?v=20260803-1',
  'pristeel-document-adjustments.js?v=20260803-2',
  'pristeel-dashboard-operations.js?v=20260803-1',
  'pristeel-document-adjustments-v3.js?v=20260803-1',
  'pristeel-dashboard-calm.js?v=20260803-1',
  'pristeel-workspace-architecture-v1.js?v=20260804-1',
  'pristeel-workspace-release-fix-v3.js?v=20260804-2',
  'pristeel-email-relation-safety-v2.js?v=20260804-1',
  'pristeel-gmail-intake-v2.js?v=20260806-1',
  'pristeel-gmail-intake-revision-fix-v1.js?v=20260806-2',
  'pristeel-contract-classification-v2.js?v=20260805-2',
  'pristeel-project-data-integrity-v1.js?v=20260805-1',
  'pristeel-project-file-unifier-v2.js?v=20260805-1',
  'pristeel-document-routing-integrity-v1.js?v=20260804-1',
  'pristeel-project-integrity-ui-v1.js?v=20260804-1',
  'pristeel-project-attachments-relations-v2.js?v=20260804-1',
  'pristeel-project-integrity-safety-v2.js?v=20260804-1',
  'pristeel-projects-modern-v1.js?v=20260804-1',
  'pristeel-modules-unified-v1.js?v=20260804-1',
  'pristeel-ui-corrections-v2.js?v=20260805-1',
  'pristeel-project-context-navigation-v1.js?v=20260805-1',
  'pristeel-project-linked-gmail-recovery-v2.js?v=20260805-1',
  'pristeel-project-bulk-gmail-recovery-v1.js?v=20260805-1',
  'pristeel-project-closure-direct-v1.js?v=20260805-1',
  'pristeel-project-flow-actions-v1.js?v=20260805-2',
  'pristeel-project-open-direct-v1.js?v=20260805-2',
  'pristeel-project-contacts-full-v1.js?v=20260805-1',
  'pristeel-dashboard-task-cards-v1.js?v=20260806-2'
];
var completed=false;
function ready(){
  if(completed)return;completed=true;
  window.__pstModulesReady=true;
  try{document.dispatchEvent(new CustomEvent('pst:modules-ready'));}catch(e){}
}
function load(i){
  if(i>=files.length||window.__pstAbortBootstrap){ready();return;}
  var s=document.createElement('script');s.src=files[i];s.defer=true;
  s.onload=function(){if(window.__pstAbortBootstrap)ready();else load(i+1);};
  s.onerror=function(){console.error('Nuk u ngarkua moduli:',files[i]);if(window.__pstAbortBootstrap)ready();else load(i+1);};
  document.head.appendChild(s);
}
load(0);
})();
