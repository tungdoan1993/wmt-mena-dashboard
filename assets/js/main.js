/* Render dispatcher, event wiring and boot. Must load last.
   Part of the MENA dashboard. Loaded in order by assets/js/loader.js. */

/* ---------- render dispatcher ---------- */
function render(){
  if(state.tab==='rev'){ renderRevenue(); return; }
  if(state.tab==='prof'){ renderProfit(); return; }
  renderExpenses();
}

/* ---------- events ---------- */
document.querySelectorAll('.chip[data-office]').forEach(ch=>{
  ch.addEventListener('click',()=>{
    const o=ch.dataset.office;
    if(state.offices.has(o)&&state.offices.size>1){state.offices.delete(o);ch.classList.remove('on');}
    else if(!state.offices.has(o)){state.offices.add(o);ch.classList.add('on');}
    state.rows=50; render();
  });
});
document.getElementById('range').addEventListener('change',e=>{state.range=e.target.value;state.rows=50;syncURL();render();});
function applyRange(r){ state.range=r; state.rows=50; const sel=document.getElementById('range'); if(sel.value!==r) sel.value=r; }
document.getElementById('q').addEventListener('input',e=>{state.q=e.target.value;state.rows=50;renderTable(filtered());});

/* boot: honour /wmt/ or /wg/ plus the #tab in the URL */
{ const hp = hashParts(); state.tab = hp.tab || 'exp'; if(hp.range) applyRange(hp.range); }
setProduct(productFromPath() || 'wmt');
window.addEventListener('hashchange',()=>{
  const hp = hashParts();
  let changed=false;
  if(hp.range && hp.range!==state.range){ applyRange(hp.range); changed=true; }
  if(hp.tab && hp.tab!==state.tab && !(state.product==='wg' && hp.tab==='rev')) setTab(hp.tab);
  else if(changed){ syncURL(); render(); }
});
render();
