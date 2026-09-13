-- Production migration history checkpoint.
-- Live acceptance exposed that projects.deadline is stored as text on this schema.
-- The canonical rebuild definition in 20260913172853_situation_intelligence_v1_core.sql
-- already includes explicit nullif(...,'')::date casts for portfolio date logic.
select 1;
