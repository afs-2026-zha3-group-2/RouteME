# 任务分解 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3，REQ-018）
- **阶段：** P3（Tasks）｜ **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **输入：** G1 Pass + C1 的 Delta（[`specs/trip-experiences/spec.md`](specs/trip-experiences/spec.md)）；[`design.md`](design.md)；[`atdd-design.md`](atdd-design.md)
- **基线：** `main`（`openapi.yaml` 0.11.0、迁移到 V17）
- **执行约定：** 每个任务先落红态再实现（P4 `/sdd:atdd-apply`）；任务按编号串行，T7 完成后才能进 T8 / T9；E2E 不进 CI，本地执行。

## 1. 契约先行

- [x] **T1 — 契约与形状断言（contract）**
  - `openapi.yaml`：`info.version` → `0.12.0`；新增 `POST /trips/{tripId}/experiences/photos`（multipart `file`，需 `X-User-Id`，200 `{id,url}`）与 `GET /experience-photos/{photoId}`（公开只读，`image/jpeg|png|webp`，404）；`ExperienceWriteRequest` 增加 `photo_ids`（int64 数组，0–6）；`Experience` 增加 `photos`（`[{id,url}]`，可空数组）；补齐 400 / 401 / 403 错误示例与说明。
  - `OpenApiTest`：版本改 `0.12.0`；断言新增两条路径、`photo_ids` / `photos` 字段、错误码引用；显式断言没有 `DELETE /trips/{tripId}/experiences`，且 `TripPlan` schema 不含 `photos`（ATDD Non-goal 反向 R3）。
  - **验证：** `npx @redocly/cli lint openapi.yaml`；`.\mvnw.cmd -B -ntp -Dtest=OpenApiTest test`
  - **ATDD：** A7（响应形状）、R3（行程响应无 `photos`）、R 契约断言（无删除端点）
  - **完成判据：** lint 无 error；`OpenApiTest` 全绿；其它任务以本任务定稿的字段名为准。

## 2. 数据层

- [x] **T2 — 迁移与持久化骨架（data）**
  - 新增 `V18__add_experience_photos.sql`：`trip_experience_photos`（`id` / `trip_id` / `author_id` / `experience_id` NULL / `file_name` / `mime` / `bytes` / `sort_order` / `created_at`）与 `idx_experience_photos_scope`、`idx_experience_photos_experience`（见 `design.md` §3）。
  - 新增 `TripExperiencePhotoEntity`、`TripExperiencePhotoMapper`（`selectByScope`、`selectByExperienceIds`、`countByScope`、`selectUnownedBefore`、`insert`、`updateBinding`、`deleteByIds`）。
  - 新增 `ExperiencePhotoMigrationSqliteTest`：全新库 V1→V18 与旧库 V17→V18 双路径，断言表结构、索引、空表。
  - **验证：** `.\mvnw.cmd -B -ntp -Dtest=ExperiencePhotoMigrationSqliteTest test`
  - **ATDD：** A1 / A6 的持久化基础（不单独对应用例）
  - **完成判据：** 双路径迁移通过；mapper 方法可被 T4–T6 直接调用。

## 3. 纯逻辑与存储

- [x] **T3 — 魔数、元数据剥离与落盘（util）**
  - 先写失败单测：`PhotoMagicTest`（U1：JPEG / PNG / WebP / 其它 / 伪装扩展名）、`PhotoMetadataStripperTest`（U2：JPEG 丢 APP1 / APP13 / COM 且保留 APP0 / APP2 与 SOS 之后字节；PNG 丢 `eXIf` / `tEXt` / `iTXt` / `zTXt` / `tIME`；WebP 丢 `EXIF` / `XMP `、清除 `VP8X` 对应 flag 并重写 RIFF size；坏结构拒绝）、`ExperiencePhotoStorageTest`（建目录、命名、写入 / 读取 / 删除、缺文件不抛）。
  - 实现 `PhotoMagic`（返回 `{extension, mime}` 或空）与 `PhotoMetadataStripper`（纯字节输入输出，解析失败抛受检的非法输入异常）。
  - 实现 `ExperiencePhotoStorage`：`@Value("${routeme.experience.photo-dir:../SqlLite/uploads/experience-photos}")`、启动建目录、`{tripId}-{authorId}-{uuid32}.{ext}` 命名、`store` / `load` / `deleteQuietly`；单张上限 `5 * 1024 * 1024`。
  - **验证：** `.\mvnw.cmd -B -ntp -Dtest=PhotoMagicTest,PhotoMetadataStripperTest,ExperiencePhotoStorageTest test`
  - **ATDD：** U1、U2（Defer UT，本任务即 P4 红绿落点）；A5 的前置能力
  - **完成判据：** 单测全绿；不引入任何新依赖（`pom.xml` 不变）。

## 4. 后端 API

- [x] **T4 — 图片上传端点（API）**
  - 新增 `ExperiencePhotoController`（`POST /api/trips/{tripId}/experiences/photos`）与 `ExperiencePhotoService`：`requireSessionUser` → `requireCanShare(trip, author)` → 大小 / 魔数校验 → 懒清理（>24h 未绑定，`Clock` 注入）→ 计数（同 trip + author 的已绑定 + 未绑定）≥6 拒绝 → `PhotoMetadataStripper` → 落盘 → 插未绑定行 → `{id,url}`；落盘后插入失败则删文件。
  - 错误映射：401 `DEMO_USER_REQUIRED`；403 `EXPERIENCE_NOT_ALLOWED`；400 `INVALID_INPUT`（含第 7 张、>5 MB、错误魔数、坏结构）。
  - 新增 `ExperiencePhotoApiTest`（红态）：A2（第 7 张 / >5 MB / 错误魔数）、A4（无 `X-User-Id` 401 且目录无新文件）、A5（带 GPS / 设备的 JPEG 落盘后不含 EXIF 标记）、A6（固定时钟 + 旧记录 → 下次上传后不可读；已绑定图片保留）；测试用 `@TempDir` 覆盖 `routeme.experience.photo-dir`。
  - **验证：** `.\mvnw.cmd -B -ntp -Dtest=ExperiencePhotoApiTest test`
  - **ATDD：** A2、A4、A5、A6（A1 的上传半段）
  - **完成判据：** 用例全绿；上传失败路径不留下孤儿文件（测试断言目录条目数）。

- [x] **T5 — 体验提交的绑定与读取形状（API / domain）**
  - `ExperienceWriteRequest` 增加 `photo_ids`（缺省 `[]`）；`ExperienceResponse` 增加 `photos`，`from(...)` 接收按体验分组的图片列表。
  - `ExperienceServiceImpl.upsert`：事务内校验 `photo_ids` 去重且 ≤6；逐条要求 `trip_id` / `author_id` 匹配（否则 403 `FORBIDDEN`），`experience_id` 为空或等于当前体验（否则 400 `INVALID_INPUT`）；整体替换绑定并写 `sort_order`；`removed` 文件在 `afterCommit` 删除（失败仅记日志）。
  - 列表方法（`listAll` / `listPage` / `listByTrip` / `mine`）改为先收集体验 id，一次 `selectByExperienceIds` 后分组传入，避免新增 N+1。
  - 扩展 `ExperienceControllerTest`（红态）：A1（上传 2 张 → 提交 → 响应有序 photos → 详情 / `mine` 一致）、A3（他人图片 403；不存在 / 已占用 400；失败后原集合不变）、A7（历史体验 `photos: []`）。
  - **验证：** `.\mvnw.cmd -B -ntp -Dtest=ExperienceControllerTest,ExperienceServiceTest,ExperienceServicePersistenceTest test`
  - **ATDD：** A1、A3、A7、R3（参考发布的新计划不含 `photos`）、U4（排序映射）
  - **完成判据：** 用例全绿；编辑删除后旧文件不可读；`ExperienceResponse` 序列化字段名与 T1 契约一致。

- [x] **T6 — 图片读取端点（API）**
  - `GET /api/experience-photos/{photoId}`：公开（不要求 `X-User-Id`）、按行读文件、`Content-Type` 取 `mime`、`Cache-Control: public, max-age=86400`（不设 `immutable`）；行不存在或文件缺失 → 404；不返回目录列表。
  - 在 `ExperiencePhotoApiTest` 补读回断言（A5 后半段、A6「不再可读」）。
  - **验证：** `.\mvnw.cmd -B -ntp -Dtest=ExperiencePhotoApiTest test`
  - **ATDD：** A5（读回无 EXIF）、A6（清理后 404）
  - **完成判据：** 匿名请求 200；清理后 404。

## 5. 前端

- [x] **T7 — 原型先行（prototype）**
  - 按 `@rule:prototype-ui-alignment`：先改 `docs/prototype/ui.js` 的 `share()`（照片面板：选择 / 缩略图 / 移除 / 上移下移 / `n/6` / 错误提示）与详情体验列表（首图 + 「查看全部 n 张」）；`docs/prototype/styles.css` 增加 `.share-photos` / `.photo-grid` / `.photo-tile` / `.photo-actions` / `.experience-photos` / `.experience-photos-more`，只用现有令牌。
  - `prototype.html` 若只是壳则不改；浏览器核对 1440 / 1024 / 768 / 390 × 浅色 / 深色，无横向溢出；`≤680px` 单列。
  - **验证：** 浏览器逐屏截图核对；`docs/prototype` 内无 mock 数据或演示脚本被复制进实现
  - **ATDD：** E1–E4 的视觉前置（不产生测试代码）
  - **完成判据：** 原型可交互演示完整路径；令牌与 `:root` / `[data-theme="dark"]` 同值。

- [x] **T8 — 分享页照片面板（UI）**
  - `ShareExperiencePage`：主列新增第四个面板「照片（选填）」（真实感受与路线强度之间）；隐藏 `<input type="file" multiple accept="image/jpeg,image/png,image/webp">` + 缩略图网格；移除 / 上移 / 下移；`n/6`；面板内错误提示不阻塞文字输入；编辑态按 `mine.photos` 初始化；提交失败保留已上传图片与顺序可重试。
  - `api.ts`（`uploadExperiencePhoto`、`photoUrl`）、`types.ts`（`ExperiencePhoto`、`photo_ids`）、`tripMessages.ts`（新增键见 `design.md` §7）、`styles.css`（与原型同名类）。
  - E2E 红态：`e2e/tests/experiences.spec.ts` 增加 E1–E3、E5。
  - **验证：** `npm run typecheck`；`npm test`；`npm run build`；`npx playwright test tests/experiences.spec.ts -g "体验图片"`
  - **ATDD：** E1、E2、E3、E5
  - **完成判据：** E2E 绿；无图时表单与现状一致；错误提示不挤占文字输入。

- [x] **T9 — 详情页图片展示（UI）**
  - `TripDetailPage` 体验列表项：有图展示首图缩略图 + 「查看全部 {n} 张」，点开用 antd `Image.PreviewGroup`；无图只渲染文字，不出现空占位或裂图。
  - `ExperienceCard` 保持不改（D3 / D9）。
  - **验证：** `npm run typecheck`；`npm test`；`npm run build`；`npx playwright test tests/experiences.spec.ts -g "查看全部|无图"`
  - **ATDD：** E4、R4
  - **完成判据：** 有图 / 无图两态与原型一致；首页体验卡 DOM 无体验图片节点。

## 6. E2E 与反向验证

- [x] **T10 — E2E 夹具、隔离与反向用例（E2E）**
  - 新增 `e2e/fixtures/experiencePhotos.ts`：1×1 / 8×8 的 JPEG（带 GPS + 设备 EXIF）、PNG（`eXIf` / `tEXt`）、WebP（`EXIF` chunk）、伪装扩展名样本；>5 MB 用 `Buffer.alloc` 生成不落库。
  - 反向用例：R1（发布页无 `input[type=file]` / 上传按钮）、R2（聊天页同样无）、R4（首页体验卡 `.exp-cover` 存在且无体验图片节点）；R3 的契约断言归 T1 / T5，本任务只做前端 DOM 断言。
  - 隔离：独立 SQLite、独立 uploads 目录（`routeme.experience.photo-dir`）、独立 `--output`；用例自建「已完成行程 + 作者 + 体验」，不共享种子与图片 id。E2E 命令在 `ai4se-baseline/RouteME/e2e` 目录执行。
  - **验证：** `npx playwright test tests/experiences.spec.ts`；`npx playwright test tests/profile.spec.ts -g "头像"`（头像不受影响）
  - **ATDD：** R1、R2、R4（R3 由 T1 / T5 覆盖）；Non-goal 反向表全部覆盖
  - **完成判据：** 全绿；默认 `SqlLite/uploads/` 无新增文件。

## 7. 回归与交付

- [x] **T11 — 全量回归与门禁（verification）**
  - 后端 `.\mvnw.cmd -B -ntp verify`；前端 `npm run typecheck` → `npm test` → `npm run build`（PowerShell 用分号或分开执行，不用 `&&`）；契约 `npx @redocly/cli lint openapi.yaml`；规格 `openspec validate add-experience-photos --strict`；E2E 全量 `npx playwright test`。
  - 迁移双路径在 backend job 内已覆盖；确认 `pom.xml` / `package.json` 无新增依赖。
  - **验证：** 上述命令全部退出码 0
  - **完成判据：** 无 red；例外只允许已记录残余风险。

- [x] **T12 — 记录、排号与交付（docs）**
  - 写 `docs/sdd/add-experience-photos/p4-apply.md` 与 `docs/ai4se-plugins/<时间>-local-verify-report.md`。
  - 确认契约 / 迁移排号：若 `add-ai-itinerary` 先合并占用 0.12.0 / V18，本 change 顺延 0.13.0 / V19（`design.md` §8 D11）；同步 `OpenApiTest` 与迁移文件名。
  - 更新 `requirement-workspace/registry.md` 与 `handoff.md` 的 REQ-018 状态；C1（P5 更新 Living Spec `Purpose`）转交 P5，不在本任务执行。
  - **验证：** `openspec validate add-experience-photos --strict`；文档内链接可达
  - **完成判据：** P4 记录齐全；registry / handoff 状态与实际一致；C1 明确挂到 P5。

## 8. 依赖与并行

```text
T1 ──> T2 ──> T3 ──> T4 ──> T5 ──> T6 ──> T11 ──> T12
                      │
T7 ───────────────────┴─> T8 ──> T9 ──> T10 ──> T11
```

- T1–T6 为后端链，严格串行（契约 → 表 → 工具 → 上传 → 绑定 → 读取）。
- T7 可与 T1–T6 并行，但 T8 / T9 必须等 T7 与 T5 完成。
- T10 依赖 T8 / T9 的 DOM 与 T4–T6 的端点。
- T11 为唯一全量门禁；T12 在 T11 绿后执行。

## 9. 对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）

| # | 检查项 | 结果 | 证据 |
|---|---|---|---|
| S1 | ADDED「上传与校验」7 个 Scenario 均有任务承接 | Pass | 上传绑定→T4/T5；数量大小格式→T3/T4；增删排序→T5/T8；越权 403→T5；不存在/占用 400→T5；预览移除→T8；未登录 401→T4 |
| S2 | ADDED「元数据与清理」2 个 Scenario 均有任务承接 | Pass | EXIF 剥离→T3/T4/T6；孤儿懒清理→T4/T6 |
| S3 | MODIFIED「内容口径与纯文字降级」3 个基线 Scenario 不被破坏 | Pass | T5（`photo_ids` 可省）与 T8（无图路径）保持原表单行为；T2 迁移不触碰 `trip_experiences` |
| S4 | MODIFIED「详情页展示」5 个 Scenario 全部承接 | Pass | 基线 3 条由 T9 保持；首图 / 查看全部→T9；无图不占位→T9 |
| S5 | MODIFIED「灵感首页」6 个 Scenario 全部承接 | Pass | 基线 5 条不改；「体验卡保持内置封面」→T9 / T10 R4 |
| S6 | Design 决策 D1–D13 均落到任务或显式不变量 | Pass | D1/T4；D2/T3；D3/T3；D4/T2；D5/T1/T5；D6/T4/T5；D7/T4/T5；D8/T8；D9/T9；D10/T4/T5；D11/T1/T2/T12；D12/T5；D13/T7/T8 |
| S7 | 每个任务单层（前端 / 后端 / 数据 / 文档），无跨层隐式交付 | Pass | T1 契约；T2 数据；T3 纯逻辑；T4–T6 后端 API；T7–T9 前端；T10 E2E；T11 验证；T12 文档 |
| S8 | 契约先行：T1 在任何实现之前定稿，后续任务引用其字段 | Pass | §8 图；T1 完成判据 |
| S9 | 每个任务有可执行验证命令且与 ATDD 门禁一致 | Pass | 各任务「验证」行；`atdd-design.md` §3 |
| S10 | ATDD A1–A7 / E1–E5 / R1–R4 全部映射，U1–U4 仅在 P4 实现 | Pass | T4/A2·A4·A5·A6；T5/A1·A3·A7·R3；T1/R3 契约；T8/E1·E2·E3·E5；T9/E4；T10/R1·R2·R4；T3/U1·U2；T5/U4；T4/U3（清理谓词） |
| S11 | 无 out-of-scope 交付（封面图 / 聊天图 / 头像 / S17 / 卡片改图 / 缩略图 / 审核 / 对象存储） | Pass | T9 不改 `ExperienceCard`；T1 / T5 / T10 覆盖 R1–R4 反向；T3 无缩略图；`atdd-design.md` §5 / §6 |
| S12 | 未引入新依赖、未新增 CI 产品、E2E 不入 CI | Pass | T3 完成判据；T11 命令沿用现有 job；`atdd-design.md` §3 |

**自检结论：Pass。** 5 条 Requirement（ADDED 2 + MODIFIED 3，共 23 Scenario）全部有任务承接；Design D1–D13 无悬空；ATDD 两层与 Defer UT 均有落点；无越界交付。若 SA 在 P4 前变更 Delta 或 ATDD，需重跑本表。
