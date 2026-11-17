const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ASSETS = {
  bank: { id: 'bank', type: '银行', icon: '▤', name: '活期存款账户', subtitle: '按自然日积数计息 · 按季结息', price: 1, unit: '元', rate: 0.003, rateType: '中国银行人民币活期挂牌年利率', interestMethod: '实际天数/360 · 日积数计息', withdrawal: '全额支取结清未结利息；部分支取的未结利息留待季末结算', risk: '低风险', liquidity: '高流动性', rule: '活期 · 按季结息', description: '使用已核验的2020年活期年利率0.30%，按实际自然日/360计息。每季末月20日结息、21日入账；部分支取保留已计未结利息，全额支取结清未结利息。每月定投表示向活期账户自动转入资金。' },
  stock: { id: 'stock', type: '股票', icon: '▥', name: '演示科技 A', subtitle: '股票 · 代码 DEMO', price: 35.2, unit: '元/股', risk: '高风险', liquidity: '高流动性', rule: 'T+1 / 100股起', description: '按历史收盘价回放估值和交易。佣金使用可配置假设：默认万3、每笔最低5元；2020年沪市过户费双向万0.2，卖出印花税千1。' },
  fund: { id: 'fund', type: '基金', icon: '◒', name: '稳健成长混合', subtitle: '公募基金 · 单位净值', price: 1.284, unit: '元/份', managementFeeAnnual: 0.015, custodyFeeAnnual: 0.0025, risk: '中风险', liquidity: '中流动性', rule: 'T+1确认', description: '以单位净值、申赎费、管理费和托管费模拟基金投资，帮助理解长期持有与费率的影响。' },
  bond: { id: 'bond', type: '国债', icon: '◇', name: '记账式国债（教学示例）', subtitle: '演示证券 · 净价报价 / 全价结算', price: 100.35, unit: '元/张', lotSize: 1, coupon: 0.0275, faceValue: 100, issueDate: '2019-12-30', maturityDate: '2024-12-30', nextCouponDate: '2020-06-30', couponFrequency: '每年6月30日与12月30日付息', interestMethod: '按实际票息周期计算应计利息', risk: '低风险', liquidity: '中流动性', rule: '演示 · 半年付息', description: '这是记账式附息国债的教学例子，并非真实发行证券。面值100元、年票息2.75%，每半年每张付息1.375元；买卖以净价加应计利息的全价结算，到期偿还本金及未付利息。' },
  shop: { id: 'shop', type: '创业', icon: '⌂', name: '社区咖啡店', subtitle: '开店经营场景', price: 1, unit: '项目份额', risk: '高风险', liquidity: '低流动性', rule: '按月经营结算', description: '投入装修和开店资金，经营现金流受客流、成本和租金影响。适合学习现金流和机会成本。' },
  startup: { id: 'startup', type: '创业', icon: '✦', name: '智能硬件初创公司', subtitle: '融资与退出场景', price: 10, unit: '元/份', risk: '极高风险', liquidity: '极低流动性', rule: '里程碑估值', description: '模拟融资轮次、烧钱、里程碑和退出估值。它是概率场景，不代表任何真实公司。' }
};

const lessons = [
  { tag: '交易规则', title: 'A 股买入后按 T+1 规则结算', text: '股票成交、可卖数量和费用按当期规则处理，实际成交以交易日和委托状态为准。' },
  { tag: '风险提示', title: '资产收益与波动同时存在', text: '组合页面同时显示当日盈亏、累计收益和最大回撤，避免只看单一收益数字。' },
  { tag: '基金规则', title: '基金申购通常按下一估值日确认', text: '基金订单会经历提交、确认和结算，确认前不会把份额当作可用持仓。' },
  { tag: '债券信息', title: '市场利率变化会影响债券价格', text: '固定票息和二级市场价格分别记录，持有到期和中途卖出会产生不同结果。' },
  { tag: '创业现金流', title: '经营项目按现金流结算', text: '开店经营和融资退出分别记录投入、费用、现金流与估值变化，不混同于证券行情。' }
];

const events = [
  ['2020-01-02', '回放开始', '本日收盘行情已显示。股票使用日频收盘撮合模型，基金提交后使用下一估值日净值。'],
  ['2020-02-03', '春节休市后开市', '休市期间没有证券成交；银行活期利息按自然日继续计提。'],
  ['2020-04-07', '清明节后开市', '交易日和自然日不同，查看订单确认日期与利息明细。'],
  ['2020-05-06', '劳动节后开市', '本回放期的中国银行活期挂牌利率保持0.30%，不按行情波动调整。'],
  ['2020-06-29', '端午节后开市', '接近半年末，检查尚未确认、尚未到账和不能即时退出的资产。'],
  ['2020-06-30', '半年复盘', '比较资产配置、交易频率和费用对最终结果的贡献。']
];

function makeTradingDates() {
  const supplied = typeof window !== 'undefined' ? window.INVEST_HISTORY_SNAPSHOT?.calendar?.dates : null;
  if (Array.isArray(supplied) && supplied.length && supplied.every((value, index) => /^2020-\d{2}-\d{2}$/.test(value) && (!index || value > supplied[index - 1]))) return supplied.slice();
  const dates = [];
  const date = new Date(Date.UTC(2020, 0, 2));
  const closedIntervals = [
    ['2020-01-24', '2020-02-02'],
    ['2020-04-04', '2020-04-06'],
    ['2020-05-01', '2020-05-05'],
    ['2020-06-25', '2020-06-27']
  ];
  const isClosed = value => closedIntervals.some(([from, to]) => value >= from && value <= to);
  while (date <= new Date(Date.UTC(2020, 5, 30))) {
    const value = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6 && !isClosed(value)) dates.push(value);
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return dates;
}

const tradingDates = makeTradingDates();
const replayStartDate = tradingDates[0];
const replayEndDate = tradingDates[tradingDates.length - 1];
const supportedAssetIds = new Set(Object.keys(ASSETS));

function seededNoise(n) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

function firstNumericValue(...values) {
  const value = values.find(candidate => candidate !== '' && candidate != null && Number.isFinite(Number(candidate)));
  return value == null ? NaN : Number(value);
}

// Imported snapshots often contain one row per trading day (and bank rates are
// usually effective from a date onward). Resolve the latest record on or before
// the requested date so a missing row does not silently switch the account back
// to the demo curve or the fallback rate.
function importedRecordForDate(assetId, date) {
  const series = state?.marketData?.[assetId];
  if (!series || !date) return null;
  if (series[date] != null) return series[date];
  const priorDate = Object.keys(series).filter(candidate => candidate <= date).sort().pop();
  return priorDate ? series[priorDate] : null;
}

function importedNumericForDate(assetId, date, keys = ['close', 'nav', 'rate_annualized', 'rate', 'value']) {
  const record = importedRecordForDate(assetId, date);
  if (record == null) return NaN;
  return typeof record === 'object' ? firstNumericValue(...keys.map(key => record[key])) : firstNumericValue(record);
}

function displayAsset(assetId) {
  const base = ASSETS[assetId];
  if (!base) return base;
  const metadata = state?.instrumentMeta?.[assetId] || {};
  const symbol = String(metadata.symbol || '').trim();
  const name = String(metadata.name || metadata.instrument_name || metadata.asset_name || '').trim();
  return {
    ...base,
    name: name || base.name,
    subtitle: symbol ? `${base.type} · ${symbol}` : base.subtitle,
    description: symbol && assetId === 'stock' ? '历史不复权行情。当前使用日频收盘价撮合教学模型，含整手、T+1 和费用；不模拟盘中排队成交。'
      : symbol && assetId === 'fund' ? '按下一估值日公布的单位净值确认申赎，净值已内扣管理与托管费用。暂停申购、确认和到账分别处理；申赎费率使用页面列出的教学渠道假设。'
        : base.description
  };
}

function assetName(assetId) { return displayAsset(assetId)?.name || ASSETS[assetId]?.name || assetId; }

function marketPrice(assetId, day) {
  if (assetId === 'startup' && state?.ventures?.startup?.failed) return 0;
  if (assetId === 'bank') return 1; // Interest rates are not a price per yuan of principal.
  const importedValue = importedNumericForDate(assetId, tradingDates[day]);
  if (Number.isFinite(importedValue)) return importedValue;
  if (assetId === 'stock') return Math.max(18, 35.2 * (1 + 0.018 * Math.sin(day / 8) + 0.0018 * day + 0.012 * seededNoise(day + 4)));
  if (assetId === 'fund') {
    const grossNav = Math.max(.9, 1.284 * (1 + 0.014 * Math.sin(day / 10) + 0.0009 * day + 0.006 * seededNoise(day + 16)));
    const annualFee = Number(ASSETS.fund.managementFeeAnnual || 0) + Number(ASSETS.fund.custodyFeeAnnual || 0);
    const elapsedDays = calendarDaysBetween(replayStartDate, tradingDates[day]);
    // Only the synthetic gross curve needs a fee adjustment. Imported published
    // NAVs above already include fund expenses; neither path changes units held.
    return grossNav * Math.exp(-annualFee * elapsedDays / 365);
  }
  if (assetId === 'bond') return 100.35 + 0.012 * day - 0.5 * Math.sin(day / 28) + 0.08 * seededNoise(day + 30);
  if (assetId === 'shop') return Math.max(.7, 1 + 0.006 * Math.sin(day / 12) + (day > 18 ? 0.0007 * (day - 18) : 0) + 0.008 * seededNoise(day + 44));
  if (assetId === 'startup') {
    if (state?.ventures?.startup?.failed) return 0;
    return Math.max(2.5, 10 * (1 + 0.018 * Math.sin(day / 14) + (day > 65 ? .004 * (day - 65) : -.0015 * day) + 0.03 * seededNoise(day + 70)));
  }
  return 1;
}

function annualRateForDate(day = state?.day || 0) {
  const date = currentDateForDay(day);
  const raw = importedNumericForDate('bank', date, ['rate_annualized', 'rate', 'value', 'close']);
  if (Number.isFinite(raw)) return raw > 1 ? raw / 100 : raw;
  return ASSETS.bank.rate;
}

function currentDateForDay(day) { return tradingDates[Math.max(0, Math.min(day, tradingDates.length - 1))]; }
function calendarDaysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T00:00:00Z`); const to = new Date(`${toDate}T00:00:00Z`);
  return Math.max(0, Math.round((to - from) / 86400000));
}
function annualRateForCalendarDate(date) {
  const raw = importedNumericForDate('bank', date, ['rate_annualized', 'rate', 'value', 'close']);
  if (Number.isFinite(raw)) return raw > 1 ? raw / 100 : raw;
  return ASSETS.bank.rate;
}

function defaultState(initialCash = 100000) {
  const seedCash = Number.isFinite(Number(initialCash)) && Number(initialCash) > 0 ? Number(initialCash) : 100000;
  return {
    day: 0,
    cash: seedCash,
    startCash: seedCash,
    holdings: {},
    orders: [],
    cashflows: [],
    bankPlan: null,
    stockCommission: { rate: 0.0003, minimum: 5 },
    performance: { realizedPnl: 0, fees: 0, interestIncome: 0, operatingIncome: 0, dividends: 0 },
    ventures: {
      shop: { opened: false, closed: false, invested: 0, month: 0, lastSettlement: null, cumulativeRevenue: 0, cumulativeCost: 0 },
      startup: { round: '种子轮', invested: 0, companyCash: 0, founderCapital: 50000, monthlyBurn: 12000, cumulativeBurn: 0, financingRaised: 0, runwayMonths: 0, dilution: 0, milestone: '产品验证', aRoundCompleted: false, exited: false, failed: false, exitDate: null }
    },
    marketData: {},
    instrumentMeta: {},
    dataSnapshotId: 'demo-snapshot-v8',
    dataStatus: 'demo',
    dataMeta: { source: '内置演示曲线', licenseStatus: 'demo', retrievedAt: null, acceptedCount: 0, rejectedCount: 0, warnings: [], quality: { sourcePresent: true, licensePresent: true, retrievedAtPresent: false, retrievedAtValid: false } },
    activities: [{ date: '2020-01-02', title: '模拟账户已创建', detail: `初始资金 ${money(seedCash)}，等待你的第一笔决策。`, amount: 0 }],
    snapshots: [{ day: 0, total: seedCash, daily: 0 }],
    history: [],
    selectedAsset: null,
    selectedSide: 'buy',
    lessonIndex: 0,
    filter: 'all'
  };
}

let state = loadState();

function loadState() {
  if (new URLSearchParams(location.search).get('reset') === '1') return defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem('sim-invest-account-state')) || JSON.parse(localStorage.getItem('invest-lab-state'));
    if (saved && saved.startCash) {
      const fresh = defaultState();
      const restored = {
        ...fresh,
        ...saved,
        orders: saved.orders || [],
        cashflows: saved.cashflows || [],
        marketData: saved.marketData || {},
        instrumentMeta: saved.instrumentMeta || {},
        history: Array.isArray(saved.history) ? saved.history : [],
        dataMeta: { ...fresh.dataMeta, ...(saved.dataMeta || {}) },
        selectedSide: saved.selectedSide || 'buy',
        bankPlan: saved.bankPlan || null,
        performance: { ...fresh.performance, ...(saved.performance || {}) },
        ventures: {
          ...fresh.ventures,
          ...(saved.ventures || {}),
          shop: { ...fresh.ventures.shop, ...((saved.ventures || {}).shop || {}) },
          startup: { ...fresh.ventures.startup, ...((saved.ventures || {}).startup || {}) }
        }
      };
      restored.day = Math.max(0, Math.min(Number(restored.day || 0), tradingDates.length - 1));
      normalizeHoldings(restored);
      const startupHolding = restored.holdings.startup;
      const startupVenture = restored.ventures.startup;
      if (startupHolding && Number(startupVenture.companyCash || 0) <= 0 && Number(startupVenture.invested || 0) > 0) startupVenture.companyCash = Number(startupVenture.founderCapital || 0) + Number(startupVenture.invested || 0);
      if (startupVenture.companyCash > 0 && Number(startupVenture.runwayMonths || 0) <= 0) startupVenture.runwayMonths = startupVenture.companyCash / Math.max(Number(startupVenture.monthlyBurn || 1), 1);
      return restored;
    }
  } catch (error) { /* ignore invalid local state */ }
  return defaultState();
}

// 兼容旧版快照，并为交易生命周期补齐“可用/冻结”数量。
function normalizeHoldings(targetState = state) {
  Object.values(targetState.holdings || {}).forEach(holding => {
    holding.quantity = Number(holding.quantity || 0);
    holding.cost = Number(holding.cost || 0);
    holding.frozenQuantity = Number(holding.frozenQuantity || 0);
    holding.pendingSellQuantity = Number(holding.pendingSellQuantity || 0);
    if (holding.availableQuantity == null) holding.availableQuantity = Math.max(0, holding.quantity - holding.frozenQuantity);
    holding.availableQuantity = Math.max(0, Math.min(holding.availableQuantity, holding.quantity));
  });
}

function saveState() { localStorage.setItem('sim-invest-account-state', JSON.stringify(state)); }
function money(value, digits = 2) { return `¥${Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`; }
function pct(value) { return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`; }
function signedMoney(value) { return `${value >= 0 ? '+' : '-'}${money(Math.abs(value))}`; }
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
function quoteProvenance(assetId, day = state.day) {
  if (['shop', 'startup'].includes(assetId)) return { label: '经营情景', source: '自定义经营假设', date: currentDateForDay(day), kind: 'scenario' };
  const target = currentDateForDay(day);
  const series = state.marketData?.[assetId] || {};
  const date = Object.keys(series).filter(value => value <= target).sort().pop();
  if (!date) return { label: '演示数据', source: '内置演示假设', date: target, kind: 'demo' };
  const record = series[date];
  const license = normalizeLicenseStatus(record?.license_status);
  const baseLabel = licenseStatusLabel(license);
  const carried = date !== target && assetId !== 'bank';
  return { label: `${baseLabel}${carried ? ' · 前值沿用' : ''}`, source: record?.source || '来源未填写', date, kind: license === 'demo' ? 'demo' : 'imported', license, carried };
}
function dataStatusLabel() {
  const quotes = ['stock', 'fund', 'bond', 'bank'].map(id => quoteProvenance(id));
  const imported = quotes.filter(quote => quote.kind === 'imported');
  if (!imported.length) return '演示数据 · 经营情景';
  if (imported.length < quotes.length) return '部分历史数据 · 含演示';
  if (imported.some(quote => !['authorized', 'public_personal_use'].includes(quote.license))) return '已导入 · 许可待核验';
  return '历史数据 · 经营情景';
}
function dataNoticeText() {
  return `${dataStatusLabel()}。每个标的分别显示来源和生效日期；缺少交易日时会明确标注前值沿用。开店与创业公司使用经营情景。账户只在本地模拟，不连接真实银行或券商。`;
}
function recordPerformance(field, amount) {
  if (!state.performance) state.performance = { realizedPnl: 0, fees: 0, interestIncome: 0, operatingIncome: 0, dividends: 0 };
  state.performance[field] = Number(state.performance[field] || 0) + Number(amount || 0);
}
function feeRateFor(assetId, side) {
  if (assetId === 'fund') return side === 'sell' ? 0.005 : 0.0015;
  return 0;
}
function fundSubscriptionQuote(grossAmount) {
  const gross = Math.max(0, Number(grossAmount) || 0);
  const netAmount = gross / (1 + feeRateFor('fund', 'buy'));
  return { grossAmount: gross, netAmount, fee: gross - netAmount };
}
function tradeFeeDetails(assetId, side, amount) {
  const gross = Math.max(0, Number(amount) || 0);
  if (assetId === 'fund' && side === 'buy') { const quote = fundSubscriptionQuote(gross); return { commission: 0, transfer: 0, stamp: 0, other: quote.fee, total: quote.fee }; }
  if (assetId !== 'stock') return { commission: 0, transfer: 0, stamp: 0, other: gross * feeRateFor(assetId, side), total: gross * feeRateFor(assetId, side) };
  const configured = state.stockCommission || {};
  const rate = Number.isFinite(Number(configured.rate)) && Number(configured.rate) >= 0 ? Number(configured.rate) : 0.0003;
  const minimum = Number.isFinite(Number(configured.minimum)) && Number(configured.minimum) >= 0 ? Number(configured.minimum) : 5;
  const cents = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const commission = gross > 0 ? cents(Math.max(minimum, gross * rate)) : 0;
  // The replay window is 2020 H1, and the bundled stock is a Shanghai A-share.
  const transfer = cents(gross * 0.00002);
  const stamp = side === 'sell' ? cents(gross * 0.001) : 0;
  return { commission, transfer, stamp, other: 0, total: cents(commission + transfer + stamp), commissionRate: rate, minimumCommission: minimum, commissionAssumption: true, ruleWindow: '2020-H1' };
}
function bondCouponDates() {
  const bond = ASSETS.bond;
  const dates = [];
  for (let year = Number(bond.issueDate.slice(0, 4)); year <= Number(bond.maturityDate.slice(0, 4)); year += 1) {
    for (const suffix of ['06-30', '12-30']) {
      const date = `${year}-${suffix}`;
      if (date > bond.issueDate && date <= bond.maturityDate) dates.push(date);
    }
  }
  return dates;
}
function bondAccrualForDate(date) {
  const bond = ASSETS.bond;
  const schedule = bondCouponDates();
  const previousCouponDate = schedule.filter(couponDate => couponDate <= date).pop() || bond.issueDate;
  const nextCouponDate = schedule.find(couponDate => couponDate > date) || null;
  const couponPerUnit = bond.faceValue * bond.coupon / 2;
  const periodDays = nextCouponDate ? calendarDaysBetween(previousCouponDate, nextCouponDate) : 0;
  const elapsedDays = date > bond.issueDate && date < bond.maturityDate ? calendarDaysBetween(previousCouponDate, date) : 0;
  return { previousCouponDate, nextCouponDate, couponPerUnit, periodDays, elapsedDays, accruedPerUnit: periodDays > 0 ? couponPerUnit * elapsedDays / periodDays : 0 };
}
function bondTradeQuote(amount, cleanPrice, date = currentDate()) {
  const accrual = bondAccrualForDate(date);
  const dirtyPrice = cleanPrice + accrual.accruedPerUnit;
  const lotSize = ASSETS.bond.lotSize;
  const quantity = dirtyPrice > 0 ? Math.max(0, Math.floor(Number(amount) / dirtyPrice / lotSize + 1e-10) * lotSize) : 0;
  return { ...accrual, quantity, cleanPrice, dirtyPrice, cleanAmount: quantity * cleanPrice, accruedInterest: quantity * accrual.accruedPerUnit, grossAmount: quantity * dirtyPrice };
}
function fundTradeAvailability(side, date, requireExact = false) {
  const series = state.marketData?.fund;
  const imported = Boolean(series && Object.keys(series).length);
  if (!imported) return { allowed: true, imported: false, status: '演示开放' };
  const record = requireExact ? series[date] : importedRecordForDate('fund', date);
  if (!record) return { allowed: !requireExact, imported: true, reason: `估值日 ${date} 缺少历史净值，不能以前值确认成交` };
  const nav = typeof record === 'object' ? firstNumericValue(record.nav, record.close, record.value) : firstNumericValue(record);
  if (requireExact && !(nav > 0)) return { allowed: false, imported: true, reason: `估值日 ${date} 缺少有效历史净值，不能确认成交` };
  const status = String(typeof record === 'object' ? record[side === 'buy' ? 'subscription_status' : 'redemption_status'] || '' : '').trim();
  const unavailable = /暂停|停止|封闭|不开放|关闭|禁止|suspend|closed|not[ _-]?open|unavailable/i.test(status);
  const restricted = /限额|限制大额|限大额/.test(status);
  return { allowed: !unavailable && !restricted, imported: true, nav, status: status || '未提供申赎状态', reason: unavailable || restricted ? `${date} ${status}${restricted ? '，未提供可核验的额度规则' : ''}` : '' };
}
function rejectFundOrder(order, reason) {
  if (order.status !== '待确认' || order.redemptionConfirmed) return;
  const target = state.holdings[order.assetId];
  if (order.side === 'buy') {
    state.cash += Number(order.cashEffect || 0);
    state.cashflows.push({ date: currentDate(), type: '基金委托退回', assetId: order.assetId, amount: Number(order.cashEffect || 0), fee: 0 });
  } else if (target) {
    target.availableQuantity = Math.min(target.quantity - Number(target.pendingSellQuantity || 0), Number(target.availableQuantity || 0) + order.quantity);
    target.frozenQuantity = Math.max(0, Number(target.frozenQuantity || 0) - order.quantity);
  }
  if (order.feeRecorded !== false) recordPerformance('fees', -Number(order.fee || 0));
  order.feeRecorded = false;
  order.status = '已拒绝';
  order.rejectReason = reason;
  order.rejectedDate = currentDate();
  if (target && target.quantity <= 1e-8 && !state.orders.some(item => item !== order && item.assetId === order.assetId && item.side === 'buy' && item.status === '待确认')) delete state.holdings[order.assetId];
  addActivity('基金委托未成交', `${assetName(order.assetId)} · ${reason} · ${order.side === 'buy' ? '锁定资金和申购费已退回' : '冻结份额已恢复可用'}。`, 0);
}
function currentDate() { return tradingDates[state.day]; }
function valueOfHolding(id, holding) {
  const pendingSell = id === 'stock' || id === 'fund' ? Number(holding.pendingSellQuantity || 0) : 0;
  const quantity = Math.max(0, Number(holding.quantity || 0) - pendingSell);
  const marketValue = quantity * (id === 'bank' ? 1 : marketPrice(id, state.day));
  if (id === 'bond' || id === 'bank') return marketValue + Number(holding.accruedInterest || 0);
  return marketValue;
}
function pendingOrderValue() {
  return (state.orders || []).reduce((sum, order) => {
    if (order.status === '待确认' && order.settlementType === 'fund_buy') return sum + Number(order.amount || 0);
    if (order.status === '待结算' && order.settlementType === 'fund_sell' && order.redemptionConfirmed) return sum + Number(order.cashEffect || 0);
    return sum;
  }, 0);
}
function totalValue() { return state.cash + Object.entries(state.holdings).reduce((sum, [id, holding]) => sum + valueOfHolding(id, holding), 0) + pendingOrderValue(); }
function totalReturn() { return totalValue() / state.startCash - 1; }
function previousTotal() { return state.day === 0 ? state.startCash : state.snapshots.find(snapshot => snapshot.day === state.day - 1)?.total ?? state.startCash; }
function dailyReturn() { return totalValue() / previousTotal() - 1; }

function updateCurrentSnapshot() {
  const total = totalValue();
  const snapshot = state.snapshots.find(item => item.day === state.day);
  if (snapshot) { snapshot.total = total; snapshot.daily = total - previousTotal(); }
}

function render() {
  updateCurrentSnapshot();
  $('#currentDate').textContent = currentDate();
  const accountDate = $('#accountDate'); if (accountDate) accountDate.textContent = currentDate();
  $('#totalAsset').textContent = money(totalValue());
  $('#totalReturn').textContent = `${pct(totalReturn())} 累计收益`;
  $('#totalReturn').className = totalReturn() >= 0 ? 'up' : 'down';
  $('#dailyPnl').textContent = signedMoney(totalValue() - previousTotal());
  $('#dailyPnl').className = dailyReturn() >= 0 ? 'up' : 'down';
  $('#dailyPnlPct').textContent = `${pct(dailyReturn())} 较上一日`;
  $('#dailyPnlPct').className = dailyReturn() >= 0 ? 'up' : 'down';
  $('#cashBalance').textContent = money(state.cash);
  $('#dayCount').textContent = `第 ${state.day + 1} 天`;
  const dayHint = $('#dayCount')?.nextElementSibling; if (dayHint) dayHint.textContent = `共 ${tradingDates.length} 个交易日`;
  const pendingCount = (state.orders || []).filter(order => ['待确认', '待结算'].includes(order.status)).length;
  const pendingNode = $('#pendingOrderCount'); if (pendingNode) pendingNode.textContent = pendingCount;
  const rewind = $('#rewindBtn'); if (rewind) rewind.disabled = !state.history?.length;
  const advance = $('#advanceBtn'); if (advance) { advance.disabled = state.day >= tradingDates.length - 1; advance.innerHTML = advance.disabled ? '已到回放末日' : '进入下一个交易日 <span>→</span>'; }
  const homeStatus = $('#homeDataStatus'); if (homeStatus) homeStatus.textContent = dataStatusLabel();
  renderQuotes(); renderLesson(); renderAssets(); renderTrade(); renderPositions(); renderReview(); renderMine();
  saveState();
}

function renderQuotes() {
  const ids = ['stock', 'fund', 'bond'];
  $('#quoteStrip').innerHTML = ids.map(id => {
    const asset = displayAsset(id); const price = marketPrice(id, state.day); const previous = marketPrice(id, Math.max(0, state.day - 1)); const change = previous > 0 ? price / previous - 1 : 0;
    const provenance = quoteProvenance(id);
    return `<div class="quote-card"><span class="quote-name">${escapeHtml(asset.name)}</span><strong>${price.toFixed(id === 'fund' ? 4 : 2)}<small class="quote-unit">${asset.unit}</small></strong><small class="${change >= 0 ? 'up' : 'down'}">${pct(change)} 今日 · ${currentDate()}</small><small>${escapeHtml(provenance.label)} · ${provenance.date}</small></div>`;
  }).join('');
}

function renderLesson() {
  const lesson = lessons[state.lessonIndex % lessons.length];
  $('#lessonCard').innerHTML = `<div class="lesson-tag">市场信息 · ${lesson.tag}</div><h4>${lesson.title}</h4><p>${lesson.text}</p>`;
}

function assetRuleDetails(id) {
  if (id === 'bond') return `票面 ${money(ASSETS.bond.faceValue, 2)} · 票息 ${(ASSETS.bond.coupon * 100).toFixed(2)}% · ${ASSETS.bond.couponFrequency} · 到期 ${ASSETS.bond.maturityDate}`;
  if (id === 'fund') return quoteProvenance('fund').kind === 'imported' ? '公布净值已内扣管理与托管费用 · 申购0.15%/赎回0.50%为教学渠道假设' : `演示管理费 ${(ASSETS.fund.managementFeeAnnual * 100).toFixed(2)}%/年 · 托管费 ${(ASSETS.fund.custodyFeeAnnual * 100).toFixed(2)}%/年 · 净值内扣`;
  if (id === 'bank') return `${ASSETS.bank.rateType} · ${ASSETS.bank.interestMethod} · 挂牌生效日 ${escapeHtml(importedRecordForDate('bank', currentDate())?.rate_effective_from || quoteProvenance('bank').date)}`;
  return '';
}

function renderAssets() {
  const filter = state.filter;
  const list = Object.values(ASSETS).filter(asset => filter === 'all' || asset.type === filter).map(asset => displayAsset(asset.id));
  $('#assetList').innerHTML = list.map(asset => {
    const price = marketPrice(asset.id, state.day);
    const provenance = quoteProvenance(asset.id);
    const previous = marketPrice(asset.id, Math.max(0, state.day - 1)); const change = previous > 0 ? price / previous - 1 : 0;
    const unitPrice = asset.id === 'bank' ? '1.00' : price.toFixed(asset.id === 'fund' ? 3 : 2);
    return `<article class="asset-card"><div class="asset-top"><div class="asset-title"><div class="asset-icon">${asset.icon}</div><div><h4>${escapeHtml(asset.name)}</h4><p>${escapeHtml(asset.subtitle)}</p></div></div><div class="asset-price"><strong>${asset.id === 'bank' ? `${(annualRateForDate() * 100).toFixed(2)}%` : unitPrice}</strong><small class="${change >= 0 ? 'up' : 'down'}">${asset.id === 'bank' ? '年化基准' : pct(change)}</small><em class="asset-asof">${currentDate()} · ${escapeHtml(provenance.label)} · 数据日 ${provenance.date}</em></div></div><div class="asset-meta"><span class="meta-chip">${asset.risk}</span><span class="meta-chip">${asset.liquidity}</span><span class="meta-chip">${asset.rule}</span></div><p class="asset-description">${asset.description}${assetRuleDetails(asset.id) ? `<br /><span class="asset-detail">${assetRuleDetails(asset.id)}</span>` : ''}</p><button class="buy-button" data-buy="${asset.id}">${asset.id === 'bank' ? '存入 / 设置定投' : asset.type === '创业' ? '查看投资场景' : '模拟买入'}</button></article>`;
  }).join('');
}

function renderPriceChart(id) {
  if (!['stock', 'fund'].includes(id)) return '';
  const start = Math.max(0, state.day - 29);
  const points = [];
  for (let day = start; day <= state.day; day += 1) {
    const record = state.marketData?.[id]?.[tradingDates[day]];
    const close = marketPrice(id, day);
    points.push({ date: tradingDates[day], close, open: Number(record?.open ?? close), high: Number(record?.high ?? close), low: Number(record?.low ?? close) });
  }
  const max = Math.max(...points.map(point => point.high));
  const min = Math.min(...points.map(point => point.low));
  const spread = Math.max(max - min, max * 0.01);
  const y = value => 170 - ((value - min + spread * 0.1) / (spread * 1.2)) * 150;
  const step = 440 / Math.max(points.length, 1);
  const x = index => 8 + step * (index + 0.5);
  const grid = [min, (min + max) / 2, max].map(value => `<line x1="0" y1="${y(value)}" x2="450" y2="${y(value)}" stroke="#e5eaf1" stroke-dasharray="3 4"/><text x="456" y="${y(value) + 4}" fill="#65748a" font-size="11">${value.toFixed(id === 'fund' ? 4 : 2)}</text>`).join('');
  const series = id === 'stock'
    ? points.map((point, index) => {
      const color = point.close >= point.open ? '#d64550' : '#1b9a68';
      return `<line x1="${x(index)}" x2="${x(index)}" y1="${y(point.high)}" y2="${y(point.low)}" stroke="${color}"/><rect x="${x(index) - Math.min(9, step * 0.32)}" y="${Math.min(y(point.open), y(point.close))}" width="${Math.min(18, step * 0.64)}" height="${Math.max(1, Math.abs(y(point.close) - y(point.open)))}" fill="${color}"/>`;
    }).join('')
    : `<polyline points="${points.map((point, index) => `${x(index)},${y(point.close)}`).join(' ')}" fill="none" stroke="#1d6be3" stroke-width="2.5"/><circle cx="${x(points.length - 1)}" cy="${y(points.at(-1).close)}" r="3" fill="#1d6be3"/>`;
  const current = points.at(-1);
  const provenance = quoteProvenance(id);
  let source = provenance.source;
  try { if (/^https?:\/\//.test(source)) source = new URL(source).hostname; } catch { /* Show malformed source as plain text. */ }
  const details = id === 'stock' ? [['今开', current.open], ['最高', current.high], ['最低', current.low], ['收盘', current.close]] : [['单位净值', current.close], ['净值日期', current.date]];
  return `<section class="market-chart"><div class="market-chart-heading"><strong>${id === 'stock' ? '日 K · 不复权' : '单位净值走势'}</strong><span>近 ${points.length} 个交易日</span></div><svg viewBox="0 0 515 192" role="img" aria-label="${id === 'stock' ? '股票日K线' : '基金历史净值'}，截至${currentDate()}">${grid}${series}</svg><div class="chart-labels"><span>${points[0].date}</span><span>${current.date}</span></div><div class="quote-details">${details.map(([name, value]) => `<div><span>${name}</span><strong>${typeof value === 'number' ? value.toFixed(id === 'fund' ? 4 : 2) : value}</strong></div>`).join('')}</div><p class="quote-source">${escapeHtml(provenance.label)} · 数据日 ${provenance.date} · ${escapeHtml(source)}</p></section>`;
}

function renderTrade() {
  const tradeIds = ['stock', 'fund', 'bond', 'bank', 'shop', 'startup'];
  if (!state.selectedAsset || !ASSETS[state.selectedAsset]) state.selectedAsset = 'stock';
  const selected = displayAsset(state.selectedAsset);
  $('#tradeSelector').innerHTML = tradeIds.map(id => `<button class="${id === state.selectedAsset ? 'active' : ''}" data-trade-asset="${id}">${ASSETS[id].type} · ${escapeHtml(displayAsset(id).name)}</button>`).join('');
  const price = marketPrice(selected.id, state.day);
  const holding = state.holdings[selected.id];
  const heldText = holding ? `持有 ${Math.max(0, holding.quantity - Number(holding.pendingSellQuantity || 0)).toFixed(selected.id === 'fund' ? 2 : 0)} · 市值 ${money(valueOfHolding(selected.id, holding))}` : '当前无持仓';
  const venture = selected.id === 'shop' ? state.ventures.shop : selected.id === 'startup' ? state.ventures.startup : null;
  const instrumentSummary = selected.id === 'bond' ? `<div class="venture-summary"><strong>国债条款</strong><span>面值 ${money(selected.faceValue, 2)}</span><span>票息 ${(selected.coupon * 100).toFixed(2)}%</span><span>${selected.couponFrequency}</span><span>发行 ${selected.issueDate}</span><span>到期 ${selected.maturityDate}</span><span>下一付息日 ${bondAccrualForDate(currentDate()).nextCouponDate || '已到期'}</span></div>` : selected.id === 'bank' ? `<div class="venture-summary"><strong>存款条款</strong><span>${selected.rateType}</span><span>${selected.interestMethod}</span><span>${selected.withdrawal}</span><span>挂牌生效日 ${escapeHtml(importedRecordForDate('bank', currentDate())?.rate_effective_from || quoteProvenance('bank').date)}</span></div>` : '';
  const ventureAction = selected.id === 'shop' && venture?.opened && !venture.closed ? `<button class="secondary-button venture-action" data-close-shop="${selected.id}">${state.day >= 100 ? '完成关店结算' : '关店结算（第 101 天开放）'}</button>` : '';
  const ventureSummary = selected.id === 'shop' ? `<div class="venture-summary"><strong>经营状态</strong><span>${venture.opened ? (venture.closed ? '已关店' : '营业中') : '尚未开店'}</span><span>累计营收 ${money(venture.cumulativeRevenue)}</span><span>累计成本 ${money(venture.cumulativeCost)}</span></div>` : selected.id === 'startup' ? `<div class="venture-summary"><strong>融资阶段</strong><span>${venture.round}</span><span>里程碑：${venture.milestone}</span><span>公司现金 ${money(venture.companyCash)}</span><span>月烧钱 ${money(venture.monthlyBurn)}</span><span>累计烧钱 ${money(venture.cumulativeBurn)}</span><span>现金跑道 ${venture.runwayMonths.toFixed(1)} 个月</span><span>累计融资 ${money(venture.financingRaised)}</span><span>股权稀释 ${(venture.dilution * 100).toFixed(1)}%</span><span>${venture.failed ? '项目已失败' : venture.exited ? `已退出 ${venture.exitDate}` : '退出条件：达到退出窗口'}</span></div>` : '';
  $('#orderTicket').innerHTML = `<div class="order-ticket-header"><div><h4>${escapeHtml(selected.name)}</h4><p>${escapeHtml(selected.subtitle)} · ${heldText}</p></div><div class="order-ticket-price"><strong>${selected.id === 'bank' ? `${(annualRateForDate() * 100).toFixed(2)}%` : money(price, selected.id === 'fund' ? 3 : 2)}</strong><small>${selected.id === 'bank' ? '活期年利率' : currentDate()}</small></div></div><div class="ticket-rule"><span>${selected.rule}</span><span>${selected.risk}</span><span>${selected.liquidity}</span></div>${renderPriceChart(selected.id)}${instrumentSummary}${ventureSummary}<p class="muted">${selected.description}</p>${ventureAction}<button class="buy-button" data-open-order="${selected.id}">打开交易委托</button>`;
  const orders = (state.orders || []).slice(-8).reverse();
  $('#orderList').innerHTML = orders.length ? orders.map(order => `<div class="activity-row"><span class="activity-dot"></span><div class="activity-content"><h4>${order.side === 'buy' ? '买入' : '卖出'} ${escapeHtml(assetName(order.assetId))} <span class="order-status ${order.status === '已结算' ? 'done' : ['待确认', '待结算'].includes(order.status) ? 'pending' : ''}">${order.status}</span></h4><p>${money(order.amount)} · ${order.quantity ? `${order.quantity.toFixed(order.assetId === 'fund' ? 2 : 0)} 单位` : '份额待净值确认'} · 费用 ${money(order.fee, 2)}${order.status === '待确认' || order.status === '待结算' ? ` · ${order.settlementDate || order.confirmDate} 可处理` : ''}</p></div><div class="activity-actions"><time>${order.submittedDate}</time>${order.status === '待确认' && ['fund_buy', 'fund_sell'].includes(order.settlementType) ? `<button class="cancel-order" data-cancel-order="${order.id}">撤单</button>` : ''}</div></div>`).join('') : `<div class="empty-state">暂无订单。打开一个资产的交易委托开始模拟。</div>`;
}

function renderMine() {
  const meta = $('#accountMeta');
  if (meta) meta.textContent = `当前日期 ${currentDate()} · ${state.orders.length} 笔订单 · ${state.cashflows.length} 笔资金流水`;
  const initialCapital = $('#initialCapitalInput');
  for (const [selector, value] of [['#commissionRateInput', Number(state.stockCommission?.rate ?? 0.0003) * 10000], ['#commissionMinInput', Number(state.stockCommission?.minimum ?? 5)]]) {
    const field = $(selector); if (field && document.activeElement !== field) field.value = String(Number(value.toFixed(4)));
  }
  if (initialCapital && document.activeElement !== initialCapital) initialCapital.value = String(state.startCash);
  const snapshot = $('#dataSnapshotValue');
  if (snapshot) snapshot.textContent = `${state.dataSnapshotId} · ${dataStatusLabel()}${state.dataMeta?.acceptedCount ? ` · ${state.dataMeta.acceptedCount} 条` : ''}`;
  const dataNotice = $('.data-notice span:last-child');
  if (dataNotice) dataNotice.textContent = dataNoticeText();
  const quality = $('#dataQualitySummary');
  if (quality) {
    const importMeta = state.dataMeta || {};
    const warnings = Array.isArray(importMeta.warnings) ? importMeta.warnings : [];
    const metadataQuality = importMeta.quality || {};
    const sourceText = importMeta.source || '未填写';
    const licenseText = licenseStatusLabel(importMeta.licenseStatus);
    const retrievedText = importMeta.retrievedAt || '未填写';
    const metadataLine = `来源：${escapeHtml(sourceText)} · 许可：${escapeHtml(licenseText)} · 获取：${escapeHtml(retrievedText)}`;
    const qualityHint = metadataQuality.retrievedAtValid === false && metadataQuality.retrievedAtPresent === false
      ? '获取时间缺失，无法确认数据新鲜度。'
      : warnings.length ? `${escapeHtml(warnings.slice(0, 3).join('；'))}${warnings.length > 3 ? '；…' : ''}` : '当前快照没有记录额外校验提示。';
    quality.innerHTML = `<strong>导入质量</strong><span>接受 ${Number(importMeta.acceptedCount || 0)} 条 · 拒绝 ${Number(importMeta.rejectedCount || 0)} 条${warnings.length ? ` · ${warnings.length} 条提示` : ''}</span><small>${metadataLine}</small><small>${qualityHint}</small>`;
  }
}

function renderPositions() {
  const entries = Object.entries(state.holdings).filter(([, holding]) => holding.quantity > 0.000001);
  if (!entries.length) $('#positionList').innerHTML = `<div class="empty-state">还没有持仓。去市场做出第一笔选择吧。</div>`;
  else $('#positionList').innerHTML = entries.map(([id, holding]) => {
    const asset = displayAsset(id); const value = valueOfHolding(id, holding); const ret = holding.cost > 0 ? value / holding.cost - 1 : 0;
    const available = Number(holding.availableQuantity ?? holding.quantity);
    const detail = id === 'bond' ? `应计利息 ${money(holding.accruedInterest, 2)} · 下一付息日 ${bondAccrualForDate(currentDate()).nextCouponDate || '已到期'}` : '';
    return `<div class="position-row"><div><h4>${escapeHtml(asset.name)}</h4><p>${id === 'bank' ? `余额 ${money(holding.quantity, 2)} · 未结利息 ${money(holding.accruedInterest, 2)}` : `数量 ${Math.max(0, holding.quantity - Number(holding.pendingSellQuantity || 0)).toFixed(id === 'fund' ? 2 : 0)} · 可卖 ${available.toFixed(id === 'fund' ? 2 : 0)} · 成本 ${money(holding.cost)}${detail ? ` · ${detail}` : ''}`}</p></div><div class="position-value"><strong>${money(value)}</strong><small class="${ret >= 0 ? 'up' : 'down'}">${pct(ret)}</small></div></div>`;
  }).join('');
  const total = totalValue();
  const categories = [['现金', state.cash], ['股票/基金', ['stock', 'fund'].reduce((s, id) => s + valueOfHolding(id, state.holdings[id] || {}), 0)], ['固收', valueOfHolding('bank', state.holdings.bank || {}) + valueOfHolding('bond', state.holdings.bond || {})], ['创业', ['shop', 'startup'].reduce((s, id) => s + valueOfHolding(id, state.holdings[id] || {}), 0)], ['待确认/到账', pendingOrderValue()]];
  let running = 0; const colors = ['#1b9a68', '#1d6be3', '#a56b00', '#d64550', '#8a6ac8'];
  const parts = categories.map(([, v], index) => { const start = running; running += (v / Math.max(total, 1)) * 100; return `${colors[index]} ${start}% ${running}%`; });
  $('#allocationRing').style.background = `conic-gradient(${parts.join(', ')})`;
  $('#allocationCenter').textContent = `${Math.round((total - state.cash) / Math.max(total, 1) * 100)}%`;
  $('#allocationLegend').innerHTML = categories.map(([name, value]) => `<div class="legend-row"><span>${name}</span><strong>${Math.round(value / Math.max(total, 1) * 100)}%</strong></div>`).join('');
  $('#activityList').innerHTML = state.activities.slice(-5).reverse().map(item => `<div class="activity-row"><span class="activity-dot"></span><div class="activity-content"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.detail)}</p></div><time>${item.date.slice(5)}</time></div>`).join('');
  $('#cashflowList').innerHTML = (state.cashflows || []).slice(-6).reverse().map(item => `<div class="activity-row"><span class="activity-dot"></span><div class="activity-content"><h4>${item.type} · ${escapeHtml(assetName(item.assetId) || '现金')}</h4><p class="${item.amount >= 0 ? 'up' : 'down'}">${signedMoney(item.amount)}${item.fee ? ` · 费用 ${money(item.fee, 2)}` : ''}</p></div><time>${item.date.slice(5)}</time></div>`).join('') || `<div class="empty-state">暂无资金流水。</div>`;
}

function renderEquityChart() {
  const chart = $('#equityChart'); if (!chart) return;
  const samples = (state.snapshots || []).filter(snapshot => Number.isFinite(Number(snapshot.total)));
  if (!samples.length) { chart.innerHTML = ''; return; }
  const width = 640; const height = 160; const padX = 8; const padY = 12;
  const values = samples.map(snapshot => Number(snapshot.total));
  const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(max - min, 1);
  const points = values.map((value, index) => `${padX + (index / Math.max(values.length - 1, 1)) * (width - padX * 2)},${height - padY - ((value - min) / span) * (height - padY * 2)}`);
  const first = points[0].split(','); const last = points[points.length - 1].split(',');
  const area = `${first[0]},${height - padY} ${points.join(' ')} ${last[0]},${height - padY}`;
  const grid = [0, .5, 1].map(ratio => `<line class="chart-grid" x1="${padX}" y1="${height - padY - ratio * (height - padY * 2)}" x2="${width - padX}" y2="${height - padY - ratio * (height - padY * 2)}" />`).join('');
  chart.innerHTML = `${grid}<polygon class="chart-area" points="${area}" /><polyline class="chart-line" points="${points.join(' ')}" /><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#1d6be3" />`;
  const labels = $('#equityChartLabels');
  if (labels) { const firstDay = samples[0].day ?? 0; const midDay = samples[Math.floor((samples.length - 1) / 2)]?.day ?? firstDay; const lastDay = samples[samples.length - 1].day ?? firstDay; labels.innerHTML = `<span>${currentDateForDay(firstDay)}</span><span>${currentDateForDay(midDay)}</span><span>${currentDateForDay(lastDay)}</span>`; }
}

function unrealizedPnl() {
  return Object.entries(state.holdings || {}).reduce((sum, [id, holding]) => {
    const value = valueOfHolding(id, holding); const cost = Number(holding.cost || 0);
    return sum + (value - cost);
  }, 0);
}

function renderAttribution() {
  const target = $('#attributionGrid'); if (!target) return;
  const performance = state.performance || {};
  const realized = Number(performance.realizedPnl || 0);
  const unrealized = unrealizedPnl();
  const fees = -Math.abs(Number(performance.fees || 0));
  const income = Number(performance.interestIncome || 0) + Number(performance.operatingIncome || 0) + Number(performance.dividends || 0);
  const items = [['已实现收益', realized, '已完成卖出或清算后的净收益'], ['未实现收益', unrealized, '持仓估值减成本，成本已含买入费'], ['利息/经营收入', income, '收入明细，部分已包含在持仓收益中'], ['累计费用与税费', fees, '已计入账户损益的费用明细，不再重复相加']];
  target.innerHTML = items.map(([name, value, detail]) => `<div class="attribution-tile"><span>${name}</span><strong class="${value >= 0 ? 'up' : 'down'}">${signedMoney(value)}</strong><small class="muted">${detail}</small></div>`).join('');
}

function renderReview() {
  let peak = 0; let maxDrawdown = 0;
  state.snapshots.forEach(snapshot => { peak = Math.max(peak, snapshot.total); if (peak > 0) maxDrawdown = Math.min(maxDrawdown, snapshot.total / peak - 1); });
  const drawdown = maxDrawdown;
  $('#reviewSummary').innerHTML = `<div class="review-tile"><span>累计收益</span><strong class="${totalReturn() >= 0 ? 'up' : 'down'}">${pct(totalReturn())}</strong></div><div class="review-tile"><span>最大回撤</span><strong class="down">${pct(drawdown)}</strong></div><div class="review-tile"><span>交易次数</span><strong>${state.activities.filter(a => a.amount).length}</strong></div>`;
  renderEquityChart();
  renderAttribution();
  const today = currentDate();
  const reachedEvents = events.filter(([date]) => date <= today);
  const timelineEvents = reachedEvents.map(event => ({ event, status: '已到达' }));
  $('#timelineList').innerHTML = timelineEvents.length
    ? timelineEvents.map(({ event: [date, title, detail], status, upcoming }) => `<div class="timeline-item${upcoming ? ' upcoming' : ''}"><div class="timeline-rail"></div><div class="timeline-content"><time>${date} · ${status}</time><h4>${title}</h4><p>${detail}</p></div></div>`).join('')
    : `<div class="empty-state">回放尚未产生市场事件。</div>`;
  const courses = [
    ['收益与风险', '累计收益衡量起点到今天的变化；最大回撤衡量期间从高点到低点的最大跌幅。收益相同的组合，承担的波动可能不同。'],
    ['复利与期限', '复利需要将收益继续投入。活期、定期存款与基金定投是不同工具，年化利率不代表每天固定收益。'],
    ['基金净值', '公布的基金单位净值通常已经扣除管理费、托管费。申购与赎回费另计；提交订单时，下一估值日的净值尚未确定。'],
    ['债券与利率', '固定票息按面值计算，二级市场净价随利率变化；全价还包含应计利息。储蓄国债不能当作随时交易的股票。'],
    ['创业现金流', '估值不是可用现金。租金、人工和进货消耗现金，融资可能稀释股权，退出还受时间与买家限制。']
  ];
  $('#courseGrid').innerHTML = courses.map(([name, text]) => `<article class="course-card"><h4>${name}</h4><p class="muted">${text}</p></article>`).join('');
}

function showView(view) {
  $$('.view').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.go === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openTrade(id, side = 'buy') {
  state.selectedAsset = id; state.selectedSide = side; const asset = displayAsset(id); const price = marketPrice(id, state.day);
  $('#tradeTitle').textContent = `${asset.id === 'bank' ? side === 'buy' ? '存入' : '支取' : side === 'buy' ? '买入' : '卖出'} ${asset.name}`;
  $('#tradeDescription').textContent = asset.description;
  $('#tradeAmount').previousElementSibling.textContent = side === 'buy' ? '委托金额（元）' : '卖出金额（元）';
  const smallRedemption = asset.id === 'bank' || (asset.id === 'fund' && side === 'sell');
  $('#tradeAmount').min = smallRedemption ? '0.01' : '100';
  $('#tradeAmount').step = smallRedemption ? '0.01' : '100';
  $('#tradePriceLabel').textContent = asset.id === 'bank' ? '当前年化基准' : `当前${asset.unit}`;
  $('#tradePrice').textContent = asset.id === 'bank' ? `${(annualRateForDate() * 100).toFixed(2)}%` : money(price, asset.id === 'fund' ? 3 : 2);
  $('#tradeRule').textContent = asset.rule;
  const nextDate = tradingDates[state.day + 1];
  const settlementDate = tradingDates[state.day + (asset.id === 'fund' && side === 'sell' ? 2 : 1)];
  const needsFutureDay = asset.id === 'stock' || asset.id === 'fund';
  const canSettle = !needsFutureDay || Boolean(settlementDate);
  let settlementHint = asset.id === 'fund'
    ? canSettle ? `收盘后委托 · 下一估值日 ${nextDate} 按公布净值确认${side === 'sell' ? ` · T+2到账 ${settlementDate}` : '（T+1）'}` : '回放剩余交易日不足，无法完成基金确认或到账'
    : asset.id === 'stock'
      ? canSettle ? `${side === 'buy' ? 'T+1可卖' : 'T+1结算'} ${nextDate} · 已成交委托不可撤销` : '回放剩余交易日不足，无法完成股票结算'
      : asset.id === 'bank' ? '当日转入/支取 · 实际天数/360单利积数 · 季末月21日入账；全额支取结清未结利息'
        : asset.id === 'bond' ? '当日成交 · 按票息计提'
          : asset.id === 'shop' ? '按月经营结算'
            : state.ventures.startup.exited ? '退出窗口已开放' : '达到退出窗口后处理';
  const fundAvailability = asset.id === 'fund' ? fundTradeAvailability(side, currentDate()) : null;
  if (asset.id === 'bond') { const accrual = bondAccrualForDate(currentDate()); settlementHint = `教学示例 · 净价${money(price, 4)} + 每张应计${money(accrual.accruedPerUnit, 6)} = 全价${money(price + accrual.accruedPerUnit, 6)} · 半年每张付息${money(accrual.couponPerUnit, 3)}`; }
  if (fundAvailability) settlementHint += ` · 当前已知状态：${fundAvailability.status || fundAvailability.reason}`;
  if (asset.id === 'stock') { const detail = tradeFeeDetails(id, side, 0); settlementHint += ` · 佣金假设（可配置）：万${(detail.commissionRate * 10000).toFixed(2)}，最低${money(detail.minimumCommission, 2)}`; }
  const hint = $('#tradeSettlementHint'); if (hint) hint.textContent = settlementHint;
  const recurringRow = $('#bankRecurringRow'); if (recurringRow) { const showRecurring = asset.id === 'bank' && side === 'buy'; recurringRow.hidden = !showRecurring; recurringRow.style.display = showRecurring ? 'flex' : 'none'; if (!showRecurring) $('#bankRecurring').checked = false; }
  const maximumButton = $('[data-amount="max"]'); if (maximumButton) maximumButton.textContent = side === 'sell' ? '全部可卖' : '全部可用';
  const availableQuantity = state.holdings[id] ? Number(state.holdings[id].availableQuantity ?? state.holdings[id].quantity) : 0;
  const lotSize = id === 'stock' ? 100 : id === 'bond' ? 1 : null;
  const maxSell = availableQuantity ? lotSize ? Math.floor(availableQuantity / lotSize) * lotSize : Math.floor(availableQuantity * 100) / 100 : 0;
  $('#tradeAmount').value = side === 'sell' && maxSell ? Math.max(100, Math.floor(maxSell * price / 100) * 100) : Math.min(10000, Math.max(100, Math.floor(state.cash / 100) * 100));
  if (smallRedemption && side === 'sell' && availableQuantity) $('#tradeAmount').value = availableQuantity * price;
  if (asset.id === 'bond' && side === 'sell' && maxSell) $('#tradeAmount').value = maxSell * (price + bondAccrualForDate(currentDate()).accruedPerUnit);
  $('#buySideBtn').classList.toggle('active', side === 'buy'); $('#sellSideBtn').classList.toggle('active', side === 'sell');
  $('#confirmTrade').innerHTML = `${side === 'buy' ? '提交买入委托' : '提交卖出委托'} <span>→</span>`;
  $('#confirmTrade').disabled = !canSettle || Boolean(fundAvailability && !fundAvailability.allowed) || Boolean(asset.id === 'bond' && currentDate() >= ASSETS.bond.maturityDate);
  updateEstimate();
  $('#tradeModal').classList.add('open'); $('#tradeModal').setAttribute('aria-hidden', 'false');
}

function updateEstimate() {
  const id = state.selectedAsset; if (!id) return; const asset = ASSETS[id]; const amount = Number($('#tradeAmount').value || 0); const price = marketPrice(id, state.day); const side = state.selectedSide || 'buy';
  if (id !== 'bank' && !(price > 0)) {
    $('#tradeEstimate').textContent = id === 'startup' && state.ventures.startup.failed ? '项目已失败，当前估值为 ¥0' : '当前没有可用估值';
    $('#tradeFee').textContent = money(0, 2);
    return;
  }
  const lotSize = id === 'stock' ? 100 : id === 'bond' ? 1 : null;
  let estimate = id === 'bank' ? `${money(amount)} 存款余额` : lotSize ? `${Math.floor(amount / price / lotSize) * lotSize} ${asset.unit.split('/')[1] || '单位'}` : `${(amount / price).toFixed(2)} 份额`;
  if (id === 'shop') estimate = `${money(amount)} 开店投入`;
  if (id === 'startup') estimate = `${(amount / price).toFixed(0)} 份股权`;
  if (side === 'sell' && id !== 'bank' && state.holdings[id]) { const available = Number(state.holdings[id].availableQuantity ?? state.holdings[id].quantity); const sellQuantity = Math.min(available, lotSize ? Math.floor(amount / price / lotSize) * lotSize : amount / price); estimate = `${sellQuantity.toFixed(id === 'fund' ? 2 : 0)} 份额`; }
  if (id === 'fund') estimate = side === 'buy' ? `${(fundSubscriptionQuote(amount).netAmount / price).toFixed(2)} 份额（申购金额含费用，以下一估值日净值确认）` : `${estimate}（赎回金额以下一估值日净值确认）`;
  const bondQuote = id === 'bond' ? bondTradeQuote(amount, price) : null;
  if (bondQuote) estimate = `${bondQuote.quantity} 张 · 净价金额${money(bondQuote.cleanAmount, 2)} + 应计利息${money(bondQuote.accruedInterest, 4)} = 全价${money(bondQuote.grossAmount, 4)}`;
  const estimatedGross = bondQuote ? bondQuote.grossAmount : id === 'stock' ? Math.floor(amount / price / 100) * 100 * price : amount;
  const feeDetails = tradeFeeDetails(id, side, estimatedGross);
  $('#tradeEstimate').textContent = estimate;
  $('#tradeFee').textContent = id === 'stock' ? `${money(feeDetails.total, 2)}（佣金${money(feeDetails.commission, 2)} / 过户${money(feeDetails.transfer, 2)} / 印花${money(feeDetails.stamp, 2)}）` : money(feeDetails.total, 2);
}

function closeTrade() { $('#tradeModal').classList.remove('open'); $('#tradeModal').setAttribute('aria-hidden', 'true'); state.selectedAsset = null; state.selectedSide = 'buy'; }

function addActivity(title, detail, amount = 0) { state.activities.push({ date: currentDate(), title, detail, amount }); }

function closeShop() {
  if (state.day < 100) return toast('经营项目至少运行到第 101 个交易日后才可关店结算');
  const venture = state.ventures.shop;
  if (!venture.opened || venture.closed) return;
  venture.closed = true;
  const settlement = Math.max(0, (state.holdings.shop?.quantity || 0) * marketPrice('shop', state.day) * 0.85);
  const shopCostBasis = Number(state.holdings.shop?.cost || 0);
  delete state.holdings.shop;
  if (settlement > 0) {
    state.cash += settlement;
    state.cashflows.push({ date: currentDate(), type: '关店清算', assetId: 'shop', amount: settlement, fee: 0 });
    recordPerformance('realizedPnl', settlement - shopCostBasis);
    addActivity('社区咖啡店关店结算', `设备和库存清算回款 ${money(settlement)}，项目已关闭。`, settlement);
  } else addActivity('社区咖啡店关店结算', '项目已关闭，未形成可回收清算价值。', 0);
  render(); toast('已完成关店结算，清算回款已入账');
}

function resetReplay(initialCash = state.startCash) {
  const importedData = {
    marketData: state.marketData,
    instrumentMeta: state.instrumentMeta,
    dataSnapshotId: state.dataSnapshotId,
    dataStatus: state.dataStatus,
    dataMeta: state.dataMeta
  };
  state = defaultState(initialCash);
  state.marketData = importedData.marketData || {};
  state.instrumentMeta = importedData.instrumentMeta || {};
  state.dataSnapshotId = importedData.dataSnapshotId || state.dataSnapshotId;
  state.dataStatus = importedData.dataStatus || state.dataStatus;
  state.dataMeta = importedData.dataMeta || state.dataMeta;
}

async function confirmAccountChange(message) {
  const dialog = $('#accountConfirmDialog');
  if (!dialog || dialog.open) return false;
  $('#accountConfirmMessage').textContent = message;
  return new Promise(resolve => {
    const finish = () => { dialog.removeEventListener('close', finish); resolve(dialog.returnValue === 'confirm'); };
    dialog.addEventListener('close', finish);
    dialog.showModal();
  });
}

async function applyAccountConfig() {
  const amount = Number($('#initialCapitalInput')?.value || 0);
  if (!Number.isFinite(amount) || amount < 1000) return toast('初始模拟资金至少为 ¥1,000');
  if (!await confirmAccountChange(`使用初始资金 ${money(amount)} 重新开始？当前持仓、订单和回放进度会清空，数据快照保留。`)) return;
  resetReplay(Math.round(amount * 100) / 100);
  render();
  showView('home');
  toast(`已使用初始资金 ${money(state.startCash)} 重置账户`);
}

async function confirmReplayReset() {
  if (!await confirmAccountChange('重置回放后，当前持仓、订单和回放进度会清空，已导入的数据快照会保留。')) return;
  resetReplay();
  render();
  showView('home');
  toast('回放已重置，数据快照仍然保留');
}

function confirmTrade() {
  const id = state.selectedAsset; if (!id) return;
  const side = state.selectedSide || 'buy'; const amount = Number($('#tradeAmount').value || 0); const asset = displayAsset(id);
  const minimumAmount = id === 'bank' || (id === 'fund' && side === 'sell') ? 0.01 : 100;
  if (!Number.isFinite(amount) || amount < minimumAmount) return toast(`金额至少为 ${money(minimumAmount)}`);
  if (id === 'shop' && side === 'buy' && state.ventures.shop.closed) return toast('该经营项目已经关店，不能再次追加投资；请重置回放后重新开始');
  if (id === 'startup' && side === 'buy' && (state.ventures.startup.failed || state.ventures.startup.exited)) return toast('该创业项目已结束，不能继续追加投资');
  if (id === 'startup' && side === 'sell' && state.ventures.startup.failed) return toast('项目已失败，股权按零估值处理');
  if (side === 'sell' && id === 'startup' && !state.ventures.startup.exited) return toast('当前融资轮次尚未开放退出');
  if (side === 'sell' && id === 'shop' && !state.ventures.shop.closed) return toast('经营项目需先完成关店结算');
  if (id === 'bond' && (currentDate() < ASSETS.bond.issueDate || currentDate() >= ASSETS.bond.maturityDate)) return toast('该教学国债尚未发行或已经到期，不能再提交买卖');
  const price = marketPrice(id, state.day); let quantity = amount;
  if (id !== 'bank' && !(price > 0)) return toast('当前资产没有可用估值，暂不能提交委托');
  if (id === 'bank') settleBankInterest();
  if (id === 'bond') settleBondCashflows();
  const bondQuote = id === 'bond' ? bondTradeQuote(amount, price) : null;
  const nextDate = tradingDates[state.day + 1];
  const delayedBuy = side === 'buy' && id === 'fund';
  const delayedSell = side === 'sell' && id === 'fund';
  const t1Buy = side === 'buy' && id === 'stock';
  const t1Sell = side === 'sell' && id === 'stock';
  const settlementDate = tradingDates[state.day + (delayedSell ? 2 : 1)];
  if ((delayedBuy || delayedSell || t1Buy || t1Sell) && !settlementDate) return toast('回放剩余交易日不足，无法完成该笔委托的确认或结算');
  if (id === 'fund') { const availability = fundTradeAvailability(side, currentDate()); if (!availability.allowed) return toast(`当前不能提交基金委托：${availability.reason}`); }
  const holding = state.holdings[id];
  const available = holding ? Number(holding.availableQuantity ?? holding.quantity) : 0;
  if (side === 'buy') {
    if (id === 'stock' || id === 'bond') { const lotSize = id === 'stock' ? 100 : ASSETS.bond.lotSize; quantity = bondQuote ? bondQuote.quantity : Math.floor(amount / price / lotSize) * lotSize; if (quantity < lotSize) return toast(id === 'stock' ? '该资产按 100 股起购' : '国债按 1 张起购'); }
    else if (id === 'fund' || id === 'startup') quantity = amount / price;
  } else {
    if (!holding || available <= 0) return toast('当前没有可卖持仓（股票买入后下一个交易日可卖）');
    quantity = bondQuote ? bondQuote.quantity : id === 'stock' ? Math.floor(amount / price / 100) * 100 : amount / price;
    if (quantity <= 0 || quantity > available + 1e-8) return toast('卖出数量超过可用持仓');
  }
  const bondAccruedSale = side === 'sell' && id === 'bond' && holding ? Number(holding.accruedInterest || 0) * (quantity / Math.max(holding.quantity, 1e-8)) : 0;
  const subscriptionQuote = delayedBuy ? fundSubscriptionQuote(amount) : null;
  const fullBankWithdrawal = side === 'sell' && id === 'bank' && holding && quantity >= holding.quantity - 1e-8;
  const bankAccruedSale = fullBankWithdrawal ? Math.round(Number(holding.accruedInterest || 0) * 100) / 100 : 0;
  const estimatedAmount = (subscriptionQuote ? subscriptionQuote.netAmount : bondQuote ? side === 'buy' ? bondQuote.grossAmount : bondQuote.cleanAmount + bondAccruedSale : (id === 'stock' || id === 'fund' || id === 'startup') ? quantity * price : amount) + bankAccruedSale;
  const feeBreakdown = tradeFeeDetails(id, side, subscriptionQuote ? subscriptionQuote.grossAmount : estimatedAmount);
  const fee = feeBreakdown.total;
  const totalCashEffect = subscriptionQuote ? subscriptionQuote.grossAmount : side === 'buy' ? estimatedAmount + fee : estimatedAmount - fee;
  if (side === 'buy' && totalCashEffect > state.cash) return toast('现金不足，请降低委托金额');
  if (side === 'buy' && !holding) state.holdings[id] = { quantity: 0, availableQuantity: 0, frozenQuantity: 0, pendingSellQuantity: 0, cost: 0, accruedInterest: 0, faceValue: 0 };
  const target = state.holdings[id];
  let costBasis = 0;
  let status = '已成交'; let settlementType = 'immediate';
  if (side === 'buy') {
    state.cash -= totalCashEffect;
    state.cashflows.push({ date: currentDate(), type: '买入扣款', assetId: id, amount: -totalCashEffect, fee });
    if (delayedBuy) { status = '待确认'; settlementType = 'fund_buy'; }
    else {
      target.quantity += quantity; target.cost += totalCashEffect;
      if (id === 'bond') { target.faceValue = (target.faceValue || 0) + quantity * ASSETS.bond.faceValue; target.accruedInterest = Number(target.accruedInterest || 0) + bondQuote.accruedInterest; target.lastAccrualDate = currentDate(); }
      if (!t1Buy) target.availableQuantity += quantity;
      else { status = '待结算'; settlementType = 'stock_buy'; }
    }
    if (id === 'shop') { state.ventures.shop.opened = true; state.ventures.shop.invested += amount; }
    if (id === 'startup') { const startup = state.ventures.startup; startup.invested += amount; startup.financingRaised += amount; if (!startup.companyCash) startup.companyCash = startup.founderCapital + amount; else startup.companyCash += amount; startup.runwayMonths = startup.companyCash / Math.max(startup.monthlyBurn, 1); }
    if (id === 'bank') target.lastInterestDate = target.lastInterestDate || currentDate();
    if (id === 'bank' && side === 'buy' && $('#bankRecurring')?.checked) {
      state.bankPlan = { amount, interval: 'monthly', nextDay: state.day + 1, createdDate: currentDate(), lastDebit: currentDate() };
      addActivity('设置银行定投', `每月投入 ${money(amount)}，从下一个可用交易日开始检查余额。`, 0);
    }
  } else if (delayedSell || t1Sell) {
    target.availableQuantity = Math.max(0, available - quantity); target.frozenQuantity = (target.frozenQuantity || 0) + quantity;
    status = delayedSell ? '待确认' : '待结算'; settlementType = delayedSell ? 'fund_sell' : 'stock_sell';
    const oldQuantity = target.quantity - (delayedSell ? Number(target.pendingSellQuantity || 0) : 0);
    costBasis = target.cost * quantity / Math.max(oldQuantity, 1e-8);
    if (t1Sell) { target.pendingSellQuantity = (target.pendingSellQuantity || 0) + quantity; state.cash += totalCashEffect; state.cashflows.push({ date: currentDate(), type: '卖出回款', assetId: id, amount: totalCashEffect, fee }); }
  } else {
    const oldQuantity = target.quantity; target.quantity = Math.max(0, oldQuantity - quantity); target.availableQuantity = Math.max(0, target.availableQuantity - quantity);
    if (id === 'bond') { target.faceValue = Math.max(0, Number(target.faceValue || oldQuantity * ASSETS.bond.faceValue) - quantity * ASSETS.bond.faceValue); target.accruedInterest = Math.max(0, Number(target.accruedInterest || 0) - bondAccruedSale); }
    if (fullBankWithdrawal) { recordPerformance('interestIncome', bankAccruedSale - Number(target.accruedInterest || 0)); target.accruedInterest = 0; }
    costBasis = target.cost * quantity / Math.max(oldQuantity, 1e-8);
    target.cost = Math.max(0, target.cost - costBasis);
    state.cash += totalCashEffect; state.cashflows.push({ date: currentDate(), type: id === 'bank' ? '银行支取' : '卖出回款', assetId: id, amount: totalCashEffect, fee, interestPaid: bankAccruedSale });
    if (id !== 'bank') recordPerformance('realizedPnl', totalCashEffect - costBasis);
    if (target.quantity <= 1e-8) delete state.holdings[id];
  }
  if (!delayedSell) recordPerformance('fees', fee);
  const order = { id: `ORD-${Date.now()}-${state.orders.length}`, assetId: id, side, amount: estimatedAmount, quantity: delayedBuy ? 0 : quantity, price: delayedBuy || delayedSell ? null : price, fee, feeBreakdown, feeRecorded: !delayedSell, interestPaid: bankAccruedSale, bondQuote: bondQuote || undefined, costBasis: Number(costBasis || 0), status, settlementType, submittedDate: currentDate(), confirmDate: nextDate || currentDate(), settlementDate: settlementDate || currentDate(), cashEffect: totalCashEffect };
  state.orders.push(order);
  addActivity(`${side === 'buy' ? '提交买入' : '提交卖出'} ${asset.name}`, `${status}${status === '待确认' ? ` · 下一估值日 ${nextDate}${delayedSell ? ` · 到账日 ${settlementDate}` : ''}` : status === '待结算' ? ` · 可用日 ${nextDate}` : ''} · ${money(estimatedAmount)} · ${delayedSell ? '预估费用' : '费用'} ${money(fee, 2)}`, estimatedAmount);
  closeTrade(); render(); toast(`${side === 'buy' ? '买入' : '卖出'}委托已提交`);
}

function settleOrder(order) {
  if (!['待确认', '待结算'].includes(order.status)) return;
  const target = state.holdings[order.assetId];
  if (!target) return;
  if (order.settlementType === 'fund_buy') {
    if (order.confirmDate && currentDate() < order.confirmDate) return;
    const availability = fundTradeAvailability('buy', order.confirmDate || currentDate(), true);
    if (!availability.allowed) return rejectFundOrder(order, availability.reason);
    const confirmedNav = availability.imported ? availability.nav : marketPrice('fund', state.day);
    if (!(confirmedNav > 0)) return;
    order.price = confirmedNav;
    order.quantity = order.amount / confirmedNav;
    // Account for the existing holding before adding today's confirmed units.
    settleFundFees();
    target.quantity += order.quantity;
    target.availableQuantity += order.quantity;
    target.cost += order.amount + order.fee;
    target.lastFeeDate = currentDate();
    order.status = '已结算';
    addActivity(`基金确认 ${assetName(order.assetId)}`, `确认日 ${currentDate()}，${order.quantity.toFixed(2)} 份已计入可用持仓。`, 0);
  } else if (order.settlementType === 'fund_sell') {
    if (!order.redemptionConfirmed) {
      if (order.confirmDate && currentDate() < order.confirmDate) return;
      const availability = fundTradeAvailability('sell', order.confirmDate || currentDate(), true);
      if (!availability.allowed) return rejectFundOrder(order, availability.reason);
      const confirmedNav = availability.imported ? availability.nav : marketPrice('fund', state.day);
      if (!(confirmedNav > 0)) return;
      settleFundFees();
      const previousFee = Number(order.fee || 0);
      order.price = confirmedNav;
      order.amount = order.quantity * confirmedNav;
      order.fee = order.amount * feeRateFor('fund', 'sell');
      order.feeBreakdown = tradeFeeDetails('fund', 'sell', order.amount);
      order.cashEffect = order.amount - order.fee;
      target.pendingSellQuantity = Number(target.pendingSellQuantity || 0) + order.quantity;
      target.cost = Math.max(0, target.cost - Number(order.costBasis || 0));
      if (order.feeRecorded !== false) recordPerformance('fees', -previousFee);
      recordPerformance('fees', order.fee);
      order.feeRecorded = true;
      recordPerformance('realizedPnl', order.cashEffect - Number(order.costBasis || 0));
      order.redemptionConfirmed = true;
      order.status = '待结算';
      addActivity(`基金赎回确认 ${assetName(order.assetId)}`, `估值日 ${currentDate()} · 净值 ${money(confirmedNav, 4)} · 待到账 ${money(order.cashEffect)} · 到账日 ${order.settlementDate}。`, 0);
    }
    if (order.settlementDate && currentDate() < order.settlementDate) return;
    target.quantity = Math.max(0, target.quantity - order.quantity);
    target.pendingSellQuantity = Math.max(0, Number(target.pendingSellQuantity || 0) - order.quantity);
    target.frozenQuantity = Math.max(0, Number(target.frozenQuantity || 0) - order.quantity);
    state.cash += order.cashEffect;
    state.cashflows.push({ date: currentDate(), type: '基金赎回到账', assetId: order.assetId, amount: order.cashEffect, fee: order.fee });
    order.status = '已结算';
    if (target.quantity <= 1e-8 && !state.orders.some(item => item !== order && item.assetId === order.assetId && item.status === '待确认' && item.side === 'buy')) delete state.holdings[order.assetId];
    addActivity(`基金赎回到账 ${assetName(order.assetId)}`, `到账 ${money(order.cashEffect)}，扣除赎回费 ${money(order.fee, 2)}。`, order.cashEffect);
  } else if (order.settlementType === 'stock_buy') {
    target.availableQuantity += order.quantity;
    order.status = '已结算';
    addActivity(`股票买入可卖 ${assetName(order.assetId)}`, `T+1 结算完成，${order.quantity.toFixed(0)} 股已可卖。`, 0);
  } else if (order.settlementType === 'stock_sell') {
    const oldQuantity = target.quantity;
    target.quantity = Math.max(0, oldQuantity - order.quantity);
    target.availableQuantity = Math.max(0, target.availableQuantity);
    target.frozenQuantity = Math.max(0, (target.frozenQuantity || 0) - order.quantity);
    target.pendingSellQuantity = Math.max(0, (target.pendingSellQuantity || 0) - order.quantity);
    target.cost = Math.max(0, target.cost * (1 - order.quantity / Math.max(oldQuantity, 1e-8)));
    recordPerformance('realizedPnl', order.cashEffect - Number(order.costBasis || 0));
    order.status = '已结算';
    if (target.quantity <= 1e-8) delete state.holdings[order.assetId];
    addActivity(`股票卖出结算 ${assetName(order.assetId)}`, `结算完成，${order.quantity.toFixed(0)} 股已从持仓中扣除。`, 0);
  }
}

function maybeRunBankPlan() {
  const plan = state.bankPlan;
  if (!plan || state.day < plan.nextDay || currentDate().slice(0, 7) === String(plan.lastDebit || '').slice(0, 7)) return;
  const firstTradingDayOfMonth = tradingDates.findIndex((date, index) => index >= plan.nextDay && date.slice(0, 7) === currentDate().slice(0, 7));
  if (firstTradingDayOfMonth >= 0 && state.day !== firstTradingDayOfMonth) { plan.nextDay = firstTradingDayOfMonth; return; }
  if (state.cash < plan.amount) {
    addActivity('银行定投跳过', `计划扣款 ${money(plan.amount)}，可用现金不足。`, 0);
    plan.nextDay = state.day + 1;
    return;
  }
  settleBankInterest();
  const target = state.holdings.bank || (state.holdings.bank = { quantity: 0, availableQuantity: 0, frozenQuantity: 0, cost: 0, accruedInterest: 0 });
  target.lastInterestDate = target.lastInterestDate || currentDate();
  state.cash -= plan.amount; target.quantity += plan.amount; target.availableQuantity = target.quantity; target.cost += plan.amount;
  state.cashflows.push({ date: currentDate(), type: '银行定投扣款', assetId: 'bank', amount: -plan.amount, fee: 0 });
  addActivity('银行定投扣款', `已投入 ${money(plan.amount)}，按 ${ (annualRateForDate() * 100).toFixed(2) }% 年化基准计息。`, -plan.amount);
  plan.lastDebit = currentDate();
  plan.nextDay = state.day + 1;
}

function settleBankInterest() {
  const bank = state.holdings.bank;
  if (!bank || bank.quantity <= 0) return;
  const today = currentDate();
  if (!bank.lastInterestDate) { bank.lastInterestDate = today; return; }
  const days = calendarDaysBetween(bank.lastInterestDate, today);
  if (days <= 0) return;
  bank.accruedInterest = Number(bank.accruedInterest || 0);
  let income = 0;
  const cursor = new Date(`${bank.lastInterestDate}T00:00:00Z`);
  for (let index = 0; index < days; index += 1) {
    const interest = bank.quantity * annualRateForCalendarDate(cursor.toISOString().slice(0, 10)) / 360;
    bank.accruedInterest += interest;
    income += interest;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const creditDate = cursor.toISOString().slice(0, 10);
    if (/^\d{4}-(03|06|09|12)-21$/.test(creditDate)) {
      const credit = Math.round((bank.accruedInterest + Number.EPSILON) * 100) / 100;
      income += credit - bank.accruedInterest;
      bank.accruedInterest = 0;
      bank.quantity += credit;
      bank.availableQuantity = Number(bank.availableQuantity ?? bank.quantity - credit) + credit;
      state.cashflows.push({ date: creditDate, type: '银行季度结息', assetId: 'bank', amount: credit, fee: 0 });
      addActivity('银行季度结息', `${creditDate} 入账 ${money(credit, 2)}，已计入活期本金；当天以后按新本金计息。`, 0);
    }
  }
  bank.lastInterestDate = today;
  recordPerformance('interestIncome', income);
}

function settleFundFees() {
  const fund = state.holdings.fund;
  if (!fund || fund.quantity <= 0) return;
  const today = currentDate();
  if (!fund.lastFeeDate) { fund.lastFeeDate = today; return; }
  const days = calendarDaysBetween(fund.lastFeeDate, today);
  if (days <= 0) return;
  fund.lastFeeDate = today;
  // A published NAV is net of the fund's actual expenses. Those expenses cannot
  // be inferred from price changes or the demo fee schedule, so do not estimate
  // or charge them again when an imported NAV is available.
  if (Number.isFinite(importedNumericForDate('fund', today))) return;
  const price = marketPrice('fund', state.day);
  if (!(price > 0)) return;
  const annualFee = Number(ASSETS.fund.managementFeeAnnual || 0) + Number(ASSETS.fund.custodyFeeAnnual || 0);
  const investedUnits = Math.max(0, fund.quantity - Number(fund.pendingSellQuantity || 0));
  const estimate = investedUnits * price * annualFee * days / 365;
  if (!(estimate > 0)) return;
  // Informational attribution only: the demo NAV already reflects these costs.
  // Keep the estimate separate from fees that were actually charged to cash.
  recordPerformance('fundEmbeddedFeeEstimate', estimate);
  addActivity('基金内扣费用估算', `演示净值已包含管理费 ${(ASSETS.fund.managementFeeAnnual * 100).toFixed(2)}% 与托管费 ${(ASSETS.fund.custodyFeeAnnual * 100).toFixed(2)}% 年化影响，本期估算 ${money(estimate, 2)}；仅供理解，不再扣减现金或份额。`, 0);
}

function settleBondCashflows() {
  const bond = state.holdings.bond;
  if (!bond || bond.quantity <= 0) return;
  const today = currentDate();
  const faceValue = Number(bond.faceValue || bond.quantity * ASSETS.bond.faceValue);
  bond.faceValue = faceValue;
  const accrual = bondAccrualForDate(today);
  const startDate = bond.lastAccrualDate || today;
  for (const couponDate of bondCouponDates().filter(date => date > startDate && date <= today && date > String(bond.lastCouponDate || ''))) {
    const coupon = bond.quantity * accrual.couponPerUnit;
    state.cash += coupon;
    recordPerformance('interestIncome', coupon);
    state.cashflows.push({ date: couponDate, type: '国债付息（教学示例）', assetId: 'bond', amount: coupon, fee: 0 });
    addActivity('国债付息（教学示例）', `${couponDate} 每张固定票息 ${money(accrual.couponPerUnit, 3)}，共支付 ${money(coupon, 3)}；当期应计利息归零。`, 0);
    bond.lastCouponDate = couponDate;
  }
  bond.accruedInterest = bond.quantity * accrual.accruedPerUnit;
  bond.lastAccrualDate = today;
  if (today >= ASSETS.bond.maturityDate) {
    const unpaidInterest = String(bond.lastCouponDate || '') < ASSETS.bond.maturityDate ? bond.quantity * accrual.couponPerUnit : 0;
    const redemption = bond.faceValue + unpaidInterest;
    state.cash += redemption;
    if (unpaidInterest) recordPerformance('interestIncome', unpaidInterest);
    state.cashflows.push({ date: ASSETS.bond.maturityDate, type: '国债到期兑付（教学示例）', assetId: 'bond', amount: redemption, fee: 0 });
    addActivity('国债到期兑付（教学示例）', `本金及未付息 ${money(redemption, 3)} 已兑付。`, 0);
    delete state.holdings.bond;
  }
}

// 创业公司现金流按月（20 个回放交易日）结算。公司账户与模拟账户分开，
// 因此烧钱和外部融资只改变公司现金跑道，不直接改变用户账户余额。
function settleStartupCashflows() {
  const holding = state.holdings.startup;
  const venture = state.ventures.startup;
  if (!holding || venture.failed || venture.exited) return;
  const burnInterval = 20;
  const externalRoundDay = 40;
  const externalCapital = 80000;

  // A 轮资金在第 40 个交易日到账，再结算该月烧钱，避免把到账日误判为现金耗尽。
  if (state.day >= externalRoundDay && !venture.aRoundCompleted) {
    venture.round = 'A 轮融资';
    venture.milestone = '完成试产';
    venture.aRoundCompleted = true;
    venture.financingRaised += externalCapital;
    venture.companyCash += externalCapital;
    venture.dilution = Math.min(0.25, venture.dilution + 0.1);
    holding.quantity *= 0.9;
    holding.availableQuantity = Math.min(holding.availableQuantity, holding.quantity);
    venture.runwayMonths = venture.companyCash / Math.max(venture.monthlyBurn, 1);
    addActivity('初创公司融资事件', `完成 A 轮融资，外部资金 ${money(externalCapital)} 到账，原股东持股比例被稀释 10%。`, 0);
  }

  if (state.day <= 0 || state.day % burnInterval !== 0) return;
  const burn = Math.max(0, Number(venture.monthlyBurn || 0));
  if (!burn) return;
  venture.companyCash = Math.max(0, Number(venture.companyCash || 0) - burn);
  venture.cumulativeBurn += burn;
  venture.runwayMonths = venture.companyCash / Math.max(burn, 1);
  state.cashflows.push({ date: currentDate(), type: '创业公司月度烧钱', assetId: 'startup', amount: 0, fee: 0 });
  addActivity('初创公司月度烧钱', `研发与运营支出 ${money(burn)}，公司现金 ${money(venture.companyCash)}，现金跑道 ${venture.runwayMonths.toFixed(1)} 个月。`, 0);
  if (venture.companyCash <= 0) {
    venture.failed = true;
    venture.round = '项目失败';
    venture.milestone = '现金耗尽';
    venture.runwayMonths = 0;
    holding.availableQuantity = 0;
    addActivity('初创公司现金耗尽', '公司现金耗尽，股权退出窗口关闭，该项目按零估值处理。', 0);
  }
}

function captureReplayState() {
  const fields = ['day', 'cash', 'startCash', 'holdings', 'orders', 'cashflows', 'bankPlan', 'performance', 'ventures', 'activities', 'snapshots', 'lessonIndex', 'selectedAsset', 'selectedSide', 'filter'];
  return JSON.parse(JSON.stringify(Object.fromEntries(fields.map(field => [field, state[field]]))));
}

function rewindDay() {
  const previous = state.history?.pop();
  if (!previous) return toast('当前已经是回放起点');
  const marketData = state.marketData;
  const dataSnapshotId = state.dataSnapshotId;
  const dataStatus = state.dataStatus;
  const dataMeta = state.dataMeta;
  const instrumentMeta = state.instrumentMeta;
  state = { ...defaultState(previous.startCash), ...previous, history: state.history, marketData, instrumentMeta, dataSnapshotId, dataStatus, dataMeta };
  normalizeHoldings(state);
  render();
  toast(`已回到 ${currentDate()}，当天结算前的状态已恢复`);
}

function advanceDay() {
  if (state.day >= tradingDates.length - 1) return toast('已经到达当前回放区间的最后一天');
  const oldTotal = totalValue();
  state.history = Array.isArray(state.history) ? state.history : [];
  state.history.push(captureReplayState());
  state.day += 1;
  state.orders.filter(order => {
    const nextActionDate = order.settlementType === 'fund_sell' && !order.redemptionConfirmed ? order.confirmDate : order.settlementDate || order.confirmDate;
    return ['待确认', '待结算'].includes(order.status) && nextActionDate <= currentDate();
  }).forEach(settleOrder);
  settleBankInterest();
  // 先结算上一日余额的利息，再执行当日定投，避免新扣款被错误地追溯计息。
  maybeRunBankPlan();
  settleFundFees();
  settleBondCashflows();
  const shop = state.holdings.shop;
  if (shop && state.ventures.shop.opened && !state.ventures.shop.closed && state.day % 20 === 0) {
    const revenue = Math.max(0, 6200 + 1300 * seededNoise(state.day + 200));
    const rent = 2200; const labour = 1850; const inventory = Math.max(700, revenue * 0.22); const tax = Math.max(0, revenue - rent - labour - inventory) * 0.05;
    const totalCost = rent + labour + inventory + tax; const net = revenue - totalCost;
    recordPerformance('operatingIncome', net);
    state.cash += net; state.ventures.shop.month += 1; state.ventures.shop.lastSettlement = currentDate(); state.ventures.shop.cumulativeRevenue += revenue; state.ventures.shop.cumulativeCost += totalCost;
    state.cashflows.push({ date: currentDate(), type: '经营现金流', assetId: 'shop', amount: net, fee: tax });
    addActivity('社区咖啡店月度结算', `营收 ${money(revenue)}，租金/人工/进货/税费 ${money(totalCost)}，净现金流 ${signedMoney(net)}。`, net);
  }
  const startup = state.holdings.startup;
  settleStartupCashflows();
  if (startup && !state.ventures.startup.failed) {
    if (state.day === 65) { state.ventures.startup.round = 'B 轮准备'; state.ventures.startup.milestone = '商业化验证'; addActivity('初创公司里程碑', '完成产品试产并进入商业化验证，估值场景开始改变。', 0); }
    if (state.day === 100) { state.ventures.startup.exited = true; state.ventures.startup.exitDate = currentDate(); addActivity('初创公司开放退出', '达到模拟退出窗口，可在交易页提交退出委托。', 0); }
  }
  if (shop && state.day === 100 && state.ventures.shop.opened && !state.ventures.shop.closed) { addActivity('开店项目进入关店窗口', '可在经营现金流结算后选择关店退出。', 0); }
  state.snapshots.push({ day: state.day, total: totalValue(), daily: totalValue() - oldTotal });
  state.lessonIndex += 1; render(); toast(`已推进到 ${currentDate()}，结算完成`);
}

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(window.__toastTimer); window.__toastTimer = setTimeout(() => el.classList.remove('show'), 2300); }

function cancelOrder(orderId) {
  const order = state.orders.find(item => item.id === orderId);
  if (!order || !['待确认', '待结算'].includes(order.status)) return;
  if (!['fund_buy', 'fund_sell'].includes(order.settlementType) || order.status !== '待确认' || order.redemptionConfirmed) return toast('该委托已成交或确认，不能撤销');
  const target = state.holdings[order.assetId];
  if (order.side === 'buy') {
    state.cash += order.cashEffect;
    state.cashflows.push({ date: currentDate(), type: '撤单退款', assetId: order.assetId, amount: order.cashEffect, fee: 0 });
    if (target && target.quantity <= 1e-8 && !state.orders.some(item => item !== order && item.assetId === order.assetId && item.side === 'buy' && item.status === '待确认')) delete state.holdings[order.assetId];
  } else if (target) {
    target.availableQuantity += order.quantity;
    target.frozenQuantity = Math.max(0, (target.frozenQuantity || 0) - order.quantity);
  }
  if (order.feeRecorded !== false) recordPerformance('fees', -Number(order.fee || 0));
  order.status = '已撤单';
  addActivity(`撤销${order.side === 'buy' ? '买入' : '卖出'}委托`, `${assetName(order.assetId)} · ${order.quantity.toFixed(order.assetId === 'fund' ? 2 : 0)} 单位`, 0);
  render(); toast('委托已撤销');
}

function splitCsvLine(line) {
  const values = []; let value = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { values.push(value.trim()); value = ''; continue; }
    value += char;
  }
  values.push(value.trim());
  return values;
}

function normalizeLicenseStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['authorized', 'authorised', 'licensed', 'user_authorized', 'user-authorized', '已授权', '授权'].includes(normalized)) return 'authorized';
  if (['demo', '演示', 'sample', 'example'].includes(normalized)) return 'demo';
  if (['public_pending_review', 'public-pending-review', '公开来源待审'].includes(normalized)) return 'public_pending_review';
  if (normalized === 'public_personal_use') return 'public_personal_use';
  if (normalized === 'mixed') return 'mixed';
  return 'pending_verification';
}

function licenseStatusLabel(value) {
  const normalized = normalizeLicenseStatus(value);
  if (normalized === 'authorized') return '已授权';
  if (normalized === 'demo') return '演示数据';
  if (normalized === 'public_pending_review') return '公开来源待审';
  if (normalized === 'public_personal_use') return '公开数据 · 个人学习';
  if (normalized === 'mixed') return '混合许可 · 逐条查看';
  return '待核验';
}

function isValidReplayDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < replayStartDate || date > replayEndDate) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function parseSnapshotRows(rows, metadata = {}) {
  const marketData = {}; const instrumentMeta = {}; const seen = new Set(); const warnings = [];
  let acceptedCount = 0; let rejectedCount = 0;
  const inputRows = Array.isArray(rows) ? rows : [];
  let source = String(metadata.source || metadata.data_source || '').trim();
  let licenseStatus = String(metadata.license_status || metadata.licenseStatus || metadata.license || '').trim();
  let retrievedAt = String(metadata.retrieved_at || metadata.retrievedAt || '').trim();
  let missingSourceRows = 0; let missingLicenseRows = 0; let missingRetrievedAtRows = 0;
  let invalidRetrievedAtRows = 0;
  inputRows.forEach((input, rowIndex) => {
    const row = input || {};
    const asset = String(row.asset_id ?? row.asset ?? row.instrument_id ?? '').trim();
    const date = String(row.date ?? row.trade_date ?? row.tradedate ?? '').trim();
    const valueKey = ['close', 'nav', 'rate_annualized', 'rate', 'value'].find(key => row[key] !== '' && row[key] != null);
    const value = valueKey == null ? NaN : Number(row[valueKey]);
    const rowSource = String(row.source || row.data_source || '').trim();
    const rowLicense = String(row.license_status || row.licenseStatus || row.license || '').trim();
    const rowRetrievedAt = String(row.retrieved_at || row.retrievedAt || '').trim();
    if (!rowSource && !source) missingSourceRows += 1;
    if (!rowLicense && !licenseStatus) missingLicenseRows += 1;
    if (!rowRetrievedAt && !retrievedAt) missingRetrievedAtRows += 1;
    const effectiveRetrievedAt = rowRetrievedAt || retrievedAt;
    if (effectiveRetrievedAt && (Number.isNaN(new Date(effectiveRetrievedAt).getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(effectiveRetrievedAt))) invalidRetrievedAtRows += 1;
    if (!asset || !supportedAssetIds.has(asset)) { rejectedCount += 1; warnings.push(`第 ${rowIndex + 1} 行的 asset_id 无法映射：${asset || '空值'}`); return; }
    if (!isValidReplayDate(date)) { rejectedCount += 1; warnings.push(`第 ${rowIndex + 1} 行日期无效或超出回放区间：${date || '空值'}`); return; }
    if (!Number.isFinite(value)) { rejectedCount += 1; warnings.push(`第 ${rowIndex + 1} 行缺少可识别数值列`); return; }
    if ((asset === 'bank' && value < 0) || (asset !== 'bank' && value <= 0)) {
      rejectedCount += 1;
      warnings.push(`第 ${rowIndex + 1} 行数值必须${asset === 'bank' ? '大于或等于 0' : '大于 0'}：${value}`);
      return;
    }
    const symbol = String(row.symbol || row.ticker || row.code || '').trim();
    const name = String(row.name || row.instrument_name || row.asset_name || '').trim();
    if (symbol && instrumentMeta[asset]?.symbol && symbol !== instrumentMeta[asset].symbol) {
      rejectedCount += 1; warnings.push(`第 ${rowIndex + 1} 行属于不同标的 ${symbol}；同一资产槽不能混合多个证券代码`); return;
    }
    const key = `${asset}|${date}`;
    if (seen.has(key)) warnings.push(`重复记录已覆盖：${asset} ${date}`);
    else { seen.add(key); acceptedCount += 1; }
    if (!marketData[asset]) marketData[asset] = {};
    const normalizedRow = { ...row, date, asset_id: asset, [valueKey]: value, source: rowSource || source,
      license_status: normalizeLicenseStatus(rowLicense || licenseStatus), retrieved_at: rowRetrievedAt || retrievedAt };
    if (valueKey !== 'close' && (row.close === '' || row.close == null || !Number.isFinite(Number(row.close)))) delete normalizedRow.close;
    marketData[asset][date] = normalizedRow;
    if ((symbol || name) && !instrumentMeta[asset]) instrumentMeta[asset] = { symbol, name };
  });
  const acceptedRows = Object.values(marketData).flatMap(series => Object.values(series));
  const sources = [...new Set(acceptedRows.map(row => row.source).filter(Boolean))];
  const licenses = [...new Set(acceptedRows.map(row => row.license_status))];
  const retrievedDates = acceptedRows.map(row => row.retrieved_at).filter(Boolean).sort();
  source = sources.join('；');
  licenseStatus = licenses.length === 1 ? licenses[0] : 'mixed';
  retrievedAt = retrievedDates.at(-1) || '';
  if (retrievedAt && (Number.isNaN(new Date(String(retrievedAt)).getTime()) || !/^\d{4}-\d{2}-\d{2}/.test(String(retrievedAt)))) warnings.push(`retrieved_at 格式无法核验：${retrievedAt}`);
  if (missingSourceRows) warnings.push(`${missingSourceRows} 条记录缺少 source，且未提供全局来源`);
  if (missingLicenseRows) warnings.push(`${missingLicenseRows} 条记录缺少 license_status，且未提供全局许可状态`);
  if (missingRetrievedAtRows) warnings.push(`${missingRetrievedAtRows} 条记录缺少 retrieved_at，且未提供全局获取时间`);
  if (invalidRetrievedAtRows) warnings.push(`${invalidRetrievedAtRows} 条记录的 retrieved_at 格式无法核验`);
  const missingTradingDays = {};
  ['stock', 'fund', 'bond'].forEach(assetId => {
    const series = marketData[assetId];
    if (!series || !Object.keys(series).length) return;
    const missing = tradingDates.filter(date => !series[date]);
    if (missing.length) {
      missingTradingDays[assetId] = missing.length;
      warnings.push(`${assetId} 缺少 ${missing.length} 个交易日记录，回放将沿用此前最近记录；首条记录前仍使用演示值`);
    }
  });
  const quality = {
    sourcePresent: Boolean(source) && missingSourceRows === 0,
    licensePresent: missingLicenseRows === 0,
    retrievedAtPresent: Boolean(retrievedAt),
    retrievedAtValid: Boolean(retrievedAt) && !Number.isNaN(new Date(String(retrievedAt)).getTime()) && /^\d{4}-\d{2}-\d{2}/.test(String(retrievedAt)),
    missingSourceRows,
    missingLicenseRows,
    missingRetrievedAtRows,
    invalidRetrievedAtRows,
    missingTradingDays
  };
  return {
    marketData,
    instrumentMeta,
    rows: acceptedCount,
    rejectedCount,
    warnings,
    source: source || '未填写来源',
    licenseStatus: normalizeLicenseStatus(licenseStatus),
    retrievedAt: retrievedAt || null,
    snapshotId: metadata.snapshot_id || metadata.snapshotId,
    quality
  };
}

function parseCsvSnapshot(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean); if (lines.length < 2) return null;
  const headers = splitCsvLine(lines.shift()).map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase());
  const rows = lines.map(line => { const values = splitCsvLine(line); return headers.reduce((row, key, index) => { row[key] = values[index] ?? ''; return row; }, {}); });
  if (!headers.some(header => ['date', 'trade_date', 'tradedate'].includes(header)) || !headers.some(header => ['asset_id', 'asset', 'instrument_id'].includes(header)) || !headers.some(header => ['close', 'nav', 'rate', 'rate_annualized', 'value'].includes(header))) throw new Error('CSV 需要 date、asset_id、close（基金可用 nav）列');
  return parseSnapshotRows(rows, { snapshot_id: rows.find(row => row.snapshot_id)?.snapshot_id });
}

function importSnapshotText(text, filename) {
  let parsed; const trimmed = text.trim();
  if (filename.toLowerCase().endsWith('.csv')) parsed = parseCsvSnapshot(trimmed);
  else {
    const payload = JSON.parse(trimmed); const metadata = { ...(payload.metadata || payload.meta || {}) };
    for (const key of ['source', 'license_status', 'retrieved_at', 'snapshot_id']) if (payload[key] != null) metadata[key] = payload[key];
    const rows = Array.isArray(payload.rows || payload.data) ? (payload.rows || payload.data) : [];
    const marketRows = rows.length ? rows : Object.entries(payload.marketData || {}).flatMap(([asset, dates]) => Object.entries(dates || {}).map(([date, row]) => { const details = row && typeof row === 'object' ? row : { close: row }; return { ...details, asset_id: details.asset_id || asset, date: details.date || date }; }));
    parsed = parseSnapshotRows(marketRows, metadata);
  }
  if (!parsed || !parsed.rows) throw new Error(`没有找到可导入的有效行情记录（回放区间 ${replayStartDate} 至 ${replayEndDate}）`);
  for (const [assetId, instrument] of Object.entries(parsed.instrumentMeta || {})) {
    const currentSymbol = state.instrumentMeta?.[assetId]?.symbol;
    if (currentSymbol && instrument.symbol && currentSymbol !== instrument.symbol) throw new Error(`${ASSETS[assetId].type}已使用 ${currentSymbol}，不能把 ${instrument.symbol} 混入同一段价格。请单独准备一个标的的完整快照。`);
  }
  const mergedMarketData = { ...(state.marketData || {}) };
  Object.entries(parsed.marketData || {}).forEach(([assetId, series]) => {
    mergedMarketData[assetId] = { ...(mergedMarketData[assetId] || {}), ...series };
  });
  state.marketData = mergedMarketData;
  state.instrumentMeta = { ...(state.instrumentMeta || {}), ...(parsed.instrumentMeta || {}) };
  state.dataSnapshotId = parsed.snapshotId || `imported-${new Date().toISOString().slice(0, 10)}`;
  state.dataStatus = parsed.licenseStatus === 'authorized'
    ? 'authorized'
    : parsed.licenseStatus === 'demo' ? 'demo' : 'imported_pending_license';
  state.dataMeta = { source: parsed.source, licenseStatus: parsed.licenseStatus, retrievedAt: parsed.retrievedAt, acceptedCount: parsed.rows, rejectedCount: parsed.rejectedCount, warnings: parsed.warnings, quality: parsed.quality };
  const warningText = parsed.warnings.length ? `，${parsed.warnings.length} 条校验提示` : '';
  addActivity('导入历史数据快照', `${filename} · 接受 ${parsed.rows} 条，拒绝 ${parsed.rejectedCount} 条${warningText} · ${state.dataSnapshotId}`, 0);
  render(); toast(`已导入 ${parsed.rows} 条数据${parsed.rejectedCount ? `，拒绝 ${parsed.rejectedCount} 条` : ''}`);
}

function loadBuiltinHistory(reset = false) {
  const snapshot = window.INVEST_HISTORY_SNAPSHOT;
  if (!snapshot) return false;
  const parsed = parseSnapshotRows(snapshot.rows, snapshot.metadata);
  if (!parsed.rows || parsed.rejectedCount) throw new Error('内置历史快照未通过数据校验');
  if (reset) state = defaultState(state.startCash);
  state.marketData = parsed.marketData;
  state.instrumentMeta = parsed.instrumentMeta;
  state.dataSnapshotId = snapshot.snapshot_id;
  state.dataStatus = 'imported_pending_license';
  state.dataMeta = { source: '东方财富公开历史数据；银行与国债见各自来源', licenseStatus: parsed.licenseStatus,
    retrievedAt: parsed.retrievedAt, acceptedCount: parsed.rows, rejectedCount: 0, warnings: parsed.warnings, quality: parsed.quality };
  return true;
}

async function exportAccount() {
  const filename = `sim-invest-account-${currentDate()}.json`;
  const data = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  try {
    if (window.Capacitor?.isNativePlatform()) {
      const exporter = window.Capacitor.registerPlugin('AccountExport');
      const result = await exporter.save({ filename, data });
      return toast(result.cancelled ? '已取消导出' : '账户快照已保存');
    }
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('账户快照已导出');
  } catch (error) { toast(`导出未完成：${error.message || '请重试'}`); }
}

$$('[data-go]').forEach(button => button.addEventListener('click', () => showView(button.dataset.go)));
$('#advanceBtn').addEventListener('click', advanceDay);
$('#rewindBtn')?.addEventListener('click', rewindDay);
$('#reportBtn').addEventListener('click', () => { showView('review'); toast('已打开当日结算'); });
$('#resetBtn').addEventListener('click', confirmReplayReset);
$('#closeModal').addEventListener('click', closeTrade);
$('#tradeModal').addEventListener('click', event => { if (event.target.id === 'tradeModal') closeTrade(); });
$('#tradeAmount').addEventListener('input', updateEstimate);
$('#confirmTrade').addEventListener('click', confirmTrade);
$('#assetList').addEventListener('click', event => { const button = event.target.closest('[data-buy]'); if (button) openTrade(button.dataset.buy); });
$('#tradeSelector').addEventListener('click', event => { const button = event.target.closest('[data-trade-asset]'); if (!button) return; state.selectedAsset = button.dataset.tradeAsset; renderTrade(); });
$('#orderTicket').addEventListener('click', event => { const button = event.target.closest('[data-open-order]'); if (button) openTrade(button.dataset.openOrder); });
$('#orderTicket').addEventListener('click', event => { const button = event.target.closest('[data-close-shop]'); if (button) closeShop(); });
$('#orderList').addEventListener('click', event => { const button = event.target.closest('[data-cancel-order]'); if (button) cancelOrder(button.dataset.cancelOrder); });
$('#filterRow').addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; state.filter = button.dataset.filter; $$('.filter-chip').forEach(el => el.classList.toggle('active', el === button)); renderAssets(); });
$$('[data-amount]').forEach(button => button.addEventListener('click', () => {
  const id = state.selectedAsset;
  const selling = state.selectedSide === 'sell';
  const available = Number(state.holdings[id]?.availableQuantity || 0);
  const unitPrice = id === 'bond' ? marketPrice(id, state.day) + bondAccrualForDate(currentDate()).accruedPerUnit : marketPrice(id, state.day);
  $('#tradeAmount').value = button.dataset.amount === 'max' ? (selling ? available * unitPrice : state.cash.toFixed(2)) : button.dataset.amount;
  updateEstimate();
}));
$('#buySideBtn').addEventListener('click', () => { state.selectedSide = 'buy'; openTrade(state.selectedAsset || 'stock', 'buy'); });
$('#sellSideBtn').addEventListener('click', () => { state.selectedSide = 'sell'; openTrade(state.selectedAsset || 'stock', 'sell'); });
$('#analysisBtn').addEventListener('click', () => { showView('review'); toast('已打开资产分析'); });
$('#exportBtn').addEventListener('click', exportAccount);
$('#dataImport').addEventListener('change', event => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { importSnapshotText(String(reader.result), file.name); } catch (error) { toast(error.message || '数据导入失败'); } }; reader.readAsText(file, 'utf-8'); event.target.value = ''; });
$('#applyAccountConfigBtn').addEventListener('click', applyAccountConfig);
$('#resetAccountBtn').addEventListener('click', confirmReplayReset);
$('#applyCommissionBtn')?.addEventListener('click', () => {
  const rate = Number($('#commissionRateInput').value) / 10000;
  const minimum = Number($('#commissionMinInput').value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 0.003 || !Number.isFinite(minimum) || minimum < 0 || minimum > 100) return toast('请输入有效的佣金假设（万0–30，最低0–100元）');
  state.stockCommission = { rate, minimum }; render(); toast('佣金假设已保存，适用于之后的股票委托');
});
$('#builtinHistoryBtn')?.addEventListener('click', async () => {
  if (!await confirmAccountChange('使用内置历史快照重新开始？当前持仓、订单和进度将清空，初始资金保留。')) return;
  loadBuiltinHistory(true); render(); showView('home'); toast('已从首个交易日开始历史回放');
});

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
if (!Object.keys(state.marketData || {}).length && !state.orders.length && !Object.keys(state.holdings).length && state.day === 0) loadBuiltinHistory();
render();

