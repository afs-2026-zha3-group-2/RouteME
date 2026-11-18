# E2E 全量提速 A/B 实测报告

**Date:** 2026-11-18（UTC+08:00）
**Root:** `d:/software/training/TATP/RouteMe/RouteME`
**Commit:** `53f8c557`（三次运行期间 spec 与前端源码零差异，见 §2 对照证据）
**数据文件:** [20261118-e2e-ab-data.json](20261118-e2e-ab-data.json)

## 1. 结论

| | 优化前（A：单环境串行） | 优化后（B：3 分片） | 变化 |
|---|---|---|---|
| 全量墙钟时间 | **18.40 min**（1104 s） | **7.72 / 7.83 min**（463 / 470 s） | **快 2.37×，省 10.6 min（−58%）** |
| 通过 / 失败 / 跳过 | 189 / 18 / 10 | 208 / 7 / 2、209 / 6 / 2 | 失败减少 11–12 条 |
| 每条用例耗时之和 | 1043 s | 930 / 948 s | — |

**一句话：全量 E2E 从 18.4 分钟降到 7.7 分钟，约快 2.4 倍，每跑一次省下约 11 分钟。**

优化后仍有约 2 分钟可回收（分片负载不均，见 §5），把分片改成按耗时均衡后理论上限约 6.7 分钟（2.75×）。

## 2. 实验设计（为什么这组数字可信）

- **A 组（优化前）**：单后端 + 单 Vite + 单数据库，一个 Playwright worker 顺序跑完 31 个 spec —— 这是引入分片前团队实际的执行形态。
- **B 组（优化后）**：`e2e-shard.mjs --shards 3 --parallel 3`，三套独立环境（后端 8081/8082/8083、Vite 5174/5175/5176、各自独立 SQLite 与 uploads）。
- **同代码对照证据**：`git diff --stat 407b7db2 53f8c557 -- RouteME/e2e/tests RouteME/frontend/src` 输出为空 —— A 与 B 跑的是同一批用例、同一份前端代码，差异只来自执行方式。
- **同参数**：两组均 `E2E_TRACE=off`、`--reporter=json`、模板库（干净库）、`--skip-build`（复用已编译类）。
- **B 组跑了两次**（B1 / B2）验证稳定性：463 s 与 470 s，差 1.5%；分片耗时分布也几乎一致（432/243/255 与 439/250/260），说明该数字可复现。
- **环境**：i7-14700（28 逻辑核）/ 31.7 GB RAM / Node v24.18.0 / Playwright 1.65.0 / Windows。

## 3. 时间去哪了

| 项目 | A（串行） | B（3 分片） |
|---|---|---|
| 用例执行 | 1043 s | 930 / 948 s（三片并行） |
| 其中失败用例耗时 | **357 s** | 149 / 144 s |
| 启动开销（构建校验 + 后端 + Vite） | 61 s | ~120 s（三套环境并行启动） |
| 墙钟合计 | 1104 s | 463 / 470 s |

关键点：**串行组 357 s（约 6 分钟）花在 18 条失败用例上**，而单条失败最少烧掉 30 s 超时（`profiles.spec.ts` 的 6 条各 30 s，`customer-service [C5]` 120 s）。这部分在分片下被摊到不同 shard 并行等待，不再串行累积。

## 4. 分片还顺手消掉了一类失败

同一份代码，A 组 18 条失败、B 组 6–7 条：

- A 组独有的失败集中在 `profiles.spec.ts`（6 条，全部 30 s 超时）与 `credit.spec.ts` —— 一次长跑把约 190 条用例的数据累进同一个 SQLite，后段断言被前段写入的数据影响。
- B 组每个分片只有约 70 条用例写自己的库，数据污染显著下降，这 7 条不再失败。

因此 2.37× 里有一部分不是"跑得更并行"，而是"不再为被污染的数据付超时代价"。这一点对手工复盘很重要：只把 workers 调大而不隔离数据库，得不到这个收益。

## 5. 余量：分片不均是唯一的浪费

| | shard 1 | shard 2 | shard 3 |
|---|---|---|---|
| B1 用例耗时 | **432 s** | 243 s | 255 s |
| B2 用例耗时 | **439 s** | 250 s | 260 s |

Playwright `--shard` 按用例**数量**均分，不看耗时，所以 shard 1 承担了约 1.75 倍的工作量并成为长尾。

- 当前并行效率：理想 310 s / 实际 463 s ≈ **67%**
- 若按耗时均衡（或改用 4–5 分片）：墙钟 ≈ 310 s + 启动 ≈ **约 6.7 min（2.75×）**

## 6. 复现命令

```powershell
# 优化前形态（单环境串行）
node ai4se-baseline/scripts/e2e-shard.mjs --shards 1 --skip-build --run-id abA --json-dir ai4se-baseline/RouteME/e2e/.tmp-e2e/abA

# 优化后形态（3 分片）
node ai4se-baseline/scripts/e2e-shard.mjs --shards 3 --parallel 3 --skip-build --run-id abB --json-dir ai4se-baseline/RouteME/e2e/.tmp-e2e/abB

# 归因与统计
node ai4se-baseline/scripts/e2e-debt-diff.mjs --root . --report ai4se-baseline/RouteME/e2e/.tmp-e2e/abB/shard1.json
```

前置：`node ai4se-baseline/scripts/e2e-db.mjs build`（模板库，迁移有新增时需重建）。

## 7. 其他已实测的快车道

| 场景 | 命令 | 实测 |
|---|---|---|
| 快速门禁 | `node ai4se-baseline/scripts/e2e-smoke.mjs` | **15/15 通过，76 s**（含编译、建库、启停；默认自带隔离环境） |
| 模板库复制 | `node ai4se-baseline/scripts/e2e-db.mjs reset --name x` | **160 ms**（含 `-wal`/`-shm`，替代删库重放） |
| 只跑受影响 | `cd RouteME/e2e; npm run test:changed` | Playwright `--only-changed=origin/main` |
| 只跑上轮失败 | `cd RouteME/e2e; npm run test:last-failed` | Playwright `--last-failed` |

模板库本身的收益**不是**墙钟时间（空库重放 36 个迁移只需约 0.1 s），而是确定性与免手工：不再需要每次"备份 + 删库 + 重启后端"，也不会因累积数据让首页种子卡片被挤出第一页。

## 8. 局限与免责

1. **A 组只有一次采样**（18.4 min 成本过高）。B 组两次采样波动 1.5%，A 组若重测预计在 ±1 min 内。
2. **A 组失败数（18）高于 B 组（6–7）**，因此 2.37× 含"少付超时"的收益；若把失败集强行拉平，纯并行的收益约为 1043 s / 463 s ≈ **2.25×**，仍显著。
3. **数值依赖机器**：28 逻辑核可以同时跑 3 套 Spring Boot + 3 个 Vite 而不互相抢占；4 核机器上分片数应下调（`--shards 2 --parallel 2`），否则后端启动会互相拖慢。
4. **测量期间仓库被并行会话持续改动**（HEAD 从 `407b7db2` 走到 `53f8c557`）。已用 `git diff` 证明 spec 与前端源码未变；但 `e2e-shard.mjs` 本身在测量中修过 `--skip-build` 参数解析，A 组运行时该开关被忽略（只多做了一次"构建已最新"的 2 s 校验），不影响结论。
5. **失败归因未在本报告内完成**：B 组剩余 6–7 条失败属于产品/用例漂移，记录在 `RouteME/e2e/known-failures.json#pending`，需另开任务排查。本报告只度量"执行形态"的差异。

## 9. 对团队的结论

- 全量 E2E 的日常成本从 **18 分钟降到 8 分钟以内**，且结果更可复现（每片干净库）。
- P4 收口建议用 `npm run test:shards`；改一小块代码时用 `test:changed`；提交前用 `test:smoke`（76 s）。
- 下一步性价比最高的改进是**按耗时均衡分片**（或直接 4 分片），预计再省 1 分钟。