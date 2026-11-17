const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function productionFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `Missing production function: ${name}`);
  const next = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}
const assetStart = source.indexOf('const ASSETS =');
const assetEnd = source.indexOf('\n};', assetStart) + 3;
const engine = source.slice(assetStart, assetEnd) + '\n' + [
  'seededNoise', 'firstNumericValue', 'importedRecordForDate', 'importedNumericForDate',
  'marketPrice', 'calendarDaysBetween', 'currentDate', 'recordPerformance',
  'feeRateFor', 'fundSubscriptionQuote', 'tradeFeeDetails',
  'bondCouponDates', 'bondAccrualForDate', 'bondTradeQuote',
  'valueOfHolding', 'pendingOrderValue', 'totalValue',
  'openTrade', 'updateEstimate', 'confirmTrade', 'settleBondCashflows'
].map(productionFunction).join('\n');

function account(dates) {
  const fields = new Map();
  const field = selector => {
    if (!fields.has(selector)) fields.set(selector, {
      value: '', checked: false, textContent: '', innerHTML: '', style: {},
      previousElementSibling: { textContent: '' },
      classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}
    });
    return fields.get(selector);
  };
  const context = {
    tradingDates: dates, replayStartDate: dates[0],
    state: {
      day: 0, cash: 10000, startCash: 10000, holdings: {}, orders: [], cashflows: [],
      activities: [], performance: { fees: 0, interestIncome: 0, realizedPnl: 0 },
      marketData: { bond: Object.fromEntries(dates.map(date => [date, { close: 100 }])) },
      ventures: { shop: {}, startup: {} }
    },
    $: field, render() {}, toast() {}, money: value => String(value),
    annualRateForDate: () => 0.003
  };
  context.closeTrade = () => { context.state.selectedAsset = null; context.state.selectedSide = 'buy'; };
  context.addActivity = (title, detail, amount) => context.state.activities.push({ title, detail, amount });
  vm.createContext(context);
  vm.runInContext(engine, context, { filename: 'app.js:bond-cashflow-regression' });
  const assets = vm.runInContext('ASSETS', context);
  context.displayAsset = id => assets[id];
  context.assetName = id => assets[id].name;
  context.submit = (side, amount) => {
    context.state.selectedAsset = 'bond';
    context.state.selectedSide = side;
    field('#tradeAmount').value = String(amount);
    context.confirmTrade();
    return context.state.orders.at(-1);
  };
  return context;
}
function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: expected ${expected}, received ${actual}`);
}

// Purchasing an accrued coupon is a transfer of value to the seller, not free
// interest for the buyer. The same full-price quote drives estimate and execution.
{
  const ctx = account(['2020-01-02', '2020-01-03']);
  const accrual = ctx.bondAccrualForDate('2020-01-02');
  assert.equal(accrual.previousCouponDate, '2019-12-30');
  assert.equal(accrual.nextCouponDate, '2020-06-30');
  assert.equal(accrual.periodDays, 183);
  assert.equal(accrual.elapsedDays, 3);
  close(accrual.accruedPerUnit, 1.375 * 3 / 183, 'Accrual uses the actual coupon period');
  ctx.openTrade('bond', 'buy');
  ctx.$('#tradeAmount').value = '1000';
  ctx.updateEstimate();
  const quote = ctx.bondTradeQuote(1000, 100);
  assert.ok(ctx.$('#tradeEstimate').textContent.includes(String(quote.grossAmount)));
  const order = ctx.submit('buy', 1000);
  assert.equal(order.quantity, 9);
  close(order.cashEffect, quote.grossAmount, 'Execution uses the full-price estimate');
  close(order.cashEffect, 9 * (100 + 1.375 * 3 / 183), 'Buyer pays clean price plus purchased accrued interest');
  close(ctx.state.holdings.bond.accruedInterest, 9 * accrual.accruedPerUnit, 'Purchased accrual remains in the holding valuation');
  close(ctx.totalValue(), 10000 - order.fee, 'Buying the bond changes account value only by fees');
}

// Buying one day before a coupon must earn only one day's coupon accrual. A
// coupon is fixed per unit, rather than merely the interest accrued while held.
{
  const ctx = account(['2020-06-29', '2020-06-30']);
  const order = ctx.submit('buy', 1000);
  assert.equal(order.quantity, 9);
  close(ctx.totalValue(), 10000, 'Pre-coupon purchase has no instant paper profit');
  ctx.state.day = 1;
  ctx.settleBondCashflows();
  const coupons = ctx.state.cashflows.filter(row => row.type === '国债付息（教学示例）');
  assert.equal(coupons.length, 1);
  close(coupons[0].amount, 9 * 1.375, 'Every held unit receives its full fixed half-year coupon');
  assert.equal(ctx.state.holdings.bond.accruedInterest, 0);
  close(ctx.totalValue() - 10000, 9 * 1.375 / 183, 'Coupon cash replaces purchased accrual; it is not a windfall');
  const paid = JSON.stringify(ctx.state);
  ctx.settleBondCashflows();
  assert.equal(JSON.stringify(ctx.state), paid, 'Repeating settlement cannot pay a coupon twice');
  ctx.submit('buy', 1000);
  ctx.settleBondCashflows();
  assert.equal(ctx.state.cashflows.filter(row => row.type === '国债付息（教学示例）').length, 1,
    'Units purchased after the coupon has been paid cannot receive it again');
}

// Selling part of a holding transfers the same proportion of face value and
// accrued interest, while preserving the account's value at the sale price.
{
  const ctx = account(['2020-01-02', '2020-01-03']);
  ctx.submit('buy', 1000);
  ctx.state.day = 1;
  ctx.settleBondCashflows();
  const accruedBefore = ctx.state.holdings.bond.accruedInterest;
  const totalBefore = ctx.totalValue();
  const unitFullPrice = 100 + ctx.bondAccrualForDate('2020-01-03').accruedPerUnit;
  const sale = ctx.submit('sell', 3 * unitFullPrice);
  assert.equal(sale.quantity, 3);
  assert.equal(ctx.state.holdings.bond.quantity, 6);
  assert.equal(ctx.state.holdings.bond.faceValue, 600);
  close(ctx.state.holdings.bond.accruedInterest, accruedBefore * 2 / 3, 'A partial sale proportionally transfers accrued interest');
  close(sale.cashEffect, 300 + accruedBefore / 3, 'Seller receives clean proceeds plus transferred accrued interest');
  close(ctx.totalValue(), totalBefore - sale.fee, 'A partial sale does not create or lose principal');
}

// A newly purchased position on a coupon date starts after that date's payment.
{
  const ctx = account(['2020-06-30']);
  const order = ctx.submit('buy', 1000);
  assert.equal(order.quantity, 10);
  assert.equal(order.cashEffect, 1000);
  ctx.settleBondCashflows();
  assert.equal(ctx.state.cashflows.filter(row => row.type === '国债付息（教学示例）').length, 0);
  assert.equal(ctx.totalValue(), 10000);
}

// Maturity pays the final coupon and principal exactly once, including the
// fallback case where a final coupon is still marked unpaid in a saved holding.
{
  const ctx = account(['2024-12-27', '2024-12-30']);
  const order = ctx.submit('buy', 1000);
  ctx.state.day = 1;
  ctx.settleBondCashflows();
  assert.equal(ctx.state.holdings.bond, undefined);
  const coupons = ctx.state.cashflows.filter(row => row.type === '国债付息（教学示例）');
  const principal = ctx.state.cashflows.filter(row => row.type === '国债到期兑付（教学示例）');
  assert.equal(coupons.length, 1);
  assert.equal(principal.length, 1);
  close(coupons[0].amount, order.quantity * 1.375, 'Final fixed coupon is paid');
  close(principal[0].amount, order.quantity * 100, 'Maturity repays face value');
  close(ctx.totalValue(), 10000 + order.quantity * 1.375 * 3 / 183, 'Only the final three days are earned after the purchase');
  const cash = ctx.state.cash;
  ctx.settleBondCashflows();
  assert.equal(ctx.state.cash, cash, 'Redeemed principal cannot be paid twice');
}
{
  const ctx = account(['2024-12-30']);
  ctx.state.holdings.bond = { quantity: 2, availableQuantity: 2, faceValue: 200, accruedInterest: 2.7, cost: 200, lastAccrualDate: '2024-12-30', lastCouponDate: '2024-06-30' };
  ctx.settleBondCashflows();
  close(ctx.state.cash, 10202.75, 'Maturity includes an unpaid final coupon');
  assert.equal(ctx.state.holdings.bond, undefined);
}

console.log('Bond cashflow regression passed: full-price trades, fixed coupons, proportional accrued interest, no coupon windfall, and idempotent maturity.');
