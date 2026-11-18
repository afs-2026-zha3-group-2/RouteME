# SDD 提效数据表（2026-11-18）

口径：全部数字为实测或有出处的历史记录；「前」= skill 落地前的实测/历史案例，「后」= 2026-11-18 实测。配套 JSON：`20261118-skill-efficiency-data.json`（可直接绘图）。文字解释见 `20261118-skill-efficiency-evidence.md`。

## A. 门禁/台账工具耗时（2026-11-18 本机实测，Measure-Command）

| 工具 | 耗时 | 产出 |
|---|---|---|
| check-id-collisions.mjs | 0.14 s | 撞号清单 + next 号（REQ-035/S36/V37/0.32.0） |
| openspec-gate.mjs | 4.85 s | 44 pass / 1 baseline / 0 new |
| sign-ledger.mjs | 0.21 s | 39 changes 签署矩阵 |
| archive-queue.mjs | 0.17 s | 39 active / 16 ready / 0 环 |
| e2e-debt-diff.mjs | 0.14 s | NEW/BASELINE/RESOLVED 三分类 |

## B. 编号返工量（git 提交实测 + 索引历史记录）

| 指标 | 数值 | 出处 |
|---|---|---|
| 单次顺延改动文件数（样本1：credit-exit REQ-024） | 23 文件 / 200 行 | git c2352b87 --stat |
| 单次顺延改动文件数（样本2：credit-exit REQ-025+契约0.20.0） | 24 文件 / 100 行 | git 464d9b80 --stat |
| 历史顺延次数：add-credit-recovery | 4 | 方案报告 §2.1 / sdd 索引 |
| 历史顺延次数：add-growth-level | 5 | sdd 索引 REQ-029/S30→033/S34 链 |
| 历史顺延次数：add-report-credit-deduction | 2 | 方案报告 §2.1 |
| 历史顺延次数：add-user-profiles | 2 | 方案报告 §2.1 |
| 历史顺延次数：add-experience-like-credit / add-admin-dashboard | 各 1 | 方案报告 §2.1 |
| 优化后新增撞号入库 | 0（CI lint 拦截；负向探针：重复 V36 → FAIL exit 1，移除 → PASS exit 0） | 2026-11-18 实测 |

## C. 合并作业（git 时间戳实测）

| 指标 | 数值 | 出处 |
|---|---|---|
| 本次全分支合并端到端窗口 | 50 分钟（16:10 d0f1f3f3 → 17:00 33443990），含 6 分支、2 轮并发追赶、语义修复、2 轮全量重验 | git log 时间戳 |
| 历史对照：admin-dashboard 单分支合并 | 「半天摸索」（8 冲突文件，无 playbook） | 方案报告 §3 S1 |
| 冲突文件数：refine-service-close | 10 | 合并记录 §1 |
| 冲突文件数：growth 第二轮 | 7 | 合并记录 §1 |
| 冲突文件数：admin-dashboard（历史） | 8 | 方案报告 §7 |
| 合并后重验 | 后端 780/780、前端 572/572 + build、openspec 44/1/0、redocly 0 error | verify-merge-*.log |
| 语义错位拦截 | 1 处（auto-merge 钩子落错方法，无冲突标记，被全量重验暴露） | 合并记录 §3 |

## D. 契约/前端热点（行数实测 + 断言计数）

| 指标 | 前 | 后 | 出处 |
|---|---|---|---|
| OpenApiTest 版本硬编码断言 | 5 处 | 1 个 CONTRACT_VERSION 常量 | 落地记录 §1-3；OpenApiTest 18/18 绿 |
| openapi.yaml 单文件行数 | 6189（报告时点） | 6874（当前；模块化拆分工具就绪待窗口） | 方案报告 §2.2；2026-11-18 实测 |
| styles.css 单文件行数 | 11608（报告时点） | 10974（当前；拆分工具就绪待窗口） | 同上 |
| types.ts | 手写 1003 行 | gen:api-types 从契约生成，tsc 0 错误 | 落地记录 §1-11 |
| CI job 数 | 2（backend/frontend） | 4（+spec-lint +e2e-smoke） | ci.yml |

## E. E2E 耗时与归因（Playwright JSON stats 实测 + 历史报告）

| 指标 | 前 | 后 | 出处 |
|---|---|---|---|
| 全量套件 wall time（A/B 同代码实测） | 18.4 min 串行（1104 s，189/18/10） | 7.7 min 3 分片（463/470 s），2.37×，每轮省约 11 min | A/B 报告（git a9f6819d）；B 双采样差 1.5% |
| 早期全量样本 | ≈9 分钟（串行，105 条样本） | 同上，规模增至 31 spec / 217 例 | e2e优化报告（引 p4-verify.md:174） |
| 核心流 smoke | 无分层，P4 跑全量 9 分钟 | 16 条用例执行 57.1 s（15 过 / 1 红） | shard1.json stats.duration=57093ms |
| 每轮建库 | 删库 + Flyway 重放 36 迁移 | 模板库复制，秒级 | git 407b7db2；e2e-db.mjs reset |
| 已知红归因 | 33 条每轮人工重新归因 | diff 0.14 s 出三分类结论 | 方案报告 §2.4；A 表实测 |
| 固定红超时损耗 | 每条跑满 30 s（20 条 ≈10 分钟纯等待） | fixme/skip 计 skipped 不计时 | e2e优化报告；e2e-debt-diff.mjs |

## F. 流程状态可见性（脚本输出实测）

| 指标 | 前 | 后 | 出处 |
|---|---|---|---|
| G2 待签可见数 | ≥8（散落索引备注，逐份翻查） | 22 / 39 changes 一次列清（0.21 s） | 方案报告 §2.3；sign-ledger.md |
| 归档就绪判定 | 人肉读 26 行表格备注 | 16 ready / 39 active / 0 环（0.17 s） | archive-queue.md |
| 分支清理误删 | 无祖先校验规程 | 6/6 祖先校验通过后删除，0 误删 | 合并记录 §7 |
| worktree 残留 | 依赖个人经验排查 | 演练移除 exit 0，残留 0 | 使用记录 sdd-worktree-ops |

## G. 测试规模（随功能增长，非 skill 直接产物，供背景）

| 栈 | 落地时（15:26） | 合并后 | 出处 |
|---|---|---|---|
| 后端 | 678/678 | 780/780 | 落地记录 §3；verify-merge-g2.log |
| 前端 | 514/514（61 文件） | 572/572（65 文件）+ build | 落地记录 §3；frontend-merge-final-test.log |

## 引用注意

1. C 表 50 分钟是 6 分支复合场景端到端窗口（含重验），不是单分支耗时；单分支目标 <30 分钟未单独实测。
2. E 表全量数字来自 A/B 同代码实测（git diff 407b7db2..53f8c557 用例与前端源码为空，B 双采样差 1.5%）；57.1 s 是 smoke 用例执行时长（不含栈启动）。
3. B 表顺延次数为存量历史；skill 的增量拦截效果以「新增撞号入库=0 + 负向探针」为准。