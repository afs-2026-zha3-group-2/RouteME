# Local verify report — refine-service-close（P4 / G2 输入）

- **Change:** `refine-service-close`（REQ-028 / S29 客服会话结束权交由用户，issue #38）
- **Branch:** `feature/refine-service-close`（P1 `f904f36`、P2 `5185b0d`、P3 `1e4f417`；并入 `origin/main@9a13fe4`）
- **日期:** 2026-11-18 ｜ **记录人:** Lewis Liu（当前开发者）
- **Environment:** Windows 11 25H2；Java 21.0.11；Node v24.18.0 / npm 12.2.2；隔离后端 `localhost:8090`（独立 SQLite `SqlLite/routeme-e2e-refine-close.db`，Flyway V1–V30）；前端 Vite `localhost:5176`（`ROUTEME_API_TARGET=http://localhost:8090`）；Playwright Chromium。共享 8080 / 5173 未触碰。

## 1. 命令与结果

| 层 | 命令（工作目录） | 结果 |
|---|---|---|
| 规格 | `npx --no-install openspec validate refine-service-close --strict`（ai4se-baseline/） | `Change 'refine-service-close' is valid`（3 Requirement / 31 Scenario） |
| 后端（CI 口径） | `.\mvnw.cmd -B -ntp verify`（backend/） | **583 tests / 0 failures / 0 errors / 0 skipped**，BUILD SUCCESS（含打包） |
| 前端单测 | `npm.cmd test`（frontend/） | **61 files / 475 tests passed**（3.27s） |
| 前端构建 | `npm.cmd run build`（frontend/） | 成功（`✓ built in 9.21s`，tsc + vite） |
| E2E | `npx.cmd playwright test tests/customer-service.spec.ts tests/admin.spec.ts`（e2e/，`ROUTEME_E2E_BASE_URL=http://localhost:5176`） | **14 passed**（1.4m） |
| 视觉走查 | Playwright 截图脚本（临时，跑完删除） | `docs/preview/refine-service-close/` 24 张：4 屏 × 1440/1024/390 × 浅/深；全部 `scrollWidth - clientWidth = 0` |

## 2. 覆盖的关键场景

| Delta 场景 | 验证面 | 结果 |
|---|---|---|
| 用户在三态（WAITING / HANDLING / RESOLVED）结束会话 | `ServiceControllerTest`（三态 CAS + 重复 close 409 + 无 Bearer 401）、E2E `[C3]` / `[C4]` | Pass |
| 客服「标记处理完成」进入待用户确认 | `AdminServiceControllerTest`（HANDLING→RESOLVED、非 HANDLING 409）、E2E `[C4]` / `[I3]` | Pass |
| 待用户确认下任一方发言回迁处理中并清空 `resolved_*` | `AdminServiceControllerTest` 回迁用例、E2E `[C4]`（用户发言后徽标回「客服已接入」，再 resolve 仍可结束） | Pass |
| 管理端 close 下线 | `OpenApiTest`「admin close 缺席 / 用户 close 存在」、E2E `[C3]`（admin close → 404）、`[I3]`（无「结束会话」按钮） | Pass |
| `resolved_at` 留痕、`resolved_by` 不下发 | `OpenApiTest` summary 字段、E2E `[C4]`（结束后 admin detail `resolved_at` 有值） | Pass |
| 概览 `by_status` 四桶 | `AdminDashboardControllerTest`（总数 = 四桶之和）、走查截图「客服会话：等待接入 / 处理中 / 待用户确认 / 已结束」 | Pass |
| 存量库可迁移 | `AdminConsoleMigrationSqliteTest`（`resolved_at` / `resolved_by` 列 + V30 记录）；隔离库启动 Flyway 30 个迁移成功 | Pass |

## 3. 实现要点

- **契约 0.25.0**：`ServiceSessionStatus` 四值、`ServiceSessionSummary.resolved_at`、新增用户 `POST /service/sessions/{id}/close` 与 `POST /admin/service/sessions/{id}/resolve`、删除 admin close、概览四桶（`required` + `properties`）。
- **迁移 V30**：`customer_service_sessions` 增 `resolved_at VARCHAR(40)` / `resolved_by INTEGER`，存量行留空。
- **后端状态机**：6 条合法迁移；`closeByUser` 三态 CAS、`resolve` HANDLING CAS、`appendMessage` 在 RESOLVED 下同事务回迁、`openSession` 扩三态（避免前端把「待用户确认」误判为已结束）。
- **前端**：用户端三态统一「结束会话」+ `Popconfirm`（按状态选文案）；管理端 `HANDLING` 显示「标记处理完成」、`RESOLVED` 只读提示；筛选五项；概览四段图例；`serviceChatHint` 单点文案。
- **测试新增**：`ServiceControllerTest` 6 例、`AdminServiceControllerTest` 4 例、`AdminDashboardControllerTest` 分桶断言、`OpenApiTest` 6 处、迁移断言、`serviceChatStatus.test.ts`、E2E `[C4]` 新增与 `[C3]` / `[I3]` 改写。

## 4. Red → Green

- **契约先行**：先改 `OpenApiTest`（版本 0.25.0 / 路径清单 / 四值枚举 / `resolved_at` / 概览四桶）与 `openapi.yaml` 断言，实现前红、实现后 **17 / 17** 通过。
- **后端先行**：先写 `ServiceControllerTest` / `AdminServiceControllerTest` 新用例（close 由用户调、resolve、回迁、旧路径 404），实现前 404 / 409 断言失败，实现后 `16 / 13` 通过，全量 `583 / 583`。
- **E2E 先行**：`[C3]` 改为断言 admin close 404 + 用户 UI 结束、新增 `[C4]` 全链回迁与结束，旧实现在 `[C3]` 即失败；实现后两条 spec **14 / 14**。

## 5. 验证期修正

| # | 发现 | 处理 |
|---|---|---|
| 1 | `[C4]` 同句「客服已标记处理完成…」同时出现在卡片头部与聊天头部，`getByText` strict mode 冲突 | 断言限定到 `.help-chat-head`（既有双处展示结构不改） |
| 2 | `[C4]` 确认按钮 `/确\s*认/` 误命中侧边账号按钮（昵称含「待确认」） | 限定 `.ant-popconfirm` 内的确认按钮（`[C3]` 同步加固） |
| 3 | 8082 端口被另一 worktree（`add-report-credit-deduction`）遗留旧后端占用，Windows 双绑导致请求随机命中旧代码（admin close 200 / resolve 404） | 改用独立 8090 + 独立 SQLite + 5176 前端；未终止他人进程 |
| 4 | 终端残留 `SPRING_DATASOURCE_URL`（指向另一 worktree 的 e2e 库）使 Spring 上下文创建失败（583 中 433 errors） | 清空该变量后复跑 `mvnw verify` → 583 / 583 |
| 5 | `e2e/npm install` 被企业镜像拒绝（`EALLOWREMOTE`，禁止 remote tarball） | 复制主工作区已安装的 `e2e/node_modules`（同 lockfile） |

## 6. 数据卫生

- E2E 与走查全部走隔离库 `SqlLite/routeme-e2e-refine-close.db`（V1–V30），未写开发库。
- 走查截图入库 `docs/preview/refine-service-close/`（24 张），临时截图脚本 `e2e/_walkthrough.mjs` 已删除。
- 临时脚本 `backend/run-tests.ps1` / `run-verify.ps1` 与日志已删除。

## 7. Overall

**Pass（change scope）**。规格、契约、后端、前端、E2E 与走查全部通过；无阻断失败、无需 Waiver。

- **PR gate：** 本项目按用户既定要求直接提交并 push，不执行 `/sdd:pr-submit`；本报告为 G2 输入，G2 由 VL 独立签署（`openspec/changes/refine-service-close/g2-decision.md`）。
- **记录债务：** ① 全量 E2E 未跑（T10 只要求两条受影响 spec；全量依赖高德 Key 等既有环境债务）；② Redocly CLI 本机未安装，OpenAPI 以 `OpenApiTest` 断言为准（CI 不含 Redocly）；③ 客服卡片头部与聊天头部同句提示重复属既有展示结构，本 change 未改；④ `docs/feedback/verification-commands.md` 仍为空模板，命令口径沿用 CI。
