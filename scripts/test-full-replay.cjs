const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8').split("\n$$('[data-go]')")[0];
const elements = new Map();
const context = vm.createContext({
  URLSearchParams, URL, location: { search: '' }, localStorage: { getItem: () => null, setItem: () => {} },
  document: { querySelector: selector => { if (!elements.has(selector)) elements.set(selector, { value: '', checked: false }); return elements.get(selector); } },
  window: { INVEST_HISTORY_SNAPSHOT: JSON.parse(fs.readFileSync(path.join(root, 'data/historical-snapshot.json'), 'utf8')) }
});
vm.runInContext(source + '\nrender = () => updateCurrentSnapshot(); closeTrade = () => {}; toast = () => {};', context);
const run = code => vm.runInContext(code, context);
run('loadBuiltinHistory(true)');
for (const [id, amount] of [['stock',10000],['fund',10000],['bank',20000],['bond',10000],['shop',15000],['startup',15000]]) {
  elements.set('#tradeAmount', { value: String(amount) });
  run(`state.selectedAsset = '${id}'; state.selectedSide = 'buy'; confirmTrade()`);
}
assert.equal(run('state.orders.length'), 6, 'Every asset should accept a valid initial order');
for (let index = 1; index < 117; index += 1) {
  run('advanceDay()');
  assert.ok(run('Number.isFinite(totalValue()) && state.cash >= 0'), `Invalid account on trading day ${index + 1}`);
  assert.ok(run('Object.values(state.holdings).every(h => Number.isFinite(h.quantity) && h.quantity >= 0 && Number.isFinite(h.cost))'), 'Invalid holding');
}
assert.equal(run('state.day'), 116);
assert.equal(run('state.history.length'), 116);
assert.equal(run('state.snapshots.length'), 117);
assert.equal(run("state.orders.filter(o => ['待确认','待结算'].includes(o.status)).length"), 0);
assert.ok(run('state.cashflows.some(item => item.type === "银行季度结息")'), 'Quarterly interest should be credited');
assert.ok(run('state.ventures.startup.aRoundCompleted && state.ventures.startup.exited'), 'Financing and exit window should both occur');
const endTotal = run('totalValue()');
run('advanceDay()');
assert.equal(run('totalValue()'), endTotal, 'Replay end cannot generate extra income');
run('rewindDay(); advanceDay()');
assert.ok(Math.abs(run('totalValue()') - endTotal) < 1e-8, 'Replaying one day must reproduce the same account');
console.log('Full replay passed: six asset classes, 117 dates, finite balances, complete settlements and deterministic rewind.');
