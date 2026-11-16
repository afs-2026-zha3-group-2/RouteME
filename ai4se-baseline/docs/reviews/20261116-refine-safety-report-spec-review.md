# spec 评审报告 — refine-safety-report

- **工件：** `openspec/changes/refine-safety-report/specs/trip-companions/spec.md`（MODIFIED，1 Requirement / 9 Scenario）
- **change-id：** `refine-safety-report`
- **能力：** `trip-companions`（MODIFIED — 替换 Living Spec「我的旅行聚合与最低安全能力」）
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`；基线 `origin/main` + 工作区 `HEAD@294f487`）
- **评审输入：** Delta Spec；Living Spec `openspec/specs/trip-companions/spec.md`;需求条目 `requirement-workspace/requirements/REQ-012-safety-report.md`；`openapi.yaml` 0.8.1 `ReportRequest` / `ReportReceipt`；`frontend/src/safety/ReportModal.tsx`、`SafetyNote.tsx`；`docs/prototype/ui.js` `safetyPanel()` / `chat-safety` / `reportModal()`

## 评审结论

**Pass**

Delta 以 MODIFIED 替换整个 Requirement 块，保留 Living Spec 的「分区展示我的旅行」「待处理申请提醒」「安全提示常驻」与「提交举报并收到回执」四个既有场景名；新增 5 个场景覆盖聊天提示、举报入口与对象、本人行程入口、失败重试与隐私字段。1 WARNING + 3 SUGGESTION，无 BLOCKER。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| S-01 | WARNING | `@rule:spec-first` | Scenario「安全提示常驻」 | 场景名沿用 Living Spec，但内容已从「展示三条提示」扩展为「详情页三条文本 + 集合区域回退 + 读屏可读」；名称与内容的偏差会让归档评审误以为只是措辞微调 | 归档（P5 / G3）时在替换说明中写明「名称保留、内容收敛为三条文本列表」；如需改名，同批更新 Living Spec 与追溯表 | `openspec validate` 实测：改名会报 `MODIFIED ... omits scenario(s) the current spec still has: "安全提示常驻"` |
| S-02 | SUGGESTION | `@rule:pii-scrubbing` | Scenario「安全区不展示隐私字段」 | 纯否定断言缺少正向锚点，P4 容易写成「页面上没看见」式人工检查 | P3 绑定词表黑名单（`电话：` / `身份证` / `门牌`）+ 安全区文本快照，按 `profiles.spec.ts` 既有做法 | `e2e/tests/profiles.spec.ts:81` |
| S-03 | SUGGESTION | `@rule:sdd-artifacts` | Scenario「举报入口与举报对象」 | 原因只列中文四类，未映射 `openapi.yaml` 的枚举值（`harassment` / `fake` / `safety` / `other`），存在文案与契约漂移风险 | P3 `design.md` / `atdd-design.md` 建立「中文标签 ↔ 枚举值」映射表，并在单测里断言四个 value | `openapi.yaml` `ReportRequest.reason` 四值枚举 |
| S-04 | SUGGESTION | `@rule:spec-first` | Scenario「提交举报并收到回执」 | 未约束双击 / 重复提交；成功提交产生第二条举报记录的风险由现有组件 `confirmLoading` 兜住，但场景未记录该依赖 | P4 保留 `confirmLoading={submitting}` 与回执态主按钮改为关闭；在 `atdd-design.md` 标为非功能回归项 | `frontend/src/safety/ReportModal.tsx:60-63`（`confirmLoading` / 回执态 `onOk={close}`） |

## 场景与 AC 追溯

| REQ-012 §4 | Delta Scenario | 状态 |
|---|---|---|
| #1 详情页三条安全提示 | 安全提示常驻 | 覆盖（含集合区域回退、读屏可读、非颜色 / 图标表达） |
| #2 聊天页安全提示 | 聊天页展示安全提示 | 覆盖（含已结束只读聊天、「待确认」回退） |
| #3 举报入口与对象 | 举报入口与举报对象 | 覆盖（含弹窗对象、四类原因、≤200 说明、身份保密、紧急求助） |
| #4 提交举报并收到回执 | 提交举报并收到回执 | 覆盖（记录 + 回执「已收到，我们会处理」+ 无处置闭环） |
| #5 本人行程不出现举报入口 | 本人行程不出现举报入口 | 覆盖（提示照常、入口不出现） |
| #6 提交失败可读且可重试 | 提交失败可读且可重试 | 覆盖（保留原因与说明、重试后单一回执） |
| #7 隐私字段不出现 | 安全区不展示隐私字段 | 覆盖（见 S-02） |
| Living Spec 基线：分区展示我的旅行 | 分区展示我的旅行 | 原样保留 |
| Living Spec 基线：待处理申请提醒 | 待处理申请提醒 | 原样保留 |

无孤儿场景、无未覆盖 AC；`trip-plans` 的 `meeting_area` 只读消费，未在 Delta 中重定义。`openspec validate refine-safety-report --strict` 通过。

## 残余风险

- 场景「安全提示常驻」名称与内容存在偏差（S-01），归档时需要一句说明，否则 Living Spec 的追溯会看起来像改名遗漏。
- Delta 未规定举报原因的展示顺序；P3 若调整顺序，`ReportModal` 的默认值（`safety`）与 `REQ-009` 弹窗断言需同步核对。
- 只读聊天中的举报入口依赖「聊天页可进入」这一既有前提；若后续行程结束改为禁止进入聊天，本场景需要复评。

## 批准记录

- **批准人：** Jacky（AO）
- **批准时间：** 2026-11-16T15:44+08:00
- **批准范围：** 批准本 Delta Spec 并进入 P1 收口 / P2 `delta-craft`；S-01（场景名沿用说明）留待 P5 归档，S-02 / S-03 / S-04 留待 P3 / P4 收口，不阻断。

## 变更摘要（2026-11-16）

- **修订类型：** 勘误（不改变语义、不改变结论）——复用本次 Pass 结论，不另出一份报告。
- **修订内容：** 「评审结论」段的场景计数与同句列举不一致：原文写「保留 ... 三个既有场景名 ... 新增 6 个场景」，而列举只有 5 项、Delta 实际为 4 个保留基线场景名 + 5 个新增。已改为「保留 Living Spec 的 ... 四个既有场景名；新增 5 个场景」。
- **复验：** Delta 场景清点 = 4 个基线名（`分区展示我的旅行`、`待处理申请提醒`、`安全提示常驻`、`提交举报并收到回执`）+ 5 个新增（`聊天页展示安全提示`、`举报入口与举报对象`、`本人行程不出现举报入口`、`提交失败可读且可重试`、`安全区不展示隐私字段`），合计 9 个 `#### Scenario:`；`openspec validate refine-safety-report --strict` 通过。
- **批准仍有效：** 批准人 Jacky（AO）／批准时间 2026-11-16T15:44+08:00。