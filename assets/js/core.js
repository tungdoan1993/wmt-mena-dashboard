/* Core: data bindings, helpers, state, routing, filtering, tooltip.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

const DATA = Array.isArray(MENA.DATA) ? MENA.DATA : [];
const REV = Array.isArray(MENA.REV) ? MENA.REV : [];
const PAY = Array.isArray(MENA.PAY) ? MENA.PAY : [];
const RATES = MENA.RATES || {};

/* ---------- markets ----------
   Configured in data/manifest.json -> markets. Each market owns a list of countries; the one
   market with countries "*" (MENA) takes every country no other market claims. Revenue, payouts
   and marketing are split by market on the row's country. Office costs count toward a market only
   if the office is listed in that market's "offices". */
const MARKETS = (Array.isArray(MENA.MARKETS) && MENA.MARKETS.length) ? MENA.MARKETS
  : [{ id:'mena', label:'MENA', slug:'mena', countries:'*', offices:['Dubai','WMT Alexandria'] }];
const MARKET_BY_ID = Object.fromEntries(MARKETS.map(m=>[m.id,m]));
const MARKET_BY_SLUG = Object.fromEntries(MARKETS.map(m=>[m.slug,m.id]));
const CATCH_ALL = (MARKETS.find(m=>m.countries==='*')||MARKETS[0]).id;
const COUNTRY_MARKET = {};
MARKETS.forEach(m=>{ if(Array.isArray(m.countries)) m.countries.forEach(c=>{ COUNTRY_MARKET[c]=m.id; }); });
const marketOf = c => COUNTRY_MARKET[c] || CATCH_ALL;
const inMarket = r => marketOf(r.c)===state.market;

/* ---------- helpers ---------- */
function usd(t){
  try {
    if(!t || typeof t.amt!=='number' || !isFinite(t.amt)){ console.warn('skipping expense row with no amount'); return 0; }
    if(t.cur==='AED'){
      if(typeof RATES.AED!=='number' || !RATES.AED){ console.warn('AED rate missing'); return 0; }
      return t.amt/RATES.AED;
    }
    if(t.cur==='EGP'){
      const rate = t.office==='WMT Alexandria' ? RATES.EGP_ALEX : RATES.EGP_WG;
      if(typeof rate!=='number' || !rate){ console.warn('EGP rate missing'); return 0; }
      return t.amt/rate;
    }
    return t.amt;
  } catch (e) { console.warn('usd', e); return 0; }
}
const fmt$ = v => (v<0?'−$':'$')+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:0});
const fmtK = v => { const a=Math.abs(v);
  return (v<0?'−$':'$')+(a>=1e6?(a/1e6).toFixed(1)+'M':a>=1e3?Math.round(a/1e3)+'k':Math.round(a)); };
const fmtNat = t => t.amt.toLocaleString('en-US',{maximumFractionDigits:2})+' '+t.cur;
const monLbl = mk => { if(!mk) return '–'; const [y,m]=mk.split('-');
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+" '"+y.slice(2); };
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
/* el(): elements added with the markets release; a detached stand-in when an older cached
   index.html is still showing, so a mixed old-page / new-script load never throws */
const NOEL = document.createElement('div');
const el = id => document.getElementById(id) || NOEL;
const spanLbl = ms => !ms.length ? 'no data in range' : ms.length===1 ? monLbl(ms[0]) : `${monLbl(ms[0])} – ${monLbl(ms[ms.length-1])}`;
const OFF_COLOR = {'Dubai':'--o-dubai','WMT Alexandria':'--o-alex','WeGolden Egypt':'--o-wg'};
/* Paid-ads spend attributed to MENA, PAID CENTRALLY BY HQ — not a Dubai/Alexandria office
   cost and deliberately absent from the expense tabs and the bank reconciliation.
   Source: report.wemastertrade.com/dashboard/paid-ads (region MENA). WMT only.
   Only months present here are deducted; months with no entry show "—". */
const MKT = MENA.MKT || {};
const MKTC_M = MENA.MKTC_M || {};  /* paid-ads spend by month x country, USD (FB USD + Google CAD converted) */
const MKTC = Object.entries(MKTC_M).flatMap(([mk,o])=>Object.entries(o).map(([c,amt])=>({mk,c,amt})));
const MKT_FROM = MENA.MKT_FROM;
const OFF_SHORT = {'Dubai':'Dubai','WMT Alexandria':'Alexandria','WeGolden Egypt':'WeGolden'};

/* ---------- state & filtering ---------- */
const PRODUCT_OFFICES = { wmt:['Dubai','WMT Alexandria'], wg:['WeGolden Egypt'] };
const state = { product:'wmt', offices:new Set(PRODUCT_OFFICES.wmt), range:'all', q:'', rows:50, tab:'exp', market:CATCH_ALL };
/* ---------- per-product URLs ----------
   Root, /wmt/ and /wg/ all serve the same page. The page reads the product from
   the last path segment on load, and rewrites the address bar when the product
   button is clicked, so a link can be copied straight out of the browser.
   Skipped on file:// so local preview still works. */
const PRODUCT_TITLE = { wmt:'WeMasterTrade', wg:'WeGolden' };
const TAB_SLUG  = { exp:'expenses', prof:'operation-profit' };      /* the revenue tab's slug is the market slug */
const SLUG_TAB  = { expenses:'exp', revenue:'rev', 'operation-profit':'prof' };   /* "revenue" = old links -> catch-all market */
const TAB_TITLE = { exp:'Expenses', rev:'Revenue', prof:'Operation Profit' };
const mktLabel = () => (MARKET_BY_ID[state.market] || MARKETS[0]).label;
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
/* hash = segments in any order: a tab slug, a market slug, a period slug.
   #pakistan = Pakistan revenue · #operation-profit/nigeria/aug26 · #revenue (old links) = MENA revenue */
function hashParts(){
  const segs = decodeURIComponent((location.hash||'').replace(/^#/,'')).toLowerCase().split('/').filter(Boolean);
  let tab=null, market=null, range='all';
  segs.forEach(sg=>{
    if(SLUG_TAB[sg]) tab=SLUG_TAB[sg];
    else if(MARKET_BY_SLUG[sg]) market=MARKET_BY_SLUG[sg];
    else { const r=slugToRange(sg); if(r) range=r; }
  });
  if(market && !tab) tab='rev';
  if(tab==='rev' && !market) market=CATCH_ALL;
  return { tab, market, range };
}
function tabFromHash(){ return hashParts().tab; }
/* Address bar mirrors product AND tab, so any view can be copied and shared:
   .../wmt/#operation-profit/aug26  ·  .../wg/#expenses/ytd  */
function syncURL(){
  const p = state.product, t = state.tab;
  const wmt = p==='wmt';
  document.title = PRODUCT_TITLE[p] + ' · ' + (t==='rev' ? mktLabel()+' Revenue' : TAB_TITLE[t] + (wmt&&t==='prof'&&state.market!==CATCH_ALL?' · '+mktLabel():'')) + ' — MENA Dashboard';
  if(location.protocol==='file:') return;
  const parts = location.pathname.replace(/\/+$/,'').split('/');
  const last = (parts[parts.length-1]||'').toLowerCase();
  if(last==='wmt'||last==='wg') parts.pop();
  const path = parts.join('/') + '/' + p + '/';
  const rs = rangeToSlug(state.range);
  const mslug = MARKET_BY_ID[state.market].slug;
  const head = t==='rev' ? mslug : TAB_SLUG[t] + (wmt&&t==='prof'&&state.market!==CATCH_ALL ? '/'+mslug : '');
  try{ history.replaceState(null,'',path + location.search + '#' + head + (rs?'/'+rs:'')); }catch(e){}
}
function setProduct(p){
  state.product=p; state.offices=new Set(PRODUCT_OFFICES[p]); state.rows=50;
  document.querySelectorAll('.pbtn').forEach(b=>b.classList.toggle('on',b.dataset.product===p));
  document.querySelectorAll('.chip[data-office]').forEach(c=>{
    const mine=PRODUCT_OFFICES[p].includes(c.dataset.office);
    c.classList.toggle('on',mine);
  });
  el('markets').style.display = p==='wmt'?'':'none';
  const oldRevTab = document.querySelector('.tab[data-tab="rev"]');      /* only on a cached pre-markets page */
  if(oldRevTab) oldRevTab.style.display = p==='wmt'?'':'none';
  if(p==='wg'&&state.tab==='rev') state.tab='exp';
  setTab(state.tab);
}
/* Declared expense months stay on the axis even when that month's file failed to load,
   so a gap is marked instead of the range silently sliding onto the months that did load. */
const DECLARED_MONTHS = (MENA.expenseMonths || []).map(e=>e && e.mk).filter(Boolean);
const ALL_MONTHS = [...new Set([...DATA.map(t=>t.mk), ...REV.map(r=>r.mk), ...DECLARED_MONTHS])].sort();
function setTab(t){
  state.tab=t;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  paintMarkets();
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('on',v.id==='view-'+t));
  document.querySelectorAll('.chip[data-office]').forEach(c=>{
    const mine=PRODUCT_OFFICES[state.product].includes(c.dataset.office);
    c.style.display = (t==='exp'&&mine&&PRODUCT_OFFICES[state.product].length>1)?'':'none';
  });
  syncURL();
  render();
}
/* market buttons: filled = showing that market's revenue; ring = market the profit tab uses */
function paintMarkets(){
  document.querySelectorAll('.mkt').forEach(b=>{
    const me = b.dataset.market===state.market;
    b.classList.toggle('on', me && state.tab==='rev');
    b.classList.toggle('cur', me && state.tab==='prof');
    b.setAttribute('aria-pressed', me && state.tab!=='exp' ? 'true' : 'false');
  });
}
/* clicking a market: on the profit tab switch the profit to that market, otherwise open its revenue */
function setMarket(id){
  state.market = id;
  setTab(state.tab==='prof' ? 'prof' : 'rev');
}
{
  const box=document.getElementById('marketBtns');
  if(box) MARKETS.forEach(m=>{
    const b=document.createElement('button');
    b.className='mkt'; b.type='button'; b.dataset.market=m.id; b.title=m.label+' revenue';
    b.innerHTML=`<span class="full">${m.label}</span><span class="short">${m.short||m.label}</span>`;
    b.addEventListener('click',()=>setMarket(m.id));
    box.appendChild(b);
  });
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
function hideTip(){ if(tip) tip.style.display='none'; }

/* ---------- fault isolation ----------
   MENA.STATUS[file] = {file, ok, error, restored}. A restored file still counts as not live:
   its figures are last-confirmed and every total that includes them is marked incomplete. */
function escHtml(s){
  return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function fileStatus(file){ return (MENA.STATUS && MENA.STATUS[file]) || null; }
function fileDown(file){ const s=fileStatus(file); return !!(s && !s.ok); }
function fileHardDown(file){ const s=fileStatus(file); return !!(s && !s.ok && !s.restored); }
function missLabel(file){ return 'Chưa cập nhật — '+file+' lỗi'; }
function gapNote(files){
  const list=[].concat(files||[]).filter(Boolean);
  if(!list.length) return '';
  return 'incomplete · '+list.map(missLabel).join(' · ')+' · Not updated';
}
function missHtml(files, extra){
  const list=[].concat(files||[]).filter(Boolean);
  if(!list.length && !extra) return '';
  const style='margin:12px 0;padding:12px 16px;border-radius:16px;background:#fff2eb;color:#8c491a;font-size:13.5px;line-height:1.45';
  const rows=list.map(f=>{
    const st=fileStatus(f), stale=st&&st.restored;
    return '<div data-missing="'+escHtml(f)+'"'+(stale?' data-restored="'+escHtml(st.restored)+'"':'')+'>'+
      '<b>'+escHtml(missLabel(f))+'</b> <span style="opacity:.85">· Not updated</span>'+
      (stale?' <span>· last confirmed figures</span>':'')+'</div>';
  }).join('');
  const more=extra?'<div>'+escHtml(extra)+'</div>':'';
  return '<div class="src-miss" role="status" style="'+style+'">'+rows+more+'</div>';
}
function placeNotice(hostId, html){
  const host=document.getElementById(hostId);
  if(!host) return;
  let n=host.querySelector(':scope > .src-miss-slot');
  if(!html){ if(n) n.remove(); return; }
  if(!n){ n=document.createElement('div'); n.className='src-miss-slot'; host.insertBefore(n, host.firstChild); }
  if(n.innerHTML!==html) n.innerHTML=html;
}
function placeNoticeBefore(elId, html){
  const node=document.getElementById(elId);
  if(!node) return;
  const prev=node.previousElementSibling;
  if(prev && prev.classList.contains('src-miss-slot')){
    if(!html) prev.remove();
    else if(prev.innerHTML!==html) prev.innerHTML=html;
    return;
  }
  if(!html) return;
  const n=document.createElement('div');
  n.className='src-miss-slot'; n.innerHTML=html;
  node.parentNode.insertBefore(n, node);
}
function flagTotal(id, files){
  const node=document.getElementById(id);
  if(!node) return;
  if(files && files.length) node.dataset.incomplete=files.join(',');
  else delete node.dataset.incomplete;
}
function expenseGapsInRange(){
  const list=MENA.expenseMonths||[];
  const ms=new Set(monthsInRange());
  const all=state.range==='all';
  return list.filter(e=>e && e.mk && fileDown(e.file) && (all || ms.has(e.mk)));
}
function revenueFilesForMarket(id){
  const M=MARKET_BY_ID[id]||{};
  const files=[];
  if(M.file) files.push(M.file);
  if(id===CATCH_ALL && files.indexOf('revenue/crm-syria-iran.json')<0) files.push('revenue/crm-syria-iran.json');
  return files;
}
function knownCountries(file){
  if(file==='revenue/crm-syria-iran.json') return ['Syria','Iran'];
  const M=MARKETS.find(m=>m.file===file);
  if(M && Array.isArray(M.countries)) return M.countries.slice();
  return [];
}
function revenueGapsForMarket(id){
  return revenueFilesForMarket(id).filter(fileDown).map(fileStatus);
}
function revenueCountryGaps(id){
  const out=[];
  revenueFilesForMarket(id).forEach(f=>{
    if(!fileHardDown(f)) return;
    knownCountries(f).forEach(c=>out.push({country:c, file:f}));
  });
  return out;
}
/* Totals checks warn only. A throw here must not stop the page. */
function reconcile(){
  try {
    if(MENA.marketingOk && MKT && MKTC_M){
      Object.keys(MKT).forEach(mk=>{
        const bucket=MKTC_M[mk];
        if(!bucket || typeof bucket!=='object') return;
        let sum=0;
        Object.keys(bucket).forEach(c=>{
          const v=bucket[c];
          if(typeof v!=='number') console.warn('marketing byCountry', mk, c, 'not a number');
          else sum+=v;
        });
        const tot=MKT[mk];
        if(typeof tot==='number' && sum>tot+1) console.warn('marketing byCountry exceeds total', mk, sum, tot);
        else if(typeof tot!=='number') console.warn('marketing total', mk, 'not a number');
      });
    }
    (MENA.FAILED||[]).forEach(f=>console.warn('data source not updated:', f.file, f.error||'', f.restored?'(showing '+f.restored+')':''));
  } catch(e) { console.warn('reconciliation skipped', e); }
}
