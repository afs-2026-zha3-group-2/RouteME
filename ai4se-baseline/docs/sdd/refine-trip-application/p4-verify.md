# P4 实现与验证记录 — refine-trip-application

- **Change：** `refine-trip-application`（REQ-010 / S08 提交同行申请）｜ **阶段：** P4（Apply & verify / G2）
- **日期：** 2026-11-16 ｜ **记录人：** Jay（AO）
- **分支：** `feature/refine-trip-application`（独立 worktree，基于 `origin/main@b93f45b`）
- **前置：** P3 Pass（`p3-design.md`，G1 Pass：IO Wanye / SA Jacky）

## 1. 阶段目标

按 ATDD 与 `tasks.md` T1–T5 完成内联同行申请的实现、E2E 验收与本地验证：招募中且未满员、非本人发布、未申请过 → 填写说明提交 → 生成 PENDING 申请；本人无入口；重复 / 满员 / 结束由服务端拒绝并给出可读原因；提交后按钮区变为「已申请，待处理」并可查看状态。前端严格按原型。

## 2. 实现摘要

| 层 | 改动 | 状态 |
|---|---|---|
| 状态派生 | 新增 `frontend/src/trips/applicationEntry.ts`：`applicationEntryState`（`publisher → pending → accepted → completed → full → apply`）与 `applicationErrorMessage`（`DUPLICATE_APPLICATION` / `TRIP_NOT_OPEN` → 可读文案，未知码返回 `null`） | 新增 |
| 详情页 | `TripDetailPage.tsx`：删除申请 `Modal` 与 `applyOpen`；内联「下一步」申请区（apply / pending / accepted / unavailable）；提交失败先 `loadTrip` 拉最新状态再映射；同时刷新「我的申请」与行程；撤回用返回的已取消申请更新，表单立即恢复 | 修改 |
| 文案 | `tripMessages.ts`：新增 `applyAreaTitle`、`applyMessageLabel`、`applyMessageOptional`、`applyChatHint`、`applyAcceptedNote`、`applyDuplicate`、`applyFull`、`applyEnded`、`applyUnavailable`；`applySubmit` →「提交同行申请」，`applyCancel` →「撤回申请」，placeholder 改原型示例；删除 `applyDialogTitle` / `chatEntry` | 修改 |
| 样式 | `styles.css`：新增 `.detail-application` 作用域 `action-box` / `action-note` / `apply-form` / `label` / `opt` / `hint` / `textarea`，数值对齐原型 `actionBox`，颜色全部使用令牌 | 修改 |
| 单元测试 | 新增 `applicationEntry.test.ts` 13 项：五种入口状态、`cancelled` / `rejected` 再申请、满员 + pending / accepted、两种 409 与未知错误码 | 新增 |
| 端到端 | `e2e/tests/companions.spec.ts` 重写为 8 条用户路径 + API 辅助函数；`trips.spec.ts` 旧「申请同行」断言改为「提交同行申请」；4 个 spec 的 API 基址改为相对 `/api` | 修改 |
| 后端 / 契约 / 迁移 / 原型 | 无改动（复用 `POST /api/trips/{tripId}/applications`、`POST /api/applications/{applicationId}/cancel`） | — |

## 3. Red → Green 证据

| 步骤 | 观察 |
|---|---|
| Red（E2E） | 用 `git stash push` 暂存 `TripDetailPage.tsx` / `tripMessages.ts` / `styles.css`，在隔离端口 5174 跑 `companions.spec.ts`：inline / duplicate / fills / ends / withdraw 与改写的 `applies, gets accepted…` 均失败（仍为弹窗入口、无「提交同行申请」、无「已申请，请等待回应」） |
| Red（UT） | `applicationEntry.test.ts` 先写，实现前 `npm test` 失败（模块不存在） |
| Green | 恢复实现后 `npm test` 13 项通过；`companions.spec.ts` 8/8；全套 `playwright test` 30/30 |

完整输出见 [`20261116-141500-local-verify-report.md`](../../ai4se-plugins/20261116-141500-local-verify-report.md)。

## 4. 验证结果

| 命令 | 结果 |
|---|---|
| `cd RouteME/frontend; npm run build` | 成功（1523 modules，JS 900.08 kB / CSS 39.48 kB） |
| `cd RouteME/frontend; npm test` | Test Files 10 passed / Tests 88 passed |
| `cd RouteME/backend; .\mvnw.cmd -B -ntp test` | Tests run: 156, Failures: 0, Errors: 0 |
| `cd RouteME/e2e; npx playwright test tests/companions.spec.ts` | 8 passed |
| `cd RouteME/e2e; npx playwright test` | 30 passed |
| `openspec validate refine-trip-application --strict` | `Change 'refine-trip-application' is valid` |
| 零 diff 核对 | `RouteME/openapi.yaml`、`RouteME/backend/**`、`db/migration/**`、`docs/prototype/**` 无改动 |
| 手工走查 1440 / 1024 / 768 / 390（浅 / 深色） | 可申请 / 待处理 / 已匹配 / 满员四态与原型 `actionBox` 一致；390px 无横向溢出；Tab 顺序为说明框 → 提交 → 撤回 |
| CI / CD | 尚未运行（按用户约定 P4 提交后 push、开 PR） |

## 5. P4 DoV 检查（`checklists/p4.md`）

| id | 检查 | 结论 |
|---|---|---|
| P4-1 | 本地验证报告存在 | Pass（`docs/ai4se-plugins/20261116-141500-local-verify-report.md`） |
| P4-2 | 本地 Overall = Pass | Pass（Waiver `N/A`） |
| P4-3 | `phase=ci` pipeline report | Pass（`Pass-by-tag`：release `build-da6cc8b`；见 `docs/ai4se-plugins/20261116-145000-pipeline-report.md` 与 `openspec/changes/refine-trip-application/ci-report.md`） |
| P4-4 | `phase=cd` | Pass（release `build-da6cc8b`：standalone jar + frontend dist） |
| P4-5 | `g2-decision.md` | Pass（`openspec/changes/refine-trip-application/g2-decision.md`，VL=Neal） |
| P4-6 | Apply 与 Verify 分离 | Pass（报告不构成 Gate；E3 Human 与 G2 留人工签署） |

质量检查报告：[`20261116-141023-quality-checklist-report.md`](../../ai4se-plugins/20261116-141023-quality-checklist-report.md)（Stage Overall Pass）；检查点日志：[`20261116-140944-quality-checklist-checkpoints.md`](../../ai4se-plugins/20261116-140944-quality-checklist-checkpoints.md)。

## 6. 实现偏差与设计一致性

| 项 | 设计 | 实现 | 说明 |
|---|---|---|---|
| 错误码映射依据 | 按行程状态映射 `TRIP_NOT_OPEN` | 提交失败后先 `loadTrip` 拉最新状态再映射 | 页面快照可能仍是 recruiting；拉取失败退化为「当前不可申请」，已同步 `design.md` D4 |
| 已匹配状态 | 用户确认统一按原型 | 名单提示 +「与 {昵称} 沟通」+「退出同行」 | 覆盖原「已匹配同行」Tag 区块，已同步 `design.md` D3 与 `tasks.md` T3 |
| E2E API 基址 | 不写死 8080 | 相对 `/api` + `baseURL` + Vite proxy | 支持隔离端口验证，默认仍指向 8080；`auth` / `experiences` / `trips` 各改一行 |
| 满员 / 结束入口 | 不可用 + 原因 | `applicationEntryState` 返回 `unavailable` | 申请状态优先于行程状态，满员后已匹配用户仍可聊天 / 退出 |

## 7. 风险与后续

| 风险 | 处理 |
|---|---|
| 页面停留期间状态过期 | 失败后重新拉取行程与申请；E2E 用 `page.request` 制造重复 / 满员 / 结束三种服务端变化 |
| 远程 CI 未运行 | push 与 PR 后跑 `phase=ci`，补 pipeline report 再进入 G2 |
| 共享端口冲突 | 本次在 8090 / 5174 隔离端口复验；建议后续固定独立测试端口 |
| E2E 数据累积 | 本次使用独立 SQLite；建议另立 change 引入独立测试库或 `afterEach` 清理 |
| Living Spec 合并只追加不替换 | T6 在 P5 / G3 前核对 8 场景与 5 个基线语义（本阶段未执行 T6） |

## 8. 阶段提交链与签署

| 阶段 | 提交 |
|---|---|
| P1（意图 / 提案 / delta） | `7bfbf93` |
| P2（Delta 复核 + lint + G1） | `4b8ff8c` |
| P3（ATDD / design / tasks + P3 质量） | `f26e7d3` |
| P4 | 本阶段提交：`feat(p4): refine-trip-application add inline companion application and local verify`（`628906a`）；合并 `origin/main` 的合并提交 `939f28c`、`d6463a2`、`d9cb5de`、`da6cc8b` |

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | T1–T5 实现与回归；偏差已同步设计文档；三次合并 main 后复验 | 2026-11-16 |
| VL | Neal | 独立复核本地验证与 CI/CD 证据；确认 8 个场景均有断言；G2 Pass | 2026-11-16 |
| SA | Jacky | 实现未越出 Delta 8 场景与 Non-goals | 2026-11-16 |
| IO | Wanye | 收到残余风险（状态过期、E2E 未入 CI、`profiles.spec` 陈旧断言） | 2026-11-16 |
| SM | Lewis | G2 Pass，REQ-010 可交付；归档另行发起 | 2026-11-16 |

**阶段结论：Pass（G2）。** 已推送 `main` @ `da6cc8b`，CI/CD 经 release `build-da6cc8b` 确认；归档留在 P5。

> 推送后团队又前推 `main`（`93313dd` → `52ae84a`）；本 change 的 verify 提交 `93313dd` 被 CD 并发组取消独立 release，但它是 `origin/main@52ae84a` 的祖先且 `build-52ae84a` 已发布，交付证据完整。

## 9. 合并 main 后复验（2026-11-16 14:1x–14:2x）

- **合并：** 分三次合并 `origin/main`（`5261cef` behind 49 → 冲突 5 个文件；`8ac9859` behind 9 → 无冲突；`2ce7ec8` / `5561d0f` → 仅前端外壳与后端 V13 种子，无冲突）。冲突逐个解决：`TripDetailPage.tsx` 保留 main 的 `useProfile` / `openProfile` 与我们基于 `feedback` 的申请区；`registry.md` / `handoff.md` / `deep-dive.md` / `impact-brief.md` 取 main 版本后追加本 change 的 REQ-010 内容（本 change 章节在 `impact-brief.md` 为 §14）。
- **编号裁决：** main 的 `add-user-profiles` 已占用 REQ-009，经用户裁决本 change 按「后到者顺延」改为 **REQ-010**；意图 / Ready 条目文件、openspec 工件与 `docs/sdd/` 记录已同步改号，`docs/ai4se-plugins/` 历史报告保留当时编号。
- **依赖安装：** main 新增 `element-china-area-data`，合并后执行 `npm install`（新增 3 包）。
- **复验结果（最后一次合并后）：** 前端构建 Pass；`npm test` **15 文件 / 133 项**；后端 `mvnw -B -ntp test` **213 项**；隔离环境（后端 8090 + 独立 SQLite + Vite 5174）下 `npx playwright test` **39 passed / 1 failed**：失败项为 `profiles.spec.ts:23`（期望「上班族 · 互联网行业 · INFP」），根因是 main 的 `V13__seed_demo_user_profiles.sql` 把演示账号 4 改为 `school=''` / `job='产品经理'`，属 `add-user-profile` 与 `add-user-profiles` 之间的数据/断言失配，非本 change 引入（本地库实测：`(4, '周野', '', '产品经理', 'INFP')`）。`companions` 8/8，包含「opens the publisher profile from the trip detail page」以验证合并后的详情页；`profile.spec.ts` 未在隔离环境运行（其 API 基址硬编码 `http://localhost:8080`，8080 被其他会话占用，运行会写入团队共享库），由 `add-user-profiles` owner 在其干净库验证覆盖。
- **零 diff：** `openapi.yaml`、`backend/**`、`db/migration/**`、`docs/prototype/**` 相对 `origin/main` 无改动；本 change 相对 main 只改 `frontend/src/trips/**`、`i18n/tripMessages.ts`、`styles.css` 与 4 个 E2E spec。

## 10. P5 状态

未执行。归档时需：将 MODIFIED「提交与取消同行申请」合并进 `openspec/specs/trip-companions/spec.md`（保留基线 5 场景，8 场景齐全）、补 `summary.md` 记录 D2 对 S08 字面「按钮变为已申请，待处理」的口径、在 G3 复核合并结果并移入 `changes/archive/`。
