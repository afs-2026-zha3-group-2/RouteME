# P4 实现与验证记录 — refine-safety-report

- **Change：** `refine-safety-report`（`trip-companions` REMOVED + ADDED，REQ-012 / S14 同行举报入口与回执）
- **阶段：** P4（Apply & verify）｜ **日期：** 2026-11-16 ｜ **记录人：** Jacky（当前开发者）
- **分支：** `main`（本地提交，未 push）
- **前置：** P3 Pass（`p3-design.md`，签署 8/8；`design.md` D1–D7、`atdd-design.md` E1–E7、`tasks.md` T1–T6）

## 1. 阶段目标

按 ATDD 与 `tasks.md` T1–T6 完成 D5 裁决后的前端收敛：详情页与聊天页的安全提示整块下线，唯一安全能力是页头文本入口（位置 B）；举报弹窗补目标行、身份保密与紧急求助说明，回执改为单一「关闭」并只在 `received === true` 时出现；不触碰后端、契约与迁移。

## 2. 实现摘要

| 层 | 改动 | 状态 |
|---|---|---|
| 详情页 | `trips/TripDetailPage.tsx`：删除 `SafetyNote`；`!isPublisher` 时在 `.detail-badges` 末尾渲染 `举报这条行程`；`ReportModal` 传 `targetLabel={trip.title}` | 修改 |
| 聊天页 | `chat/ChatPage.tsx`：删除 `SafetyNote`；入口作为 `.chat-head` 最后一个子节点，实时与只读都显示；传 `targetLabel={otherUser?.nickname ?? '同行者'}` | 修改 |
| 举报弹窗 | `safety/ReportModal.tsx`：新增必填 `targetLabel`；标题随 `targetType`；三态都渲染目标行、`我们不会向对方透露你的身份。` 与紧急求助说明；回执 `Alert`（`已收到，我们会处理` + 提示）+ 单一 `关闭`；`receipt.received !== true` 走失败分支且保留原因 / 说明 | 修改 |
| 安全提示组件 | `safety/SafetyNote.tsx`：收窄为无属性提示；`onReport` / `Button` / `action` 删除；`ShareExperiencePage` 调用点不变 | 修改 |
| 文案 | `i18n/tripMessages.ts`：新增 `reportEntryTrip` / `reportEntryUser` / `reportTargetPrefix` / `reportPrivacyNote` / `reportEmergencyNote` / `reportReceiptHint` / `reportClose`；`reportSuccess` → `已收到，我们会处理`；删除 `reportEntry` / `reportTitle` / `reportTargetTrip` / `reportTargetUser` | 修改 |
| 样式 | `styles.css`：`.detail-badges .head-report`、`.chat-head { flex-wrap: wrap }`、`.chat-report`；无新颜色令牌、无新断点 | 修改 |
| E2E 支撑 | `e2e/tests/support.ts`：抽出 `loginAs` / `switchUser` / `todayIso` / `isoDaysFromToday` / `createTripViaApi` / `applyViaApi` / `acceptApplicationViaApi` / `API` | 新增 |
| E2E 验收 | `e2e/tests/safety-report.spec.ts`：E1–E7（含三档视口、`POST /api/reports` 响应、失败重试、隐私黑名单、已收到回执） | 新增 |
| 既有 E2E | `companions.spec.ts` 改为引用 helper 并同步举报断言；`profiles.spec.ts` 的 `keeps the existing trip report entry working` 改按 `.detail-badges` 与弹窗标题断言 | 修改 |
| 后端 / 契约 / 迁移 / 原型 | 无改动（`POST /api/reports` 仍返回 `201` + `{ "received": true }`） | — |

## 3. Red → Green 证据

| 步骤 | 观察 |
|---|---|
| Red（E2E 新套件） | 在未修改的实现上跑 `npx playwright test tests/safety-report.spec.ts` → **7 failed**：E1 / E2 / E3 / E6 / E7 均因页头入口不存在（`.detail-badges` / `getByRole('button')` 找不到 `举报这条行程` / `举报这位用户`），E4 因本人行程详情页 `.safety-note` 仍为 1 条，E5 因聊天页入口缺失无法进入回执流程 |
| Red（既有 spec 同步） | `companions.spec.ts` 停在 `举报这位用户` 点击超时；`profiles.spec.ts` 的举报入口用例停在旧查询（`/^举\s*报$/` 与 `举报行程或用户`）。同一次运行中另有 4 条 `profiles.spec.ts` 失败，原因是当时 8080 的库已被并行会话的 `V16__normalize_demo_user_profiles.sql` 归一化，属环境漂移，非本 change 造成 |
| Red 证据 | `C:\Users\CHIUJA2\AppData\Local\Temp\opencode\red-safety-2.txt`、`red-existing.txt`（临时日志，不随仓库提交） |
| Green（新套件） | `npx playwright test tests/safety-report.spec.ts` → **7 passed（16.8s）** |
| Green（既有 spec） | `companions.spec.ts › applies, gets accepted, chats, reports and leaves` → 1 passed；`profiles.spec.ts › keeps the existing trip report entry working` → passed |

## 4. 验证结果

| 命令 | 结果 |
|---|---|
| `cd RouteME/frontend; npm run typecheck` | 无错误（`tsc --noEmit` 无输出） |
| `cd RouteME/frontend; npm run build` | 成功（919 ms；JS 1,178.01 kB / CSS 51.36 kB） |
| `cd RouteME/frontend; npm test` | Test Files **16 passed** / Tests **137 passed** |
| `cd RouteME/backend; .\mvnw.cmd -B -o test` | Tests run: **230**, Failures: 0, Errors: 0，BUILD SUCCESS |
| `cd RouteME/e2e; npx playwright test tests/safety-report.spec.ts` | **7 passed** |
| `cd RouteME/e2e; npx playwright test`（隔离环境） | **48 passed / 13 failed**（4.6 min），逐条归因见 §5 |
| `git diff main -- RouteME/backend RouteME/openapi.yaml` | 空（RV-6） |
| `npx --no-install openspec validate refine-safety-report --strict` | `Change 'refine-safety-report' is valid` |
| `grep -rn "onReport" RouteME/frontend/src` | 无结果（T4 收口） |
| CI / CD | 未运行（按用户约定：P4 只做本地提交，不 push、不开 PR） |

隔离环境：后端 8090 + 独立 SQLite `p4-refine-safety-report.db` + Vite 5180（临时配置 `vite.p4.config.ts` / `playwright.p4.config.ts`，验证后已删除）。默认端口 8080 / 5173 / 5174 被其他并行会话占用，按 `tasks.md` 风险项改用隔离端口，不改测试默认值。

## 5. 全套 E2E 失败归因（13 条）

| # | 失败项 | 根因 | 与本 change 的关系 |
|---|---|---|---|
| 1–12 | `profile.spec.ts` 12 条（`blocks the submit…`、`offers every job…`、`saves a custom job…`、`opens the birthday calendar…` 等） | 该文件是并行会话的**未提交改动**，依赖同会话未跟踪的 `V16__normalize_demo_user_profiles.sql` 与新资料设置页；本轮按已提交基线运行（`V16` 移出 `db/migration`），页面停在旧流程，`openSetup` 找不到 `h2` | 无关。`profile.spec.ts`（单数）、`ProfileSetupPage.tsx`、`AppShell.tsx` 均未纳入本次提交 |
| 13 | `trips.spec.ts:166 › blocks publishing and flags every missing required field` | antd 6 的 `DatePicker` 不再渲染 `.ant-picker-clear`，只保留 `.ant-picker-suffix` 的日历图标（DOM 已抓取确认）；该 helper 与发布页均未在本 change 触碰 | 无关，属既有 antd 6 DOM 漂移 |

补充：首轮全套运行（`full-e2e.txt` / `full-e2e-2.txt`）另有 `trips.spec.ts:231` / `:273` 两条失败，根因是本套件早期版本新建了 6 条「今天出发」的行程，把首页匹配列表（按匹配度取前 15 条）里的种子卡片挤出。已通过复用种子行程修正夹具，复跑后这两条转绿，见 §7 偏差 1。

## 6. 三档视口与浅色 / 深色走查（T5）

对详情页（`/#/trips/5`）与聊天页（`/#/chat/1/2`）在 390 / 768 / 1440 × 浅色 / 深色共 12 组组合下逐一检查：

| 检查 | 结果 |
|---|---|
| 页头入口可见 | 12 / 12 可见 |
| 横向溢出 `scrollWidth - innerWidth` | 12 / 12 为 0 |
| 390 档举报弹窗宽度 | 不超出视口 |
| 弹窗正文对比度（WCAG） | 浅色 5.51:1 / 深色 5.93:1（均 > AA 4.5:1） |
| 回执态 | 浅 / 深色均显示 `已收到，我们会处理` + 提示，footer 仅 1 个按钮（文案 `关 闭`，antd 在两字按钮间插空格） |

390 档的人工核对截图（临时目录）：`p4-dark-390-modal.png`、`p4-dark-390-receipt.png`、`p4-light-390-report.png`、`p4-dark-390-report.png`。深色弹窗中目标行、保密说明、紧急求助、原因选择、说明框与回执均可读；390 档入口保持可见并按内容换行，未被隐藏。

## 7. 实现偏差与设计一致性

| # | 设计 / ATDD | 实现 | 说明 |
|---|---|---|---|
| 1 | E1 / E3 / E6 / E7 各自新建行程；E4 新建本人行程 | E1 / E3 / E6 / E7 复用种子行程 5（`深圳大鹏半岛海岸线徒步`，发布者 user 2）；E4 复用种子行程 1（`珠海情侣路摄影一日游`，发布者 user 1，已结束）；仅 E5 新建 1 条（出发日期 +45 天） | 首页默认列表按匹配度取前 15 条，新增「今天出发 + 摄影标签」行程会把 `trips.spec.ts` 依赖的种子卡片挤出，导致既有用例失败。夹具改为复用种子数据后，断言强度不变（入口位置、三档布局、目标行、回执与隐私黑名单均保留） |
| 2 | `atdd-design.md` E2 引用旧文案 `该行程已结束，只能查看历史消息。` | 断言使用当前实现 `这次行程已经结束，聊天转为只读，历史消息仍可查看。` | 文案由 REQ-011 的聊天只读改造落地，本 change 不改变它；P5 归档时同步 ATDD 引文 |
| 3 | 选择器按通用写法 | antd 6 下使用 `.ant-select-content` / `getByRole('combobox')`、`.ant-select-dropdown .ant-select-item-option`、`/^关\s*闭$/`、`.ant-modal-footer` 作用域 | antd 6 的 DOM 与 v5 不同；弹窗关闭 X 与 footer 按钮同名，需限定 footer |
| 4 | 后端 / 契约零改动 | 零改动；但本地跑后端测试时必须让并行会话的未跟踪 `V16` 留在 `db/migration` 之外 | `V16` 会把演示账号资料归一化，而已提交的 `UserProfileControllerTest` / `ProfileDataMigrationSqliteTest` 断言旧种子值；这是并行会话的在途工作，不计入本 change |

## 8. 残余风险

| 风险 | 处理 |
|---|---|
| E2E 不在 CI（`.github/workflows/ci.yml` 只跑后端 `./mvnw verify` 与前端 `build && npm test`） | 本记录贴出真实命令与输出；建议另立 change 把 E2E 纳入流水线 |
| E2E 共享数据库、无清理 | 大列表类断言（匹配列表前 15 条）对数据累积敏感；本次用隔离库 + 复用种子行程缓解，长期建议独立测试库或 `afterEach` 清理 |
| 并行会话在途改动（`profile.spec.ts`、资料设置页、`V16`） | 未纳入本次提交；其 12 条失败不计入本 change，待该会话自行收敛 |
| 举报无处置面 | 按 D2 / 非目标，回执只确认收到，处置流程不在本次范围 |
| G2 未签署 | P4 记录不等于 G2；需 VL Neal 独立复核本记录与代码后再准入 G2 |

## 9. 提交与签署

| 阶段 | 提交 |
|---|---|
| P1（意图 / 提案 / delta） | `30085eb` |
| P2（Delta 复核 + lint + G1 rev2） | `2ddfa03`、`642e529`、`159c48f`（rev1 结论作废） |
| P3（ATDD / design / tasks + 签署） | `cee7ccd`、`b2becdf`、`5aaadca` |
| P4（实现 + E2E + 本记录） | `434d937` `feat(p4): refine-safety-report move the report entry to the headers`（本地，未 push） |

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| 当前开发者 | Jacky | T1–T6 实现、红绿证据、本地回归、三档与主题走查 | 2026-11-16 |
| VL | Neal | 待独立复核本记录与代码后签署 G2 | 待签署 |
| SA | Karena | 实现未越出 Delta 9 场景与 D5 裁决 | 待确认 |
| IO | WAYNE | 已知悉残余风险（E2E 不在 CI、共享数据库、并行会话在途改动） | 待确认 |

**阶段结论：P4 完成（本地）。** T1–T6 全部收口；本 change 的 E2E 与改动的既有 spec 全绿，后端 230 项与前端 137 项全绿；全套 E2E 的 13 条失败已逐条归因到并行会话在途工作与既有 antd 6 漂移。G2 待 VL Neal 签署，归档留在 P5。