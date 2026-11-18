# REQ-028 意图捕获 — 旅行保障与小额借款

- **需求编号：** REQ-028
- **Change：** `add-travel-finance`
- **能力：** `travel-finance`（ADDED）
- **来源：** 发起人 2026-11-17 原始诉求
- **优先级：** P0 ｜ **迭代：** 旅行金融 1 ｜ **规模：** M（2 个页面 + 5 张表 + 6 个端点 + 钱包记账）
- **状态：** Discovery Go；阻塞 OQ 0

## 1. 原始诉求

> i want new feature:
> - able to buy insurance for accident / death / stomachache during travel from insurance company
> - able to loan small amount of money for travel support from bank
> - we charge 5% for service fee

## 2. 一句话意图

已加入某条行程的旅行者，可以在 RouteME 内用演示钱包购买「意外 / 身故 / 肠胃不适」三类旅行保险，或向平台内的演示银行借一笔 100–2,000 元的小额周转金；平台对保费与借款本金各收 5% 服务费，所有买卖与费用都留有可核对的订单和账本。

## 3. 角色

| 角色 | 边界 |
|---|---|
| 旅行者（发布者） | 可为自己发布的行程购买保险、申请借款；可查看自己的钱包、保单与借款。 |
| 同行者（`ACCEPTED` 申请者） | 与发布者同权限。 |
| 非同行者 / 未登录访客 | 不能购买或借款；只能看到入口说明或登录提示。 |
| 系统 | 维护钱包与账本、保险目录、保单、借款、5% 服务费、还款与到期判断；不做真实保险 / 银行对接。 |

## 4. 用户裁决（D1–D10）

| id | 问题 | 结论 | 理由 |
|---|---|---|---|
| D1 | 钱怎么流动 | **演示钱包**：每用户一个余额；购买从余额扣款，借款净额入账；余额不足阻断交易 | 没有余额就无法验证「买得起 / 借得到 / 还不起」，也无法证明 5% 真的被扣 |
| D2 | 5% 服务费作用范围 | **保险 + 借款**：保费外加 5%；借款本金先扣 5%，发放净额 | 与发起人原话「we charge 5% for service fee」一致；两端共用一条收费口径 |
| D3 | 借款规则 | 本金 **100–2,000 元整**；期限 **7 / 14 / 30 天**；即时通过；除 5% 服务费外 **0 利息**；**每人最多 1 笔进行中借款**；支持手动还款与到期日 | 「small amount」需要可判定的上下界；单笔进行中避免演示出现多债叠加 |
| D4 | 保险商品 | 固定 3 款：意外（保额 50,000 元 / 保费 10 元）、身故（100,000 / 20）、肠胃不适医疗（5,000 / 5）；保障期 = 行程起止日 | 发起人点名三类风险；固定商品让验收可精确到分 |
| D5 | 谁可以买 / 借 | 行程发布者 + 该行程 `ACCEPTED` 同行者；行程状态为 `recruiting` / `full` / `ongoing` | 服务是「旅行支持」，不是无场景现金贷；已完成 / 已取消行程不再产生新交易 |
| D6 | 入口 | 行程详情页 + 账号菜单进入新的「旅行保障」页；账号侧另有聚合页查看全部保单与借款 | 原话是「during travel」，行程是最自然的上下文；账号侧负责「我买过什么」 |
| D7 | 能力与命名 | change = `add-travel-finance`；capability = `travel-finance`；一个 change 覆盖保险 + 借款 | 两者共用钱包、5% 费率、订单与同一页面；拆成两个 change 会复制钱包和收费逻辑 |
| D8 | 金额口径 | 数据库与契约统一整数分（`*_cents`），币种 CNY；借款只接受整元，保证 5% 恒为整数分 | 避免浮点误差与四舍五入争议；与既有 `budget_*_cents` 一致 |
| D9 | 外部对接 | **不对接**真实保险公司或银行；不做出核保、KYC、真实放款 | demo 项目没有外部凭据与合规链路；即时通过用于演示完整流程 |
| D10 | 明确不做 | 理赔 / 给付、退保、提前还款手续费、逾期罚息、分期、提现 / 充值、发票、管理后台金融视图、通知、信用分影响 | 第一切片只验证「买得到、借得到、费收得到、账对得上」 |

## 5. 现状与缺口

| 现状 | 缺口 |
|---|---|
| 账户只有资料、角色、状态；没有余额 | G-01 无钱包与账本 |
| 行程有发布者与 `ACCEPTED` 申请者，但没有金融身份 | G-05 无资格派生与入口 |
| 金额只出现在行程预算（分） | G-04 无服务费、订单与费用拆分 |
| 市场只有行程 / 体验 / 聊天 | G-02 无保险商品与保单 |
| 没有任何借贷概念 | G-03 无借款、到期与还款 |
| 测试有 434 后端 / 344 前端基线 | G-06 无金融写入的测试夹具与边界场景 |

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
- 借款展期、分期、提前结清优惠、逾期罚息、催收、征信上报。
- 钱包充值 / 提现 / 转账、多币种、汇率。
- 管理后台金融订单、风控后台、财务报表、发票。
- 信用分加减、通知推送、邮件 / 短信。
- 改变行程状态机、申请规则、聊天权限。

## 8. Discovery 结论

**Go（light intake）。** 能力可一句话表述，与现有信用分 / 行程预算概念不重叠；三类保险与小额借款共享 5% 费率与钱包，适合一个垂直切片；阻塞问题 0。进入 P1 提案与 Delta Spec。

## 9. 残余风险

| 风险 | 处理 |
|---|---|
| 「bought insurance」可能被理解为含理赔 | D10 明确本切片只到购买与保单展示；理赔另开需求 |
| 5% 在借款端可能被理解为加到还款额 | D2 明确「从发放额扣」；Delta 用净额 / 应还额两个字段写死 |
| 演示钱包初始余额过高显得不真实 | 统一 10,000 元，足够覆盖最高借款与任一保费；README 标注 demo |
| 契约 / 迁移号与在途 `add-realtime-notifications` 冲突 | P3 按合并顺序排他确认；P0 不预占 |
| 封禁用户无法还款导致债务永续 | P3 决定：购买 / 借款要求 ACTIVE，还款不受状态阻断 |