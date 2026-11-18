# 技术设计 — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`｜ **阶段：** P3｜ **日期：** 2026-11-18
- **输入：** `proposal.md`（D1–D5）、Delta 36 Scenario、`atdd-design.md`、G1 Conditional（C1 / C2）
- **基线：** `origin/main@822471c`（已并入 `5cb67ff`）；`openapi.yaml` `0.24.0`；Flyway 头 `V29`
- **原型：** `docs/prototype/admin-report-resolve.html`

## 1. 目标与边界

举报核实成立后，管理员只选择「违规类型 + 违规原因」；系统按类型派生扣分，经 `CreditService.book` 写账本并扣减被举报用户信用分；跌破 60 时由既有 `CreditChangedEvent` 链路自动限制。举报页不再提供账号处罚动作，账号处置保留在用户管理页。

**不做：** 信用明细页、通知、历史补扣、用户举报原因枚举变更、其他扣分 / 加分事件、月度扣分上限。

## 2. 决策

### D1 违规类型使用独立枚举，不复用 `BanReasonEnum`

- **Context：** `BanReasonEnum` 8 个码值与违规类型同名，但语义是「封禁理由」；举报页已解耦账号处罚。
- **Decision：** 新建 `ReportViolationEnum`（`wire` + `fixedDeduction`），码值与 issue 一致；`OTHER` 固定扣分为 0，实际分值由请求的 `other_deduction` 提供。映射只在枚举一处定义。
- **Rejected：** 复用 `BanReasonEnum` 并加 `deduction` 字段——会把「封禁理由」与「举报违规」两个生命周期绑在一起，后续任一侧改枚举都会波及另一侧；新建 `report-penalty` 能力——与 `user-credit` 语义重复。

### D2 契约：请求只传类型与档位，扣分值不可由客户端指定

- **Context：** 管理员不应手工输入分值；客户端可能伪造 `delta`。
- **Decision：** `AdminReportResolveRequest` 改为 `outcome` / `note` / `violation_type` / `other_deduction`；移除 `action` / `ban_*`。服务端忽略未知字段（Spring Boot 默认 `FAIL_ON_UNKNOWN_PROPERTIES=false`），并只按枚举派生分值。
- **Rejected：** 保留 `action` 作为可选字段——与 D1（只留违规类型）冲突；新增 `deduction` 字段——等于允许客户端指定分值。

### D3 报告留痕字段：`violation_type` + `applied_deduction`（均可空）

- **Context：** 历史举报没有这两个字段；账本已有完整前后快照。
- **Decision：** `reports` 追加 `violation_type VARCHAR(32)` 与 `applied_deduction INTEGER`，可空；`applied_deduction` 为正数表示本次实际扣减（0 表示截断），与账本 `applied_delta`（负数）区分。历史行保持 null，不推断、不回填。
- **Rejected：** 只在账本存类型（如 `REPORT_VIOLATION:HARASSMENT`）——详情查询与审计不便；新增 `report_credit_deduction` 表——单一事实已在账本，重复存储。

### D4 详情信用分读取使用只读快照，不创建账户

- **Context：** `CreditService.read` 会 `ensureAccount`；举报列表 / 详情是只读页面，不应因浏览而创建账户。
- **Decision：** 新增 `CreditService.snapshot(long userId)`：存在账户返回当前快照，不存在返回 `UserCredit.of(userId, 80)`，不写库。扣分时仍经 `book` 的 `ensureAccount` 建账户。
- **Rejected：** 直接调用 `read`——只读页面产生写副作用；前端按 80 兜底——等级与服务端不一致。

### D5 详情响应扩展 `reported_user`，列表同步返回

- **Context：** `ReportedUser` 被列表与详情共用；新增独立 schema 需要拆分 `AdminReportSummary` 的 `reported_user`。
- **Decision：** `ReportedUser` 追加可空 `credit_score` / `credit_level`；列表与详情都填，列表用 `snapshot` 批量读取。保持 schema 单一，避免 allOf 覆写冲突。
- **Rejected：** 新建 `AdminReportReportedUser`——需重构 `AdminReportSummary` 的 allOf 结构，契约改动面更大；只填详情、列表留空——同名字段语义不一致。

### D6 事务边界与并发：先条件更新报告，再记账

- **Context：** 同一举报可能被并发提交两次。
- **Decision：** 在 `@Transactional` 内先以 `status=PROCESSING` 为条件更新报告（写 outcome / note / violation_type / applied_deduction），成功者再调用 `CreditService.book`；失败者直接 409。账本幂等键 `REPORT_VIOLATION:<reportId>` 作第二道保险。记账异常回滚报告更新。
- **Rejected：** 先记账再更新报告——并发下两方都可能先记账，依赖唯一索引回滚，事务语义更绕；悲观锁 `SELECT ... FOR UPDATE`——SQLite 无行锁语法，且与既有双引擎迁移不一致。

### D7 `resolution_action` 新数据不再写处罚动作

- **Context：** 列可空，历史值需保留只读。
- **Decision：** 成立时写 `null`；驳回时保留 `REJECT`（状态标记而非处罚）。前端仅当值非空时以「历史动作」展示。
- **Rejected：** 成立时写 `KEEP`——会让新数据看起来像「管理员选择了不处罚」，与 D1 的「不再有处罚动作」语义冲突。

### D8 前端预览：当前分来自服务端，扣分映射双端同值

- **Context：** 预览需要「当前 → 本次 → 处理后」；不为预览新增端点。
- **Decision：** 当前分来自 `reported_user.credit_score`；前端 `reportViolation.ts` 内置与后端枚举同值的映射（7 类固定 + OTHER 四档），处理后按 0 截断；双端映射由单测各断言一组表，P4 用同一组样例核对。
- **Rejected：** 详情响应下发扣分规则表——为预览增加契约面；独立预览端点——多一次请求且无新信息。

### D9 前端表单状态与校验

- **Context：** 现有 `reportActionForm.ts` 绑定处罚动作与封禁字段。
- **Decision：** 状态改为 `{ outcome, note, violationType, otherDeduction }`；校验：outcome 必选、note 必填 ≤500、成立时类型必选、`OTHER` 时档位必须 ∈ {5,10,20,30}；`toResolveRequest` 只生成新字段。移除 `actionOptions` / `BAN_REASON_OPTIONS` 在举报页的使用（用户管理页保留）。
- **Rejected：** 保留旧字段并忽略——前端仍会渲染处罚入口，违反 D1。

### D10 迁移与契约版本

- **Context：** 当前 `openapi.yaml` `0.24.0`、Flyway 头 `V29`。
- **Decision：** 契约升 `0.26.0`；迁移 `V31__report_credit_deduction.sql`，单文件兼容 SQLite / H2（两条 `ALTER TABLE ... ADD COLUMN`）。P4 实施前复核远端是否已占用 `0.26.0` / `V31`，被占则顺延。
- **Rejected：** 不改契约直接复用旧字段——请求语义已变；新建表——见 D3。

## 3. 数据模型

```sql
-- V31__report_credit_deduction.sql
ALTER TABLE reports ADD COLUMN violation_type VARCHAR(32);
ALTER TABLE reports ADD COLUMN applied_deduction INTEGER;
```

- 两列可空；历史行保持 null。
- 无新表、无索引变更；幂等仍依赖 `ux_credit_ledger_idempotency`。

## 4. 契约变更（`openapi.yaml` 0.26.0）

### 4.1 `AdminReportResolveRequest`

```yaml
required: [outcome, note]
properties:
  outcome: { enum: [RESOLVED, REJECTED] }
  note: { type: string, minLength: 1, maxLength: 500 }
  violation_type:
    type: string
    enum: [HARASSMENT, FAKE_TRIP, FRAUD_RISK, ILLEGAL_CONTENT,
           IMPERSONATION, NO_SHOW_DISRUPTION, PRIVACY_LEAK, OTHER]
    nullable: true
    description: outcome=RESOLVED 时必填
  other_deduction:
    type: integer
    enum: [5, 10, 20, 30]
    nullable: true
    description: violation_type=OTHER 时必填；其余类型忽略
```

移除 `action` / `ban_reason_code` / `ban_reason_note` / `ban_expires_at`。

### 4.2 `ReportedUser`

```yaml
properties:
  credit_score: { type: integer, nullable: true, minimum: 0, maximum: 100 }
  credit_level:
    type: string
    nullable: true
    enum: [excellent, good, fair, low, risk]
```

### 4.3 `AdminReportDetail`

```yaml
properties:
  violation_type:
    type: string
    nullable: true
    enum: [HARASSMENT, FAKE_TRIP, FRAUD_RISK, ILLEGAL_CONTENT,
           IMPERSONATION, NO_SHOW_DISRUPTION, PRIVACY_LEAK, OTHER]
  applied_deduction: { type: integer, nullable: true, minimum: 0, maximum: 100 }
```

`resolution_action` 保留（历史只读）。

## 5. 后端设计

### 5.1 新增 / 修改

| 文件 | 改动 |
|---|---|
| `enums/ReportViolationEnum.java`（新增） | 8 码值 + `fixedDeduction`；`parse(String)`；`deduction(Integer other)` 校验 OTHER 档位 |
| `service/CreditService.java` + `impl/CreditServiceImpl.java` | 新增 `snapshot(long userId)`：只读，缺失返回 80 |
| `request/AdminReportResolveRequest.java` | record 字段改为 `outcome` / `note` / `violationType` / `otherDeduction` |
| `service/impl/AdminReportServiceImpl.java` | `resolve` 重写成立分支；移除 `applyPenalty` / `AccountStatusService` 依赖；`detailOf` 补违规字段与信用快照 |
| `response/ReportedUserResponse.java` | 追加 `creditScore` / `creditLevel`（可空） |
| `response/AdminReportDetailResponse.java` | 追加 `violationType` / `appliedDeduction`（可空） |
| `entity/ReportEntity.java` + `pojo/Report.java` | 增加两字段与映射 |
| `constant/` | `REPORT_VIOLATION` 原因码、`REPORT` 关联类型 |

### 5.2 `resolve` 流程

```text
requireOutcome → requireText(note)
existing = require(reportId)
if existing.status != PROCESSING → 409 REPORT_NOT_PROCESSING

if outcome == RESOLVED:
    type = ReportViolationEnum.parse(request.violationType())      // 缺失 / 未知 → 400
    deduction = type.deduction(request.otherDeduction())           // OTHER 档位校验 → 400
    reportedUserId = targetService.reportedUserId(existing)        // null → 400
    before = creditService.snapshot(reportedUserId)                // 不写库
    applied = min(deduction, before.score())
else:
    type = null; applied = null

updated = 条件更新 reports（PROCESSING → outcome；resolved_at；resolution_note；
         violation_type；applied_deduction；resolution_action = RESOLVED ? null : REJECT）
if !updated → 409 REPORT_NOT_PROCESSING

if RESOLVED:
    creditService.book(new CreditBooking(
        reportedUserId, "REPORT_VIOLATION", -deduction,
        "REPORT", String.valueOf(reportId),
        "REPORT_VIOLATION:" + reportId))
return detailOf(require(reportId))
```

- 扣分值为 0（截断）时仍调用 `book`，账本 `applied_delta=0` 留痕。
- `book` 内部发布 `CreditChangedEvent`，既有 `CreditEnforcementServiceImpl.onCreditChanged` 同事务消费。
- 不调用 `AccountStatusService`；不写 `ban_*`。

### 5.3 详情与列表

- `reportedUser(...)` 用 `creditService.snapshot(userId)` 补 `credit_score` / `credit_level`。
- 列表批量：`readAll` 改为 `snapshotAll` 或在服务层对每行 `snapshot`（N 行 N 次主键查询，规模为分页大小；如需批量，新增 `snapshotAll`）。
- 历史举报：`violation_type` / `applied_deduction` 为 null，接口原样返回 null。

## 6. 前端设计

| 文件 | 改动 |
|---|---|
| `src/admin/reports/reportViolation.ts`（新增） | `REPORT_VIOLATION_OPTIONS`（8 项：value / label / deduction）、`OTHER_DEDUCTION_OPTIONS`、`violationLabel()`、`previewScore(before, deduction)` |
| `src/admin/reports/reportActionForm.ts` | 状态与校验重写；`toResolveRequest` 只生成新字段；移除封禁校验 |
| `src/admin/reports/AdminReportDetailPage.tsx` | 移除处罚动作 / 封禁字段与 `actionOptions`；新增违规类型 select、OTHER 档位、三段预览；详情头展示信用分与等级；处理历史展示违规类型 / 本次扣分；`resolution_action` 仅非空时以「历史动作」展示 |
| `src/i18n/adminMessages.ts` | 新增违规类型 / 预览 / 历史文案；举报处置的处罚文案不再使用（用户管理页文案保留） |
| `src/types.ts` / `src/api.ts` | `ReportViolationType`、`AdminReportResolveRequest`、`ReportedUser`、`AdminReportDetail` 类型同步 |
| `src/styles.css` | `.admin-deduction-preview` 三段卡片；沿用 `--surface-2` / `--line-2` / `--t-*` 令牌，无硬编码色值 |

预览规则：`after = max(0, before - deduction)`；`before - deduction < 0` 时显示「按 0 截断」提示。`OTHER` 未选档位不显示预览。

## 7. 安全

- 管理员权限沿用 `requireAdmin`（401 / 403）。
- 扣分对象由 `ReportTargetService.reportedUserId` 服务端推导，请求不可指定用户。
- 客户端附带的任意分值字段被忽略；服务端只认枚举映射。
- 举报人回执不返回 `resolution_note` / `violation_type` / `applied_deduction`。

## 8. 测试策略

见 `atdd-design.md`：API A1–A18、E2E E1–E9、反向 R1–R5；UT 在 P4 按 TDD 补（映射 / 校验 / 预览截断）。本 change 的 G1 条件 C1（用户管理页回归）由 E8 承接，C2（401/403/404）由 A17 承接。

## 9. 迁移与回滚

- 迁移只加两列，可空；回滚代码时列保留，不影响旧逻辑。
- 新代码不再写 `ban_*`；历史数据不变。
- 若需回退到旧契约，已写的新字段保留但旧代码忽略。

## 10. 风险

| 风险 | 缓解 |
|---|---|
| 前后端扣分映射漂移 | 双端单测断言同一组样例；P4 交叉核对 |
| 并发双重扣分 | 条件更新 + 账本幂等双保险；A8 覆盖 |
| 既有举报用例断言处罚动作 | 重写 `admin.spec.ts` 举报相关断言；E8 回归用户管理页 |
| 契约版本 / 迁移号被占 | P4 实施前复核，按合并顺序顺延 |
| 历史举报空字段渲染 | E7 覆盖；前端 `?? '—'` 降级 |
