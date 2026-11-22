/* Shared SVG chart primitives used by every tab.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js.
   Charts are drawn in the container's pixel width, so 11px labels stay 11px
   instead of shrinking with a fixed 1100-wide viewBox. */

function svgEl(w,h){ const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox',`0 0 ${w} ${h}`); s.setAttribute('width',String(w)); s.setAttribute('height',String(h));
  return s; }
function rect(s,x,y,w,h,fill,rTop){
  const p=document.createElementNS(s.namespaceURI,'path'); const r=Math.min(rTop||0,Math.max(w,0)/2,Math.abs(h)||0);
  const yy=y, hh=h;
  p.setAttribute('d',`M${x} ${yy+hh}V${yy+r}Q${x} ${yy} ${x+r} ${yy}H${x+w-r}Q${x+w} ${yy} ${x+w} ${yy+r}V${yy+hh}Z`);
  p.setAttribute('fill',fill); s.appendChild(p); return p; }
function line(s,x1,y1,x2,y2,cls){ const l=document.createElementNS(s.namespaceURI,'line');
  l.setAttribute('x1',x1);l.setAttribute('y1',y1);l.setAttribute('x2',x2);l.setAttribute('y2',y2);
  l.setAttribute('class',cls); s.appendChild(l); return l; }
function text(s,x,y,str,anchor,cls){ const t=document.createElementNS(s.namespaceURI,'text');
  t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('text-anchor',anchor||'start');
  if(cls)t.setAttribute('class',cls); t.textContent=str; s.appendChild(t); return t; }
function niceMax(v){ const p=Math.pow(10,Math.floor(Math.log10(v||1)));
  for(const m of [1,2,2.5,5,10]) if(m*p>=v) return m*p; return 10*p; }

/* Open months are faded and hatched so a bar is not read as a closed month. */
let hatchN = 0;
function fillFor(s, color, open){
  if(!open) return color;
  const id = 'hatch'+(++hatchN);
  let defs = s.querySelector('defs');
  if(!defs){
    defs = document.createElementNS(s.namespaceURI,'defs');
    s.insertBefore(defs, s.firstChild);
  }
  const pat = document.createElementNS(s.namespaceURI,'pattern');
  pat.setAttribute('id', id);
  pat.setAttribute('width','6'); pat.setAttribute('height','6');
  pat.setAttribute('patternUnits','userSpaceOnUse');
  pat.setAttribute('patternTransform','rotate(45)');
  const bg = document.createElementNS(s.namespaceURI,'rect');
  bg.setAttribute('width','6'); bg.setAttribute('height','6');
  bg.setAttribute('fill', color); bg.setAttribute('fill-opacity','0.28');
  const ln = document.createElementNS(s.namespaceURI,'line');
  ln.setAttribute('x1','0'); ln.setAttribute('y1','0'); ln.setAttribute('x2','0'); ln.setAttribute('y2','6');
  ln.setAttribute('stroke', color); ln.setAttribute('stroke-width','2');
  pat.appendChild(bg); pat.appendChild(ln); defs.appendChild(pat);
  return 'url(#'+id+')';
}
function markMonthLabel(node, mk){
  if(typeof isOpenMonth==='function' && isOpenMonth(mk)) node.setAttribute('class','mtdlab');
}
function bindChart(el, draw){
  const run = () => {
    const w = Math.round(el.clientWidth);
    if(w < 40 || el.__w === w) return;
    el.__w = w;
    draw(w);
  };
  el.__w = 0;
  run();
  if(typeof ResizeObserver==='undefined') return;
  if(el.__ro) el.__ro.disconnect();
  const ro = new ResizeObserver(run);
  ro.observe(el);
  el.__ro = ro;
}
/* "Nov '26" is about 48px. Skip ticks so neighbours do not collide, and always keep the last month. */
function showTick(i, n, slot){
  if(n<=1) return true;
  const step = Math.max(1, Math.ceil(52 / Math.max(slot, 1)));
  if(i===n-1) return true;
  if(i % step !== 0) return false;
  return (n-1-i) >= Math.ceil(step*0.7);
}
/* A flat series used to draw $0,$0,$1,$1,$1 because niceMax was floored at 1 and fmtK rounded the quarters together. */
function yTicks(peak){
  if(!(peak>0)) return { mx:0, ticks:[{v:0, lab:fmtK(0)}] };
  const mx = niceMax(peak);
  const ticks = [];
  const seen = new Set();
  for(let i=0;i<=4;i++){
    const v = mx*i/4;
    const lab = fmtK(v);
    if(seen.has(lab)) continue;
    seen.add(lab);
    ticks.push({ v, lab, i });
  }
  return { mx, ticks };
}
function drawY(s, peak, yOf, L, R, W){
  const { mx, ticks } = yTicks(peak);
  if(mx<=0){
    const y0 = yOf(0);
    line(s, L, y0, W-R, y0, 'bl');
    text(s, L-8, y0+4, fmtK(0), 'end');
    return mx;
  }
  for(let i=0;i<=4;i++){
    const v = mx*i/4;
    line(s, L, yOf(v), W-R, yOf(v), 'gl');
  }
  ticks.forEach(t => text(s, L-8, yOf(t.v)+4, t.lab, 'end'));
  line(s, L, yOf(0), W-R, yOf(0), 'bl');
  return mx;
}
function hitRect(s, x, y, w, h, mk){
  const hv=document.createElementNS(s.namespaceURI,'rect');
  hv.setAttribute('x',x); hv.setAttribute('y',y); hv.setAttribute('width',w); hv.setAttribute('height',h);
  hv.setAttribute('fill','transparent');
  if(mk) hv.dataset.mk = mk;
  s.appendChild(hv);
  return hv;
}

function chartMonthly(el, months, inflow, outflow){
  bindChart(el, W => {
    el.innerHTML='';
    const H=300,L=52,R=10,T=14,B=34, n=Math.max(months.length,1), cw=(W-L-R)/n;
    const peak=Math.max(0, ...inflow, ...outflow.map(v=>Math.abs(v)));
    const s=svgEl(W,H);
    const y=v=>{ const mx=s.__mx||0; return mx<=0 ? (H-B) : T+(H-T-B)*(1-v/mx); };
    s.__mx = peak>0 ? niceMax(peak) : 0;
    const mx = drawY(s, peak, y, L, R, W);
    s.__mx = mx;
    months.forEach((mk,i)=>{
      const x0=L+i*cw, bw=Math.min(26, Math.max(4,(cw-8)/2)), gap=2;
      const xin=x0+cw/2-bw-gap/2, xout=x0+cw/2+gap/2;
      const vi=inflow[i]||0, vo=Math.abs(outflow[i]||0);
      if(mx>0){
        rect(s,xin,y(vi),bw,H-B-y(vi),css('--in'),4);
        rect(s,xout,y(vo),bw,H-B-y(vo),css('--out'),4);
      }
      if(showTick(i, months.length, cw)) text(s,x0+cw/2,H-B+16,monLbl(mk),'middle');
      wireTip(hitRect(s,x0,T,cw,H-T-B,mk), () =>
        `<b>${monLbl(mk)}</b><br>In: <b>${fmt$(vi)}</b><br>Out: <b>${fmt$(-vo)}</b><br>Net: <b>${fmt$(vi-vo)}</b>`);
    });
    el.appendChild(s);
  });
}

function hbars(el, items, colorFn, labelFn, fmtFn){
  const fmtV = fmtFn || fmtK;
  bindChart(el, W => {
    el.innerHTML='';
    const rowH=30, L=Math.min(150, Math.max(92, Math.round(W*0.34))), R=Math.min(72, Math.round(W*0.2));
    const H=Math.max(items.length*rowH+8, 36);
    const peak=Math.max(0, ...items.map(d=>d.v||0));
    const mx=peak>0?niceMax(peak):1;
    const s=svgEl(W,H);
    if(!items.length){ text(s, 12, 22, 'No data in this range', 'start'); el.appendChild(s); return; }
    const maxCh = L<120 ? 14 : 20;
    items.forEach((d,i)=>{
      const yy=4+i*rowH, bw=(W-L-R)*(d.v||0)/mx;
      text(s,L-8,yy+rowH/2+4,d.label.length>maxCh?d.label.slice(0,maxCh-1)+'…':d.label,'end');
      const b=rect(s,L,yy+5,Math.max(bw, d.v>0?2:0),rowH-12,colorFn(d,i),0);
      b.setAttribute('rx','4');
      text(s,L+Math.max(bw,2)+6,yy+rowH/2+4,fmtV(d.v),'start','dl');
      wireTip(hitRect(s,0,yy,W,rowH), () => labelFn(d));
    });
    el.appendChild(s);
  });
}

/* Paired horizontal bars: revenue + payouts (+ marketing) per country.
   `primary` picks which metric is labelled on the right. */
function hbars2(el, items, primary){
  bindChart(el, W => {
    el.innerHTML='';
    const rowH=60, L=Math.min(128, Math.max(84, Math.round(W*0.30))), R=Math.min(96, Math.max(72, Math.round(W*0.22)));
    const H=Math.max(items.length*rowH+12, 36);
    const plot=Math.max(20, W-L-R);
    const peak=Math.max(0, ...items.flatMap(d=>[d.rev||0,d.pay||0,d.mkt||0]));
    const mx=peak>0?niceMax(peak):1;
    const s=svgEl(W,H);
    if(!items.length){ text(s, 12, 22, 'No data in this range', 'start'); el.appendChild(s); return; }
    const order = primary==='pay' ? [['pay','--out'],['rev','--in'],['mkt','--s3']] : [['rev','--in'],['pay','--out'],['mkt','--s3']];
    const maxCh = L<110 ? 12 : 17;
    items.forEach((d,i)=>{
      const yy=6+i*rowH;
      text(s,L-8,yy+rowH/2+4,d.label.length>maxCh?d.label.slice(0,maxCh-1)+'\u2026':d.label,'end');
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
      wireTip(hitRect(s,0,yy,W,rowH), () =>
        `<b>${d.label}</b><br>Revenue: <b>${fmt$(d.rev)}</b><br>Payouts: <b>${fmt$(d.pay)}</b><br>Marketing: <b>${fmt$(mk)}</b>`+
        (r===null?'<br><span style="opacity:.7">no payouts recorded</span>'
                 :`<br>Paid out: <b>${r.toFixed(1)}%</b>`)+
        `<br>After payouts &amp; ads: <b>${fmt$(d.rev-d.pay-mk)}</b>`+(d.rev>0?` (${((d.rev-d.pay-mk)/d.rev*100).toFixed(1)}%)`:''));
    });
    el.appendChild(s);
  });
}

function chartBars(el, months, vals, color, tipFn){
  bindChart(el, W => {
    el.innerHTML='';
    const H=300,L=52,R=10,T=14,B=34, n=Math.max(months.length,1), cw=(W-L-R)/n;
    const peak=Math.max(0, ...vals.map(v=>Math.abs(v||0)));
    const s=svgEl(W,H);
    const y=v=>{ const mx=s.__mx||0; return mx<=0 ? (H-B) : T+(H-T-B)*(1-v/mx); };
    s.__mx = peak>0 ? niceMax(peak) : 0;
    const mx = drawY(s, peak, y, L, R, W);
    s.__mx = mx;
    months.forEach((mk,i)=>{
      const x0=L+i*cw, bw=Math.min(44, Math.max(6, cw-10));
      const v=Math.abs(vals[i]||0);
      const open = typeof isOpenMonth==='function' && isOpenMonth(mk);
      if(mx>0) rect(s,x0+(cw-bw)/2,y(v),bw,H-B-y(v),fillFor(s,color,open),4);
      if(showTick(i, months.length, cw)) markMonthLabel(text(s,x0+cw/2,H-B+16,monLbl(mk),'middle'), mk);
      wireTip(hitRect(s,x0,T,cw,H-T-B,mk), () => tipFn(mk,i));
    });
    el.appendChild(s);
  });
}

/* Profit chart: revenue bar vs stacked payout+cost bar.
   `mkt` is HQ paid-ads. The bars stay revenue vs payouts+costs.
   The tooltip's operation profit matches the P&L: revenue − payouts − costs − marketing. */
function chartProf(el, months, rev, pay, cost, mkt){
  const hasMkt = Array.isArray(mkt);
  bindChart(el, W => {
    el.innerHTML='';
    const H=300,L=52,R=10,T=14,B=34, n=Math.max(months.length,1), cw=(W-L-R)/n;
    const peak=Math.max(0, ...rev, ...months.map((_,i)=>(pay[i]||0)+(cost[i]||0)));
    const s=svgEl(W,H);
    const y=v=>{ const mx=s.__mx||0; return mx<=0 ? (H-B) : T+(H-T-B)*(1-v/mx); };
    s.__mx = peak>0 ? niceMax(peak) : 0;
    const mx = drawY(s, peak, y, L, R, W);
    s.__mx = mx;
    months.forEach((mk,i)=>{
      const open = typeof isOpenMonth==='function' && isOpenMonth(mk);
      const x0=L+i*cw, bw=Math.min(26, Math.max(4,(cw-8)/2)), gap=2;
      const xr=x0+cw/2-bw-gap/2, xo=x0+cw/2+gap/2;
      if(mx>0){
        rect(s,xr,y(rev[i]||0),bw,H-B-y(rev[i]||0),fillFor(s,css('--in'),open),4);
        const yPay=y(pay[i]||0);
        rect(s,xo,yPay,bw,H-B-yPay,fillFor(s,css('--out'),open),0);
        const hCost=(H-T-B)*(cost[i]||0)/mx;
        if(hCost>2) rect(s,xo,yPay-2-hCost,bw,hCost,fillFor(s,css('--s3'),open),4);
      }
      if(showTick(i, months.length, cw)) markMonthLabel(text(s,x0+cw/2,H-B+16,monLbl(mk),'middle'), mk);
      const mkv = hasMkt ? (mkt[i]||0) : 0;
      const p = (rev[i]||0)-(pay[i]||0)-(cost[i]||0)-mkv;
      const head = `<b>${monLbl(mk)}</b>`+(open?' · '+mtdLabel(mk):'');
      const mktLine = hasMkt ? `<br>Marketing: <b>${mkv?fmt$(-mkv):'—'}</b>` : '';
      const profitLine = open
        ? `<br>Operation profit: <b>— (not closed)</b>`
        : `<br>Operation profit: <b>${fmt$(p)}</b>`;
      const costLine = open ? '<br>Costs: <b>— (not closed)</b>' : `<br>Costs: <b>${fmt$(-(cost[i]||0))}</b>`;
      wireTip(hitRect(s,x0,T,cw,H-T-B,mk), () =>
        `${head}<br>Revenue: <b>${fmt$(rev[i]||0)}</b><br>Payouts: <b>${fmt$(-(pay[i]||0))}</b>${costLine}${mktLine}${profitLine}`);
    });
    el.appendChild(s);
  });
}

function chartPaySplit(el, months, a, b){
  bindChart(el, W => {
    el.innerHTML='';
    const H=260,L=48,R=8,T=12,B=32, n=Math.max(months.length,1), cw=(W-L-R)/n;
    const peak=Math.max(0, ...a, ...b);
    const s=svgEl(W,H);
    const y=v=>{ const mx=s.__mx||0; return mx<=0 ? (H-B) : T+(H-T-B)*(1-v/mx); };
    s.__mx = peak>0 ? niceMax(peak) : 0;
    const mx = drawY(s, peak, y, L, R, W);
    s.__mx = mx;
    months.forEach((mk,i)=>{
      const open = typeof isOpenMonth==='function' && isOpenMonth(mk);
      const x0=L+i*cw, bw=Math.min(14, Math.max(3,(cw-6)/2)), gap=2;
      if(mx>0){
        rect(s,x0+cw/2-bw-gap/2,y(a[i]||0),bw,H-B-y(a[i]||0),fillFor(s,css('--out'),open),3);
        rect(s,x0+cw/2+gap/2,y(b[i]||0),bw,H-B-y(b[i]||0),fillFor(s,css('--s3'),open),3);
      }
      if(showTick(i, months.length, cw)) markMonthLabel(text(s,x0+cw/2,H-B+14,monLbl(mk),'middle'), mk);
      wireTip(hitRect(s,x0,T,cw,H-T-B,mk), () =>
        `<b>${monLbl(mk)}</b>${open?' · '+mtdLabel(mk):''}<br>Trader: <b>${fmt$(a[i]||0)}</b><br>Partner (IP): <b>${fmt$(b[i]||0)}</b>`);
    });
    el.appendChild(s);
  });
}
