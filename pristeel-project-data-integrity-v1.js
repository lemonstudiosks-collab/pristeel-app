/* PRISTEEL project data integrity adapter
 * Read-first adapter: unifies legacy and new relations without moving or deleting data.
 */
(function(){
'use strict';
if(window.PSTProjectDataIntegrity)return;

var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
var BROAD_TABLES={bom_items:1,rfq_log:1,offers:1,documents_registry:1,project_docs:1,project_attachment_links:1,offers_inbox:1};
function arr(v){
  if(Array.isArray(v))return v;
  if(!v)return[];
  if(typeof v==='string'){
    try{var x=JSON.parse(v);if(Array.isArray(x))return x;}catch(e){}
    return v.match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/ig)||[];
  }
  return[];
}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._+\-]+/g,' ').replace(/\s+/g,' ').trim();}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function external(v){var e=email(v);return e&&INTERNAL.indexOf(e)<0&&!/(no-?reply|mailer-daemon|postmaster|dmarc|calendar-notification)@/i.test(e);}
function safe(path){
  if(typeof window.supaFetch!=='function')return Promise.resolve([]);
  return window.supaFetch(path).then(function(x){return arr(x);}).catch(function(error){
    if(window.console&&console.debug)console.debug('PRISTEEL optional query skipped:',path,error&&error.message);
    return[];
  });
}
function uniq(rows,key){var seen={};return arr(rows).filter(function(x){var k=String(key(x)||'');if(!k||seen[k])return false;seen[k]=1;return true;});}
function pattern(name){return '*'+enc(String(name||'').replace(/[*,()]/g,' ').trim())+'*';}
function rowKey(row){return row&&(
  row.id||row.gmail_message_id||row.document_id||row.doc_nr||row.document_nr||row.invoice_nr||
  row.file_id||row.drive_file_id||row.file_name||row.filename||row.name||JSON.stringify(row)
);}
function flatText(row){
  if(!row||typeof row!=='object')return norm(row);
  var fields=['project_id','source_project_id','linked_project_id','project','project_name','project_ref','ref','reference','rfq_ref','request_ref','name','title','subject','description','desc','notes','snippet','file_name','filename','document_name','doc_nr','document_nr','invoice_nr','supplier','supplier_name','origin','source','client','customer','company'];
  return norm(fields.map(function(k){var v=row[k];return Array.isArray(v)?v.join(' '):(v==null?'':String(v));}).join(' '));
}
function dedicatedText(row){
  return norm(['project','project_name','project_ref','ref','reference','rfq_ref','request_ref','client','customer','company'].map(function(k){return row&&row[k]||'';}).join(' '));
}
function projectIdentity(project){
  var name=norm(project&&project.name),ref=norm(project&&project.ref),client=norm(project&&project.client);
  var numbers=norm((project&&project.name||'')+' '+(project&&project.ref||'')).match(/\b[a-z]*\d{4,}[a-z0-9_-]*\b/g)||[];
  var tokens=norm([project&&project.name,project&&project.ref].join(' ')).split(' ').filter(function(x){return x.length>=5&&!/^(projekt|project|anfrage|fertigung|steel|stahl|construction|angebot|offer)$/.test(x);});
  return{name:name,ref:ref,client:client,numbers:uniq(numbers,function(x){return x;}),tokens:uniq(tokens,function(x){return x;})};
}
function relationScore(row,project){
  if(!row||!project)return 0;
  var pid=String(project.id||''),idFields=[row.project_id,row.source_project_id,row.linked_project_id,row.parent_project_id].map(String);
  if(pid&&idFields.indexOf(pid)>-1)return 1000;
  var i=projectIdentity(project),text=flatText(row),dedicated=dedicatedText(row),score=0;
  if(i.ref&&i.ref.length>=4&&text.indexOf(i.ref)>-1)score+=260;
  if(i.name&&i.name.length>=7&&text.indexOf(i.name)>-1)score+=210;
  if(i.client&&i.client.length>=4){
    if(dedicated===i.client||dedicated.indexOf(i.client)>-1)score+=140;
    else if(text.indexOf(i.client)>-1)score+=55;
  }
  i.numbers.forEach(function(x){if(text.indexOf(x)>-1)score+=180;});
  i.tokens.forEach(function(x){if(text.indexOf(x)>-1)score+=/\d/.test(x)?70:24;});
  if(/offer|ofert|angebot|quotation|quote|rfq|tender/i.test(text)&&i.client&&dedicated.indexOf(i.client)>-1)score+=25;
  return score;
}
async function byProject(table,pid,projectOrName,order){
  var project=typeof projectOrName==='object'?projectOrName:{id:pid,name:projectOrName||'',ref:'',client:''};
  var tail='&select=*'+(order?'&'+order:'');
  var batches=[];
  batches.push(await safe(table+'?project_id=eq.'+enc(pid)+tail));
  if(project.name)batches.push(await safe(table+'?project=ilike.'+pattern(project.name)+tail));
  if(project.name)batches.push(await safe(table+'?project_name=ilike.'+pattern(project.name)+tail));
  if(project.ref){
    batches.push(await safe(table+'?project=ilike.'+pattern(project.ref)+tail));
    batches.push(await safe(table+'?project_name=ilike.'+pattern(project.ref)+tail));
  }
  var rows=uniq([].concat.apply([],batches),rowKey);
  if(BROAD_TABLES[table]){
    var broad=await safe(table+'?select=*'+(order?'&'+order:'&limit=3000'));
    broad.forEach(function(row){if(relationScore(row,project)>=100&&!rows.some(function(x){return String(rowKey(x))===String(rowKey(row));}))rows.push(row);});
  }
  return rows;
}
async function emails(pid){
  var links=await safe('project_email_links?project_id=eq.'+enc(pid)+'&select=*&order=created_at.desc&limit=5000');
  var directP=safe('project_emails?project_id=eq.'+enc(pid)+'&select=*&order=sent_at.desc&limit=3000');
  var ids=uniq(links,function(x){return x.gmail_message_id;}).map(function(x){return x.gmail_message_id;}).filter(Boolean),linked=[];
  for(var i=0;i<ids.length;i+=30){
    var part=ids.slice(i,i+30).map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',');
    linked=linked.concat(await safe('project_emails?gmail_message_id=in.('+part+')&select=*&order=sent_at.desc&limit=3000'));
  }
  var direct=await directP;
  var rows=uniq(direct.concat(linked),function(x){return x.gmail_message_id||x.id;}).sort(function(a,b){return String(b.sent_at||'').localeCompare(String(a.sent_at||''));});
  return{rows:rows,links:links,linkedOnly:rows.filter(function(x){return String(x.project_id||'')!==String(pid);})};
}
async function contacts(pid,mails){
  var saved=await safe('project_contacts?project_id=eq.'+enc(pid)+'&select=*&limit=3000');
  var global=await safe('contacts?email=not.is.null&select=id,email,person,company,role,kind&limit=4000');
  var gm={},map={};
  global.forEach(function(x){var e=email(x.email);if(e)gm[e]=x;});
  function add(addr,name,date,role){
    var e=email(addr);if(!external(e))return;
    if(!map[e])map[e]={email:e,name:'',company:'',role:'',count:0,last_seen:'',source:'email'};
    var c=map[e];c.count++;
    if(name&&!c.name)c.name=String(name).replace(/["<>]/g,'').trim();
    if(date&&date>c.last_seen)c.last_seen=date;
    if(role==='cc'&&!c.role)c.role='CC';
  }
  mails.forEach(function(m){
    add(m.from_email,m.from_name,m.sent_at,'from');
    arr(m.to_emails).forEach(function(e){add(e,'',m.sent_at,'to');});
    arr(m.cc_emails).forEach(function(e){add(e,'',m.sent_at,'cc');});
  });
  saved.forEach(function(x){var e=email(x.email);if(e)map[e]=Object.assign(map[e]||{email:e,count:0},x,{source:'project_contacts'});});
  Object.keys(map).forEach(function(e){
    var c=map[e],g=gm[e];
    if(g){c.global_contact_id=g.id;c.name=g.person||c.name;c.company=g.company||c.company;c.role=g.role||c.role;c.kind=g.kind||c.kind;}
    if(!c.name)c.name=e.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();});
    if(!c.company)c.company=(e.split('@')[1]||'').split('.')[0].replace(/[-_]+/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();});
  });
  return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return Number(!!b.is_primary)-Number(!!a.is_primary)||Number(b.count||b.email_count||0)-Number(a.count||a.email_count||0);});
}
async function drive(project){
  var G=window.PSTGoogleWorkspaceAuth;
  if(!project.drive_folder_id||!G)return{rows:[],state:project.drive_folder_id?'module-missing':'no-folder'};
  var token=G.currentToken?G.currentToken([G.driveScope]):'';
  if(!token)return{rows:[],state:'not-authorized'};
  try{
    var query="'"+project.drive_folder_id+"' in parents and trashed=false";
    var url='https://www.googleapis.com/drive/v3/files?q='+enc(query)+'&fields='+enc('files(id,name,size,modifiedTime,webViewLink,mimeType)')+'&pageSize=1000';
    var r=await fetch(url,{headers:{Authorization:'Bearer '+token}});
    if(!r.ok)throw new Error('Drive '+r.status);
    var j=await r.json();return{rows:arr(j.files),state:'ok'};
  }catch(e){return{rows:[],state:'error',error:e.message};}
}
function matchDeal(project,deals){
  var tokens=norm([project.name,project.ref,project.client].join(' ')).split(' ').filter(function(x){return x.length>=4;}),best=null,score=0;
  deals.forEach(function(d){var t=norm(d.dealname),s=0;tokens.forEach(function(x){if(t.indexOf(x)>-1)s++;});if(s>score){score=s;best=d;}});
  return score?best:null;
}
function ourOffer(row){return String(row.series||'').toUpperCase()==='QUO'||/oferta jone|our offer|pristeel/i.test(String(row.supplier||row.origin||row.source||''));}
function supplierOffer(row){
  if(!row||ourOffer(row))return false;
  var text=flatText(row),supplier=String(row.supplier||row.supplier_name||row.company||'').trim();
  return !!supplier||/offer|ofert|angebot|quotation|quote|rfq response|price proposal/i.test(text);
}
async function load(id){
  var p=(await safe('projects?id=eq.'+enc(id)+'&select=*&limit=1'))[0];
  if(!p)throw new Error('Projekti nuk u gjet.');
  var em=await emails(id);
  var out=await Promise.all([
    contacts(id,em.rows),
    byProject('bom_items',id,p,'order=created_at.asc&limit=3000'),
    byProject('rfq_log',id,p,'order=sent_at.desc&limit=3000'),
    byProject('offers',id,p,'order=created_at.desc&limit=3000'),
    byProject('documents_registry',id,p,'order=created_at.desc&limit=3000'),
    byProject('invoices_out',id,p,'order=created_at.desc&limit=3000'),
    byProject('invoices_in',id,p,'order=created_at.desc&limit=3000'),
    byProject('commercial_adjustments',id,p,'order=created_at.desc&limit=3000'),
    byProject('project_docs',id,p,'order=created_at.desc&limit=3000'),
    byProject('project_attachment_links',id,p,'order=created_at.desc&limit=3000'),
    byProject('offers_inbox',id,p,'order=created_at.desc&limit=3000'),
    safe('bank_guarantees?project=ilike.'+pattern(p.name)+'&select=*&order=created_at.desc&limit=500'),
    safe('crm_deals?select=dealname,amount,dealstage,closedate,description,hs_object_id&limit=1500'),
    drive(p)
  ]);
  var offers=out[3],docs=out[4],projectDocs=out[8],attachmentLinks=out[9],inboxDocs=out[10];
  var ours=docs.filter(ourOffer).concat(offers.filter(ourOffer));
  var supplierPool=offers.concat(inboxDocs,projectDocs,attachmentLinks,docs).filter(supplierOffer);
  var suppliers=uniq(supplierPool,function(x){return rowKey(x);});
  var data={project:p,emails:em.rows,emailLinks:em.links,linkedOnly:em.linkedOnly,contacts:out[0],bom:out[1],rfqs:out[2],offers:offers,ourOffers:uniq(ours,function(x){return rowKey(x);}),supplierOffers:suppliers,docs:docs,invoicesOut:out[5],invoicesIn:out[6],adjustments:out[7],projectDocs:projectDocs,attachmentLinks:attachmentLinks,inboxDocs:inboxDocs,guarantees:out[11],deals:out[12],drive:out[13]};
  data.deal=matchDeal(p,data.deals);
  data.mailAttachments=data.emails.filter(function(x){return x.has_attachments||arr(x.attachments).length;});
  data.files=uniq(data.docs.concat(data.projectDocs,data.attachmentLinks,data.inboxDocs,data.drive.rows,data.mailAttachments),rowKey);
  data.integration={
    gmailModule:!!(window.PSTEmail&&window.PSTGoogleWorkspaceAuth),
    gmailLinked:data.emails.length>0,
    driveFolder:!!p.drive_folder_id,
    driveState:data.drive.state,
    hubspotCached:!!data.deal,
    hubspotBcc:data.emails.some(function(x){return /hubspot\.com/i.test(arr(x.bcc_emails).join(' '));})
  };
  return data;
}
window.PSTProjectDataIntegrity={load:load,arr:arr,enc:enc,safe:safe,byProject:byProject,email:email,external:external,relationScore:relationScore};
})();
