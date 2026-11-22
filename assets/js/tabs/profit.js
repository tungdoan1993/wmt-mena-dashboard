/* Operation Profit tab — for the product (WMT/WG) and, for WMT, the selected market.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* ---------- operation profit view ---------- */
/* Everything below is for the selected market (state.market). MENA keeps its original rules
   (office costs of Dubai + Alexandria, HQ paid-ads month totals); other markets count only
   revenue, payouts and their own countries' paid-ads until an office is assigned to them. */
function payInRange(){ const ms=new Set(monthsInRange()); return PAY.filter(r=>ms.has(r.mk)&&inMarket(r)); }
function mktInRange(){ const ms=new Set(monthsInRange()); return MKTC.filter(r=>ms.has(r.mk)&&inMarket(r)); }
/* paid-ads for one month in the selected market. MENA = HQ month total minus spend already
   attributed to the other markets' countries (identical to the total while those are empty). */
function mktMonth(mk){
  if(state.market===ALL_ID) return MKT[mk]||0;
  if(state.market===CATCH_ALL){
    const other=MKTC.filter(r=>r.mk===mk&&marketOf(r.c)!==CATCH_ALL).reduce((a,r)=>a+r.amt,0);
    return (MKT[mk]||0)-other;
  }
  return MKTC.filter(r=>r.mk===mk&&inMarket(r)).reduce((a,r)=>a+r.amt,0);
}
/* Same month rule each market view already uses. All markets is the union of those,
   so a payout-only month MENA does not show stays hidden here too. */
function marketHasMonth(id, mk){
  const offs=new Set((MARKET_BY_ID[id].offices||[]).filter(o=>PRODUCT_OFFICES.wmt.includes(o)));
  const inM=r=>marketOf(r.c)===id;
  const hasRev=REV.some(r=>r.mk===mk&&inM(r));
  const hasExp=DATA.some(t=>t.mk===mk&&offs.has(t.office));
  if(id===CATCH_ALL) return hasRev||hasExp;
  const hasPay=PAY.some(r=>r.mk===mk&&inM(r));
  const hasMkt=MKTC.some(r=>r.mk===mk&&inM(r)&&r.amt);
  return hasRev||hasPay||hasMkt||hasExp;
}
function renderProfit(){
  const wg = state.product==='wg';
  const M = MARKET_BY_ID[state.market], catchAll = state.market===CATCH_ALL;
  const offList = wg ? PRODUCT_OFFICES.wg : (M.offices||[]).filter(o=>PRODUCT_OFFICES.wmt.includes(o));
  const offs = new Set(offList);
  const inProd = t => offs.has(t.office);
  const mRev = REV.filter(inMarket), mPay = PAY.filter(inMarket);
  const ms=monthsInRange().filter(mk=> wg
    ? DATA.some(t=>t.mk===mk&&inProd(t))
    : state.market===ALL_ID
      ? MARKETS.some(m=>marketHasMonth(m.id, mk))
      : marketHasMonth(state.market, mk));
  const rev=ms.map(mk=> wg?0:mRev.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const pay=ms.map(mk=> wg?0:mPay.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const cost=ms.map(mk=>-DATA.filter(t=>t.mk===mk&&inProd(t)&&t.amt<0&&!isInternal(t)).reduce((a,t)=>a+usd(t),0));
  const mkt=ms.map(mk=> wg?0:mktMonth(mk));
  const open=ms.map(mk=>!wg && isOpenMonth(mk));

  const noData = !wg && !mRev.length && !mPay.length && !MKTC.some(inMarket) && !offList.length;
  el('profEmpty').style.display = noData?'':'none';
  el('profBody').style.display = noData?'none':'';
  el('profEmptyTxt').textContent =
    `No ${M.label} revenue, payouts or marketing have been loaded yet, so there is no operation profit to show. `+
    `It fills in automatically once ${M.label} rows are added to the data files.`;
  el('pNetLbl').textContent = wg ? 'Operation profit' : `Operation profit · ${M.label}`;
  document.getElementById('pRevSub').textContent = wg?'WeGolden — no revenue yet (build phase)'
    : state.market===ALL_ID ? 'MENA + Pakistan + Ethiopia + Nigeria'
    : catchAll ? 'WMT MENA (HubSpot report)' : `WMT ${M.label}`;
  document.getElementById('pCostSub').textContent = wg?'WeGolden Egypt office expenses'
    : offList.length ? offList.map(o=>OFF_SHORT[o]).join(' + ')+' office expenses' : `no office assigned to ${M.label} yet`;
  document.getElementById('pPayCard').style.display = wg?'none':'';
  document.getElementById('cardPayCountry').style.display = wg?'none':'';
  document.getElementById('cardPaySplit').style.display = wg?'none':'';
  document.getElementById('chProfTitle').innerHTML = wg?'Revenue against costs':'Revenue against payouts &amp; costs';
  document.getElementById('chProfNote').textContent = wg
    ?'Operation profit = revenue − costs. WeGolden has no revenue yet, so profit equals −costs.'
    : state.market===ALL_ID
      ?'All markets: MENA (HubSpot + CRM Syria & Iran) + Pakistan + Ethiopia + Nigeria, using the same definitions as each market. Office costs are the offices assigned to those markets. HQ-paid marketing is the full paid-ads total. WeGolden is excluded.'
      : catchAll
      ?'Chart shows office costs only. HQ-paid marketing is a separate line — see the KPI above and the Monthly P&L. WeGolden is excluded from all WMT figures.'
      :`Chart shows office costs only (none assigned to ${M.label} yet). HQ-paid marketing for ${M.label} countries is a separate line — see the KPI above and the Monthly P&L.`;
  const sum=(arr,pred)=>arr.reduce((a,v,i)=>a+(pred(i)?v:0),0);
  const isC=i=>!open[i];
  const tr=sum(rev,()=>true), tp=sum(pay,()=>true);
  const trC=sum(rev,isC), tpC=sum(pay,isC), tcC=sum(cost,isC), tmC=sum(mkt,isC);
  const netC=trC-tpC-tcC-tmC;
  const openMks=ms.filter((_,i)=>open[i]), closedMks=ms.filter((_,i)=>!open[i]);
  const openOnly=openMks.length>0 && !closedMks.length;
  const mtdNote=openMks.map(mk=>monLbl(mk)+' '+mtdLabel(mk)).join(', ');
  const incl=openMks.length?' · incl. '+openMks.map(mtdLabel).join(', '):'';
  document.getElementById('pRev').textContent=fmt$(tr);
  document.getElementById('pRevSub').textContent += incl;
  document.getElementById('pPay').textContent=fmt$(-tp);
  document.getElementById('pPaySub').textContent='trader + partner (IP)'+incl;
  document.getElementById('pCost').textContent=openOnly?'—':fmt$(-tcC);
  if(openOnly) document.getElementById('pCostSub').textContent='not closed · '+mtdNote;
  else if(openMks.length) document.getElementById('pCostSub').textContent += ' · through '+monLbl(closedMks[closedMks.length-1]);
  const nMkt=closedMks.filter(mk=>(state.market===ALL_ID||catchAll)?MKT[mk]:mktMonth(mk)>0).length;
  document.getElementById('pMktCard').style.display = wg?'none':'';
  document.getElementById('pMkt').textContent = openOnly||!tmC ? '—' : fmt$(-tmC);
  document.getElementById('pMktSub').textContent = openOnly
    ? 'not closed · '+mtdNote
    : tmC
      ? (nMkt===closedMks.length ? 'paid ads · HQ-paid' : `paid ads · HQ-paid · ${nMkt} of ${closedMks.length} months tracked`)
        +(openMks.length?' · open month excluded':'')
      : 'paid ads · tracked from Mar 2026';
  document.getElementById('thMkt').style.display='';
  const pn=document.getElementById('pNet');
  if(openOnly){
    pn.textContent='—'; pn.style.color='';
    document.getElementById('pNetSub').textContent='not closed · '+mtdNote;
  }else{
    pn.textContent=fmt$(netC); pn.style.color=netC>=0?'var(--good)':'var(--bad)';
    document.getElementById('pNetSub').textContent=(trC?(netC/trC*100).toFixed(1)+'% margin · ':'')+
      spanLbl(closedMks)+(mtdNote?' · '+mtdNote+' excluded':'')+
      (!wg&&tmC&&nMkt<closedMks.length?' · marketing partial':'');
  }
  let pnl = wg
    ? 'Operation profit = revenue − costs'
    : 'Operation profit = revenue − payouts − costs − marketing. Marketing is HQ-paid paid-ads spend (Facebook USD + Google CAD→USD), tracked from Aug 2025.';
  if(!wg && openMks.length){
    const be = openMks.length>1 ? 'are' : 'is';
    const poss = openMks.length>1 ? 'their' : 'its';
    pnl += ' '+openMks.map(mk=>monLbl(mk)+' ('+mtdLabel(mk)+')').join(', ')+' '+be+
      (openOnly
        ? ' not closed, so profit and margin are withheld. Revenue and payouts are month-to-date.'
        : ' not closed: '+poss+' revenue and payouts are included, and '+be+' excluded from operation profit, margin, costs and marketing.');
  }
  document.getElementById('pnlNote').textContent = pnl;
  document.getElementById('legPay').style.display = wg?'none':'';
  const legOpen=document.getElementById('legOpen');
  if(legOpen) legOpen.style.display = openMks.length ? '' : 'none';
  if(openMks.length){
    const note=document.getElementById('chProfNote');
    note.textContent += ' Hatched bars are '+(openMks.length>1?'open months':'the open month')+' ('+mtdNote+') — operation profit is not closed.';
  }
  if(noData) return;
  chartProf(document.getElementById('chProf'),ms,rev,pay,cost,wg?null:mkt);
  if(wg){ renderProfitTable(ms,rev,pay,cost,mkt,open,true); return; }
  hbars2(document.getElementById('chPayCountry'),
    countryPairs().sort((a,b)=>b.pay-a.pay),'pay');
  const payT=ms.map(mk=>mPay.filter(r=>r.mk===mk&&r.kind==='Trader').reduce((a,r)=>a+r.amt,0));
  const payI=ms.map(mk=>mPay.filter(r=>r.mk===mk&&r.kind!=='Trader').reduce((a,r)=>a+r.amt,0));
  chartPaySplit(document.getElementById('chPaySplit'),ms,payT,payI);
  renderProfitTable(ms,rev,pay,cost,mkt,open,false);
}
function renderProfitTable(ms,rev,pay,cost,mkt,open,wg){
  const sum=(arr,pred)=>arr.reduce((a,v,i)=>a+(pred(i)?v:0),0);
  const isC=i=>!open[i];
  const tr=sum(rev,()=>true), tp=sum(pay,()=>true);
  const trC=sum(rev,isC), tpC=sum(pay,isC), tc=sum(cost,isC), tm=sum(mkt,isC);
  const net=trC-tpC-tc-tm;
  const openOnly=ms.length>0 && open.every(Boolean);
  const tb=document.getElementById('pTbody'); tb.innerHTML='';
  const profitCells=(p, base, withheld)=> withheld
    ? `<td class="num dim">— (not closed)</td><td class="num dim">— (not closed)</td>`
    : `<td class="num" style="color:${p>=0?'var(--good)':'var(--bad)'}">${fmt$(p)}</td>
       <td class="num">${base?Math.round(p/base*100)+'%':'—'}</td>`;
  ms.forEach((mk,i)=>{
    const o=open[i];
    const p=rev[i]-pay[i]-cost[i]-mkt[i];
    const trw=document.createElement('tr');
    if(o) trw.className='open';
    trw.innerHTML=`<td>${monLbl(mk)}${o?` <span class="mtd">${mtdLabel(mk)}</span>`:''}</td><td class="num">${fmt$(rev[i])}</td>
      <td class="num">${wg?'—':fmt$(-pay[i])}</td>
      <td class="num">${o?'—':fmt$(-cost[i])}</td>
      <td class="num">${wg||!mkt[i]?'—':fmt$(-mkt[i])}</td>
      ${profitCells(p, rev[i], o)}`;
    tb.appendChild(trw);
  });
  const tot=document.createElement('tr'); tot.className='tot';
  tot.innerHTML=`<td>Total</td><td class="num">${fmt$(tr)}</td><td class="num">${wg?'—':fmt$(-tp)}</td>
    <td class="num">${openOnly?'—':fmt$(-tc)}</td><td class="num">${wg||!tm?'—':fmt$(-tm)}</td>
    ${profitCells(net, trC, openOnly)}`;
  tb.appendChild(tot);
}
