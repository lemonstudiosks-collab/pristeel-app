begin;

update public.pppp_procurement_source_policy
set
  home_min_score = 80,
  notes = case
    when notes is null or notes = '' then 'Generic Home alerts require strong relevance; tracked program/package matches bypass this threshold.'
    else notes || ' Generic Home alerts require strong relevance; tracked program/package matches bypass this threshold.'
  end,
  updated_at = now()
where source in (
  'MCA_KOSOVO',
  'KCF',
  'RCF',
  'EBRD_ECEPP',
  'WORLD_BANK',
  'UNGM',
  'UNDP_KOSOVO',
  'EU_OFFICE_KOSOVO'
);

commit;
