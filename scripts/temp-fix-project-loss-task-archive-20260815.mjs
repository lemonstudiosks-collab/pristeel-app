import fs from 'node:fs';

function patch(path,before,after,label){
  let s=fs.readFileSync(path,'utf8');
  const i=s.indexOf(before);
  if(i<0)throw new Error(`Missing ${label}`);
  if(s.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  s=s.slice(0,i)+after+s.slice(i+before.length);
  fs.writeFileSync(path,s,'utf8');
}

patch('pristeel-project-loss.js','        task_id:task.id,','        original_task_id:task.id,','task archive schema field');

patch('package.json',
  'node --check pristeel-project-closure-direct-v1.js && node --check pristeel-project-flow-actions-v1.js',
  'node --check pristeel-project-closure-direct-v1.js && node --check pristeel-project-loss.js && node --check pristeel-project-flow-actions-v1.js',
  'project loss syntax coverage');

patch('package.json',
  'node tests/project-flow-actions-smoke.js && node tests/rfq-stability-v2-smoke.js',
  'node tests/project-flow-actions-smoke.js && node tests/project-loss-task-archive-smoke.js && node tests/rfq-stability-v2-smoke.js',
  'project loss smoke coverage');

console.log('Applied project-loss task archive schema fix and CI coverage.');
