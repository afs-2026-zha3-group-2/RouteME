# RouteME E2E

Playwright 端到端用例。全量约 190 条、串行实测约 9 分钟；下面的工具把常见场景压到 1–3 分钟。

## 日常命令

| 场景 | 命令 | 说明 |
|---|---|---|
| 快速门禁 | `npm run test:smoke` | 15 条核心闭环，清单在 [smoke.json](smoke.json)；**自带隔离环境**（独立后端/Vite/干净库），实测 76 s 全绿 |
| 只跑改动波及的 | `npm run test:changed` | Playwright `--only-changed=origin/main` |
| 只跑上轮失败 | `npm run test:last-failed` | Playwright `--last-failed` |
| 全量（分片） | `npm run test:shards` | 3 分片 × 独立后端 + Vite + 数据库 |
| 全量（单环境） | `npm run test:full` | 需要自己先起后端与前端；等价 `npx playwright test` |

smoke 默认不碰你正在跑的开发服务器：`npm run test:smoke` 会自己拉一套环境（新库 + 8081/5174）。
想复用手上的环境（例如调试单个用例）用 `--base-url`：

```powershell
node ../../scripts/e2e-smoke.mjs --base-url http://127.0.0.1:5173
```

> 复用开发环境前先确认它跑的是当前代码。2026-11-18 实测过一次：8080 上还是合并前的旧构建，smoke 全红——那种红不说明代码坏，只说明环境旧。

`ROUTEME_E2E_BASE_URL` 指向前端（默认 `http://localhost:5173`），`ROUTEME_E2E_API_BASE` / `ROUTEME_E2E_DB` 供直接调 API 或写库的用例使用。

## 为什么不是 `workers > 1`

单后端 + 单 SQLite 下提高 workers 会互相踩：

- `credit-learning.spec.ts` 直接写 SQLite；
- 多条 spec 会改动种子用户 1–4（信用、账号状态）；
- 种子行程被挤出首页第一页会让列表断言失败。

所以并行只做在**分片**层面：按文件切分，每片一套独立环境。手动开 `workers` 时请同时给每片独立库（`SPRING_DATASOURCE_URL`）。

## 数据库

全量前必须是干净库，否则累积行程把种子卡片挤出第一页。不要每轮删库重放 Flyway，用模板：

```powershell
# 一次性：把空库迁到最新版本，产出 SqlLite/routeme.template.db
node ../../scripts/e2e-db.mjs build

# 每次：秒级复制出一份干净库
node ../../scripts/e2e-db.mjs reset --name mycase
```

迁移有新增时模板会过期（后端启动即报 Flyway 校验失败），重新 `build` 即可。

## 分片

```powershell
node ../../scripts/e2e-shard.mjs                                  # 3 分片，最多 3 套并行
node ../../scripts/e2e-shard.mjs --shards 6 --parallel 2          # 6 分片，同时跑 2 个
node ../../scripts/e2e-shard.mjs --shards 1 --json-dir .tmp-e2e   # 单环境 + JSON 报告
node ../../scripts/e2e-shard.mjs --dry-run                        # 只打印端口与库路径
node ../../scripts/e2e-shard.mjs --skip-build                     # 复用已编译的类
node ../../scripts/e2e-shard.mjs -- --grep "@smoke"               # `--` 之后透传给 Playwright
```

- 后端端口从 `8081` 起、前端从 `5174` 起，第 N 片依次 +N-1；数据库为 `SqlLite/e2e-<runId>-s<N>.db`；日志与上传目录在 `.tmp-e2e/<runId>/shard<N>/`（已 gitignore）。
- 构建只做一次：启动分片前统一 `mvnw -Pdev-run compile` 并生成 `target-run/classpath.txt`，各分片用 `java -cp` 启动，避免 N 个 Maven 争抢同一 `target-run/`。
- 结束后自动停进程并删除临时库；`--keep` 保留现场，`Ctrl+C` 会尽量停掉所有已启动的进程。

## 失败归因

`known-failures.json` 分三档：

- `entries`：**已归因的既有红**，报告里直接引用理由，不重复排查；
- `skipped`：已改 `test.fixme` 的死用例（例如依赖已删除 `.mine-profile-card` 的两条 profile 用例），不再计入失败也不烧 30s 超时；
- `pending`：**观察到的红但还没定根因**。允许记录事实，但不参与「已知债务」豁免，避免把未查清的红当成债务吞掉。

```powershell
cd ai4se-baseline/RouteME/e2e
npx playwright test --reporter=json > ../../e2e-report.json
node ../../scripts/e2e-debt-diff.mjs --root ../.. --report ../../e2e-report.json
```

输出：`passed=N failed=N skipped=N (baseline=N new=N)`，并把失败分成 `BASELINE`（引用理由）、`NEW`（本次引入，必须修）、`RESOLVED`（建议销账）。报告里写 `passed / failed (N baseline / M new)`，`M > 0` 不能报干净。