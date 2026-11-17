# 回放数据

historical-snapshot.json / .js 是运行时使用的真实历史快照：600036和005827各117条、BOC活期挂牌利率1条。scripts/build-history.cjs 从 research/free-history-candidate.json 构建，并交叉核验日期集合。script标签在app.js前加载，使Android和网页首次打开即可离线回放。

source-manifest.json 逐数据集区分真实历史、公开来源许可待审、国债教学例子和经营情景。trading-calendar-2020.json 用于构建校验，运行时使用快照内日期数组。rule-versions.json 记录当前引擎的参数与简化边界。

research/ 保存原始公开响应、下载日志、摘要及生成脚本的研究输入；不复制到Web/Android运行资源。当前未取得开放再分发许可，不把公开取得当成已授权。

authorized-market-data-template.csv 的四行仍为demo格式样例。导入前替换数值、来源、许可及日期；基金用nav，股票/债券用close，银行用rate_annualized。
