# P4 实现记录 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3，REQ-018）
- **阶段：** P4（ATDD Apply）｜ **日期：** 2026-11-17 ｜ **执行人：** Jay（AO）
- **输入：** G1 Pass + C1 的 Delta Spec；`atdd-design.md`（A1–A7 / E1–E5 / R1–R4 / U1–U4）；`design.md`（D1–D13）；`tasks.md`（T1–T12）
- **基线：** `main`（P3 提交 `cf4bd14`，`openapi.yaml` 0.11.0、迁移 V17）
- **执行方式：** 按 `tasks.md` 串行；原型先行（T7）→ 契约 / 数据 / 工具 / 上传 / 绑定 / 读取（T1–T6）→ 分享页 / 详情页（T8 / T9）→ E2E（T10）→ 回归（T11）→ 本记录（T12）。

## 1. 任务完成情况

| # | 任务 | 结果 | 主要证据 |
|---|---|---|---|
| T7 | 原型先行 | 完成 | `docs/prototype/{ui.js,styles.css,main.js,store.js,data.js}`：分享页照片面板（选择 / 缩略图 / 移除 / 上移下移 / `n/6` / 错误提示）、详情首图 + 「查看全部 n 张」、`photo-viewer` 弹窗；Browser agent DOM 断言（`.photo-tile` × 3、查看全部、关闭后 0、控制台 0 error）；1440 / 768 / 390 无横向溢出；截图受环境限制，以 DOM / 布局测量为证据 |
| T1 | 契约 0.12.0 | 完成 | `openapi.yaml`：`info.version` 0.12.0；`POST /trips/{tripId}/experiences/photos`（multipart `file`）与 `GET /experience-photos/{photoId}`（公开只读）；`ExperienceWriteRequest.photo_ids`、`Experience.photos`、`ExperiencePhoto` schema；无 `DELETE` 端点；`TripPlan` 无 `photos`；`OpenApiTest` 7/7 |
| T2 | V18 + 实体 / Mapper | 完成 | `V18__add_experience_photos.sql`（`trip_experience_photos` + 2 索引）；`TripExperiencePhotoEntity`；`TripExperiencePhotoMapper`（`selectByScope` / `countByScope` / `selectUnownedBefore` / `selectByExperienceIds` / `selectByExperience` / `bind` / `deleteByIds`）；`ExperiencePhotoMigrationSqliteTest` 2/2（V1→V18、V17→V18） |
| T3 | 魔数 / EXIF / 存储 | 完成 | `PhotoMagic`（5MB、JPEG/PNG/WebP）；`PhotoMetadataStripper`（JPEG APP1/APP13/COM；PNG eXIf/tEXt/iTXt/zTXt/tIME；WebP EXIF/XMP + VP8X flags + RIFF size）；`ExperiencePhotoStorage`（目录、`{tripId}-{authorId}-{uuid32}.{ext}`、读写删、路径穿越防护）；单测 10/10（4 + 4 + 2） |
| T4 | 上传端点 | 完成 | `ExperiencePhotoController` / `ExperiencePhotoService` / `Impl` / `ExperienceEligibility`；顺序：会话 → 资格 → 大小 / 魔数 → 懒清理（`Clock`，>24h 未绑定）→ 计数 ≥6 → 剥离 → 落盘 → 插未绑定行（失败删文件）；`ExperiencePhotoApiTest` 8/8（A2 / A4 / A5 / A6 + 公开读 / 404） |
| T5 | 提交绑定 + 响应 photos | 完成 | `ExperienceWriteRequest.photoIds`（缺省 `[]`，保留 3 参兼容构造器）；`ExperienceResponse.photos`；`upsert` 去重 ≤6、归属 / 占用校验（403 / 400）、整体替换绑定、afterCommit 删旧文件；列表 `selectByExperienceIds` 批量分组避免 N+1；`ExperienceControllerTest` 17/17（A1 / A3 / A7）、`ExperienceServiceTest` 7/7、`ExperienceServicePersistenceTest` 2/2 |
| T6 | 读取端点 | 完成 | `GET /api/experience-photos/{photoId}`：公开、按行读文件、`Content-Type` 用 mime、`Cache-Control: public, max-age=86400`（不设 immutable）、行 / 文件缺失 404；读回与清理后 404 已并入 T4 的 8 例 |
| T8 | 分享页照片面板 | 完成 | `ShareExperiencePage` 第 4 个主列面板「照片（选填）」（真实感受与路线强度之间）；隐藏 file input + 缩略图网格 + 移除 / 上移 / 下移 + `n/6` + 面板内错误；编辑态按 `mine.photos` 初始化；提交失败保留；`tripMessages` 15 个新键；`api.ts` `uploadExperiencePhoto`（FormData，不设 Content-Type）；`shareIcons` camera/eye/x/right/plus；`styles.css` 与原型同名类 |
| T9 | 详情页图片展示 | 完成 | `TripDetailPage` 体验项：有图时首图 + 「查看全部 {n} 张」，antd `Image.PreviewGroup`（受控 open / current）；无图只渲染文字；`ExperienceCard` 未改 |
| T10 | E2E 夹具与反向 | 完成 | `e2e/fixtures/experiencePhotos.ts`：1×1 JPEG / PNG、带 GPS EXIF 的 JPEG、带 eXIf/tEXt 的 PNG、带 VP8X EXIF 的 WebP、伪装扩展名、`oversizedJpeg()`（>5MB 按需生成）；`e2e/tests/experience-photos.spec.ts` 6 例：E1 / E2 / E3 / E5 / E4 + R4 / R1 + R2；隔离运行：独立 SQLite（`SqlLite/e2e-fresh/routeme.db`）+ 独立 `routeme.experience.photo-dir` + 独立 `--output`；默认 `SqlLite/uploads/experience-photos` 0 文件 |
| T11 | 全量回归 | 完成（含已记录例外） | 后端 `verify` 273/273；前端 typecheck + 250/250 + build；Redocly valid（0 error / 15 条既有 warning）；`openspec validate --strict` valid；E2E：照片 6/6（全新库）、既有 `experiences.spec.ts` 9/9（全新库）；全量 104 例 83 passed / 21 failed，均为本 change 之外的既有漂移（见 §4） |
| T12 | 记录与排号 | 完成 | 本文件 + `docs/ai4se-plugins/20261117-122937-local-verify-report.md`；`registry.md` / `handoff.md` 更新为 p4-pass；契约 / 迁移排号确认见 §3 |

## 2. 实现要点与偏差

- **实现要点：**
  - 两步上传 + 提交绑定：上传建未绑定行（支持预览 / 重试），`upsert` 时整体替换并写 `sort_order`；删除的文件在事务提交后删除，删除失败仅记日志。
  - 元数据剥离为纯 JDK 字节处理，不引入依赖；坏结构拒绝并映射 400 `INVALID_INPUT`。
  - 配额按（trip, author）统计已绑定 + 未绑定；上传时懒清理 >24h 未绑定行，不做定时任务。
  - 列表统一批量查图片，避免在既有列表上新增 N+1。
- **偏差 1：E2E 用例放在新文件。** 新增 `e2e/tests/experience-photos.spec.ts` 承载 E1–E5 / R1 / R2 / R4，而不是继续堆在 `experiences.spec.ts`，便于单独运行与隔离夹具；`experiences.spec.ts` 仅更新 3 处因第 4 个面板而过时的断言（面板数 3 → 4、标题增加「照片（选填）」、原「无上传入口」反断言改为「添加照片」可见）。
- **偏差 2：缓存头。** 读取端点用 `public, max-age=86400` 而非 `immutable`，与 `design.md` D3-01 一致，避免删除后仍被浏览器长期缓存。
- **偏差 3：编辑态配额。** 满 6 张时需先移除并保存释放配额，面板提示 `n/6`，错误放在面板内，不阻塞文字输入（D3-03）。
- **偏差 4：夹具尺寸。** `tasks.md` T10 写「1×1 / 8×8」；实际只保留 1×1 样本。后端只按魔数 / 字节结构判定，尺寸不影响任何断言，额外尺寸无覆盖价值。

## 3. 契约 / 迁移排号确认

- 本 change 已实际落地 **`openapi.yaml` 0.12.0 + `V18__add_experience_photos.sql`**；`OpenApiTest` 断言版本 0.12.0。
- 在途 `add-credit-account`（REQ-019，P3 完成）与 `add-ai-itinerary`（REQ-017，P1）均未合并；按 `design.md` D11「以合并先后为准，不共用编号」，`add-credit-account` 顺延 **0.13.0 + V19**、`add-ai-itinerary` 顺延 **0.14.0 + V20**；已在 `registry.md` / `handoff.md` 记录。
- C1（P5 更新 Living Spec `Purpose` 为「纯文字 + 可选图片 + 内置封面」）未在本阶段执行，挂 P5。

## 4. 残余风险与未覆盖面

| # | 风险 / 例外 | 影响 | 处置 |
|---|---|---|---|
| 1 | 全量 E2E 21 条失败（`map.spec.ts` 10 + `trips.spec.ts` 10 + `experiences.spec.ts` 1） | 均为本 change 之外：map / trips 断言旧 SVG `[data-testid="china-map"]`，当前页面已切高德 iframe；`experiences` 种子断言在照片用例先行写库后被挤出首页第一页 | 已复现于 `ROUTEME_E2E_BASE_URL=http://localhost:5173`（用户现有环境）与隔离环境；本 change 相关套件在全新库单跑全绿；记录为既有债务，不在本 change 修 |
| 2 | 隔离后端进程未注入 `AMAP_WEB_SERVICE_KEY` | 地图 / 地点相关 E2E 无法在隔离环境验证 | 与 #1 同源；地图改动不在本 change |
| 3 | E2E 不入 CI | 回归依赖本地执行 | 沿用现状（`atdd-design.md` §3） |
| 4 | 浏览器截图受窗口环境限制 | 原型 / 实现的像素级对比证据有限 | 以 DOM 断言、布局测量（无横向溢出）与计算样式为证据 |
| 5 | 读取端点 24h 浏览器缓存 | 删除后最长 24h 内旧 URL 仍可能命中本地缓存 | 已由 `max-age=86400` 折中；记录为已知行为 |
| 6 | 编辑态满配额需先保存才释放 | 交互多一步 | 面板文案与错误提示已说明；后续可评估「保存时自动释放」 |
| 7 | 未绑定图片仅懒清理 | 长期无上传则孤儿文件留存 | 每次上传触发清理；后续可评估定时任务 |

## 5. 下一步

- `/sdd:local-verify-report`（本文件配套报告已生成：`docs/ai4se-plugins/20261117-122937-local-verify-report.md`）。
- G2 由 VL 签署；本阶段不写 G2 决策。
- P5：归档 + Living Spec 合并 + C1 + REQ-018 状态收口。
