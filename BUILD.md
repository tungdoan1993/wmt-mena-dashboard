# How to rebuild the dashboard (weekly update)

Inputs (6 files, all exported fresh):

1. HubSpot → report **"Total MENA Revenue"** → Export → CSV, *unsummarized* (zip is fine)
2. HubSpot → report **"MENA Trader Payout"** → same export
3. HubSpot → report **"MENA IP Payout"** → same export
4. `Expense report Dubai office.xlsx`
5. `Expense Report- WMT Alexandria Office.xlsx`
6. `WeGolden Egypt Expense report.xlsx`

Build (needs Python 3 + `pip install openpyxl`):

```
python3 rebuild.py \
  --dubai "Expense report Dubai office.xlsx" \
  --alex  "Expense Report- WMT Alexandria Office.xlsx" \
  --wg    "WeGolden Egypt Expense report.xlsx" \
  --rev    total-mena-revenue.zip \
  --trader mena-trader-payout.zip \
  --ip     mena-ip-payout.zip \
  --asof  "Aug 1, 2026"
```

It writes `index.html` and prints totals — check them against the
`hubspot-export-summary.csv` inside each HubSpot zip before publishing.

Publish: in this repo, **Add file → Upload files** → drag the new `index.html`
in → Commit. The live site (https://tungdoan1993.github.io/wmt-mena-dashboard/)
updates itself in 1–2 minutes.

**Only the root `index.html` is ever uploaded.** `wmt/index.html` and
`wg/index.html` are 1 KB loader stubs that pull the root file in without
changing the address, so they never need rebuilding or re-uploading. Leave
them alone.

**Shareable addresses** — product comes from the path, tab from the `#`:
- WeMasterTrade → https://tungdoan1993.github.io/wmt-mena-dashboard/wmt/
- WeGolden → https://tungdoan1993.github.io/wmt-mena-dashboard/wg/
- Add `#expenses`, `#revenue` or `#operation-profit` to link straight to a tab,
  e.g. `.../wmt/#operation-profit`. Root `/` defaults to WMT → Expenses.
  WeGolden has no revenue tab, so `/wg/#revenue` falls back to Expenses.

Notes: `template.html` must sit next to `rebuild.py`. Data conventions (FX
rates, internal-transfer exclusion, product split) are inside the template and
documented in the dashboard footer.
