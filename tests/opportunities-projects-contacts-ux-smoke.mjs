import fs from 'node:fs';
import assert from 'node:assert/strict';

const pcw=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
const dossier=fs.readFileSync('pristeel-tender-dossier-analysis-v1.js','utf8');
const projects=fs.readFileSync('pristeel-project-classification-v1.js','utf8');
const contacts=fs.readFileSync('pristeel-contact-master-v1.js','utf8');
const kek=fs.readFileSync('pristeel-kek-tender-watch-v1.js','utf8');
const biz=fs.readFileSync('pristeel-tender-business-flow-v1.js','utf8');
const nav=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');

new Function(pcw);
new Function(dossier);
new Function(projects);
new Function(contacts);
new Function(kek);
new Function(biz);
new Function(nav);

assert.match(pcw,/data-pcw-tender/,'whole tender card must be the primary interaction');
assert.match(pcw,/Shkarko dosjen/,'local opportunity must expose official dossier download');
assert.match(pcw,/Analizo kushtet/,'local opportunity must expose dossier technical/commercial analysis');
assert.match(pcw,/data-pcw-ti="go"[^>]*disabled/,'project creation must start disabled before dossier analysis');
assert.match(pcw,/if\(tenderMode\(r\)==='local'&&!dossierReady\(id\)\)throw new Error/,'project creation must enforce the dossier gate in code, not only in CSS');
assert.match(pcw,/PSTTenderDossierAnalysisV1/,'opportunity popup must reuse the canonical dossier engine');
assert.match(pcw,/function ensureTenderModal\(r\)/,'whole-card action console must create its own modal');
assert.doesNotMatch(pcw,/await window\.pstTenderIntelligence\(id\)/,'whole-card click must not depend on legacy Tender Intelligence state to create the modal');
assert.match(pcw,/data-pcw-close-modal/,'action console must include its own close control');
assert.doesNotMatch(pcw,/window\.open\(['"]https:\/\/www\.app\.gov\.al/,'APP must not open the insecure generic website from the active workflow');
assert.match(pcw,/data-pcw-ti="review"[^>]*>Lëre për më vonë/,'popup must offer a non-destructive later decision');
assert.match(pcw,/data-pcw-ti="nogo"[^>]*>Hiqe nga lista/,'popup must offer explicit removal');
assert.match(pcw,/data-pcw-opportunities-owner/,'modern opportunity cards must own the visible tender surface');

assert.match(dossier,/data-analysis-ready/,'dossier engine must expose a verified analysis-ready state');
assert.match(dossier,/pst:tender-dossier-ready/,'dossier engine must emit a completion event');
assert.doesNotMatch(dossier,/scheduleFromTarget\([^)]*\)[\s\S]{0,180}analyze\(id,false\)/,'opening a tender card must not silently start dossier analysis');
assert.match(dossier,/Fusha e punës/,'dossier presentation must use Albanian labels');

assert.match(projects,/Kërkon veprim/,'project action state must be Albanian');
assert.match(projects,/Në pritje/,'project waiting state must be Albanian');
assert.match(projects,/Në realizim/,'project execution state must be Albanian');
assert.match(projects,/Të mbyllura/,'project closed filter must be Albanian');
assert.match(projects,/#page-workspace-projects #pst-pm-sort\{display:none!important\}/,'old full-width project sort must be removed from the visible work surface');

assert.match(contacts,/MARRËDHËNIA ME PRISTEEL/,'contact drawer must use a business-first Albanian relationship heading');
assert.match(contacts,/pppp_contact_master_v1\?contact_id=eq\./,'contact popup must refresh the selected person from the canonical live view');
assert.match(contacts,/project_email_count/,'contact popup must carry real project-email activity');
assert.doesNotMatch(contacts,/CONTACT BRIEF|RELATIONSHIPS|Klient \/ Lead/,'old English contact labels must not remain visible');
assert.match(contacts,/MARRËDHËNIA ME PRISTEEL/,'contact drawer must lead with the business relationship, not source metadata');
assert.match(contacts,/Hap projektin e fundit/,'contact drawer must expose the most useful project action');
assert.match(contacts,/pcm-profile/,'contact drawer must have a human profile header');
assert.match(contacts,/Burimet e të dhënave/,'CRM provenance must remain available but secondary');
assert.match(pcw,/Komunikimi i fundit/,'contact drawer must show a readable communication timeline');
assert.match(pcw,/gmailLink\(m\.gmail_url\)/,'recent contact emails must preserve a direct Gmail path when available');
assert.match(pcw,/projectNames\[S\(m\.project_id\)\]/,'contact activity must show project context rather than isolated email metadata');

console.log('Opportunities + Projects + Contacts UX contract: OK');

assert.match(pcw,/__pstProjectCentricWorkflowV3/,'whole-card Opportunities must expose a current runtime generation');
assert.doesNotMatch(pcw,/classList\.contains\('active'\).*page-kek-tenders/,'visible Opportunities must not depend on an .active class');
assert.match(pcw,/getComputedStyle/,'visible-page detection must follow actual browser visibility');
assert.match(pcw,/legacy\.hidden=true;legacy\.style\.display='none'/,'old opportunity details/table must be retired directly at runtime');
assert.match(pcw,/querySelectorAll\('\.pst-kek-filter,\.pst-kek-card,#pst-tender-fit-summary'\)/,'legacy long filters and table must be hidden by the final owner');
assert.doesNotMatch(pcw,/#page-kek-tenders\.active #pst-opportunities-focus/,'modern opportunity styling must not depend on the obsolete active class');
assert.match(pcw,/font-size:17px/,'opportunity titles must be comfortably readable');
assert.match(pcw,/font-size:13px/,'opportunity descriptions must be comfortably readable');

assert.match(dossier,/__pstTenderDossierAnalysisV3/,'dossier analysis must expose current runtime generation');
assert.match(dossier,/Kushtet teknike/,'technical conditions must be visible in the primary dossier view');
assert.match(dossier,/Kushtet komerciale/,'commercial conditions must be visible in the primary dossier view');
assert.match(dossier,/pst-tda-core-grid/,'technical and commercial conditions must be presented as first-class blocks');
assert.match(dossier,/font-size:12\.5px/,'dossier requirement text must be readable');
assert.doesNotMatch(dossier,/\.pst-tda-list li\{font-size:9\.5px/,'dossier must not keep micro-font requirement lists');

assert.match(pcw,/PRODHUES \/ KONKURRENT/,'TED winner role must identify producer competitors');
assert.match(pcw,/GC \/ EPC/,'TED winner role must identify GC/EPC clients');
assert.match(pcw,/Kontaktet e fituesit/,'TED action console must expose researched winner contacts');
assert.match(pcw,/Shkarko dosjen/,'KRPP/APP action console must expose dossier download');
assert.match(pcw,/Analizo kushtet/,'KRPP/APP action console must expose technical/commercial analysis');

assert.match(kek,/handoffFinalOpportunities/,'legacy tender opener must hand off to the final whole-card owner');
assert.match(kek,/if\(handoffFinalOpportunities\(true\)\)return true/,'legacy tender opener must not rebuild the old shell once final owner exists');
assert.match(biz,/if\(handoffFinalOpportunities\(false\)\)return/,'Tender Business Flow render/load must not reclaim visible Opportunities from the final owner');
assert.match(nav,/if\(handoffOpportunities\(true\)\)/,'primary navigation must prefer the final Opportunities owner before legacy monitor routes');
assert.match(nav,/PSTProjectCentricWorkflowV1/,'primary navigation must route directly to the whole-card Opportunities runtime');
assert.doesNotMatch(nav,/PSTRedesignFinalizerV1/,'primary navigation must not re-enter the redesign finalizer while handing off Opportunities');
