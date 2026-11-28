/* MENA dashboard loader.
   1. reads data/manifest.json (file list, "Data as of", FX, markets)
   2. fetches every data file on its own — one failure never rejects the rest
   3. records a per-file status {file, error} and, when it can, a last-good copy
   4. loads the app scripts in order (core -> charts -> tabs -> main)
   Paths resolve against the page, so the /wmt/ and /wg/ stubs add <base href="../">.
   Last-good: data/snapshots/last.json if a publisher has written one, otherwise this
   browser's last successful copy. Nothing is invented when neither exists. */
(function () {
  var CODE = '2026-11-28-wg-iran';   /* bump on every code/CSS change so browsers refetch; keep in step with index.html */
  var APP = ['assets/js/core.js', 'assets/js/charts.js', 'assets/js/tabs/expenses.js',
             'assets/js/tabs/revenue.js', 'assets/js/tabs/profit.js', 'assets/js/main.js'];
  var SNAP_PREFIX = 'wmt-dash-lastgood:v1:';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }
  function pageBanner(file, error) {
    var host = document.getElementById('app');
    if (!host || document.getElementById('data-banner')) return;
    host.insertAdjacentHTML('afterbegin',
      '<div id="data-banner" class="card full" role="alert" data-missing="' + esc(file) + '" ' +
      'style="margin:16px 0;background:#fff2eb;color:#8c491a">' +
      '<b>Chưa cập nhật — ' + esc(file) + ' lỗi</b> <span>· Not updated</span>' +
      '<div style="margin-top:6px;font-size:13px">' + esc(error) + '</div></div>');
  }
  function isPlain(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function rowOk(r, keys) {
    if (!isPlain(r)) return false;
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === 'amt' || k === 'n') { if (typeof r[k] !== 'number' || !isFinite(r[k])) return false; }
      else if (typeof r[k] !== 'string' || !r[k]) return false;
    }
    return true;
  }
  function validManifest(m) {
    if (!isPlain(m)) return 'expected an object';
    if (!Array.isArray(m.expenses) || !m.expenses.every(function (s) { return typeof s === 'string'; })) return 'expenses list missing';
    if (!Array.isArray(m.revenue) || !m.revenue.every(function (s) { return typeof s === 'string'; })) return 'revenue list missing';
    if (typeof m.payouts !== 'string' || typeof m.marketing !== 'string') return 'payouts or marketing path missing';
    if (!isPlain(m.rates) || typeof m.rates.AED !== 'number') return 'rates missing';
    if (!Array.isArray(m.markets) || !m.markets.length) return 'markets missing';
    if (!m.markets.every(function (x) { return isPlain(x) && typeof x.id === 'string' && typeof x.slug === 'string' && typeof x.label === 'string'; })) return 'market entry missing id/slug/label';
    if (typeof m.asof !== 'string' || !m.asof) return 'asof missing';
    return null;
  }
  function validExpense(data) {
    if (!Array.isArray(data)) return 'expected an array';
    if (data.length && !rowOk(data[0], ['office', 'mk', 'amt'])) return 'expected expense rows';
    return null;
  }
  function validRevenue(data) {
    if (!Array.isArray(data)) return 'expected an array';
    if (data.length && !rowOk(data[0], ['mk', 'c', 'amt', 'n'])) return 'expected revenue rows';
    return null;
  }
  function validPayouts(data) {
    if (!Array.isArray(data)) return 'expected an array';
    if (data.length && !rowOk(data[0], ['mk', 'c', 'kind', 'amt'])) return 'expected payout rows';
    return null;
  }
  function validMarketing(data) {
    if (!isPlain(data) || typeof data.from !== 'string' || !isPlain(data.total) || !isPlain(data.byCountry))
      return 'expected {from, total, byCountry}';
    return null;
  }
  function loadOne(f) {
    return fetch('data/' + f, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(f + ' (' + r.status + ')');
      return r.text();
    }).then(function (text) {
      try { return { file: f, ok: true, data: JSON.parse(text) }; }
      catch (e) { return { file: f, ok: false, error: 'invalid JSON' }; }
    }).catch(function (e) {
      return { file: f, ok: false, error: String(e.message || e) };
    });
  }
  function applyShape(result, validate) {
    if (!result.ok) return result;
    var why = validate(result.data);
    if (why) return { file: result.file, ok: false, error: why };
    return result;
  }
  function remember(file, data) {
    try { localStorage.setItem(SNAP_PREFIX + file, JSON.stringify(data)); } catch (e) {}
  }
  function recall(file, validate) {
    try {
      var raw = localStorage.getItem(SNAP_PREFIX + file);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (validate(data)) return null;
      return data;
    } catch (e) { return null; }
  }
  /* Optional publisher snapshot: { saved, files: { "payouts.json": <json>, ... } }.
     Absent today — a 404 just means there is no last-confirmed copy on the server. */
  function loadSnapshotMap() {
    return fetch('data/snapshots/last.json', { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function (j) {
      if (!isPlain(j) || !isPlain(j.files)) return null;
      return j.files;
    }).catch(function () { return null; });
  }
  function recover(results, validates) {
    results.forEach(function (r) { if (r.ok) remember(r.file, r.data); });
    if (results.every(function (r) { return r.ok; })) return Promise.resolve(results);
    return loadSnapshotMap().then(function (files) {
      results.forEach(function (r, i) {
        if (r.ok) return;
        var validate = validates[i];
        var snap = files && files[r.file];
        if (snap !== undefined && !validate(snap)) { r.data = snap; r.restored = 'snapshot'; return; }
        var mem = recall(r.file, validate);
        if (mem) { r.data = mem; r.restored = 'last-good'; }
      });
      return results;
    });
  }
  function monthOf(f) {
    var m = /^expenses\/(\d{4}-\d{2})\.json$/.exec(f);
    return m ? m[1] : null;
  }
  function statusOf(r) {
    return { file: r.file, ok: !!r.ok, error: r.ok ? null : (r.error || 'failed'), restored: r.restored || null };
  }
  /* Keep well-formed rows. A bad row is skipped with a warning — it must not throw. */
  function safeRows(r) {
    if (!Array.isArray(r.data)) return [];
    var mk = monthOf(r.file), out = [];
    r.data.forEach(function (row, i) {
      try {
        if (!row || typeof row !== 'object' || typeof row.mk !== 'string' || typeof row.amt !== 'number' || !isFinite(row.amt)) {
          console.warn(r.file + ' row ' + i + ' skipped');
          return;
        }
        if (mk && row.mk !== mk) console.warn(r.file + ' row ' + i + ': mk ' + row.mk + ' ≠ ' + mk);
        out.push(row);
      } catch (e) { console.warn('reconciliation skipped', r.file, i, e); }
    });
    return out;
  }
  function shellMarkets() {
    return [{ id: 'mena', label: 'MENA', slug: 'mena', countries: '*', offices: ['Dubai', 'WMT Alexandria'] }];
  }
  function loadScripts(asof) {
    return new Promise(function (ok, ko) {
      var v = encodeURIComponent(String(asof || '') + '|' + CODE), n = 0, failed = false;
      APP.forEach(function (src) {
        var s = document.createElement('script');
        s.src = src + '?v=' + v;
        s.async = false;
        s.onload = function () { if (++n === APP.length && !failed) ok(); };
        s.onerror = function () {
          if (failed) return;
          failed = true;
          console.error(src);
          pageBanner(src, 'script failed to load');
          ko(new Error(src));
        };
        document.body.appendChild(s);
      });
    });
  }
  function boot(mena) {
    window.MENA = mena;
    var a = document.getElementById('asof');
    if (a) a.textContent = mena.manifestLive === false ? '—' : (mena.asof || '—');
    if (mena.manifestLive === false) {
      var st = (mena.STATUS && mena.STATUS['manifest.json']) || {};
      pageBanner('manifest.json', st.error || 'failed');
    }
    return loadScripts(mena.asof || '');
  }
  function emptyMena(error) {
    var st = { file: 'manifest.json', ok: false, error: error, restored: null };
    return {
      DATA: [], REV: [], PAY: [],
      RATES: {}, MARKETS: shellMarkets(),
      MKT: {}, MKTC_M: {}, MKT_FROM: '',
      asof: '', manifestOk: false, manifestLive: false,
      payoutsOk: false, marketingOk: false, expenseMonths: [],
      STATUS: { 'manifest.json': st }, FAILED: [st]
    };
  }
  function loadFromManifest(m, manStatus) {
    var expF = m.expenses, revF = m.revenue;
    var files = expF.concat(revF, [m.payouts, m.marketing]);
    var validators = expF.map(function () { return validExpense; })
      .concat(revF.map(function () { return validRevenue; }))
      .concat([validPayouts, validMarketing]);
    return Promise.all(files.map(loadOne)).then(function (raws) {
      var shaped = raws.map(function (r, i) { return applyShape(r, validators[i]); });
      return recover(shaped, validators).then(function (rs) {
        var status = { 'manifest.json': manStatus };
        var failed = manStatus.ok ? [] : [manStatus];
        rs.forEach(function (r) {
          var st = statusOf(r);
          status[r.file] = st;
          if (!st.ok) failed.push(st);
        });
        function usable(r) { return !!(r && (r.ok || r.restored) && r.data != null); }
        var expResults = rs.slice(0, expF.length);
        var revResults = rs.slice(expF.length, expF.length + revF.length);
        var payR = rs[rs.length - 2], mktR = rs[rs.length - 1];
        var data = [];
        expResults.forEach(function (r) { if (usable(r)) data = data.concat(safeRows(r)); });
        var rev = [];
        revResults.forEach(function (r) { if (usable(r)) rev = rev.concat(safeRows(r)); });
        rev.sort(function (a, b) {
          return a.mk < b.mk ? -1 : a.mk > b.mk ? 1 : a.c < b.c ? -1 : a.c > b.c ? 1 : 0;
        });
        var payRows = usable(payR) ? safeRows(payR) : [];
        var mktData = usable(mktR) ? mktR.data : { total: {}, byCountry: {}, from: '' };
        return boot({
          DATA: data, REV: rev, PAY: payRows,
          RATES: m.rates, MARKETS: m.markets,
          MKT: mktData.total || {}, MKTC_M: mktData.byCountry || {}, MKT_FROM: mktData.from || '',
          asof: m.asof,
          manifestOk: !!(manStatus.ok || manStatus.restored),
          manifestLive: !!manStatus.ok,
          payoutsOk: usable(payR), marketingOk: usable(mktR),
          expenseMonths: expF.map(function (f) { return { file: f, mk: monthOf(f) }; }),
          STATUS: status, FAILED: failed
        });
      });
    });
  }

  loadOne('manifest.json').then(function (raw) {
    var man = applyShape(raw, validManifest);
    if (!man.ok) {
      return recover([man], [validManifest]).then(function (rs) {
        var mres = rs[0];
        if (!mres.restored) return boot(emptyMena(mres.error || 'failed'));
        return loadFromManifest(mres.data, statusOf(mres));
      });
    }
    return loadFromManifest(man.data, statusOf(man));
  }).catch(function (e) {
    console.error(e);
    return boot(emptyMena(String(e.message || e)));
  });
})();
