# REQ-028 意图捕获 — 旅行保障与小额借款

- **需求编号：** REQ-028
- **Change：** `add-travel-finance`
- **能力：** `travel-finance`（ADDED）
- **来源：** 发起人 2026-11-17 原始诉求
- **优先级：** P0 ｜ **迭代：** 旅行金融 1 ｜ **规模：** M（2 个页面 + 4 张表 + 6 个端点 + 钱包记账）
- **状态：** Go / P4 implemented；阻塞 OQ 0

## 1. 原始诉求

> i want new feature:
> - able to buy insurance for accident / death / stomachache during travel from insurance company
> - able to loan small amount of money for travel support from bank
> - we charge 5% for service fee

## 2. 一句话意图

已加入某条行程的旅行者，可以在 RouteME 内用演示钱包进入第三方旅行保险入口（RouteME 不承保、不定价），或借一笔 100–2,000 元的小额周转金；平台对借款本金收 5% 服务费、按日计息，逾期按日计罚息，所有借款、费用与余额变化都留有可核对的账本和记录。

## 3. 角色

| 角色 | 边界 |
|---|---|
| 旅行者（发布者） | 可为自己发布的行程打开第三方保险入口、申请借款；可查看自己的钱包、保险状态与借款。 |
| 同行者（`ACCEPTED` 申请者） | 与发布者同权限。 |
| 非同行者 / 未登录访客 | 不能投保或借款；只能看到入口说明或登录提示。 |
| 系统 | 维护钱包与账本、第三方保险入口与状态回写、借款、5% 服务费、利息与罚息、还款与到期判断；不做真实保险 / 银行对接。 |

## 4. 用户裁决（D1–D10）

| id | 问题 | 结论 | 理由 |
|---|---|---|---|
| D1 | 钱怎么流动 | **演示钱包**：每用户一个余额；借款净额入账、还款扣本金 + 利息 + 罚息；第三方投保留存状态、不改变余额；余额不足阻断借款 / 还款 | 没有余额就无法验证「借得到 / 还得起」，也无法证明 5%、利息与罚息真的被扣 |
| D2 | 5% 服务费作用范围 | **仅借款**：本金先扣 5%，发放净额；保险由第三方定价与收费，RouteME 不加收平台费 | 与发起人原话「we charge 5% for service fee」一致；保险不越界定价 |
| D3 | 借款规则 | 本金 **100–2,000 元整**；期限 **7 / 14 / 30 天**；即时通过；5% 服务费；利息 **0.05%/日 × 期限**；逾期罚息 **0.1%/日 × 已开始逾期天数**；**每人最多 1 笔进行中借款**；支持手动还款与到期日 | 「small amount」需要可判定的上下界；按日计息与罚息让成本可计算、可对账；单笔进行中避免演示出现多债叠加 |
| D4 | 保险模式 | **第三方入口 + 状态回写**：提供方与入口来自配置；保障期 = 行程起止日；RouteME 不定义商品 / 保费 / 保额 | 发起人要求从 insurance company 购买；RouteME 不承保、不定价，合规边界清晰 |
| D5 | 谁可以投保 / 借 | 行程发布者 + 该行程 `ACCEPTED` 同行者；行程状态为 `recruiting` / `full` / `ongoing` | 服务是「旅行支持」，不是无场景现金贷；已完成 / 已取消行程不再产生新交易 |
| D6 | 入口 | 行程详情页 + 账号菜单进入新的「旅行保障」页；账号侧另有聚合页查看全部保险状态与借款 | 原话是「during travel」，行程是最自然的上下文；账号侧负责「我投过什么 / 借过什么」 |
| D7 | 能力与命名 | change = `add-travel-finance`；capability = `travel-finance`；一个 change 覆盖保险入口 + 借款 | 两者共用钱包、资格、页面与契约；拆成两个 change 会复制钱包与资格逻辑 |
| D8 | 金额口径 | 数据库与契约统一整数分（`*_cents`），币种 CNY；借款只接受整元，保证 5% 恒为整数分 | 避免浮点误差与四舍五入争议；与既有 `budget_*_cents` 一致 |
| D9 | 外部对接 | **不对接**真实保险公司或银行；不做出核保、KYC、真实放款 | demo 项目没有外部凭据与合规链路；即时通过用于演示完整流程 |
| D10 | 明确不做 | 理赔 / 给付、退保、分期 / 复利、罚息封顶、提现 / 充值、发票、管理后台金融视图、通知、信用分影响 | 第一切片只验证「入口可达、状态可对、借得到、利息 / 罚息算得对、账对得上」 |

## 5. 现状与缺口

| 现状 | 缺口 |
|---|---|
| 账户只有资料、角色、状态；没有余额 | G-01 无钱包与账本 |
| 行程有发布者与 `ACCEPTED` 申请者，但没有金融身份 | G-05 无资格派生与入口 |
| 金额只出现在行程预算（分） | G-04 无服务费、利息、罚息与费用拆分 |
| 市场只有行程 / 体验 / 聊天 | G-02 无保险入口与保险记录 |
| 没有任何借贷概念 | G-03 无借款、到期、利息、罚息与还款 |
| 测试有 661 后端 / 514 前端基线 | G-06 无金融写入的测试夹具与边界场景 |

## 6. 证据锚点

- `RouteME/backend/src/main/java/routeme/entity/TripPlanEntity.java`、`routeme/pojo/TripPlan.java`（行程、参与人数、日期与状态派生）
- `RouteME/backend/src/main/java/routeme/entity/TripApplicationEntity.java`、`routeme/enums/ApplicationStatusEnum.java`（同行者判定）
- `RouteME/backend/src/main/java/routeme/service/AccountStatusService.java`、`routeme/enums/WriteScopeEnum.java`（写守卫）
- `RouteME/backend/src/main/java/routeme/service/impl/AuthServiceImpl.java`（注册同事务初始化）
- `RouteME/backend/src/main/resources/db/migration/V20__add_credit_account.sql`（账户 + 账本 + 幂等的既有范式）
- `RouteME/frontend/src/route.ts`、`App.tsx`、`shell/AppShell.tsx`、`trips/TripDetailPage.tsx`、`api.ts`、`types.ts`
- `docs/sdd/add-travel-finance/p0-baseline.md`（G-01 ~ G-06）

## 7. 排除项

- 真实保险 / 银行 API、支付网关、银行卡绑定、KYC、征信。
- 理赔申请、审核、给付、拒赔、退保、保单批改。
- 借款展期、分期、提前结清优惠、复利、罚息封顶、催收、征信上报。
- 钱包充值 / 提现 / 转账、多币种、汇率。
- 管理后台金融订单、风控后台、财务报表、发票。
- 信用分加减、通知推送、邮件 / 短信。
- 改变行程状态机、申请规则、聊天权限。

## 8. Discovery 结论

**Go（light intake）。** 能力可一句话表述，与现有信用分 / 行程预算概念不重叠；第三方保险入口与小额借款共享钱包、资格与页面，适合一个垂直切片；阻塞问题 0。进入 P1 提案与 Delta Spec。

## 9. 残余风险

| 风险 | 处理 |
|---|---|
| 「bought insurance」可能被理解为含理赔 | D10 明确本切片只到第三方入口与状态回写；理赔由第三方负责 |
| 5% 在借款端可能被理解为加到还款额 | D2 明确「从发放额扣」；Delta 用净额 / 应还额两个字段写死 |
| 利息与罚息被误解为复利或一次性罚金 | 明确按本金 × 日利率 × 天数线性计算；罚息不封顶、不计复利 |
| 演示钱包初始余额过高显得不真实 | 统一 10,000 元，足够覆盖最高借款；README 标注 demo |
| 契约 / 迁移号与在途变更冲突 | 已按后到者顺延规则落定 0.28.0 + `V32`（main 当时为 0.27.0 + `V31`；其后通知变更到 0.29.0 + `V33`） |
| 封禁用户无法还款导致债务永续 | P3 决定：投保 / 借款要求 ACTIVE，还款不受状态阻断 |