# 技术设计 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3，REQ-018）
- **阶段：** P3（Design）｜ **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **输入：** G1 Pass + C1 的 Delta；[`atdd-design.md`](atdd-design.md)；Living Spec `openspec/specs/trip-experiences/spec.md`；头像上传实现（`UserProfileServiceImpl.uploadAvatar` / `loadAvatar`）；`ExperienceServiceImpl` / `ExperienceController` / `ExperienceResponse`
- **基线：** `main@c57a70f`（`openapi.yaml` 0.11.0，迁移到 V17）

## 1. 架构与落点

| 层 | 文件（新增 / 修改） | 职责 |
|---|---|---|
| controller | `ExperiencePhotoController`（新）；`ExperienceController`（改） | 上传 / 读取路由；体验提交入口不变（请求体扩展） |
| request / response | `ExperienceWriteRequest`（改，`photo_ids`）；`ExperiencePhotoResponse`（新）；`ExperienceResponse`（改，`photos`） | 契约形状 |
| service | `ExperiencePhotoService` / `Impl`（新）；`ExperienceServiceImpl`（改） | 资格、数量、归属、绑定替换、懒清理、批量读取 |
| manager | `ExperiencePhotoStorage`（新） | 落盘 / 读取 / 删除；文件名生成；目录配置 |
| util | `PhotoMagic`（新）、`PhotoMetadataStripper`（新） | 魔数识别；JPEG / PNG / WebP 元数据剥离 |
| entity / mapper | `TripExperiencePhotoEntity` / `TripExperiencePhotoMapper`（新） | `trip_experience_photos` |
| 迁移 | `V18__add_experience_photos.sql`（新） | 新表 + 索引 |
| 前端 | `ShareExperiencePage`、`TripDetailPage`、`api.ts`、`types.ts`、`tripMessages.ts`、`styles.css` | 上传 / 预览 / 删除 / 排序；详情首图 + 查看全部 |
| 不变 | `ExperienceCard.tsx`、`trip-plans` / `user-profile` 端点 | D3 反向约束；上传模式只参考头像 |

## 2. 契约（openapi 0.12.0）

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/trips/{tripId}/experiences/photos` | POST | multipart `file`；需 `X-User-Id`；返回 `200 { id, url }` |
| `/api/experience-photos/{photoId}` | GET | 公开只读；返回图片字节；`Cache-Control: public, max-age=86400`（不设 `immutable`，保证删除后在一天内自然失效） |
| `/api/trips/{tripId}/experiences` | POST | 请求体增加 `photo_ids: [int64]`（0–6，有序，可省略 = `[]`） |
| `/api/trips/{tripId}/experiences`、`/api/experiences`、`/api/me/experiences` | GET | `Experience.photos: [{ id, url }]`（有序；历史体验为空数组） |

错误码（沿用现有枚举，不新增）：

| 场景 | 状态 | code |
|---|---|---|
| 未登录 / 未知 demo 用户 | 401 | `DEMO_USER_REQUIRED` |
| 行程未结束 / 非参加者上传 | 403 | `EXPERIENCE_NOT_ALLOWED` |
| 引用他人图片 | 403 | `FORBIDDEN` |
| 第 7 张、>5 MB、错误魔数、图片不存在 / 已占用 | 400 | `INVALID_INPUT` |

## 3. 数据模型（V18）

```sql
CREATE TABLE trip_experience_photos (
    id INTEGER NOT NULL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    experience_id INTEGER NULL,
    file_name VARCHAR(160) NOT NULL,
    mime VARCHAR(40) NOT NULL,
    bytes INTEGER NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id),
    FOREIGN KEY (author_id) REFERENCES app_users (id),
    FOREIGN KEY (experience_id) REFERENCES trip_experiences (id)
);
CREATE INDEX idx_experience_photos_scope ON trip_experience_photos (trip_id, author_id);
CREATE INDEX idx_experience_photos_experience ON trip_experience_photos (experience_id, sort_order);
```

- `experience_id` 可空：上传后未提交 = 未绑定；提交时绑定。
- `sort_order` 0–5，按提交顺序写入；读取按 `(experience_id, sort_order)`。
- 无「删除体验」端点，故不定义级联删除；图片只在编辑替换 / 懒清理时删除。

## 4. 存储与文件

- 目录：`routeme.experience.photo-dir`，默认 `../SqlLite/uploads/experience-photos`；启动时 `Files.createDirectories`（参考 `UserProfileServiceImpl`）。
- 文件名：`{tripId}-{authorId}-{uuid32}.{ext}`；扩展名由魔数决定（`jpg` / `png` / `webp`）；不信任原始文件名。
- 读取：按 id 查行 → 拼 `file_name` → 读字节；不存在或文件缺失 → 404。
- `.gitignore` 已忽略 `SqlLite/uploads/`，无需新增规则。
- 大小上限：`5 * 1024 * 1024` 字节；落盘前拒绝。

## 5. 元数据剥离（不引入新依赖）

| 格式 | 处理 |
|---|---|
| JPEG | 解析段到 SOS；丢弃 `APP1`（EXIF / XMP）、`APP13`（IPTC）、`COM`；保留 `APP0`（JFIF）、`APP2`（ICC）与图像数据；SOS 之后原样复制 |
| PNG | 解析 chunk；丢弃 `eXIf`、`tEXt`、`iTXt`、`zTXt`、`tIME`；其余 chunk 原样保留（CRC 不变） |
| WebP | 解析 RIFF chunk；丢弃 `EXIF`、`XMP `；若存在 `VP8X` 且设置了 EXIF / XMP flag，清除对应 bit 并重写 `VP8X` chunk；保留 `VP8` / `VP8L` / `ALPH` / `ICCP` / `ANIM`；重写 RIFF size |
| 其它 / 结构损坏 | 拒绝，400 `INVALID_INPUT`，不落盘 |

## 6. 关键流程

**上传**：`requireSessionUser` → `requireCanShare(trip, author)` → 读取字节 → 大小 / 魔数校验 → 懒清理（>24h 未绑定）→ 计数（`trip_id + author_id` 的已绑定 + 未绑定）≥6 拒绝 → 剥离元数据 → 落盘 → 插入未绑定行 → 返回 `{id, url}`。失败时删除已写文件。

**编辑态配额：** 已绑定到当前体验的图片仍计入 6 张上限。因此已满 6 张时替换图片需先「移除并保存」释放配额，再上传新图；前端在达到上限且存在待移除项时提示用户先保存。不引入「上传时声明 experience_id 并排除当前绑定」的额外参数（避免契约与计数分支复杂化）。

**提交**：`upsert` 在事务内：
1. 校验体验文字（现有）。
2. `photo_ids` 去重、长度 ≤6；逐条查行：必须 `trip_id` / `author_id` 匹配，且 `experience_id` 为空或等于当前体验 id。
3. 计算 `removed = 旧绑定 - 新集合`；删除旧绑定行。
4. 新集合按顺序写 `experience_id` + `sort_order`。
5. 返回 `ExperienceResponse.photos`（有序）。
6. 事务提交后删除 `removed` 的文件（`TransactionSynchronization.afterCommit`）；删除失败只记日志，留给懒清理。

**懒清理**：每次上传开始时删除 `experience_id IS NULL AND created_at < now - 24h` 的行与文件；使用 `Clock`，不引入定时任务。

**批量读取**：列表方法先收集 experience id，`TripExperiencePhotoMapper` 一次查询 `IN (ids)`，按 experience id 分组后传给 `ExperienceResponse.from`，避免新增 N+1。

## 7. 前端

- **分享页**：主列新增第四个面板「照片（选填）」，位于「真实感受」与「路线强度」之间；使用隐藏 `<input type="file" multiple accept="image/jpeg,image/png,image/webp">` + 缩略图网格；每张支持移除、上移 / 下移；显示 `n/6`；错误提示放在面板内，不阻塞文字输入。
- **编辑态**：进入页面时加载 `mine.photos`，按顺序初始化；提交时 `photo_ids` 为当前顺序。
- **提交失败**：保留已上传图片与顺序，可重试；不重复上传。
- **详情页**：体验列表项有图片时展示首图 `<img>` + 「查看全部 {n} 张」，点击用 antd `Image.PreviewGroup`；无图只渲染文字。
- **体验卡**：不改（D3）。
- **i18n**：新增 `experiencePhotoPanel` / `experiencePhotoAdd` / `experiencePhotoRemove` / `experiencePhotoMoveUp` / `experiencePhotoMoveDown` / `experiencePhotoLimit` / `experiencePhotoSize` / `experiencePhotoType` / `experiencePhotoFailed` / `experiencePhotoViewAll` / `experiencePhotoCount`；不改既有键。
- **样式**：新增 `.share-photos` / `.photo-grid` / `.photo-tile` / `.photo-actions` / `.experience-photos` / `.experience-photos-more`；只用现有令牌；≤680px 单列。
- **原型先行**：先改 `docs/prototype/ui.js` 的 `share()` 与详情体验列表、`styles.css`；`prototype.html` 若仅壳则不改，浏览器核对 1440 / 768 / 390 × 浅 / 深色。

## 8. 决策

| id | 决策 | Context / 理由 | 放弃的替代方案 |
|---|---|---|---|
| D1 | 上传端点为 trip 作用域：`POST /trips/{tripId}/experiences/photos` | 数量、资格与归属都需要 trip 上下文；与体验提交同源 | 全局 `/users/me/experience-photos`（无 trip 上下文）；随体验一次性 multipart（重试耦合） |
| D2 | 本地磁盘 + 配置目录，仿头像 | 部署形态不变；`uploads/` 已 gitignore | 对象存储 / CDN（新增依赖）；图片存 DB blob（备份与读取变重） |
| D3 | 字节级剥离元数据，纯 JDK | 无新依赖；三种格式可控；解析失败可拒绝 | `metadata-extractor`（只读）；ImageIO 重编码（WebP 不支持、质量损失）；Apache Commons Imaging（额外依赖） |
| D4 | 独立 `trip_experience_photos` 表 | 可索引、可计数、可懒清理；`experience_id` 可空支持未提交草稿 | JSON 列（难计数 / 清理）；无 trip 作用域的独立表（难做上传上限） |
| D5 | 响应 `photos: [{id,url}]` 有序数组 | 前端直接可用；顺序即数组顺序 | 只返回 id（前端再拼 URL）；带 host 的绝对 URL（环境耦合） |
| D6 | 上传建未绑定行；提交整体替换绑定 | 支持预览 / 重试；服务端统一校验 | 上传即绑定（无法预览 / 重试）；仅前端限 6 张（不可信） |
| D7 | 懒清理 >24h 未绑定；移除文件在事务提交后删除 | 不引入调度设施；删除失败不回滚业务 | 定时任务（运维成本）；不清理（磁盘累积） |
| D8 | 自绘文件选择 + 缩略图网格，antd `Image.PreviewGroup` 查看 | 需要移除 / 排序，antd `Upload` 的列表状态会与草稿冲突；保留键盘可用 | antd `Upload` 全托管；拖拽库（额外依赖） |
| D9 | 详情首图 + 查看全部；卡片不变 | D3 守住首页信息密度；详情足够承载 | 卡片图片网格；轮播；独立体验详情页 |
| D10 | 沿用现有错误码枚举 | 前端已有映射；避免新增枚举与契约扩散 | 新增 `PHOTO_*` 错误码（需全端映射） |
| D11 | 契约 0.12.0 + V18 | 当前 main 0.11.0 / V17；本 change 先落 | 等 `add-ai-itinerary`（会被阻塞）；共用编号（冲突） |
| D12 | 列表批量查图片 | 避免在既有 N+1 上再加一层 | 每条体验单独查图片（N+1 加倍） |
| D13 | 分享页新增第四个主列面板「照片（选填）」 | 不挤压真实感受；与强度 / 建议分组并列；原型同步 | 塞进「真实感受」面板（拥挤）；替换强度面板（丢功能） |

**编号冲突处理：** 若 `add-ai-itinerary` 先合并并占用 0.12.0 / V18，则本 change 顺延为 **0.13.0 + V19**；反之由 `add-ai-itinerary` 顺延。以合并先后为准，不共用编号。

## 9. 与 ATDD 的对应

| ATDD | 设计落点 |
|---|---|
| A1 / A7 | 上传端点 + `upsert` 绑定 + `ExperienceResponse.photos` |
| A2 | `ExperiencePhotoService` 数量 / 大小 / 魔数校验 |
| A3 | `upsert` 归属 / 占用校验（403 / 400） |
| A4 | `requireSessionUser`（401 `DEMO_USER_REQUIRED`） |
| A5 | `PhotoMetadataStripper` + 落盘前处理 |
| A6 | 上传前懒清理（`Clock`） |
| E1–E3 | 分享页照片面板 + 提交 / 重试 |
| E4 / R4 | 详情首图 / 无图；`ExperienceCard` 不变 |
| E5 | 现有 `shareEligibility` + 后端资格 |
| R1–R3 | 不改发布页 / 聊天 / 参考发布 |

## 10. 残余风险

- 字节级剥离需覆盖 JPEG 段异常、PNG 未知 chunk、WebP 非标准布局；P4 用样本与坏样本双测。
- 读取端点缓存 24h：图片删除后，已缓存过的浏览器最多一天内仍可能显示旧图；服务端已 404，刷新后失效。不设 `immutable` 以避免长期不可撤销。
- 5 MB × 6 张的本地磁盘占用；无配额与监控，记为运维风险。
- 列表批量查询仍受既有 `describe` N+1 影响；本 change 只避免新增一层。
- E2E 不在 CI；上传用例依赖本地隔离环境。
- 无自动审核；依赖举报入口（D8）。
