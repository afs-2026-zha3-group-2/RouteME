# Consistency lint — add-travel-finance

- **Change:** `add-travel-finance`（`travel-finance` ADDED，REQ-028 / S29）
- **Phase:** P2（Delta Spec）
- **Timestamp:** 2026-11-17（保险改为第三方入口 + 状态回写后于 2026-11-18 复审）
- **Reviewer:** Karena（当前开发者）
- **Tooling:** `openspec validate add-travel-finance --strict` → `Change 'add-travel-finance' is valid`

## 检查结果

| # | 检查项 | 结果 | 证据 / 说明 |
|---|---|---|---|
| 1 | 单 change = 单 capability | Pass | 只有 `specs/travel-finance/spec.md`（ADDED）；保险入口与借款共用钱包与资格 |
| 2 | capability 命名为名词短语 kebab-case | Pass | `travel-finance` |
| 3 | change id 为动词开头 kebab-case | Pass | `add-travel-finance` |
| 4 | Delta 头合法 | Pass | `## ADDED Requirements`；无 MODIFIED / REMOVED |
| 5 | 每个 Requirement 至少 1 个 Scenario | Pass | 10 Requirement / 40 Scenario |
| 6 | 不替换既有 Living Spec 块 | Pass（N/A） | 纯 ADDED；`trip-plans` / `trip-companions` / `user-auth` / `design-system` 正文未改 |
| 7 | 与 `trip-plans` 状态词汇一致 | Pass | `recruiting` / `full` / `ongoing` 对应「招募中 / 已满员 / 旅行中」；`completed` / `cancelled` 排除 |
| 8 | 与 `trip-companions` 同行判定一致 | Pass | `ACCEPTED` 即同行者；发布者按 `publisher_id` 判定，不进入申请表 |
| 9 | 与 `user-auth` 注册口径一致 | Pass | 复用注册成功即登录；钱包初始化写在 `travel-finance`，不改注册 Requirement |
| 10 | 与 `user-credit` 不混表 | Pass | 钱包与信用分账户分表；本 Delta 不写信用分 |
| 11 | 金额口径与既有字段一致 | Pass | 借款全部 `*_cents` 整数分；币种 CNY；保险不出现金额字段 |
| 12 | 错误码与既有异常一致 | Pass（部分新增） | `FORBIDDEN` / `TRIP_NOT_OPEN` / `INVALID_INPUT` / `ACCOUNT_SUSPENDED` / `ACCOUNT_BANNED` 既有；3 个新增码已入契约：`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE`；`POLICY_EXISTS` 已退休 |
| 13 | 契约版本 / 迁移号排他 | Pass（P3 已确认） | 合并 main 后落定 0.25.0 + `V30`；main 为 0.24.0 + V28 / V29 |
| 14 | 无孤儿场景 / 无规格外行为 | Pass | REQ-028 场景 → Delta 40/40 映射见 `dov-ac-review.md` |
| 15 | 通知 / 展示契约 | Pass | 无通知；钱包卡、第三方保险面板、表单、保险 / 借款列表、入口均有 display fields（`deep-dive.md` ④） |
| 16 | 保险边界与合规 | Pass | Delta 写明 RouteMe 不设计产品 / 不定价 / 不承保 / 不参与理赔；提供方条款优先；不保存保单号 / 证件 / 银行卡 |
| 17 | 与 `user-auth` / `trip-plans` 状态机无冲突 | Pass | 保险不参与加入与状态流转；只读行程起止日作为保障期 |

## Findings

| id | severity | 说明 | 处理 |
|---|---|---|---|
| L-01 | SUGGESTION | 3 个新增业务码（`INSUFFICIENT_BALANCE` / `ACTIVE_LOAN_EXISTS` / `LOAN_NOT_ACTIVE`）需进入 `openapi.yaml` | P3 已补齐；`OpenApiTest` 断言错误码集合并断言 `POLICY_EXISTS` 退休 |
| L-02 | SUGGESTION | 契约版本与迁移号未排他 | 已按合并顺序落定 0.25.0 + `V30` |
| L-03 | SUGGESTION | 余额并发策略未定 | P3 明确 CAS 条件更新 + 0 行重读，并配 `WalletServiceImplTest` |
| L-04 | SUGGESTION | 原型无金融骨架 | rebase 后 `docs/prototype/v1` 已归档，撤回原型改动；以生产 UI + E2E 为准 |
| L-05 | SUGGESTION | 保险到期不迁移，页面只靠保障起止日表达 | 已在 Delta 写明；P3 改为读取时派生 `expired`，不落库 |
| L-06 | SUGGESTION | 第三方投保入口在演示环境无真实回调 | 明确用 `routeme.insurance.*` 配置 + 演示确认端点；真实接入与验签列入 Out of scope / 残余风险 |
| L-07 | SUGGESTION | 原站内商品与保费设计越界承保 | 2026-11-18 返工移除 `FinanceCatalog` / 保费 / 保单号；Delta、契约与实现同步收敛 |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 7 / N/A 1 → **Pass**

## 结论

Delta Spec 与既有规格无冲突，单 capability 与金额口径一致；保险已收敛为第三方入口 + 状态回写，未决项均在 P3 / P4 闭合，不构成 G1 阻塞。