const text=v=>String(v==null?'':v).trim().replace(/\s+/g,' ');
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

function uniqValues(rows,field,filter){
  const map=new Map();
  for(const row of rows){
    const value=text(row&&row[field]);
    if(!value || (filter&&!filter(row,value)))continue;
    const key=norm(value);if(key&&!map.has(key))map.set(key,value);
  }
  return [...map.values()];
}
function isOrgCard(row){
  const kind=norm(row&&row.vcard_kind);
  if(kind==='org'||kind==='organization')return true;
  const p=norm(row&&row.person),c=norm(row&&row.company);
  return !!p&&!!c&&p===c;
}
function isHumanCard(row){
  if(!row||isOrgCard(row))return false;
  const kind=norm(row.vcard_kind),p=norm(row.person),c=norm(row.company);
  if(!p)return false;
  if(kind==='individual'||kind==='person')return true;
  return !!c&&p!==c;
}
function richness(row){return ['person','company','phone','role','country'].reduce((n,k)=>n+(text(row&&row[k])?1:0),0)+(isHumanCard(row)?10:0);}
function mergeSafe(winner,group){
  const out={...winner};
  for(const field of ['company','person','phone','role','country']){
    if(text(out[field]))continue;
    let vals;
    if(field==='person') vals=uniqValues(group,field,(r,v)=>!isOrgCard(r)&&norm(v)!==norm(r&&r.company));
    else vals=uniqValues(group,field);
    if(vals.length===1)out[field]=vals[0];
  }
  return out;
}
function sameHuman(rows){const vals=uniqValues(rows,'person');return vals.length<=1;}
function compatibleNonHumanGroup(rows){
  const persons=uniqValues(rows,'person');
  const companies=uniqValues(rows,'company');
  if(persons.length<=1&&companies.length<=1)return true;
  const personKeys=new Set(persons.map(norm)),companyKeys=new Set(companies.map(norm));
  return persons.every(v=>companyKeys.has(norm(v)))&&companies.every(v=>personKeys.has(norm(v)));
}

export function resolveBitrixEmailGroups(rows=[]){
  const groups=new Map(),noEmail=[];
  for(const row of rows||[]){
    const email=text(row&&row.email).toLowerCase();
    if(!email){noEmail.push(row);continue;}
    if(!groups.has(email))groups.set(email,[]);groups.get(email).push(row);
  }
  const byEmail=new Map(),resolvedDuplicates=[],unresolvedDuplicates=[];
  for(const [email,group] of groups){
    if(group.length===1){byEmail.set(email,group[0]);continue;}
    const humans=group.filter(isHumanCard);
    let winner=null,reason='';
    if(humans.length===1){winner=humans[0];reason='single_human_over_org';}
    else if(humans.length>1&&sameHuman(humans)){
      winner=[...humans].sort((a,b)=>richness(b)-richness(a))[0];reason='same_person_duplicate_cards';
    }else if(humans.length===0&&compatibleNonHumanGroup(group)){
      winner=[...group].sort((a,b)=>richness(b)-richness(a))[0];reason='compatible_org_cards';
    }
    if(!winner){
      unresolvedDuplicates.push({email,count:group.length,people:uniqValues(group,'person'),companies:uniqValues(group,'company'),bitrix_ids:group.map(x=>text(x&&x.bitrix_id)).filter(Boolean)});
      continue;
    }
    const resolved=mergeSafe(winner,group);
    byEmail.set(email,resolved);
    resolvedDuplicates.push({email,count:group.length,reason,selected_bitrix_id:text(winner.bitrix_id)});
  }
  return{byEmail,noEmail,resolvedDuplicates,unresolvedDuplicates,totalGroups:groups.size};
}

export const __test={norm,isOrgCard,isHumanCard,mergeSafe};
