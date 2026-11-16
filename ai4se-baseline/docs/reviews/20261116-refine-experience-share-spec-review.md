# spec 评审报告 — refine-experience-share

- **工件：** `openspec/changes/refine-experience-share/specs/trip-experiences/spec.md`
- **change-id：** `refine-experience-share`
- **能力：** `trip-experiences`（MODIFIED 2 Requirement + ADDED 1 Requirement）
- **评审日期：** 2026-11-16
- **评审方式：** `all-specs-review` 技能（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:pii-scrubbing`、`@rule:web-testing`；基线 `main@25b60f7`）
- **评审输入：** Delta 正文；Living Spec `openspec/specs/trip-experiences/spec.md`；`openspec validate refine-experience-share --strict`；`openspec show refine-experience-share --json --deltas-only`；REQ-004 §4 #1–#8；原型 `ui.js` `share()`

## 评审结论

**Pass**

Delta 用 MODIFIED 收敛「对已结束且参加过的行程发布游后体验」（两种不可用原因可区分、再次提交条数不变）与「游后体验的内容口径与纯文字降级」（内置封面写实为目的地色调封面条），并用 ADDED 新增「游后分享页说明体验去向与分享边界」。Living Spec 既有场景名全部保留，新增场景可验证，无 BLOCKER；2 条 WARNING 建议在 P3 / P4 收口。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 |
|---|---|---|---|---|---|---|
| S-01 | WARNING | `@rule:spec-first` | MODIFIED「行程未结束时拒绝分享」 | 「系统拒绝并提示」未区分服务端拒绝与前端提示的职责边界，容易被读成前端自行判定即为合规 | 在 P3 `design.md` 写明：服务端仍是唯一拒绝方（`EXPERIENCE_NOT_ALLOWED` 403），前端只在加载后按 `status` / `participants` 渲染文案 | `ExperienceServiceImpl.requireCanShare`；`ShareExperiencePage` `!canShare` 分支 |
| S-02 | WARNING | `@rule:web-testing` | ADDED「分享页展示行程概览」 | 「390 / 768 / 1440 不横向溢出」是人工走查项，没有对应自动化断言口径 | P3 `atdd-design.md` 标为人工走查 + 截图证据，E2E 只断言 hero 关键文本存在 | 现有 change 的视觉走查先例（`refine-safety-report` P4） |
| S-03 | SUGGESTION | `@rule:sdd-artifacts` | ADDED Requirement 名 | 「游后分享页说明体验去向与分享边界」把两件事放在一个 Requirement，未来若拆分需重命名 | 保留现名；归档说明写明包含「去向三条 + 边界两条」两个场景组 | Delta 3 个场景 |
| S-04 | SUGGESTION | `@rule:pii-scrubbing` | ADDED「分享页说明分享边界」 | 场景写「不采集也不展示电话、证件或精确住址」，但未把同行者昵称等非敏感字段排除在限制外 | 文案层面已限定为「电话 / 学校班级 / 住宿地址」，无需扩写；P4 用 `profiles.spec.ts` 同类词表黑名单做回归 | `e2e/tests/profiles.spec.ts` 词表黑名单先例 |

## 与 Living Spec 的差异核对

| Requirement | 操作 | 既有场景 | 新 / 变更内容 |
|---|---|---|---|
| 对已结束且参加过的行程发布游后体验 | MODIFIED | 5 个名称全部保留 | 新增「两种不可用原因可区分」约束；「行程未结束时拒绝分享」覆盖 `ongoing`；「再次提交即修改」补「体验条数不变」 |
| 游后体验的内容口径与纯文字降级 | MODIFIED | 3 个名称全部保留 | 「内置封面」由抽象声明写实为「按目的地生成的固定色调封面条 + 目的地名」 |
| 游后分享页说明体验去向与分享边界 | ADDED | — | 3 个新场景：行程概览 / 去向三条 / 边界两条 |

## 校验证据

- `openspec validate refine-experience-share --strict` → `Change 'refine-experience-share' is valid`。
- `openspec show refine-experience-share --json --deltas-only` → `deltaCount: 3`（`trip-experiences`：1 ADDED + 2 MODIFIED）。
- 场景清点：ADDED 3 + MODIFIED 5 + MODIFIED 3 = 11 场景；Living Spec 基线 8 个场景名在 MODIFIED 中原样保留。

## 残余风险

- 「未结束」提示依赖 `status` 的四态（`recruiting` / `full` / `ongoing` / `completed`），若 `add-trip-completion` 后续再改状态口径，本 Delta 文案需同步。
- ADDED Requirement 与「对已结束且参加过的行程发布游后体验」共享分享页，归档时需确认两者不产生重复权威。
- 封面条一旦引入图片资源（未来增强项），「无图片也能发布」场景需重写；当前明确不引入图片。

## 批准记录

- **批准人：** Wanye（SA）
- **批准时间：** 2026-11-16T16:29+08:00
- **批准来源：** 用户在 2026-11-16 会话中确认「批准 Delta Spec」并授权进入 P2
- **批准范围：** 批准本 Delta 进入 P2（AC/DoV 复核 → 一致性检查 → G1）；S-01 / S-02 留待 P3 / P4 收口。