/* Operation Profit tab.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* ---------- operation profit view ---------- */
function payInRange(){ const ms=new Set(monthsInRange()); return PAY.filter(r=>ms.has(r.mk)); }
function mktInRange(){ const ms=new Set(monthsInRange()); return MKTC.filter(r=>ms.has(r.mk)); }
function renderProfit(){
  const wg = state.product==='wg';
  const offs = new Set(PRODUCT_OFFICES[state.product]);
  const inProd = t => offs.has(t.office);
  const ms=monthsInRange().filter(mk=> wg
    ? DATA.some(t=>t.mk===mk&&inProd(t))
    : (REV.some(r=>r.mk===mk)||DATA.some(t=>t.mk===mk&&inProd(t))));
  const rev=ms.map(mk=> wg?0:REV.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const pay=ms.map(mk=> wg?0:PAY.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const cost=ms.map(mk=>-DATA.filter(t=>t.mk===mk&&inProd(t)&&t.amt<0&&!isInternal(t)).reduce((a,t)=>a+usd(t),0));
  const mkt=ms.map(mk=> wg?0:(MKT[mk]||0));
  document.getElementById('pRevSub').textContent = wg?'WeGolden — no revenue yet (build phase)':'WMT MENA (HubSpot report)';
  document.getElementById('pCostSub').textContent = wg?'WeGolden Egypt office expenses':'Dubai + Alexandria office expenses';
  document.getElementById('pPayCard').style.display = wg?'none':'';
  document.getElementById('cardPayCountry').style.display = wg?'none':'';
  document.getElementById('cardPaySplit').style.display = wg?'none':'';
  document.getElementById('chProfTitle').innerHTML = wg?'Revenue against costs':'Revenue against payouts &amp; costs';
  document.getElementById('chProfNote').textContent = wg
    ?'Operation profit = revenue − costs. WeGolden has no revenue yet, so profit equals −costs.'
    :'Chart shows office costs only. HQ-paid marketing is a separate line — see the KPI above and the Monthly P&L. WeGolden is excluded from all WMT figures.';
  const tr=rev.reduce((a,b)=>a+b,0), tp=pay.reduce((a,b)=>a+b,0), tc=cost.reduce((a,b)=>a+b,0);
  const tm=mkt.reduce((a,b)=>a+b,0);
  document.getElementById('pRev').textContent=fmt$(tr);
  document.getElementById('pPay').textContent=fmt$(-tp);
  document.getElementById('pCost').textContent=fmt$(-tc);
  const nMkt=ms.filter(mk=>MKT[mk]).length;
  document.getElementById('pMktCard').style.display = wg?'none':'';
  document.getElementById('pMkt').textContent = tm?fmt$(-tm):'—';
  document.getElementById('pMktSub').textContent = tm
    ? (nMkt===ms.length ? 'paid ads · HQ-paid' : `paid ads · HQ-paid · ${nMkt} of ${ms.length} months tracked`)
    : 'paid ads · tracked from Mar 2026';
  document.getElementById('thMkt').style.display='';
  const net=tr-tp-tc-tm, pn=document.getElementById('pNet');
  pn.textContent=fmt$(net); pn.style.color=net>=0?'var(--good)':'var(--bad)';
  document.getElementById('pNetSub').textContent=(tr?(net/tr*100).toFixed(1)+'% margin · ':'')+
    (ms.length===1?monLbl(ms[0]):`${monLbl(ms[0])} – ${monLbl(ms[ms.length-1])}`)+
    (!wg&&tm&&nMkt<ms.length?' · marketing partial':'');
  document.getElementById('pnlNote').textContent = wg
    ? 'Operation profit = revenue − costs'
    : 'Operation profit = revenue − payouts − costs − marketing. Marketing is HQ-paid paid-ads spend (Facebook USD + Google CAD→USD), tracked from Aug 2025.';
  document.getElementById('legPay').style.display = wg?'none':'';
  chartProf(document.getElementById('chProf'),ms,rev,pay,cost);
  if(wg){ renderProfitTable(ms,rev,pay,cost,mkt,true); return; }
  hbars2(document.getElementById('chPayCountry'),
    countryPairs().sort((a,b)=>b.pay-a.pay),'pay');
  const payT=ms.map(mk=>PAY.filter(r=>r.mk===mk&&r.kind==='Trader').reduce((a,r)=>a+r.amt,0));
  const payI=ms.map(mk=>PAY.filter(r=>r.mk===mk&&r.kind!=='Trader').reduce((a,r)=>a+r.amt,0));
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
