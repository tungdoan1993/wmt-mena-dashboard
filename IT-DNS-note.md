# DNS request — MENA dashboard subdomain

**From:** Martin (Regional Director, MENA)
**Effort:** one DNS record, one time. No hosting, no maintenance, nothing to deploy.

The MENA operations dashboard is hosted on GitHub Pages from the repository
`github.com/tungdoan1993/wmt-mena-dashboard`. We'd like it reachable on a company
subdomain.

## What we need

Add this record to the `wemastertrade-mena.com` DNS zone:

| Type  | Host / Name | Value                    | TTL  |
|-------|-------------|--------------------------|------|
| CNAME | `dashboard` | `tungdoan1993.github.io` | Auto |

Then reply to Martin that it's done — he'll add
`dashboard.wemastertrade-mena.com` in the repo's GitHub Pages settings
(Settings → Pages → Custom domain), and GitHub provisions HTTPS automatically
(Let's Encrypt, zero config on your side).

## Notes

- No server on our side: GitHub serves the site; updates happen via the repo.
- If you prefer a different subdomain name, anything works — just tell Martin
  what you created.
- Optional hardening later: if the company routes DNS through Cloudflare,
  Cloudflare Access can put a login screen in front of this subdomain.
  Not required for launch.
