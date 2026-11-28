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
  try {
    if(state.market===CATCH_ALL){
      const other=MKTC.filter(r=>r.mk===mk&&marketOf(r.c)!==CATCH_ALL).reduce((a,r)=>a+r.amt,0);
      return (MKT[mk]||0)-other;
    }
    return MKTC.filter(r=>r.mk===mk&&inMarket(r)).reduce((a,r)=>a+r.amt,0);
  } catch(e){ console.warn('marketing month', mk, e); return 0; }
}
function renderProfit(){
  const wg = state.product==='wg';
  const M = MARKET_BY_ID[state.market], catchAll = state.market===CATCH_ALL;
  const offList = wg ? PRODUCT_OFFICES.wg : (M.offices||[]).filter(o=>PRODUCT_OFFICES.wmt.includes(o));
  const offs = new Set(offList);
  const inProd = t => offs.has(t.office);
  const mRev = REV.filter(inMarket), mPay = PAY.filter(inMarket);
  const revGap = wg ? [] : revenueGapsForMarket(state.market);
  const revGapFiles = revGap.map(g=>g.file);
  const revHard = revGap.filter(g=>!g.restored);
  const revFiles = wg ? [] : revenueFilesForMarket(state.market);
  const revWhollyUnknown = !wg && revFiles.length>0 && revFiles.every(fileHardDown);
  const payHard = !wg && fileHardDown('payouts.json');
  const mktHard = !wg && fileHardDown('marketing.json');
  const expGaps = offList.length ? expenseGapsInRange() : [];
  const expHard = new Set(expGaps.filter(e=>fileHardDown(e.file)).map(e=>e.mk));
  const problemFiles = [...revGapFiles];
  if(!wg && fileDown('payouts.json')) problemFiles.push('payouts.json');
  if(!wg && fileDown('marketing.json')) problemFiles.push('marketing.json');
  expGaps.forEach(e=>{ if(problemFiles.indexOf(e.file)<0) problemFiles.push(e.file); });
  if(MENA.manifestOk===false && problemFiles.indexOf('manifest.json')<0) problemFiles.unshift('manifest.json');
  const ms=monthsInRange().filter(mk=> wg
    ? DATA.some(t=>t.mk===mk&&inProd(t)) || expHard.has(mk)
    : catchAll
      ? (mRev.some(r=>r.mk===mk)||DATA.some(t=>t.mk===mk&&inProd(t))||expHard.has(mk))
      : (mRev.some(r=>r.mk===mk)||mPay.some(r=>r.mk===mk)||(!mktHard && mktMonth(mk)>0)||DATA.some(t=>t.mk===mk&&inProd(t))||expHard.has(mk)));
  const rev=ms.map(mk=> wg?0 : revWhollyUnknown?null : mRev.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const pay=ms.map(mk=> wg?0 : payHard?null : mPay.filter(r=>r.mk===mk).reduce((a,r)=>a+r.amt,0));
  const cost=ms.map(mk=> expHard.has(mk) ? null : -DATA.filter(t=>t.mk===mk&&inProd(t)&&t.amt<0&&!isInternal(t)).reduce((a,t)=>a+usd(t),0));
  const mkt=ms.map(mk=> wg?0 : mktHard?null : mktMonth(mk));

  const noData = !wg && !mRev.length && !mPay.length && !MKTC.some(inMarket) && !offList.length && !revGap.length && MENA.manifestOk!==false;
  const blocked = MENA.manifestOk===false || (!wg && noData && revGap.length);
  el('profEmpty').style.display = (noData||blocked)?'':'none';
  el('profBody').style.display = (noData||blocked)?'none':'';
  const emptyH = el('profEmpty').querySelector('h2');
  if(emptyH) emptyH.textContent = blocked ? missLabel(problemFiles[0]||'manifest.json') : 'No data yet';
  el('profEmptyTxt').textContent = blocked ? 'Not updated' :
    `No ${M.label} revenue, payouts or marketing have been loaded yet, so there is no operation profit to show. `+
    `It fills in automatically once ${M.label} rows are added to the data files.`;
  if(blocked) return;
  placeNotice('profBody', problemFiles.length ? missHtml(problemFiles) : '');
  showUnmapped('profBody');
  el('pNetLbl').textContent = wg ? 'Operation profit' : `Operation profit · ${M.label}`;
  document.getElementById('pRevSub').textContent = wg?'WeGolden — no revenue yet (build phase)'
    : catchAll ? 'WMT MENA (HubSpot report)' : `WMT ${M.label}`;
  if(wg){
    const eg=officeSpend('WeGolden Egypt', ms), ir=officeSpend('WeGolden Iran', ms);
    document.getElementById('pCostSub').textContent =
      `WeGolden office expenses (Egypt + Iran) · WG Egypt ${fmt$(-eg)} · WG Iran ${fmt$(-ir)}`;
  } else {
    document.getElementById('pCostSub').textContent = offList.length
      ? offList.map(o=>offLabel(o)).join(' + ')+' office expenses'
      : `no office assigned to ${M.label} yet`;
  }
  document.getElementById('pPayCard').style.display = wg?'none':'';
  document.getElementById('cardPayCountry').style.display = wg?'none':'';
  document.getElementById('cardPaySplit').style.display = wg?'none':'';
  document.getElementById('chProfTitle').innerHTML = wg?'Revenue against costs':'Revenue against payouts &amp; costs';
  document.getElementById('chProfNote').textContent = wg
    ?'Operation profit = revenue − costs. WeGolden has no revenue yet, so profit equals −costs.'
    : catchAll
      ?'Chart shows office costs only. HQ-paid marketing is a separate line — see the KPI above and the Monthly P&L. WeGolden is excluded from all WMT figures.'
      :`Chart shows office costs only (none assigned to ${M.label} yet). HQ-paid marketing for ${M.label} countries is a separate line — see the KPI above and the Monthly P&L.`;
  const sum=a=>a.reduce((s,v)=>s+(v==null?0:v),0);
  const tr=sum(rev), tp=sum(pay), tc=sum(cost), tm=sum(mkt);
  const costUnknown=cost.some(v=>v==null);
  const costPartial=costUnknown && cost.some(v=>v!=null);
  document.getElementById('pRev').textContent = revWhollyUnknown ? '—' : fmt$(tr);
  document.getElementById('pPay').textContent = payHard ? '—' : fmt$(-tp);
  document.getElementById('pCost').textContent = (costUnknown && !costPartial) ? '—' : fmt$(-tc);
  const nMkt=mktHard?0:ms.filter(mk=>catchAll?MKT[mk]:mktMonth(mk)>0).length;
  document.getElementById('pMktCard').style.display = wg?'none':'';
  if(mktHard){
    document.getElementById('pMkt').textContent='—';
    document.getElementById('pMktSub').textContent=missLabel('marketing.json')+' · Not updated';
  } else {
    document.getElementById('pMkt').textContent = tm?fmt$(-tm):'—';
    document.getElementById('pMktSub').textContent = (tm
      ? (nMkt===ms.length ? 'paid ads · HQ-paid' : `paid ads · HQ-paid · ${nMkt} of ${ms.length} months tracked`)
      : 'paid ads · tracked from Mar 2026') + (fileDown('marketing.json') ? ' · '+gapNote(['marketing.json']) : '');
  }
  document.getElementById('thMkt').style.display='';
  const uncomputable = payHard || mktHard || costUnknown || revWhollyUnknown || revHard.length>0;
  const net=tr-tp-tc-tm, pn=document.getElementById('pNet');
  if(uncomputable){
    pn.textContent='—'; pn.style.color='';
    document.getElementById('pNetSub').textContent=gapNote(problemFiles);
  } else {
    pn.textContent=fmt$(net); pn.style.color=net>=0?'var(--good)':'var(--bad)';
    document.getElementById('pNetSub').textContent=(tr?(net/tr*100).toFixed(1)+'% margin · ':'')+
      spanLbl(ms)+(!wg&&tm&&nMkt<ms.length?' · marketing partial':'')+
      (problemFiles.length?' · '+gapNote(problemFiles):'');
  }
  flagTotal('pRev', revGapFiles);
  flagTotal('pPay', payHard||fileDown('payouts.json')?['payouts.json']:[]);
  flagTotal('pCost', expGaps.map(e=>e.file));
  flagTotal('pMkt', mktHard||fileDown('marketing.json')?['marketing.json']:[]);
  flagTotal('pNet', problemFiles);
  if(revGapFiles.length) document.getElementById('pRevSub').textContent =
    (document.getElementById('pRevSub').textContent||'') + (document.getElementById('pRevSub').textContent?' · ':'') + gapNote(revGapFiles);
  if(payHard) document.getElementById('pPaySub').textContent=missLabel('payouts.json')+' · Not updated';
  else if(fileDown('payouts.json')) document.getElementById('pPaySub').textContent='trader + partner (IP) · '+gapNote(['payouts.json']);
  if(costUnknown) document.getElementById('pCostSub').textContent =
    document.getElementById('pCostSub').textContent+' · '+gapNote(expGaps.map(e=>e.file));
  document.getElementById('pnlNote').textContent = wg
    ? 'Operation profit = revenue − costs'
    : 'Operation profit = revenue − payouts − costs − marketing. Marketing is HQ-paid paid-ads spend (Facebook USD + Google CAD→USD), tracked from Aug 2025.';
  document.getElementById('legPay').style.display = wg?'none':'';
  if(noData) return;
  chartProf(document.getElementById('chProf'),ms,rev,pay,cost, revHard.length>0);
  if(wg){ renderProfitTable(ms,rev,pay,cost,mkt,true); return; }
  if(payHard){
    placeNoticeBefore('chPayCountry', missHtml(['payouts.json']));
    document.getElementById('chPayCountry').innerHTML='';
    document.getElementById('chPaySplit').innerHTML='';
  } else {
    placeNoticeBefore('chPayCountry', fileDown('payouts.json') ? missHtml(['payouts.json']) : '');
    hbars2(document.getElementById('chPayCountry'),
      countryPairs().sort((a,b)=>b.pay-a.pay),'pay');
    const payT=ms.map(mk=>mPay.filter(r=>r.mk===mk&&r.kind==='Trader').reduce((a,r)=>a+r.amt,0));
    const payI=ms.map(mk=>mPay.filter(r=>r.mk===mk&&r.kind!=='Trader').reduce((a,r)=>a+r.amt,0));
    chartPaySplit(document.getElementById('chPaySplit'),ms,payT,payI);
  }
  renderProfitTable(ms,rev,pay,cost,mkt,false, revHard.length>0);
}
function renderProfitTable(ms,rev,pay,cost,mkt,wg, incomplete){
  const known = a => a.every(v => v!=null);
  const sum = a => a.reduce((s,v)=>s+(v==null?0:v),0);
  const allKnown = [rev,pay,cost,mkt].every(known) && !incomplete;
  const tr=sum(rev), tp=sum(pay), tc=sum(cost), tm=sum(mkt);
  const net=allKnown ? tr-tp-tc-tm : null;
  const tb=document.getElementById('pTbody'); tb.innerHTML='';
  ms.forEach((mk,i)=>{
    const unk = incomplete || rev[i]==null || pay[i]==null || cost[i]==null || mkt[i]==null;
    const p = unk ? null : rev[i]-pay[i]-cost[i]-mkt[i];
    const trw=document.createElement('tr');
    if(!unk){
      trw.innerHTML=`<td>${monLbl(mk)}</td><td class="num">${fmt$(rev[i])}</td>
      <td class="num">${wg?'—':fmt$(-pay[i])}</td>
      <td class="num">${fmt$(-cost[i])}</td>
      <td class="num">${wg||!mkt[i]?'—':fmt$(-mkt[i])}</td>
      <td class="num" style="color:${p>=0?'var(--good)':'var(--bad)'}">${fmt$(p)}</td>
      <td class="num">${rev[i]?Math.round(p/rev[i]*100)+'%':'—'}</td>`;
    } else {
      const cell=(v,neg)=>v==null?'—':fmt$(neg?-v:v);
      trw.innerHTML=`<td>${monLbl(mk)}</td><td class="num">${cell(rev[i])}</td>
      <td class="num">${wg?'—':cell(pay[i],true)}</td>
      <td class="num">${cell(cost[i],true)}</td>
      <td class="num">${mkt[i]==null||wg||!mkt[i]?'—':fmt$(-mkt[i])}</td>
      <td class="num">—</td><td class="num">—</td>`;
    }
    tb.appendChild(trw);
  });
  const tot=document.createElement('tr'); tot.className='tot';
  if(allKnown){
    tot.innerHTML=`<td>Total</td><td class="num">${fmt$(tr)}</td><td class="num">${wg?'—':fmt$(-tp)}</td>
    <td class="num">${fmt$(-tc)}</td><td class="num">${wg||!tm?'—':fmt$(-tm)}</td>
    <td class="num" style="color:${net>=0?'var(--good)':'var(--bad)'}">${fmt$(net)}</td>
    <td class="num">${tr?Math.round(net/tr*100)+'%':'—'}</td>`;
  } else {
    const col=(arr,neg,hide)=> hide||!known(arr) ? '—' : fmt$(neg?-sum(arr):sum(arr));
    tot.innerHTML=`<td>Total · incomplete</td><td class="num">${col(rev)}</td><td class="num">${wg?'—':col(pay,true)}</td>
    <td class="num">${col(cost,true)}</td><td class="num">${wg?'—':col(mkt,true)}</td>
    <td class="num">—</td><td class="num">—</td>`;
  }
  tb.appendChild(tot);
}
