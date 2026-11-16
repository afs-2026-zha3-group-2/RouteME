# 设计评审报告 — refine-safety-report

- **工件：** `openspec/changes/refine-safety-report/design.md`
- **change-id：** `refine-safety-report`｜ **能力：** `trip-companions`（REMOVED 1 + ADDED 1）
- **需求条目：** `requirement-workspace/requirements/REQ-012-safety-report.md`（REQ-012 / S14，rev2）
- **评审日期：** 2026-11-16｜ **评审轮次：** 第 1 次
- **评审方式：** `all-specs-review`（规则锚点：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:document-conventions`、`@rule:web-coding-style`、`@rule:web-testing`）
- **评审输入：** [`design.md`](../../openspec/changes/refine-safety-report/design.md)、[`atdd-design.md`](../../openspec/changes/refine-safety-report/atdd-design.md)、[`tasks.md`](../../openspec/changes/refine-safety-report/tasks.md)、[`specs/trip-companions/spec.md`](../../openspec/changes/refine-safety-report/specs/trip-companions/spec.md)（rev2，9 场景）、[`g1-decision.md`](../../openspec/changes/refine-safety-report/g1-decision.md)（rev2 Pass + Follow-ups）、[`proposal.md`](../../openspec/changes/refine-safety-report/proposal.md)、`preview/safety-report.html`（位置 B）

## 评审结论

**Pass**

设计覆盖 Delta 的 9 条场景，未引入规格外行为；改动面限于 3 个前端组件、1 个文案表与 1 个样式表，后端 / 契约 / 迁移明确冻结。5 条建议中 1 条当场收口（行号引用），其余为 P4 执行时的写法优化或需 AO 裁决的措辞宽严，均不阻断。无 BLOCKER、无 WARNING。

## 工具与代码证据

| 证据 | 结果 |
|---|---|
| `cd ai4se-baseline; npx --no-install openspec validate refine-safety-report --strict` | `Change 'refine-safety-report' is valid` |
| 文案键消费者（`frontend/src` 全量 grep） | `reportEntry` → `tripMessages` + `SafetyNote`；`reportTitle` / `reportTargetTrip` / `reportTargetUser` / `reportSuccess` → `tripMessages` + `ReportModal`。设计声明的「删除后无消费者」成立 |
| `.detail-badges` 使用点 | `styles.css` 定义 + `TripDetailPage` 唯一使用点；把入口挂进该 flex 行不会波及其它页面 |
| `SafetyNote` 使用点 | `ChatPage`（带 `onReport`）、`ShareExperiencePage`（无 `onReport`）、组件定义；D3 的收窄范围与实际调用点一致 |
| `createCancel` 使用点 | 7 处，含 `TripCreatePage` / `MyTripsPage` / `ShareExperiencePage`；设计保留该键、只改 `ReportModal` 的用法，正确 |
| `applicationEntryState`（`frontend/src/trips/applicationEntry.ts`） | `trip.publisher.id === userId` 即返回 `publisher`；D1 以 `entry.kind === 'publisher'` 判定本人行程，语义正确 |
| 种子数据（`backend/src/main/resources/db/migration/V4__seed_demo_trips.sql`） | 行程 5 的 `publisher_id` 为用户 2，用户 1 打开仍属「他人行程」；`profiles.spec.ts` 改指页头入口后不会因本人行程而失效 |
| 既有 E2E 依赖 | `companions.spec.ts` 的回执用例依赖旧文案与 `.ant-modal-footer .ant-btn-primary`；`profiles.spec.ts` 依赖 `SafetyNote` 上的 `/^举\s*报$/`，两者均在 ATDD §7 与 T1 中列为同批改动 |

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 状态 |
|---|---|---|---|---|---|---|
| D3-01 | SUGGESTION | `@rule:document-conventions` | `atdd-design.md` §7、`design.md` D1 | 初稿以行号引用（`L134–L137`、`L206` 等）定位既有测试与判定点；行号会随并行会话改动漂移 | 改为用例名 + 选择器 / 符号引用 | **已当场收口** |
| D3-02 | SUGGESTION | `@rule:web-testing` | `atdd-design.md` §5 E1 / E2 | 三档视口循环在两个用例里各写一次，后续调整宽度档位容易只改一处 | T1 落地时抽 `assertHeaderEntryVisibleAt(page, entry)` 到 `e2e/tests/support.ts`，两个用例共用 | 留 T1（不阻断） |
| D3-03 | SUGGESTION | `@rule:spec-first` | `design.md` D1「三档判定」 | spec 评审 S2-04 建议「390 位于标题下方」，设计只要求「换行可见、不溢出」。理由成立（390 下若标签与链接仍可同行，强制换行是无收益断点），但宽严差异需要显式记录 | 保留现设计；若 AO 要求严格「下方」，在 T5 追加断点并同步 E1 断言 | 待 AO 裁决（不阻断） |
| D3-04 | SUGGESTION | `@rule:web-coding-style` | `design.md` D4「目标标识」 | 目标行的中文句号写在 JSX（`{prefix}{label}。{privacy}`），不在文案表；未来若要给标题加引号或改标点需改代码 | 当前体量可接受；若 P4 出现第二种组合再抽 `reportTargetLine` 生成函数 | 留 P4 观察 |
| D3-05 | SUGGESTION | `@rule:sdd-artifacts` | `design.md` D4 | 设计只描述 `targetLabel` 的语义，未给 `ReportModal` 的完整 props 签名；ATDD 已给出测试契约，实现细节交由 TypeScript | P4 以编译期类型为准；如签名与设计不符，在 `p4-verify.md` 记录 | 留 P4 |

## 与规则 / 既有规格的一致性

| 检查 | 结论 |
|---|---|
| 设计是否只覆盖 Delta 的 9 条场景 | 是。D1 / D2 对应场景 #3 / #4，D4 对应 #5 / #7 / #8 / #9，D3 与 RV-4 对应 #6，场景 #1 / #2 明确不改 |
| 是否越界定义后端 / 契约 | 否。D4 只消费既有 `received` 字段；D5 明确枚举与 `openapi.yaml` 不变；RV-6 用 `git diff` 钉住 |
| 是否静默移除仍被需要的行为 | 否。`SafetyNote` 保留给体验发布页；`createCancel` 等共用键保留；删除项均核实无其它消费者 |
| 是否与已批准预览一致 | 是。位置 B、两个入口文案、回执文案与隐私两段均取自 `preview/safety-report.html` 与 Delta Spec |
| 无障碍是否被当作验收而非注释 | 是。入口为文本 `<button>`，E1 断言 `focus()` + `Enter` 打开弹窗；未用 `aria-label` 分叉 |
| 隐私红线是否可执行验证 | 是。E7 在详情、聊天、弹窗三处扫 `电话：` / `身份证` / `门牌` / `证件号`，并保留 `profiles.spec.ts` 的资料弹窗黑名单 |
| 文档语言与引用规范 | 是。正文中文、标识符与命令英文、相对链接、无绝对机器路径；行号引用已按 D3-01 收口 |
| 设计决策是否可追溯到任务 | 是。D1→T3/T5、D2→T3/T5、D3→T4、D4→T2、D5→T2、D6→T5、D7→T1；`tasks.md` 对齐自检 14 项 Pass |

## 残余风险

- **重复举报无幂等保护。** 若请求已在服务端落库但响应丢失，用户重试会产生第二条 `reports` 记录；MVP 明确不做处置闭环，且「不出现多条可见记录」由 UI 单回执满足，因此不阻断，但需在 P4 残余风险中保留。
- **页头结构耦合。** 两个入口依赖 `.detail-badges` 与 `.chat-head` 的现有排版；若后续页头改版，场景 #3 / #4 需复评（与 spec 评审残余风险一致）。
- **E2E 不在 CI。** 回执文案与三档换行只能本地验证，P4 必须贴真实输出。
- **390 档的强断言语义。** 见 D3-03：设计接受「可见即可」，若验收方要求「必须在标题下方」，需追加断点与断言。

## 批准记录

- **批准人：** Jacky（AO）
- **批准时间：** 2026-11-16T16:56+08:00
- **批准范围：** 批准 `design.md` 并继续 `tasks.md` 的工件评审；D3-01 已收口，D3-02–D3-05 不阻断。
- **说明：** 本批准只覆盖工件评审，不等于 Gate 通过；P4 仍需 T1 红态证据与本地全量回归。D3-03 按现设计执行（390 档只要求「换行可见、不溢出」）。