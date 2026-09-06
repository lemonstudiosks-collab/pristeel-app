'use strict';
const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-finance-canonical-v1.js','utf8');
assert.doesNotThrow(()=>new Function(source),'Canonical Finance runtime must remain valid JavaScript');

const ids=['inv','supp','exp','atk','tax','aging','bg','oc'];
const cards=ids.map(id=>`<div onclick="finSwitchTab('${id}')"><div>${id}</div></div>`).join('');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-finance" class="page active"><div id="fin-hub"><div id="fin-hub-grid">${cards}</div></div>
<div id="fin-atk-sum"></div><div id="fin-atk-list"></div><div id="exp-form"></div><div id="atk-form"></div></div>
<input id="exp-amt" value="180"><input id="exp-cat" value="fuel"><input id="exp-sup" value="Furnitor Test"><input id="exp-nr" value="EXP-1"><input id="exp-date" value="2026-09-06"><input id="exp-due" value="2026-09-20"><input id="exp-vat" value="18"><input id="exp-paid" value="false"><input id="exp-notes" value="Shënim testues">
<input id="atk-amt" value="900"><input id="atk-period" value="TM3"><input id="atk-due" value="2026-10-15"><input id="atk-year" value="2026"><input id="atk-paid" value="false"><input id="atk-type" value="tvsh"><input id="atk-ref" value="REF-9"><input id="atk-notes" value="ATK test">
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;w.console=console;w.confirm=()=>true;w.alert=()=>{};
const calls=[];
const sales=[
 {id:'s1',gross_amount:57522.28,currency:'EUR',paid:false,due_date:'2026-08-01'},
 {id:'s2',gross_amount:20000,currency:'EUR',paid:true,due_date:'2026-08-01',payment_date:'2026-08-02'}
];
const suppliers=[
 {id:'i1',amount:2500,currency:'EUR',paid:false,due_date:'2026-08-10'},
 {id:'i2',amount:2500,currency:'EUR',paid:true,due_date:'2026-08-10',payment_date:'2026-08-11'}
];
const expenses=[
 {id:'e1',amount:1200,currency:'EUR',paid:true,date:'2026-09-01',due_date:'2026-09-01',payment_date:'2026-09-01'},
 {id:'e2',amount:180,currency:'EUR',paid:false,date:'2026-09-03',due_date:'2026-09-04'}
];
w.supaFetch=async(path,method,body)=>{
 calls.push({path,method:method||'GET',body});
 if(path.startsWith('invoices_out?'))return sales;
 if(path.startsWith('invoices_in?'))return suppliers;
 if(path.startsWith('expenses?')&&(!method||method==='GET'))return expenses;
 if(path.startsWith('tax_obligations?')&&(!method||method==='GET'))return [];
 if(path.startsWith('bank_guarantees?'))return [];
 if(path.startsWith('other_costs?'))return [];
 if(path==='expenses'&&method==='POST')return [{id:'new-exp'}];
 if(path==='tax_obligations'&&method==='POST')return [{id:'new-tax'}];
 if(method==='PATCH')return [];
 return [];
};
w.finShowHub=function(){};
w.finSwitchTab=function(){};
w.eval(source);

(async()=>{
  const beforeWrites=calls.filter(c=>c.method!=='GET').length;
  assert.strictEqual(await w.PSTFinanceCanonicalV1.hydrate(),true,'Finance hub hydration failed');
  assert.strictEqual(calls.filter(c=>c.method!=='GET').length,beforeWrites,'Finance hydration must be read-only');
  const text=w.document.getElementById('fin-hub-grid').textContent;
  assert(text.includes('2 fatura · 77.522,28 €'),'Sales card did not receive canonical live total');
  assert(text.includes('1 pa paguar · 57.522,28 €'),'Sales unpaid KPI missing');
  assert(text.includes('2 fatura · 5.000,00 €'),'Supplier invoice live total missing');
  assert(text.includes('2 shpenzime · 1.380,00 €'),'Expense live total missing');
  assert(text.includes('0 obligime'),'Zero-tax card must show an explicit zero state');
  assert(text.includes('0 aktive'),'Zero bank-guarantee card must show an explicit zero state');

  await w.finMarkPaid('out','s1');
  const paidCall=calls.find(c=>c.method==='PATCH'&&c.path.startsWith('invoices_out?id=eq.s1'));
  assert(paidCall,'Invoice paid action did not write to canonical table');
  assert(Object.prototype.hasOwnProperty.call(paidCall.body,'payment_date'),'Invoice paid action must use payment_date');
  assert(!Object.prototype.hasOwnProperty.call(paidCall.body,'paid_date'),'Legacy paid_date must not be written');

  await w.expSave();
  const expCall=calls.find(c=>c.path==='expenses'&&c.method==='POST');
  assert(expCall,'Expense save did not use canonical expenses table');
  ['invoice_nr','supplier','vat_rate','vat_amount','net_amount','deductible','paid_date'].forEach(k=>assert(!Object.prototype.hasOwnProperty.call(expCall.body,k),'Legacy expense field leaked: '+k));
  assert.strictEqual(expCall.body.amount,180);
  assert.strictEqual(expCall.body.currency,'EUR');
  assert(Object.prototype.hasOwnProperty.call(expCall.body,'payment_date'));

  await w.atkSave();
  const taxCall=calls.find(c=>c.path==='tax_obligations'&&c.method==='POST');
  assert(taxCall,'Tax save did not use canonical tax table');
  ['period_year','period_label','amount','paid','paid_amount','paid_date','reference_nr'].forEach(k=>assert(!Object.prototype.hasOwnProperty.call(taxCall.body,k),'Legacy tax field leaked: '+k));
  assert.strictEqual(taxCall.body.tax_amount,900);
  assert.strictEqual(taxCall.body.status,'open');
  assert(taxCall.body.period.includes('2026'),'Tax period must preserve the selected year');

  dom.window.close();
  console.log('Finance canonical runtime smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
