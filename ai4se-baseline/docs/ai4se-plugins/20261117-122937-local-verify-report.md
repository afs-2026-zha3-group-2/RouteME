# 本地验证报告 — add-experience-photos（P4）

- **时间：** 2026-11-17 12:29（+0800）
- **Change：** `add-experience-photos`（REQ-018，`trip-experiences` ADDED 2 + MODIFIED 3）
- **执行人：** Jay（AO）｜ **环境：** Windows + JDK 21 + Maven Wrapper；Node 22 / npm；Playwright 1.56
- **基线：** `main` @ `cf4bd14`（P3 记录提交，未 push）；本阶段改动未提交

## 1. 门禁结果

| 层 | 命令 | 结果 | 说明 |
|---|---|---|---|
| 后端全量 | `backend\mvnw.cmd -B -ntp verify` | **Pass** | `Tests run: 273, Failures: 0, Errors: 0, Skipped: 0`；BUILD SUCCESS；含新增 `ExperiencePhotoApiTest` 8、`ExperiencePhotoMigrationSqliteTest` 2、`PhotoMagicTest` 4、`PhotoMetadataStripperTest` 4、`ExperiencePhotoStorageTest` 2；`OpenApiTest` 7、`ExperienceControllerTest` 17 |
| 前端类型 | `frontend\npm run typecheck` | **Pass** | `tsc --noEmit` 无输出 |
| 前端单测 | `frontend\npm test -- --run` | **Pass** | 35 文件 / 250 测试（`experienceForm.test.ts` 7，含 `photo_ids` 顺序映射） |
| 前端构建 | `frontend\npm run build` | **Pass** | Vite 构建成功；仅既有 chunk >500 kB 提示 |
| 契约 | `npx -y @redocly/cli lint openapi.yaml` | **Pass** | 0 error；15 warning 均为既有示例告警（users / trips / reports / experiences 既有 rejected 示例），本 change 未新增错误 |
| 规格 | `openspec validate add-experience-photos --strict` | **Pass** | `Change 'add-experience-photos' is valid` |
| E2E（本 change） | 隔离后端 + `npx playwright test tests/experience-photos.spec.ts` | **Pass** | 6/6：E1 / E2 / E3 / E5 / E4+R4 / R1+R2；独立 SQLite + 独立 uploads + 独立 `--output` |
| E2E（既有体验） | 同上，`tests/experiences.spec.ts` | **Pass** | 9/9（全新库，未被照片用例污染前） |
| E2E（全量） | `npx playwright test --output=test-results/full` | **Partial（既有债务）** | 104 例：83 passed / 21 failed；失败全部在本 change 之外，见 §3 |

## 2. 隔离环境

| 项 | 值 |
|---|---|
| 后端 | `PORT=8081`、`SPRING_DATASOURCE_URL=jdbc:sqlite:../SqlLite/e2e-fresh/routeme.db`、`ROUTEME_EXPERIENCE_PHOTO_DIR=../SqlLite/e2e-fresh/uploads/experience-photos` |
| 前端 | Vite `--port 5174 --strictPort`，`ROUTEME_API_TARGET=http://localhost:8081` |
| Playwright | `ROUTEME_E2E_BASE_URL=http://localhost:5174` |
| 默认目录 | `SqlLite/uploads/experience-photos` 在验证后为 0 文件（未污染开发数据） |

## 3. 全量 E2E 的既有失败（与本 change 无关）

- **map / trips 共 20 条**：断言旧离线 SVG 地图（如 `[data-testid="china-map"]`、`.map-pin`、`.detail-map-section`），当前页面已切高德 JS API（iframe + `city-map` / 高德覆盖物），属测试与现网实现的既有漂移；在用户现有 5173 / 8080 环境同样复现。
- **`experiences.spec.ts` 1 条**：`shows seeded experiences in the travel experience view` 依赖种子体验在首页第一页；同一库先跑照片用例会新增体验并把种子挤出第一页。全新库单跑该套件 9/9，通过。
- 隔离后端未注入 `AMAP_WEB_SERVICE_KEY`（本机 shell 无该变量），地图相关用例在隔离环境不可用；地图能力不在本 change 范围。

## 4. 结论

- 本 change 的 API / 单元 / 前端 / 契约 / 规格门禁全部通过；E2E 主路径与反向用例全部通过。
- 全量 E2E 的 21 条失败为既有债务 / 环境限制，已记录于 `docs/sdd/add-experience-photos/p4-apply.md` §4。
- **Overall：Pass with documented debt**（不替代 G2；G2 由 VL 签署）。
