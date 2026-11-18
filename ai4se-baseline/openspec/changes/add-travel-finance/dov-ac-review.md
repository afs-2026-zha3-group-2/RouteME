# AC / DoV review — add-travel-finance

- **Change:** `add-travel-finance`（`travel-finance` ADDED，REQ-028 / S29）
- **Reviewed artifact:** [`specs/travel-finance/spec.md`](specs/travel-finance/spec.md)（10 Requirement / 40 Scenario；ADDED）
- **Inputs:** [`proposal.md`](proposal.md)、`requirement-workspace/requirements/REQ-028-travel-finance.md`、`requirement-workspace/intents/REQ-028-travel-finance.md`、`requirement-workspace/impact-brief.md` §28、`requirement-workspace/deep-dive.md`「REQ-028 增补」、`openspec/specs/trip-plans/spec.md`、`openspec/specs/trip-companions/spec.md`、`openspec/specs/user-auth/spec.md`
- **Timestamp:** 2026-11-17（保险改为第三方入口 + 状态回写后于 2026-11-18 复审）
- **Reviewer:** Karena（当前开发者）
- **Tooling:** `openspec validate add-travel-finance --strict` → `Change 'add-travel-finance' is valid`

## 复审说明（2026-11-18）

发起人明确 RouteME 不是保险机构，不设计产品、不计算保费、不承保、不参与理赔。Delta Spec 因此把原「站内三款商品 + 保费 + 5% 保险服务费」改为「第三方入口 + 状态回写」：

- 新增 R3「第三方旅行保险入口」、R4「第三方投保状态回写与保障期」；删除原商品与价格场景；
- 5% 服务费只保留在借款端（从本金扣、发放净额）；
- 保险记录只保存行程关联、提供方、保障起止日、状态与确认时刻，不保存保单号 / 证件 / 银行卡 / 保费 / 保额；
- Scenario 总数由 38 调整为 40（R3 4 / R4 5 / R5 4 的重排见映射表）。

`requirement-workspace/requirements/REQ-028-travel-finance.md` §4 仍按旧口径描述站内商品与保险 5% 费用，与本次 Delta 存在**已知源文档差异**：需求条目以发起人 2026-11-18 的口头收敛为准，Delta / Proposal / Design 已同步为第三方模式；需求条目本身的修订留给下一个文档整理窗口（见「残余风险」）。

## AC review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 Each requirement has at least one testable AC | Pass | 10 Requirement → 40 Scenario（R1 4 / R2 3 / R3 4 / R4 5 / R5 4 / R6 4 / R7 2 / R8 5 / R9 6 / R10 3） | 覆盖钱包、账本、第三方入口、状态回写与到期、借款申请、借款查询、还款与逾期、入口与账号状态、幂等与隔离 |
| AC-2 ACs are observable | Pass | 余额数值、发放净额与应还额、保险状态文字、提供方名称与入口、HTTP 错误码、流水条数均可断言 | 无「正常工作 / 快速 / 正确」类空泛表述 |
| AC-3 Negative / edge cases called out | Pass | 注册失败、重复回写、非同行者、已结束 / 取消行程、停用 / 封禁、越权读取、双击重试、余额不足、重复还款 | 覆盖越权、非法状态、金额与期限边界、并发重试 |
| AC-4 ACs are not disguised implementation detail | Pass | 场景只写用户可见行为与契约结果；未指定表结构、组件库、请求库或文件位置 | 四表与索引留在 `design.md`；第三方地址只要求「来自服务端配置」 |

## DoV review

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 Scope matches proposal | Pass | `proposal.md` In scope 12 项 ↔ 10 Requirement；Out of scope 9 项无对应需求 | 理赔、退保、罚息、充值提现、管理后台、通知、真实机构 API 均无 Scenario |
| DoV-2 Ambiguities listed or resolved | Pass | REQ-028 §8 blocking OQ = 0；D1–D12 已固化；保险到期与借款逾期均「读取时派生」 | 页面版式、端点形状与字段名留 P3 |
| DoV-3 Role concerns noted for residual risk | Pass | 下方「残余风险」 | IO：不承保 / 不参与理赔边界；SA：钱包与信用分分表、保险不产生流水；Dev：并发、配置驱动、契约号 |
| DoV-4 No business implementation claimed done | Pass | 本阶段只产出 Delta Spec；代码仅作 as-is 证据 | `proposal.md` 交付边界明确 P3 / P4 才实现 |
| DoV-5 Requirements trace to proposal / approved requirements | Pass | 下方「Requirement mapping」REQ-028 §4 → Delta 全部覆盖，含 2026-11-18 收敛 | 无孤儿场景；与旧需求条目的差异已单列并留痕 |

**Blocking gaps:** 无。G1-ready from the review's perspective；是否签署由 IO / SA 决定。

## Requirement mapping（REQ-028 §4 → Delta Spec）

| REQ-028 场景 | Delta Requirement / Scenario | 覆盖判定 |
|---|---|---|
| S29-1 注册即得钱包 | R1 / 注册成功后初始化钱包 | 完整（余额、展示、失败不落库） |
| S29-2 存量账号回填 | R1 / 存量账号补齐初始余额 | 完整 |
| S29-3 钱包唯一、余额只经账本 | R1 / 同一用户只有一个钱包；R2 / 客户端不能直接改余额 | 完整 |
| S29-4 余额与账本可回算 | R2 / 每笔余额变化都有流水、余额可由流水回算 | 完整（保险不产生流水已写明） |
| S29-5 三款固定商品 | R3 / 保障页展示行程上下文与提供方 | **收敛**：改为第三方保障类别展示，RouteME 不定义商品与价格 |
| S29-6 5% 服务费精确到分 | R6 / 净额发放与费用拆分；R10 / 金额始终为整数分 | **收敛**：5% 只作用于借款，保险不再收平台费 |
| S29-7 购买成功扣款 | R3 / 打开第三方投保入口；R4 / 投保不回写钱包 | **收敛**：投保跳转不扣款、不写记录 |
| S29-8 保障期口径 | R4 / 确认投保写入保障期 | 完整（取行程起止日，忽略客户端传入） |
| S29-9 同行程同风险一份 | R4 / 重复回写幂等；R10 / 重复提交至多生效一次 | 完整（每 (user, trip) 1 条，第二次返回既有） |
| S29-10 余额不足阻断购买 | R6 / 借款金额与期限边界；R8 / 余额不足阻断还款 | **收敛**：保险无扣款，余额不足只影响借款与还款 |
| S29-11 保单列表 | R5 / 未购买与已投保的状态展示；R4 / 保障结束日之后派生已结束 | 完整（状态 + 保障期 + 提供方） |
| S29-12 非同行者不能购买 | R5 / 非同行者不能打开入口或回写 | 完整（403、无提交按钮） |
| S29-13 已结束 / 取消不能购买 | R5 / 已结束或已取消行程不能投保 | 完整（409 `TRIP_NOT_OPEN`） |
| S29-14 借款金额边界 | R6 / 借款金额与期限边界 | 完整（99 / 2,001 / 100.50） |
| S29-15 期限边界 | R6 / 借款金额与期限边界 | 完整（仅 7 / 14 / 30） |
| S29-16 净额发放与 5% | R6 / 净额发放与费用拆分 | 完整（本金 / 服务费 / 净额 / 应还 / 流水） |
| S29-17 应还 = 本金、0 利息 | R6 / 净额发放与费用拆分；R8 / 手动还款结清 | 完整 |
| S29-18 到期时刻 | R6 / 到期时间为服务端计算 | 完整（忽略客户端值） |
| S29-19 每人 1 笔进行中 | R8 / 已有进行中借款时拒绝新申请 | 完整（还清后可再借） |
| S29-20 手动还款结清 | R8 / 手动还款结清 | 完整（扣本金、REPAID、不再收费） |
| S29-21 余额不足阻断还款 | R8 / 余额不足阻断还款 | 完整（状态不变） |
| S29-22 逾期派生无罚息 | R8 / 逾期派生且无罚息 | 完整 |
| S29-23 非同行者不能借款 | R6 / 借款资格限制 | 完整（403） |
| S29-24 已结束 / 取消不能借款 | R6 / 借款资格限制 | 完整（409） |
| S29-25 借款列表 | R7 / 借款列表字段完整 | 完整 |
| S29-26 行程详情入口 | R9 / 行程详情入口按资格显示 | 完整（含实时保险状态） |
| S29-27 账号菜单与聚合页 | R9 / 账号菜单与侧边栏入口 | 完整（均指向 `#/finance`；移动端底部导航不变） |
| S29-28 未登录 / 非同行者访问 | R9 / 未登录与无资格访问 | 完整 |
| S29-29 账号状态限制 | R9 / 停用或封禁账号不能投保或借款 | 完整（403 既有码） |
| S29-30 封禁仍可还款 | R9 / 停用或封禁仍可还款 | 完整 |
| S29-31 整数分与无浮点误差 | R10 / 金额始终为整数分 | 完整（保险无金额字段） |
| S29-32 重复提交至多扣一次 | R10 / 重复提交至多生效一次 | 完整（保险唯一、借款唯一、状态迁移） |
| S29-33 数据隔离 | R5 / 只能看到自己的保险记录；R7 / 只能看到自己的借款；R10 / 数据隔离 | 完整 |

新增且 REQ-028 §4 无对应编号的场景：R3「客户端不能改写提供方或价格」「保险不影响同行」、R4「不保存投保敏感信息」「投保不回写钱包」、R9「移动端底部导航不变」。这 5 条用于钉住第三方模式的合规边界与入口形态，已由 2026-11-18 收敛授权，不属规格外行为。

## Living Spec 基线保留

本 change 只有 `ADDED`，没有 `MODIFIED` / `REMOVED` Requirement 块，不替换任何既有 Living Spec 场景；基线保留检查为 **N/A**。

- `trip-plans`：状态词汇（招募中 / 已满员 / 旅行中 / 已结束 / 已取消）与派生顺序被复用，不改写正文。
- `trip-companions`：「已接受申请即同行者」被复用，不改写正文。
- `user-auth`：「注册成功后立即登录」被复用；钱包初始化写在 `travel-finance`，不改写「注册账号」正文。
- `design-system`：复用 `detail-section` / `card` / `chip` / `badge` 令牌，不新增主题。

## 残余风险

- **源文档差异：** `REQ-028-travel-finance.md` §4 仍写站内三款商品与保险 5% 费用，与收敛后的 Delta 不一致；本次以发起人口头收敛为准，需求条目待后续文档窗口修订。
- 3 个新增业务码（`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE`）在 P3 已入契约；`POLICY_EXISTS` 已退休。
- 余额扣减的并发控制已定 CAS 条件更新 + 0 行重读，并配 `WalletServiceImplTest`；并行压测仍 deferred。
- 契约版本与迁移号已按合并顺序落定 0.25.0 + `V30`（main 为 0.24.0 + V28 / V29）。
- 第三方真实投保无法在本期完成：演示环境用 `routeme.insurance.*` 配置 + 演示确认端点；真实回调、验签与对账列入 Out of scope。
- 借款到期按「发放时刻 + N 天」的 `Instant` 计算，已注入 `Clock` 固化，避免部署时区影响。

## 结论

AC 4/4 Pass、DoV 5/5 Pass、映射 REQ-028 §4 全覆盖（含 5 条收敛说明）、基线保留 N/A。**无阻塞项**，可提交 G1 由 IO / SA 签署。