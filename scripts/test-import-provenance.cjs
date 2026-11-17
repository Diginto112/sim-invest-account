const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8').split("\n$$('[data-go]')")[0];
const elements = new Map();
const context = vm.createContext({
  URLSearchParams, URL, location: { search: '' },
  localStorage: { getItem: () => null, setItem: () => {} },
  document: { querySelector: selector => { if (!elements.has(selector)) elements.set(selector, {}); return elements.get(selector); } },
  window: { INVEST_HISTORY_SNAPSHOT: JSON.parse(fs.readFileSync(path.join(root, 'data/historical-snapshot.json'), 'utf8')) }
});
vm.runInContext(source + '\nrender = () => {}; toast = () => {};', context);
const run = code => vm.runInContext(code, context);
const importRows = rows => run(`importSnapshotText(${JSON.stringify(JSON.stringify({ rows }))}, 'test.json')`);
const row = (asset, date, license) => ({ asset_id: asset, date, close: 10, source: 'test-source', ...(license ? { license_status: license } : {}), retrieved_at: '2026-11-14' });

assert.match(run('dataStatusLabel()'), /演示/);
importRows([row('stock', '2020-01-02', 'authorized')]);
assert.equal(run("quoteProvenance('stock').license"), 'authorized');
assert.equal(run("quoteProvenance('fund').kind"), 'demo');
assert.match(run('dataStatusLabel()'), /部分历史数据/);
assert.equal(run("quoteProvenance('shop').kind"), 'scenario');

// CSV metadata is per row; the first row must never authorise later blank rows.
const csv = 'date,asset_id,close,source,license_status,retrieved_at\n2020-01-02,stock,11,S,authorized,2026-11-14\n2020-01-03,stock,12,S,,2026-11-14';
run(`importSnapshotText(${JSON.stringify(csv)}, 'test.csv')`);
run('state.day = 1');
assert.equal(run("quoteProvenance('stock').license"), 'pending_verification');
importRows([row('fund', '2020-01-02', 'authorized')]);
assert.equal(run("quoteProvenance('stock').license"), 'pending_verification', 'Later import cannot authorise older records');
run('state.day = 2');
assert.match(run("quoteProvenance('stock').label"), /前值沿用/);
assert.equal(run("quoteProvenance('stock').date"), '2020-01-03');

importRows([{ ...row('stock', '2020-01-06', 'authorized'), symbol: 'A', name: '<img src=x onerror=alert(1)>' }]);
run('renderQuotes()');
assert.ok(elements.get('#quoteStrip').innerHTML.includes('&lt;img'), 'Imported names must render as text');
assert.ok(!elements.get('#quoteStrip').innerHTML.includes('<img'), 'Imported names cannot create active markup');
assert.throws(() => importRows([{ ...row('stock', '2020-01-07', 'authorized'), symbol: 'B' }]), /不能把/);

run('loadBuiltinHistory(true)');
assert.equal(run('Object.keys(state.marketData.stock).length'), 117);
assert.equal(run('Object.keys(state.marketData.fund).length'), 117);
assert.equal(run("marketPrice('stock', 0)"), 38.88);
assert.equal(run("marketPrice('fund', 0)"), 1.467);
assert.equal(run("quoteProvenance('stock').kind"), 'imported');
assert.equal(run("quoteProvenance('fund').kind"), 'imported');
assert.equal(run('tradingDates.length'), 117);
assert.equal(run('annualRateForDate(0)'), 0.003);
assert.equal(run("quoteProvenance('shop').kind"), 'scenario');
console.log('Import provenance passed: row licences, mixed sources, carry-forward dates, safe names, symbol separation, and 117-day real snapshot.');
