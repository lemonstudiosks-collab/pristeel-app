export const FUTURE_DRAFT_CUTOFF='2026-09-07T11:57:00.000Z';

export function hasExistingDraft(existing={}){
  return Boolean(existing&&String(existing.draft_id||'').trim());
}

export function shouldCreateFutureDraft(existing={}){
  return !hasExistingDraft(existing);
}

export function actionEligibleForFutureDrafts(createdAt,cutoff=FUTURE_DRAFT_CUTOFF){
  const created=Date.parse(String(createdAt||'')),start=Date.parse(String(cutoff||''));
  return Number.isFinite(created)&&Number.isFinite(start)&&created>=start;
}
