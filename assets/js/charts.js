/* Shared SVG chart primitives used by every tab.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* ---------- charts (SVG) ---------- */
function svgEl(w,h){ const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox',`0 0 ${w} ${h}`); s.setAttribute('width','100%'); return s; }
function rect(s,x,y,w,h,fill,rTop){
  const p=document.createElementNS(s.namespaceURI,'path'); const r=Math.min(rTop,w/2,Math.abs(h));
  p.setAttribute('d',`M${x} ${y+h}V${y+r}Q${x} ${y} ${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h}Z`);
  p.setAttribute('fill',fill); s.appendChild(p); return p; }
function line(s,x1,y1,x2,y2,cls){ const l=document.createElementNS(s.namespaceURI,'line');
  l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);
  l.setAttribute('class',cls); s.appendChild(l); return l; }
function text(s,x,y,str,anchor,cls){ const t=document.createElementNS(s.namespaceURI,'text');
  t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('text-anchor',anchor||'start');
  if(cls)t.setAttribute('class',cls); t.textContent=str; s.appendChild(t); return t; }
function niceMax(v){ const p=Math.pow(10,Math.floor(Math.log10(v||1)));
  for(const m of [1,2,2.5,5,10]) if(m*p>=v) return m*p; return 10*p; }

function chartMonthly(el, months, inflow, outflow){
  el.innerHTML='';
  const W=1100,H=300,L=52,R=10,T=14,B=30, cw=(W-L-R)/Math.max(months.length,1);
  const mx=niceMax(Math.max(...inflow,...outflow.map(Math.abs),1));
  const s=svgEl(W,H); const y=v=>T+(H-T-B)*(1-v/mx);
  for(let i=0;i<=4;i++){ const v=mx*i/4; line(s,L,y(v),W-R,y(v),i?'gl':'gl');
    text(s,L-8,y(v)+4,fmtK(v),'end'); }
  line(s,L,H-B,W-R,H-B,'bl');
  months.forEach((mk,i)=>{
    const x0=L+i*cw, bw=Math.min(26,(cw-10)/2);
    const gap=2, xin=x0+cw/2-bw-gap/2, xout=x0+cw/2+gap/2;
    const vi=inflow[i], vo=Math.abs(outflow[i]);
    const bi=rect(s,xin,y(vi),bw,H-B-y(vi),css('--in'),4);
    const bo=rect(s,xout,y(vo),bw,H-B-y(vo),css('--out'),4);
    text(s,x0+cw/2,H-B+16,monLbl(mk),'middle');
    const hover=document.createElementNS(s.namespaceURI,'rect');
    hover.setAttribute('x',x0);hover.setAttribute('y',T);hover.setAttribute('width',cw);
    hover.setAttribute('height',H-T-B);hover.setAttribute('fill','transparent');
    hover.addEventListener('mousemove',e=>showTip(
      `<b>${monLbl(mk)}</b><br>In: <b>${fmt$(vi)}</b><br>Out: <b>${fmt$(-vo)}</b><br>Net: <b>${fmt$(vi-vo)}</b>`,e.clientX,e.clientY));
    hover.addEventListener('mouseleave',hideTip); s.appendChild(hover);
  });
  el.appendChild(s);
}

function hbars(el, items, colorFn, labelFn, fmtFn){
  const fmtV = fmtFn || fmtK;
  el.innerHTML='';
  const W=520, rowH=30, L=150, R=64, H=items.length*rowH+8;
  const mx=niceMax(Math.max(...items.map(d=>d.v),1));
  const s=svgEl(W,H);
  items.forEach((d,i)=>{
    const yy=4+i*rowH, bw=(W-L-R)*d.v/mx;
    text(s,L-8,yy+rowH/2+4,d.label.length>20?d.label.slice(0,19)+'…':d.label,'end');
    const b=rect(s,L,yy+5,Math.max(bw,2),rowH-12,colorFn(d,i),0);
    b.setAttribute('rx','4');
    text(s,L+Math.max(bw,2)+6,yy+rowH/2+4,fmtV(d.v),'start','dl');
    const hv=document.createElementNS(s.namespaceURI,'rect');
    hv.setAttribute('x',0);hv.setAttribute('y',yy);hv.setAttribute('width',W);hv.setAttribute('height',rowH);
    hv.setAttribute('fill','transparent');
    hv.addEventListener('mousemove',e=>showTip(labelFn(d),e.clientX,e.clientY));
    hv.addEventListener('mouseleave',hideTip); s.appendChild(hv);
  });
  el.appendChild(s);
}

/* ---------- paired horizontal bars: revenue + payouts per country ----------
   `primary` picks which metric leads (drawn first, and labelled on the right).
   Both bars share one scale so the comparison is honest. Payout ratio is direct-
   labelled on every row, so identity never rests on colour alone. */
function hbars2(el, items, primary){
  el.innerHTML='';
  const W=520, rowH=60, L=128, R=96, H=items.length*rowH+12;
  const plot=W-L-R;
  const mx=niceMax(Math.max(...items.flatMap(d=>[d.rev,d.pay,d.mkt||0]),1));
  const s=svgEl(W,H);
  const order = primary==='pay' ? [['pay','--out'],['rev','--in'],['mkt','--s3']] : [['rev','--in'],['pay','--out'],['mkt','--s3']];
  items.forEach((d,i)=>{
    const yy=6+i*rowH;
    text(s,L-8,yy+rowH/2+4,d.label.length>17?d.label.slice(0,16)+'\u2026':d.label,'end');
    order.forEach(([k,tok],j)=>{
      const v=d[k]||0, bw=Math.max(v/mx*plot, v>0?3:0);
      if(bw<=0) return;
      const b=rect(s,L,yy+8+j*15,bw,12,css(tok),0);
      b.setAttribute('rx','4');
    });
    const pv=primary==='pay'?d.pay:d.rev;
    text(s,W-R+8,yy+18,fmtK(pv),'start','dl');
    const hasPay=d.pay>0, r=d.rev>0&&hasPay?(d.pay/d.rev*100):null;
    const rt=text(s,W-R+8,yy+32,r===null?'ratio n/a':`${r.toFixed(0)}% out`,'start','dl');
    rt.setAttribute('opacity','.72');
    const mk=d.mkt||0;
    const mt=text(s,W-R+8,yy+46,mk>0?`ads ${fmtK(mk)}`:'no ads','start','dl');
    mt.setAttribute('opacity','.72');
    const hv=document.createElementNS(s.namespaceURI,'rect');
    hv.setAttribute('x',0);hv.setAttribute('y',yy);hv.setAttribute('width',W);hv.setAttribute('height',rowH);
    hv.setAttribute('fill','transparent');
    hv.addEventListener('mousemove',e=>showTip(
      `<b>${d.label}</b><br>Revenue: <b>${fmt$(d.rev)}</b><br>Payouts: <b>${fmt$(d.pay)}</b><br>Marketing: <b>${fmt$(mk)}</b>`+
      (r===null?'<br><span style="opacity:.7">no payouts recorded</span>'
               :`<br>Paid out: <b>${r.toFixed(1)}%</b>`)+
      `<br>After payouts &amp; ads: <b>${fmt$(d.rev-d.pay-mk)}</b>`+(d.rev>0?` (${((d.rev-d.pay-mk)/d.rev*100).toFixed(1)}%)`:''),
      e.clientX,e.clientY));
    hv.addEventListener('mouseleave',hideTip); s.appendChild(hv);
  });
  el.appendChild(s);
}

/* ---------- single-series bar chart ---------- */
function chartBars(el, months, vals, color, tipFn){
  el.innerHTML='';
  const W=1100,H=300,L=52,R=10,T=14,B=30, cw=(W-L-R)/Math.max(months.length,1);
  const mx=niceMax(Math.max(...vals.map(Math.abs),1));
  const s=svgEl(W,H); const y=v=>T+(H-T-B)*(1-v/mx);
  for(let i=0;i<=4;i++){ const v=mx*i/4; line(s,L,y(v),W-R,y(v),'gl'); text(s,L-8,y(v)+4,fmtK(v),'end'); }
  line(s,L,H-B,W-R,H-B,'bl');
  months.forEach((mk,i)=>{
    const x0=L+i*cw, bw=Math.min(44,cw-14);
    const v=Math.abs(vals[i]);
    rect(s,x0+(cw-bw)/2,y(v),bw,H-B-y(v),color,4);
    text(s,x0+cw/2,H-B+16,monLbl(mk),'middle');
    const hv=document.createElementNS(s.namespaceURI,'rect');
    hv.setAttribute('x',x0);hv.setAttribute('y',T);hv.setAttribute('width',cw);hv.setAttribute('height',H-T-B);
    hv.setAttribute('fill','transparent');
    hv.addEventListener('mousemove',e=>showTip(tipFn(mk,i),e.clientX,e.clientY));
    hv.addEventListener('mouseleave',hideTip); s.appendChild(hv);
  });
  el.appendChild(s);
}

/* ---------- profit chart: revenue bar vs stacked payout+cost bar ---------- */
function chartProf(el, months, rev, pay, cost){
  el.innerHTML='';
  const W=1100,H=300,L=52,R=10,T=14,B=30, cw=(W-L-R)/Math.max(months.length,1);
  const mx=niceMax(Math.max(...rev,...months.map((_,i)=>pay[i]+cost[i]),1));
  const s=svgEl(W,H); const y=v=>T+(H-T-B)*(1-v/mx);
  for(let i=0;i<=4;i++){ const v=mx*i/4; line(s,L,y(v),W-R,y(v),'gl'); text(s,L-8,y(v)+4,fmtK(v),'end'); }
  line(s,L,H-B,W-R,H-B,'bl');
  months.forEach((mk,i)=>{
    const x0=L+i*cw, bw=Math.min(26,(cw-10)/2), gap=2;
    const xr=x0+cw/2-bw-gap/2, xo=x0+cw/2+gap/2;
    rect(s,xr,y(rev[i]),bw,H-B-y(rev[i]),css('--in'),4);
    // stacked: payout at bottom, cost on top with 2px gap
    const yPay=y(pay[i]);
    rect(s,xo,yPay,bw,H-B-yPay,css('--out'),0);
    const hCost=(H-T-B)*cost[i]/mx;
    if(hCost>2) rect(s,xo,yPay-2-hCost,bw,hCost,css('--s3'),4);
    text(s,x0+cw/2,H-B+16,monLbl(mk),'middle');
    const hv=document.createElementNS(s.namespaceURI,'rect');
    hv.setAttribute('x',x0);hv.setAttribute('y',T);hv.setAttribute('width',cw);hv.setAttribute('height',H-T-B);
    hv.setAttribute('fill','transparent');
    const p=rev[i]-pay[i]-cost[i];
    hv.addEventListener('mousemove',e=>showTip(
      `<b>${monLbl(mk)}</b><br>Revenue: <b>${fmt$(rev[i])}</b><br>Payouts: <b>${fmt$(-pay[i])}</b><br>Costs: <b>${fmt$(-cost[i])}</b><br>Profit: <b>${fmt$(p)}</b>`,e.clientX,e.clientY));
    hv.addEventListener('mouseleave',hideTip); s.appendChild(hv);
  });
  el.appendChild(s);
}

function chartPaySplit(el, months, a, b){
  el.innerHTML='';
  const W=520,H=260,L=48,R=8,T=12,B=28, cw=(W-L-R)/Math.max(months.length,1);
  const mx=niceMax(Math.max(...a,...b,1));
  const s=svgEl(W,H); const y=v=>T+(H-T-B)*(1-v/mx);
  for(let i=0;i<=4;i++){ const v=mx*i/4; line(s,L,y(v),W-R,y(v),'gl'); text(s,L-6,y(v)+4,fmtK(v),'end'); }
  line(s,L,H-B,W-R,H-B,'bl');
  months.forEach((mk,i)=>{
    const x0=L+i*cw, bw=Math.min(14,(cw-6)/2), gap=2;
    rect(s,x0+cw/2-bw-gap/2,y(a[i]),bw,H-B-y(a[i]),css('--out'),3);
    rect(s,x0+cw/2+gap/2,y(b[i]),bw,H-B-y(b[i]),css('--s3'),3);
    if(months.length<=13 && i%2===0) text(s,x0+cw/2,H-B+14,monLbl(mk),'middle');
    const hv=document.createElementNS(s.namespaceURI,'rect');
    hv.setAttribute('x',x0);hv.setAttribute('y',T);hv.setAttribute('width',cw);hv.setAttribute('height',H-T-B);
    hv.setAttribute('fill','transparent');
    hv.addEventListener('mousemove',e=>showTip(
      `<b>${monLbl(mk)}</b><br>Trader: <b>${fmt$(a[i])}</b><br>Partner (IP): <b>${fmt$(b[i])}</b>`,e.clientX,e.clientY));
    hv.addEventListener('mouseleave',hideTip); s.appendChild(hv);
  });
  el.appendChild(s);
}
