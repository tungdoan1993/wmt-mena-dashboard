#!/usr/bin/env python3
# Usage: python3 tools/legacy_shim.py <repo dir> <out.html>   (e.g. for finance.py close --index <out.html>)
# Build a legacy-format index.html shim (const REV/PAY/MKT/MKTC_M/DATA lines) from the split repo's data/,
# so tools that read the old single-file dashboard (finance.py close --index) keep working.
import json, sys, os
repo, out = sys.argv[1], sys.argv[2]
d = lambda p: json.load(open(os.path.join(repo, 'data', p), encoding='utf-8'))
m = d('manifest.json')
DATA = [r for f in m['expenses'] for r in d(f)]
REV = sorted([r for f in m['revenue'] for r in d(f)], key=lambda r: (r['mk'], r['c']))
PAY = d(m['payouts']); mk = d(m['marketing'])
L = [f"const DATA = {json.dumps(DATA, ensure_ascii=False, separators=(',', ':'))};",
     f"const REV = {json.dumps(REV)};", f"const PAY = {json.dumps(PAY)};",
     "const MKT = {" + ', '.join(f"'{k}': {v}" for k, v in sorted(mk['total'].items())) + "};",
     f"const MKTC_M = {json.dumps(mk['byCountry'], separators=(',', ':'))};",
     f"const MKT_FROM = '{mk['from']}';"]
open(out, 'w', encoding='utf-8').write('<!-- legacy shim built from data/ -->\n<div class="text-muted asof">Data as of <b>' + m['asof'] + '</b></div>\n<script>\n' + '\n'.join(L) + '\n</script>\n')
print('shim written', out, len(DATA), 'DATA rows')
