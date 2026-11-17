# 任务：refine-detail-companions

- **依据：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`design.md`](design.md)、[`atdd-design.md`](atdd-design.md)
- **约束：** 一条任务只落一层；零后端 / 契约 / 迁移；先原型后实现；卡片排版复用 `.publisher-*`；新样式只追加到 `styles.css` 末段。
- **状态：** 已完成（P4 Pass，G2 Pass，2026-11-17）；P5 暂不执行。

## 任务清单

### T1 [prototype] 原型先行：同行者卡片

- [x] `docs/prototype/ui.js` 的 `compPanel`：只渲染 `parts.filter(p => p.id !== t.creatorId)`；每张卡改为与发起人同构的资料卡（头像、昵称、摘要 `school || job || city`、简介、兴趣标签），整卡 `data-action="profile"`。
- [x] 无其他同行者时渲染既有 `.companions-empty`（「还没有其他同行者。」），不渲染空卡片。
- [x] `docs/prototype/styles.css` 新增 `.companion-card` 等最小样式，令牌取自既有变量；`.companion` 保留给身份切换弹窗，不改其定义。
- [x] 人工核对 `docs/prototype/prototype.html` 详情页在窄屏下的换行与聊天按钮位置。

**验证：** 浏览器打开原型详情页，逐一核对「有同行者 / 仅发起人」两种状态；与 `docs/prototype/discovery-*.html` 的既有卡片风格一致。

### T2 [frontend] 纯逻辑：过滤 / 去重 / 保序

- [x] 先写 `frontend/src/trips/companions.test.ts`（Red）：发布者被过滤；重复 id 只保留首次；顺序等于入参顺序；空数组与仅发布者都返回空。
- [x] 再实现 `frontend/src/trips/companions.ts` 的 `tripCompanions(participants, publisherId)`（Green），类型用现有 `DemoUser`。

**验证：** `cd RouteME/frontend; npm test -- companions` → 全绿；Red 证据留在 P4 验证报告。

### T3 [frontend] 卡片组件与详情页接入

- [x] 新增 `frontend/src/trips/CompanionCard.tsx`，props 为 `member` / `canChat` / `chatHref` / `onOpenProfile`：`li.companion-card` > `button.publisher-row.publisher-button`（`aria-label="查看 {昵称} 的资料"`、`Avatar size="lg"`、复用 `.publisher-body / .publisher-name / .publisher-bio / .publisher-tags`）+ 兄弟节点 `a.companion-chat`。
- [x] 摘要用 `publisherSummary(member)`；空串时有 ` · ` 分隔符不渲染，简介 / 兴趣不渲染占位。
- [x] `tripMessages.detailParticipantsEmpty = '还没有其他同行者。'`。
- [x] `TripDetailPage.tsx`：同行者区改用 `tripCompanions(trip.participants, trip.publisher.id)` + `CompanionCard`，空态渲染 `p.detail-companions-empty`；`canChat` 条件与 `openProfile` 保持不变。

**验证：** `cd RouteME/frontend; npm run typecheck`、`npm run build`。

### T4 [frontend] 样式收敛

- [x] 从 `.detail-stops, .detail-participants` 与 `.detail-stops li, .detail-participants li` 两处组合选择器中摘出 `.detail-stops`，保留其原有样式。
- [x] 删除 `.detail-participants li` 与 `.detail-participant-chat` 规则。
- [x] 文件末段新增 `.detail-companions`、`.companion-card`、`.companion-card .publisher-button`、`.companion-chat`、`.detail-companions-empty`；只用既有令牌，无十六进制色值。

**验证：** `Select-String -Path RouteME/frontend/src/styles.css -Pattern 'detail-participants'` → 0 命中；`npm run build`。

### T5 [e2e] 同行者卡片端到端用例

- [x] 新增 `e2e/tests/detail-companions.spec.ts`，首个用例为 API 守卫 A1（`GET /api/trips/{id}` 的 `participants` 仍含发布者、3 条、字段完整），首次运行即绿。
- [x] `shows companion cards and keeps the publisher out of the list`：2 张卡、发布者按钮计数 1、`已加入 3/4 人`、卡序等于响应顺序。
- [x] `falls back to job or nickname when profile fields are missing`：周野（id 4）摘要为「产品经理」；注册的稀疏用户只渲染头像 + 昵称，无 `undefined` / 悬空 ` · `。
- [x] `renders a readable empty state when only the publisher joined`。
- [x] `opens a companion profile without leaving the detail page`：`.ant-modal` 出现、URL 不变、关闭后仍在详情页。
- [x] `shows the chat entry to the publisher and companions but not to outsiders`：发布者 2 条、同行者 1 条（自己的卡 0 条）、旁观者 0 条。
- [x] `keeps companion cards inside the viewport in both themes`：390 / 768 / 1024 / 1440 × 浅 / 深色，`scrollWidth - clientWidth <= 1`。

**验证：** `cd RouteME/e2e; npx playwright test tests/detail-companions.spec.ts` → 全绿（需后端 + 前端已启动）。

### T6 [e2e] 既有选择器同步

- [x] `e2e/tests/chat-entry.spec.ts` 的 `.detail-participants` 定位改为 `.detail-companions`，定位到同行者卡的「聊天」链接。

**验证：** `cd RouteME/e2e; npx playwright test tests/chat-entry.spec.ts` → 1 项通过。

### T7 [verify] 回归与验证报告

- [x] 前端：`npm run typecheck`、`npm run build`、`npm test`。
- [x] 端到端回归：`npx playwright test tests/detail-companions.spec.ts tests/chat-entry.spec.ts tests/trips.spec.ts tests/companions.spec.ts`。
- [x] 后端未改动仍跑一次 `backend/mvnw.cmd -B -o clean test`，确认零误伤。
- [x] 反向复核 Non-goals：`git diff --name-only origin/main...HEAD` 不含 `backend/**`、`openapi.yaml`、`db/migration/**`。
- [x] `docs/ai4se-plugins/<ts>-local-verify-report.md` 记录 Red 证据、Green 结果与命令原文。

**验证：** 报告文件落在 `docs/ai4se-plugins/`，命令与输出可复现。

### T8 [docs] 阶段记录与状态

- [x] `docs/sdd/refine-detail-companions/p4-verify.md` 记录实现、测试与 G2 签署。
- [x] 更新 `requirement-workspace/registry.md` 与 `handoff.md` 的 REQ-020 状态。
- [x] `docs/sdd/README.md` 索引补齐 P3 / P4 链接。

**验证：** 文档链接可达，registry 状态与提交链一致。

## 依赖与顺序

T5、T6 的用例先写并跑红 → T1 原型（仅设计稿）→ T2 纯逻辑（Red → Green）→ T3 实现接入 → T4 样式收敛 → T7 回归 → T8 文档。T2 的测试先于 T3 的实现；T5 / T6 在 T1 之前完成，保证验收先行。
