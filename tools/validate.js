// Pre-publish check for the MENA dashboard data.  Usage:  node tools/validate.js [previous-checkout-dir]
// Fails (exit 1) on: missing/invalid files, bad rows, Syria/Iran in the HubSpot file,
// an empty CRM file, or — when a previous checkout is given — any month whose revenue,
// payouts or expenses dropped versus the published version.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), prev = process.argv[2];
const errs = [], warn = [];
const load = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, 'data', f), 'utf8'));
function read(dir) {
  const m = load(dir, 'manifest.json');
  const exp = m.expenses.map(f => ({ f, rows: load(dir, f) }));
  const rev = Object.fromEntries(m.revenue.map(f => [f, load(dir, f)]));
  return { m, exp, rev, pay: load(dir, m.payouts), mkt: load(dir, m.marketing) };
}
const cur = read(root);
if (!/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(cur.m.asof)) errs.push('manifest.asof should look like "Aug 31, 2026"');
for (const { f, rows } of cur.exp) {
  const mk = path.basename(f, '.json');
  rows.forEach((r, i) => {
    if (r.mk !== mk) errs.push(`${f} row ${i}: mk ${r.mk} ≠ file month`);
    for (const k of ['office', 'type', 'cat', 'amt', 'cur']) if (r[k] === undefined) errs.push(`${f} row ${i}: missing ${k}`);
    if (!['Dubai', 'WMT Alexandria', 'WeGolden Egypt'].includes(r.office)) errs.push(`${f} row ${i}: unknown office ${r.office}`);
  });
}
const hub = cur.rev['revenue/hubspot.json'] || [], crm = cur.rev['revenue/crm-syria-iran.json'] || [];
// markets: each market file may only hold its own countries; no country may sit in two revenue files
const markets = cur.m.markets || [];
const claimed = {}; markets.forEach(mk => Array.isArray(mk.countries) && mk.countries.forEach(c => claimed[c] = mk));
for (const mk of markets) if (Array.isArray(mk.countries) && mk.file) {
  (cur.rev[mk.file] || []).forEach((r, i) => { if (!mk.countries.includes(r.c)) errs.push(`${mk.file} row ${i}: ${r.c} is not a ${mk.label} country`); });
  if (!cur.m.revenue.includes(mk.file)) errs.push(`manifest.revenue is missing ${mk.file}`);
}
const seenIn = {};
for (const [f, rows] of Object.entries(cur.rev)) rows.forEach(r => { (seenIn[r.c] = seenIn[r.c] || new Set()).add(f); });
for (const [c, fs] of Object.entries(seenIn)) if (fs.size > 1) errs.push(`${c} appears in ${[...fs].join(' and ')} — double counting`);
for (const [c, mk] of Object.entries(claimed)) if (hub.some(r => r.c === c)) errs.push(`hubspot.json contains ${c} rows — they belong in ${mk.file}`);
if (hub.some(r => r.c === 'Syria' || r.c === 'Iran')) errs.push('hubspot.json contains Syria/Iran rows — those belong only in crm-syria-iran.json');
if (!crm.length) errs.push('crm-syria-iran.json is empty — Syria/Iran revenue would disappear');
const sum = (a, key) => a.reduce((o, r) => (o[r[key]] = (o[r[key]] || 0) + r.amt, o), {});
if (prev) {
  const old = read(prev);
  const cmp = (label, a, b) => { for (const k of Object.keys(b)) if ((a[k] || 0) < b[k] - 0.5)
    errs.push(`${label} ${k}: ${Math.round(b[k])} → ${Math.round(a[k] || 0)} (dropped)`); };
  cmp('revenue', sum(Object.values(cur.rev).flat(), 'mk'), sum(Object.values(old.rev).flat(), 'mk'));
  cmp('payouts', sum(cur.pay, 'mk'), sum(old.pay, 'mk'));
  const nExp = o => Object.fromEntries(o.exp.map(e => [e.f, e.rows.length]));
  const a = nExp(cur), b = nExp(old);
  for (const f of Object.keys(b)) if (!(f in a)) errs.push(`expense month removed: ${f}`);
  else if (a[f] !== b[f]) warn.push(`${f}: ${b[f]} → ${a[f]} rows (a closed month changed — intended?)`);
}
const total = o => Object.values(o).reduce((a, b) => a + b, 0);
console.log(`as of ${cur.m.asof} · ${cur.exp.length} expense months · ${cur.exp.reduce((a, e) => a + e.rows.length, 0)} rows`);
console.log(`revenue $${Math.round(total(sum(Object.values(cur.rev).flat(), 'mk'))).toLocaleString()} (CRM Syria+Iran $${Math.round(total(sum(crm, 'mk'))).toLocaleString()}) · payouts $${Math.round(total(sum(cur.pay, 'mk'))).toLocaleString()}`);
warn.forEach(w => console.log('WARN ' + w));
errs.forEach(e => console.log('FAIL ' + e));
console.log(errs.length ? `\n${errs.length} problem(s) — do not publish.` : '\nOK to publish.');
process.exit(errs.length ? 1 : 0);
