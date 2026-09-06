'use strict';
const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-finance-canonical-v1.js','utf8');
assert.doesNotThrow(()=>new Function(source),'Canonical Finance runtime must remain valid JavaScript');

// Guard the exact production schema used by the read-only bridge.
[
 'paid_date','period_year','period_label','amount,due_date,paid,paid_date',
 'bank_guarantees?select=id,status,amount_guaranteed,fee_amount,expiry_date',
 'other_costs?select=id,amount&limit=1000'
].forEach(token=>assert(source.includes(token),'Real production Finance schema token missing: '+token));
[
 'payment_date','tax_amount','base_amount','status,payment_date',
 'amount_guaranteed,fee_amount,currency','other_costs?select=id,amount,currency'
].forEach(token=>assert(!source.includes(token),'Non-production Finance schema token leaked: '+token));
assert(!/supaFetch\([^\n]+['"](?:POST|PATCH|DELETE)['"]/.test(source),'Finance KPI bridge must not perform writes');

const ids=['inv','supp','exp','atk','tax','aging','bg','oc'];
const cards=ids.map(id=>`<div onclick="finSwitchTab('${id}')"><div>${id}</div></div>`).join('');
const views=ids.map(id=>`<div id="fin-view-${id}" class="fin-view" style="display:none"></div>`).join('');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-finance" class="page active" style="display:block">
 <div id="fin-hub"><div id="fin-hub-grid">${cards}</div></div>
 <div id="fin-tabs" style="display:none"></div>${views}
</div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;w.console=console;
const calls=[];
const sales=[
 {id:'s1',gross_amount:57522.28,net_amount:48747.69,currency:'EUR',paid:false,due_date:'2026-08-01'},
 {id:'s2',gross_amount:20000,net_amount:16949.15,currency:'EUR',paid:true,due_date:'2026-08-01',paid_date:'2026-08-02'}
];
const suppliers=[
 {id:'i1',amount:2500,net_amount:2118.64,currency:'EUR',paid:false,due_date:'2026-08-10'},
 {id:'i2',amount:2500,net_amount:2118.64,currency:'EUR',paid:true,due_date:'2026-08-10',paid_date:'2026-08-11'}
];
const expenses=[
 {id:'e1',amount:1200,currency:'EUR',paid:true,date:'2026-09-01',due_date:'2026-09-01',paid_date:'2026-09-01'},
 {id:'e2',amount:180,currency:'EUR',paid:false,date:'2026-09-03',due_date:'2026-09-04'}
];
const taxes=[{id:'t1',tax_type:'tvsh',period_year:2026,period_label:'Gusht 2026',amount:900,due_date:'2026-09-20',paid:false}];
w.supaFetch=async(path,method,body)=>{
 calls.push({path,method:method||'GET',body});
 if(method&&method!=='GET')throw new Error('Write attempted by read-only bridge');
 if(path.startsWith('invoices_out?'))return sales;
 if(path.startsWith('invoices_in?'))return suppliers;
 if(path.startsWith('expenses?'))return expenses;
 if(path.startsWith('tax_obligations?'))return taxes;
 if(path.startsWith('bank_guarantees?'))return [];
 if(path.startsWith('other_costs?'))return [];
 return [];
};
let baseSwitchCalls=0;
w.finShowHub=function(){};w.finShowHub.__pstStabilityV2=true;
w.finSwitchTab=function(){baseSwitchCalls++;};w.finSwitchTab.__pstStabilityV2=true;
const writeOwners={finMarkPaid:function(){},expSave:function(){},expMarkPaid:function(){},atkSave:function(){},atkMarkPaid:function(){}};
Object.assign(w,writeOwners);
let oldDisconnected=0;
w.document.getElementById('page-finance').__pstFinanceStabilityObserver={disconnect(){oldDisconnected++;}};
w.eval(source);

(async()=>{
  w.PSTFinanceCanonicalV1.install();w.PSTFinanceCanonicalV1.install();
  assert(oldDisconnected>=1,'Unsafe Finance stability observer was not disconnected');
  Object.keys(writeOwners).forEach(k=>assert.strictEqual(w[k],writeOwners[k],k+' write owner must remain untouched'));

  const beforeWrites=calls.filter(c=>c.method!=='GET').length;
  assert.strictEqual(await w.PSTFinanceCanonicalV1.hydrate(),true,'Finance hub hydration failed');
  assert.strictEqual(calls.filter(c=>c.method!=='GET').length,beforeWrites,'Finance hydration must be read-only');
  const text=w.document.getElementById('fin-hub-grid').textContent;
  assert(text.includes('2 fatura · 77.522,28 €'),'Sales card did not receive live total');
  assert(text.includes('1 pa paguar · 57.522,28 €'),'Sales unpaid KPI missing');
  assert(text.includes('2 fatura · 5.000,00 €'),'Supplier invoice live total missing');
  assert(text.includes('2 shpenzime · 1.380,00 €'),'Expense live total missing');
  assert(text.includes('1 obligime'),'Tax card did not use actual tax rows');
  assert(text.includes('900,00 € detyrime të hapura'),'Tax amount did not use production amount field');
  assert(text.includes('0 aktive'),'Zero bank-guarantee card must show an explicit zero state');

  // A card click must leave the selected Finance subview physically visible.
  w.finSwitchTab('inv');
  await new Promise(r=>setTimeout(r,5));
  assert.strictEqual(baseSwitchCalls,1,'Existing Finance switch owner was not called exactly once');
  assert.strictEqual(w.document.getElementById('fin-hub').style.display,'none','Finance hub remained visible after a card click');
  assert.notStrictEqual(w.document.getElementById('fin-view-inv').style.display,'none','Invoice subview did not remain visible');
  assert.strictEqual(w.PSTFinanceCanonicalV1.safeSurfaceReady(),true,'Visible Finance subview must be considered a healthy surface');

  // A failed database read must be shown as a read error, never disguised as a valid zero KPI.
  w.finShowHub();
  w.supaFetch=async(path)=>{if(path.startsWith('invoices_out?'))throw new Error('schema/read failure');return [];};
  await w.PSTFinanceCanonicalV1.hydrate();
  const salesCard=w.document.querySelector('#fin-hub-grid>div[onclick="finSwitchTab(\'inv\')"]');
  assert(salesCard.textContent.includes('Gabim në lexim'),'Failed Finance read was silently presented as zero data');

  dom.window.close();
  console.log('Finance canonical runtime smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
