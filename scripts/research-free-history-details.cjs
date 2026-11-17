const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..','data','research');
const sources=[
 {id:'boc-deposit-archive',url:'https://www.boc.cn/finadata/lilv/fd31/',file:'boc-deposit-archive.html'},
 {id:'mof-treasury-office',url:'https://gks.mof.gov.cn/',file:'mof-treasury-office.html'},
 {id:'fund-005827-overview',url:'https://fundf10.eastmoney.com/jbgk_005827.html',file:'fund-005827-overview.html'},
 {id:'fund-005827-dividends',url:'https://fundf10.eastmoney.com/fhsp_005827.html',file:'fund-005827-dividends.html'},
 {id:'fund-005827-fees',url:'https://fundf10.eastmoney.com/jjfl_005827.html',file:'fund-005827-fees.html'},
 {id:'baostock-disclaimer-content',url:'https://www.baostock.com/articleMall/api/contract?contract_status=1&contract_type=5',file:'baostock-disclaimer-content.json'}
];
async function run(s){try{const r=await fetch(s.url,{headers:{'User-Agent':'Mozilla/5.0'},signal:AbortSignal.timeout(20000)});const body=await r.text();fs.writeFileSync(path.join(root,s.file),body);return{...s,status:r.status,bytes:Buffer.byteLength(body),retrieved_at:new Date().toISOString()}}catch(e){return{...s,error:e.cause?.code||e.message,retrieved_at:new Date().toISOString()}}}
(async()=>{const out=[];for(let i=0;i<sources.length;i+=3)out.push(...await Promise.all(sources.slice(i,i+3).map(run)));fs.writeFileSync(path.join(root,'fetch-details-results.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out.map(({id,status,bytes,error})=>({id,status,bytes,error})),null,2))})();
