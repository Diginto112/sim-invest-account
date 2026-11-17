const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const candidate = JSON.parse(fs.readFileSync(path.join(root, 'data/research/free-history-candidate.json'), 'utf8'));
const dates = [...new Set(candidate.rows.filter(row => row.asset_id === 'stock').map(row => row.date))].sort();
if (dates.length !== 117 || dates[0] !== '2020-01-02' || dates.at(-1) !== '2020-06-30') throw new Error('Historical calendar is incomplete');
for (const asset of ['stock', 'fund']) {
  const rows = candidate.rows.filter(row => row.asset_id === asset);
  if (rows.length !== dates.length || dates.some(date => !rows.some(row => row.date === date))) throw new Error(`${asset}: incomplete historical coverage`);
  if (rows.some(row => !Number.isFinite(row.close ?? row.nav) || (row.close ?? row.nav) <= 0 || !row.source || !row.retrieved_at)) throw new Error(`${asset}: invalid quote provenance/value`);
}
candidate.calendar = { dates, source: '股票日线与基金净值日期集合交叉核对', status: 'cross_checked' };
const json = JSON.stringify(candidate, null, 2);
fs.writeFileSync(path.join(root, 'data/historical-snapshot.json'), json + '\n');
fs.writeFileSync(path.join(root, 'data/historical-snapshot.js'), 'window.INVEST_HISTORY_SNAPSHOT = ' + JSON.stringify(candidate).replace(/</g, '\\u003c') + ';\n');
console.log(`Prepared ${candidate.rows.length} historical rows across ${dates.length} trading days; no synthetic stock/fund prices.`);
