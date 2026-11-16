# AC / DoV review — add-user-profile

- **Change:** `add-user-profile`（`user-profile` ADDED + `user-auth` MODIFIED，REQ-008）
- **Reviewed artifacts:**
  - [`specs/user-profile/spec.md`](specs/user-profile/spec.md) — 7 Requirement / 24 Scenario（ADDED）
  - [`specs/user-auth/spec.md`](specs/user-auth/spec.md) — 1 Requirement / 6 Scenario（MODIFIED「注册账号」）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-008-user-profile.md`、`requirement-workspace/impact-brief.md` §12、`requirement-workspace/deep-dive.md`「REQ-008 增补」、`requirement-workspace/stories/add-user-profile.story.md`（S18）、`openspec/specs/user-auth/spec.md`（Living Spec 基线）、`openspec/specs/trip-plans/spec.md` / `trip-experiences/spec.md`（发布者展示基线）
- **Timestamp:** 2026-11-16T11:01+0800
- **Reviewer:** opencode（AI agent）
- **Tooling:** `openspec validate add-user-profile --strict` → valid；`openspec validate --specs --strict` → 6/6 passed

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | `user-profile` 7 Requirement / 24 Scenario；`user-auth` 1 Requirement / 6 Scenario | 每个 Requirement 均 ≥2 个场景；无空 Requirement |
| AC-2 ACs are observable | Pass | 场景断言可见结果：资料完善状态、字段级缺失清单、年龄 / 星座、兴趣计数、旅行方式唯一值、401 / 403、展示回退 | 无「正常工作 / 快速 / 正确」类空泛表述 |
| AC-3 Negative / edge cases called out | Pass | 「缺少必填字段」「生日为未来或格式非法」「头像文件类型或大小不合法」「少于 3 个兴趣」「没有有效会话」「演示身份尝试保存」「查看未完善的资料」 | 覆盖非法输入、权限边界与降级展示 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景写可观察行为与契约结果（`INVALID_INPUT` / `SESSION_INVALID` / 403），未指定组件、状态库或上传实现 | 头像只约束类型与大小，不绑定存储方案 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches proposal | Pass | `proposal.md` §范围 10 条 in-scope ↔ 24 + 6 Scenario；Out of scope 无对应需求 | 无静默扩张：未加入裁剪、相册、可见性开关、演示资料编辑、兴趣词表统一；MODIFIED 未丢弃基线场景 |
| DoV-2 Ambiguities listed or resolved | Pass | 下方「规格解释裁决 1–9」 | 无未决 blocking 歧义 |
| DoV-3 Role concerns noted for residual risk | Pass | 下方「残余风险」 | 含 SA（双 capability 例外、契约兼容）/ Dev（头像存储、迁移）/ BA（兴趣词表） |
| DoV-4 No business implementation claimed done | Pass | 本 change 只有 Proposal + 两份 Delta Spec；仓库现有注册表单仅作现状证据 | `proposal.md` §交付边界明确 P1/P2 不含实现 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 下方「需求映射」17/17 + 「基线保留」4/4 | REQ-008 §4 十七个场景全部有 Delta 落点；Living Spec 4 个既有场景保留 |

**Blocking gaps:** 无。G1-ready from the review's perspective.

## Requirement mapping（REQ-008 §4 → Delta Spec）

| REQ-008 场景 | Delta Scenario | 覆盖判定 |
|---|---|---|
| #1 注册后进入资料完善页 | `user-auth`「注册成功后自动登录」+ `user-profile`「注册后资料未完善」 | 完整（自动登录 + 未完善标记 + 进入完善页） |
| #2 提交完整资料并生成个人主页 | 「完整必填资料保存成功」「保存后进入本人主页」 | 完整（状态迁移 + 主页展示） |
| #3 生日派生年龄与星座 | 「展示年龄与星座」 | 完整（服务端派生、生日不对外） |
| #4 必填缺失阻止提交 | 「缺少必填字段」 | 完整（拒绝保存 + 逐项缺失清单） |
| #5 上传头像（选填） | 「上传头像成功」 | 完整 |
| #6 无头像回退 | 「未上传头像」 | 完整（昵称首字、无空白框） |
| #7 学校 / 专业 / 职业分开录入 | 「学校与专业拼接展示」「非学生只填职业」 | 完整（`·` 拼接 + 学校可为空） |
| #8 兴趣至少 3、最多 5 | 「少于 3 个兴趣」「达到 5 个上限」「自定义标签取消后仍可复选」 | 完整 |
| #9 旅行方式单选 | 「旅行方式只能单选」 | 完整（改选覆盖、不并存） |
| #10 选填项留空 | 「选填字段留空」 | 完整（头像 / 学校 / 专业 / 职业 / MBTI / 简介） |
| #11 跳过并稍后补全 | 「跳过完善页」「稍后补全」 | 完整（可跳过 +「我的」入口 + 状态迁移） |
| #12 他人从发布者入口查看 | 「他人从发布者入口查看」 | 完整（无编辑入口） |
| #13 查看未完善资料 | 「查看未完善的资料」 | 完整（已有字段 + 提示，不报错） |
| #14 再次编辑已保存资料 | 「本人更新资料」 | 完整（覆盖、不新建） |
| #15 生日非法 | 「生日为未来或格式非法」 | 完整（400 + 不部分写入） |
| #16 未登录 / 演示身份保存被拒 | 「没有有效会话」「演示身份尝试保存」 | 完整（401 / 403 + 无编辑入口） |
| #17 头像文件不合法 | 「头像文件类型或大小不合法」 | 完整（400 + 其他字段不丢失） |

## Living Spec 基线保留（MODIFIED 覆盖检查）

| `openspec/specs/user-auth/spec.md` 既有场景 | Delta Scenario | 判定 |
|---|---|---|
| 注册成功后自动登录 | 同名场景 | 保留；正文补充「资料未完善」与「进入完善页」，未削弱原断言 |
| 用户名重复（409 `USERNAME_TAKEN`） | 同名场景 | 原样保留 |
| 用户名格式非法 | 同名场景 | 原样保留 |
| 密码长度非法 | 同名场景 | 原样保留 |

Requirement 正文由「校验昵称与兴趣标签数量」收窄为「校验昵称」，是用户裁决 D3 的直接结果：兴趣改由完善页收集，旧字段在注册请求中被忽略（新增场景「忽略旧版注册资料字段」）。

## Proposal → Delta 覆盖

| Proposal In scope | Delta 落点 |
|---|---|
| `user-profile` 字段（含年龄 / 星座派生） | `specs/user-profile/spec.md` Requirement「个人资料字段与必填规则」「生日派生年龄与星座」 |
| 必填规则 + 逐项 / 汇总提示 | 「缺少必填字段」「选填字段留空」 |
| 资料完善状态派生、可跳过、稍后补全 | Requirement「资料完善状态与稍后补全」3 场景 |
| 个人主页（本人可编辑 / 他人只读）+ 发布者入口 | Requirement「个人主页与发布者入口」5 场景 |
| `user-auth` 注册收窄 + 注册后落点 | `specs/user-auth/spec.md` MODIFIED「注册账号」6 场景 |
| 契约 0.7.0（3  endpoint + 注册请求体收窄） | 由 Scenario 的请求 / 响应行为约束；具体字段在 P3 `design.md` 与 `openapi.yaml` 落地 |
| 迁移（8 列，不新增表） | 由「非学生只填职业」「选填字段留空」约束可空性；列清单在 P3 迁移任务落地 |
| 头像上传与回退 | Requirement「头像上传与回退」3 场景 |
| 他人查看未完善资料降级 | 「查看未完善的资料」 |
| 演示身份只读 | 「演示身份尝试保存」 |

## 规格解释裁决

1. **ADDED / MODIFIED 分工。** `user-profile` 是新业务概念，用 ADDED；`user-auth` 的「注册账号」是既有块，用 MODIFIED 并原样保留 4 个基线场景。`add-user-auth` 已归档，Living Spec 是唯一权威基线，不能用 ADDED 再造一条注册需求。
2. **昵称只有一个来源。** 注册时收集的昵称写入账号；完善页的昵称是同一条账号字段的编辑入口，不新建第二份资料表。P3 `design.md` 需明确这一点，避免出现「账号昵称」与「资料昵称」两个值。
3. **年龄 / 星座由服务端派生。** 只返回只读年龄与星座；完整生日对其他人不可见，本人编辑时可回填。星座边界由 P3 表驱动并加单测。
4. **学校选填覆盖原始 AC。** 原始 AC 把学校列为必填；用户裁决 D2 追加改为选填，并新增选填「职业」（D6）承载非学生身份。必填集合以 REQ-008 §5 为准。
5. **职业是四选一而非自由文本。** 学生 / 上班族 / 自由职业 / 其他，单选；「其他」承接残余情况，保证展示与后续筛选稳定。职业与学校可同时填写，也可只填其一。
6. **头像选填覆盖原始 AC。** 用户裁决 D1：真实上传但选填；无头像回退昵称首字，任何展示位不出现空框。
7. **完善状态派生、不落库。** 「资料未完善」是必填字段的函数；跳过是允许的，且不阻断浏览、发布、申请、聊天与体验。
8. **发布者摘要回退顺序。** 「学校 · 专业 → 职业 → 城市」取第一个可用值；全空时只显示昵称与头像，不留空行或占位符。
9. **演示账户只读。** 演示身份不展示完善 / 编辑入口，接口返回 403；不迁移演示数据，「研一 · 地理科学」旧文案继续保留。

## 残余风险

| 风险 | Owner | 说明 |
|---|---|---|
| 双 capability（`user-profile` ADDED + `user-auth` MODIFIED）违反默认「一个 change 一个 capability」 | SA | 与 REQ-005 同口径；注册收窄与资料补齐是同一状态迁移的两端；需在 G1 / 归档前具名追认 |
| 发布者展示（头像、主页入口、摘要回退）改变 `trip-plans` / `trip-experiences` 的可观察输出 | SA / AO | 本 change 未为这两个能力写 Delta；P3 需确认是补 MODIFIED delta，还是在 `user-profile` 侧声明展示契约且不违反基线卡片场景 |
| `DemoUser` 契约字段（`avatar_initial`、`school`）与新头像 / 可空学校并存 | Dev | 契约升 0.7.0 时明确新旧字段关系与兼容期；避免既有卡片 / 详情渲染断档 |
| 头像文件落盘带来目录、清理与安全边界 | Dev | 仅 JPEG / PNG / WebP、≤2 MB、服务端生成文件名；P3 设计确认目录与访问路径 |
| 兴趣词表（自然风景 / 文化历史 / 看展）与行程标签（自然 / 历史 / 展览）不一致 | BA / SA | 本 change 只要求 3–5 个可保存；别名归一化交 P3，不扩成匹配改造 |
| 既有账号（3 个演示账户与迁移前注册账号）没有新字段 | Dev | 迁移列必须可空；完善状态派生把 NULL 视为缺失；演示账户保持只读 |

## Next

- 进入 `/sdd:g1-decision-record`（Delta Spec + 本评审 + `consistency-lint.md` 作为输入）。
- 本评审不是 Gate 决策，也不代表实现已完成。