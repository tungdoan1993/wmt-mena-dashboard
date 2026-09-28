/* MENA dashboard loader.
   1. reads data/manifest.json (lists every data file + the "Data as of" label and FX rates)
   2. fetches all data files in parallel and exposes them as window.MENA
   3. loads the app scripts in order (core -> charts -> tabs -> main)
   Paths resolve against the page, so the /wmt/ and /wg/ stubs add <base href="../">. */
(function () {
  var APP = ['assets/js/core.js', 'assets/js/charts.js', 'assets/js/tabs/expenses.js',
             'assets/js/tabs/revenue.js', 'assets/js/tabs/profit.js', 'assets/js/main.js'];
  var get = function (f) {
    return fetch('data/' + f, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(f + ' (' + r.status + ')');
      return r.json();
    });
  };
  var fail = function (e) {
    var el = document.getElementById('app');
    if (el) el.insertAdjacentHTML('afterbegin',
      '<div class="card full" style="margin:16px 0">Could not load dashboard data: ' +
      String(e.message || e).replace(/</g, '&lt;') + '</div>');
    console.error(e);
  };
  get('manifest.json').then(function (m) {
    return Promise.all([
      Promise.all(m.expenses.map(get)),
      Promise.all(m.revenue.map(get)),
      get(m.payouts), get(m.marketing)
    ]).then(function (d) {
      window.MENA = {
        DATA: [].concat.apply([], d[0]), REV: [].concat.apply([], d[1]).sort(function (a, b) {   // one ordered list: month, then country
          return a.mk < b.mk ? -1 : a.mk > b.mk ? 1 : a.c < b.c ? -1 : a.c > b.c ? 1 : 0; }),
        PAY: d[2],
        RATES: m.rates, MKT: d[3].total, MKTC_M: d[3].byCountry, MKT_FROM: d[3].from
      };
      var a = document.getElementById('asof'); if (a) a.textContent = m.asof;
      return new Promise(function (ok, ko) {
        var v = encodeURIComponent(m.asof), n = 0;
        APP.forEach(function (src) {
          var s = document.createElement('script');
          s.src = src + '?v=' + v; s.async = false;          // async=false keeps execution order
          s.onload = function () { if (++n === APP.length) ok(); };
          s.onerror = function () { ko(new Error(src)); };
          document.body.appendChild(s);
        });
      });
    });
  }).catch(fail);
})();
