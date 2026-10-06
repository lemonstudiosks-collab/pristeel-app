// Only the explicit, reviewed Gmail-draft path may clarify an unknown company role.
// This does not mark the assessment eligible or authorize targeted outreach/sending.
export function canReviewUnknownRoleDraft(assessment={},action={},tender={},explicitUser=false){
  const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
  const company=assessment.company||assessment.company_summary||{};
  const role=norm(company.company_type||assessment.company_role);
  const title=String(assessment.tender_summary?.title||'').trim();
  const domain=String(company.domain||'').trim();
  return explicitUser===true
    && assessment.workflow_track==='ted_award_outreach'
    && assessment.decision_state==='ready_for_review'
    && assessment.offer_model==='fabricated_steel_package'
    && ['unknown','other_unclear'].includes(role)
    && norm(action.route)==='ted_general'
    && !!title && title===String(tender.title||'').trim()
    && !!domain
    && !!norm(company.legal_name)
    && norm(company.legal_name)===norm(tender.winner?.name)
    && norm(company.legal_name)===norm(action.target_company)
    && (assessment.tender_facts||[]).some(f=>f?.type==='scope'&&f.status==='confirmed'&&/^https:\/\//.test(String(f.source_url||''))&&/steel|stahl|metall|metalwork|schlosser|çelik|čelik/i.test(String(f.value||'')))
    && (assessment.tender_facts||[]).some(f=>f?.type==='project'&&f.status==='confirmed'&&f.value===title&&/^https:\/\//.test(String(f.source_url||'')));
}
