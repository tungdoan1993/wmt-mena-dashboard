/* Expenses tab: KPIs, cash-flow chart, category/office charts, ledger table.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* ---------- table ---------- */
function renderTable(rows){
  const q=state.q.toLowerCase();
  const match=rows.filter(t=>!q||[t.desc,t.cat,t.notes,t.office,t.type].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const gaps = (typeof expenseGapsInRange==='function' && MENA.manifestOk!==false) ? expenseGapsInRange() : [];
  document.getElementById('tblCount').textContent=`${match.length.toLocaleString()} transactions`+(gaps.length?' · incomplete':'');
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
  const manifestOk = MENA.manifestOk !== false;
  const gaps = manifestOk ? expenseGapsInRange() : [];
  const hard = gaps.filter(e=>fileHardDown(e.file));
  const files = manifestOk ? gaps.map(e=>e.file) : ['manifest.json'];
  placeNotice('view-exp', (gaps.length || !manifestOk) ? missHtml(files) : '');

  const blank = () => {
    ['kIn','kOut','kNet','kN'].forEach(id=>{
      const n=document.getElementById(id);
      n.textContent='—';
      if(id==='kNet') n.style.color='';
      flagTotal(id, files);
    });
    document.getElementById('kInSub').textContent='Not updated';
    document.getElementById('kOutSub').textContent='Not updated';
    document.getElementById('kNetSub').textContent=gapNote(files);
    document.getElementById('kNSub').textContent='Not updated';
    document.getElementById('chMonthly').innerHTML='';
    document.getElementById('chCat').innerHTML='';
    document.getElementById('chOffice').innerHTML='';
    document.getElementById('tbody').innerHTML='';
    document.getElementById('tblCount').textContent=missLabel(files[0])+' · Not updated';
    document.getElementById('moreBtn').style.display='none';
  };
  if(!manifestOk){ blank(); return; }

  const rows=filtered();
  const hardSet=new Set(hard.map(e=>e.mk));
  const msData=monthsInRange().filter(mk=>DATA.some(t=>t.mk===mk&&state.offices.has(t.office)));
  const ms=[...new Set([...msData, ...hard.map(e=>e.mk)])].sort();
  if(!msData.length && hard.length){
    blank();
    chartMonthly(document.getElementById('chMonthly'), ms, ms.map(()=>null), ms.map(()=>null));
    return;
  }

  const flow=rows.filter(t=>!isInternal(t));
  const tin=flow.filter(t=>t.amt>0).reduce((a,t)=>a+usd(t),0);
  const tout=flow.filter(t=>t.amt<0).reduce((a,t)=>a+usd(t),0);
  document.getElementById('kIn').textContent=fmt$(tin);
  document.getElementById('kOut').textContent=fmt$(tout);
  const net=tin+tout, kn=document.getElementById('kNet');
  kn.textContent=fmt$(net); kn.style.color=net>=0?'var(--good)':'var(--bad)';
  document.getElementById('kN').textContent=rows.length.toLocaleString();
  const inc = gaps.length ? ' · incomplete' : '';
  document.getElementById('kInSub').textContent='income + funding received'+inc;
  document.getElementById('kOutSub').textContent='expenses (internal transfers excluded)'+inc;
  document.getElementById('kNetSub').textContent= (!msData.length ? 'no data in range'
    : msData.length===1 ? monLbl(msData[0])
    : `${monLbl(msData[0])} – ${monLbl(msData[msData.length-1])}`) + (gaps.length ? ' · '+gapNote(files) : '');
  document.getElementById('kNSub').textContent='in selected period'+inc;
  ['kIn','kOut','kNet','kN'].forEach(id=>flagTotal(id, gaps.length?files:[]));

  const inflow=ms.map(mk=>hardSet.has(mk)?null:flow.filter(t=>t.mk===mk&&t.amt>0).reduce((a,t)=>a+usd(t),0));
  const outflow=ms.map(mk=>hardSet.has(mk)?null:flow.filter(t=>t.mk===mk&&t.amt<0).reduce((a,t)=>a+usd(t),0));
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
