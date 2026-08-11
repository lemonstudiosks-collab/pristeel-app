/* PRISTEEL project create dedupe guard v1
 * Narrow safety wrapper for POST /projects only.
 * Uses the same exact duplicate key as Project Duplicate Manager:
 * normalized name + client + ref/reference.
 *
 * 0 exact matches: create normally.
 * 1 exact match: reuse the existing project instead of inserting a duplicate.
 * 2+ exact matches: fail closed and require Duplicate Manager to choose canonical.
 *
 * No project rows are deleted, merged or modified here.
 */
(function(){
'use strict';
if(window.__pstProjectCreateDedupeGuardV1)return;
window.__pstProjectCreateDedupeGuardV1=true;

var installed=false;
function arr(v){return Array.isArray(v)?v:[];}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function keyProject(p){return norm(p&&p.name)+'|'+norm(p&&p.client)+'|'+norm(p&&(p.ref||p.reference));}
function isProjectCreate(path,method){return String(method||'GET').toUpperCase()==='POST'&&/^projects(?:\?|$)/.test(String(path||''));}
function displayName(p){return String(p&&p.name||'Projekt').trim()||'Projekt';}
function conflictError(project,matches){
  var e=new Error('Ekzistojnë '+matches.length+' projekte me të njëjtin emër, klient dhe referencë për “'+displayName(project)+'”. Projekti i ri NUK u krijua. Hape Projektet → Dublikatat dhe zgjidh kopjen canonical.');
  e.code='PST_DUPLICATE_PROJECT_CONFLICT';
  e.matches=matches.map(function(x){return x&&x.id;}).filter(Boolean);
  return e;
}
function emitReuse(existing,requested){
  try{document.dispatchEvent(new CustomEvent('pst:project-create-reused',{detail:{project:existing,requested:requested}}));}catch(e){}
  try{console.info('PRISTEEL project create guard: reused existing project',existing&&existing.id,existing&&existing.name);}catch(e){}
}
function install(){
  if(installed)return true;
  var original=window.supaFetch;
  if(typeof original!=='function')return false;
  if(original.__pstProjectCreateDedupeGuardV1){installed=true;return true;}

  async function guarded(path,method,body){
    if(!isProjectCreate(path,method))return original.apply(this,arguments);
    var requested=Array.isArray(body)?body:[body];
    if(!requested.length)return original.apply(this,arguments);

    var existing=arr(await original.call(this,'projects?select=id,name,client,ref,status,created_at&order=created_at.asc&limit=5000'));
    var byKey={};
    existing.forEach(function(p){
      var key=keyProject(p);
      if(!norm(p&&p.name))return;
      (byKey[key]=byKey[key]||[]).push(p);
    });

    var output=[];
    for(var i=0;i<requested.length;i++){
      var row=requested[i]||{};
      var key=keyProject(row);
      var matches=norm(row.name)?arr(byKey[key]):[];
      if(matches.length>1)throw conflictError(row,matches);
      if(matches.length===1){
        emitReuse(matches[0],row);
        output.push(Object.assign({},matches[0],{__pst_reused_existing:true}));
        continue;
      }

      var created=arr(await original.call(this,'projects','POST',row));
      if(!created[0])throw new Error('Projekti nuk u krijua.');
      output.push(created[0]);
      if(norm(created[0].name)){
        var createdKey=keyProject(created[0]);
        (byKey[createdKey]=byKey[createdKey]||[]).push(created[0]);
      }
    }
    return output;
  }

  guarded.__pstProjectCreateDedupeGuardV1=true;
  guarded.__pstOriginalSupaFetch=original;
  window.supaFetch=guarded;
  installed=true;
  return true;
}

window.PSTProjectCreateDedupeGuard={
  install:install,
  keyProject:keyProject,
  isInstalled:function(){return installed;}
};

if(!install()){
  [0,80,220,500,900].forEach(function(ms){setTimeout(function(){if(!installed)install();},ms);});
}
})();
