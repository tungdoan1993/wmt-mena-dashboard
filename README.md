# MENA Operations Dashboard — WeMasterTrade × WeGolden

Internal dashboard: office expenses, WMT MENA revenue and operation profit
(revenue − customer payouts − costs). Live at **https://report.wecopyconsultant.ae/**
(also https://tungdoan1993.github.io/wmt-mena-dashboard/).

**⚠️ This repository is public** (GitHub Pages, free plan). Do not add anything
here you would not want outside the company.

## Layout — data, logic and design live in separate files

```
index.html                    page frame only: header, product switch, tabs, footer
assets/css/dashboard.css      Organic design (colours, type, layout)
assets/fonts/*.woff2          Caprasimo + Figtree
assets/js/loader.js           reads data/manifest.json, loads data, then the scripts below
assets/js/core.js             helpers, state, URL routing, filters, tooltip
assets/js/charts.js           shared SVG charts
assets/js/tabs/expenses.js    Expenses tab
assets/js/tabs/revenue.js     MENA Revenue tab
assets/js/tabs/profit.js      Operation Profit tab
assets/js/main.js             event wiring + start-up (loads last)
data/manifest.json            "Data as of" label, FX rates, data files, markets (countries + offices)
data/expenses/YYYY-MM.json    one file per closed month (office ledger rows)
data/revenue/hubspot.json     HubSpot "Total MENA Revenue" (17 countries)
data/revenue/crm-syria-iran.json   internal CRM revenue — Syria + Iran only
data/revenue/pakistan.json | ethiopia.json | nigeria.json   one revenue file per non-MENA market
data/payouts.json             HubSpot trader + IP payouts
data/marketing.json           HQ paid-ads spend (total + by country)
wmt/, wg/                     1 KB stubs so /wmt/ and /wg/ links work — never edit
tools/validate.js             pre-publish check (see below)
```

## What to change for each kind of update

| Update | Files to change |
|---|---|
| Monthly expense close | add `data/expenses/2026-09.json`, add it to `manifest.json` → `expenses`, set `asof` |
| Weekly HubSpot refresh | `data/revenue/hubspot.json`, `data/payouts.json` |
| New CRM export (Syria/Iran) | `data/revenue/crm-syria-iran.json` |
| Pakistan / Ethiopia / Nigeria revenue | `data/revenue/pakistan.json` etc. (payouts and ads go in the shared files, by country) |
| New market / assign an office to a market | `data/manifest.json` → `markets` |
| Paid-ads figures | `data/marketing.json` |
| FX rate | `manifest.json` → `rates` |
| Look & feel | `assets/css/dashboard.css` |
| Fix one tab | that tab's file in `assets/js/tabs/` |

Syria and Iran are kept out of `hubspot.json` on purpose: a HubSpot refresh
replaces only that file, so it can never wipe the CRM rows.

## Before publishing

```
node tools/validate.js <folder with the currently published version>
```

It fails if a file is missing or malformed, if Syria/Iran appear in the HubSpot
file, if the CRM file is empty, or if any month's revenue or payouts dropped.

## Publishing

GitHub → **Add file → Upload files**. Upload only the files that changed, into
the same folder (open the folder in GitHub first, e.g. `data/revenue/`, then
upload). The site updates in 1–2 minutes.

## Local preview

The page loads its data files, so double-clicking `index.html` will not work.
From this folder run `python -m http.server` and open http://localhost:8000/.

## Addresses

Product in the path; tab, market and period in the `#`:
`/wmt/#expenses`, `/wmt/#mena/ytd`, `/wmt/#pakistan`, `/wmt/#operation-profit/aug26` (MENA),
`/wmt/#operation-profit/nigeria/aug26`, `/wg/#expenses/3m`. Old `#revenue` links open MENA.
Root `/` opens WeMasterTrade → Expenses.

The old single-file version (and its rebuild.py) is kept on the branch
`backup-single-file-2026-09-28`. Do not restore it over main.

Method notes, FX assumptions and data caveats are printed in the dashboard footer.
