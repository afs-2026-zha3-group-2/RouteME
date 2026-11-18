# Artifact review — refine-publish-route-map / tasks

- **Verdict: Pass**
- **Scope:** focus=tasks（`@rule:artifact-review-gate` 的 P3 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`tasks.md`](../../openspec/changes/refine-publish-route-map/tasks.md)
- **Supporting inputs:**
  - [`design.md`](../../openspec/changes/refine-publish-route-map/design.md)（D1–D11 + 文件清单 + 对齐自检）
  - [`atdd-design.md`](../../openspec/changes/refine-publish-route-map/atdd-design.md)（18 场景分层、Red 顺序、fixtures、Non-goal 反向验证）
  - [`specs/trip-plans/spec.md`](../../openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md)（18 Scenario）
- **Evidence:**
  - `openspec validate refine-publish-route-map --strict` → valid
  - 规则核对：`rules/process/rules.md#spec-first` 的 P3 门槛（一条任务只落一层、标注落点与验证命令）；`#tdd-cycle`；`rules/testing/rules.md#web-testing` 的提交前验证命令；`rules/documentation/rules.md#sdd-artifacts`
  - 命令与仓库脚本一致：`npm run typecheck` / `npm run build` / `npm test` / `npx playwright test` / `backend/mvnw.cmd -B -o clean test` 均为既有脚本，无新增同义脚本
  - 任务落点核实：T1–T10 `frontend`（纯逻辑 / 共享件 / 组件 / 页面 / 外壳 / 样式）、T11–T12 `e2e`、T13 `verify`、T14 `docs`；无 `backend` / `contract` 任务，与零后端 / 零契约范围一致
  - 测试名核实：纯逻辑与 E2E 用例名均为英文陈述句（`@rule:web-testing` 命名要求）

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| TK-1 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `tasks.md` T12 | 单个 E2E 任务并列 11 条新用例 + 既有 spec 重写 + 失效断言清理，粒度偏粗，完成度只能整段勾选 | 保持「一条任务一层」（E2E）；P4 验证报告按用例名逐条列结果，弥补勾选粒度 | [inference] |
| TK-2 | SUGGESTION | `rules/process/rules.md#tdd-cycle` | `tasks.md` T5 验证 | T5 的回归命令包含 `trips.spec.ts`，而该文件的途经点步骤要到 T12 才重写，中途必然红 | 任务文本已注明「先记录差异」；P4 记录时区分「共享件引入的回归」与「待重写的录入步骤」，避免误判 | [inference] |
| TK-3 | SUGGESTION | `rules/testing/rules.md#web-testing` | `tasks.md` T7 / T10 | 组件与样式拆成两条任务，但 T7 的窄屏可读性依赖 T10 的高度覆盖 | 保留拆分（层次不同）；依赖段已写明 T7 → T10；P4 在 T10 完成后再跑 #18 的视口用例 | [inference] |
| TK-4 | SUGGESTION | `rules/testing/rules.md#web-testing` | `tasks.md` T11 | 替身抽取是测试重构，既有 `ai-planner.spec.ts` 的全局名被两个 spec 共用，新增 `__amapTransferOptions` 需确认不覆盖既有 `__amapRouteCalls` 断言 | 抽取后先跑 `ai-planner.spec.ts` 并对比用例数；P4 报告记录前后结果 | [fact] |
| TK-5 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | `tasks.md` T14 | 截图任务未写「目录不存在时先建目录、索引表按目录登记一行」 | 按 `@rule:sdd-artifacts` 的 `docs/preview/` 规则执行：目录名 = change-id，索引登记目录 / 对应 REQ / 维护人 / 最近更新 | [fact] |
| TK-6 | SUGGESTION | `rules/testing/rules.md#web-testing` | `tasks.md` T13 | 零后端改动仍跑一次全量后端测试，看似重复 | 保留：需要「未误伤」证据；成本可接受，与既有 change 做法一致 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 6 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 任务不触碰后端与契约；前端落点符合 `frontend/src/{map/amap,trips,shell}` 现有分层 |
| B Quality | Pass | 任务明确「`MODE_LABELS` 零改动」「样式只追加末段、只用令牌」；组件不引入探索页专属能力 |
| C Testing | Pass | 四组纯逻辑单测、共享替身、11 条新 E2E、既有 spec 重写与回归命令齐备，与 ATDD 分层一一对应 |
| D Security | Pass | 无新增权限；占位名拦截落在表单校验，不改变服务端行为 |
| E Process | Pass | 先写红（T1–T4）→ 共享件（T5–T6）→ 发布页（T7–T10）→ 测试（T11–T12）→ 收口（T13–T14）；无跳过 Gate |
| F Documentation | Pass | 每条任务标注落点、验证命令与报告路径；引用使用选择器 / 符号而非行号 |
| G Traceability | Pass | 18 条场景全部可追溯到任务；基线「人数 / 预算」标注不改代码，由既有单测守护 |

## 对齐核对（场景 → 任务）

| Delta 场景 | 任务 |
|---|---|
| 在地图上添加途经点并看到路线 | T5 T6 T7 T11 T12 |
| 途经点顺序可调整 | T7 T12 |
| 途经点超过上限时被拦截 | T7 T12 |
| 切换出行方式重算路线 | T2 T5 T6 T7 T12 |
| 公共交通使用目的地城市规划 | T5 T7 T11 T12 |
| 路线服务不可用时按顺序直线示意 | T5 T7 T12 |
| 降级提示不暴露实现细节 | T5 T7 T8 T12 |
| 发布只提交地名与出行方式 | T3 T7 T12 |
| 坐标占位名不得进入发布 | T1 T4 T7 T12 |
| AI 预填路线进入编辑器后可编辑 | T7 T8 T12 |
| 窄屏与双主题不溢出 | T7 T10 T12 T14 |
| 基线 7 场景 | T8 T12 T13（既有用例回归） |

## Residual risks

- T7 的未定位解析依赖 `geocodePlace`；离线地名库覆盖有限，弱网下首屏等待需在 P4 观察。
- T11 抽取替身会碰一个全绿 spec；退路写在 `design.md` D10。
- `styles.css` / `tripMessages.ts` / `AppShell.tsx` 均有并行改动；P4 需先合并再落任务。
- 截图（T14）为人工证据，CI 不产出。

## Next remediations (non-Gate)

- 两份 P3 工件报告签署后进入 P4：T1 起，按依赖顺序执行。
- TK-2 / TK-3 的记录口径由 P4 阶段记录承接。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `tasks.md` | 1 / 2（当前开发者） | Jacky | 2026-11-18 | 发起人当次会话指示「commit and p3」，沿用「全部批准」授权（当前开发者 = Jacky） | 全文 |
| `tasks.md` | 2 / 2（非当前开发者且非 WAYNE） | Karena | 2026-11-18 | 同上 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 同上 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Jacky | 2026-11-18 | 同上 | 结论与签署位 |