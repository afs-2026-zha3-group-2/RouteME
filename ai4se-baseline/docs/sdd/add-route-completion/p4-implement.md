# P4 实现与验证 — add-route-completion

- **Change：** `add-route-completion`（REQ-031 / S32，issue #45）
- **输入：** [`spec.md`](../../../openspec/changes/add-route-completion/specs/route-completion/spec.md)、[`design.md`](../../../openspec/changes/add-route-completion/design.md)、[`tasks.md`](../../../openspec/changes/add-route-completion/tasks.md)、[`atdd-design.md`](../../../openspec/changes/add-route-completion/atdd-design.md)、[`g1-decision.md`](../../../openspec/changes/add-route-completion/g1-decision.md)（Pass）
- **日期：** 2026-11-18 ｜ **AO：** Neal ｜ **VL：** Neal（G2）
- **分支 / 基点：** `feature/add-route-completion`，合并 `origin/main@5f0ef7d` 后开工；实现提交 `6cd92201`
- **阶段提交链：** `9be83e6`（P1）→ `1ada740`（P2）→ `760b792`（编号顺延合并）→ `1c5e12c`（P3）→ `6df831e`（合并 origin/main 地图清理）→ `6cd92201`（P4）

## 1. 契约（T1）

- `openapi.yaml` `info.version` `0.26.0` → **`0.27.0`**（main 已用 0.26.0，按合并顺序顺延）。
- `UserProfile.required` 追加 `route_completion_state`；`properties` 追加：
  - `route_completion_state`：`enum [good, neutral, watch, insufficient]`、`readOnly`；
  - `route_completion_rate`：`integer`、`0–100`、`nullable`、`readOnly`，**不入 `required`**。
- `GET /users/{userId}/profile` 示例补 `credit_score` / `credit_level` / `credit_restricted` / `route_completion_state = insufficient`。
- `OpenApiTest` 先红后绿：字段存在、state 入 required、rate 不入 required、enum 四值；5 处版本断言同步 0.27.0。

## 2. 后端（T2 / T3）

| 文件 | 内容 |
|---|---|
| `enums/RouteCompletionState.java` | `GOOD / NEUTRAL / WATCH / INSUFFICIENT` + `wireValue()`（与 `CreditLevel` 同目录惯例） |
| `pojo/RouteCompletion.java` | `record(Integer rate, RouteCompletionState state)` + `INSUFFICIENT` 常量 |
| `service/RouteCompletionPolicy.java` | 派生单点：`GOOD_MIN = 80`、`NEUTRAL_MIN = 70`；样本 0 / null / 越界 → `insufficient`（失败安全） |
| `response/UserProfileResponse.java` | record 末尾追加 `Integer routeCompletionRate, String routeCompletionState`；工厂 4 个重载透传 |
| `controller/UserProfileController.java` | `profile` / `save` / `uploadAvatar` 三处装配 `RouteCompletionPolicy.evaluate(null, 0)` |

- 零新增查询、零表、零迁移、零写入端点；`PUT /users/me/profile` 传两字段被忽略。

## 3. 前端（T5 / T6）

| 文件 | 内容 |
|---|---|
| `types.ts` | `RouteCompletionState` + `UserProfile` 两可选字段 |
| `profile/routeCompletionDisplay.ts` | `routeCompletionLine(state, rate)` → `{ text, tone }`；四态文案；缺失 / 未知 / 越界降级 `insufficient`；**无 80 / 70 常量** |
| `profile/ProfilePage.tsx` | hero 信用行之后追加 `.profile-completion` 行（本人 / 他人同口径） |
| `i18n/tripMessages.ts` | 4 条文案（标签 / 信誉良好 / 请留意 / 暂无足够记录） |
| `styles.css` | `.profile-completion` 基线与 `is-good / is-fair / is-watch / is-muted` 四档，只用既有令牌（`--t-jade` / `--t-lagoon` / `--t-warn` / `--ink-3`） |

- T0 预览 `docs/sdd/add-route-completion/preview/route-completion-row.html` 四态 × 深浅色；实现按预览落地。
- 弹窗 / 卡片 / 详情 / 列表无该行（E2E A10 反向验证）。

## 4. 测试

| 层 | 文件 | 结果 |
|---|---|---|
| 契约 | `OpenApiTest`（+4 组断言） | 18/18 Pass |
| API | `UserProfileRouteCompletionApiTest`（A1 / A2 / A15 / A16 / A17 / A18） | 9/9 Pass（红→绿：装配回退时 6 条失败） |
| UT | `RouteCompletionPolicyTest`（A3–A8） | 5/5 Pass |
| 迁移反向 | `RouteCompletionMigrationSqliteTest` | 2/2 Pass（V31 头；无 `route_completion*` 对象 / 列） |
| 前端 UT | `routeCompletionDisplay.test.ts` | 7/7 Pass（红→绿：实现缺失时整文件失败） |
| E2E | `e2e/tests/route-completion.spec.ts`（A9–A14 + A10 反向） | 6/6 Pass |

## 5. 门禁结果

| 门禁 | 结果 |
|---|---|
| 后端 `.\mvnw.cmd -B -ntp verify` | **656 tests / 0 failures / 0 errors**，BUILD SUCCESS |
| 前端 `npm run typecheck` + `npm run build` | Pass（vite built 3.17s；chunk >500kB 既有告警） |
| 前端 `npm test` | 61 files / **508 tests** Pass |
| E2E `route-completion.spec.ts` | 6/6 Pass（隔离全新 SQLite + 独立端口） |
| E2E 受影响回归 `profile.spec.ts` + `profiles.spec.ts` | 20/22 Pass；2 条失败为 `origin/main` 既有失效选择器 `.mine-profile-card`（源码已无该类名），非本 change 引入 |
| `openspec validate add-route-completion --strict` | valid |
| Redocly lint | valid，0 error / 23 warnings（既有风格告警） |
| 本地验证报告 | [`20261118-142210-local-verify-report.md`](../../ai4se-plugins/20261118-142210-local-verify-report.md)（Overall Pass，V1–V8 全 Pass） |
| P4 质量检查 | [`20261118-142401-quality-checklist-report.md`](../../ai4se-plugins/20261118-142401-quality-checklist-report.md)（Overall Pass；P4-3 / P4-4 未到达 Skipped） |
| G2 | [`g2-decision.md`](../../../openspec/changes/add-route-completion/g2-decision.md) **Pass**（VL=Neal，2026-11-18） |

## 6. 执行偏差与工件对齐

| # | 偏差 / 变更 | 处置 |
|---|---|---|
| 1 | `tasks.md` 初版用表格，`openspec --strict` 告警「0 tasks」、`archive` 无法跟踪 | 改为 `- [x] Tn` 复选框格式（内容与验收不变）；`--strict` 通过 |
| 2 | P3 工件写 `pojo/RouteCompletionState.java`，实际按仓库惯例落在 `enums/` | 回改 `design.md` D2 / 影响面、`tasks.md` T2、`atdd-design.md` §2 的路径与测试类名 |
| 3 | `docs/feedback/verification-commands.md` 原为占位模板，verify probe 白名单为空 | 按 `ci.yml` 与 T8 填写三层命令（路径相对 `ai4se-baseline/`），probe 解析 bash-fence 成功 |
| 4 | E2E node_modules 无法在 worktree 内安装（企业 npm 禁用 remote tarball） | 复用主工作区 `e2e/node_modules`（junction），仅本地运行环境，不入库 |
| 5 | 全量后端 verify 首轮 486 errors | 根因：上一命令行遗留 `SPRING_DATASOURCE_URL` 指向另一 worktree 的 SQLite，与 H2 驱动冲突；清理环境变量后重跑全绿，未改代码 |

## 7. 交付边界

- 本期没有人工打卡 / 聚合数据源：`route_completion_state` 恒 `insufficient`，`route_completion_rate` 键省略；四档展示由 `page.route` 夹具与 UT 覆盖。
- 未来聚合上线时，只需在控制器装配处替换 `evaluate(null, 0)` 的输入；派生单点与前端映射不变。
- 归档（P5）暂不启动；PR / CI 在用户指示后执行，CI 结果回填 G2 记录。
