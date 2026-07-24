# MENA Operations Dashboard — WeMasterTrade × WeGolden

Internal dashboard: office expenses, WMT MENA revenue, and operation profit
(revenue − customer payouts − costs). One self-contained file: `index.html`.

**⚠️ This repository is public** (required for GitHub Pages on the free plan).
Do not add anything here you would not want outside the company.

## Live site

After enabling GitHub Pages (below), the dashboard is served at:
`https://tungdoan1993.github.io/wmt-mena-dashboard/`

## One-time setup (already done if you can see the live URL)

1. Repo **Settings → Pages → Build and deployment**
2. Source: *Deploy from a branch* · Branch: `main` · Folder: `/ (root)` → **Save**
3. Wait ~2 minutes, refresh — the live URL appears at the top of the Pages settings.

## How to update the dashboard

1. Get the new `index.html` (rebuilt from fresh HubSpot CSV exports + expense files).
2. In this repo: **Add file → Upload files** → drag the new `index.html` in
   (it replaces the old one) → **Commit changes**.
3. The website updates itself within 1–2 minutes. Nothing else to do.

## Custom company domain (optional)

See `IT-DNS-note.md` — one DNS record from IT points
`dashboard.wemastertrade-mena.com` at this site permanently.

## Data sources

- HubSpot report "Total MENA Revenue" (unsummarized CSV export)
- HubSpot reports "MENA Trader Payout" and "MENA IP Payout" (CSV exports)
- Expense workbooks: Dubai office (AED), WMT Alexandria (EGP), WeGolden Egypt (EGP + AED)

Method notes, FX assumptions, and known data caveats are printed in the
dashboard footer.
