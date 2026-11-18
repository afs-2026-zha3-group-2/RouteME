# tasks 评审报告 — add-ai-itinerary

- **工件：** `openspec/changes/add-ai-itinerary/tasks.md`
- **change-id：** `add-ai-itinerary`
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:tdd-cycle`、`@rule:sdd-artifacts`、`@rule:git-branching-and-pr`）
- **评审输入：** `tasks.md`、`design.md`、`atdd-design.md`、Delta Spec（9 Requirement / 41 Scenario）、`g1-decision.md` 跟踪项、`refine-my-trips/tasks.md`（格式基准）

## 评审结论

**Pass**（0 BLOCKER / 0 WARNING / 3 SUGGESTION）

T1–T8 按 tests(red) → contract → backend → frontend → verify 分解，符合 TDD 循环；41 条场景全部有任务落点（对齐自检表 + atdd E1–E41）；每个任务带验证命令与覆盖标注；T9 归档收口显式标注本次不执行；G1 跟踪项 L-01~L-05 全部映射到任务；无静默扩张（Out of scope 7 项无对应任务）。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| T-01 | SUGGESTION | `@rule:tdd-cycle` | T1 后端替身 | 替身控制器若放主源码会被生产组件扫描拾取 | 放 `src/test/java` 并用测试配置显式 `@Import`（沿用 `FixedClockTestConfig` 模式）；base-url 指向 `http://localhost:{port}` 由 `@SpringBootTest(webEnvironment=RANDOM_PORT)` 注入 | `ClockConfig` / 既有测试配置模式 |
| T-02 | SUGGESTION | `@rule:git-branching-and-pr` | T2 / T7 | `openapi.yaml` / `styles.css` / 详情页与并行会话共享，直接改易冲突 | 动手前先 `git pull --no-rebase --autostash origin main`；契约只增不改既有 schema；样式只末尾追加；提交只 stage 本 change 路径 | P2 偏离③；proposal 残余风险 |
| T-03 | SUGGESTION | `@rule:web-testing` | T8 | E2E 不在 CI（既有债务）且需 fresh SQLite，全绿证据只在本地 | verify 报告记录删库重建步骤与全量结果；Marker 分级覆盖与真实 key 档结论一并记录 | `refine-my-trips` P4 既有口径 |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| TDD 顺序 | T1 先 red（前端单测 / 后端测试 / E2E 骨架）→ T2–T7 实现转绿 → T8 全量验证 |
| 场景覆盖 | 9 Requirement / 41 Scenario 全部有任务落点；对齐自检表逐 Requirement 列出 |
| 任务可验证 | 每任务带真实仓库命令（mvnw.cmd / npm / playwright / openspec / redocly） |
| 契约门禁 | T2 `OpenApiTest` 0.12.0 + Redocly 0 error；`ai_itinerary_id` 可空不入 required |
| 安全 | T4 明确 key 只写 gitignore `ai-local.yml`；无任务要求提交真实 key |
| 阶段提交 | 头部注明分支核对 / 只 stage 本 change 路径 / push 前 merge 式 pull；P4 一阶段一提交 |
| 不归档 | T9 显式标注本次不执行；P5 不在任务范围 |
| G1 跟踪项 | L-01（T5/T7）/ L-02（T4/T7）/ L-03（T4）/ L-04（T1/T8）/ L-05（T7/T8）全收口 |

## 残余风险

- T7 体量最大（页面 + 保存闭环 + 详情接线），P4 执行时按 design 模块顺序推进，避免半成品状态提交。
- 真实 key 档走查依赖上游可用性；不可用时按替身证据 + 跳过标记记录降级（proposal 残余风险口径）。
- 并行会话持续改动共享文件（T-02）。

## 批准记录

| 签署位 | 批准人 | 时间 |
|---|---|---|
| 工件 1/2（tasks.md 作者） | Jay（AO） | 2026-11-17 |
| 工件 2/2（第二签署人） | Neal（VL） | 2026-11-17 |
| 报告 1/2 | WAYNE（IO） | 2026-11-17 |
| 报告 2/2 | Jay（AO） | 2026-11-17 |

批准来源：发起人 2026-11-17 弹窗确认「批准（Jay + Neal + WAYNE）」，授权代签；与 design 评审报告同批批准（合计 10 个签署位）。