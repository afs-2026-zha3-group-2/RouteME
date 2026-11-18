# REQ-033 — 用户成长等级 LV1–LV5（Ready 需求）

- **能力：** `user-growth`（ADDED；独立于 `user-credit`）
- **对应 OpenSpec change：** `add-growth-level`
- **草稿日期：** 2026-11-18 ｜ **状态：** P2 定稿（G1 Conditional，2026-11-18；blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** GitHub Issue [#44](https://github.com/afs-2026-zha3-group-2/RouteME/issues/44)「用户成长等级 LV1–LV5」（P1 / 迭代 3 / 故事点 3 / 落点页面「用户主页 / 行程详情 / 同行者信息」）
- **证据：** `RouteME/backend/src/main/java/routeme/service/ExperienceEligibility.java`（仅已完成行程 + 同行者）；`RouteME/backend/src/main/java/routeme/service/impl/ExperienceServiceImpl.java`（`upsert` 按行程 + 作者唯一，返回 `created`）；`RouteME/backend/src/main/java/routeme/service/impl/ExperienceLikeServiceImpl.java`（自赞拒绝、取消删行）；`RouteME/backend/src/main/resources/db/migration/V24__add_experience_likes.sql`；`RouteME/backend/src/main/java/routeme/service/impl/ExperienceLikeRewardServiceImpl.java`（信用侧的档位锁定范式）；`RouteME/backend/src/main/java/routeme/service/impl/AdminReportServiceImpl.java`（RESOLVED 分支）；`RouteME/backend/src/main/java/routeme/service/ReportTargetService.java`（`reportedUserId`）；`RouteME/backend/src/main/java/routeme/controller/UserProfileController.java`（`/profile` 与 `/credits`）

## Discovery Decision

**Go（light intake，2026-11-18）。** 能力边界单一：成长等级归新能力 `user-growth`，与 `user-credit` 完全分离；只消费「体验首次创建」「点赞 / 取消点赞」「举报成立」三类既有事件；用户已裁决等级、发布、点赞、上限、举报、展示与存量口径。无阻塞项。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-033 |
| statement | 系统 SHALL 为每个用户维护独立的成长经验账户：初始 LV1 / 0 EXP；每 100 EXP 升一级，最高 LV5（400+，之后继续累计经验）；发布「已完成行程」的体验 SHALL 首次获得配置化经验（默认 +10），每篇体验每累计 10 个有效点赞 SHALL 结算 +5（分档锁定、取消不回滚）；正向经验每自然日（Asia/Shanghai）SHALL 最多 +20，跨档按剩余额度截断；举报成立 SHALL 对被举报用户扣 50 EXP（每份一次、不受上限限制、最低 0）；每次经验变化 MUST 写入 append-only 流水；等级 MUST 由后端按总经验派生，前端不得加减；本人 SHALL 可见等级、当前经验与距下一级，他人 SHALL 只可见等级。 |
| actors | 普通用户（发布体验、收到点赞、被举报扣分、查看自己的成长进度）；其他用户（在主页 / 详情 / 同行者卡片看到等级）；管理员（举报处置触发扣分，但不直接修改经验）；平台（结算、派生等级、展示数据）。 |
| rationale | 信用分表达「可信 / 风险」，无法表达「持续参与与贡献」的正向成长；issue 明确要求成长等级与信用分分离。现有体验发布与点赞已有完整事件，可低成本接入一条独立的正向反馈链。 |
| acceptance hints | 见 §4 场景 L-1 ~ L-6 / P-1 ~ P-5 / K-1 ~ K-6 / D-1 ~ D-5 / R-1 ~ R-6 / V-1 ~ V-6 / C-1 ~ C-3 / S-1 ~ S-4。 |
| links to evidence | 见 §6 Context 与 `intents/REQ-033-growth-level.md` 的现状核对表。 |

## 1. Intent

一句话：让「发布真实体验 → 被社区认可 → 积累经验 → 提升等级」成为一条可见、可累计、与信用风险解耦的正向链路；用户能看到自己的成长进度，其他用户能看到等级但看不到具体经验值。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 普通用户 | 可发布体验、点赞他人体验、查看自己的成长进度；不可自行改经验或等级；不可查看他人的具体经验值。 |
| 其他用户 / 访客 | 在 6 个展示面看到 `LVn`；看不到具体经验值；访客仍受既有登录门禁约束。 |
| 管理员 | 通过既有举报处置把举报判为成立，间接触发被举报用户 −50 EXP；无直接调整经验或配置的端点。 |
| 平台 | 结算发布 / 点赞经验，执行每日上限与幂等，派生等级，提供只读展示数据。 |

## 3. In / Out scope

**In scope**

- 成长账户：每用户 1 条总经验（初始 0）；迁移为存量用户建 0 账户；新用户懒建；等级由总经验派生，V5 后继续累计。
- 发布经验：首次创建「已完成行程」的体验 +10（配置项 `routeme.growth.publish-exp`，默认 10）；按（行程, 作者）幂等。
- 点赞经验：单篇体验每累计 10 个有效点赞 +5；档位（10/20/30…）锁定；取消点赞不回滚。
- 每日上限：正向经验每自然日（Asia/Shanghai）最多 +20；跨档按剩余额度截断；档位仍锁定、不次日补发。
- 举报扣经验：所有 RESOLVED 举报对被举报用户 −50；每份一次；不受每日上限限制；经验最低 0；等级随经验回退。
- 经验流水：append-only；来源 / 实发值 / 前后快照 / 时间 / 关联对象 / 幂等键。
- 展示：6 处展示面；本人可见等级 + 当前经验 + 距下一级；他人只见等级；LV5 显示已满级。
- 读接口：在既有个人主页响应与批量信用读取响应上追加成长字段（只读；具体形状 P3 定）。

**Out of scope**

- 经验明细页 / 流水列表 / 排行榜 / 等级权益 / 徽章 / 证书。
- 通知 / 推送 / 邮件。
- 管理端调整经验、管理端成长视图、配置维护界面。
- 中文等级头衔命名（只用 `LVn`）。
- 存量回填（历史发布 / 历史点赞 / 已处理举报）。
- 等级影响信用分、限制账号或解锁功能。
- 「路线完成度」「信誉良好 / 警惕」等 #45 的履约指标（独立故事）。
- 改变点赞资格（受限 / 封禁用户点赞是否有效）——沿用现状，如需变更另开需求。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 等级与初始值

1. **L-1 新用户初始值** — Given 一个新注册或从未产生经验的用户，When 读取成长信息，Then SHALL 返回 `LV1` / `0 EXP`，MUST NOT 报错。
2. **L-2 100 边界** — Given 99 EXP，When 获得 1 EXP，Then SHALL 为 `LV2` / 100 EXP；Given 99 EXP 只获得 0（被上限截断），Then SHALL 仍为 `LV1`。
3. **L-3 400 边界** — Given 399 EXP，When 获得 1 EXP，Then SHALL 为 `LV5` / 400 EXP；Given 300 EXP，Then SHALL 为 `LV4`。
4. **L-4 LV5 后继续累计** — Given 400 EXP 且 LV5，When 再获得正向经验，Then 等级 SHALL 保持 `LV5`，总经验 SHALL 继续增加（如 450），展示 SHALL 为 `400+` / 已满级。
5. **L-5 存量用户不回填** — Given 上线前已发布多条体验、已有点赞、已有成立举报的用户，When 读取成长信息，Then SHALL 为 `LV1` / `0 EXP`，MUST NOT 因历史事件补发经验。
6. **L-6 等级只由后端派生** — Given 任意客户端请求，When 尝试提交等级或经验字段，Then MUST NOT 存在可修改经验 / 等级的写端点；响应中的等级 MUST 由服务端按总经验派生。

### B. 发布经验

7. **P-1 首次发布** — Given 用户是某条已完成行程的发布者或已接受同行者且尚无该行程的体验，When 首次创建体验，Then SHALL +10 EXP（默认配置），并写一条来源为「发布体验」的流水。
8. **P-2 编辑或重复提交** — Given 已因该（行程, 作者）获得过发布经验，When 再次编辑或重复提交体验，Then SHALL +0，MUST NOT 产生第二条发布经验。
9. **P-3 删除后重建** — Given 体验已删除，When 同一（行程, 作者）重新创建体验，Then SHALL +0（幂等键保留），MUST NOT 重新发放。
10. **P-4 配置化生效** — Given 配置 `routeme.growth.publish-exp` 为 20，When 首次创建体验，Then SHALL +20；已发放的历史记录 MUST NOT 被重算。
11. **P-5 未完成行程 / 草稿** — Given 行程未结束，When 用户尝试发布体验，Then SHALL 沿用既有发布资格拒绝，MUST NOT 产生经验流水。

### C. 点赞经验

12. **K-1 第 10 个赞** — Given 某篇体验当前 9 个有效赞，When 第 10 个有效赞产生，Then 作者 SHALL +5 EXP。
13. **K-2 第 20 个赞** — Given 同一篇体验已结算第 10 档，When 第 20 个有效赞产生，Then 作者 SHALL 再 +5 EXP（累计 +10）。
14. **K-3 同档只结算一次** — Given 第 10 档已结算，When 赞数在 11–19 之间继续增加，Then MUST NOT 再产生第 10 档奖励；同一档位 MUST NOT 重复结算。
15. **K-4 取消点赞不回滚** — Given 某档位已结算，When 点赞被取消、赞数回落到档位以下，Then 已发经验 MUST NOT 回滚；随后重新点赞 MUST NOT 重复结算该档位。
16. **K-5 自赞无效** — Given 体验作者尝试点赞自己的体验，When 请求点赞，Then SHALL 沿用既有拒绝，MUST NOT 产生有效赞或经验。
17. **K-6 多篇体验独立分档** — Given 同一作者有多篇体验，When 各篇分别达到 10 个有效赞，Then SHALL 按篇分别结算 +5，互不吞并。

### D. 每日上限

18. **D-1 当日达到 20 后停止** — Given 当日已通过发布 +10、点赞 +5、点赞 +5 累计 20 正向经验，When 当日再获得任意正向事件，Then 当日 SHOULD NOT 再增加经验。
19. **D-2 跨档按剩余额度截断** — Given 当日已得 18 正向经验，When 一笔 +5 的点赞档位达到，Then SHALL 只实发 +2（当日合计 20），流水 `applied_delta = +2`。
20. **D-3 截断档位仍锁定** — Given 某点赞档位因上限被截断为 +2 或 +0，When 次日再次满足该档位，Then MUST NOT 补发；该档位的幂等记录 SHALL 已存在。
21. **D-4 负向不受上限限制** — Given 当日已得 20 正向经验，When 一笔举报成立扣 50，Then SHALL 实际扣减（总经验 −50），MUST NOT 因每日正向上限而被阻止。
22. **D-5 日界按北京时间** — Given 北京时间 00:00（UTC 前一日 16:00）前后各发生一笔正向事件，When 结算，Then SHALL 分属两个自然日，各自重新享有 20 上限。

### E. 举报扣经验

23. **R-1 举报成立扣 50** — Given 一份举报被管理员判为 RESOLVED，When 处理完成，Then 被举报用户 SHALL −50 EXP，并写一条来源为「举报成立」的流水（关联举报 id）。
24. **R-2 同一举报只扣一次** — Given 同一份举报已扣过 50，When 重复提交处理或重试，Then MUST NOT 再扣第二次。
25. **R-3 举报驳回不扣** — Given 举报被判为 REJECTED，When 处理完成，Then 被举报用户经验 MUST NOT 变化。
26. **R-4 不足 50 时扣到 0** — Given 被举报用户当前 30 EXP，When 举报成立，Then SHALL 变为 0 EXP（实扣 −30），MUST NOT 出现负数；流水 `applied_delta = −30`。
27. **R-5 历史举报不回填** — Given 上线前已有 RESOLVED 举报，When 读取成长信息，Then MUST NOT 补扣经验。
28. **R-6 等级随经验回退** — Given 120 EXP / LV2，When 举报成立扣 50，Then SHALL 为 70 EXP / LV1；等级 MUST 由当前总经验派生。

### F. 展示与可见性

29. **V-1 本人主页** — Given 用户本人打开个人主页，When 展示成长信息，Then SHALL 显示 `LVn`、当前经验与距离下一级所需经验；LV5 时 SHALL 显示已满级。
30. **V-2 他人主页 / 资料弹窗** — Given 其他用户打开该用户的个人主页或资料弹窗，When 展示成长信息，Then SHALL 只显示 `LVn`，MUST NOT 返回或展示具体经验值。
31. **V-3 其余展示面** — Given 行程详情发布者区、首页行程卡、申请处理页申请者行、详情同行者卡片，When 渲染该用户，Then SHALL 在昵称附近显示 `LVn`。
32. **V-4 LV5 展示** — Given 450 EXP，When 展示，Then 等级 SHALL 为 `LV5`，文案 SHALL 为已满级 / `400+`，MUST NOT 显示 `LV6`。
33. **V-5 与信用分区分** — Given 同一展示面同时有信用分与成长等级，When 渲染，Then 两者 SHALL 并列且文案可区分；MUST NOT 把成长等级称为信用分、信用等级或官方安全认证。
34. **V-6 批量读取只返回等级** — Given 页面一次读取多名用户的成长信息，When 调用批量只读接口，Then SHALL 只返回 `LVn`，MUST NOT 返回具体经验值或经验明细。

### G. 并发与幂等

35. **C-1 并发点赞同档** — Given 同一篇体验并发产生跨过同一档位的多个点赞，When 结算，Then 该档位 SHALL 只落一条奖励流水，总经验只增加一次。
36. **C-2 并发举报处理** — Given 同一份举报被并发处理为成立，When 结算，Then SHALL 只扣一次 50，MUST NOT 出现双扣。
37. **C-3 并发发布 / 重试** — Given 同一（行程, 作者）并发或重试创建体验，When 结算发布经验，Then SHALL 只发放一次。

### H. 数据与契约边界

38. **S-1 流水可回算** — Given 任意用户，When 读取成长账户与流水，Then 每条流水 MUST 满足 `exp_before + applied_delta = exp_after` 且 `exp_after ≥ 0`；账户总经验 MUST 可由流水回算。
39. **S-2 无客户端写入口** — Given 任意客户端，When 尝试直接设置经验或等级，Then MUST NOT 存在该写端点；经验只能由发布 / 点赞 / 举报事件触发。
40. **S-3 账户缺失** — Given 用户尚无成长账户，When 读取或结算，Then SHALL 按 0 EXP 懒建账户，MUST NOT 报错；读取 MUST NOT 产生经验变化。
41. **S-4 用户不存在** — Given 不存在的用户 id，When 触发结算或读取，Then SHALL 沿用既有 `USER_NOT_FOUND` 口径。

## 5. Constraints

- **单一写入口：** 所有经验变化只经成长经验服务（`GrowthService.book` 类）写入；不新增第二条写经验路径；账户总经验与流水 MUST 同事务。
- **账户唯一：** `user_growth_account` 每用户 1 条；迁移为存量用户建 0 账户；新用户懒建。
- **等级派生：** 等级不落库，读取时由总经验派生；LV5 后继续累计经验。
- **上限派生：** 每日已用额度从当天流水 `applied_delta` 求和派生，不建计数表。
- **幂等键：** 发布按（行程, 作者）、点赞按（体验, 档位）、举报按举报 id；零实发也留流水（用于锁定与审计）。
- **时区：** 自然日按 `Asia/Shanghai`（UTC+8）计算，与既有信用 / 出行口径一致。
- **配置：** `routeme.growth.publish-exp` 默认 10，正整数值；不提供管理端。
- **不回填：** 历史发布 / 点赞 / 已处理举报不补发、不补扣。
- **只读展示：** 他人只可见等级；本人可见当前经验与距下一级；具体字段形状 P3 定。
- **契约 / 迁移排他：** 基线 `openapi.yaml` 0.26.0、Flyway 头 `V31__report_credit_deduction.sql`（#29 已并入 main）；本 change 落定 0.30.0 + V34，P3 排他确认。
- **#29 冲突：** #29 已并入 main（`f2bad40`），`AdminReportServiceImpl.resolve` 已有「扣信用分」；本 change 在其后并列追加「扣成长经验」，不覆盖既有副作用。

## 6. Context（证据）

| 事实 | 证据 |
|---|---|
| 成长能力不存在 | backend / frontend grep `user_growth` / `growth_level` / `exp_total` / `成长等级` → 0 命中 |
| 体验发布资格 | `ExperienceEligibility.requireCanShare`：已完成 + 发布者 / 接受同行者 |
| 体验唯一 | `ExperienceServiceImpl.upsert`：`(tripId, authorId)` 查询；`created` 返回是否新建 |
| 点赞与取消 | `ExperienceController` 的 `POST / DELETE /api/experiences/{experienceId}/likes`；`ExperienceLikeServiceImpl` 自赞拒绝；取消删行 |
| 信用获赞档位锁定 | `ExperienceLikeRewardServiceImpl` + `ExperienceLikeConstant`（`EXPERIENCE_LIKE:{tripId}:{authorId}:{tier}`） |
| 举报成立定位用户 | `AdminReportServiceImpl.resolve`；`ReportTargetService.reportedUserId` |
| 举报只处理一次 | 条件更新 `PROCESSING → RESOLVED / REJECTED`，失败抛 `ReportNotProcessingException` |
| 展示入口 | `GET /api/users/{userId}/profile`；`GET /api/users/credits?ids=`；前端 5 个信用面 + `CompanionCard` |
| 配置范式 | `routeme.config.*Properties`；`application.yaml` 的 `routeme:` 根（`ai` / `profile` / `experience` / `credit` / `amap` / `weather`） |
| 契约 / 迁移头 | `openapi.yaml` 0.25.0；`V30__add_travel_finance.sql` |

## 7. Affected capabilities

| 能力 | 变更类型 | 说明 |
|---|---|---|
| `user-growth` | ADDED | 成长账户、经验流水、等级派生、发布 / 点赞 / 举报结算、展示契约 |
| `trip-experiences` | 依赖（只读事件） | 消费首次发布、点赞、取消点赞；不改体验语义，Delta 不修改 |
| `admin-console` | 依赖（只读事件） | 消费举报 RESOLVED；不改处置表单与状态机，Delta 不修改 |
| `user-profile` / `user-profiles` | 依赖（只读展示） | 在既有读取响应上追加成长字段；不改资料语义 |
| `user-credit` | 并行（完全分离） | 不读写信用表与账本；展示并列但语义区分 |
| `user-auth` | 不改 | 成长账户懒建，不改注册与登录 |

## 8. Open questions

| 类型 | 状态 | 问题 | owner | 说明 |
|---|---|---|---|---|
| blocking | resolved（D1） | 与信用分的关系 | IO / SA | 完全分离，独立能力与账本 |
| blocking | resolved（D2 / D15） | 等级区间与扣分后是否回退 | IO | LV1–LV5；等级随总经验回退 |
| blocking | resolved（D3） | LV5 之后 | IO | 继续累计经验，等级封顶 |
| blocking | resolved（D4） | 存量回填 | IO | 不回填；初始 LV1 / 0 |
| blocking | resolved（D5） | 发布经验值与配置 | IO / Dev | 配置默认 10，可改 |
| blocking | resolved（D6） | 点赞结算口径 | IO | 单篇体验分档锁定，取消不回滚 |
| blocking | resolved（D7） | 举报扣经验范围 | IO | 所有成立举报，每份 −50，最低 0 |
| blocking | resolved（D8） | 每日上限与跨档 | IO / SA | +20/日，Asia/Shanghai，按剩余额度截断，档位锁定 |
| blocking | resolved（D9） | 流水要求 | SA / Dev | append-only，含来源 / 实发 / 前后快照 / 关联 / 幂等 |
| blocking | resolved（D10 / D11） | 计算与可见性 / 展示面 | IO | 后端计算；本人可见经验，他人只见等级；6 处展示面 |
| blocking | resolved（D12） | 明确不做 | IO | 明细页 / 排行榜 / 通知 / 权益 / 管理端 / 中文头衔 |
| blocking | resolved（D13 / D14） | #29 排期与编号 | IO / Dev | 独立基于 origin/main；契约 / 迁移 P3 排他 |
| non-blocking | resolved | OQ-4 流水是否对用户可见 | IO | 不展示，仅审计与回算 |
| non-blocking | resolved | OQ-9 等级阈值是否可配置 | SA | 固定 100 / 级，不配置 |
| non-blocking | deferred | OQ-1 契约版本号与迁移号 | Dev | P3 排他 |
| non-blocking | deferred | OQ-2 批量读取形状（扩展现有 credits vs 新端点） | Dev | P3 |
| non-blocking | deferred | OQ-3 响应字段命名与端点路径 | Dev | P3 |
| non-blocking | deferred | OQ-5 配置项命名与生效方式 | Dev | P3；默认 `routeme.growth.publish-exp: 10`，重启生效 |
| non-blocking | deferred | OQ-6 展示样式与原型截点 | Dev / SA | P3 原型先行 |
| non-blocking | deferred | OQ-7 受限 / 封禁用户点赞是否计入有效赞 | IO | 沿用现状；如需变更另开需求 |
| non-blocking | deferred | OQ-8 #29 合并冲突处理 | Dev | P4 合并时并列保留两个副作用 |

## 9. DoR 自检（12 项）

| # | 结果 | 说明 |
|---|---|---|
| 1 Intent clear | Pass | 一句话可对外：发布真实体验与获得认可累计经验并升级，与信用分分离 |
| 2 Actors defined | Pass | 普通用户 / 其他用户 / 管理员 / 平台，权限边界明确 |
| 3 Scope bounded | Pass | In / Out 均非空；明细页、排行榜、通知、管理端、回填、#45 均排除 |
| 4 Scenarios concrete | Pass | 41 条，均含可观察结果（等级、经验、流水、展示字段） |
| 5 Exception / boundary | Pass | 99/100、399/400、不足 50、截断、并发、缺账户、用户不存在 |
| 6 Results verifiable | Pass | 等级、经验、实发值、流水等式、展示字段均可断言 |
| 7 Dependencies / touchpoints | Pass | 体验发布 / 点赞 / 举报成立 / 资料读取 / 配置 / 契约与迁移均已列出 |
| 8 Open-questions gate | Pass | blocking 13 条全部 resolved；非阻塞 2 resolved + 8 deferred 有 owner |
| 9 Data contract decided | Pass | 账户 / 流水 / 派生等级 / 配置 / 点赞来源均在 `deep-dive.md`「REQ-033 增补」 |
| 10 Boundary enumerated | Pass | 发布 / 点赞 / 上限 / 举报 / 展示 / 并发 / 数据边界逐分支归属 |
| 11 Cross-REQ aligned | Pass | `user-credit` 分离、`trip-experiences` / `admin-console` / `user-profile` 只读消费 |
| 12 Notification / display contract decided | Pass | 6 处展示面 × 本人 / 他人可见性 × 批量只读，均在 deep-dive ④ |

**DoR 结论：** BLOCKER 0 / WARNING 0 / SUGGESTION 0。可交 G1；P2 可将 41 条场景收敛为 Delta 场景。
