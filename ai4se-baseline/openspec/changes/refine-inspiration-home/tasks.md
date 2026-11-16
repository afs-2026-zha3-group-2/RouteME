# 任务：refine-inspiration-home

- **依据：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)、[`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)
- **Owner：** AO（Jay）
- **顺序：** T1 → T2 → T3 → T4 → T5 → T6；T1 先写失败验收（red），再进入实现。
- **契约：** 无契约改动；既有 `GET /api/matches` / `GET /api/experiences` 作为回归门禁。

## 任务清单

### T1 [tests] 先补 E2E 验收并修复选择器漂移

- [ ] `e2e/tests/trips.spec.ts`：新增 `defaults to the recruiting trips view with complete cards`、`distinguishes full trips from recruiting trips without color alone`、`keeps ended trips out of the default view`。
- [ ] `e2e/tests/experiences.spec.ts`：`.experience-card` 改为 `.exp-card`；新增 `switches to the experience view and marks ended origin trips`、`guides an empty search to publish from both views`、`shows skeletons instead of the previous view while lists load`。
- [ ] 加载态用可控 `page.route` 放行，断言 `[aria-busy="true"]` 后再 `release()`；不使用 `waitForTimeout`。
- [ ] 运行受影响 spec，记录预期失败（默认标签、状态图标、体验 CTA / 标识尚未实现）。

**验证：** 启动后端 + 前端后 `cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/experiences.spec.ts`（新断言 red，既有用例仍绿）
**覆盖：** E1–E6、E9–E10、E14–E15、R2–R5

### T2 [frontend] 默认视图文案与可访问标签

- [ ] `tripMessages.ts`：`plansView` 改为「招募中的行程」；新增 `goPublish: '去发布行程'`。`publish`、`createTitle` 不动。
- [ ] `HomePage.tsx`：`view` 初值保持 `'plans'`；`Segmented` 补 `aria-label="浏览视图"`，不新增路由或深链。

**验证：** `cd RouteME/frontend; npm run build; npm test`；浏览器确认默认选中「招募中的行程」
**覆盖：** E1、R5

### T3 [frontend] 状态徽标：文字 + 形状图标

- [ ] 新增 `frontend/src/trips/StatusBadge.tsx`：按 `recruiting / full / completed` 渲染人形加号 / 锁 / 旗帜图标，输出 `data-status` 与 `data-status-icon`，图标 `aria-hidden`。
- [ ] `TripCard.tsx` 封面徽标改用 `StatusBadge`；人数进度条保留 `.meter.full`。
- [ ] `styles.css`：`.status-icon` 尺寸、`.badge.has-icon::before { display: none }`。

**验证：** `cd RouteME/frontend; npm run build`；E2E `distinguishes full trips from recruiting trips without color alone`
**覆盖：** E3、R2

### T4 [frontend] 体验卡「已结束」来源标识

- [ ] `ExperienceCard.tsx`：在 `.exp-origin` 内复用 `StatusBadge status="completed"`，文案「已结束」+ 旗帜图标。
- [ ] `styles.css`：`.exp-origin-badge` 控制尺寸；390px 下 `.exp-foot` 允许换行。

**验证：** `cd RouteME/frontend; npm run build`；E2E `switches to the experience view and marks ended origin trips`
**覆盖：** E10

### T5 [frontend] 双视图空态、加载态与不残留

- [ ] `HomePage.tsx`：行程与体验空态统一主按钮「去发布行程」→ `#/trips/new`；行程空态保留「清除全部条件」；提取本地 `emptyActions` 避免重复。
- [ ] 两个视图骨架容器加 `aria-busy="true"` 与可读 `aria-label`；保留按视图的错误 `Alert` + 重试。
- [ ] 确认切换视图时只渲染当前视图卡片；不在客户端按 `status` 过滤行程。

**验证：** `cd RouteME/frontend; npm run build; npm test`；E2E 空态与加载态两个用例
**覆盖：** E2、E5、E6、E9、E14、E15、R3、R4

### T6 [verify] 全量回归与手工核对

- [ ] `cd RouteME/frontend; npm run build; npm test`。
- [ ] `cd RouteME/backend; .\mvnw.cmd -B test`（无代码改动，契约回归）。
- [ ] `cd RouteME/e2e; npx playwright test`（至少 trips / experiences 两个 spec 全绿）。
- [ ] 手工 1440 / 768 / 390：卡片不溢出、满员与招募中可区分、体验「已结束」可读、切换无残留。
- [ ] 确认 `openapi.yaml`、`backend/**`、`db/migration/**` 无 diff。

**验证：** 上述命令全绿；真实输出写入 local-verify 报告
**覆盖：** 全部场景 + RV-1–RV-5

## 执行记录（P4，2026-11-16）

- 前端：`npm run typecheck`、`npm run build`、`npm test`（9 文件 / 74 项）全绿。
- 后端：`MAVEN_OPTS=-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT` 后 `.\mvnw.cmd -B -ntp test`（154 项）全绿；S03 无后端改动。
- 契约：`npx -y @redocly/cli lint openapi.yaml` 0 error / 7 warnings（与基线一致）。
- E2E：`npx playwright test`（18 项，含本故事新增 6 项）全绿；同轮仅改测试修复 5 个先于本故事存在的选择器漂移（提交 `551666e`）。
- 走查：1440 / 768 / 390 三档，两个视图均无横向溢出，状态与「已结束」标识可脱离颜色识别。
- 证据：`docs/ai4se-plugins/20261116-105446-local-verify-report.md`（Overall Pass）。

## G2 执行记录（2026-11-16）

| 项 | 结果 | 证据 |
|---|---|---|
| G2 decision | Pass | [`g2-decision.md`](g2-decision.md)（VL=Neal；P4 DoV P4-1–P4-6 全 Pass） |
| pipeline ci / cd | Partial（`Pass-by-human-confirm`） | [`docs/ai4se-plugins/20261116-112704-pipeline-report.md`](../../../docs/ai4se-plugins/20261116-112704-pipeline-report.md)，release `build-711da3d` |
| 阶段记录 | Pass | [`docs/sdd/refine-inspiration-home/p4-verify.md`](../../../docs/sdd/refine-inspiration-home/p4-verify.md) |

**下一步：** P5（归档）由用户发起；归档前需 SA 具名追认 `trip-plans` + `trip-experiences` 双 capability 例外（L-01）。

## 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| 检查 | Result | Evidence |
|---|---|---|
| `trip-plans` Requirement 的 8 个 Scenario 均有 ATDD 行与任务 | Pass | E1–E8 / R2 在 `atdd-design.md` §1.2；D1–D3、D5–D6、D8；T1–T3、T5 |
| `trip-experiences` Requirement 的 7 个 Scenario 均有 ATDD 行与任务 | Pass | E9–E15 在 `atdd-design.md` §1.2；D1–D2、D4–D7；T1、T4、T5 |
| Non-goals 有反向验证 | Pass | RV-1–RV-5；T1 / T6 |
| 无静默范围扩张 | Pass | Design 只改前端展示；D8 记录 `/api/matches` 事实并明确不改契约 |
| 任务不越过 Delta 范围 | Pass | 无发布 / 详情 / 申请 / 聊天 / 分享发布 / 体验筛选扩展任务 |
| 任务一层一条、可执行 | Pass | T1 tests、T2–T5 frontend、T6 verify；每条含验证命令 |
| 最后一条为验证 / 回归 | Pass | T6 |
| ATDD 先于实现 | Pass | T1 先写 red 验收；T2–T5 实现；T6 回归 |
| 契约先行 | N/A | 无契约变更；既有契约在 T6 回归 |

**结论：Pass。** 未发现 Spec ↔ Design ↔ Tasks ↔ ATDD 的阻塞性不一致。