# 历史回放数据字典（首版草案）

首版先支持中国内地人民币资产。所有数据都要带来源、日期和版本，导入前通过交易日缺口、重复记录、异常价格和单位检查。

## instrument_master

| 字段 | 含义 |
|---|---|
| `instrument_id` | 应用内稳定 ID |
| `symbol` | 市场代码或产品代码 |
| `name` | 展示名称 |
| `asset_type` | `bank`、`stock`、`fund`、`bond`、`shop`、`startup` |
| `currency` | 币种，首版为 CNY |
| `lot_size` | 最小交易单位 |
| `listed_from` / `listed_to` | 可交易起止日期 |
| `source` / `license_status` | 数据来源和授权状态；授权说明可放在 `license_note` |

## daily_market

| 字段 | 含义 |
|---|---|
| `trade_date` | 交易日或估值日 |
| `instrument_id` | 对应标的 |
| `open` / `high` / `low` / `close` | 日行情 |
| `volume` | 成交量（如有） |
| `nav` | 基金单位净值（基金使用） |
| `rate_annualized` | 存款或收益率基准（银行/债券使用） |
| `is_trading_day` | 当日是否可交易 |
| `data_snapshot_id` | 可复现的数据快照版本 |

## snapshot_manifest

每次导入还应记录：

| 字段 | 含义 |
|---|---|
| `snapshot_id` | 数据包稳定版本号 |
| `license_status` | `authorized`、`public_pending_review` 或 `demo` |
| `source` | 数据提供方和原始文件说明 |
| `retrieved_at` | 文件取得时间（带时区） |
| `license_note` | 许可或用户授权范围的文字说明（不参与交易计算） |
| `row_count` / `accepted_count` | 原始行数与通过日期/数值检查的行数 |
| `warnings` | 日期缺口、未映射标的、重复行和单位问题 |

## corporate_actions

记录分红、拆股、送转、配股、基金分红、国债付息和到期兑付。模拟引擎使用原始价格和公司行动分别结算，避免把复权价格误当成交价格。

## rule_versions

记录交易单位、T+1、涨跌停、费用、税费、申赎确认、银行利率生效日期和国债付息规则。规则必须带 `effective_from` 与 `effective_to`，不能假设所有年份的规则相同。

国债记录还应包含 `face_value`、`coupon_rate`、`issue_date`、`maturity_date`、`coupon_frequency`、`next_coupon_date` 和 `accrued_interest_method`；银行记录 `rate_type`、`interest_method`、`withdrawal_rule` 与利率生效日期。当前演示字段均标记为待核验。

## entrepreneurship_scenarios

创业项目不直接伪装成证券行情，而是记录：初始投入、固定成本、可变成本、收入分布、税费、融资轮次、失败概率、里程碑、退出估值和现金流日期。结果应标注为情景模拟。

创业公司还应记录 `company_cash`、`monthly_burn`、`runway_months`、`financing_raised`、`cap_table`、`dilution_events`、`milestones` 和 `exit_window`，避免只用一条估值曲线代替融资与经营过程。

## 回放引擎约束

每次回放保存 `replay_id`、`data_snapshot_id`、`rule_version`、初始资金和确定性随机种子。订单只能使用当时已经公开的信息，结算顺序为：交易日判断 → 订单执行 → 收盘/NAV → 费用税费 → 利息分红 → 组合净值和学习解释。
