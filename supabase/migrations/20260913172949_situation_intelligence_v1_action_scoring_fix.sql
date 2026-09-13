-- Production migration history checkpoint.
-- During live acceptance, raw workflow-task backlog was found to overstate urgency.
-- The canonical rebuild definition in 20260913172853_situation_intelligence_v1_core.sql
-- already includes the corrected rule: current operator actions + Project Memory drive
-- urgency, while workflow-task backlog is transparency-only.
select 1;
