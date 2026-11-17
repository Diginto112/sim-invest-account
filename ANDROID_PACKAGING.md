# Android 封装说明

当前目录已经按 Capacitor 的入口准备好，且已生成 `android/` 原生工程：`package.json`、`package-lock.json`、`capacitor.config.ts`、`scripts/prepare-capacitor.cjs` 和可离线运行的 PWA 文件都在同一目录。

从 GitHub 下载或克隆后，先安装 Node.js 18+（建议仍受支持的 LTS 版本）、npm 9+、JDK 17，以及 Android SDK Platform 34 和 Build Tools 34.0.0。配置 `JAVA_HOME` 指向 JDK，`ANDROID_HOME` 指向 SDK（或在不提交的 `android/local.properties` 中配置 `sdk.dir`）。通过 Android Studio 的 SDK Manager 或官方 `sdkmanager` 安装组件，并由使用者阅读和接受 Android SDK 许可；本仓库不包含 SDK、JDK 或许可接受记录。

在 Windows 的项目根目录执行以下命令。首次构建需要网络下载 npm 和 Gradle 依赖：

```powershell
npm ci
npm run android:build:debug
```

生成的调试 APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`。手机安装后，应用仍然只使用本地模拟账户和用户导入的数据，不连接真实银行或券商。

调试 APK 使用 Gradle 自动生成的调试密钥，不需要用户提供签名配置。正式发布版本才需要独立签名密钥、隐私政策和数据许可说明。

原生工程的包名为 `com.siminvest.account`，调试构建入口是 `android/gradlew.bat assembleDebug`。

2026-11-14 的后续构建已解决 Java/Gradle 缺失：免费 Azul Zulu JDK 17.0.21、Gradle 8.2.1 和 Android 命令行工具已下载到工作区 `../../work/android-toolchain/`，未修改系统 PATH。JDK 与 Gradle 的 SHA256 分别与供应商元数据和官方校验文件一致。使用该本地工具链执行 `gradle --no-daemon help` 已 `BUILD SUCCESSFUL`。

用户已于 2026-11-14 在当前会话明确同意 [Android SDK License Agreement](https://developer.android.com/studio/terms)。API 34 平台、Build Tools 34.0.0 与 Platform Tools 已从 Google 官方仓库下载并核对官方 XML 中的 SHA1；许可接受记录仅写在本工作区工具链目录。Android API 34 基准平台与扩展平台在旧版仓库 XML 中可能共用包路径，本次按基准平台名称选择 `platform-34-ext7_r03.zip`，避免误用扩展平台。

下面的 `../../work/android-toolchain` 仅是本次工作区布局示例，不是克隆仓库后自动存在的目录。若自行准备同样的 `jdk/`、`sdk/` 和 `gradle/gradle-8.2.1/` 布局，请将 `$toolchainPath` 替换为实际工具链绝对路径。其他电脑需要先由使用者确认许可，再执行以下交互式安装（工具会显示协议并要求回答）：

```powershell
$toolchainPath = (Resolve-Path '../../work/android-toolchain').Path
$env:JAVA_HOME = Join-Path $toolchainPath 'jdk'
& (Join-Path $toolchainPath 'sdk/cmdline-tools/latest/bin/sdkmanager.bat') "--sdk_root=$toolchainPath/sdk" 'platforms;android-34' 'build-tools;34.0.0'
```

安装完成后，以工作区内的独立缓存构建；脚本会在退出时恢复进程环境，不会自动接受任何协议：

```powershell
./scripts/build-android-local.ps1 -ToolchainRoot $toolchainPath
```

工具链和缓存不属于应用源码，也不应放进源码交付 ZIP。其他电脑仍可使用第一节的标准 JDK/SDK 安装方式。

本次最终构建结果：`BUILD SUCCESSFUL`（82 个任务）。APK 位于 `android/app/build/outputs/apk/debug/app-debug.apk`，包名 `com.siminvest.account`，`versionCode=32`、`versionName=0.2.0`，支持 Android 5.1（API 22）及以上，目标 API 34。原生 AccountExport 插件已参与 Java 编译，可通过系统文件选择器保存账户 JSON，无需存储权限。

已使用 `apksigner` 验证 APK 的 v1/v2 签名，并使用 `aapt` 检查包名、版本与启动 Activity。APK 中的 15 个 Web 资源与当前 `web/` 目录的 SHA256 完全一致。可重复执行：

```powershell
./scripts/verify-android-apk.ps1 -ToolchainRoot $toolchainPath
```

本次 APK 的 SHA256：`419E42FB581381F1EC23AFF3309A12B44AE63B7F4F4FA137DF9CEDDA48433AF3`。当前没有连接 Android 真机或模拟器，因此尚未进行设备安装、系统文件选择器与生命周期实测；构建和包内资源校验已经完成。
