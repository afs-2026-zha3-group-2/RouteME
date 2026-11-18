> ⚠️ **已作废 / OBSOLETE（2026-11-15）** — 本文运行说明（`MailGateway`、`ReviewReminderService`、`staffing.mv.db`、H2 Console、`V5`/`V6` 演示数据、travel-review、review-reminders 扫描等）针对**已移除的 "staffing" 应用**，与当前唯一应用 **RouteME 路觅** 无关。RouteME 的运维说明尚未在此登记。
> 保留仅作历史参考，**不得作为 RouteME 的运维证据**。`_LOG.md` 与 `rules/` 不受影响。

# Operations knowledge

Ops, monitoring, incident, and release notes.

## 通知与复审提醒运行说明

- 邮件发送通过 `MailGateway` 适配：默认 `LoggingMailGateway` 只记录收件人与摘要，不连接真实 SMTP；接入真实邮件服务时替换该 Bean。
- 发送异常由 `NotificationService.record` 捕获并记为 `failed`，业务事务不回滚；失败记录在 `GET /api/notifications` 可见，并可用 `POST /api/notifications/{id}/retry` 重试。
- 复审提醒由 `ReviewReminderService` 扫描：复审到期日取自 `travel_reviewed_at + 6 个月`，到期前 30 天向“全体资源协调员”发送一封；同一候选人同一到期日只发一封（`payload` 中的候选人 + 到期日去重）。
- 演示数据 `V5` 预置一条失败的复审提醒（吴迪，到期日 2026-11-07），用于展示失败列表与重试；`V6` 回填该候选人的复审日期，使其状态推导为过期。
- 复审完成入口：`POST /api/candidates/{id}/travel-review`，将最近复审日期置为当天并顺延六个月。
- 演示环境不提供定时任务；提醒扫描由协调员在通知页手动触发（`POST /api/notifications/review-reminders/scan`），生产环境接入调度器时复用同一服务方法。

## 前端工具链基线

`frontend/` 的依赖版本以本节为准，升级前先核对本表。

| 依赖 | 版本基线 | 说明 |
|---|---|---|
| `vite` | ^8.3.5（实测 8.3.8） | Vite 8 内置 Rolldown，**不再依赖 esbuild** |
| `@vitejs/plugin-react` | ^6.3.0 | 与 Vite 8 配套 |
| `vitest` | ^5.1.0 | 配置文件从 `vitest/config` 导入 `defineConfig` |
| `typescript` | ^5.9 | `npm run build` 先执行 `tsc --noEmit` |
| `react` / `react-dom` | ^19 | — |

- 配置文件固定 `frontend/vite.config.ts`，不再使用 `vite.config.mjs`。
- `/api` 代理指向 `http://localhost:8080`；后端未启动时出现 `ECONNREFUSED` 属正常。
- 现有 5 个测试文件均为纯函数测试，**不安装** `jsdom` 与 `@testing-library`；新增 DOM 测试时再补。

### 已知故障：`Cannot read directory ... Access is denied`

**症状**

```text
X [ERROR] Cannot read directory "../../../../../../..": Access is denied.
X [ERROR] Could not resolve "...\frontend\vite.config.ts"
failed to load config from ...\frontend\vite.config.ts
```

**根因**：`vite` 7.x 依赖 `esbuild`；本机 Windows 下 esbuild 0.28.x 解析配置文件时会向上遍历到盘符根目录被拒，导致连已存在的配置文件都无法加载。Vite 8 改用 Rolldown，不经过 esbuild，因此不会触发。

**排查顺序**

1. 读取 `node_modules/vite/package.json` 确认主版本为 8，并检查 `node_modules/esbuild` **不存在**。
2. 若 `esbuild` 仍在，说明依赖树仍是 Vite 7：把 `package.json` 的 `vite`、`@vitejs/plugin-react`、`vitest` 对齐上表后执行 `npm install`（会移除 esbuild 及旧依赖）。
3. 确认配置文件为 `vite.config.ts`，且从 `vitest/config` 导入 `defineConfig`。
4. 三项验证：`npm run build`、`npm test`、`npm run dev`；dev 启动后访问 `http://localhost:5173/` 应为 HTTP 200。

**不要**回退到 Vite 7 + esbuild 组合。“依赖装齐、版本自洽”不代表可运行，必须以上述三项验证为准。

## RouteME 后端运行与验证

```text
Windows     cd RouteME/backend; .\mvnw.cmd -B verify          # 全量测试（H2 + SQLite）
Windows     cd RouteME/backend; .\mvnw.cmd spring-boot:run    # 启动 8080
其他平台     ./mvnw -B verify / ./mvnw spring-boot:run
```

- 数据文件 `RouteME/SqlLite/routeme.db`（默认 `jdbc:sqlite:../SqlLite/routeme.db`，可用 `SPRING_DATASOURCE_URL` 覆盖；启动时由 `SqliteDirectory` 自动建父目录）；Flyway 启动时应用 `V1`–`V8`（greetings、app_users、trip_plans、trip_applications、chat_messages、reports、trip_experiences），迁移只增不改；重置演示数据时停止后端并删除该文件后重启。
- 冒烟：`GET /api/greeting`、`GET /api/users`、`GET /api/trips`、`GET /api/experiences`（其余 `/trips*`、`/me/*`、`/matches*` 需 `X-User-Id`，1–3 为演示账户）。
- 契约校验：`cd RouteME; npx @redocly/cli lint openapi.yaml`（0 error），或 `cd RouteME/backend; .\mvnw.cmd -Dtest=OpenApiTest test`。
- 前端：`cd RouteME/frontend; npm run build; npm test`。
- 端到端：详见下节「E2E 效率手册」；完整操作手册在 [RouteME/e2e/README.md](../../RouteME/e2e/README.md)。
- 时钟口径（2026-11-17）：后端测试涉及种子行程状态一律 `@Import(FixedClockTestConfig.class)`（NOW=2026-11-16T09:00Z）并用 `trip.status(NOW)`；生产代码一律用注入 `clock.instant()`，禁用无参 `status()`（Instant.now()）——日期翻篇后种子行程过期会误判 COMPLETED（updateMeeting 409 缺陷已修）。e2e 首页断言用未来日期行程，不依赖固定种子出发日。

## E2E 效率手册（2026-11-18）

全量串行约 9 分钟，瓶颈是「串行执行 + 已知红跑满 30s 超时 + 每轮删库重放 Flyway」。四个工具改变这一点（脚本在 `ai4se-baseline/scripts/`，详细说明见 `RouteME/e2e/README.md`）：

| 场景 | 命令（仓库根执行） | 说明 |
|---|---|---|
| 建模板库（一次性） | `node ai4se-baseline/scripts/e2e-db.mjs build` | 编译一次后在 8090 把空库迁到最新版本，产出 `SqlLite/routeme.template.db`；迁移有新增后重建 |
| 取干净库 | `node ai4se-baseline/scripts/e2e-db.mjs reset --name <id>` | 秒级复制模板，替代「删库 + Flyway 重放」 |
| 全量分片 | `node ai4se-baseline/scripts/e2e-shard.mjs` | 默认 3 分片并行，每片独立后端（8081+）/ Vite（5174+）/ 数据库 / uploads |
| 快速门禁 | `node ai4se-baseline/scripts/e2e-smoke.mjs` | 15 条核心闭环（清单 `RouteME/e2e/smoke.json`）；默认自带隔离环境，`--base-url` 才复用现有服务；实测 76 s 全绿 |
| 只跑改动 / 上轮失败 | `cd RouteME/e2e; npm run test:changed` / `npm run test:last-failed` | Playwright `--only-changed=origin/main` / `--last-failed` |
| 失败归因 | `node ai4se-baseline/scripts/e2e-debt-diff.mjs --root . --report <json>` | 输出 `passed/failed/skipped (baseline/new)` 三分类 |

- **为什么分片而不是 `workers > 1`：** 单后端单 SQLite 下 `credit-learning.spec.ts` 直接写库、多条 spec 共享种子用户 1–4，提高 workers 会互相踩；分片 = 按文件切 + 每片独立环境。
- **构建只做一次：** 分片前统一 `mvnw -Pdev-run compile` → 清理 `target-run/classes` 里源已删除的迁移 → 生成 `target-run/classpath.txt`，各分片用 `java -cp` 启动，不让 N 个 Maven 争抢同一输出目录。
- **已知红三档（`RouteME/e2e/known-failures.json`）：** `entries` 已归因的既有失败、`skipped` 已改 `test.fixme` 的死用例（不烧超时）、`pending` 观察到但未定根因的红（不参与豁免）。
- **实测（2026-11-18，3 分片）：** 200 passed / 14 failed / 2 skipped，8.96 min（14 条失败各跑满 30s 约占 7 分钟）；smoke 16 条 15 passed，1.8 min（含建库与启停）。归因干净时全量预期 3 分钟量级。
- **环境陷阱：** 直接复用开发服务器会把「旧构建」当成代码缺陷（实测 8080 跑合并前代码时 smoke 全红），所以 smoke 默认自建环境。
- **WAL 细节：** 后端用 WAL 模式，进程被强杀时已提交页可能还在 `<db>-wal`；模板与分发必须连同 `-wal`/`-shm` 一起复制（`copyDbSet`），否则得到看似正常的空库。

## SDD 治理工具链（2026-11-18）

工具脚本集中在 `ai4se-baseline/scripts/`（Node，依赖一次安装：`npm install --prefix ai4se-baseline/scripts`）；配套技能见 `skills/sdd-*`（merge-main / id-allocate / sign-ledger / worktree-ops / e2e-debt-baseline / archive-queue）。规则依据：`@rule:id-allocation`、`@rule:web-testing#合并后五项重验`。

| 命令（仓库根执行） | 作用 |
|---|---|
| `node ai4se-baseline/scripts/check-id-collisions.mjs --root . [--next]` | REQ/S/Flyway/契约版本撞号 lint；`--next` 给出下一空闲号（含在途分支占用）；历史撞号豁免见 `scripts/id-collision-baseline.json` |
| `node ai4se-baseline/scripts/openspec-gate.mjs --root .` | openspec validate --all --strict（CLI 包名 `@fission-ai/openspec`，钉住 1.16.1，必须 `--no-interactive`）；既有债务豁免见 `scripts/openspec-debt-baseline.json` |
| `npm run lint:contract --prefix ai4se-baseline/scripts` | redocly lint 契约（0 error；既有 warning 多为故意构造的 rejected/invalid 示例） |
| `node ai4se-baseline/scripts/sign-ledger.mjs --root .` | 生成 `docs/sdd/sign-ledger.md` 签署台账（脚本生成不手改） |
| `node ai4se-baseline/scripts/archive-queue.mjs --root .` | 生成 `docs/sdd/archive-queue.md` 归档依赖拓扑队列（只排序不执行归档） |
| `node ai4se-baseline/scripts/e2e-debt-diff.mjs --root . --report <json> [--update-new]` | Playwright JSON 报告 vs `e2e/known-failures.json`：`passed/failed/skipped` 统计 + NEW/BASELINE/RESOLVED 分类（`skipped` 不计入失败） |
| `node ai4se-baseline/scripts/split-openapi.mjs --root . [--out-dir D \| --execute]` | 契约按 capability 拆 12 组 + redocly bundle 语义等价校验；默认 dry-run，`--execute` 带 hash 稳定性闸门（并发编辑时中止） |
| `node ai4se-baseline/scripts/split-styles.mjs --root . [--out-dir D \| --execute]` | styles.css 按 banner 拆段 + 字节级拼接等价校验；同样带稳定性闸门 |
| `cd RouteME/frontend; npm run gen:api-types` | openapi-typescript 从契约生成 `src/api/generated.ts`，合并后重新生成即可，不手工取并集 |

拆分工具落地约束：openapi.yaml / styles.css 正被并发会话编辑时只做 `--out-dir` 临时副本验证，不 `--execute`；落地前重采构建产物 CSS 哈希基线。

## CI / CD

```text
CI  .github/workflows/ci.yml   push/PR：backend verify、frontend build+test、spec-lint、e2e-smoke（无 Docker）
CD  .github/workflows/cd.yml   CI 在 main 全绿后：构建单文件 jar + dist，上传工件并发布 GitHub Release
```

- **CI（已跑通）**：四个 job —— `backend`（JDK 21，`./mvnw -B -ntp verify`）、`frontend`（Node 22 + npm 11，`npm install` + `build` + `test`）、`spec-lint`（冲突标记扫描 + 编号撞车 lint + openspec strict 门禁 + redocly 契约 lint，2026-11-18 新增）、`e2e-smoke`（fresh DB + auth/trips 子集 + 债务基线 diff，2026-11-18 新增）。CI 不装 Docker。
- **CD（GitHub 原生）**：`Build and publish release` — 构建前端 `dist` → 复制进 `backend/src/main/resources/static` → 打包可执行 jar → 上传 `routeme-standalone-<sha>.jar` 与 `routeme-frontend-dist.zip` → `gh release create build-<sha>`（`permissions: contents: write`，标签已存在则只上传工件）。
- **没有第三方部署平台**：不再使用 Render 或 Docker。GitHub Actions 只提供构建/测试/交付能力，没有 Java 运行时，也没有公网地址；运行交付物用 `java -jar`（jar 内含前端），入口见 [RouteME/README.md](../../RouteME/README.md#ci--cd全部在-github无外部服务)。
- **`SQLITE_CANTOPEN` 防护**：`routeme.config.SqliteDirectory` 在启动前按 `SPRING_DATASOURCE_URL` 创建数据库父目录（H2 与 `:memory:` 跳过），独立 jar 首次运行不需要手工建目录。
- **回滚**：Release 是不可变的，回滚即下载上一版 `build-<sha>` 的 jar 重新运行；数据库由使用者自己持有，不涉及平台回滚。
- **为什么不能「全部用 GitHub」部署**：GitHub Actions 是构建/测试/交付平台，没有 Java 运行时；GitHub Pages 只能托管静态站点。故 CD 收敛为「构建 + Release 交付」，运行在本地或自有服务器。

## 本地启动与数据基线

```text
后端   cd backend; .\mvnw.cmd spring-boot:run     # http://localhost:8080
前端   cd frontend; npm run dev                    # http://localhost:5173，/api 代理到 8080
```

- H2 Console：`http://localhost:8080/h2-console`，JDBC URL `jdbc:h2:file:./data/staffing;MODE=PostgreSQL;AUTO_SERVER=TRUE`，用户名 `sa`、密码留空；`web-allow-others=false`，仅本机可访问。
- `V8__reset_demo_data.sql` 在首次升级时清空业务表并重灌演示基线，保留 `app_users`；基线内容与 E2E 依赖见 [domain/README.md](../domain/README.md#demo-data-baseline)。
- 重置演示数据：停止后端，删除 `backend/data/staffing.mv.db`（及 `staffing.lock.db` / `staffing.trace.db`），重新启动即从 `V1` 全量迁移到 `V8`。删除前先备份，文件库是唯一持久化副本。

## 人员数据交换运行说明

契约字段、状态码与分页参数以 [interfaces/README.md](../interfaces/README.md#候选池分页与导入导出契约) 为准；本节只记运行侧约束。

- 编码约定：CSV 一律 UTF-8 + BOM（Excel 直接打开不乱码），行分隔符 CRLF；XLSX 一律单 sheet、首行加粗并冻结。导出列与导入模板同源。
- 限制与注意：multipart 使用 Spring 默认 1MB 上限（约 5,000 行 CSV）。导入/导出不触发通知、名单只读等接口级约束见 [interfaces/README.md](../interfaces/README.md#候选池分页与导入导出契约)。
- 演示文件：候选池页面「批量导入」选择 `records/data/candidates-valid.csv` 或 `.xlsx`（8 行正常数据）；`candidates-invalid.csv` / `.xlsx` 含重复编号、非法职级与缺失日期，用于展示失败清单。文件中的编号为 `DEMO-*` 演示值，不含真实 PII。

## 前端交互约定

- 导航按 `需求 / 人才 / 结果 / 洞察` 四组呈现（`AppShell` 的 `NAV_GROUPS`），当前项带 `aria-current="page"`；原型草稿已随 `optimize-ui-experience` 删除，仓库内不再保留 `docs/prototypes/`。
- 破坏性操作（停用候选人、关闭需求、撤回推荐）统一走 `ConfirmDialog`：说明后果、支持 `busy` 禁用，取消不调用后端；释放与申请释放沿用带原因的 `Modal`。
- 加载态用 `Skeleton`、空态用 `EmptyState`、分页用 `Pager`（页大小 20 / 50 / 100，纯函数在 `utils/pager.ts`）；Toast 分 `success / warning / error` 三档，导入存在失败行时用 `warning`。
- `Modal` 打开时聚焦对话框、Tab 在内部循环、卸载后焦点回到触发元素，`Escape` 关闭；断点与动效取值以 [architecture/README.md](../architecture/README.md#设计令牌对照表) 的令牌表为准，`prefers-reduced-motion` 下过渡降至 0。

## RouteME 本地启动与验证

```text
后端   cd RouteME/backend; .\mvnw.cmd spring-boot:run    # http://localhost:8080
前端   cd RouteME/frontend; npm run dev                  # http://localhost:5173，/api 代理到 8080
```

- 首次启动自动创建 `backend/data/routeme.db`，Flyway 应用 `V1__create_greetings.sql`、`V2__seed_greeting.sql`；`GET /api/greeting` 应返回 `{"id":1,"message":"Hello World"}`。
- 重置数据库：停止后端，删除 `backend/data/routeme.db`，重启后重新迁移。
- 后端测试 `mvnw.cmd test`：接口测试走 H2 内存库，`*SqliteTest` 用临时 SQLite 文件库跑同一组迁移，CI 同样覆盖 SQLite。
- 前端验证 `npm run build`（`tsc --noEmit && vite build`）与 `npm test`（Vitest 纯函数测试），不依赖后端启动。
- 前端依赖安装：CI 固定 Node 22 + `npm install -g npm@11` 后执行 `npm install`（npm 10.9.9 在 Linux 解析 rolldown 可选依赖会崩 “Exit handler never called”）；锁文件 `resolved` 必须是 `registry.npmjs.org`，不得提交公司 Artifactory 地址。
- 构建产物 `dist/assets/index-*.js` 约 612 kB，来源是 Ant Design 整包；保留警告不静默调高阈值，出现路由级拆分需求时再分包。
- 本机 TLS：该开发机 Maven 经 TLS 代理下载依赖，代理根证书已导入 JDK `cacerts`（alias `forward-trust-root`）；换机器或换 JDK 需重做一次，CI 使用公有 CA 不受影响。
