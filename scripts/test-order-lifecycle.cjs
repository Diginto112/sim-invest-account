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
const engine = [
  'seededNoise', 'firstNumericValue', 'importedRecordForDate', 'importedNumericForDate',
  'marketPrice', 'calendarDaysBetween', 'currentDate', 'recordPerformance',
  'feeRateFor', 'fundSubscriptionQuote', 'tradeFeeDetails', 'fundTradeAvailability', 'rejectFundOrder',
  'valueOfHolding', 'pendingOrderValue', 'totalValue',
  'openTrade', 'updateEstimate', 'confirmTrade', 'settleOrder', 'settleFundFees',
  'cancelOrder', 'advanceDay'
].map(productionFunction).join('\n');
const dates = ['2020-01-02', '2020-01-03', '2020-01-06', '2020-01-07'];

function account() {
  const fields = new Map();
  function field(selector) {
    if (!fields.has(selector)) fields.set(selector, {
      value: '', checked: false, disabled: false, hidden: false, textContent: '', innerHTML: '',
      previousElementSibling: { textContent: '' }, style: {},
      classList: { toggle() {}, add() {}, remove() {} }, setAttribute() {}
    });
    return fields.get(selector);
  }
  const context = {
    ASSETS: {
      stock: { id: 'stock', name: '回归股票', unit: '元/股', rule: 'T+1', price: 10 },
      fund: { id: 'fund', name: '回归基金', unit: '元/份', rule: 'T+1确认', managementFeeAnnual: 0.015, custodyFeeAnnual: 0.0025 },
      bank: { id: 'bank', name: '存款', unit: '元', rule: '按日计息' },
      bond: { id: 'bond', lotSize: 1, faceValue: 100 }
    },
    tradingDates: dates, replayStartDate: dates[0],
    state: {
      day: 0, cash: 10000, startCash: 10000, holdings: {}, orders: [], cashflows: [],
      marketData: {
        fund: Object.fromEntries(dates.map((date, index) => [date, { nav: 2 ** index }])),
        stock: Object.fromEntries(dates.map((date, index) => [date, { close: 10 + index }]))
      },
      performance: { fees: 0, realizedPnl: 0 }, activities: [], history: [],
      snapshots: [{ day: 0, total: 10000 }], lessonIndex: 0,
      ventures: { shop: { closed: false }, startup: { exited: false, failed: false } }
    },
    $: field, money: value => String(value),
    render() {}, settleBankInterest() {}, maybeRunBankPlan() {},
    settleBondCashflows() {}, settleStartupCashflows() {},
    annualRateForDate: () => 0.015
  };
  context.displayAsset = id => context.ASSETS[id];
  context.assetName = id => context.ASSETS[id]?.name || id;
  context.addActivity = (title, detail, amount) => context.state.activities.push({ title, detail, amount });
  context.toast = message => { context.lastToast = message; };
  context.closeTrade = () => { context.state.selectedAsset = null; context.state.selectedSide = 'buy'; };
  context.captureReplayState = () => JSON.parse(JSON.stringify({ ...context.state, history: [] }));
  vm.createContext(context);
  vm.runInContext(engine, context, { filename: 'app.js:order-lifecycle-regression' });
  context.submit = (id, side, amount) => {
    context.state.selectedAsset = id;
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
function fundHolding(quantity = 1000) {
  return { quantity, availableQuantity: quantity, frozenQuantity: 0, pendingSellQuantity: 0, cost: quantity, lastFeeDate: dates[0] };
}

// Submission uses a known amount, not the displayed NAV to lock tomorrow's
// units. A deliberately changing NAV exposes accidental look-ahead pricing.
{
  const ctx = account();
  const order = ctx.submit('fund', 'buy', 10000);
  const expectedNetSubscription = 10000 / 1.0015;
  assert.equal(order.quantity, 0);
  assert.equal(order.price, null);
  assert.equal(order.confirmDate, dates[1]);
  assert.equal(ctx.state.cash, 0, 'A 10000 subscription must debit exactly 10000 including its fee');
  close(order.amount, expectedNetSubscription, 'The external fee method determines the net invested amount');
  close(order.fee, 10000 - expectedNetSubscription, 'Subscription fee is contained in the submitted gross amount');
  close(ctx.totalValue(), expectedNetSubscription, 'Pending net subscription stays in account assets');
  ctx.advanceDay();
  assert.equal(order.status, '已结算');
  assert.equal(order.price, 2);
  close(order.quantity, expectedNetSubscription / 2, 'Confirmed units use the net subscription divided by the next NAV');
  close(ctx.state.holdings.fund.availableQuantity, expectedNetSubscription / 2, 'Confirmed units become available');
  close(ctx.state.holdings.fund.cost, 10000, 'The holding cost includes the subscription fee exactly once');
  close(ctx.totalValue(), expectedNetSubscription, 'Confirmation does not create or remove principal');
  ctx.settleOrder(order);
  close(ctx.state.holdings.fund.quantity, expectedNetSubscription / 2, 'A settled order cannot settle twice');
}

// T+1 values a redemption, T+2 pays it. Between those dates the proceeds are a
// fixed receivable and must not continue changing with the fund's quoted NAV.
{
  const ctx = account();
  ctx.state.holdings.fund = fundHolding();
  const order = ctx.submit('fund', 'sell', 200);
  assert.equal(order.confirmDate, dates[1]);
  assert.equal(order.settlementDate, dates[2]);
  assert.equal(ctx.state.cash, 10000);
  assert.equal(ctx.state.holdings.fund.availableQuantity, 800);
  assert.equal(ctx.state.performance.fees, 0, 'A pending redemption has no charged fee');
  ctx.advanceDay();
  assert.equal(order.status, '待结算');
  assert.equal(order.redemptionConfirmed, true);
  assert.equal(order.quantity, 200);
  assert.equal(order.price, 2);
  assert.equal(order.cashEffect, 398);
  assert.equal(ctx.pendingOrderValue(), 398);
  assert.equal(ctx.state.cash, 10000, 'T+1 confirmation does not release cash early');
  close(ctx.valueOfHolding('fund', ctx.state.holdings.fund), 1600, 'Confirmed redemption units leave market exposure');
  close(ctx.totalValue(), 11998, 'Holdings and receivable are not double counted');
  const snapshot = JSON.stringify(ctx.state);
  ctx.cancelOrder(order.id);
  assert.equal(JSON.stringify(ctx.state), snapshot, 'Confirmed redemption cannot be cancelled');
  ctx.advanceDay();
  assert.equal(order.status, '已结算');
  assert.equal(ctx.state.cash, 10398);
  assert.equal(ctx.pendingOrderValue(), 0);
  assert.equal(ctx.state.holdings.fund.quantity, 800);
  assert.equal(ctx.state.holdings.fund.availableQuantity, 800);
  assert.equal(ctx.state.holdings.fund.frozenQuantity, 0);
  assert.equal(ctx.state.holdings.fund.pendingSellQuantity, 0);
  assert.equal(ctx.state.holdings.fund.cost, 800);
  assert.equal(ctx.state.performance.fees, 2);
  assert.equal(ctx.state.performance.realizedPnl, 198);
  close(ctx.totalValue(), 13598, 'Only remaining units receive the next NAV change');
  ctx.settleOrder(order);
  assert.equal(ctx.state.cash, 10398, 'A payout cannot be duplicated');
}

// Pending funds remain cancellable; matched stock trades do not. Cancelling an
// unconfirmed redemption restores frozen units without reversing an uncharged fee.
{
  const ctx = account();
  const buy = ctx.submit('fund', 'buy', 1000);
  ctx.cancelOrder(buy.id);
  assert.equal(ctx.state.cash, 10000);
  assert.equal(ctx.state.performance.fees, 0);
  assert.equal(buy.status, '已撤单');
  ctx.state.holdings.fund = fundHolding();
  const sell = ctx.submit('fund', 'sell', 200);
  ctx.cancelOrder(sell.id);
  assert.equal(ctx.state.holdings.fund.availableQuantity, 1000);
  assert.equal(ctx.state.holdings.fund.frozenQuantity, 0);
  assert.equal(ctx.state.performance.fees, 0);
  assert.equal(ctx.state.cash, 10000);
}
{
  const ctx = account();
  const buy = ctx.submit('stock', 'buy', 1000);
  assert.equal(ctx.state.holdings.stock.quantity, 100);
  assert.equal(ctx.state.holdings.stock.availableQuantity, 0);
  assert.equal(buy.fee, 5.02);
  assert.equal(buy.feeBreakdown.commission, 5);
  assert.equal(buy.feeBreakdown.transfer, 0.02);
  assert.equal(buy.feeBreakdown.stamp, 0);
  close(ctx.totalValue(), 9994.98, 'Stock purchase reduces assets only by the actual fees');
  close(ctx.state.cash, 8994.98, 'Stock purchase cash matches principal plus itemized fees');
  const matchedBuy = JSON.stringify(ctx.state);
  ctx.cancelOrder(buy.id);
  assert.equal(JSON.stringify(ctx.state), matchedBuy, 'Matched stock buy cannot be reversed');
  ctx.advanceDay();
  assert.equal(ctx.state.holdings.stock.availableQuantity, 100);
  const sell = ctx.submit('stock', 'sell', 1100);
  assert.equal(ctx.state.holdings.stock.availableQuantity, 0);
  assert.equal(sell.fee, 6.12);
  assert.equal(sell.feeBreakdown.commission, 5);
  assert.equal(sell.feeBreakdown.transfer, 0.02);
  assert.equal(sell.feeBreakdown.stamp, 1.1);
  close(ctx.totalValue(), 10088.86, 'Matched sale counts cash once and excludes sold shares');
  const matchedSell = JSON.stringify(ctx.state);
  ctx.cancelOrder(sell.id);
  assert.equal(JSON.stringify(ctx.state), matchedSell, 'Matched stock sell cannot be reversed');
  ctx.advanceDay();
  assert.equal(sell.status, '已结算');
  assert.equal(ctx.state.holdings.stock, undefined);
  close(ctx.state.cash, 10088.86, 'Stock round trip preserves the cash identity');
  close(ctx.state.performance.realizedPnl, 88.86, 'Realized stock profit equals proceeds minus the fee-inclusive cost');
  close(ctx.state.performance.fees, 11.14, 'All itemized stock fees are recorded exactly once');
}

// A history row permitting today's order can be followed by a suspended
// valuation day. Check the actual valuation-day status and release all locks.
for (const side of ['buy', 'sell']) {
  const ctx = account();
  if (side === 'sell') ctx.state.holdings.fund = fundHolding();
  ctx.state.marketData.fund[dates[0]][side === 'buy' ? 'subscription_status' : 'redemption_status'] = side === 'buy' ? '开放申购' : '开放赎回';
  ctx.state.marketData.fund[dates[1]][side === 'buy' ? 'subscription_status' : 'redemption_status'] = side === 'buy' ? '暂停申购' : '暂停赎回';
  const order = ctx.submit('fund', side, 200);
  assert.equal(order.status, '待确认');
  ctx.advanceDay();
  assert.equal(order.status, '已拒绝');
  assert.ok(order.rejectReason.includes('暂停'));
  assert.equal(ctx.state.cash, 10000);
  assert.equal(ctx.state.performance.fees, 0);
  assert.equal(ctx.pendingOrderValue(), 0);
  if (side === 'sell') {
    assert.equal(ctx.state.holdings.fund.quantity, 1000);
    assert.equal(ctx.state.holdings.fund.availableQuantity, 1000);
    assert.equal(ctx.state.holdings.fund.frozenQuantity, 0);
    assert.equal(ctx.state.holdings.fund.cost, 1000);
  } else assert.equal(ctx.state.holdings.fund, undefined);
  const afterRejection = JSON.stringify(ctx.state);
  ctx.settleOrder(order);
  assert.equal(JSON.stringify(ctx.state), afterRejection, 'A rejected order must not refund twice');
}

// Carrying a NAV forward is valid for valuing an existing holding, but that
// carried value cannot invent a confirmation when the estimation date is absent.
for (const side of ['buy', 'sell']) {
  const ctx = account();
  if (side === 'sell') ctx.state.holdings.fund = fundHolding();
  delete ctx.state.marketData.fund[dates[1]];
  const order = ctx.submit('fund', side, 200);
  ctx.advanceDay();
  assert.equal(ctx.marketPrice('fund', 1), 1, 'An existing holding can retain its last known valuation');
  assert.equal(order.status, '已拒绝');
  assert.ok(order.rejectReason.includes('缺少历史净值'));
  assert.equal(ctx.state.cash, 10000);
  assert.equal(ctx.state.performance.fees, 0);
  if (side === 'sell') assert.equal(ctx.state.holdings.fund.availableQuantity, 1000);
}

// Already known suspensions are surfaced by the ticket and cannot be bypassed
// by invoking the engine directly. Configured commissions apply to both the
// estimate and the actual order, with the historical taxes kept separate.
{
  const ctx = account();
  ctx.state.marketData.fund[dates[0]].subscription_status = '暂停申购';
  ctx.openTrade('fund', 'buy');
  assert.equal(ctx.$('#confirmTrade').disabled, true);
  assert.ok(ctx.$('#tradeSettlementHint').textContent.includes('暂停申购'));
  ctx.submit('fund', 'buy', 200);
  assert.equal(ctx.state.orders.length, 0);
  assert.equal(ctx.state.cash, 10000);
}
{
  const ctx = account();
  ctx.state.stockCommission = { rate: 0.001, minimum: 2 };
  ctx.openTrade('stock', 'buy');
  ctx.$('#tradeAmount').value = '1000';
  ctx.updateEstimate();
  const estimatedText = ctx.$('#tradeFee').textContent;
  const buy = ctx.submit('stock', 'buy', 1000);
  assert.equal(buy.fee, 2.02);
  assert.equal(buy.feeBreakdown.commission, 2);
  assert.ok(estimatedText.startsWith('2.02'), 'The estimate and matched order must use the same fee helper');
  assert.ok(ctx.$('#tradeSettlementHint').textContent.includes('可配置'));
  assert.equal(ctx.tradeFeeDetails('stock', 'buy', 0).total, 0, 'A zero-quantity estimate must not charge the minimum commission');
}

// End-of-window constraints must hold in the engine even if a caller bypasses
// the disabled UI control; immediate cash deposits remain possible.
{
  const ctx = account();
  ctx.state.day = dates.length - 2;
  ctx.state.holdings.fund = fundHolding();
  const before = JSON.stringify(ctx.state.holdings.fund);
  ctx.submit('fund', 'sell', 400);
  assert.equal(ctx.state.orders.length, 0);
  assert.equal(JSON.stringify(ctx.state.holdings.fund), before);
  ctx.openTrade('fund', 'sell');
  assert.equal(ctx.$('#confirmTrade').disabled, true);
  assert.ok(ctx.$('#tradeSettlementHint').textContent.includes('剩余交易日不足'));
  ctx.state.day = dates.length - 1;
  ctx.submit('fund', 'buy', 1000);
  ctx.submit('stock', 'buy', 1300);
  assert.equal(ctx.state.orders.length, 0);
  assert.equal(ctx.state.cash, 10000);
  ctx.openTrade('fund', 'buy');
  assert.equal(ctx.$('#confirmTrade').disabled, true);
  ctx.openTrade('bank', 'buy');
  assert.equal(ctx.$('#confirmTrade').disabled, false, 'Immediate products do not inherit a disabled fund control');
  ctx.submit('bank', 'buy', 1000);
  assert.equal(ctx.state.holdings.bank.quantity, 1000);
}

console.log('Order lifecycle regression passed: next-NAV fund pricing, T+2 receivables, cancellation restrictions, and replay-end guards.');
