# REQ-019 — issue #28 取消行程（Ready 需求草稿）

- **能力：** `trip-cancellation`（ADDED）
- **对应 OpenSpec change：** `add-trip-cancel`
- **草稿日期：** 2026-11-17 ｜ **状态：** P1 drafted（blocking OQ 0，DoR BLOCKER 0）
- **故事来源：** issue #28「[P0] 取消行程」（迭代 2 / 3 点 / 落点页面：我的旅行 / 行程详情页）
- **证据：** `requirement-workspace/intents/REQ-019-trip-cancel.md`；`docs/sdd/add-trip-cancel/p0-baseline.md`；`openspec/specs/trip-plans/spec.md`「浏览未结束的旅行计划」；`RouteME/backend/.../TripPlan.java`、`TripPlanServiceImpl.java`、`ApplicationServiceImpl.java`、`ChatServiceImpl.java`、`MyTripsServiceImpl.java`、`UserProfileStatsServiceImpl.java`、`ExperienceServiceImpl.java`；`RouteME/frontend/src/trips/TripDetailPage.tsx`、`mine/MyTripsPage.tsx`；`RouteME/openapi.yaml`；`docs/prototype/ui.js:410`、`main.js:646`

## Discovery Decision

**Go（light intake，2026-11-17）。** 理由：候选能力可一句话表述——「发布者在招募中/已满员时取消自己的行程，进入不可恢复的已取消终态，并联动列表、申请、聊天、我的旅行与统计」；与 `trip-plans` / `trip-companions` / `trip-experiences` 的边界清晰；信用分明确排除；无阻塞项。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-019 |
| statement | 为行程增加「已取消（CANCELLED）」终态：仅发布者、仅在招募中或已满员时可取消；取消必须选择原因（8 项，选「其他」需填写 ≤100 字说明）并经二次确认；取消后行程从首页/匹配列表下架，申请入口关闭、待处理申请自动取消，已接受同行者保留但聊天只读并提示「该行程已取消」，我的旅行保留历史并显示「已取消」，取消原因仅发布者与已接受同行者可见；取消不可恢复。 |
| actors | 行程发布者（唯一可取消）；已接受同行者（保留关系、聊天只读、可见原因）；待处理申请者（申请自动取消、只看到已取消状态）；其他浏览者（列表不再可见，详情仅见状态）；系统（善后联动与统计口径）。 |
| rationale | 现行只有「标记为已结束」，会把未发生的行程伪装成已完成并开放体验入口；同时首页、申请、聊天、统计都没有取消语义。 |
| acceptance hints | 见 §4 场景 S19-1 ~ S19-20（权限、可取消状态、原因与确认、状态迁移、列表/申请/聊天/我的旅行/统计联动、可见性、幂等与兼容）。 |
| links to evidence | 见上方证据路径与 P0 缺口 G-01 ~ G-12。 |

## 1. Intent

一句话：发布者无法出行时，可以在详情页或我的旅行里取消自己的行程——选原因、看确认、点确认后行程变成「已取消」；首页不再出现，申请关闭，聊天只读，历史仍在，且不能恢复。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 行程发布者 | 唯一可执行「取消行程」；仅当行程为招募中或已满员；必须选择原因并二次确认；取消后不可恢复。 |
| 已接受同行者 | 关系保留在历史中；聊天只读；可看到取消原因与说明；不能发表体验。 |
| 待处理申请者 | 申请自动变为已取消；只看到「已取消」状态，看不到取消原因；不能继续接受/拒绝。 |
| 已拒绝 / 已取消申请者 | 只看到「已取消」状态；无任何可执行动作。 |
| 其他浏览者 | 首页/匹配列表不再出现该行程；直接访问详情只看到状态，不展示原因。 |
| 系统 | 取消事务内完成状态变更、待处理申请关闭、更新时间；统计与列表按新口径读取。 |

## 3. In / Out scope

**In scope**

- 行程第五态 `CANCELLED`（已取消），终态，优先于日期与人数推导。
- 取消权限与可取消状态：仅发布者；仅 `RECRUITING` / `FULL`。
- 取消原因字典 8 项与「其他原因」必填说明（≤100 字）。
- 二次确认：不可恢复 + 影响说明。
- 取消入口：详情页 + 我的旅行「我发布的」行内。
- 取消后联动：首页/匹配列表排除；申请入口关闭；PENDING 自动取消；ACCEPTED 保留；聊天只读；禁止结束/再次取消/编辑集合信息。
- 展示：详情与我的旅行「已取消」；原因按角色裁剪；无体验入口。
- 统计：发布者「发布行程」排除取消；「已完成」不变。
- 契约与迁移：`status` 增加 `cancelled`；取消端点与取消字段；新增取消列。

**Out of scope**

- 信用分、信用记录、扣分、免扣分申请、管理员审核（用户裁决 D1）。
- 删除行程、恢复 / 重新开启、改期改线。
- 推送、短信、邮件等外部通知。
- 取消原因的公开展示、申诉与审核流程。
- 已取消行程的体验发布、评价、退款或补偿。
- 改写 `trip-plans` / `trip-companions` 既有 Requirement 块中与取消无关的行为。

## 4. Scenarios + AC hints（SHALL 式，可观察）

### A. 权限与可取消状态

1. **S19-1 发布者取消招募中行程** — Given 当前用户是发布者且行程为「招募中」，When 用户选择「取消行程」，Then 系统 SHALL 允许进入取消流程。
2. **S19-2 发布者取消已满员行程** — Given 当前用户是发布者且行程为「已满员」，When 用户选择「取消行程」，Then 系统 SHALL 允许进入取消流程。
3. **S19-3 非发布者不能取消** — Given 当前用户不是发布者，When 查看详情或我的旅行，Then 系统 SHALL NOT 展示取消入口；绕过界面调用时服务端 SHALL 返回 403 `FORBIDDEN`，且 SHALL NOT 改变行程状态。
4. **S19-4 非可取消状态拒绝** — Given 行程为「旅行中」「已结束」或「已取消」，When 发布者尝试取消，Then 系统 SHALL 拒绝并返回 409 `TRIP_NOT_OPEN`，且 SHALL NOT 改变状态。
5. **S19-5 详情页入口条件** — Given 当前用户是发布者且行程为招募中或已满员，When 打开详情页，Then 操作区 SHALL 展示「取消行程」；其他状态或其他用户 SHALL NOT 展示。
6. **S19-6 我的旅行入口条件** — Given 当前用户是发布者，When 查看「我的旅行 · 我发布的」，Then 招募中或已满员的行程行 SHALL 展示「取消行程」；其他状态 SHALL NOT 展示。

### B. 原因与二次确认

7. **S19-7 原因必选** — Given 取消流程已打开，When 用户未选择原因即提交，Then 系统 SHALL 阻止提交并提示需要选择原因；服务端 SHALL 同样拒绝（400 `INVALID_INPUT`）。
8. **S19-8 原因字典** — Given 取消流程已打开，Then 原因选项 SHALL 恰好为：个人原因无法出行、行程时间发生变化、行程计划发生变化、同行人数不足、天气或不可抗力原因、突发疾病或受伤、安全原因、其他原因。
9. **S19-9 其他原因说明必填** — Given 用户选择「其他原因」，When 说明为空或超过 100 字，Then 前后端 SHALL 拒绝并提示；When 说明为 1–100 字，Then SHALL 允许提交。
10. **S19-10 二次确认内容** — Given 用户已选择原因并提交，Then 系统 SHALL 展示二次确认，写明「取消后不可恢复」、行程将从首页下架、待处理申请关闭、已匹配同行者可见；When 用户返回，Then 行程 SHALL 保持原状态且不写入任何取消字段。
11. **S19-11 确认后状态迁移** — Given 二次确认已打开，When 用户确认，Then 行程状态 SHALL 变为「已取消」，并记录取消时间、原因与说明。

### C. 取消后的联动

12. **S19-12 首页与匹配列表排除** — Given 一条行程已取消，When 用户查看灵感首页或匹配列表（含筛选与分页），Then 该行程 SHALL NOT 出现。
13. **S19-13 申请关闭与待处理自动取消** — Given 一条行程被取消，Then 其 PENDING 申请 SHALL 全部变为「已取消」；发布者 SHALL NOT 再接受或拒绝；新申请 SHALL 被服务端以 409 `TRIP_NOT_OPEN` 拒绝，详情页 SHALL NOT 展示申请入口。
14. **S19-14 已接受同行者保留** — Given 取消前存在 ACCEPTED 同行者，When 行程被取消，Then 这些关系 SHALL 保留在历史中，不自动退出；同行者 SHALL NOT 再发起退出或申请动作。
15. **S19-15 聊天只读** — Given 行程已取消，When 发布者或已接受同行者进入聊天，Then 历史消息 SHALL 可查看；发送消息 SHALL 被拒绝（`CHAT_READ_ONLY`），页面 SHALL 提示「该行程已取消」。
16. **S19-16 取消后禁止其他状态操作** — Given 行程已取消，When 发布者尝试结束、再次取消或编辑集合信息，Then 系统 SHALL 拒绝，且 SHALL NOT 改变状态或字段。
17. **S19-17 无体验入口** — Given 行程已取消，When 发布者或同行者查看详情，Then 页面 SHALL NOT 展示「发表游后体验」入口；绕过界面调用时服务端 SHALL 以 `EXPERIENCE_NOT_ALLOWED` 拒绝。
18. **S19-18 我的旅行历史与徽标** — Given 一条行程已取消，When 发布者查看「我发布的」、已接受同行者查看「已匹配同行」，Then 该行程 SHALL 保留并显示「已取消」；SHALL NOT 进入「已完成旅行」。
19. **S19-19 取消原因可见性** — Given 行程已取消，When 发布者或 ACCEPTED 同行者查看详情，Then SHALL 展示取消原因与说明；When PENDING 申请者或其他用户查看，Then 只展示「已取消」状态，SHALL NOT 展示原因与说明。
20. **S19-20 统计与幂等 / 兼容** — Given 发布者取消过行程，When 查看公开资料统计，Then「发布行程」SHALL 排除已取消行程、「已完成」口径不变；Given 两个请求并发取消同一行程，Then 只有一次成功，另一次 SHALL 返回 409，且取消字段只写入一次；Given 旧行程无取消字段，Then 读取 SHALL 正常，状态推导不受影响。

## 5. Constraints（仅事实，不含技术方案）

- 行程状态当前为推导值（`completedAt` + 人数 + 日期）；取消需要持久化标记，且必须优先于日期与人数推导，否则到达开始日期会被误判为旅行中。
- `trip_plans` 当前无取消列；`TripPlanMapper.xml` 的开放列表查询只排 `completed_at`，必须补取消排除条件。
- 申请状态机已有 `CANCELLED`（申请人撤回）与批量取消（行程结束）；取消行程复用「待处理 → 已取消」语义，但触发源不同。
- 聊天只读异常 `CHAT_READ_ONLY`、体验拒绝 `EXPERIENCE_NOT_ALLOWED`、行程不可操作 `TRIP_NOT_OPEN`、越权 `FORBIDDEN` 均为既有错误码。
- 取消原因 8 项为固定字典，不允许自由文本原因；「其他原因」说明 1–100 字。
- 取消原因与说明只对发布者与 ACCEPTED 同行者可见；接口需要按请求人裁剪字段。
- 无推送渠道；「通知已加入或已申请的用户」以站内页面状态展示为准。
- 取消行程 MUST 保留行程、同行关系、申请与聊天历史，不新增删除路径。
- 契约 `status` 枚举新增 `cancelled`；迁移与契约版本号与在途 `add-ai-itinerary`（V18 / 0.12.0）及并行 `add-experience-photos` 串行，暂定 V19 / 0.13.0。

## 6. Context

issue #28 在「取消行程」主目标之外还写了信用分与管理员审核。用户 2026-11-17 明确信用分属于其他 story，本次只交付取消状态机与取消后的产品闭环。当前原型已有详情页取消入口与确认文案，但没有我的旅行入口、取消态样式与原因选择；这些需要在实现前先补原型。

## 7. Affected capabilities

| 能力 / 应用架构名 | 变更 | 说明 |
|---|---|---|
| `trip-cancellation` | ADDED | 取消权限、可取消状态、原因字典、二次确认、取消后联动、可见性、统计与幂等。 |
| `trip-plans` | 只读依赖（不改 Requirement 块） | 提供行程状态与列表；Living Spec 已要求取消行程不出现在默认列表。 |
| `trip-companions` | 只读依赖（不改 Requirement 块） | 申请状态机与聊天只读能力被取消流程调用；取消侧约束写在新能力。 |
| `trip-experiences` | 只读消费（不改规则） | 体验资格仍为「已结束」，取消行程天然不满足。 |
| `user-profiles` | 只读消费（统计口径对齐） | 「发布行程」排除取消；不改接口形状。 |
| `user-auth` | 无改动 | 身份沿用现有会话 / 演示身份。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | OQ-1 取消入口落点？ | BA | 确认（D2）：详情页 + 我的旅行「我发布的」行内；原型需先行。 |
| blocking | resolved | OQ-2 取消原因可见范围？ | BA | 确认（D3）：仅发布者与 ACCEPTED 同行者；PENDING 与其他用户只见状态。 |
| blocking | resolved | OQ-3 「其他原因」说明是否必填？ | BA | 确认（D4）：必填，1–100 字，前后端同时校验。 |
| blocking | resolved | OQ-4 我的旅行如何归组？ | BA | 确认（D5）：沿用四组，取消行程留在「我发布的」/「已匹配同行」，显示「已取消」。 |
| blocking | resolved | OQ-5 待处理申请如何处理？ | BA | 确认：取消事务内全部置为「已取消」，接受/拒绝关闭。 |
| blocking | resolved | OQ-6 ACCEPTED 同行者如何处理？ | BA | 确认：保留历史关系，不自动退出；聊天只读。 |
| blocking | resolved | OQ-7 是否包含信用分与免扣分审核？ | BA | 确认（D1）：不包含，属其他 story。 |
| non-blocking | resolved | OQ-8 聊天与详情提示文案？ | BA | 确认：聊天提示必须包含「该行程已取消」；详情状态文案为「已取消」。 |
| non-blocking | resolved | OQ-9 是否做推送通知？ | BA | 确认：不做外部通知，仅站内展示。 |
| non-blocking | deferred | OQ-10 取消原因的 wire 命名、列类型与索引？ | Dev | P3 技术设计定稿。 |
| non-blocking | deferred | OQ-11 取消善后是复用 `TripCompletedEvent` 还是新增事件？ | Dev | P3 技术设计定稿；规格只约束可观察结果。 |

blocking 项 = 0 未 resolved，满足进入 impact / split 的硬门。

## DoR 自检（Base 8，草稿）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 | ①意图清晰 | 通过 |
| — | resolved | §2 | ②角色与权限边界已列 | 通过 |
| — | resolved | §3 | ③in/out scope 明确（信用分明确排除） | 通过 |
| — | resolved | §4 | ④场景可观察（20 条） | 通过 |
| — | resolved | §4 S19-3/4/9/16/17/20 | ⑤含异常与越权场景 | 通过 |
| — | resolved | §5 / §8 OQ-1 ~ OQ-9 | ⑥业务规则与边界已裁决 | 通过 |
| — | resolved | §7 | ⑦能力归属清晰（取消归 `trip-cancellation`，申请/聊天只读消费） | 通过 |
| — | resolved | §8 | ⑧blocking 开放问题已清零 | 通过 |

**DoR BLOCKER 计数 = 0。** deep-dive ⑨–⑫ 见 `requirement-workspace/deep-dive.md`「Deep-dive 增补 — REQ-019」：⑨ 数据契约、⑩ 边界、⑪ 跨 REQ、⑫ 展示契约均通过。
