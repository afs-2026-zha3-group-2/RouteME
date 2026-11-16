# P4 实现与验证记录 — add-user-profile

- **Change：** `add-user-profile`｜ **阶段：** P4（Apply & verify / G2）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO），opencode 代录
- **依据：** [`specs/user-profile/spec.md`](../../../openspec/changes/add-user-profile/specs/user-profile/spec.md)、[`specs/user-auth/spec.md`](../../../openspec/changes/add-user-profile/specs/user-auth/spec.md)、[`atdd-design.md`](../../../openspec/changes/add-user-profile/atdd-design.md)、[`design.md`](../../../openspec/changes/add-user-profile/design.md)、[`tasks.md`](../../../openspec/changes/add-user-profile/tasks.md)

## 1. 阶段目标

按 ATDD（T1 → T8）完成「注册瘦身 + 资料完善 + 公开主页 + 头像 + 发布者入口」的实现，跑通本地验证与 CI 等价命令，准备 G2 复核材料，并由 VL 独立签署 G2。

## 2. 实现摘要

| 层 | 改动 | 提交 |
|---|---|---|
| 契约 | `openapi.yaml`：`UserProfile` / `UserProfileUpdateRequest`、4 个资料路径、`Error.fields`、`USER_NOT_FOUND`；`DemoUser` 扩展 `avatar_url` / `city` / `major` / `job` / `profile_complete`；`AuthRegisterRequest` 收窄为三字段；版本保持 **0.7.0** | `2423c01` |
| 迁移 | `V10__add_user_profile.sql`：8 个可空列（`avatar_url` / `birthday` / `gender` / `city` / `major` / `job` / `mbti` / `travel_style`）；复用 V3 的 `school` / `bio` / `interests`；不新增表 / 索引、不回填 | `2423c01` |
| 后端领域 | `ProfileConstant`、`ProfileRules`（年龄 / 星座 / 完善状态 / 摘要回退 / 图片魔数）、`UserProfile`、`AvatarFile`、`UserProfileUpdateRequest`、`UserProfileResponse` | `2423c01` |
| 后端读写 | `UserProfileController`：`GET /api/users/{id}/profile`、`PUT /api/users/{id}/profile`、`POST /api/users/{id}/avatar`、`GET /api/users/{id}/avatar`；`UserProfileServiceImpl` 单事务保存、头像写文件 → 更新列 → 删旧文件；本人响应含 `birthday`，他人省略；权限 Bearer 优先，演示身份 403，无会话 401 | `2423c01` |
| 注册瘦身 | `AuthRegisterRequest` 三字段；旧字段被忽略仍 201；`DemoUserService.createAccount` 去掉资料参数；注册返回 `profile_complete=false`；`avatar_initial` 取昵称首字 | `2423c01` |
| 配置 | `application.yaml`：multipart 2 MB / 请求 3 MB、`routeme.profile.avatar-dir`；启动创建目录 | `2423c01` |
| 前端数据层 | `types.ts` / `api.ts`（`ApiError` + 三个资料 API）/ `route.ts`（`#/profile/setup`、`#/users/{id}`）/ `profileOptions.ts` / `profileForm.ts` / `profileDisplay.ts` / `authForm.ts` 收窄 | `2423c01` |
| 前端页面 | `ProfileSetupPage`、`ProfilePage`、`InterestPicker`；`App.tsx` 路由与登录后跳转、`MyTripsPage` 资料卡、`TripCard` 发布者按钮、`TripDetailPage` / `ExperienceCard` 作者入口、`Avatar` 图片回退、`AppShell` 摘要、`styles.css` | `2423c01` |
| 测试 | 后端新增 `UserProfileControllerTest`（14）、`UserProfileRulesTest`（24）、`ProfileMigrationSqliteTest`（1），扩展 `AuthControllerTest` / `OpenApiTest`；前端新增 2 个测试文件、扩展 `authForm` / `route`；E2E 新增 `profile.spec.ts`（10） | `2423c01` |
| 既有 E2E | `trips.spec.ts` 宿主名断言由精确 `'陈屿'` 改为 `toContainText`（卡片新增学校 · 专业摘要） | `2423c01` |

## 3. Red → Green 证据

| 步骤 | 观察 |
|---|---|
| Red（路由 / 端点缺失） | T1 先写 10 条 E2E：`#/profile/setup`、`#/users/{id}` 与资料端点尚不存在；首次联调时注册仍按旧口径要求 `school`，fixture 阶段 400 |
| Red（联调缺口） | 新构建上仍有 3 条失败：学校文本命中 2 个元素；兴趣上限卡片未禁用（用 `title` 表达）；自定义标签取消后「添加」不改变选中态 |
| Red（后端缺陷） | 头像上传后 `GET` 404：读取把 URL 段当文件名；改为按 `{userId}-` 前缀解析、最新 mtime 命中后通过 |
| Green | API 14/14、规则 24/24、迁移 1/1、`profile.spec.ts` 10/10、全量 E2E 35/35、前端 95/95、后端 198/198 |

T1 的原始 red 日志未单独留存；上表为联调阶段留存并修复的失败。完整计数与命令见 [`20261116-120800-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-120800-local-verify-report.md)。

## 4. 验证结果

| 命令 / 检查 | 结果 |
|---|---|
| `cd RouteME/backend; .\mvnw.cmd -B -ntp verify` | Tests run **198**, Failures 0, Errors 0；BUILD SUCCESS |
| `cd RouteME/frontend; npm run build` | 成功（>500 kB chunk 警告为既有体积） |
| `cd RouteME/frontend; npm test` | 11 files / **95** tests passed |
| `cd RouteME/e2e; npx playwright test tests/profile.spec.ts` | **10 passed** |
| `cd RouteME/e2e; npx playwright test` | **35 passed**（含合并 `add-trip-publish` R2 后在全新库上的复跑） |
| 迁移（全新库） | `ProfileMigrationSqliteTest`：V1–V10，`now at version v10` |
| 迁移（旧库） | 启动日志 `9 → 10 - add user profile` 成功；演示用户 1–3 新列为 NULL，旧 `school` 文案保留 |
| 手工 1440 / 768 / 390 × 浅 / 深色 | setup 与公开主页均 `scrollWidth === innerWidth`；390 下标题 top=84 / 顶栏 bottom=66 |
| 反向核对 | 行程 / 申请 / 聊天 / 体验控制器无逻辑 diff；匹配分数与理由未变；他人响应无 `birthday` |
| CI（本地等价 + 远端） | backend + frontend 全绿；远端 release `build-e54f273`（含 `a95254c`；中间 `build-022659c`），见 [`ci-report.md`](../../../openspec/changes/add-user-profile/ci-report.md) |

## 5. P4 DoV 检查（`checklists/p4.md`）

| id | 检查 | 结论 |
|---|---|---|
| P4-1 | 本地验证报告存在 | Pass（`docs/ai4se-plugins/20261116-120800-local-verify-report.md`） |
| P4-2 | 本地 Overall = Pass | Pass |
| P4-3 | `phase=ci` | Pass（`ci-report.md` 本地等价全绿；远端 `e54f273` 由 `build-e54f273` tag 推断 success） |
| P4-4 | `phase=cd` | Pass（release `build-e54f273`；中间 `build-022659c`） |
| P4-5 | `g2-decision.md` | Prepared（文件已建，Decision 留空待 VL 签署） |
| P4-6 | Apply 与 Verify 分离 | Pass（实现方未自签 G2；VL / SA 签署列留空） |

## 6. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P1（intent + requirement + proposal） | `1219e04`（含 `ae417c5` 修订：学校选填、新增职业） |
| P2（delta + G1） | `3f4e488` |
| P3（ATDD + tasks + preview） | `a5fb4ec`、`9b98570`；REQ 重编号 `385fc41`；impact-brief 指向 `130887d` |
| P4（实现 + 测试） | `2423c01` |
| P4（验证 / G2 材料） | 本阶段提交 |

## 7. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 实现与 P3 任务一致；验证命令可复现；承担遗留项 | 2026-11-16 |
| VL | Neal | **待签**：独立复核本地验证与 CI，确认 24 + 6 场景有对应断言 | — |
| SA | Jacky、Karena | **待签**：实现未越出 Delta Spec；具名追认双 capability 例外（`user-profile` ADDED + `user-auth` MODIFIED） | — |
| IO | Wanye | **待签**：收到残余风险（远端 CI 未观测、E2E 不入 CI、旧分支冲突） | — |
| SM | Lewis | **待签**：G2 结论与交付范围 | — |

**阶段结论：Pending（G2 待 VL 签署）**

## 8. 残余风险与移交

| # | 项 | Owner | 处理时机 |
|---|---|---|---|
| 1 | 远端 CI job 级明细与 run URL 不可得（tag 证据已有） | AO | 可接受；不阻塞 G2 |
| 2 | 10 条资料 E2E 与全量 35 条 E2E 不在 CI 内 | AO | 评估把 Playwright 纳入 CI |
| 3 | 双 capability 例外尚无 SA 具名追认 | SA | 归档前必须完成 |
| 4 | `origin/feature/add-user-profiles` 有一份未合并的旧实现（`d3d6178`，含同名 `V10__seed_viewer_profile_user.sql`、`UserProfileController`、`ProfileModal`） | AO + SA | 归档前确认作废 / 删除该分支，避免迁移版本冲突 |
| 5 | 契约版本按现状保持 0.7.0；`tasks.md` 的「0.6.0 → 0.7.0」为陈旧表述 | AO | P5 校正文档 |
| 6 | 兴趣词表别名仅在前端预设归一，服务端存规范值 | AO + BA | 独立 change |
| 7 | E2E 依赖种子库：重复运行累积账号 / 行程，种子行程会被挤出首页第一页；本轮复跑前已重建本地库 | AO | 评估独立测试库 / 清理钩子 |
| 8 | 头像目录在启动时创建；运行中删除目录会导致上传 500 | AO | 评估写入前 `createDirectories` |

## 9. G2 前回归修复

| 问题 | 定位 | 处理 |
|---|---|---|
| 注册返回 502 | P4 收尾时后端进程被停掉；Vite dev proxy 连 `localhost:8080` 被拒（`ECONNREFUSED`）即回 502 | 重启后端 `spring-boot:run`；`POST /api/auth/register` 直连与经 proxy 均 201 |
| 职业 / MBTI 下拉「没有可选项」 | antd 6.7.0 的 Select 弹层在系统要求减少动效（`prefers-reduced-motion: reduce`）时定位到 `left: -1000vw`（实测 `-12800px`）：选项在 DOM 内、但整层不在视口；`no-preference` 下同一弹层位于 `left: 344` | 两处改用原生 `<select class="native-select">`（与 `HomePage` 排序筛选、设计稿一致），保留「不填写」空值；E2E 新增 `offers every job and MBTI option in the setup form` |

验证：`npm run typecheck` 通过；`npm test` 13 files / **105** tests；`npx playwright test tests/profile.spec.ts` 11 条中 **10 通过**（`opens a publisher profile from a trip card` 因并行 change `a13416c` 移除首页搜索框而失败，与本修复无关）；Playwright 以 `reducedMotion: 'reduce'` 实测：5 个职业选项、17 个 MBTI 选项全部可选中，表单上不再出现 antd 弹层。

同一弹层缺陷仍影响 `ProfileSetupPage` 的城市 `AutoComplete`、`ReportModal` 与 `Pager` 的 `Select`（未见用户报告）；按「一次 change 一件事」留作独立 change。

## 10. P5 状态

未执行。归档时需：新建 `openspec/specs/user-profile/`（7 Requirement / 24 Scenario 全量合入）、把 MODIFIED「注册账号」合并进 `openspec/specs/user-auth/spec.md`（保留 4 个基线场景）、补 `summary.md`、登记 `docs/knowledge/`、清理 `origin/feature/add-user-profiles` 旧实现，并将本 change 移入 `changes/archive/`。