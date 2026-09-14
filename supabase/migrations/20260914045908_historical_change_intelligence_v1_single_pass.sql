-- Production reconciliation checkpoint.
-- The final single-pass definitions produced by this production migration are
-- materialized directly in 20260914045430_historical_change_intelligence_v1_core.sql
-- so a clean rebuild reaches the same final state without redundant redefinition.
select 1;
