-- Remove one confirmed misassigned operator fact from STACON D-23/26 current truth.
-- Preserve audit history by dismissing the exact row; do not reassign it to another project.
-- Idempotent for fresh/non-production databases where this specific historical row does not exist.

update public.pppp_project_context_facts
   set fact_status='dismissed',
       updated_at=clock_timestamp()
 where id='8cf2dbd7-2752-45f1-9597-8e928d60d7c2'::uuid
   and project_id='982be03c-bae4-4611-b723-f77f2fd13c07'::uuid
   and fact_key='operator_update.1a90d2fc14ad90bbfdd1'
   and source_ref='operator_update:1a90d2fc14ad90bbfdd1bee9d43f57d92d5607802bbd515af89e80c5f83ce350'
   and source_type='user'
   and evidence_status='confirmed'
   and fact_status='observed'
   and value->>'text'='ITALIN Style dukley';

select public.pppp_project_memory_baseline_reconcile_v1(true,100);
select public.pppp_intelligence_snapshot_capture_v1('stacon_misassigned_operator_fact_cleanup_v1');
