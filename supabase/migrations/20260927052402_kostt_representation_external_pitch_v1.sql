-- Keep internal project playbook separate from external-facing outreach text.

update public.pppp_representation_opportunity_targets_v1
set fit_evidence = fit_evidence || jsonb_build_object(
  'external_pitch',
  case target_id
    when '6dfa150e-b2a4-4963-a87f-5e1b68dc97a6'::uuid then
      'We believe KEC’s international T&D EPC capability could be combined effectively with PriSteel’s Kosovo-based sourcing, logistics, site support and local execution coordination for this opportunity.'
    when '488d49e9-701e-47d3-abf9-59b0ffea3d83'::uuid then
      'Given Elnos Group’s strong regional high-voltage experience, PriSteel could add a Kosovo-specific local layer for sourcing, logistics, site resources and project coordination.'
    when '49a2d2cf-1fdf-4079-a8a5-8e9e30c0faf2'::uuid then
      'Electromontaj’s high-voltage EPC and manufacturing capabilities could be complemented by PriSteel with Kosovo-specific local sourcing, logistics, site support and execution coordination where useful.'
    when '4c3528cb-05b4-47fe-85e8-804dbef9df0a'::uuid then
      'PriSteel could provide KPIL with a practical Kosovo execution and market interface, supporting local sourcing, logistics, subcontractor coordination and site activities without requiring a full local setup from the outset.'
  end
),
updated_at=now()
where opportunity_id='97aedec6-2323-412c-a9b6-cc5c80bf3012'
  and target_id in (
    '6dfa150e-b2a4-4963-a87f-5e1b68dc97a6',
    '488d49e9-701e-47d3-abf9-59b0ffea3d83',
    '49a2d2cf-1fdf-4079-a8a5-8e9e30c0faf2',
    '4c3528cb-05b4-47fe-85e8-804dbef9df0a'
  );
