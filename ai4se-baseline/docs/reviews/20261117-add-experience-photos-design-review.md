# design 评审报告 — add-experience-photos

- **工件：** `openspec/changes/add-experience-photos/design.md`
- **change-id：** `add-experience-photos`
- **评审日期：** 2026-11-17
- **评审方式：** `all-designs-review`（规则：`@rule:artifact-review-gate`、`@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-testing`、`@rule:data-consistency`）
- **评审输入：** G1 Pass + C1 的 Delta；`atdd-design.md`；`tasks.md`；`requirements/REQ-018-experience-photos.md`；Living Spec `trip-experiences`；头像上传先例（`UserProfileServiceImpl`）；`ExperienceServiceImpl` / `ExperienceController` / `ExperienceResponse`；`openapi.yaml` 0.11.0；迁移到 V17

## 评审结论

**Pass**

设计把 Delta 的 23 个 Scenario 全部落到契约、数据、存储、流程与前端；D1–D13 均给出理由与放弃的替代方案；G1 的 6 项 follow-up 全部收口；未引入新依赖、未改 CI 语义。评审发现的 3 条 WARNING 已在 P3 修正，2 条 SUGGESTION 留 P4。

## 结构化发现

| id | 严重度 | 规则锚点 | 位置 | 问题 | 处理 | 状态 |
|---|---|---|---|---|---|---|
| D3-01 | WARNING | `@rule:data-consistency` | §2 契约、§10 风险 | 读取端点原设计 `Cache-Control: public, max-age=31536000, immutable`，与 Delta「被移除图片的文件不再可读」冲突：浏览器 / 中间缓存可在删除后继续展示一年 | 改为 `public, max-age=86400`，不设 `immutable`；残余风险写明「删除后最多一天内可能命中浏览器缓存」 | 已修正 |
| D3-02 | WARNING | `@rule:spec-first` | §5 元数据剥离 | WebP 只删 `EXIF` / `XMP ` chunk，未清 `VP8X` 的 EXIF / XMP flag；部分解码器会按 flag 继续查找元数据 | §5 增加「清除 `VP8X` 对应 bit 并重写 chunk」；T3 单测同步 | 已修正 |
| D3-03 | WARNING | `@rule:spec-first` | §6 上传流程 | 配额按「已绑定 + 未绑定」计数，编辑态已满 6 张时无法先上传替换图；设计未定义该 UX | §6 增加「编辑态配额」说明：先移除并保存释放配额，再上传；前端在满额且有待移除项时提示先保存 | 已修正 |
| D3-04 | SUGGESTION | `@rule:spec-first` | §5 PNG | 删除 `tEXt` 会连带丢弃版权 / 作者文本，严格程度超出「剥离 EXIF」 | 有意从严（隐私优先），在 §5 保留；不改 Delta | 留 P4 观察 |
| D3-05 | SUGGESTION | `@rule:web-testing` | §1 架构表 / T3 | `ExperiencePhotoStorage` 原任务没有单测，只靠 API 测试间接覆盖 | tasks T3 增加 `ExperiencePhotoStorageTest`（建目录 / 命名 / 读写删 / 缺文件） | 已修正 |
| D3-06 | SUGGESTION | `@rule:data-consistency` | §3 数据模型 | Mapper 使用自定义 SQL，需确认 MyBatis-Plus 的表名 / 字段映射与 SQLite 类型兼容 | P4 T2 实现时以 `ExperienceDataMigrationSqliteTest` 同款方式验证 | 留 P4 |

## 校验证据

- `openspec validate add-experience-photos --strict` → `Change 'add-experience-photos' is valid`。
- `openspec show add-experience-photos --json --deltas-only` → `deltaCount: 5`（ADDED 2 + MODIFIED 3）。
- 契约 / 迁移：`0.12.0` + `V18`；与 `add-ai-itinerary` 的冲突有顺延规则（D11）。
- 错误码：401 `DEMO_USER_REQUIRED`、403 `EXPERIENCE_NOT_ALLOWED` / `FORBIDDEN`、400 `INVALID_INPUT`，均在现有枚举内。
- 依赖：`pom.xml` / `package.json` 无新增（D3 纯 JDK）。

## 与 ATDD 的对齐

| ATDD | 设计落点 | 结论 |
|---|---|---|
| A1 / A7 | 上传 → 提交绑定；`Experience.photos` 有序数组 | 覆盖 |
| A2 / A3 / A4 | 数量 / 大小 / 魔数；403 / 400；401 | 覆盖 |
| A5 / A6 | 纯 JDK 剥离；`Clock` + 懒清理 | 覆盖 |
| E1–E5 / R1–R4 | 分享页面板、详情首图、卡片不变、权限与反向 | 覆盖 |
| U1–U4 | T3 / T5 的 P4 单测 | 覆盖 |

## 残余风险

- 浏览器缓存 24h 内可能显示已删除图片（服务端已 404）。
- 字节级剥离需覆盖非标准结构；P4 用样本与坏样本双测。
- 本地磁盘无配额与监控；6 张 × 5 MB 累积。
- 列表仍有既有 `describe` N+1，本设计只避免新增一层。
- 无自动审核，依赖举报入口。

## 批准记录

- **批准人（design）：** Jay（AO）+ Jacky（SA）
- **批准时间：** 2026-11-17
- **批准来源：** 用户在 2026-11-17 会话中确认「全部批准」，第二签署人选定 Jacky
- **签署位：** 当前开发者 Jay + 1 名非 Jay 且非 WAYNE 的成员（`@rule:artifact-review-gate`）
- **报告签署：** WAYNE + Jay — 2026-11-17
- **批准范围：** 批准 design 进入 P4 实现；D3-04 / D3-06 留 P4 验证。
