# 意图捕获 — REQ-029 用户成长等级 LV1–LV5（issue #44）

- **候选能力：** `user-growth`（ADDED）
- **来源：** GitHub Issue [#44](https://github.com/afs-2026-zha3-group-2/RouteME/issues/44)「用户成长等级 LV1–LV5」（`afs-2026-zha3-group-2/RouteME`，2026-11-18 读取）；优先级 P1 / 迭代 3 / 3 点；落点页面「用户主页 / 行程详情 / 同行者信息」；assignee `Neal802`
- **捕获日期：** 2026-11-18 ｜ **记录人：** Jay（AO）
- **分支：** `feature/add-growth-level`（从 `origin/main@71f3ad4` 切出；独立 worktree `.worktrees/add-growth-level`）
- **基线事实：** `openapi.yaml` `0.25.0`；Flyway 头 `V30__add_travel_finance.sql`；`origin/main@71f3ad4`（`add-travel-finance` 已合并）
- **编号说明：** `origin/main` 已占用 REQ-001 ~ REQ-028（REQ-028 = `add-travel-finance`），故事号到 S29（同为 `add-travel-finance`）。在途 `add-report-credit-deduction`（issue #29）尚未合并，其分支内仍记为 REQ-028 / S29，合并时需按「后到者顺延」重排。本需求按当前 main 顺延登记为 **REQ-029 / S30**，change-id `add-growth-level`，合并时再按实际顺序校准。

## 原始意图（一句话）

作为 RouteMe 用户，我希望通过发布真实旅行体验、获得社区认可来提升个人成长等级（LV1–LV5），以便展示我在 RouteMe 中持续参与和贡献的记录，同时帮助其他用户了解我的社区活跃程度。

## 为什么（价值假设）

社区已有「信用分」这一独立体系（`user_credit_account` + `credit_ledger` + 五档信用等级 + 五个展示面），但它表达的是「可信/风险」，不是「参与/贡献」。成长等级要回答的是另一个问题：这个人在 RouteMe 里是否持续发布真实体验、是否被社区认可。

- **现有体系无法承载「正向成长」。** 信用分只增不靠发布体验（初始 80，扣分事件才变化），获赞只在信用侧按档位 +1，无法表达「经验累计 → 升级」的正向反馈。
- **故事明确要求与信用分分离。** issue 的技术边界写明「成长等级不等于信用分」「成长等级不得直接覆盖或修改信用分」，因此必须独立建账、独立计算、独立展示。
- **展示面已有成熟落点。** 信用分已铺到 5 个展示面（主页 / 资料弹窗 / 详情发布者 / 行程卡 / 申请者行）；issue 另外点名「同行者信息」，可复用同一套读取与样式骨架。

价值假设：**给社区参与一条可见、可累计、与信用风险解耦的正向反馈链**——发布真实体验与获得认可会留下经验流水并升级，恶意行为（举报成立）会扣经验；用户能看到自己的成长进度，其他用户能看到等级但不看到具体经验值。

## 现状核对（2026-11-18，`origin/main@71f3ad4`）

| 事实 | 证据 | 结论 |
|---|---|---|
| 成长等级完全不存在 | backend / frontend 全仓 grep `user_growth` / `growth_level` / `exp_total` / `成长等级` → 0 命中 | 需新增能力、表、账本与展示 |
| 信用分体系已落地但未归档 | `V20__add_credit_account.sql`、`CreditService.book`、`CreditLevel`；`openspec/specs/user-credit/spec.md` 不存在 | 只能作为范式参照，不能复用表或账本 |
| 体验发布只允许「已完成行程」 | `ExperienceEligibility.requireCanShare`：`status == COMPLETED` 且是发布者或接受同行者 | 「未完成 / 草稿」不会产生发布事件 |
| 体验按（行程, 作者）唯一 | `ExperienceService.upsert`：`(tripId, authorId)` 查重；新建返回 `created = true`，编辑返回 `false` | 重复发布天然不会重复建行；发布经验需按 `(trip, author)` 幂等 |
| 点赞表与接口已存在 | `V24__add_experience_likes.sql`；`POST / DELETE /api/experiences/{experienceId}/likes`；`(experience_id, user_id)` 唯一 | 可直接消费点赞事件，无需新建点赞能力 |
| 自赞已被拒绝 | `ExperienceLikeServiceImpl.like`：`authorId == userId` → `ForbiddenActionException` | 「有效赞」不含作者自赞 |
| 取消点赞即删行 | `ExperienceLikeMapper.deleteByExperienceAndUser` | 「有效赞」= 当前存在的点赞行；取消后基数下降 |
| 信用获赞已用档位锁定防刷 | `ExperienceLikeRewardServiceImpl`：档位 5/10/15/20/25，幂等键 `EXPERIENCE_LIKE:{tripId}:{authorId}:{tier}`，零变化仍留痕 | 成长点赞可复用「分档 + 锁定」思路，但用独立账本 |
| 举报成立可定位被举报用户 | `AdminReportServiceImpl.resolve`；`ReportTargetService.reportedUserId(Report)` 已存在 | 扣经验只需挂接 RESOLVED 分支，不新建举报能力 |
| 举报成立只处理一次 | 条件更新 `status = PROCESSING → RESOLVED / REJECTED`，失败抛 `ReportNotProcessingException` | 每份举报天然只进入一次成立分支；仍需幂等键兜底 |
| 展示数据入口已存在 | `GET /api/users/{userId}/profile`、`GET /api/users/credits?ids=`；前端 5 个信用展示面 | 成长等级可扩展同源响应，避免 N+1 |
| 同行者卡片已存在且不显示信用 | `frontend/src/trips/CompanionCard.tsx`（`.companion-card` + `.publisher-name`） | issue 的「同行者信息」需在卡片昵称附近新增等级 |
| 配置绑定已有范式 | `routeme.config.*Properties`（AI / 保险 / 天气）+ `application.yaml` 的 `routeme:` 根 | 发布经验值用 `routeme.growth.publish-exp` 绑定，默认 10 |
| 契约与迁移头已前进 | `openapi.yaml` 0.25.0；迁移头 `V30__add_travel_finance.sql` | P3 排他；本 change 预计 0.26.0 + V31（与 #29 合并顺序协调） |

## 用户裁决（2026-11-18）

| id | 议题 | 裁决 | 影响 |
|---|---|---|---|
| D1 | 与信用分的关系 | **完全分离**：独立能力 `user-growth`、独立账户与账本；不读写 `user_credit_account` / `credit_ledger` | 新增 2 张表；展示并列但语义区分 |
| D2 | 等级规则 | **LV1–LV5**；LV1 0–99、LV2 100–199、LV3 200–299、LV4 300–399、LV5 400+；每 100 EXP 升一级 | 等级由总经验派生，不落库 |
| D3 | LV5 之后 | **继续累计经验**，等级封顶 LV5；展示按实际累计值（400+） | 不做 400 封顶；不丢流水 |
| D4 | 初始值与存量 | 所有用户初始 **LV1 / 0 EXP**；**不回填**存量发布、历史点赞、已处理举报；迁移只建 0 账户 | 避免上线即升级；历史事件不补发 |
| D5 | 发布经验 | 首次创建「已完成行程」体验 +**10 EXP**（配置项 `routeme.growth.publish-exp`，默认 10，可改）；同一（行程, 作者）只发一次 | 编辑 / 重复提交 / 删除重建不再发 |
| D6 | 点赞经验 | **单篇体验分档锁定**：每累计 10 个有效点赞 +5 EXP（10/20/30… 各一次）；取消点赞不回滚；同一档位只结算一次 | 幂等键按体验 + 档位；防止反复点赞刷经验 |
| D7 | 举报扣经验 | **所有 RESOLVED（成立）举报**对被举报用户 −50 EXP；每份举报只扣一次；不受每日正向上限限制；经验最低 0（不足按实际扣） | 固定 50，不随违规类型变化；幂等键按举报 |
| D8 | 每日上限 | 正向经验（发布 + 点赞）每自然日（Asia/Shanghai）最多 +20；跨档**按剩余额度截断**；档位照常锁定、不次日补发；流水记实发值 | 18/20 时 +5 只发 2；负向不占上限 |
| D9 | 经验流水 | append-only；每次变化记录来源、实发值、前后快照、时间、关联对象与幂等键 | 账本是审计与回算依据 |
| D10 | 计算与可见性 | 等级与经验由后端统一计算，前端不得加减；**本人**可见等级 + 当前经验 + 距下一级；**他人**只见等级 | 批量读取只返回等级 |
| D11 | 展示面 | **6 处**：个人主页、资料弹窗、详情发布者区、首页行程卡、申请处理页申请者行、详情同行者卡片；头衔只用 `LVn` | 不新造中文头衔；与信用分并列但文案/样式区分 |
| D12 | 明确不做 | 经验明细页 / 排行榜 / 通知 / 等级权益 / 管理端调整 / 中文头衔 / 经验购买或兑换 / 等级影响信用分 | 保持切片最小 |
| D13 | #29 排期 | 本 change **独立基于 `origin/main`**；不等待 `add-report-credit-deduction`；两边都改 `AdminReportServiceImpl.resolve`，合并时解决冲突 | 契约 / 迁移号按「后到者顺延」 |
| D14 | 契约 / 迁移号 | P3 排他确认；基线 0.25.0 + V30；预计本 change 0.26.0 + V31（与 #29 合并顺序协调） | 不在 P1 写死 |

## 意图边界

**覆盖：**

- 成长账户：每用户 1 条总经验；初始 0；等级派生 LV1–LV5；LV5 后继续累计。
- 发布经验：首次创建已完成行程体验 +10（配置化）；按（行程, 作者）幂等；编辑 / 删除重建不再发。
- 点赞经验：单篇体验每 10 个有效赞 +5；档位锁定；取消点赞不回滚；同一档位一次。
- 每日上限：正向经验每自然日（Asia/Shanghai）≤ +20；跨档按剩余额度截断；档位仍锁定。
- 举报扣经验：所有成立举报对被举报用户 −50；每份一次；不受上限限制；最低 0。
- 经验流水：append-only，含来源 / 实发值 / 前后快照 / 时间 / 关联对象 / 幂等键。
- 后端计算与只读约束：无客户端改经验端点；他人不可见具体经验。
- 展示：6 处展示面；本人可见等级 + 当前经验 + 距下一级；他人只见等级；LV5 显示已满级。
- 配置：`routeme.growth.publish-exp` 默认 10；不提供管理端。

**不覆盖：**

- 经验明细页 / 流水列表 / 排行榜 / 等级权益 / 徽章 / 证书。
- 通知 / 推送 / 邮件。
- 管理端调整经验、管理端成长视图、配置维护界面。
- 中文等级头衔命名（只用 `LVn`）。
- 存量回填（发布 / 点赞 / 举报）。
- 等级影响信用分、限制账号、解锁功能。
- 「路线完成度」「信誉良好 / 警惕」等 #45 的履约指标（独立故事）。
- 改变点赞资格（受限 / 封禁用户点赞是否有效）——沿用现状，如需变更另开需求。

## 与现有 Living Spec / 能力的关系

- `user-credit`：**并行且完全分离**；只借鉴 append-only 账本与档位锁定范式，不读写其表与账本。`openspec/specs/user-credit/` 尚不存在（`add-credit-account` 未归档），本 change 不修改 `user-credit`。
- `trip-experiences`：消费「体验首次创建」与「点赞 / 取消点赞」事件，不改体验发布、点赞、取消点赞的既有语义；Delta 不修改 `trip-experiences`。
- `admin-console`：消费「举报成立」事件，不改举报处置表单与状态机；Delta 不修改 `admin-console`。
- `user-profile` / `user-profiles`：只在既有读取响应上追加成长字段，不改资料编辑与公开资料语义；展示契约写在 `user-growth` 内。
- `user-auth`：不改注册与登录；成长账户采用懒建（首次读取 / 写入时按 0 建）。
- `design-system`：复用既有令牌与 `.profile-credit` 相邻样式骨架，不新增主题。

## Discovery Decision

`Go` — 候选能力可一句话说清（「发布真实体验与获得社区认可会累计经验并升级 LV1–LV5，与信用分完全分离」）；与既有能力边界明确（成长归 `user-growth`，只消费体验 / 点赞 / 举报事件）；用户已裁决等级规则、发布与点赞口径、每日上限、举报扣分、展示面与可见性、存量不回填；无阻塞项。日期：2026-11-18。
