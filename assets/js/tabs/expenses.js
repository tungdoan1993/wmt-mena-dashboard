/* Expenses tab: KPIs, cash-flow chart, category/office charts, ledger table.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* ---------- table ---------- */
function renderTable(rows){
  const q=state.q.toLowerCase();
  const match=rows.filter(t=>!q||[t.desc,t.cat,t.notes,t.office,t.type].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  document.getElementById('tblCount').textContent=`${match.length.toLocaleString()} transactions`;
  const tb=document.getElementById('tbody'); tb.innerHTML='';
  match.slice(0,state.rows).forEach(t=>{
    const tr=document.createElement('tr');
    const u=usd(t);
    tr.innerHTML=`<td>${t.date||t.mk}</td>
      <td><span class="pill">${OFF_SHORT[t.office]}</span></td>
      <td>${t.cat}${isInternal(t)?' <span class="pill">internal</span>':''}</td>
      <td>${t.desc||''}${t.notes?` <span style="color:var(--muted)">· ${t.notes}</span>`:''}</td>
      <td class="num ${t.amt>0?'pos':'neg'}">${fmtNat(t)}</td>
      <td class="num ${t.amt>0?'pos':'neg'}">${fmt$(u)}</td>`;
    tb.appendChild(tr);
  });
  document.getElementById('moreBtn').style.display = match.length>state.rows?'':'none';
}
function showMore(){ state.rows+=100; render(); }

/* ---------- expenses view ---------- */
function renderExpenses(){
  const rows=filtered();
  const msAll=monthsInRange().filter(mk=>DATA.some(t=>t.mk===mk&&state.offices.has(t.office)));
  const flow=rows.filter(t=>!isInternal(t));
  const tin=flow.filter(t=>t.amt>0).reduce((a,t)=>a+usd(t),0);
  const tout=flow.filter(t=>t.amt<0).reduce((a,t)=>a+usd(t),0);
  document.getElementById('kIn').textContent=fmt$(tin);
  document.getElementById('kOut').textContent=fmt$(tout);
  const net=tin+tout, kn=document.getElementById('kNet');
  kn.textContent=fmt$(net); kn.style.color=net>=0?'var(--good)':'var(--bad)';
  document.getElementById('kN').textContent=rows.length.toLocaleString();
  const ms=msAll;
  document.getElementById('kInSub').textContent='income + funding received';
  document.getElementById('kOutSub').textContent='expenses (internal transfers excluded)';
  document.getElementById('kNetSub').textContent= !ms.length ? 'no data in range'
    : ms.length===1 ? monLbl(ms[0])
    : `${monLbl(ms[0])} – ${monLbl(ms[ms.length-1])}`;
  document.getElementById('kNSub').textContent='in selected period';

  const inflow=ms.map(mk=>flow.filter(t=>t.mk===mk&&t.amt>0).reduce((a,t)=>a+usd(t),0));
  const outflow=ms.map(mk=>flow.filter(t=>t.mk===mk&&t.amt<0).reduce((a,t)=>a+usd(t),0));
  chartMonthly(document.getElementById('chMonthly'),ms,inflow,outflow);

  const byCat={};
  flow.filter(t=>t.amt<0).forEach(t=>{byCat[t.cat]=(byCat[t.cat]||0)-usd(t);});
  const cats=Object.entries(byCat).map(([label,v])=>({label,v})).sort((a,b)=>b.v-a.v).slice(0,10);
  hbars(document.getElementById('chCat'),cats,()=>css('--in'),
    d=>`<b>${d.label}</b><br>Spend: <b>${fmt$(-d.v)}</b>`);

  const offs=[...state.offices].map(o=>({label:OFF_SHORT[o],office:o,
    v:-flow.filter(t=>t.office===o&&t.amt<0).reduce((a,t)=>a+usd(t),0)})).sort((a,b)=>b.v-a.v);
  hbars(document.getElementById('chOffice'),offs,d=>css(OFF_COLOR[d.office]),
    d=>`<b>${d.label}</b><br>Spend: <b>${fmt$(-d.v)}</b>`);

  renderTable(rows);
}
