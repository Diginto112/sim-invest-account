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
assert.ok(assetStart >= 0 && assetEnd > assetStart);
const engine = source.slice(assetStart, assetEnd) + '\n' + [
  'firstNumericValue', 'importedRecordForDate', 'importedNumericForDate',
  'marketPrice', 'currentDateForDay', 'calendarDaysBetween', 'currentDate',
  'annualRateForDate', 'annualRateForCalendarDate', 'recordPerformance',
  'feeRateFor', 'tradeFeeDetails', 'valueOfHolding', 'pendingOrderValue', 'totalValue',
  'confirmTrade', 'maybeRunBankPlan', 'settleBankInterest'
].map(productionFunction).join('\n');

function account(dates) {
  const input = { value: '', checked: false };
  const context = {
    tradingDates: dates, replayStartDate: dates[0],
    state: {
      day: 0, cash: 100000, startCash: 100000, holdings: {}, orders: [], cashflows: [],
      activities: [], performance: { fees: 0, interestIncome: 0, realizedPnl: 0 },
      marketData: { bank: { [dates[0]]: { rate_annualized: 0.003 } } },
      ventures: { shop: {}, startup: {} }
    },
    $: () => input, render() {}, toast() {}, money: amount => String(amount)
  };
  context.closeTrade = () => { context.state.selectedAsset = null; context.state.selectedSide = 'buy'; };
  context.addActivity = (title, detail, amount) => context.state.activities.push({ title, detail, amount });
  vm.createContext(context);
  vm.runInContext(engine, context, { filename: 'app.js:bank-interest-regression' });
  const assets = vm.runInContext('ASSETS', context);
  context.displayAsset = id => assets[id];
  context.assetName = id => assets[id].name;
  context.submit = (side, amount) => {
    context.state.selectedAsset = 'bank';
    context.state.selectedSide = side;
    input.value = String(amount);
    context.confirmTrade();
    return context.state.orders.at(-1);
  };
  return context;
}
function close(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: expected ${expected}, received ${actual}`);
}

// Friday to Monday includes three natural days. Unpaid interest is an asset,
// remains outside principal, and is not compounded on the following day.
{
  const ctx = account(['2020-01-03', '2020-01-06', '2020-01-07']);
  assert.equal(ctx.marketPrice('bank', 0), 1, 'A rate must never become a price per yuan');
  assert.equal(ctx.annualRateForDate(), 0.003);
  delete ctx.state.marketData.bank;
  assert.equal(ctx.annualRateForDate(), 0.003, 'The fallback must be the verified demand-deposit rate');
  ctx.submit('buy', 36000);
  ctx.state.day = 1;
  ctx.settleBankInterest();
  const bank = ctx.state.holdings.bank;
  assert.equal(bank.quantity, 36000);
  assert.equal(bank.availableQuantity, 36000);
  close(bank.accruedInterest, 0.9, 'Demand deposit uses actual natural days divided by 360');
  close(ctx.valueOfHolding('bank', bank), 36000.9, 'Accrued interest belongs in account assets');
  close(ctx.totalValue(), 100000.9, 'Only earned interest increases the account value');
  const settled = JSON.stringify(ctx.state);
  ctx.settleBankInterest();
  assert.equal(JSON.stringify(ctx.state), settled, 'Repeated settlement on the same date is idempotent');
  ctx.state.day = 2;
  ctx.settleBankInterest();
  close(bank.accruedInterest, 1.2, 'Uncredited interest must not earn daily compound interest');
}

// The March 21 credit falls on a Saturday. Advancing from Friday to Monday must
// still credit on that actual date, then accrue the weekend on the new principal.
{
  const ctx = account(['2020-03-19', '2020-03-20', '2020-03-23', '2020-03-24']);
  ctx.submit('buy', 36000);
  ctx.state.day = 1;
  ctx.settleBankInterest();
  close(ctx.state.holdings.bank.accruedInterest, 0.3, 'Thursday accrues once');
  ctx.state.day = 2;
  ctx.settleBankInterest();
  const bank = ctx.state.holdings.bank;
  const credits = ctx.state.cashflows.filter(row => row.type === '银行季度结息');
  assert.equal(credits.length, 1);
  assert.equal(credits[0].date, '2020-03-21');
  close(credits[0].amount, 0.6, 'Quarter credit includes interest through March 20');
  close(bank.quantity, 36000.6, 'Quarter interest becomes principal only on the credit date');
  close(bank.availableQuantity, 36000.6, 'Credited interest is available for withdrawal');
  close(bank.accruedInterest, 0.60001, 'Saturday and Sunday accrue on the credited principal');
  close(ctx.state.performance.interestIncome, 1.20001, 'Crediting previously accrued income does not count it twice');
  close(ctx.state.cash, 64000, 'Quarter credit stays inside the deposit');
  const totalBeforeWithdrawal = ctx.totalValue();
  const withdrawal = ctx.submit('sell', bank.quantity);
  close(withdrawal.interestPaid, 0.6, 'Closing the account pays accrued interest rounded to cents');
  close(ctx.state.cash, 100001.2, 'Full withdrawal returns principal and unpaid interest');
  assert.ok(Math.abs(ctx.state.cash - totalBeforeWithdrawal) <= 0.005, 'Only cent rounding may alter the closing value');
  assert.equal(ctx.state.holdings.bank, undefined);
  close(ctx.state.performance.interestIncome, 1.2, 'Closing rounding is reflected once in income');
  assert.equal(ctx.state.performance.realizedPnl, 0, 'Bank interest is not also recorded as trading profit');
  ctx.settleBankInterest();
  close(ctx.state.cash, 100001.2, 'A closed account cannot pay interest again');
}

// Partial withdrawal preserves accrued interest for the normal quarterly credit,
// and only the remaining principal earns interest for the next natural day.
{
  const ctx = account(['2020-01-03', '2020-01-06', '2020-01-07']);
  ctx.submit('buy', 36000);
  ctx.state.day = 1;
  ctx.settleBankInterest();
  ctx.submit('sell', 10000);
  assert.equal(ctx.state.holdings.bank.quantity, 26000);
  close(ctx.state.holdings.bank.accruedInterest, 0.9, 'Partial withdrawal does not discard or pay accrued interest');
  ctx.state.day = 2;
  ctx.settleBankInterest();
  close(ctx.state.holdings.bank.accruedInterest, 0.9 + 26000 * 0.003 / 360, 'Only remaining principal accrues after partial withdrawal');
}

// A rate effective on Sunday affects Sunday only; it must not be applied
// retrospectively to Friday/Saturday simply because the next replay day is Monday.
{
  const ctx = account(['2020-01-03', '2020-01-06']);
  ctx.state.marketData.bank['2020-01-05'] = { rate_annualized: 0.006 };
  ctx.submit('buy', 36000);
  ctx.state.day = 1;
  ctx.settleBankInterest();
  close(ctx.state.holdings.bank.accruedInterest, 1.2, 'Calendar-effective rates apply to the days they cover');
}

// The monthly transfer arrives after the old balance's weekend accrual. Calling
// the plan directly also protects against a caller forgetting that order.
{
  const ctx = account(['2020-01-31', '2020-02-03', '2020-02-04']);
  ctx.submit('buy', 36000);
  ctx.state.bankPlan = { amount: 12000, nextDay: 1, lastDebit: '2020-01-31', createdDate: '2020-01-31' };
  ctx.state.day = 1;
  ctx.maybeRunBankPlan();
  assert.equal(ctx.state.holdings.bank.quantity, 48000);
  close(ctx.state.holdings.bank.accruedInterest, 0.9, 'New monthly money must not earn interest before its transfer date');
  close(ctx.totalValue(), 100000.9, 'Monthly transfer only moves existing account cash');
  ctx.state.day = 2;
  ctx.settleBankInterest();
  close(ctx.state.holdings.bank.accruedInterest, 1.3, 'The new principal starts accruing after transfer');
  ctx.maybeRunBankPlan();
  assert.equal(ctx.state.holdings.bank.quantity, 48000, 'Monthly transfer runs only once per month');
}

console.log('Bank interest regression passed: actual/360 accrual, weekend quarter credits, no double income, withdrawals, and monthly transfers.');
