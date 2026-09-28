# Instructions for AI agents (Cursor, Grok, Claude, Codex …)

This repo is the WMT operations dashboard (markets: MENA, Pakistan, Ethiopia, Nigeria), served by GitHub Pages at
https://report.wecopyconsultant.ae/. **It is public.** Read this whole file before
changing anything.

## The one rule

**Numbers live only in `data/`. Never put data into `index.html` or any `.js` file.**
`index.html` has no `const DATA / REV / PAY` any more — if you are looking for them,
you are following outdated instructions. Use the table below.

## Where each number goes

| You are updating… | Edit exactly this file | Do not touch |
|---|---|---|
| HubSpot revenue ("Total MENA Revenue", all countries except Syria/Iran) | `data/revenue/hubspot.json` | `crm-syria-iran.json` |
| Syria / Iran revenue (internal CRM) | `data/revenue/crm-syria-iran.json` | `hubspot.json` |
| Pakistan revenue | `data/revenue/pakistan.json` (rows with `"c": "Pakistan"` only) | MENA files |
| Ethiopia revenue | `data/revenue/ethiopia.json` (rows with `"c": "Ethiopia"` only) | MENA files |
| Nigeria revenue | `data/revenue/nigeria.json` (rows with `"c": "Nigeria"` only) | MENA files |
| Trader / Partner (IP) payouts — all markets | `data/payouts.json` (country in `c` decides the market) | revenue files |
| Office expenses for a closed month | add/replace `data/expenses/YYYY-MM.json`, list it in `data/manifest.json` → `expenses` | other months |
| "Data as of" label | `data/manifest.json` → `asof` (format `Sep 28, 2026`) | `index.html` |
| FX rates | `data/manifest.json` → `rates` | — |
| Paid-ads (marketing) spend — all markets | `data/marketing.json` (`byCountry` decides the market; `total` = all markets) | — |
| A new market, or an office assigned to a market | `data/manifest.json` → `markets` | code |

Replace only the rows for the month you were asked to update. Leave every other
month exactly as it is.

## Row formats (all amounts in USD unless `cur` says otherwise)

```jsonc
// data/revenue/hubspot.json and data/revenue/crm-syria-iran.json — one row per month × country
{"mk": "2026-09", "c": "Syria", "amt": 24201.82, "n": 392}      // n = number of deals
// data/payouts.json — one row per month × country × kind
{"mk": "2026-09", "c": "Egypt", "kind": "Trader", "amt": 1234.5, "n": 3}   // kind: "Trader" | "Partner (IP)"
// data/expenses/YYYY-MM.json — one row per ledger line
{"office": "Dubai", "mk": "2026-08", "date": "2026-08-11", "type": "Expense",
 "cat": "Rent", "desc": "…", "amt": -3750, "cur": "AED", "notes": "…"}
//   office: "Dubai" | "WMT Alexandria" | "WeGolden Egypt"
//   type:   "Expense" | "Internal Transfer" | "HQ Funding" | "Refund"
//   amt:    negative = money out, positive = money in; cur: "USD" | "AED" | "EGP"
// data/marketing.json
{"from": "2026-03", "total": {"2026-09": 12345}, "byCountry": {"2026-09": {"Egypt": 1000}}}
```

- Country names must match the existing spelling (e.g. `United Arab Emirates`, `Saudi Arabia`).
- Syria and Iran rows go **only** in `crm-syria-iran.json`. A HubSpot export that contains
  Syria/Iran rows: drop those rows before writing `hubspot.json`.
- **Markets.** `data/manifest.json` → `markets` lists each market and the countries it owns. MENA
  (`"countries": "*"`) takes every country no other market claims. Payouts and marketing are split
  by the row's country, so Pakistan payouts are simply rows with `"c": "Pakistan"` in `payouts.json`.
  Never put a Pakistan/Ethiopia/Nigeria row in `hubspot.json` — it would be counted twice.
- Keep rows sorted by `mk`, then `c`. Valid JSON only (no comments, no trailing commas).

## Before you commit

```
node tools/validate.js <path to a checkout of the current main>
```

Must print `OK to publish.` It fails if Syria/Iran end up in the HubSpot file, the CRM
file is empty, a market file holds another market's country, the same country appears in two
revenue files, a row is malformed, or any month's revenue/payouts dropped versus main.
If a month legitimately goes down (a correction), say so explicitly in the PR description.

In the PR/commit message state: which file(s), which month(s), the new monthly total and
deal/payout count per file — e.g. `Sep REV CRM: Iran $13,024.24 / 169, Syria $24,201.82 / 392`.

## Never

- Edit `index.html`, `assets/`, `wmt/`, `wg/`, or `CNAME` for a data update.
- Delete `CNAME` (it keeps the custom domain working).
- Use `rebuild.py` / `template.html` from old branches (e.g. `backup-single-file-2026-09-28`) — they
  write the old single-file format and would wipe this structure.
- Add personal data, credentials or anything not meant to be public.

## Code layout (for code changes only)

`assets/js/loader.js` loads `data/manifest.json` and every file it lists, then runs
`core.js → charts.js → tabs/expenses.js → tabs/revenue.js → tabs/profit.js → main.js`
in that order. Plain scripts, no build step. After any code or CSS change, bump the version
tag `2026-09-28-markets` in BOTH `index.html` (css + loader links) and `assets/js/loader.js` (`CODE`)
so browsers fetch the new files instead of cached ones. Design tokens are in `assets/css/dashboard.css`.
To preview: `python -m http.server` in the repo root, open http://localhost:8000/.
