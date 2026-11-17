# P3 ATDD 设计 / 技术设计 / 任务分解记录 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3）｜ **需求：** REQ-018（S16 图片上传增强）｜ **阶段：** P3（ATDD 设计 → Design → Tasks → 对齐自检）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **基线：** `main`（`openapi.yaml` 0.11.0，迁移到 V17）；G1 Pass + C1
- **输入：** [`spec.md`](../../openspec/changes/add-experience-photos/specs/trip-experiences/spec.md)、[`atdd-design.md`](../../openspec/changes/add-experience-photos/atdd-design.md)、[`design.md`](../../openspec/changes/add-experience-photos/design.md)、[`tasks.md`](../../openspec/changes/add-experience-photos/tasks.md)

## 1. ATDD 设计摘要

`atdd-design.md` 只规划 **API** 与 **E2E** 两层；纯逻辑列 Defer UT 交 P4 红绿。

| 层 | 条目 | 内容 |
|---|---|---|
| API | A1–A7 | 上传绑定、数量 / 大小 / 格式、越权与占用、401、EXIF 剥离、24h 懒清理、`photos` 响应形状 |
| E2E | E1–E5 | 主路径、编辑增删排序、未提交预览 / 重试、无图与卡片反向、非作者权限 |
| 反向 | R1–R4 | 发布页无上传、聊天页无上传、参考发布不复制图片、首页体验卡不改图 |
| Defer UT | U1–U4 | 魔数、EXIF 剥离、清理谓词、排序映射（P4 单测） |

- **NFR：** 用户 2026-11-17 确认不纳入；性能、磁盘监控、并发上传记为残余风险。
- **写前红态：** `ExperiencePhotoApiTest`、`ExperienceControllerTest` 扩展、`experiences.spec.ts` 新增 E1–E5 / R1–R2 / R4；T1 契约形状由 `OpenApiTest` 守。
- **夹具：** `e2e/fixtures/experiencePhotos.ts`（带 GPS / 设备 EXIF 的 JPEG、含 `eXIf` / `tEXt` 的 PNG、含 `EXIF` 的 WebP、伪装扩展名、`Buffer.alloc` 生成 >5 MB）；后端 `MockMultipartFile` + `@TempDir` + 固定 `Clock`。
- **门禁：** 后端 `mvnw verify`、前端 `typecheck / test / build`、契约 `redocly lint`、规格 `openspec validate --strict`；E2E 仅本地（沿用现状，不入 CI）。

## 2. 技术设计摘要

| 主题 | 结论 | 依据 |
|---|---|---|
| 契约 | `0.12.0`；`POST /api/trips/{tripId}/experiences/photos`、`GET /api/experience-photos/{photoId}`；`photo_ids` 入参、`photos` 出参 | `design.md` §2 |
| 数据 | V18 `trip_experience_photos`（`experience_id` 可空、`sort_order` 0–5、两个索引） | §3 |
| 存储 | 本地磁盘 `routeme.experience.photo-dir`（默认 `../SqlLite/uploads/experience-photos`）；服务端文件名 | §4 |
| 元数据 | 纯 JDK 字节级剥离 JPEG APP1 / APP13 / COM、PNG `eXIf` / `tEXt` / `iTXt` / `zTXt` / `tIME`、WebP `EXIF` / `XMP `；坏结构 400 | §5 |
| 上传 | 资格 → 大小 / 魔数 → 懒清理 → 计数 ≥6 拒绝 → 剥离 → 落盘 → 未绑定行 | §6 |
| 提交 | 事务内整体替换绑定；`afterCommit` 删旧文件；失败只记日志 | §6 |
| 读取 | 列表先收集 id 再一次 `IN (ids)` 分组，避免新增 N+1 | §6 / D12 |
| 前端 | 分享页第四个面板「照片（选填）」；详情首图 + `Image.PreviewGroup`；体验卡不改 | §7 |
| 原型 | 先改 `docs/prototype/ui.js` / `styles.css`，逐屏 1440 / 1024 / 768 / 390 × 浅 / 深色 | §7 |

## 3. P3 收口的 G1 Follow-ups

| G1 follow-up | P3 结论 | 证据 |
|---|---|---|
| EXIF 库与解析失败降级 | 不引入依赖，纯 JDK 字节级剥离；解析失败 400 `INVALID_INPUT`，不落盘 | D3 / §5 |
| 401 错误码 | 固定 `DEMO_USER_REQUIRED`，不新增枚举 | §2 / D10 |
| 契约 / 迁移排号 | 0.12.0 + V18；若 `add-ai-itinerary` 先合并则顺延 0.13.0 + V19 | D11 |
| 24h 时钟注入 | 上传前懒清理，注入 `Clock`；不引入定时任务 | D7 / §6 |
| 无自动审核 | 沿用举报入口，不新增状态 | D8 / §10 |
| E2E 隔离目录 | 独立 SQLite + 独立 uploads + 独立 `--output` | `tasks.md` T10 |

## 4. 任务分解与对齐自检

`tasks.md` 共 12 个任务：T1 契约 → T2 迁移 / 实体 → T3 魔数 / EXIF / 存储 → T4 上传 → T5 绑定 → T6 读取 → T7 原型 → T8 分享页 → T9 详情页 → T10 E2E / 反向 → T11 全量回归 → T12 记录 / 排号。

对齐自检（Spec ↔ Design ↔ Tasks ↔ ATDD）**Pass**：5 条 Requirement / 23 个 Scenario 全部有任务承接；D1–D13 无悬空；A1–A7 / E1–E5 / R1–R4 全部映射，U1–U4 只在 P4 实现；无 out-of-scope 交付；未引入新依赖与 CI 产品。自检表 12 项见 `tasks.md` §9。

## 5. 工具证据

- `openspec validate add-experience-photos --strict` → `Change 'add-experience-photos' is valid`。
- `openspec show add-experience-photos --json --deltas-only` → `deltaCount: 5`（ADDED 2 + MODIFIED 3）。
- 任务 / 场景计数：23 Scenario；12 任务；ATDD API 7 + E2E 5 + 反向 4 + Defer UT 4。
- P3 质量报告：`docs/ai4se-plugins/20261117-114311-quality-checklist-report.md`（P3-1–4 全 Pass，Overall Pass）。

## 6. 工件评审

| 工件 | 报告 | 结论 | 签署 |
|---|---|---|---|
| `design.md` | [`20261117-add-experience-photos-design-review.md`](../../docs/reviews/20261117-add-experience-photos-design-review.md) | Pass | Jay + Jacky（报告 WAYNE + Jay） |
| `tasks.md` | [`20261117-add-experience-photos-tasks-review.md`](../../docs/reviews/20261117-add-experience-photos-tasks-review.md) | Pass | Jay + Jacky（报告 WAYNE + Jay） |

## 7. 阶段提交

P3 产物按用户当次指示**只本地提交、不 push**（2026-11-17）；等 P4 完成后一并推送。

## 8. 下一步（P4）

- 先改原型（T7），再按 T1 → T6 后端链、T8 / T9 前端、T10 E2E 顺序执行；每步先红后绿。
- P4 完成后跑 T11 全量门禁，再出 local-verify 报告 → G2（VL=Neal）。
- C1（P5 更新 Living Spec `Purpose`）继续挂在 G3；归档串行在 `refine-experience-share` 之后。
