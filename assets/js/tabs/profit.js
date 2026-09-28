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
  if(state.market===CATCH_ALL){
    const other=MKTC.filter(r=>r.mk===mk&&marketOf(r.c)!==CATCH_ALL).reduce((a,r)=>a+r.amt,0);
    return (MKT[mk]||0)-other;
  }
  return MKTC.filter(r=>r.mk===mk&&inMarket(r)).reduce((a,r)=>a+r.amt,0);
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
    : catchAll
      ? (mRev.some(r=>r.mk===mk)||DATA.some(t=>t.mk===mk&&inProd(t)))
      : (mRev.some(r=>r.mk===mk)||mPay.some(r=>r.mk===mk)||mktMonth(mk)>0||DATA.some(t=>t.mk===mk&&inProd(t))));
  const rev=ms.map(mk=> wg?0:mRev.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const pay=ms.map(mk=> wg?0:mPay.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const cost=ms.map(mk=>-DATA.filter(t=>t.mk===mk&&inProd(t)&&t.amt<0&&!isInternal(t)).reduce((a,t)=>a+usd(t),0));
  const mkt=ms.map(mk=> wg?0:mktMonth(mk));

  const noData = !wg && !mRev.length && !mPay.length && !MKTC.some(inMarket) && !offList.length;
  el('profEmpty').style.display = noData?'':'none';
  el('profBody').style.display = noData?'none':'';
  el('profEmptyTxt').textContent =
    `No ${M.label} revenue, payouts or marketing have been loaded yet, so there is no operation profit to show. `+
    `It fills in automatically once ${M.label} rows are added to the data files.`;
  el('pNetLbl').textContent = wg ? 'Operation profit' : `Operation profit · ${M.label}`;
  document.getElementById('pRevSub').textContent = wg?'WeGolden — no revenue yet (build phase)'
    : catchAll ? 'WMT MENA (HubSpot report)' : `WMT ${M.label}`;
  document.getElementById('pCostSub').textContent = wg?'WeGolden Egypt office expenses'
    : offList.length ? offList.map(o=>OFF_SHORT[o]).join(' + ')+' office expenses' : `no office assigned to ${M.label} yet`;
  document.getElementById('pPayCard').style.display = wg?'none':'';
  document.getElementById('cardPayCountry').style.display = wg?'none':'';
  document.getElementById('cardPaySplit').style.display = wg?'none':'';
  document.getElementById('chProfTitle').innerHTML = wg?'Revenue against costs':'Revenue against payouts &amp; costs';
  document.getElementById('chProfNote').textContent = wg
    ?'Operation profit = revenue − costs. WeGolden has no revenue yet, so profit equals −costs.'
    : catchAll
      ?'Chart shows office costs only. HQ-paid marketing is a separate line — see the KPI above and the Monthly P&L. WeGolden is excluded from all WMT figures.'
      :`Chart shows office costs only (none assigned to ${M.label} yet). HQ-paid marketing for ${M.label} countries is a separate line — see the KPI above and the Monthly P&L.`;
  const tr=rev.reduce((a,b)=>a+b,0), tp=pay.reduce((a,b)=>a+b,0), tc=cost.reduce((a,b)=>a+b,0);
  const tm=mkt.reduce((a,b)=>a+b,0);
  document.getElementById('pRev').textContent=fmt$(tr);
  document.getElementById('pPay').textContent=fmt$(-tp);
  document.getElementById('pCost').textContent=fmt$(-tc);
  const nMkt=ms.filter(mk=>catchAll?MKT[mk]:mktMonth(mk)>0).length;
  document.getElementById('pMktCard').style.display = wg?'none':'';
  document.getElementById('pMkt').textContent = tm?fmt$(-tm):'—';
  document.getElementById('pMktSub').textContent = tm
    ? (nMkt===ms.length ? 'paid ads · HQ-paid' : `paid ads · HQ-paid · ${nMkt} of ${ms.length} months tracked`)
    : 'paid ads · tracked from Mar 2026';
  document.getElementById('thMkt').style.display='';
  const net=tr-tp-tc-tm, pn=document.getElementById('pNet');
  pn.textContent=fmt$(net); pn.style.color=net>=0?'var(--good)':'var(--bad)';
  document.getElementById('pNetSub').textContent=(tr?(net/tr*100).toFixed(1)+'% margin · ':'')+
    spanLbl(ms)+(!wg&&tm&&nMkt<ms.length?' · marketing partial':'');
  document.getElementById('pnlNote').textContent = wg
    ? 'Operation profit = revenue − costs'
    : 'Operation profit = revenue − payouts − costs − marketing. Marketing is HQ-paid paid-ads spend (Facebook USD + Google CAD→USD), tracked from Aug 2025.';
  document.getElementById('legPay').style.display = wg?'none':'';
  if(noData) return;
  chartProf(document.getElementById('chProf'),ms,rev,pay,cost);
  if(wg){ renderProfitTable(ms,rev,pay,cost,mkt,true); return; }
  hbars2(document.getElementById('chPayCountry'),
    countryPairs().sort((a,b)=>b.pay-a.pay),'pay');
  const payT=ms.map(mk=>mPay.filter(r=>r.mk===mk&&r.kind==='Trader').reduce((a,r)=>a+r.amt,0));
  const payI=ms.map(mk=>mPay.filter(r=>r.mk===mk&&r.kind!=='Trader').reduce((a,r)=>a+r.amt,0));
  chartPaySplit(document.getElementById('chPaySplit'),ms,payT,payI);
  renderProfitTable(ms,rev,pay,cost,mkt,false);
}
function renderProfitTable(ms,rev,pay,cost,mkt,wg){
  const tr=rev.reduce((a,b)=>a+b,0), tp=pay.reduce((a,b)=>a+b,0), tc=cost.reduce((a,b)=>a+b,0);
  const tm=mkt.reduce((a,b)=>a+b,0);
  const net=tr-tp-tc-tm;
  const tb=document.getElementById('pTbody'); tb.innerHTML='';
  ms.forEach((mk,i)=>{
    const p=rev[i]-pay[i]-cost[i]-mkt[i];
    const trw=document.createElement('tr');
    trw.innerHTML=`<td>${monLbl(mk)}</td><td class="num">${fmt$(rev[i])}</td>
      <td class="num">${wg?'—':fmt$(-pay[i])}</td>
      <td class="num">${fmt$(-cost[i])}</td>
      <td class="num">${wg||!mkt[i]?'—':fmt$(-mkt[i])}</td>
      <td class="num" style="color:${p>=0?'var(--good)':'var(--bad)'}">${fmt$(p)}</td>
      <td class="num">${rev[i]?Math.round(p/rev[i]*100)+'%':'—'}</td>`;
    tb.appendChild(trw);
  });
  const tot=document.createElement('tr'); tot.className='tot';
  tot.innerHTML=`<td>Total</td><td class="num">${fmt$(tr)}</td><td class="num">${wg?'—':fmt$(-tp)}</td>
    <td class="num">${fmt$(-tc)}</td><td class="num">${wg||!tm?'—':fmt$(-tm)}</td>
    <td class="num" style="color:${net>=0?'var(--good)':'var(--bad)'}">${fmt$(net)}</td>
    <td class="num">${tr?Math.round(net/tr*100)+'%':'—'}</td>`;
  tb.appendChild(tot);
}
