import assert from 'node:assert/strict';
import fs from 'node:fs';

const frontend=fs.readFileSync('pristeel-tender-dossier-analysis-v1.js','utf8');

assert(frontend.includes("version:'6'")&&frontend.includes('__pstTenderDossierAnalysisV6'),'Tender dossier UI must expose v6 runtime');
assert(frontend.includes('Kushtet administrative')&&frontend.includes('Kriteret e kualifikimit'),'UI must expose administrative and qualification sections');
assert(frontend.includes('Kushtet financiare')&&frontend.includes('Kushtet e pagesës'),'UI must expose financial/payment sections');
assert(frontend.includes('Garancia e ofertës')&&frontend.includes('Garancia e ekzekutimit')&&frontend.includes('Vlefshmëria e ofertës'),'UI must expose guarantees and offer validity');
assert(frontend.includes('Dokumentet që duhen dorëzuar')&&frontend.includes('Çështjet që kërkojnë sqarim'),'UI must expose submission checklist and clarification questions');
assert(frontend.includes('Referencat në dokumente')&&frontend.includes('document_name')&&frontend.includes('locator_type'),'UI must render document/section locators for evidence');
assert(frontend.includes('MBULIMI I DOSJES')&&frontend.includes('documents_total')&&frontend.includes('documents_unreadable'),'UI must render dossier coverage');
assert(frontend.includes("file_mode!=='authenticated_protected_archive'")&&frontend.includes('canonicalOut'),'UI must prefer an already-complete canonical manual archive over a weaker public refresh');
assert(frontend.includes("'pppp-tender-protected-archive-analysis'")&&frontend.includes('manualArchiveComplete'),'Retries on a complete manual archive must use the canonical protected analyzer, not public metadata analysis');
assert(frontend.includes("'pppp-tender-dossier-analysis'")&&frontend.includes("mode:'bundle'"),'Public dossier endpoint must remain available for source fetch and ZIP download');
assert(frontend.includes("if(complete&&ready)")&&frontend.includes("data-analysis-ready',ready?'1':'0'"),'Project creation gate must stay closed until analysis is ready');
assert(!/MutationObserver|setInterval\s*\(/.test(frontend),'P2 UI must remain bounded and polling-free');

console.log('Tender dossier P2 structured/cited UI smoke passed.');