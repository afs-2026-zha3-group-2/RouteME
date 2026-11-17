# 变更提案：add-experience-photos

- **需求来源：** S16「发布游后体验」增强项（原型 AC #4「图片上传视为增强」/ 削减顺序第 1 条）｜ **需求条目：** `requirement-workspace/requirements/REQ-018-experience-photos.md`（REQ-018）
- **能力：** `trip-experiences`（MODIFIED + ADDED）
- **规模：** L（契约 + 迁移 + 后端上传 / 读取 + 前端分享页 / 详情页 + E2E）；故事点待 SM 估（原 S16 3 点不含图片）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`、`@rule:web-testing`、`@rule:pii-scrubbing`；视觉基准：`docs/prototype/prototype.html` + `docs/prototype/styles.css`
- **基线：** `main@c57a70f`（`openapi.yaml` 0.11.0，迁移到 V17）。已归档：`add-trip-experiences`、`add-trip-plans`、`add-trip-companions`、`add-user-auth`、`add-user-profile`、`add-user-profiles`。未归档且同改 `trip-experiences`：`refine-experience-share`、`refine-inspiration-home`、`add-destination-area-filters`。
- **归档顺序：** 必须排在 `refine-experience-share` 之后，并与其它同改 `trip-experiences` 的 change 串行；契约 / 迁移号需与在途 `add-ai-itinerary`（计划 0.12.0 + V18）统一排号。

## Why

S16 的主干（资格校验、发布 / 修改、两处展示、纯文字 + 三档强度 + 一条建议）已由 `add-trip-experiences` 归档交付，`refine-experience-share` 的两轮也已合并到 `main`。但原型在 S16 AC 第 4 条写着「图片上传视为增强，时间紧只用文字 + 内置封面」，削减顺序第 1 条就是它；`stories.md` 也记录了本迭代不做。结果是：

- **体验只有文字。** 真实照片能显著提升可信度与灵感转化；当前用户无法上传任何行程照片。
- **数据 / 契约 / 后端 / 前端四层都没有图片位。** `trip_experiences` 只有三字段；`ExperienceWriteRequest` 只有 `content / intensity / advice`；分享页没有 file input；E2E 还反向断言「没有上传入口」。
- **上传模式已有先例。** 头像上传已实现 multipart、魔数校验、2 MB 上限、服务端文件名、本地落盘与公开读取；体验图片可以复用同一套模式，不需要对象存储。

## What Changes

- `trip-experiences`（ADDED）：「游后体验图片的上传、保存与生命周期」——两步上传、0–6 张、≤5 MB、JPEG/PNG/WebP 魔数、归属校验、EXIF 全量剥离、编辑增删排序、>24h 未绑定懒清理。
- `trip-experiences`（MODIFIED）：「游后体验的内容口径与纯文字降级」把图片写为**可选增强**，纯文字仍然合法；「游后体验在原计划详情页展示」增加首图缩略图与查看全部；「灵感首页的旅行体验视图」明确体验卡继续使用内置色调封面、不加载体验图片（D3）。
- 前端：`ShareExperiencePage` 增加图片上传位（预览 / 删除 / 排序 / 失败重试）；`TripDetailPage` 体验列表增加首图缩略图与查看全部浮层；`ExperienceCard` **不改**；`tripMessages` / `styles.css` / `types.ts` / `api.ts` 同步。
- 后端：新增 multipart 上传端点、公开只读图片读取端点、图片归属校验与懒清理；`ExperienceWriteRequest` / `ExperienceResponse` 增加有序图片集合。
- 契约 / 迁移：`openapi.yaml` 升版（P3 定 0.12.0 或顺延）；新增 `trip_experience_photos` 表（V18 或顺延）。
- 原型：先改 `docs/prototype/prototype.html` / `ui.js` / `styles.css`，再改实现。
- 测试：`experiences.spec.ts` 的「没有上传入口」反向断言改为正向上传；新增上传、编辑排序、详情展示、权限、历史兼容用例；后端上传校验与归属用例。

## 范围

**In scope**

- 分享页图片上传位：0–6 张，预览、删除、排序、失败可重试；作者可管理已保存图片。
- 两步上传：multipart 上传端点返回图片引用；体验提交携带有序引用列表；首图为主图。
- 服务端校验：数量、单张 ≤5 MB、JPEG/PNG/WebP 魔数、归属与占用校验、服务端文件名。
- 上传时剥离全部 EXIF（GPS、设备、拍摄时间）。
- 编辑体验时保留 / 删除 / 重排；被移除图片的文件不再可读。
- 原行程详情页：首图缩略图 + 「查看全部 {n} 张」浮层；无图体验保持纯文字。
- 首页体验卡保持内置封面；我的旅行入口与已分享标记不变。
- 原型先行 + 契约 / 后端 / 迁移 / 单测 / E2E 同批更新。

**Out of scope**

- 行程发布封面图、聊天图片、头像上传（归各自能力）。
- 图片内容审核、AI 打标、外链图片、对象存储 / CDN。
- 首页体验卡改图、图片轮播、瀑布流、独立体验详情页。
- 「参考此行程发布」复制图片（S17 仍不带图）。
- 删除体验端点（当前不存在）；图片生命周期只随体验编辑处理。
- 服务端缩略图生成 / 图片裁剪 / 滤镜 / 水印（D5 明确不生成）。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/openapi.yaml` | 新增上传 / 读取端点与体验图片字段；版本 P3 定 |
| `RouteME/backend/src/main/resources/db/migration/V18__*.sql` | 新增 `trip_experience_photos` 子表；迁移号 P3 定 |
| `RouteME/backend/src/main/java/routeme/**` | 上传 / 读取 controller、service、存储组件、EXIF 剥离、归属校验、懒清理、体验响应扩展 |
| `RouteME/frontend/src/experiences/ShareExperiencePage.tsx` | 图片上传位、预览、删除、排序、失败重试 |
| `RouteME/frontend/src/trips/TripDetailPage.tsx` | 体验列表首图缩略图与查看全部浮层 |
| `RouteME/frontend/src/experiences/ExperienceCard.tsx` | **不变**（D3） |
| `RouteME/frontend/src/{i18n/tripMessages.ts,styles.css,types.ts,api.ts}` | 文案、样式令牌、类型与 API 客户端 |
| `RouteME/e2e/tests/experiences.spec.ts` | 反向断言改正向；新增上传 / 编辑 / 展示 / 权限 / 历史兼容 |
| `docs/prototype/{prototype.html,ui.js,styles.css}` | 上传位、预览 / 排序、详情页图片展示（原型先行） |
| `openspec/specs/trip-experiences/spec.md` | 归档阶段合并本 change 的 Delta |
| `requirement-workspace/{registry,handoff,stories,deep-dive,impact-brief}.md` | 已登记 REQ-018 / §18 / D1–D8 |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 上传形态 | 两步上传 + 本地磁盘（D1） | 复用头像模式；体验提交只传引用，失败可重试且不重传 |
| 数量 / 大小 / 格式 | ≤6 张 / ≤5 MB / JPEG-PNG-WebP 魔数（D2） | 磁盘与列表性能可控；不信任声明类型 |
| 展示位置 | 首页卡片保持内置封面；仅详情页与分享页展示（D3） | 不改变已验收的首页信息密度与 E2E 封面断言 |
| 范围 / 权限 | 仅游后体验；作者可管理，浏览者只读（D4） | 单 capability；不扩 `trip-plans` |
| 缩略图 | 原图 + CSS 等比 + `loading="lazy"`（D5） | 无图像处理依赖；列表只加载首图 |
| EXIF | 上传时全部剥离（D6） | 隐私优先；避免 GPS 精确位置泄露 |
| 孤儿清理 | 每次上传时懒清理 >24h 未绑定（D7） | 不引入定时任务与调度设施 |
| 内容审核 | 不做自动审核，沿用举报入口（D8） | MVP 范围最小；记为残余风险 |
| capability 粒度 | 单一 `trip-experiences`（ADDED 1 + MODIFIED 3） | 上传 / 展示 / 首页反向约束同属该能力 |

## 验收信号

1. 具备资格的作者在分享页上传 2 张图片并提交后，详情页体验区显示首图缩略图与「查看全部 2 张」；再次进入分享页可见已保存图片。
2. 第 7 张、>5 MB、非 JPEG/PNG/WebP（按魔数）均被拒绝且给出可读错误；已填文字不丢失。
3. 编辑体验时删除一张并把另一张移到首位，保存后详情页与分享页按新顺序展示，且被移除图片不可再读取。
4. 详情页有图体验显示首图与查看全部；无图体验只显示文字，不出现空占位或裂图。
5. 分享页移除未提交图片后不被保存；提交失败后已上传图片保留，可重试而不重传。
6. 非作者引用他人图片或删除他人图片被服务端拒绝（403）；未登录上传返回 401。
7. 上传带 GPS 的 JPEG 后，落盘文件不含 EXIF；上传后 >24h 未绑定的图片在下一次上传时被清理。
8. 灵感首页体验卡仍使用内置色调封面，不加载体验图片；我的旅行入口与已分享标记不变。
9. `openspec validate add-experience-photos --strict` 通过；前端 typecheck / 单测、后端上传与体验回归、`experiences.spec.ts` 全绿；1440 / 768 / 390 × 浅 / 深色走查无横向溢出。

## 残余风险

| 风险 | 处理 |
|---|---|
| 契约 / 迁移号与 `add-ai-itinerary` 撞车 | P3 统一排号；如冲突则顺延 0.13.0 + V19 |
| 与 `refine-experience-share` 同改 `trip-experiences` | 归档必须串行；本 change 在其后 |
| 本地磁盘容量与孤儿文件 | 数量 / 大小上限 + >24h 懒清理；E2E 用隔离目录 |
| 图片 EXIF 泄露位置 | 上传时全量剥离；P4 用带 GPS 样本验证 |
| 无自动审核 | 沿用举报入口；记为残余风险，不在本迭代扩展 |
| E2E 依赖真实文件与共享 `test-results/` | 用隔离产物目录与独立 SQLite；沿用现有约定 |
| 首页信息密度回退 | D3 反向约束 + E2E 封面断言守住 |

## 交付边界

本提案为 P1 产物，只回答「为什么改、改哪些能力、验收信号是什么」。`specs/trip-experiences/spec.md` 为 Delta 草稿；`dov-ac-review.md`、`design.md`、`atdd-design.md`、`tasks.md`、代码与验证属 P2 / P3 / P4；Living Spec 合并在归档阶段完成，本 change 不归档。
