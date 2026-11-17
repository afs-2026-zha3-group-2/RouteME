# spec 评审报告（第 2 次 / P2 收敛） — add-experience-photos

- **工件：** `openspec/changes/add-experience-photos/specs/trip-experiences/spec.md`（P2 修订）
- **change-id：** `add-experience-photos`
- **评审日期：** 2026-11-17
- **评审方式：** `all-specs-review`（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-testing`）
- **重评原因：** P2 按 P1 spec 评审 S-01 / S-02 拆分 ADDED Requirement、固定 403/400 错误码，并补齐「分享页预览与移除」「未登录上传被拒绝」两个场景；属语义修订，另出本报告，不覆盖 `20261117-add-experience-photos-spec-review.md`
- **评审输入：** P2 修订后的 Delta；`proposal.md`；`dov-ac-review.md`；`requirements/REQ-018-experience-photos.md`；Living Spec `openspec/specs/trip-experiences/spec.md`

## 评审结论

**Pass**

P2 修订把 ADDED 拆为「上传与校验」与「元数据与清理」两条 Requirement，错误码固定为 403 `FORBIDDEN` / 400 `INVALID_INPUT`，并补齐分享页预览移除与未登录 401；基线 11 个场景名全部保留。`openspec validate --strict` 通过（`deltaCount: 5`）。无 BLOCKER；2 条 SUGGESTION 留 P3。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| S2-01 | SUGGESTION | `@rule:web-testing` | 「孤儿图片懒清理」 | 24h 阈值仍依赖测试手段 | P3 用可注入时钟或可配置阈值；E2E 只验证已发布图片不受影响 | `dov-ac-review.md` R-02 |
| S2-02 | SUGGESTION | `@rule:spec-first` | 「元数据与清理」正文 | EXIF 剥离依赖图像处理库，规格未约束解析失败行为 | P3 `design.md` 明确：解析失败按坏格式拒绝（400 `INVALID_INPUT`），不落盘 | `dov-ac-review.md` R-01 |

## 校验证据

- `openspec validate add-experience-photos --strict` → `Change 'add-experience-photos' is valid`。
- `openspec show add-experience-photos --json --deltas-only` → `deltaCount: 5`（ADDED 2 + MODIFIED 3）。
- 场景清点：ADDED 7 + 2；MODIFIED 3 + 5 + 6 = 23。基线 11 个场景名保留。
- P1 的 S-01 / S-02 已收口；P-01（图像库）留 P3。

## 与 Living Spec 的对齐

| Requirement | 变更 | 基线场景 | 结论 |
|---|---|---|---|
| 游后体验图片的上传与校验 | ADDED | — | 上传 / 校验 / 排序 / 三种拒绝 / 预览移除 / 401 |
| 游后体验图片的元数据与清理 | ADDED | — | EXIF 剥离 / 孤儿懒清理 |
| 游后体验的内容口径与纯文字降级 | MODIFIED | 3/3 保留 | 图片可选，纯文字仍合法 |
| 游后体验在原计划详情页展示 | MODIFIED | 3/3 保留 | 首图 / 查看全部 / 无图不留空占位 |
| 灵感首页的旅行体验视图 | MODIFIED | 5/5 保留 | 体验卡保持内置封面 |

## 残余风险

- 契约 / 迁移号与 `add-ai-itinerary` 撞车；P3 统一排号。
- EXIF 库选型与许可证；P3 记录。
- 无自动审核；依赖举报入口，记为产品残余风险。

## 批准记录

- **批准人（Delta Spec）：** WAYNE（IO / SA）
- **批准时间：** 2026-11-17
- **批准来源：** 用户在 2026-11-17 会话中确认 G1 = Pass + 条件 C1，IO=WAYNE / SA=Jacky
- **报告签署：** WAYNE + Jay（当前开发者）— 2026-11-17
- **批准范围：** 批准 P2 修订后的 Delta 进入 G1；S2-01 / S2-02 留 P3。
