/* PRISTEEL production18 bootstrap
 * Fresh versioned loading for every production module.
 */
(function(){
'use strict';
if(window.__pstProduction18BootstrapLoaded)return;
window.__pstProduction18BootstrapLoaded=true;
var V='20260804-production18',errors=[];
var files=[
 'pristeel-login-theme-v2.js','pristeel-gmail-tab-handoff.js','pristeel-email-core.js','pristeel-google-workspace-auth.js','pristeel-project-routing-rules.js','pristeel-gmail-project-search-expansion.js','pristeel-gmail-auth-gate.js','pristeel-email-outreach.js','pristeel-email-project.js','pristeel-email-daily.js','pristeel-drive-import.js','pristeel-drive-intelligence.js','pristeel-drive-workspace.js','pristeel-project-attachments.js','pristeel-gmail-intake.js','pristeel-gmail-intake-ux.js','pristeel-gmail-intake-client.js','pristeel-gmail-linked-guard.js','pristeel-gmail-open-project.js','pristeel-email-relations.js','pristeel-project-contacts.js','pristeel-email-multi-link-ui.js','pristeel-project-gmail-collector.js','pristeel-project-gmail-collector-ui-fix.js','pristeel-project-gmail-safety.js','pristeel-gmail-audit.js','pristeel-project-discovery.js','pristeel-project-discovery-create-fix.js','pristeel-supplier-project-guard.js','pristeel-project-schema-compat.js','pristeel-historical-project-audit.js','pristeel-groq-rate-limit.js','pristeel-project-analysis.js','pristeel-project-intelligence-ui.js','pristeel-ui-v2.js','pristeel-ui-session.js','pristeel-ui-v2-polish.js','pristeel-dashboard-action-controls-v2.js','pristeel-utilities.js','pristeel-email-shortcuts.js','pristeel-visual-refresh.js','pristeel-project-board-layout.js','pristeel-project-loss.js','pristeel-document-shortcuts.js','pristeel-invoice-copy-fix.js','pristeel-document-center-core.js','pristeel-document-adjustments-v3.js','pristeel-document-adjustments-v4.js','pristeel-document-adjustments-v4-ui-fix.js','pristeel-document-adjustments-v5-language-v2.js','pristeel-workspace-architecture-v1.js','pristeel-workspace-release-fix-v2.js','pristeel-workspace-runtime-guard.js','pristeel-project-document-reconciliation-lite.js','pristeel-project-status-actions.js','pristeel-projects-modern-list.js','pristeel-project-family-workspace.js','pristeel-system-health.js','pristeel-project-email-documents-v2.js'
];
function done(){window.__pstProduction18Errors=errors;try{window.dispatchEvent(new CustomEvent('pst:workspace-ready',{detail:{version:V,errors:errors}}));}catch(e){}if(errors.length)console.error('PRISTEEL production18 module errors:',errors);}
function load(i){
 if(i>=files.length){done();return;}
 var s=document.createElement('script');s.src=files[i]+'?v='+V;s.defer=false;s.setAttribute('data-pst-production18',String(i));
 s.onload=function(){load(i+1);};
 s.onerror=function(){errors.push(files[i]);console.error('Nuk u ngarkua moduli:',files[i]);load(i+1);};
 document.head.appendChild(s);
}
load(0);
})();