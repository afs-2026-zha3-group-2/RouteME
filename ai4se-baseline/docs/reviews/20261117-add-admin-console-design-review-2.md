# 技术设计评审报告（同日再评审）— add-admin-console

- **工件：**
  - `openspec/changes/add-admin-console/design.md`（未变更 D1–D17；本轮补 `UserProfile` 封禁字段与资料页提示条、关联列表字段形状、`/help/reports` 读取路径）
  - `openspec/changes/add-admin-console/atdd-design.md`（A9 / A10 / A20 / A21 断言细化）
- **change-id：** `add-admin-console` ｜ **需求条目：** REQ-018 / S19–S24
- **评审日期：** 2026-11-17
- **再评审原因：** `tasks.md` 对齐自检时发现 3 处契约缺口（首轮设计评审漏项），按 `@rule:artifact-review-gate` 的「同日再评审」规则出具本报告；首轮结论见 [`20261117-add-admin-console-design-review.md`](20261117-add-admin-console-design-review.md)
- **评审方式：** `all-specs-review` 技能（规则：`@rule:spec-first`、`@rule:api-contract`、`@rule:pii-scrubbing`、`@rule:artifact-review-gate`）
- **评审输入：** `design.md` 全文；`atdd-design.md` 全文；三份 Delta（14 Requirement / 61 Scenario）；`frontend/src/api.ts`（`GET /users/{userId}/profile` 走 `UserProfile`）、`ProfilePage.tsx`、`frontend/src/types.ts`；`openapi.yaml` 0.11.0 的 `UserProfile`
- **工具校验：** `npx --no-install openspec validate add-admin-console --strict` → `Change 'add-admin-console' is valid`

## 评审结论

**Pass**（BLOCKER 0 / WARNING 3（全部已修）/ SUGGESTION 1（已修））

三条缺口都属于「Delta 要求可见，但设计未给可达路径」：封禁信息没有下发字段、用户详情的关联列表没有字段定义、用户侧举报列表没有服务依赖。补齐后 61 条场景的每条 THEN 都能落到具体端点、字段或页面元素，无新增端点、无新增错误码，D1–D17 的结论不变。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 建议改法 | 证据 | 状态 |
|---|---|---|---|---|---|---|---|
| R2-01 | WARNING | `@rule:spec-first` | `design.md` §4.2 / §6.2 | A20「用户资料页展示封禁信息」无落地：设计只给 `DemoUser` 加 `role/status`，而资料页读的是 `GET /users/{userId}/profile` → `UserProfile`，该 schema 与 `ProfilePage.tsx` 均未改 | `UserProfile` 增只读 `status`、`ban_reason_code`、`ban_expires_at`（`ACTIVE` 时 `ban_*` 为 `null`；不含 `status_reason` / `ban_reason_note`）；`ProfilePage.tsx` 增仅 `BANNED` 渲染的提示条 | `frontend/src/api.ts:95`；`frontend/src/types.ts` 的 `UserProfile` 无状态字段；Delta 场景「用户资料页展示封禁信息」「恢复后不再展示」 | **已修** |
| R2-02 | WARNING | `@rule:api-contract` | `design.md` §4.2 `AdminUserDetail` | `trips[] / experiences[] / reports[]` 只有名字，没有条目字段：A9 要求能跳 `#/trips/{id}`、`#/share/{trip_id}`，A10 要求区分举报人 / 被举报人，均无法据此写断言 | 新增 `AdminUserTripRef` / `AdminUserExperienceRef` / `AdminUserReportRef`；`direction ∈ {REPORTER, REPORTED}` | Delta 场景「查看旅行计划与旅行体验」「查看相关举报」 | **已修** |
| R2-03 | WARNING | `@rule:api-contract` | `design.md` §5.5 | `HelpController` 只出现在类清单里，未说明它调用什么读「我的举报」；实现可能直接复用管理端查询并漏出 `resolution_note` / 处罚字段 | 明确 `ReportService.listMine(userId)`：本人、`created_at DESC`、最近 50 条、`total`；不返回备注 / 处理人 / 处罚 | `customer-service`「我的举报」需求段与场景「查看我的举报状态」 | **已修** |
| R2-04 | SUGGESTION | `@rule:sdd-artifacts` | `design.md` §6.2 | 8 项封禁理由文案只在字段表出现，后台弹窗与资料页可能各写一套措辞 | 明确 `adminMessages.ts` 导出 `banReasonLabel(code)`，两处共用 | 同一理由在 A12（后台）与 A20（资料页）都要展示 | **已修** |

**Counts：** BLOCKER 0 / WARNING 3（已修）/ SUGGESTION 1（已修）→ **Pass**

## 与首轮结论的一致性

| 检查 | 结论 |
|---|---|
| D1–D17 是否变化 | 不变：本轮只补字段与读取路径，不改身份来源、状态机、事务、轮询与文案映射 |
| 端点 / 错误码数量 | 不变：16 个端点、13 个错误码；`UserProfile` 走既有端点，`HelpController` 复用 `ReportService` |
| 数据保留 / 隐私 | Pass：新增的 `UserProfile` 字段只含 `status` + 封禁理由码 + 解封时间；`status_reason` / `ban_reason_note` / 举报信息仍只在管理端 |
| 场景可验收性 | Pass：A9 有 `AdminUserTripRef` / `AdminUserExperienceRef`，A10 有 `direction`，A20 / A21 有 `UserProfile` 三字段与提示条，A32 有 `listMine` 的字段排除清单 |
| ATDD 同步 | Pass：`atdd-design.md` 的 A9 / A10 / A20 / A21 断言已改为具体字段与页面元素；分层与总数（56 API / 38 E2E / 33 both）未变 |

## 残余风险

- 首轮报告列出的 9 条残余风险（409 / 大写枚举、BANNED 无法提前解封、无求助通道、`X-User-Id` 既有写路径、`content_excerpt` 的 N+1、固定时钟、V16 重复迁移、8080 旧进程、admin 演示密码）仍然有效，本轮无新增风险。
- 首轮 D-09 / D-10 两条 SUGGESTION 仍留 P4 处理（规则文本统一另开 change；管理端每请求读库不加缓存）。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 状态 |
|---|---|---|---|---|
| `design.md` + `atdd-design.md`（含本轮修订） | 工件 1 | Jacky（AO，当前开发） | 2026-11-17 | 已批准 |
| `design.md` + `atdd-design.md`（含本轮修订） | 工件 2 | Karena（SA） | 2026-11-17 | 已批准 |
| 本报告 | 报告 1 | WAYNE（IO） | 2026-11-17 | 已批准 |
| 本报告 | 报告 2 | Jacky（AO，当前开发） | 2026-11-17 | 已批准 |

> 本报告替代首轮 `20261117-add-admin-console-design-review.md` 作为 design 工件的最新结论；首轮报告保留为历史记录。design 已重新签齐，`tasks.md` 继续推进。