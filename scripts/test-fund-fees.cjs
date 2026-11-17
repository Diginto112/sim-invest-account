const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the production valuation/settlement functions without a DOM. This
// checks the account effects of published NAVs, rather than a copied fee engine.
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function productionFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing production function: ${name}`);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

const functions = [
  'seededNoise', 'firstNumericValue', 'importedRecordForDate',
  'importedNumericForDate', 'marketPrice', 'calendarDaysBetween',
  'currentDate', 'recordPerformance', 'fundTradeAvailability', 'settleFundFees', 'settleOrder'
].map(productionFunction).join('\n');
const dates = ['2020-01-02', '2020-01-03', '2020-01-06', '2020-01-07'];

function account({ imported = false, quantity = 100, lastFeeDate = dates[0] } = {}) {
  const fund = { quantity, availableQuantity: quantity, frozenQuantity: 0, cost: 128.4 };
  if (lastFeeDate) fund.lastFeeDate = lastFeeDate;
  const context = {
    ASSETS: { fund: { managementFeeAnnual: 0.015, custodyFeeAnnual: 0.0025 } },
    tradingDates: dates,
    replayStartDate: dates[0],
    state: {
      day: 0, cash: 500,
      holdings: { fund },
      marketData: imported ? { fund: {
        [dates[0]]: { nav: 1.284 }, [dates[1]]: { nav: 1.31 }
      } } : {},
      performance: { fees: 7 }, cashflows: [], activities: []
    },
    assetName: () => '回归基金',
    money: amount => String(amount)
  };
  context.addActivity = (title, detail, amount) => context.state.activities.push({ title, detail, amount });
  vm.createContext(context);
  vm.runInContext(functions, context, { filename: 'app.js:fund-fee-regression' });
  return context;
}

function sameBalances(context, original) {
  const { fund } = context.state.holdings;
  assert.equal(fund.quantity, original.quantity, 'Fund expenses must not consume units');
  assert.equal(fund.availableQuantity, original.availableQuantity, 'Available units must stay unchanged');
  assert.equal(fund.cost, original.cost, 'Fee estimates must not alter the cost basis');
  assert.equal(context.state.cash, 500, 'Embedded fees must not debit cash');
  assert.equal(context.state.performance.fees, 7, 'Embedded estimates must not be charged again as transaction fees');
  assert.equal(context.state.cashflows.length, 0, 'Embedded estimates are not account cash movements');
}

// A published NAV is already net of actual fund expenses. Both exact records and
// a carried-forward valuation must remain untouched when advancing the account.
{
  const ctx = account({ imported: true });
  const original = { ...ctx.state.holdings.fund };
  ctx.state.day = 1;
  assert.equal(ctx.marketPrice('fund', 1), 1.31);
  const before = original.quantity * ctx.marketPrice('fund', 1);
  ctx.settleFundFees();
  ctx.settleFundFees();
  assert.equal(ctx.state.holdings.fund.quantity * ctx.marketPrice('fund', 1), before);
  sameBalances(ctx, original);
  assert.equal(ctx.state.performance.fundEmbeddedFeeEstimate || 0, 0, 'Do not apply demo fees to real published NAVs');
  ctx.state.day = 2;
  ctx.settleFundFees();
  assert.equal(ctx.marketPrice('fund', 2), 1.31);
  sameBalances(ctx, original);
  assert.equal(ctx.state.holdings.fund.lastFeeDate, dates[2]);
}

// The synthetic curve reflects expenses over natural days, including weekends.
// Turning the fee schedule off changes the quoted NAV, never the investor's units.
{
  const ctx = account();
  const afterFees = ctx.marketPrice('fund', 2);
  ctx.ASSETS.fund.managementFeeAnnual = 0;
  ctx.ASSETS.fund.custodyFeeAnnual = 0;
  const withoutFees = ctx.marketPrice('fund', 2);
  assert.ok(afterFees < withoutFees, 'The demo NAV should include fee drag');
  assert.ok(Math.abs(afterFees / withoutFees - Math.exp(-0.0175 * 4 / 365)) < 1e-12,
    'Four natural days must be reflected between Thursday and Monday');
  assert.equal(ctx.state.holdings.fund.quantity, 100);
}

// A holding lacking legacy bookkeeping initializes on its first call, then
// records estimates on subsequent days. Repeating a settlement is idempotent.
{
  const ctx = account({ lastFeeDate: null });
  const original = { ...ctx.state.holdings.fund };
  ctx.settleFundFees();
  assert.equal(ctx.state.holdings.fund.lastFeeDate, dates[0]);
  ctx.state.day = 1;
  ctx.settleFundFees();
  const firstEstimate = ctx.state.performance.fundEmbeddedFeeEstimate;
  assert.ok(firstEstimate > 0, 'The first eligible period must produce an estimate');
  ctx.settleFundFees();
  assert.equal(ctx.state.performance.fundEmbeddedFeeEstimate, firstEstimate);
  ctx.state.day = 2;
  ctx.settleFundFees();
  assert.ok(ctx.state.performance.fundEmbeddedFeeEstimate > firstEstimate);
  sameBalances(ctx, original);
  assert.ok(ctx.state.activities.every(item => item.title.includes('估算') && item.detail.includes('不再扣减现金或份额')),
    'Informational estimates must be labeled clearly');
}

// First confirmation seeds the accrual date. A later subscription is not charged
// for days before its units were confirmed; only the previously held units enter
// the informational estimate for that interval.
{
  const ctx = account({ quantity: 0, lastFeeDate: null });
  ctx.state.day = 1;
  const firstOrder = { assetId: 'fund', settlementType: 'fund_buy', status: '待确认', quantity: 0, amount: 100 * ctx.marketPrice('fund', 1), fee: 0.2 };
  ctx.settleOrder(firstOrder);
  assert.equal(ctx.state.holdings.fund.lastFeeDate, dates[1]);
  assert.equal(firstOrder.status, '已结算');
  assert.equal(ctx.state.performance.fundEmbeddedFeeEstimate || 0, 0);
  ctx.state.day = 2;
  const expectedEstimate = 100 * ctx.marketPrice('fund', 2) * 0.0175 * 3 / 365;
  ctx.settleOrder({ assetId: 'fund', settlementType: 'fund_buy', status: '待确认', quantity: 0, amount: 50 * ctx.marketPrice('fund', 2), fee: 0.1 });
  assert.equal(ctx.state.holdings.fund.quantity, 150);
  assert.ok(Math.abs(ctx.state.performance.fundEmbeddedFeeEstimate - expectedEstimate) < 1e-12,
    'Newly confirmed units must not be included in the prior holding period');
  ctx.settleFundFees();
  assert.ok(Math.abs(ctx.state.performance.fundEmbeddedFeeEstimate - expectedEstimate) < 1e-12);
  assert.equal(ctx.state.cash, 500);
  assert.equal(ctx.state.performance.fees, 7);
}

console.log('Fund fee regression passed: published NAVs are not charged twice, units remain intact, and demo estimates initialize once.');
