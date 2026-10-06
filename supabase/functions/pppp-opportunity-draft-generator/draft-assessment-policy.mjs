// Manual review uses source-backed identity, then the independent recipient gate.
// Missing websites/roles do not erase TED-attributed emails. Eligibility and send gates stay separate.
export function canReviewTedDraftAssessment(assessment={},action={},tender={},explicitUser=false){
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
  const company=assessment.company||assessment.company_summary||{};
  const title=String(assessment.tender_summary?.title||'').trim();
  return explicitUser===true
    && assessment.workflow_track==='ted_award_outreach'
    && ['ready_for_review','contact_research'].includes(assessment.decision_state)
    && /^ted_/.test(norm(action.route))
    && !!title && title===String(tender.title||'').trim()
    && !!norm(company.legal_name)
    && norm(company.legal_name)===norm(tender.winner?.name)
    && norm(company.legal_name)===norm(action.target_company)
    && (assessment.tender_facts||[]).some(f=>f?.type==='scope'&&f.status==='confirmed'&&/^https:\/\//.test(String(f.source_url||''))&&!!String(f.value||'').trim())
    && (assessment.tender_facts||[]).some(f=>f?.type==='project'&&f.status==='confirmed'&&f.value===title&&/^https:\/\//.test(String(f.source_url||'')));
}
export const canReviewUnknownRoleDraft=canReviewTedDraftAssessment;
