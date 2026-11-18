# P4 阶段记录 — add-credit-exit-restriction

- **Change：** `add-credit-exit-restriction`（能力 `credit-enforcement` ADDED）｜ **需求：** REQ-025 ｜ **故事：** S25 + S26
- **阶段：** P4（Apply & verify）｜ **日期：** 2026-11-17
- **记录人：** Lewis Liu（当前开发者）｜ **VL：** Neal（G2 待签）
- **分支：** `feature/add-credit-exit-restriction`
- **契约 / 迁移：** `openapi.yaml` **0.20.0** ｜ `V25__credit_enforcement.sql`

## 1. 阶段目标

把 P3 的 ATDD / 设计 / 任务落成可运行的最小闭环：退出同行（原因 → 服务端计算扣分 → 账本 → 事件）与信用分 <60 自动限制（清退 → 只读 → 展示 → 自动解除），并按 T13 完成回归与本地验证、按 T14 准备 G2。

## 2. 交付内容

| 层 | 交付 |
|---|---|
| 契约 | 0.20.0：`GET /trips/{tripId}/leave-preview`、`POST /trips/{tripId}/leave`（`{reason}` → `LeaveResult`）、`LeavePreview` / `LeaveRequest` / `LeaveResult`、`UserCreditEntry.credit_restricted`、`UserProfile.credit_restricted` + `credit_restriction_reason`、`TripDetail.cancel_reason` 新增系统值 `credit_restricted`、错误码 `CREDIT_RESTRICTED` |
| 迁移 | `V25__credit_enforcement.sql`：`credit_exit_event`、`credit_restriction`（`active_flag` 唯一）、`trip_applications.status_reason`；SQLite / H2 双引擎 |
| 领域 | `CreditExitReasonEnum` / `CreditExitPenaltyTier` / `CreditExitCalculator` / `CreditExitEvent` / `CreditRestriction`；六档左闭右开、集合时间优先、月度序号与翻倍、待核实与 0 分裁断 |
| 服务 | `CreditEnforcementService.previewExit / leave / reviewExit`；`CreditService.book` 发布 `CreditChangedEvent`；`CreditEnforcementServiceImpl` 同事务触发/解除；`CreditRestrictionGuard` 叶子守卫 |
| 系统清退 | 触发限制时撤回 PENDING、解除未结束 ACCEPTED（`LEFT` + `CREDIT_RESTRICTION`）、按 `credit_restricted` 取消未结束已发布行程；系统清退不扣分、不计数 |
| 响应 | `credit_restricted`（批量 / 主页 / 详情发布者行）、本人 `credit_restriction_reason`；他人不返回原因 |
| 前端 | `CreditProvider` / `useMyCredit`（含动作后 `refresh`）；`TripLeaveModal` 三入口（详情 / 我的旅行 / 聊天）；五展示面徽标；`CreditRestrictedNotice`（发布 / 分享 / 详情申请 / 申请处理 / 聊天输入 / 资料编辑）；`AppShell` 发布导航禁用；系统取消原因映射 |
| E2E | 新增 `credit-exit.spec.ts`（4）、`credit-restriction.spec.ts`（2）、`credit-cancel-reason.spec.ts`（1）；更新 `companions.spec.ts` / `mine.spec.ts` 旧退出流程为「原因 + 预览 + 确认」 |

## 3. 任务完成情况

T1–T14 全部完成，`tasks.md` 复选框已勾选。T0（原型/预览）在 P3 完成，P4 未改原型。

## 4. 验证结果

| 命令 | 结果 |
|---|---|
| `.\mvnw.cmd -B -ntp verify`（backend） | **BUILD SUCCESS**；337 tests / 54 classes，0 failures / 0 errors |
| `npm.cmd run build`（frontend） | 通过（`tsc --noEmit` + `vite build`；仅有既有 chunk >500kB 提示） |
| `npm.cmd test -- --run` | 38 files / **293 tests** 通过 |
| `npx @redocly/cli lint openapi.yaml` | valid，19 warnings（均为既有 warning，0 error） |
| `npx openspec validate add-credit-exit-restriction --strict` | valid |
| `playwright test credit-exit / credit-restriction / credit-cancel-reason / credit / mine`（隔离环境 8091 + 5181，`SqlLite/e2e-p4-credit.db`） | **23 / 23 passed** |
| `playwright test`（全量，同一隔离库，123 条） | **99 passed / 24 failed**；失败均为既有债务（见 §5） |
| 走查（1440 / 768 / 390 × 浅/深色） | 退出弹窗与受限本人主页共 8 组，`scrollWidth - clientWidth = 0`；截图存 `docs/sdd/add-credit-exit-restriction/preview/p4-*.png` |
| 合并 `origin/main` 后复验 | 后端 **510** / 前端 **356** 全绿；契约 **0.20.0** + 迁移 **V25**；Redocly valid（0 error / 23 warnings，其中 6 个 `nullable+allOf` 为 main 管理后台遗留，已补 `type: object` 修复）；`openspec validate --strict` valid |

本地验证报告：`docs/ai4se-plugins/20261117-181500-local-verify-report.md`；P4 质量报告：`docs/ai4se-plugins/20261117-181500-quality-checklist-report.md`。

## 5. E2E 结论与既有债务

24 条失败分为两类，均有干净库 A/B 证据，与本 change 无关：

1. **地图渲染缺失（17 条）**：`map.spec.ts` 9 条 + `trips.spec.ts` 8 条，失败断言均为 `[data-testid="china-map"]` / `.place-chip-name` 等地图元素缺失；`trips.spec.ts` 在全新库（`SqlLite/e2e-p4-clean.db`）单独执行仍为 19 passed / 8 failed，8 条全部是同一地图元素缺失（REQ-016 既有债务，`add-credit-account` 验证报告已记录）。
2. **共享库累积行程导致首页顺序变化（7 条）**：`profiles.spec.ts` 3 条 + `trips.spec.ts` 4 条；同一套代码在全新库先跑 `profiles.spec.ts` 为 **8 / 8 passed**，证明与实现无关，属于 E2E 在共享库累积 70+ 行程后「种子卡在第一页」的断言假设失效。

## 6. 与 P3 设计的偏差

| # | 偏差 | 说明 |
|---|---|---|
| 1 | 退出成功后额外 `refreshCredit()` | 详情 / 我的旅行 / 聊天三入口退出后刷新 `CreditProvider`，使跌破 60 时导航与入口立即进入只读态；不改变服务端口径 |
| 2 | `AppShell` 发布导航以 `aria-disabled` + `preventDefault` 禁用 | 保持可见可读，不新增页面；与 `CreditRestrictedNotice` 文案一致 |
| 3 | 旧用例按新契约更新 | `ChatControllerTest` / `TripCancellationApiTest` 的 `POST /leave` 由无 body → `{reason}`（旧 204 → 200）；`OpenApiTest` 版本 0.14.0 → 0.20.0 并新增信用执行契约断言 |

## 7. 残余风险

| # | 风险 | 缓解 |
|---|---|---|
| 1 | 触发限制时的跨模块清退在同一事务内，数据量大时事务较长 | 已在 `CreditRestrictionApiTest` 覆盖无半状态；后续如量级上升再评估异步化 |
| 2 | 月度序号按退出月统计，跨月边界依赖服务器时钟 | 计算器单测覆盖左闭右开与月边界；服务端重算，前端不重复扣分 |
| 3 | 待核实事件无管理端，长期停留在 pending | 用户裁决 D3：管理端另开 change；本人只看分数，不展示明细 |
| 4 | E2E 不在 CI | 沿用仓库现状，本地门禁 + 报告留证 |

## 8. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P0 | `41c173d` | 基线 + 范围裁决 |
| P1 | `13c63d8` | REQ-025 / 提案 / Delta 草稿 / 两故事 / P1 评审 |
| P2 | `c790357` | Delta 定稿 / AC-DoV / consistency-lint / G1 |
| P3 | `4a80f47` | ATDD / 设计 / 任务 / 原型 / 预览 / 评审 / P3 报告 |
| P4 | `5780860` + `c2352b8` | 契约 / V25 / 后端 / 前端 / E2E / 回归 / P4 记录；`c2352b8` 按 main 已占号顺延为 REQ-025 / S25 / S26 |
| 合并 | 本次合并 | `main` 已占 0.16.0–0.19.0 与 V21–V24；本 change 契约顺延 **0.20.0**、迁移顺延 **V25**；合并后后端 510 / 前端 356 / Redocly 0 error |

## 9. 阶段结论

**P4 Pass with documented debt（本地）。** T1–T14 完成，合并前后端 337 / 前端 293 / 新增 E2E 7 条与相关回归 23 条通过；合并 `origin/main`（两次）后复验后端 510 / 前端 356 全绿，契约 0.20.0 + V25。全量 E2E 的 24 条失败均有干净库证据归因为既有地图渲染与共享库累积债务。G2 待 VL=Neal 签署；按用户要求不提交 P5、不归档。

## 10. R2 验收修订（2026-11-17，本地未提交）

用户验收指出的 3 个问题已在同一 change 内修正，未 pull / 未 push：

| 项 | 处理 | 证据 |
|---|---|---|
| 标签被当成下拉选项 | 标签只做文字；占位改为「请选择退出原因」 | `credit-exit.spec.ts` 断言首项文本且无标签选项 |
| 未选原因仍可点确认 | 未选原因、或安全 / 不可抗力未填说明时确认置灰 | `leaveForm.test.ts` + E2E 置灰断言 |
| 待核实多出一行 | 删除「退出后进入待核实；核实前不扣分，也不计入当月次数」 | E2E `not.toContainText` |
| 缺少说明与图片 | 三原因都可填说明（安全 / 不可抗力必填，≤200 字）；图片 ≤3 张、≤5MB、JPEG/PNG/WebP；磁盘存文件 + SQLite 存元数据，不公开展示；上传控件用原生 file input 铺满可见按钮，点击直接唤起系统选择器（不依赖脚本触发） | V26；`POST /leave-evidence`；`CreditExitApiTest`；E2E 真实点击 + `filechooser`（Chromium / Edge） |

复验结果：后端 **514 tests / 0 failures**（`mvnw verify`）；前端 **49 files / 362 tests**；`npm run build` 通过；Redocly valid（0 error / 23 warnings）；`openspec validate --strict` valid；隔离环境 E2E **23/23**（credit-exit / companions / mine）。契约 **0.21.0**，迁移 **V26**。

## 11. R3 本人回看退出记录（2026-11-17，本地未提交）

用户验收指出：退出原因 / 说明 / 图片只有写入，没有本人查看入口。确认口径为**仅本人、只读**，入口在「我的旅行 → 我申请的（已退出）」。

| 项 | 处理 | 证据 |
|---|---|---|
| 本人查看 | `GET /trips/{tripId}/leave-record`：原因 / 说明 / 时间 / 评审状态 / 预计与实际影响 / 附件列表 | `CreditExitApiTest` |
| 图片查看 | `GET /leave-evidence/{attachmentId}`：带用户头返回二进制；前端转 object URL，可点开大图 | `CreditExitApiTest` + E2E |
| 仅本人 | 他人读记录 404 `LEAVE_RECORD_NOT_FOUND`、读图片 403 `FORBIDDEN` | `CreditExitApiTest` |
| 只读入口 | `MyTripsPage` 已退出行「查看退出记录」；`LeaveRecordModal` 无编辑 / 重新上传 | E2E |
| 系统清退 | 无主动退出事件 → 404，前端提示「没有可查看的退出记录」 | 前端错误映射 |

复验结果：后端 **515 tests / 0 failures**；前端 **49 files / 362 tests**；`npm run build` 通过；Redocly valid（0 error / 23 warnings）；`openspec validate --strict` valid；隔离 E2E **credit-exit 4/4**（含回看记录与图片）。契约 **0.22.0**；无新迁移（读取 V26 已有表）。按用户指示未 pull / 未 push。

## 12. R4 同一行程多次退出（2026-11-17，本地未提交）

用户验收：退出后再次加入并被接受，第二次退出不生效。根因：幂等键只按 `user + trip`，命中首次事件后直接返回旧结果，未解除新的同行关系。确认口径：**允许再次加入并退出、每次计入当月次数、记录列出全部**。

| 项 | 处理 | 证据 |
|---|---|---|
| 多次退出 | V27 `application_id`；幂等键 `exit:{userId}:{tripId}:{applicationId}`；每次退出独立解除关系与结算 | `CreditExitApiTest` |
| 月度计数 | 同行程再次退出照常计入当月序号，第 2 次翻倍（-10） | `CreditExitApiTest` / E2E 预览 `-10` |
| 全量记录 | `GET /leave-record` 返回数组（时间倒序），弹窗按「共 N 次退出」逐条展示 | 后端测试 + E2E 2 条 |
| 重试幂等 | 无 ACCEPTED 时返回最近一次事件，不新增事件、不重复扣分 | `CreditExitApiTest` |
| 旧数据 | V27 回填最近一条 `trip_applications.id` | 迁移测试 |

复验结果：后端 **516 tests / 0 failures**；前端 **49 files / 362 tests**；`npm run build` 通过；Redocly valid（0 error / 23 warnings）；`openspec validate --strict` valid；隔离 E2E **credit-exit 5/5**（含再次加入并退出、记录 2 条）。契约 **0.23.0**；迁移 **V27**。按用户指示未 pull / 未 push。

**合并 `origin/main`（最终）：** 远端已占用契约 0.23.0 与迁移 V26/V27（AI 行程 / 安全学习），本 change 按「后到者顺延」最终改为 **契约 0.24.0、迁移 V28（说明与证据）/ V29（application_id）**；合并后复验：后端 **607 / 0 failures**、前端 **475 / 475**、`typecheck` + `build` 通过、Redocly valid、`openspec validate --strict` valid、隔离 E2E **credit-exit 5/5**。
