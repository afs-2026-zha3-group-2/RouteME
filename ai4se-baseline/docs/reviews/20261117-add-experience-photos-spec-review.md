# spec 评审报告 — add-experience-photos

- **工件：** `openspec/changes/add-experience-photos/specs/trip-experiences/spec.md`（Delta 草稿）
- **change-id：** `add-experience-photos`
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review`（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-testing`）
- **评审输入：** Delta 草稿；`proposal.md`；`requirements/REQ-018-experience-photos.md`；`deep-dive.md`「REQ-018 增补」；Living Spec `openspec/specs/trip-experiences/spec.md`

## 评审结论

**Pass**

Delta 采用「ADDED 1 + MODIFIED 3」：新增图片上传与生命周期，修改内容口径、详情页展示与首页体验视图；基线 11 个场景名全部保留，新增 9 个场景覆盖上传、校验、排序、越权、EXIF、清理、首图、无图与卡片不变。`openspec validate --strict` 通过（`deltaCount: 4`）。无 BLOCKER；2 条 SUGGESTION 留 P2 / P3。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| S-01 | SUGGESTION | `@rule:spec-first` | ADDED Requirement 正文 | 上传、校验、归属、EXIF、清理写在同一段，句子较长 | P2 `delta-craft` 评估是否拆为「上传与校验」+「生命周期」两条 Requirement；当前 6 场景仍可按 Requirement 追溯 | Delta ADDED 段 |
| S-02 | SUGGESTION | `@rule:web-testing` | 场景「图片归属与越权拒绝」 | Then 写「403 或 400」，未按原因固定 | P2 固定：越权 = 403；图片不存在 / 已被占用 = 400；并在 `dov-ac-review.md` 逐条映射 | Delta 该场景 |
| S-03 | SUGGESTION | `@rule:web-testing` | 场景「孤儿图片懒清理」 | 24 小时阈值未说明测试手段 | P3 `atdd-design.md` 用可注入时钟的后端单测；E2E 只验证「已发布图片不受影响」 | `deep-dive.md` ② D7 行 |

## 校验证据

- `openspec validate add-experience-photos --strict` → `Change 'add-experience-photos' is valid`。
- `openspec show add-experience-photos --json --deltas-only` → `deltaCount: 4`（ADDED 1 + MODIFIED 3）。
- 场景清点：ADDED 6 + 内容口径 3 + 详情页 5 + 首页 6 = 20；基线 11 个场景名保留（内容 3 / 详情 3 / 首页 5）。

## 与 Living Spec 的对齐

| MODIFIED Requirement | 基线场景保留 | 新增场景 | 结论 |
|---|---|---|---|
| 游后体验的内容口径与纯文字降级 | 3/3 | 0（仅改 Given 前提） | 图片为可选增强，纯文字仍合法 |
| 游后体验在原计划详情页展示 | 3/3 | 2（首图 / 无图） | 有图展示、无图不留空占位 |
| 灵感首页的旅行体验视图 | 5/5 | 1（卡片内置封面） | D3 进入长期规格 |

## 残余风险

- ADDED Requirement 的正文较长；P2 若拆分，需保持「上传 → 绑定 → 清理」的端到端可追溯。
- 归因错误码若在 P2 固定，需同步 `openapi.yaml` 的 403 / 400 响应与 E2E。
- 24h 清理依赖时钟注入；若 P3 不引入可注入时钟，需改用可配置阈值或单测直接调用清理方法。

## 批准记录

- **批准人（Delta Spec）：** WAYNE（IO / SA）
- **批准时间：** 2026-11-17
- **批准来源：** 用户在 2026-11-17 会话中确认「全部批准」
- **报告签署：** WAYNE + Jay（当前开发者）— 2026-11-17
- **批准范围：** 批准 Delta 草稿进入 P2 `/sdd:delta-craft` 与 G1；S-01 ~ S-03 留 P2 / P3 收口。
