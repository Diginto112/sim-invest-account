const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', 'data', 'research');
fs.mkdirSync(root, { recursive: true });
const sources = [];
for (let page = 1; page <= 6; page++) sources.push({ id: `fund-005827-page-${page}`, url: `https://api.fund.eastmoney.com/f10/lsjz?fundCode=005827&pageIndex=${page}&pageSize=20&startDate=2020-01-02&endDate=2020-06-30`, file: `fund-005827-2020h1-p${page}.json`, headers: { Referer: 'https://fundf10.eastmoney.com/' } });
sources.push({ id: 'stock-600036-2020h1', url: 'https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=1.600036&klt=101&fqt=0&beg=20200102&end=20200630&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61', file: 'stock-600036-2020h1.json' });
const dividends = new URL('https://datacenter-web.eastmoney.com/api/data/v1/get');
dividends.search = new URLSearchParams({ reportName: 'RPT_SHAREBONUS_DET', columns: 'ALL', filter: '(SECURITY_CODE="600036")(REPORT_DATE=\'2019-12-31\')', pageNumber: '1', pageSize: '20' }).toString();
sources.push({ id: 'stock-600036-dividend-2019', url: dividends.href, file: 'stock-600036-dividend-2019.json' });
sources.push({ id: 'baostock-disclaimer', url: 'https://www.baostock.com/assets/Disclaimer-TqSlY2vn.js', file: 'baostock-disclaimer.js.txt' });
sources.push({ id: 'icbc-deposit-index', url: 'https://www.icbc.com.cn/ICBC/金融信息/存款利率/人民币存款利率表/', file: 'icbc-deposit-index.html' });
const searches = [
  ['bank-rate', 'site.icbc.com.cn "2015-10-24" "活期"'],
  ['treasury-200001', 'site.mof.gov.cn "2020年记账式附息（一期）国债"'],
  ['stock-600036-corporate-action', '招商银行 2019年度 A股 分红 2020 7月13日']
];
for (const [id, query] of searches) { const url = new URL('https://www.bing.com/search'); url.searchParams.set('q', query); sources.push({ id: `search-${id}`, url: url.href, file: `search-${id}.html` }); }
async function fetchSource(source) {
  try {
    const response = await fetch(source.url, { headers: { 'User-Agent': 'Mozilla/5.0', ...(source.headers || {}) }, signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    fs.writeFileSync(path.join(root, source.file), body);
    return { ...source, status: response.status, final_url: response.url, retrieved_at: new Date().toISOString(), bytes: Buffer.byteLength(body) };
  } catch (error) { return { ...source, error: error.cause?.code || error.message, retrieved_at: new Date().toISOString() }; }
}
(async () => { const results=[]; for(let i=0;i<sources.length;i+=4)results.push(...await Promise.all(sources.slice(i,i+4).map(fetchSource))); fs.writeFileSync(path.join(root,'fetch-followup-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(({id,status,bytes,error})=>({id,status,bytes,error})),null,2)); })();
