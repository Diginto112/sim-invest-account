# 2026-11-14 工程核对

## 诊断

工程为零前端依赖的 HTML/CSS/JavaScript PWA，Capacitor 6.2.3 提供 Android 外壳。浏览器账户可运行，Android 工程已生成；仍缺少真实快照、可靠交易生命周期和可安装 APK。此前仅凭语法、文件存在和同步检查通过，不能证明金融行为正确，后续改动须补资金/份额回归验证。

## 架构

- `index.html` 提供六个视图及订单弹窗，`app.js` 负责数据、账户、交易和渲染，`styles.css` 提供窄屏布局。
- `app.js` 的 `makeTradingDates()` 生成 2020 年上半年 117 个交易日；`marketPrice()` 优先读取本地导入记录，否则计算演示价格。
- `parseSnapshotRows()` / `importSnapshotText()` 校验并合并记录，`advanceDay()` 负责结算和快照，`localStorage` 保存账户。
- `scripts/prepare-capacitor.cjs` 同步 Web 与 Android assets，`scripts/serve.cjs` 在 127.0.0.1:4174 提供预览，Gradle 构建 Android。

## 约定与运行状态

项目不在 Git 仓库内，无可读取的提交、PR 或 issue 历史；当前及父目录未发现 AGENTS.md。使用普通函数、CNY 数值、ISO 日期和同步本地状态。已在浏览器实际打开账户首页；依赖版本由 node_modules 与 lock 文件验证。`npm run validate` 当前主要是静态检查。

## 已验证与待验证

- 已验证：117 个交易日数量、页面可打开、Web/Android 同步、Capacitor 版本。
- 已验证问题：公募导入 NAV 后不应另扣份额；原费用日期首次初始化失效；全局授权标签未覆盖逐行/逐资产状态；基金赎回引擎 T+1 与展示 T+2 不一致；数据 JSON 未加载。
- 待验证：公开免费数据的具体用途范围、下载完整性、证券公司行动、Android SDK 环境和真机行为。

## 下一步

并行准备免费历史快照和 Android 构建依赖；同时修正费用、结算与来源标签，并以独立资金/份额场景回归验证。
