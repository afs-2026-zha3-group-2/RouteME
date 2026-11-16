# Tasks review — refine-trip-chat

- **Verdict: Pass**
- **Scope:** focus=full（artifact-review-gate 的 Tasks 轮次）；root=`ai4se-baseline`；timestamp=2026-11-16
- **Artifact under review:** [`tasks.md`](../../openspec/changes/refine-trip-chat/tasks.md)（T1–T12 + 依赖顺序 + 对齐自检）
- **Supporting inputs:** `design.md`（D1–D15）、`atdd-design.md`（A1–A10 / UT-1–UT-7 / E2E-1–E2E-13）、两份 Delta Spec、`g1-decision.md`
- **Evidence:**
  - 仓库命令核对：`frontend/package.json` 有 `typecheck` / `test`；`e2e/package.json` 有 `test`（`playwright test`）；**无 `lint:api` 脚本**，CI 也未运行 Redocly
  - `OpenApiTest.java` 现状：`assertEquals("0.8.0", info.get("version"))` 为强断言；申请状态只 `containsAll(pending/accepted/rejected/cancelled)`；无 `meeting_time` 与 `PUT /trips/{id}/meeting` 断言
  - `applicationLabel` 现状：`TripDetailPage.tsx` / `MyTripsPage.tsx` / `ApplicationsPage.tsx` 三处各自复制；`trips/tripStatus.ts` 只处理行程状态
  - 测试库：`backend/src/test/resources/application.properties` 使用 H2 且与运行共用 Flyway 迁移，T2 的迁移验证路径成立

## Findings

| id | severity | rule | location | issue | result |
|---|---|---|---|---|---|
| F-1 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | T10 落点 | 写「`trips/tripStatus.ts`」承载申请状态，但该文件只处理行程状态；实际 `applicationLabel` 三处副本，任务无法按落点执行 | **已修复**：T10 改为「三处本地副本改用 T7 的 `applicationStatus`」，落点列出三个页面文件 |
| F-2 | WARNING | `rules/process/rules.md#tdd-cycle` | T1 验证命令与落点 | `npm run lint:api` 在仓库中不存在（`frontend` / `e2e` 均无此脚本，CI 无 Redocly 步骤）；且未包含 `OpenApiTest.java`，其中 `0.8.0` 版本断言在契约升版后必然失败，新字段与新端点也无契约断言 | **已修复**：T1 落点补 `OpenApiTest.java`，验证命令改 `mvnw.cmd test -Dtest=OpenApiTest`（`backend/`），任务描述补「同步版本号、状态枚举、新字段与新端点断言」 |
| F-3 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | T11 / T1–T6 | T11 用 `npx playwright test` 而非仓库既有 `npm test`；后端命令未标注工作目录 | **已修复**：T11 改 `npm test`（`e2e/`），T1 标 `backend/` |
| F-4 | SUGGESTION | `rules/process/rules.md#local-verify` | T12 | 「本地验证报告」未指明产出方式，P4 门禁要求 V1–V8 | 保持 T12 描述；P4 执行时调用 `/sdd:local-verify-report`，报告落 `docs/ai4se-plugins/` |

**Counts:** BLOCKER 0 / WARNING 2（均已修复）/ SUGGESTION 2 → **Pass**（以修复后状态评审）

## 场景 → 任务覆盖（REQ-013 25/25）

| # | 场景摘要 | 任务 |
|---|---|---|
| 1 | 左栏列出全部可沟通会话（含无消息） | T5 → T8 → T11 |
| 2 | 打开指定会话并选中 | T5 → T8 → T11 |
| 3 | 无任何可沟通会话空态 | T5 → T8 → T11 |
| 4 | 未匹配用户直接访问被拒 | T4 → T8 → T11 |
| 5 | 仅 PENDING 被拒 | T4 → T8 → T11 |
| 6 | 被拒 / 取消 / 从未申请被拒 | T4 |
| 7 | 发送消息并落库 | T4 → T8 → T11 |
| 8 | 重新进入仍可见且升序 | T4 → T8 → T11 |
| 9 | 短轮询 3 秒内可见 | T7 → T8 → T11 |
| 10 | 手动刷新 | T7 → T8 → T11 |
| 11 | 空白 / 超长被拒 | T4 → T7 → T8 → T11 |
| 12 | Enter / Shift+Enter | T7 → T8 → T11 |
| 13 | 已结束只读 | T4 → T8 → T11 |
| 14 | 头部动作按身份与状态 | T7 → T8 → T11 |
| 15 | 退出后仍可沟通 | T3 → T4 → T5 → T7 → T10 → T11 |
| 16 | 无实时与富媒体 | T8 → T11 |
| 17 | 发布时填写集合信息 | T1 → T6 → T7 → T9 → T11 |
| 18 | 集合时间晚于结束日期被拒 | T1 → T6 → T7 → T11 |
| 19 | 集合信息格式非法被拒 | T1 → T6 → T7 |
| 20 | 详情展示集合信息（空值待确认） | T1 → T6 → T9 → T11 |
| 21 | 聊天安全条展示集合信息 | T1 → T6 → T8 → T11 |
| 22 | 我的旅行展示集合信息 | T1 → T6 → T10 → T11 |
| 23 | 发布者编辑集合信息 | T1 → T2 → T6 → T7 → T9 → T11 |
| 24 | 已结束不可编辑 | T6 → T9 → T11 |
| 25 | 非发布者不可编辑 | T6 → T9 |

## 对齐自检复核

| 检查 | 结论 |
|---|---|
| 每个任务只落一层 | Pass（contract / db / backend / frontend / e2e / docs；T6 虽跨多个包但全属后端层） |
| 契约任务先于两端 | Pass（T1 先于 T3–T10；T2 先于 T6） |
| 每条任务有可执行验证命令 | Pass（修复 F-2 后全部为仓库真实命令） |
| 25 条场景均有任务覆盖 | Pass（见上表） |
| 无孤儿任务 | Pass（T12 为记录类，不产生业务代码） |
| Out of scope 未进入任务 | Pass（无 WebSocket、已读回执、推送、图片、完整行程编辑、消息分页） |
| 原型改动已先行 | Pass（P3 已改 `docs/prototype/` 并通过浏览器验证） |
| 依赖顺序可行 | Pass（T1→T2→T6；T3→T4→T5；T7→T8/T9/T10；T11→T12） |

## 流程偏差（如实记录）

- `tasks.md` 先于 design 评审完成（详见 `20261116-refine-trip-chat-design-review.md` 同名小节）。
- 本次评审的 F-1 / F-2 修正已回写 `tasks.md`，`design.md` D11 同步修正，二者作为一组提请 AO 批准。

## Residual risks

- T2 用 `TripControllerTest` 间接验证 Flyway 迁移；若 V13 在 SQLite 与 H2 行为不一致，需在 P4 本地验证（SQLite 实际启动）补证据。
- `OpenApiTest` 是契约的唯一自动化门禁（CI 无 Redocly），T1 的断言质量直接决定契约漂移能否被拦截。
- 25 条场景中场景 6 / 19 / 25 无 E2E，仅由 API/UT 覆盖，属于分层取舍，不是遗漏。

## Next remediations（non-Gate）

- 与 `design-review.md` 一并提交 AO 批准，然后进入 P4。
- P4 按 T1→T12 顺序执行；每完成一层跑对应验证命令并留证据。
