# 历史数据导入格式

应用支持本地 CSV 或 JSON。导入数据只用于离线模拟，不会连接真实银行、券商或交易所。

CSV 至少包含以下列（`source`、`license_status`、`retrieved_at` 是快照元数据，建议每行重复填写，便于脱离应用后仍可追溯）：

```csv
date,asset_id,symbol,close,nav,rate_annualized,source,license_status,retrieved_at,timezone,snapshot_id
2020-01-02,stock,DEMO_STOCK,35.20,,,用户授权文件,authorized,2026-11-14,Asia/Shanghai,my-authorized-2020-h1
2020-01-02,fund,DEMO_FUND,,1.284,,用户授权文件,authorized,2026-11-14,Asia/Shanghai,my-authorized-2020-h1
2020-01-02,bond,DEMO_BOND,100.35,,,用户授权文件,authorized,2026-11-14,Asia/Shanghai,my-authorized-2020-h1
2020-01-02,bank,DEMO_BANK,,,0.015,用户授权文件,authorized,2026-11-14,Asia/Shanghai,my-authorized-2020-h1
```

仓库中的模板包含四行带数值的 `demo` 示例值，导入真实文件前请替换这些行；`demo` 状态不会显示为已授权数据。模板中的 `snapshot_id` 会随文件保留，但旧版应用会自动生成导入编号。

`asset_id` 使用 `stock`、`fund`、`bond`、`bank`、`shop` 或 `startup`。股票和国债使用 `close`，基金使用 `nav`，银行利率使用 `rate_annualized`（可填 0.032 或 3.2）。日期需要落在当前回放区间 2020-01-02 至 2020-06-30 内；银行利率生效日可以是周末，但仍会按自然日计息。

如果填写 `symbol` 和 `name`（也接受 `ticker`、`code`、`instrument_name`），应用会把导入快照中的首个标的名称和代码显示在行情、交易和持仓页面。`asset_id` 仍决定模拟规则，例如 `stock` 使用股票交易单位和 T+1。

JSON 可以使用 `rows` 数组，也可以使用按资产和日期组织的 `marketData` 对象。建议在顶层提供：

```json
{
  "snapshot_id": "my-authorized-2020-h1",
  "metadata": {
    "source": "用户授权文件",
    "license_status": "authorized",
    "retrieved_at": "2026-11-14"
  },
  "rows": [
    { "date": "2020-01-02", "asset_id": "stock", "close": 35.2 }
  ]
}
```

许可状态按每条记录及每个标的分别判断，授权别名会归一化为 authorized；demo 明确标为演示，public_pending_review 表示公开历史来源但再使用许可待核验。导入一条授权股票记录不会把其他资产改成已授权。CSV必须逐行填写元数据，JSON可以提供顶层metadata作为缺省。导入质量报告会同时列出接受/拒绝数量、来源、许可状态、获取时间，并提示缺少或格式异常的元数据。校验失败的记录会被拒绝。

回放取值按日期生效：行情在目标交易日没有记录时，会使用该标的在此前最近一条已导入记录；银行利率也按此前最近的生效记录计息。若目标日期之前没有任何导入记录，才会使用页面明确标注的演示回退值。

股票、基金和国债快照会额外检查交易日覆盖范围。缺少交易日不会直接拒绝文件，但会在“导入质量”中提示缺口，并明确说明回放会沿用前值；银行利率按生效日期处理，不要求每天重复一行。

多次导入会按 `asset_id + date` 合并，同一标的未出现在本次文件中的历史日期会保留；同一日期重复导入时，以最后一次导入的记录为准，并在质量提示中标记覆盖。

## v32补充

默认内置235条历史记录；每种资产当前只使用一个标的槽。同一asset_id中的不同证券代码不能混接。基金公布NAV视为已扣管理/托管费；subscription_status与redemption_status可保存开放/暂停状态，确认日没有精确NAV时拒单退款，不使用前值编造申赎成交。前值仅用于持仓估值，并显示实际数据日期。

银行请优先使用小数年利率，例如0.003表示0.30%；不要把定期挂牌利率导入可随时支取的活期产品。
