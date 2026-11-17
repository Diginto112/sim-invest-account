const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const required = ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'sw.js', 'capacitor.config.ts', 'scripts/serve.cjs', 'data/historical-snapshot.json', 'data/historical-snapshot.js'];
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`missing ${file}`);
const androidRequired = ['package-lock.json', 'android/settings.gradle', 'android/app/build.gradle', 'android/gradlew.bat'];
for (const file of androidRequired) if (!fs.existsSync(path.join(root, file))) throw new Error(`missing Android packaging file ${file}`);
function productionFiles(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(directory, entry.name);
    if (relative === path.join('data', 'research')) return [];
    return entry.isDirectory() ? productionFiles(relative) : [relative];
  });
}
// Both deployable copies must match the source. Two equally stale copies fail.
const deployedFiles = ['index.html', 'app.js', 'styles.css', 'manifest.webmanifest', 'sw.js', ...productionFiles('data'), ...productionFiles('icons')];
for (const file of deployedFiles) {
  const original = fs.readFileSync(path.join(root, file));
  for (const destination of ['web', path.join('android', 'app', 'src', 'main', 'assets', 'public')]) {
    const target = path.join(root, destination, file);
    if (!fs.existsSync(target) || !original.equals(fs.readFileSync(target))) throw new Error(`${destination} asset is out of sync with source: ${file}; run npm run prepare:web`);
  }
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
for (const marker of ['initialCapitalInput', 'applyAccountConfigBtn', 'dataImport', 'authorized-market-data-template.csv', 'tradeModal', 'historical-snapshot.js']) if (!html.includes(marker)) throw new Error(`missing UI marker ${marker}`);
const template = fs.readFileSync(path.join(root, 'data', 'authorized-market-data-template.csv'), 'utf8');
for (const marker of ['date,asset_id,symbol,close,nav,rate_annualized,source,license_status,retrieved_at,timezone,snapshot_id', 'license_status', 'demo']) if (!template.includes(marker)) throw new Error(`data template missing ${marker}`);
const templateLines = template.trim().split(/\r?\n/);
const templateHeaders = templateLines.shift().split(',');
const templateRows = templateLines.map(line => line.split(','));
const column = name => templateHeaders.indexOf(name);
for (const requiredColumn of ['date', 'asset_id', 'close', 'nav', 'rate_annualized', 'source', 'license_status', 'retrieved_at', 'timezone', 'snapshot_id']) {
  if (column(requiredColumn) < 0) throw new Error(`data template missing column ${requiredColumn}`);
}
for (const [index, row] of templateRows.entries()) {
  const numeric = ['close', 'nav', 'rate_annualized'].some(name => row[column(name)] !== '' && Number.isFinite(Number(row[column(name)])));
  if (!row[column('date')] || !row[column('asset_id')] || !numeric) throw new Error(`data template row ${index + 2} has no usable date/asset/value`);
  for (const metadataColumn of ['source', 'license_status', 'retrieved_at', 'timezone', 'snapshot_id']) if (!row[column(metadataColumn)]) throw new Error(`data template row ${index + 2} missing ${metadataColumn}`);
}
for (const marker of ['settleBankInterest', 'settleBondCashflows', 'settleFundFees', 'settleStartupCashflows', 'parseSnapshotRows', 'firstNumericValue']) if (!app.includes(`function ${marker}`)) throw new Error(`missing engine function ${marker}`);
const syntaxFiles = ['app.js', 'sw.js', 'data/historical-snapshot.js', ...fs.readdirSync(path.join(root, 'scripts')).filter(file => /\.(?:c?js|mjs)$/.test(file)).map(file => path.join('scripts', file))];
for (const file of syntaxFiles) {
  const syntax = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (syntax.error || syntax.status !== 0) throw new Error(`JavaScript syntax failed for ${file}: ${syntax.stderr || syntax.error || 'unknown error'}`);
}
const calendar = JSON.parse(fs.readFileSync(path.join(root, 'data', 'trading-calendar-2020.json'), 'utf8'));
if (calendar.period.from !== '2020-01-02' || calendar.period.to !== '2020-06-30') throw new Error('unexpected replay period');
if (!calendar.source || !(calendar.status || calendar.license_status)) throw new Error('calendar source/status metadata is missing');
const ventures = JSON.parse(fs.readFileSync(path.join(root, 'data', 'venture-scenarios.json'), 'utf8'));
if (!/scenario/.test(ventures.status || '') || !ventures.shop || !ventures.startup) throw new Error('venture metadata must explicitly identify an educational scenario');

const check = (condition, message) => { if (!condition) throw new Error(message); };
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const manifest = readJson('manifest.webmanifest');
for (const dimension of [192, 512]) {
  const icon = (manifest.icons || []).find(item => item.sizes === `${dimension}x${dimension}`);
  check(icon && icon.type === 'image/png', `missing ${dimension}px PWA icon declaration`);
  const iconFile = path.resolve(root, icon.src);
  check(iconFile.startsWith(root + path.sep) && fs.existsSync(iconFile), `missing local PWA icon: ${icon.src}`);
  const png = fs.readFileSync(iconFile);
  check(png.length > 24 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && png.readUInt32BE(16) === dimension && png.readUInt32BE(20) === dimension, `invalid PNG size or signature: ${icon.src}`);
}

// Check the actual bundled dataset instead of trusting its quality counters.
const history = readJson('data/historical-snapshot.json');
const meta = history.metadata || {};
check(history.snapshot_id && meta.data_kind === 'actual_historical' && meta.data_quality?.synthetic === false, 'historical snapshot must identify real historical records');
check(meta.license_status === 'public_pending_review', 'public historical data must retain its pending reuse review label');
check(meta.source && meta.purpose && Number.isFinite(Date.parse(meta.retrieved_at)), 'historical snapshot provenance is incomplete');
check(meta.period?.from === '2020-01-02' && meta.period?.to === '2020-06-30', 'unexpected historical period');
check(Array.isArray(history.rows) && history.rows.length === 235, 'historical snapshot must contain 235 records');
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const rowsFor = id => history.rows.filter(row => row.asset_id === id);
const stock = rowsFor('stock'); const fund = rowsFor('fund'); const bank = rowsFor('bank');
check(stock.length === 117 && fund.length === 117 && bank.length === 1, 'unexpected stock/fund/bank record counts');
const dateSet = rows => [...new Set(rows.map(row => row.date))].sort();
const stockDates = dateSet(stock); const fundDates = dateSet(fund);
check(stockDates.length === 117 && JSON.stringify(stockDates) === JSON.stringify(fundDates), 'stock/fund dates are incomplete, duplicated or inconsistent');
check(stockDates[0] === meta.period.from && stockDates.at(-1) === meta.period.to, 'historical endpoints do not match the replay window');
for (const [index, row] of history.rows.entries()) {
  const label = `historical row ${index + 1}`;
  check(validDate(row.date) && row.date >= meta.period.from && row.date <= meta.period.to, `${label} has invalid/out-of-period date`);
  check(row.snapshot_id === history.snapshot_id && row.license_status === 'public_pending_review' && row.timezone === 'Asia/Shanghai', `${label} has inconsistent snapshot/licence/timezone`);
  const retrieved = Date.parse(row.retrieved_at);
  check(Number.isFinite(retrieved) && retrieved >= Date.parse(row.date) && retrieved <= Date.now() + 86400000, `${label} has invalid retrieval time`);
  let url; try { url = new URL(row.source); } catch { /* validation below */ }
  check(url && url.protocol === 'https:', `${label} is missing its HTTPS source URL`);
  if (row.asset_id === 'stock') {
    check(row.symbol === '600036' && row.adjustment === 'unadjusted' && url.hostname === 'push2his.eastmoney.com' && url.searchParams.get('fqt') === '0', `${label} has unexpected stock/adjustment/source`);
    check(['open', 'close', 'high', 'low'].every(key => Number.isFinite(row[key]) && row[key] > 0) && row.low <= Math.min(row.open, row.close) && row.high >= Math.max(row.open, row.close), `${label} has invalid stock OHLC`);
  } else if (row.asset_id === 'fund') {
    check(row.symbol === '005827' && row.nav > 0 && row.accumulated_nav > 0 && row.nav_fees_included === true && url.hostname === 'api.fund.eastmoney.com', `${label} has invalid fund NAV/source/fee treatment`);
    check(row.subscription_status && row.redemption_status, `${label} is missing historical fund trading status`);
  } else {
    check(row.asset_id === 'bank' && row.rate_annualized === 0.003 && row.rate_effective_from === '2015-10-24' && url.hostname === 'www.bankofchina.com', `${label} has unexpected demand-deposit rate/source`);
  }
}
const scriptContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data', 'historical-snapshot.js'), 'utf8'), scriptContext, { timeout: 1000 });
check(JSON.stringify(scriptContext.window.INVEST_HISTORY_SNAPSHOT) === JSON.stringify(history), 'historical-snapshot.js does not match its JSON source');
const derivedDates = [];
for (let day = new Date(`${calendar.period.from}T00:00:00Z`); day <= new Date(`${calendar.period.to}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
  const date = day.toISOString().slice(0, 10);
  const closed = (calendar.closed_intervals || []).some(interval => date >= interval.from && date <= interval.to);
  if (day.getUTCDay() !== 0 && day.getUTCDay() !== 6 && !closed) derivedDates.push(date);
}
check(JSON.stringify(derivedDates) === JSON.stringify(stockDates), 'holiday calendar does not match observed stock/fund valuation dates');
if (Array.isArray(calendar.dates)) check(JSON.stringify(calendar.dates) === JSON.stringify(stockDates), 'explicit calendar dates do not match observed stock/fund dates');
check(history.calendar?.status === 'cross_checked' && JSON.stringify(history.calendar.dates) === JSON.stringify(stockDates), 'embedded historical calendar has not been cross-checked');
const sources = readJson('data/source-manifest.json');
check(Array.isArray(sources.sources) && sources.sources.length > 0, 'source manifest has no source records');
console.log(`Project validation passed: ${deployedFiles.length} source/Web/Android assets match; ${syntaxFiles.length} JavaScript files parse; 235 historical records, 117 trading dates, provenance and PWA icons verified.`);
