/* MENA Revenue tab.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* revenue + payouts per country for the selected period, merged on country name */
function countryPairs(){
  const m={};
  const g=c=>(m[c]=m[c]||{label:c,rev:0,pay:0,mkt:0});
  revInRange().forEach(r=>{ g(r.c).rev+=r.amt; });
  payInRange().forEach(r=>{ g(r.c).pay+=r.amt; });
  mktInRange().forEach(r=>{ g(r.c).mkt+=r.amt; });
  return Object.values(m);
}

/* ---------- revenue view ---------- */
function revInRange(){ const ms=new Set(monthsInRange()); return REV.filter(r=>ms.has(r.mk)); }
function renderRevenue(){
  const rows=revInRange();
  const tot=rows.reduce((a,r)=>a+r.amt,0), n=rows.reduce((a,r)=>a+r.n,0);
  const ms=monthsInRange().filter(mk=>REV.some(r=>r.mk===mk));
  document.getElementById('rTot').textContent=fmt$(tot);
  document.getElementById('rTotSub').textContent= ms.length? (ms.length===1?monLbl(ms[0]):`${monLbl(ms[0])} – ${monLbl(ms[ms.length-1])}`):'no data in range';
  document.getElementById('rN').textContent=n.toLocaleString();
  document.getElementById('rAvg').textContent=n?fmt$(tot/n):'–';
  const perM=ms.map(mk=>rows.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const bi=perM.indexOf(Math.max(...perM,0));
  document.getElementById('rBest').textContent= ms.length?monLbl(ms[bi]):'–';
  document.getElementById('rBestSub').textContent= ms.length?fmt$(perM[bi]):'';
  chartBars(document.getElementById('chRevMonthly'),ms,perM,css('--in'),
    (mk,i)=>`<b>${monLbl(mk)}</b><br>Revenue: <b>${fmt$(perM[i])}</b><br>Deals: <b>${rows.filter(r=>r.mk===mk).reduce((a,r)=>a+r.n,0).toLocaleString()}</b>`);
  const byC={}, byCn={};
  rows.forEach(r=>{byC[r.c]=(byC[r.c]||0)+r.amt; byCn[r.c]=(byCn[r.c]||0)+r.n;});
  hbars2(document.getElementById('chRevCountry'),
    countryPairs().sort((a,b)=>b.rev-a.rev),'rev');
  const dls=Object.entries(byCn).map(([label,v])=>({label,v})).sort((a,b)=>b.v-a.v);
  hbars(document.getElementById('chRevDeals'),dls,()=>css('--s3'),
    d=>`<b>${d.label}</b><br>Deals: <b>${d.v.toLocaleString()}</b>`,
    v=>v.toLocaleString('en-US'));
}
