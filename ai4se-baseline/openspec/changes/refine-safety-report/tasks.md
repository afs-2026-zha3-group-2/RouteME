# 任务：refine-safety-report

- **依据：** [`specs/trip-companions/spec.md`](specs/trip-companions/spec.md)（9 场景）、[`design.md`](design.md) D1–D7、[`atdd-design.md`](atdd-design.md)
- **约束：** 一条任务只落一层；先写验收测试再写实现；不动后端、契约、迁移与处置面。
- **状态：** P4 完成（2026-11-16，本地）。T1 红态 → T2–T5 实现 → T6 回归，结果记入 `docs/sdd/refine-safety-report/p4-verify.md`；G2 待 VL Neal 独立验证。

## 任务清单

### T1 [e2e] 红态验收套件

- [x] 把 `loginAs`、`switchUser`、`todayIso`、`createTripViaApi`、`applyViaApi`、`acceptApplicationViaApi` 抽到 `RouteME/e2e/tests/support.ts`；`companions.spec.ts` 改为引用，测试体不动。
- [x] 新增 `RouteME/e2e/tests/safety-report.spec.ts`，实现 `atdd-design.md` §5 的 E1–E7，含 E1 / E2 的 390 / 768 / 1440 循环与 E5 的 `POST /api/reports` 响应断言。
- [x] 按 `atdd-design.md` §7 更新 `companions.spec.ts` 的 `applies, gets accepted, chats, reports and leaves` 与 `profiles.spec.ts` 的 `keeps the existing trip report entry working`。
- [x] 在未修改的 `main` 上运行新 spec，记录预期失败（无页头入口、提示仍在、旧回执文案、回执态两个 `取消`）。

**验证：** `cd RouteME/e2e; npx playwright test tests/safety-report.spec.ts` → 7 条失败，原因与上一条一致；`npx playwright test tests/companions.spec.ts tests/profiles.spec.ts` → 4 处断言失败，无环境级错误。

### T2 [frontend] 文案表与 `ReportModal`

- [x] 新增 `reportEntryTrip`、`reportEntryUser`、`reportTargetPrefix`、`reportPrivacyNote`、`reportEmergencyNote`、`reportReceiptHint`、`reportClose`；`reportSuccess` 改为 `已收到，我们会处理`；删除 `reportEntry`、`reportTitle`、`reportTargetTrip`、`reportTargetUser`。
- [x] 新增必填 prop `targetLabel: string`；标题随 `targetType` 变化；表单、失败、回执三态都渲染目标行、身份保密与紧急求助文案。
- [x] 回执态：`Alert` 标题 `已收到，我们会处理` + 提示文案，`footer` 只放一个主按钮 `关闭`。
- [x] 回执以 `receipt.received === true` 为前提；否则显示 `举报提交失败`，并保持 `reason` / `note` 以便重试。

**验证：** `cd RouteME/frontend; npm run typecheck` → 无错误；`npm test` → 保持全绿。E5 / E6 仍失败，原因仅剩入口未挂载。

### T3 [frontend] 两个页面的页头入口

- [x] `TripDetailPage.tsx`：`!isPublisher` 时在 `.detail-badges` 内渲染 `举报这条行程`；删除 `SafetyNote` 的导入与元素；给 `ReportModal` 传 `targetLabel={trip.title}`。
- [x] `ChatPage.tsx`：在 `.chat-head` 末尾、`!completed` 条件之外渲染 `举报这位用户`；删除 `SafetyNote` 的导入与元素；传 `targetLabel={otherUser?.nickname ?? '同行者'}`。
- [x] 确认两个页面不再残留安全提示标记或回退文案。

**验证：** `npm run typecheck` 无错误；`npx playwright test tests/safety-report.spec.ts` → E1–E7 全通过（样式未加时 390 档若已靠内容换行自然通过，按实际结果记录）。

### T4 [frontend] 收窄 `SafetyNote`

- [x] `SafetyNote.tsx` 删除 `onReport` 属性、`Button` 导入与 `action` 属性；`ShareExperiencePage` 的调用点保持不变。
- [x] `grep -rn "onReport" RouteME/frontend/src` 无结果。

**验证：** `npm run typecheck` 无错误；E4 的 `/#/share/1` 分支通过（`安全提示` 可见、`举报*` 按钮计数 0）。

### T5 [frontend] 页头样式

- [x] 新增 `.detail-badges .head-report { margin-left: auto; }`、`.chat-head { flex-wrap: wrap; }`、`.chat-report { margin-left: auto; align-self: flex-start; flex: none; }`；不新增颜色令牌。
- [x] 在浅色 / 深色下走查 390 / 768 / 1440：每档入口可见、无横向溢出、回执弹窗可读（12 组组合全 Pass，证据见 `p4-verify.md` §6）。

**验证：** `npx playwright test tests/safety-report.spec.ts` → E1 / E2 的三档断言通过；三档人工核对结果记入 `p4-verify.md`。

### T6 [verify] 本地全量回归

- [x] `cd RouteME/backend; .\mvnw.cmd -B -o test` → 绿（Windows 本地用 `mvnw.cmd`，CI 用 `./mvnw`），`ReportControllerTest` / `OpenApiTest` 未改且通过。
- [x] `cd RouteME/frontend; npm run build && npm test` → 绿。
- [x] `cd RouteME/e2e; npm run test` → 隔离环境（后端 8090 + 独立 SQLite + Vite 5180）86 passed / 11 failed：全部来自并行会话未提交的 `profile.spec.ts`（依赖未跟踪的 `V16`，与 `origin/main` 逐字节一致）；本 change 的 7 条与改动的既有 spec 全绿，逐条归因见 `p4-verify.md` §5。
- [x] `git diff main -- RouteME/backend RouteME/openapi.yaml` → 为空（RV-6）。
- [x] `cd ai4se-baseline; npx --no-install openspec validate refine-safety-report --strict` → valid。

**验证：** 以上命令全绿；输出摘要贴入 `docs/sdd/refine-safety-report/p4-verify.md`。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | Result | Evidence |
|---|---|---|
| Delta 的 9 个 Scenario 均有 ATDD 行与任务 | Pass | `atdd-design.md` §5 #1–#9；#1–#2 复用既有 spec，#3–#9 对应 E1–E7；任务 T1–T5 |
| Non-goals 有反向验证 | Pass | `atdd-design.md` §6 RV-1–RV-7；E1 / E2 / E4 / E7；RV-6 由 T6 收口 |
| `received=true` follow-up 已设计并断言 | Pass | D4 的守卫；E5 先断言 `201` + `received === true`，再断言回执文案 |
| `SafetyNote` follow-up 已设计并核对 | Pass | D3；T4；RV-4 |
| 三档页头换行已规划 | Pass | D1 / D2 / D6；T1 三档断言、T5 样式、T6 人工核对 |
| `companions.spec.ts` / `profiles.spec.ts` follow-up 已定范围 | Pass | `atdd-design.md` §7；T1 |
| 无静默范围扩张 | Pass | 只改 3 个组件、1 个样式表、1 个文案表、1 个新 spec、1 个 helper 模块；D7 与 RV-6 钉住 diff |
| 任务不越过 Delta 范围 | Pass | 无提示改版、无处置 UI、无原因词表扩容、无契约升级 |
| 任务一层一条、可执行 | Pass | T1 e2e；T2–T5 frontend；T6 verify；每条含命令 |
| 最后一条为验证 / 回归 | Pass | T6 |
| ATDD 先于实现 | Pass | T1 先出红态套件，T2–T5 再实现 |
| 契约先行 | N/A | 无契约变更；`ReportControllerTest` / `OpenApiTest` 作为 T6 的回归守卫 |
| 设计与已批准预览一致 | Pass | 位置 B 取自 `preview/safety-report.html`；文案逐字取自预览与 Delta Spec |
| G1 rev2 follow-ups 已落任务 | Pass | 回执映射（T2 / E5）、`SafetyNote`（T4）、隐私黑名单（T1 / E7）、旧断言同步（T1）、后端不变（T6） |

**结论：Pass。** 未发现 Spec ↔ Design ↔ Tasks ↔ ATDD 的阻塞性不一致。