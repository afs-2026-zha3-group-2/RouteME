# Tasks review — add-realtime-notifications

- **Verdict: Pass — 已批准**（BLOCKER 0 / WARNING 0 / SUGGESTION 3（1 关闭、2 记录）；四个签署位已签）
- **Scope：** `openspec/changes/add-realtime-notifications/tasks.md`（T1–T14），以及与 `design.md`、`atdd-design.md`、Delta Spec、`proposal.md` 的一致性
- **Inputs：** Delta Spec（6 / 26）、`design.md`（§1–§10）、`atdd-design.md`（S23-1 ~ S23-26、D1–D12 + D10b、U / S / B / F / M / V 用例）、`proposal.md`（D1–D14）、`docs/reviews/20261117-add-realtime-notifications-design-review.md`（已签）
- **Timestamp：** 2026-11-17T17:16+0800
- **Reviewer：** AI agent（Code Mode）；批准由具名人员按签署矩阵完成
- **阶段：** P3（`tasks.md` 工件）；本报告是 `@rule:artifact-review-gate` 的任务评审，不是 G2

## 1. 结论

任务把设计拆成 14 个可执行、可验证的切片，顺序与 ATDD 的 Red / Green 顺序一致：契约（T1）→ 迁移（T2）→ 纯函数（T3）→ 服务（T4）→ 三个生产方（T5）→ 失败隔离与自消息（T6）→ 流服务与接口（T7）→ 前端纯函数（T8）→ 叶子模块迁移（T9）→ 壳层（T10）→ 聊天整合（T11）→ E2E（T12）→ 文档（T13）→ 回归与走查（T14）。每条任务都标了 Requirement、落点、依赖、ATDD 用例与验证命令；26 条场景全部有 Design、Task 与至少一个自动化验收层，没有静默扩张。

任务的粒度也经得起检查：T1 只改契约与契约测试，T2 只建表与实体，T3 只写文案与枚举，T4 把「写入 / 列表 / 计数 / 三种标读」留在同一个服务内（它们共享同一张表与同一套计数规则），T6 单独承担「失败不回滚」，T9 把 `formatChatTime` 迁移独立成一片以便先跑基线再迁移。没有把实现细节藏进 E2E 任务。

## 2. Findings

| id | Severity | Location | Issue | Fix | Owner | 状态 |
|---|---|---|---|---|---|---|
| S-01 | SUGGESTION | `tasks.md` T13 | 原先把 `registry.md` 的 P4 状态更新放在 T13（T14 之前），会在回归尚未通过时就把需求标成 P4 | 已改为「T14 通过后更新」 | Karena | 已关闭（本修订） |
| S-02 | SUGGESTION | `tasks.md` T14 | 回归与人工走查合成一条，失败时不容易区分「自动化回归」与「视觉 / 断网走查」 | P4 报告分两小节记录：自动化结果与 V1–V4 走查；任务本身不拆，避免清单膨胀 | Karena | 记录（P4 执行） |
| S-03 | SUGGESTION | `tasks.md` §2 C4 / C6 | E2E 命令假设 5173 前端与 8080 后端已启动；新环境直接跑会失败 | P4 报告记录启动命令与端口，沿用 `ROUTEME_E2E_BASE_URL` 覆盖方式 | Karena | 记录（P4 执行） |

## 3. 覆盖与映射

| Requirement | 任务 | ATDD 用例 |
|---|---|---|
| R1 申请与裁决产生持久化通知 | T1 / T2 / T3 / T4 / T5 / T6 / T12 | S1–S4、S12、S23-26、M1 / M2 / M9 |
| R2 聊天消息产生通知 | T1 / T3 / T4 / T5 / T6 / T12 | S5、S6、S12、S23-5、M3 / M8 |
| R3 未读计数与通知列表 | T1 / T2 / T4 / T8 / T12 | S7–S11、B1–B5、M4 / M5 / M7 |
| R4 实时投递 | T7 / T10 / T12 | S13、B6 / B7、M1 / M3 / M7 / M9 |
| R5 标读范围 | T4 / T8 / T11 / T12 | S7–S10、B2–B5、M5 / M6 |
| R6 壳层指示与直达 | T8 / T9 / T10 / T11 / T12 / T14 | F5–F7、M1–M6 / M8 / M10、V1 |

- **场景覆盖：** §3 表 26 行与 REQ-023 §4 的 S23-1 ~ S23-26 一一对应；每行都有 Design 章节、Task 与 ATDD 用例。
- **分层覆盖：** U（T3）、S（T4–T7）、B（T1 / T4 / T7）、F（T8）、M（T12）、V（T14）无缺层。
- **依赖顺序：** `T1 → T2 → T3 → T4 → T5 → T6 → T7`（后端），`T8 → T9 → T10 → T11 → T12`（前端与 E2E），`T13 / T14` 收口；没有反向依赖。
- **契约先行：** T1 先于 T2–T12；T2 的 `V24` 与 T1 的 0.18.0 在开工前复检排他（§3 自检已写明）。
- **签署确认项：** T10 的铃铛保持 **click 展开**，与设计签署时确认一致，不引入 hover 分支。

## 4. 逐维核对

| 维度 | 结论 | 证据 |
|---|---|---|
| `spec-first` | Pass | T1 在实现前落契约；T2–T12 都依赖 T1 的 schema |
| `tdd-cycle` | Pass | 每个切片在验收列写明 ATDD 用例；§1 表头要求「先 Red 再 Green」；T9 用既有 4 条断言作迁移守护 |
| `api-contract` | Pass | T1 明确 4 路径、6 个 schema、两处版本断言、`NOTIFICATION_NOT_FOUND` 与 `maxItems=50` |
| `package-structure` | Pass | 任务落点与设计 §2 的包表一致；`utils` 只放无状态文案与时间格式 |
| `no-circular-dependency` | Pass | T9 把 `formatChatTime` 移到叶子 `utils/`，并列出 4 处 import；T8 / T10 只依赖 `utils` |
| `java-patterns` | Pass | T2 的 mapper 无自定义 SQL；T4 复用 `nextId()`；T6 只加日志与捕获，不加新异常层级 |
| `web-coding-style` | Pass | T8 纯函数、T10 / T11 组件与样式分离；T10 明暗样式复用既有变量 |
| `security-baseline` | Pass | T4 的三种标读都按 `recipient_id` 限定；T7 的流按用户分桶；T1 的 404 不暴露他人通知 |
| `java-testing` / `web-testing` | Pass | T2 双引擎迁移；T4–T7 服务 / MockMvc；T8 纯函数；T12 Playwright 双上下文；无 DOM 单测承诺 |
| `document-conventions` | Pass | 任务表、命令表、追溯表结构一致；引用 change-id 与路径；无绝对路径 |
| `sdd-artifacts` | Pass | `tasks.md` 位于 change 目录；未提前改生产代码；registry 更新放在回归之后 |
| 可执行性 | Pass | 每条任务有落点、依赖、验收与命令；命令均对应仓库现有脚本（`mvnw.cmd`、`npm run typecheck` / `test` / `build`、Playwright） |

## 5. 证据（真实输出摘要）

| 检查 | 输出 |
|---|---|
| `openspec validate add-realtime-notifications --strict` | `Change 'add-realtime-notifications' is valid` |
| 任务数 | `T1`–`T14` 共 14 行（§1） |
| 场景行 | 26 行（§3），与 Delta 26 条、ATDD 26 行一致 |
| 执行清单 | 14 条 `- [ ]`，与任务表一一对应 |
| 验证脚本存在 | `frontend/package.json` 有 `typecheck` / `test` / `build`；`e2e/playwright.config.ts` 存在；`backend/mvnw.cmd` 存在 |
| 文档落点存在 | `docs/knowledge/interfaces/README.md`、`docs/knowledge/_LOG.md`、`requirement-workspace/registry.md` 均存在 |
| 范围扫描 | 任务与自检中未出现通知历史页、筛选、偏好、清理、WebSocket、消息队列、邮件 / OS 推送的实现项 |
| 代码变更 | 本阶段仅新增 `tasks.md`；`git status` 无生产代码或 `openapi.yaml` 改动 |

## 6. 残余风险

| # | 风险 | 处理 |
|---|---|---|
| R-1 | 契约 0.18.0 / `V24` 在 P4 开工前被其它 change 占用 | T1 / §3 自检要求开工前复检；冲突时顺延并同步设计与本表 |
| R-2 | SSE 在代理后不达 3 秒 | T7 固定响应头，T12 记录 T0 / T1 并断言 3000 ms；失败保留 trace |
| R-3 | 50 条上限导致分会话徽标少计 | 已在设计 R-6 接受；总徽标以服务端计数为准，不扩范围 |
| R-4 | 在途快照复活已读计数 | T8 的 `seq` 护栏 + F1 / M5 断言 |
| R-5 | `formatChatTime` 迁移影响既有聊天 / 管理页 | T9 先跑基线、迁移后再跑；4 条断言逐字不改 |
| R-6 | E2E 依赖现场数据与双上下文 | T12 全部经 API 建数据，断言相对计数；不依赖种子行号 |
| R-7 | 全量 E2E 受 AMap 外部依赖影响 | 与既有基线对比判定；地图失败不计入本 change 的通过条件，报告单独记录 |

## 7. 签署记录

按 `@rule:artifact-review-gate`：`tasks.md` 需当前开发者 + 1 名非当前开发者且非 WAYNE 的成员；本报告需 WAYNE + 当前开发者。四个签署位均已批准，P3 工件门禁通过，可进入 P4。

| 对象 | 签署位 | 批准人 | 批准时间 | 结论 |
|---|---|---|---|---|
| `openspec/changes/add-realtime-notifications/tasks.md` | 1 | Karena | 2026-11-17T17:17+0800 | 批准 |
| `openspec/changes/add-realtime-notifications/tasks.md` | 2 | Jay | 2026-11-17T17:17+0800 | 批准 |
| `docs/reviews/20261117-add-realtime-notifications-tasks-review.md` | 1 | WAYNE | 2026-11-17T17:17+0800 | 批准 |
| `docs/reviews/20261117-add-realtime-notifications-tasks-review.md` | 2 | Karena | 2026-11-17T17:17+0800 | 批准 |

- 签署时确认：T1 契约先行（`openapi.yaml` 0.18.0 + 4 路径 / 6 schema），T2 的 `V24` 与 T1 次版本号在开工前再各 `grep` 一次排他性。
- 签署时确认：T10 的铃铛保持 **click 展开**，不引入 hover 分支。

## 8. 下一步（非门禁建议）

1. 四个签署位已收齐（上表）；`tasks.md` 的第二签署人为 Jay，满足「非当前开发者且非 WAYNE」。
2. 进入 P4：按 T1 → T14 顺序执行，每个 Red 先失败再实现；T13 的 registry 更新放在 T14 通过之后。
3. P4 完成后写 `docs/sdd/add-realtime-notifications/p4-implementation.md`（或等价阶段记录），附后端 / 前端 / E2E 的原始输出与 1440 / 768 / 390 × 明暗走查结论。