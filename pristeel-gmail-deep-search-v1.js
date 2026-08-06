/* PRISTEEL Gmail Deep Search v1
 * Searches Gmail message bodies live with the existing Google OAuth session.
 * Read-only: no database writes, no Gmail mutations, no polling and no observers.
 */
(function(){
'use strict';
if(window.__pstGmailDeepSearchV1)return;
window.__pstGmailDeepSearchV1=true;

var GMAIL_SCOPE='https://www.googleapis.com/auth/gmail.readonly';
var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
var STOP={a:1,e:1,i:1,te:1,qe:1,ne:1,per:1,me:1,nga:1,tek:1,ka:1,kam:1,kemi:1,jane:1,eshte:1,ishte:1,kush:1,cfare:1,ku:1,kur:1,pse:1,tha:1,shkroi:1,email:1,emaili:1,mesazhi:1,tema:1,the:1,an:1,is:1,was:1,are:1,to:1,from:1,in:1,of:1,for:1,with:1,who:1,what:1,where:1,when:1,why:1,did:1,said:1,wrote:1,about:1,der:1,die:1,das:1,und:1,zu:1,von:1,im:1,fur:1,mit:1,wer:1,was:1,wo:1,wann:1,warum:1,hat:1,sagte:1,schrieb:1};
var SYN={
 rfq:['rfq','request for quotation','request for quote','quotation request','quote request','kerkese per oferte','angebotsanfrage','preisanfrage'],
 request:['request','requirement','requirements','inquiry','enquiry','kerkese','anfrage','bedarf','aufforderung'],
 offer:['offer','offers','quotation','quote','proposal','oferte','oferta','angebot','angebote','preisangebot'],
 tender:['tender','bid','bidding','submission','ausschreibung','tenderim'],
 scope:['scope','scope of work','sow','leistungsumfang','arbeitsumfang','fushe veprimi','pershkrim pune'],
 specification:['specification','specifications','spec','technical specification','spezifikation','leistungsverzeichnis','lv','specifikim','kerkesa teknike'],
 bom:['bom','bill of materials','material list','stuckliste','stueckliste','materialliste','liste materialesh'],
 drawing:['drawing','drawings','zeichnung','zeichnungen','plan','plans','vizatim','vizatime'],
 transport:['transport','freight','shipping','delivery','lieferung','versand','fracht','logistics','logjistike'],
 assembly:['montim','montage','installation','erection','assembly'],
 price:['cmim','price','preis','cost','kosten','pricing','quotation','angebot','offer','ofert'],
 deadline:['afat','deadline','due','lieferzeit','delivery time','lead time','termin'],
 guarantee:['garanci','guarantee','bank guarantee','bankgarantie','sicherheit'],
 payment:['pagese','payment','zahlung','paid','bezahlt'],
 contract:['kontrate','contract','agreement','vertrag','vereinbarung'],
 invoice:['fature','invoice','rechnung','billing'],
 production:['prodhim','production','fertigung','manufacturing'],
 shipment:['dergese','delivery','shipment','lieferung','dispatch','versand'],
 supplier:['furnitor','supplier','vendor','lieferant','hersteller','prodhues'],
 client:['klient','client','customer','kunde','auftraggeber'],
 purchase:['purchase order','po','order','bestellung','auftrag','porosi'],
 approval:['approval','approved','freigabe','genehmigung','miratim','aprovim'],
 revision:['revision','rev','version','anderung','aenderung','ndryshim'],
 included:['included','include','inclusive','perfshire','perfshihet','enthalten','inklusive'],
 excluded:['excluded','exclude','not included','nuk perfshihet','nicht enthalten','separate','separately','vecmas']
};
function arr(v){return Array.isArray(v)?v:[];}
function norm(v){return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._+\-]+/g,' ').replace(/\s+/g,' ').trim();}
function escQuery(v){return String(v||'').replace(/[{}]/g,' ').replace(/\s+/g,' ').trim();}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function uniq(v){var seen={};return arr(v).filter(function(x){var k=String(x||'');if(!k||seen[k])return false;seen[k]=1;return true;});}
function one(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==null&&v!==undefined&&String(v).trim()!=='')return v;}return'';}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function header(payload,name){name=String(name||'').toLowerCase();var hs=(payload&&payload.headers)||[];for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===name)return hs[i].value||'';return'';}
function decode64(data){try{var s=String(data||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var bin=atob(s),bytes=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return new TextDecoder('utf-8').decode(bytes);}catch(e){try{return decodeURIComponent(escape(atob(String(data||'').replace(/-/g,'+').replace(/_/g,'/'))));}catch(x){return'';}}}
function stripHtml(value){var s=String(value||'');try{var d=document.createElement('div');d.innerHTML=s;d.querySelectorAll('script,style,svg,head').forEach(function(n){n.remove();});s=d.textContent||d.innerText||'';}catch(e){s=s.replace(/<[^>]+>/g,' ');}return s.replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();}
function bodyParts(part,out){if(!part)return;var mime=String(part.mimeType||'').toLowerCase(),data=part.body&&part.body.data;if(data&&(mime==='text/plain'||mime==='text/html'))out.push({mime:mime,text:decode64(data)});arr(part.parts).forEach(function(p){bodyParts(p,out);});}
function bodyText(message){var out=[];bodyParts(message&&message.payload,out);var plain=out.filter(function(x){return x.mime==='text/plain';}).map(function(x){return x.text;}).join('\n');var html=out.filter(function(x){return x.mime==='text/html';}).map(function(x){return stripHtml(x.text);}).join('\n');return stripHtml(plain||html||'');}
function short(v,n){var s=String(v||'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1).trim()+'…':s;}
function groups(query){var fromCommand=window.PSTBusinessCommandCenterV1&&window.PSTBusinessCommandCenterV1.tokenGroups;try{if(fromCommand)return fromCommand(query);}catch(e){}var tokens=norm(query).split(' ').filter(function(t){return t.length>1&&!STOP[t];});return tokens.map(function(t){if(SYN[t])return SYN[t];var keys=Object.keys(SYN);for(var i=0;i<keys.length;i++)if(SYN[keys[i]].some(function(x){return norm(x)===t;}))return SYN[keys[i]];return[t];});}
function score(query,text,subject){var g=groups(query),all=norm((subject||'')+' '+(text||'')),sub=norm(subject||'');if(!g.length)return 0;var matched=0,total=0;g.forEach(function(group){var hit=group.some(function(term){return all.indexOf(norm(term))>-1;});if(hit){matched++;total+=16;}if(group.some(function(term){return sub.indexOf(norm(term))>-1;}))total+=22;});var minimum=g.length<=2?g.length:Math.ceil(g.length*.55);if(matched<minimum)return 0;var exact=norm(query);if(exact&&all.indexOf(exact)>-1)total+=70;return total;}
function expandedQuery(query){var g=groups(query).slice(0,5);if(!g.length)return escQuery(query);return g.map(function(group){var terms=uniq(group.map(norm)).filter(function(x){return x.length>1;}).slice(0,6).map(function(x){return x.indexOf(' ')>-1?'"'+x+'"':x;});return terms.length>1?'{'+terms.join(' ')+'}':terms[0]||'';}).filter(Boolean).join(' ');}
function token(options){var G=window.PSTGoogleWorkspaceAuth,required=[G&&G.gmailScope||GMAIL_SCOPE];if(G&&G.currentToken){var cached=G.currentToken(required);if(cached)return Promise.resolve(cached);}if(options&&options.interactive&&G&&G.getGmailToken)return G.getGmailToken({interactive:true});var error=new Error('Autorizimi Gmail kërkohet. Kliko “Kërko thellë në Gmail” për të vazhduar.');error.code='PST_GMAIL_AUTH_REQUIRED';return Promise.reject(error);}
async function gmail(path,t){if(window.PSTEmail&&typeof window.PSTEmail.gmail==='function')return window.PSTEmail.gmail(path,t);var r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me'+path,{headers:{Authorization:'Bearer '+t}}),text=await r.text();if(!r.ok)throw new Error('Gmail '+r.status+': '+text.slice(0,220));return text?JSON.parse(text):{};}
async function map(items,n,fn,progress){var out=new Array(items.length),next=0,done=0;async function worker(){while(true){var i=next++;if(i>=items.length)return;try{out[i]=await fn(items[i]);}catch(e){out[i]=null;}done++;if(progress)progress({phase:'messages',done:done,total:items.length});}}var jobs=[];for(var j=0;j<Math.min(n,items.length);j++)jobs.push(worker());await Promise.all(jobs);return out.filter(Boolean);}
function inFilter(field,values){return field+'=in.('+values.map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',')+')';}
async function safe(path){if(typeof window.supaFetch!=='function')return[];try{return arr(await window.supaFetch(path));}catch(e){return[];}}
async function linkedMessageIds(projectId){var out=[];if(!projectId)return out;var direct=await safe('project_emails?project_id=eq.'+enc(projectId)+'&select=gmail_message_id,sent_at&order=sent_at.desc&limit=180');var links=await safe('project_email_links?project_id=eq.'+enc(projectId)+'&select=gmail_message_id,created_at&order=created_at.desc&limit=240');direct.concat(links).forEach(function(x){if(x.gmail_message_id)out.push(String(x.gmail_message_id));});return uniq(out).slice(0,180);}
async function searchIds(query,t,limit){var queries=uniq([escQuery(query),expandedQuery(query)]).filter(Boolean),ids=[];for(var i=0;i<queries.length;i++){var r=await gmail('/messages?q='+enc(queries[i])+'&maxResults='+Math.min(100,limit||70),t);arr(r.messages).forEach(function(x){if(x&&x.id)ids.push(String(x.id));});if(ids.length>=limit)break;}return uniq(ids).slice(0,limit||70);}
async function relations(messages){var ids=uniq(messages.map(function(m){return m.id;})),threads=uniq(messages.map(function(m){return m.threadId;})),mapBy={},rows=[];for(var i=0;i<ids.length;i+=30)rows=rows.concat(await safe('project_emails?select=gmail_message_id,gmail_thread_id,project_id&'+inFilter('gmail_message_id',ids.slice(i,i+30))));for(var j=0;j<ids.length;j+=30)rows=rows.concat(await safe('project_email_links?select=gmail_message_id,gmail_thread_id,project_id&'+inFilter('gmail_message_id',ids.slice(j,j+30))));for(var k=0;k<threads.length;k+=30)rows=rows.concat(await safe('project_email_links?select=gmail_message_id,gmail_thread_id,project_id&'+inFilter('gmail_thread_id',threads.slice(k,k+30))));rows.forEach(function(x){[x.gmail_message_id,x.gmail_thread_id].filter(Boolean).forEach(function(key){key=String(key);if(!mapBy[key])mapBy[key]=[];var pid=String(x.project_id||'');if(pid&&mapBy[key].indexOf(pid)<0)mapBy[key].push(pid);});});return mapBy;}
function parse(message,query,projectMap){var payload=message.payload||{},body=bodyText(message),subject=header(payload,'Subject')||'(pa subjekt)',from=header(payload,'From'),fromEmail=email(from),sentRaw=header(payload,'Date'),sentAt='';try{sentAt=new Date(sentRaw||Number(message.internalDate||0)).toISOString();}catch(e){}var value=score(query,body||message.snippet,subject);if(!value)return null;var pids=uniq(arr(projectMap[String(message.id)]).concat(arr(projectMap[String(message.threadId)])));return{type:'email',source:'gmail-live',score:value,row:{gmail_message_id:message.id,gmail_thread_id:message.threadId,subject:subject,from_name:from.replace(/<[^>]+>/g,'').replace(/["<>]/g,'').trim(),from_email:fromEmail,sent_at:sentAt,body_text:body,snippet:message.snippet||''},title:subject,meta:[fromEmail||from,sentAt?new Date(sentAt).toLocaleDateString('sq-AL'):'',pids.length?'Projekt i lidhur':'Pa projekt'].filter(Boolean).join(' · '),excerpt:short(body||message.snippet,340),projectId:pids[0]||'',projectIds:pids,url:'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(message.threadId||message.id),date:sentAt};}
async function search(query,options){options=options||{};query=String(query||'').trim();if(query.length<2)throw new Error('Shkruaj së paku dy karaktere për kërkim.');var t=await token(options),ids=options.projectId?await linkedMessageIds(options.projectId):await searchIds(query,t,Math.max(20,Math.min(100,Number(options.limit||70))));if(options.progress)options.progress({phase:'list',done:ids.length,total:ids.length});if(!ids.length)return[];var messages=await map(ids,6,function(id){return gmail('/messages/'+enc(id)+'?format=full',t);},options.progress),projectMap=await relations(messages),results=messages.map(function(m){return parse(m,query,projectMap);}).filter(Boolean);if(options.projectId)results=results.filter(function(r){return r.projectIds.indexOf(String(options.projectId))>-1;});results.sort(function(a,b){return b.score-a.score||String(b.date||'').localeCompare(String(a.date||''));});return results.slice(0,Number(options.resultLimit||45));}
window.PSTGmailDeepSearch={search:search,groups:groups,expandedQuery:expandedQuery,bodyText:bodyText,score:score,hasToken:function(){var G=window.PSTGoogleWorkspaceAuth;return !!(G&&G.currentToken&&G.currentToken([G.gmailScope||GMAIL_SCOPE]));}};
})();
