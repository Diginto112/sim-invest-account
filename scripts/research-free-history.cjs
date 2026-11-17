// Public, unauthenticated sources for a local educational history candidate.
// Does not accept any licence, bypass controls, or claim redistribution rights.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', 'data', 'research');
fs.mkdirSync(root, { recursive: true });
const sources = [
  { id: 'baostock-home', url: 'https://www.baostock.com/', file: 'baostock-home.html' },
  { id: 'baostock-guide', url: 'http://baostock.com/baostock/index.php/%E9%A6%96%E9%A1%B5', file: 'baostock-guide.html' },
  { id: 'fund-161725-2020h1', url: 'https://api.fund.eastmoney.com/f10/lsjz?fundCode=161725&pageIndex=1&pageSize=200&startDate=2020-01-02&endDate=2020-06-30', file: 'fund-161725-2020h1.json', headers: { Referer: 'https://fundf10.eastmoney.com/' } },
  { id: 'stock-600519-2020h1', url: 'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.600519&klt=101&fqt=0&beg=20200102&end=20200630&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61', file: 'stock-600519-2020h1.json' },
  { id: 'tencent-600519-2020h1', url: 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,2020-01-01,2020-06-30,150', file: 'tencent-600519-2020h1.json' },
  { id: 'pboc-deposit-rates', url: 'https://www.pbc.gov.cn/zhengcehuobisi/125207/125213/125440/125838/125888/2967015/index.html', file: 'pboc-deposit-rates.html' }
];
async function fetchSource(source) {
  const started = Date.now();
  try {
    const response = await fetch(source.url, { headers: { 'User-Agent': 'Mozilla/5.0', ...(source.headers || {}) }, signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    fs.writeFileSync(path.join(root, source.file), body);
    return { ...source, status: response.status, final_url: response.url, retrieved_at: new Date().toISOString(), bytes: Buffer.byteLength(body), elapsed_ms: Date.now() - started };
  } catch (error) {
    return { ...source, error: error.cause?.code || error.message, retrieved_at: new Date().toISOString(), elapsed_ms: Date.now() - started };
  }
}
(async () => {
  const results = await Promise.all(sources.map(fetchSource));
  const home = fs.existsSync(path.join(root, 'baostock-home.html')) ? fs.readFileSync(path.join(root, 'baostock-home.html'), 'utf8') : '';
  const frontendPath = home.match(/<script[^>]+src="([^"]+\.js)"/);
  if (frontendPath) results.push(await fetchSource({ id: 'baostock-public-frontend', url: new URL(frontendPath[1], 'https://www.baostock.com/').href, file: 'baostock-public-frontend.js.txt' }));
  fs.writeFileSync(path.join(root, 'fetch-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.map(({ id, status, bytes, error }) => ({ id, status, bytes, error })), null, 2));
})();
