const fs=require('fs');const path=require('path');const crypto=require('crypto');const root=path.resolve(__dirname,'..','data','research');
const logs=JSON.parse(fs.readFileSync(path.join(root,'fetch-followup-results.json'),'utf8'));
const logFor=id=>logs.find(x=>x.id===id);
const record=(asset_id,symbol,name,date,value,source)=>({date,asset_id,symbol,name,...value,source:source.url,license_status:'public_pending_review',retrieved_at:source.retrieved_at,timezone:'Asia/Shanghai',snapshot_id:'cn-2020h1-public-local-v1'});
const stock=JSON.parse(fs.readFileSync(path.join(root,'stock-600036-2020h1.json'),'utf8')).data;
if(stock.code!=='600036'||stock.klines.length!==117)throw new Error('Unexpected stock history');
const stockRows=stock.klines.map(line=>{const [date,open,close,high,low,volume,amount]=line.split(',');return record('stock',stock.code,stock.name,date,{open:+open,close:+close,high:+high,low:+low,volume_lots:+volume,turnover:+amount,adjustment:'unadjusted'},logFor('stock-600036-2020h1'))});
const fundRows=[];for(let p=1;p<=6;p++){const payload=JSON.parse(fs.readFileSync(path.join(root,`fund-005827-2020h1-p${p}.json`),'utf8'));if(payload.ErrCode!==0||payload.TotalCount!==117)throw new Error('Unexpected fund page');fundRows.push(...payload.Data.LSJZList.map(r=>record('fund','005827','易方达蓝筹精选混合',r.FSRQ,{nav:+r.DWJZ,accumulated_nav:+r.LJJZ,subscription_status:r.SGZT,redemption_status:r.SHZT,nav_fees_included:true,dividend_note:r.FHFCZ||r.FHSP||''},logFor(`fund-005827-page-${p}`))))}
fundRows.sort((a,b)=>a.date.localeCompare(b.date));
const dates=stockRows.map(r=>r.date);if(new Set(dates).size!==117||fundRows.length!==117||new Set(fundRows.map(r=>r.date)).size!==117)throw new Error('History contains duplicate dates');
if(dates.some((d,i)=>fundRows[i].date!==d))throw new Error('Stock/fund date sets do not match');
if([...stockRows,...fundRows].some(r=>!(r.close>0||r.nav>0)))throw new Error('Nonpositive price or NAV');
const corp=JSON.parse(fs.readFileSync(path.join(root,'stock-600036-dividend-2019.json'),'utf8')).result.data[0];
const candidate={snapshot_id:'cn-2020h1-public-local-v1',metadata:{source:'东方财富公开历史接口；本地个人学习候选快照',license_status:'public_pending_review',retrieved_at:logFor('stock-600036-2020h1').retrieved_at,purpose:'本地个人学习；未获得公开再分发或商业使用许可，不据此声称已授权',period:{from:'2020-01-02',to:'2020-06-30'},data_kind:'actual_historical',data_quality:{stock_rows:117,fund_rows:117,date_sets_match:true,synthetic:false},notes:['不复权股票收盘价；基金公布单位净值已经内扣管理/托管费，不能再次扣份额。','标的选择是教学样本，不代表整个可投资市场，不声称消除了幸存者偏差。','基金申购状态来自历史接口，保留每日开闭状态；需与基金公告进一步核对。','基金未来净值不得提前显示；界面应明确委托执行时点。']},corporate_actions:[{symbol:'600036',report_date:'2019-12-31',record_date:corp.EQUITY_RECORD_DATE.slice(0,10),ex_dividend_date:corp.EX_DIVIDEND_DATE.slice(0,10),cash_per_10_shares:corp.PRETAX_BONUS_RMB,notice_date:corp.NOTICE_DATE.slice(0,10),inside_replay_window:false,source:logFor('stock-600036-dividend-2019').url}],rows:[...stockRows,...fundRows].sort((a,b)=>a.date.localeCompare(b.date)||a.asset_id.localeCompare(b.asset_id))};
const bankFile=path.join(root,'boc-deposit-20151024.html');
if(fs.existsSync(bankFile)){
 const bankText=fs.readFileSync(bankFile,'utf8').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 if(!/活期存款.{0,100}0\.30/.test(bankText)||!/一年.{0,100}1\.75/.test(bankText))throw new Error('BOC table validation failed');
 const source=JSON.parse(fs.readFileSync(path.join(root,'fetch-bank-bond-results.json'),'utf8')).find(x=>x.id==='boc-deposit-20151024');
 candidate.rows.push(record('bank','BOC_DEMAND_CNY','中国银行活期存款','2020-01-02',{rate_annualized:0.003,rate_effective_from:'2015-10-24',rate_type:'人民币活期存款挂牌利率'},source));
 candidate.metadata.source='东方财富公开历史行情/净值接口；中国银行历史挂牌利率表；本地个人学习';
 candidate.metadata.data_quality.bank_effective_records=1;
 candidate.bank_rate_table={bank:'中国银行',original_effective_from:'2015-10-24',observed_next_published_change:'2022-09-15',source:source.url,demand:0.003,term_3m:0.0135,term_6m:0.0155,term_1y:0.0175,term_2y:0.0225,term_3y:0.0275,term_5y:0.0275,recurring_1y:0.0135,recurring_3y:0.0155,recurring_5y:0.0155};
 candidate.metadata.notes.push('中国银行活期挂牌利率0.30%自2015-10-24生效；历史栏目下一次列示变更为2022-09-15，本次2020H1保持同一挂牌利率，不虚构利率变化。定期/零存整取利率仅作为产品资料，不套用到可随时支取的活期账户。');
}
fs.writeFileSync(path.join(root,'free-history-candidate.json'),JSON.stringify(candidate,null,2));
const headers=['date','asset_id','symbol','name','close','nav','rate_annualized','open','high','low','subscription_status','redemption_status','source','license_status','retrieved_at','timezone','snapshot_id'];const csvCell=v=>`"${String(v??'').replace(/"/g,'""')}"`;fs.writeFileSync(path.join(root,'free-history-candidate.csv'),'\uFEFF'+headers.join(',')+'\n'+candidate.rows.map(r=>headers.map(h=>csvCell(r[h])).join(',')).join('\n')+'\n');
const rawFiles=['stock-600036-2020h1.json','stock-600036-dividend-2019.json',...Array.from({length:6},(_,i)=>`fund-005827-2020h1-p${i+1}.json`),...(fs.existsSync(bankFile)?['boc-deposit-20151024.html','boc-deposit-archive-full.html']:[])];
fs.writeFileSync(path.join(root,'free-history-integrity.json'),JSON.stringify({snapshot_id:candidate.snapshot_id,created_at:new Date().toISOString(),files:rawFiles.map(file=>({file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')})),summary:candidate.metadata.data_quality},null,2));
console.log(JSON.stringify({rows:candidate.rows.length,period:candidate.metadata.period,stock_first:stockRows[0].close,stock_last:stockRows.at(-1).close,fund_first:fundRows[0].nav,fund_last:fundRows.at(-1).nav,fund_suspended_dates:fundRows.filter(r=>r.subscription_status!=='开放申购').map(r=>r.date),dividend:candidate.corporate_actions[0]},null,2));
