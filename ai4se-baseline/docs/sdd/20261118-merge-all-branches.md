# 全分支合并 main 记录（2026-11-18）

- **执行口径：** 用户 2026-11-18 指示「把所有分支的内容都合并到 main 中，解决冲突」；E2E 按用户当次指示不做（顺延口径见 §5）。
- **结果：** 全部远端分支 `0 ahead`（growth-level / refine-service-close / add-travel-finance / add-report-credit-deduction / add-route-completion / refine-publish-route-map），`origin/main` 亦并入本地 main。

## 1. 合并提交链（本地 main）

| 提交 | 内容 |
|---|---|
| `d0f1f3f3` | 在途 merge（chore/sdd-gates-and-e2e-sharding）冲突解决后提交（OpenApiTest 取 CONTRACT_VERSION 常量侧） |
| `4bd390c3` | Merge `origin/feature/add-growth-level`（第一轮，15 ahead；OpenApiTest 6 块冲突全取常量侧，0.30.0） |
| `337e377e` | Merge `origin/feature/refine-service-close`（10 个冲突文件；编号顺延 REQ-034 / S35 / V36；通知钩子语义修复见 §3） |
| `5a6e9a58` | Merge `origin/feature/add-growth-level`（第二轮：并发会话推送第五次顺延 V35 / 0.31.0 + growthSupport 学生认证 E2E 适配） |
| `32807965` | Merge `origin/main`（并发会话两个 fix：growth 徽标宽度 hug content、学生重新认证后学校 / 时间展示） |

## 2. 编号顺延裁决（@rule:id-allocation「后到者顺延、只改后到者自己的工件」）

- **refine-service-close（后到）：** 起草 REQ-028 / S29 / V30 / 0.25.0 被 `add-travel-finance` 等占用 → **REQ-034 / S35 / V36**；change id 不变；契约并入 main（合并时 0.30.0，后随 growth 第五次顺延升版 **0.31.0**）。`git mv` 迁移与 intents / requirements 文件 + 活跃文档改号；proposal 加顺延 banner；已签过程工件保留历史快照。
- **add-growth-level：** 迁移 V34 被 `V34__student_verification.sql` 先占 → **V35**（第一轮）；并发会话在分支侧完成第五次顺延 **0.31.0**（V34 / 0.30.0 被 student-verification 占用），第二轮合并采纳；活跃文档（registry / handoff / deep-dive / impact-brief / stories / sdd-README）统一同步 0.31.0 口径。
- **契约不重复升版：** service-close 端点并入既有 yaml，随 growth 第五次顺延落定 0.31.0；`OpenApiTest.CONTRACT_VERSION` 与 `openapi.yaml info.version` 单点一致。

## 3. 关键冲突裁决

- **版本断言：** OpenApiTest 各冲突块一律取 `CONTRACT_VERSION` 常量侧（最终 0.31.0）。
- **openapi.yaml：** 取并集——service-close 新状态机（用户 close + 管理端 resolve、删管理端 close）+ growth / student-verification 既有内容；版本取更高 minor。
- **types.ts：** 并集（HEAD `ReportViolationType` + 分支含 `RESOLVED` 的四态 `ServiceSessionStatus`）。
- **admin.spec.ts：** 取分支新流程（标记处理完成 → 待用户确认 → 用户 close）。
- **ExperienceServiceImpl：** 构造参数顺序冲突取 HEAD 侧（功能等价）。
- **通知钩子语义错位（auto-merge 未报冲突但编译失败）：** main 的 `notifyServiceClosed` 原挂在旧 `close(admin)`，auto-merge 落进分支 `resolve`（标记完成≠结束）。修复：钩子移至 `closeByUser`（用户结束才通知）；`NotificationHookTest` 改走 join → reply → resolve → closeByUser，三事件断言不变。
- **e2e 脚手架 / .gitignore：** 保留 HEAD 的 VITE_CLI 直启改进与本地报告忽略项（growth tip 侧为旧版，未回退）。
- **文档冲突：** registry / sdd-README / handoff / stories 取并集（growth 第五次顺延行 + REQ-034 条目）；deep-dive / impact-brief 取 theirs 新号段。

## 4. 合并后重验（E2E 除外）

| 门禁 | 结果 |
|---|---|
| 后端 `mvnw -B -ntp verify` | **780 / 780**（0 Failure / 0 Error；日志 `verify-merge-sc2.log`、`verify-merge-g2.log`） |
| 前端 `npm test` | **572 / 572（65 文件）**（含最后一轮 origin/main fix 并入后复验） |
| 前端 `npm run build` | 通过（1682 modules） |
| 编号 lint `check-id-collisions.mjs` | **PASS**（REQ max=034 / S max=35 / Flyway max=V36 / 契约 0.31.0；3 条基线豁免 REQ-018 / REQ-023） |
| OpenSpec strict gate | **44 pass / 1 baseline / 0 new**（baseline = add-admin-console 500 字符 WARNING，既有登记） |
| Redocly `lint:contract` | **0 error / 28 warning**（warning 数随新端点增加，按基线口径记录） |

## 5. E2E 顺延口径

按用户 2026-11-18「先不要做 E2E 了」指示，本轮合并不跑 E2E。已知衔接点：`admin.spec.ts` / `customer-service.spec.ts` 已随分支改为新状态机流程；`growthSupport.ts` 已含注册即置 `student_verified=1` 的适配（growth 分支侧带来）。E2E 复跑与债务归因（`e2e-debt-diff.mjs` / known-failures 基线）留待用户指示。

## 6. 并发会话边界

- 未暂存 WIP（`e2e-shard.mjs` / `e2e-stack.mjs` / `e2e-db.mjs` / knowledge 文档 / sdd-e2e-debt-baseline SKILL / e2e/README.md 等）全程未动、未纳入任何合并提交。
- 并发会话推送的 origin/main fix 与 growth 第五次顺延均已并入（§1），push 前以 fetch + ahead-behind 复核全分支 0 ahead。

## 7. 分支清理（2026-11-18，用户指示「合并完了就清理掉」）

- 删除前逐个 `git merge-base --is-ancestor origin/<feature> main` 确认 6 个分支均为 main 祖先：add-growth-level / add-report-credit-deduction / add-route-completion / add-travel-finance / refine-publish-route-map / refine-service-close。
- `git push origin --delete` 六个远端分支全部删除，`fetch --prune` 后远端仅剩 `origin/main`。
- 本地仅剩 `main`；`git worktree list` 仅主工作区，无 `.worktrees` 残留；上级目录无孤儿 worktree 拷贝。