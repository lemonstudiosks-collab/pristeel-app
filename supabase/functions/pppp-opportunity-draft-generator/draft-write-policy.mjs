export function hasExistingDraft(existing={}){
  return Boolean(existing&&String(existing.draft_id||'').trim());
}

export function shouldCreateFutureDraft(existing={}){
  return !hasExistingDraft(existing);
}
