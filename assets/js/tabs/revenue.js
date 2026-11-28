/* Revenue tab — one view per market (MENA, Pakistan, Ethiopia, Nigeria …, see manifest markets).
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* revenue + payouts per country for the selected period, merged on country name.
   A failed payouts or marketing file leaves that metric unknown (not zero). */
function countryPairs(){
  const payKnown = MENA.payoutsOk !== false;
  const mktKnown = MENA.marketingOk !== false;
  const m={};
  const g=c=>(m[c]=m[c]||{label:c,rev:0,pay:0,mkt:0,payKnown,mktKnown});
  const seenRev=new Set();
  revInRange().forEach(r=>{ g(r.c).rev+=r.amt; seenRev.add(r.c); });
  if(payKnown) payInRange().forEach(r=>{ g(r.c).pay+=r.amt; });
  if(mktKnown) mktInRange().forEach(r=>{ g(r.c).mkt+=r.amt; });
  revenueCountryGaps(state.market).forEach(gap=>{
    if(m[gap.country]){ m[gap.country].revKnown=false; m[gap.country].file=gap.file; }
    else m[gap.country]={label:gap.country,rev:0,pay:0,mkt:0,payKnown,mktKnown,revKnown:false,file:gap.file};
  });
  /* A failed catch-all file (HubSpot) does not name its countries. Any country with no
     loaded revenue row is unknown — not a real zero — so the chart cannot draw $0. */
  const blind=revenueFilesForMarket(state.market).filter(f=>fileHardDown(f) && !knownCountries(f).length);
  if(blind.length){
    Object.values(m).forEach(row=>{
      if(!seenRev.has(row.label)){ row.revKnown=false; row.file=row.file||blind[0]; }
    });
  }
  return Object.values(m);
}

/* ---------- revenue view ---------- */
const mREV = () => REV.filter(inMarket);                       /* selected market, all time */
function revInRange(){ const ms=new Set(monthsInRange()); return REV.filter(r=>ms.has(r.mk)&&inMarket(r)); }
function renderRevenue(){
  const M=MARKET_BY_ID[state.market], all=mREV();
  const emptyH = el('revEmpty').querySelector('h2');
  if(emptyH) emptyH.textContent='No data yet';
  el('rTotLbl').textContent=`WMT ${M.label} revenue`;
  el('revNote').textContent='Closed-won deal amounts by create date · '+(M.source||'no source connected yet');
  if(MENA.manifestOk===false){
    el('revEmpty').style.display='';
    el('revBody').style.display='none';
    if(emptyH) emptyH.textContent=missLabel('manifest.json');
    el('revEmptyTxt').textContent='Not updated';
    return;
  }
  const gaps=revenueGapsForMarket(state.market);
  const gapFiles=gaps.map(g=>g.file);
  if(!all.length && gapFiles.length){
    el('revEmpty').style.display='';
    el('revBody').style.display='none';
    if(emptyH) emptyH.textContent=missLabel(gapFiles[0]);
    el('revEmptyTxt').innerHTML='<span>Not updated</span>'+missHtml(gapFiles);
    return;
  }
  el('revEmpty').style.display = all.length?'none':'';
  el('revBody').style.display = all.length?'':'none';
  if(!all.length){
    el('revEmptyTxt').innerHTML =
      `No ${M.label} revenue has been loaded yet. The view fills in automatically once rows for `+
      `${(M.countries==='*'?'these countries':M.countries.join(', '))} are added to <code>data/${M.file||'revenue/…'}</code>.`;
    return;
  }
  placeNotice('revBody', gapFiles.length ? missHtml(gapFiles) : '');
  const side=[];
  if(fileDown('payouts.json')) side.push('payouts.json');
  if(fileDown('marketing.json')) side.push('marketing.json');
  placeNoticeBefore('chRevCountry', side.length ? missHtml(side) : '');
  const rows=revInRange();
  const tot=rows.reduce((a,r)=>a+r.amt,0), n=rows.reduce((a,r)=>a+r.n,0);
  const ms=monthsInRange().filter(mk=>all.some(r=>r.mk===mk));
  document.getElementById('rTot').textContent=fmt$(tot);
  document.getElementById('rTotSub').textContent= spanLbl(ms)+(gapFiles.length?' · '+gapNote(gapFiles):'');
  document.getElementById('rN').textContent=n.toLocaleString();
  flagTotal('rTot', gapFiles);
  flagTotal('rN', gapFiles);
  flagTotal('rAvg', gapFiles);
  document.getElementById('rAvg').textContent=n?fmt$(tot/n):'–';
  const perM=ms.map(mk=>rows.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const bi=perM.indexOf(Math.max(...perM,0));
  document.getElementById('rBest').textContent= ms.length?monLbl(ms[bi]):'–';
  document.getElementById('rBestSub').textContent= ms.length ? fmt$(perM[bi])+(gapFiles.length?' · incomplete':'') : '';
  flagTotal('rBest', gapFiles);
  chartBars(document.getElementById('chRevMonthly'),ms,perM,css('--in'),
    (mk,i)=>`<b>${monLbl(mk)}</b><br>Revenue: <b>${fmt$(perM[i])}</b><br>Deals: <b>${rows.filter(r=>r.mk===mk).reduce((a,r)=>a+r.n,0).toLocaleString()}</b>`);
  const byC={}, byCn={};
  rows.forEach(r=>{byC[r.c]=(byC[r.c]||0)+r.amt; byCn[r.c]=(byCn[r.c]||0)+r.n;});
  hbars2(document.getElementById('chRevCountry'),
    countryPairs().sort((a,b)=>b.rev-a.rev),'rev');
  const dls=Object.entries(byCn).map(([label,v])=>({label,v})).sort((a,b)=>b.v-a.v);
  revenueCountryGaps(state.market).forEach(g=>{
    if(!dls.some(d=>d.label===g.country)) dls.push({label:g.country, v:0, missing:true});
  });
  hbars(document.getElementById('chRevDeals'),dls,()=>css('--s3'),
    d=>`<b>${d.label}</b><br>Deals: <b>${d.v.toLocaleString()}</b>`,
    v=>v.toLocaleString('en-US'));
}
