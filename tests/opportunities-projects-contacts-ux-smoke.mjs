import fs from 'node:fs';
import assert from 'node:assert/strict';

const pcw=fs.readFileSync('pristeel-project-centric-workflow-v1.js','utf8');
const dossier=fs.readFileSync('pristeel-tender-dossier-analysis-v1.js','utf8');
const projects=fs.readFileSync('pristeel-project-classification-v1.js','utf8');
const contacts=fs.readFileSync('pristeel-contact-master-v1.js','utf8');

new Function(pcw);
new Function(dossier);
new Function(projects);
new Function(contacts);

assert.match(pcw,/data-pcw-tender/,'whole tender card must be the primary interaction');
assert.match(pcw,/Merr dhe analizo dosjen/,'local opportunity must expose the dossier-first action');
assert.match(pcw,/data-pcw-ti="go"[^>]*disabled/,'project creation must start disabled before dossier analysis');
assert.match(pcw,/if\(tenderMode\(r\)==='local'&&!dossierReady\(id\)\)throw new Error/,'project creation must enforce the dossier gate in code, not only in CSS');
assert.match(pcw,/PSTTenderDossierAnalysisV1/,'opportunity popup must reuse the canonical dossier engine');
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

assert.match(contacts,/DOSJA E KONTAKTIT/,'contact popup title must be Albanian');
assert.match(contacts,/pppp_contact_master_v1\?contact_id=eq\./,'contact popup must refresh the selected person from the canonical live view');
assert.match(contacts,/project_email_count/,'contact popup must carry real project-email activity');
assert.doesNotMatch(contacts,/CONTACT BRIEF|RELATIONSHIPS|Klient \/ Lead/,'old English contact labels must not remain visible');

console.log('Opportunities + Projects + Contacts UX contract: OK');
