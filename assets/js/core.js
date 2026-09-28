/* Core: data bindings, helpers, state, routing, filtering, tooltip.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

const DATA = MENA.DATA;
const REV = MENA.REV;
const PAY = MENA.PAY;
const RATES = MENA.RATES;

/* ---------- helpers ---------- */
function usd(t){
  if(t.cur==='AED') return t.amt/RATES.AED;
  if(t.cur==='EGP') return t.amt/(t.office==='WMT Alexandria'?RATES.EGP_ALEX:RATES.EGP_WG);
  return t.amt;
}
const fmt$ = v => (v<0?'−$':'$')+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:0});
const fmtK = v => { const a=Math.abs(v);
  return (v<0?'−$':'$')+(a>=1e6?(a/1e6).toFixed(1)+'M':a>=1e3?Math.round(a/1e3)+'k':Math.round(a)); };
const fmtNat = t => t.amt.toLocaleString('en-US',{maximumFractionDigits:2})+' '+t.cur;
const monLbl = mk => { const [y,m]=mk.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+" '"+y.slice(2); };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const OFF_COLOR = {'Dubai':'--o-dubai','WMT Alexandria':'--o-alex','WeGolden Egypt':'--o-wg'};
/* Paid-ads spend attributed to MENA, PAID CENTRALLY BY HQ — not a Dubai/Alexandria office
   cost and deliberately absent from the expense tabs and the bank reconciliation.
   Source: report.wemastertrade.com/dashboard/paid-ads (region MENA). WMT only.
   Only months present here are deducted; months with no entry show "—". */
const MKT = MENA.MKT;
const MKTC_M = MENA.MKTC_M;  /* paid-ads spend by month x country, USD (FB USD + Google CAD converted) */
const MKTC = Object.entries(MKTC_M).flatMap(([mk,o])=>Object.entries(o).map(([c,amt])=>({mk,c,amt})));
const MKT_FROM = MENA.MKT_FROM;
const OFF_SHORT = {'Dubai':'Dubai','WMT Alexandria':'Alexandria','WeGolden Egypt':'WeGolden'};

/* ---------- state & filtering ---------- */
const PRODUCT_OFFICES = { wmt:['Dubai','WMT Alexandria'], wg:['WeGolden Egypt'] };
const state = { product:'wmt', offices:new Set(PRODUCT_OFFICES.wmt), range:'all', q:'', rows:50, tab:'exp' };
/* ---------- per-product URLs ----------
   Root, /wmt/ and /wg/ all serve the same page. The page reads the product from
   the last path segment on load, and rewrites the address bar when the product
   button is clicked, so a link can be copied straight out of the browser.
   Skipped on file:// so local preview still works. */
const PRODUCT_TITLE = { wmt:'WeMasterTrade', wg:'WeGolden' };
const TAB_SLUG  = { exp:'expenses', rev:'revenue', prof:'operation-profit' };
const SLUG_TAB  = { expenses:'exp', revenue:'rev', 'operation-profit':'prof' };
const TAB_TITLE = { exp:'Expenses', rev:'MENA Revenue', prof:'Operation Profit' };
function productFromPath(){
  const seg = location.pathname.replace(/\/+$/,'').split('/').pop().toLowerCase();
  return (seg==='wg'||seg==='wmt') ? seg : null;
}
const MON_SLUG = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
/* period slugs: aug26 = single month Aug-2026; ytd / 3m / 6m; omitted = all time */
function rangeToSlug(r){
  if(r==='all') return '';
  if(r.startsWith('m:')){ const [y,m]=r.slice(2).split('-'); return MON_SLUG[+m-1]+y.slice(2); }
  return r;
}
function slugToRange(sl){
  if(!sl) return 'all';
  if(sl==='ytd'||sl==='3m'||sl==='6m') return sl;
  const m = /^([a-z]{3})(\d{2})$/.exec(sl);
  if(!m) return null;
  const mi = MON_SLUG.indexOf(m[1]); if(mi<0) return null;
  const mk = '20'+m[2]+'-'+String(mi+1).padStart(2,'0');
  return (typeof ALL_MONTHS!=='undefined' && ALL_MONTHS.includes(mk)) ? 'm:'+mk : null;
}
function hashParts(){
  const h = decodeURIComponent((location.hash||'').replace(/^#/,'')).toLowerCase().split('/');
  return { tab: SLUG_TAB[h[0]] || null, range: slugToRange(h[1]||'') };
}
function tabFromHash(){ return hashParts().tab; }
/* Address bar mirrors product AND tab, so any view can be copied and shared:
   .../wmt/#operation-profit/aug26  ·  .../wg/#expenses/ytd  */
function syncURL(){
  const p = state.product, t = state.tab;
  document.title = PRODUCT_TITLE[p] + ' · ' + TAB_TITLE[t] + ' — MENA Dashboard';
  if(location.protocol==='file:') return;
  const parts = location.pathname.replace(/\/+$/,'').split('/');
  const last = (parts[parts.length-1]||'').toLowerCase();
  if(last==='wmt'||last==='wg') parts.pop();
  const path = parts.join('/') + '/' + p + '/';
  const rs = rangeToSlug(state.range);
  try{ history.replaceState(null,'',path + location.search + '#' + TAB_SLUG[t] + (rs?'/'+rs:'')); }catch(e){}
}
function setProduct(p){
  state.product=p; state.offices=new Set(PRODUCT_OFFICES[p]); state.rows=50;
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.toggle('on',b.dataset.product===p));
  document.querySelectorAll('.chip[data-office]').forEach(c=>{
    const mine=PRODUCT_OFFICES[p].includes(c.dataset.office);
    c.classList.toggle('on',mine);
  });
  document.querySelector('.tab[data-tab="rev"]').style.display = p==='wmt'?'':'none';
  if(p==='wg'&&state.tab==='rev') state.tab='exp';
  setTab(state.tab);
}
const ALL_MONTHS = [...new Set([...DATA.map(t=>t.mk), ...REV.map(r=>r.mk)])].sort();
function setTab(t){
  state.tab=t;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='view-'+t));
  document.querySelectorAll('.chip[data-office]').forEach(c=>{
    const mine=PRODUCT_OFFICES[state.product].includes(c.dataset.office);
    c.style.display = (t==='exp'&&mine&&PRODUCT_OFFICES[state.product].length>1)?'':'none';
  });
  syncURL();
  render();
}
function monthsInRange(){
  if(state.range==='all') return ALL_MONTHS;
  if(state.range==='ytd') return ALL_MONTHS.filter(m=>m>='2026-01');
  if(state.range.startsWith('m:')) return [state.range.slice(2)];
  const n = state.range==='3m'?3:6;
  return ALL_MONTHS.slice(-n);
}
/* populate single-month options (newest first) */
{
  const og=document.getElementById('monthOpts');
  [...ALL_MONTHS].reverse().forEach(mk=>{
    const o=document.createElement('option');
    o.value='m:'+mk; o.textContent=monLbl(mk); og.appendChild(o);
  });
}
function filtered(){
  const ms=new Set(monthsInRange());
  return DATA.filter(t=>state.offices.has(t.office)&&ms.has(t.mk));
}
const isInternal = t => t.type==='Internal Transfer';

/* ---------- tooltip ---------- */
const tip=document.getElementById('tip');
function showTip(html,x,y){ tip.innerHTML=html; tip.style.display='block';
  const w=tip.offsetWidth,h=tip.offsetHeight;
  tip.style.left=Math.min(x+14,innerWidth-w-8)+'px';
  tip.style.top=Math.max(8,Math.min(y-h-10,innerHeight-h-8))+'px'; }
function hideTip(){ tip.style.display='none'; }
