const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('pristeel-project-loss.js','utf8');

assert.ok(src.includes("window.supaFetch('task_archive','POST'"),'project loss must archive open tasks before closing them');
assert.ok(src.includes('original_task_id:task.id'),'task_archive writes must use the live schema column original_task_id');
assert.ok(!/(^|\n)\s*task_id\s*:\s*task\.id\s*,/.test(src),'legacy task_id payload must not return');
assert.ok(src.includes("window.supaFetch('tasks?id=eq.'+enc(task.id),'PATCH',{status:'arkivuar',done_at:stamp})"),'archived project tasks must leave the open queue');
assert.ok(src.includes("tasks?project_id=eq.'+enc(project.id)+'&status=eq.hapur"),'only open tasks for the selected project should be archived');

console.log('Project loss task archive smoke: OK');
