/* PRISTEEL Project Discovery creation fix: krijim pa pipeline_stage të pavlefshëm */
(function(){
'use strict';
if(window.__pstProjectDiscoveryCreateFixLoaded)return;
window.__pstProjectDiscoveryCreateFixLoaded=true;

function arr(v){return Array.isArray(v)?v:[]}
function enc(v){return encodeURIComponent(String(v==null?'':v))}
function saved(){
  try{return JSON.parse(localStorage.getItem('pst_project_discovery')||'null')}
  catch(e){return null}
}
function candidateAt(i){
  var data=saved();
  return data&&arr(data.candidates)[Number(i)]||null
}
function isPipelineError(e){
  var text=String(e&&e.message||e||'').toLowerCase();
  return text.indexOf('projects_pipeline_stage_check')>-1||text.indexOf('pipeline_stage')>-1
}
async function findCreated(name){
  var rows=await supaFetch('projects?name=eq.'+enc(name)+'&select=id,name,client,ref&order=created_at.desc&limit=1');
  return arr(rows)[0]||null
}
async function insertProject(candidate,name){
  var cleanName=String(name||candidate&&candidate.title||'').trim().slice(0,180);
  if(!cleanName)throw new Error('Emri i projektit mungon.');

  var attempts=[
    {name:cleanName,client:String(candidate&&candidate.client||''),ref:candidate&&candidate.ref||null},
    {name:cleanName,client:String(candidate&&candidate.client||'')},
    {name:cleanName}
  ];
  var lastError=null;
  for(var i=0;i<attempts.length;i++){
    try{
      var result=await supaFetch('projects','POST',attempts[i]);
      var project=arr(result)[0]||await findCreated(cleanName);
      if(project&&project.id)return project;
    }catch(e){
      lastError=e;
      if(!isPipelineError(e)&&i===attempts.length-1)throw e
    }
  }
  var existing=await findCreated(cleanName);
  if(existing&&existing.id)return existing;
  throw lastError||new Error('Projekti nuk u krijua.')
}
async function linkCandidate(candidate,projectId){
  var rows=arr(candidate&&candidate.rows);
  for(var i=0;i<rows.length;i++){
    var row=rows[i];
    var patch={
      project_id:projectId,
      suggested_project_id:projectId,
      match_method:'manual-project-discovery',
      match_confidence:100,
      needs_review:false,
      review_reason:null,
      updated_at:new Date().toISOString()
    };
    await supaFetch('project_emails?id=eq.'+enc(row.id),'PATCH',patch);
    try{
      await supaFetch('project_email_links','POST',{
        project_id:projectId,
        gmail_message_id:row.gmail_message_id||null,
        gmail_thread_id:row.gmail_thread_id||null,
        link_method:'manual-project-discovery',
        confidence:100,
        created_at:new Date().toISOString()
      })
    }catch(e){}
  }
  if(typeof window.pstSyncProjectContacts==='function'){
    try{await window.pstSyncProjectContacts(projectId)}catch(e){}
  }
}
function removeCard(i){
  var el=document.getElementById('ppd-c-'+i);
  if(el)el.remove()
}
function setButtonsDisabled(disabled){
  document.querySelectorAll('.ppd-btn').forEach(function(btn){btn.disabled=!!disabled})
}

window.pstDiscoveryCreate=async function(i){
  var candidate=candidateAt(i);
  if(!candidate)return alert('Kandidati nuk u gjet. Rifresko analizën e Gmail-it.');
  var name=prompt('Emri i projektit:',candidate.title||'Projekt nga Gmail');
  if(!name)return;
  setButtonsDisabled(true);
  try{
    var project=await insertProject(candidate,name);
    await linkCandidate(candidate,project.id);
    removeCard(i);
    alert('Projekti u krijua dhe emailat u lidhën.')
  }catch(e){
    alert('Gabim gjatë krijimit: '+String(e&&e.message||e))
  }finally{
    setButtonsDisabled(false)
  }
};

window.pstDiscoveryCreateSafe=async function(){
  var data=saved(),candidates=arr(data&&data.candidates);
  var safe=candidates.filter(function(c){
    return Number(c.score)>=96&&!(c.match&&c.match.project&&Number(c.match.score)>=92)
  });
  if(!safe.length)return alert('Nuk ka raste të reja 96%+ pa projekt ekzistues.');
  if(!confirm('Të krijohen '+safe.length+' projekte me besueshmëri 96% ose më shumë?'))return;
  setButtonsDisabled(true);
  var created=0,failed=0;
  for(var i=0;i<safe.length;i++){
    try{
      var project=await insertProject(safe[i],safe[i].title);
      await linkCandidate(safe[i],project.id);
      created++
    }catch(e){failed++}
  }
  setButtonsDisabled(false);
  alert(created+' projekte u krijuan.'+(failed?' '+failed+' raste nuk u krijuan.':''));
  if(typeof window.pstProjectDiscovery==='function')window.pstProjectDiscovery()
};
})();
