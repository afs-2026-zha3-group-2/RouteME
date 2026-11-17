# REQ-018 — 游后体验图片上传（S16 增强项）（Ready 需求条目）

- **能力：** `trip-experiences`（MODIFIED：体验图片上传、保存与展示）；只读参考 `user-profile` 的头像上传实现
- **对应 OpenSpec change：** 待 P1 split 产出 `add-experience-photos`（本条目先于 change 存在）
- **编号说明：** `registry.md` 最新登记为 REQ-017（`add-ai-itinerary`），本需求顺延为 **REQ-018**；不并入未归档的 `refine-experience-share`
- **Ready 日期：** 2026-11-17 ｜ **状态：** drafted（P1）
- **故事口径：** S16 增强项（原型 AC #4 / 削减顺序第 1 条）｜ 迭代 3 ｜ 点数待 SM 估（原 S16 3 点不含图片）｜ 落点页面：游后分享页 + 行程详情页
- **证据：** `intents/REQ-018-experience-photos.md`；`docs/prototype/stories.html:640,716`；`requirements/REQ-004-trip-experiences.md:36,56,62`；`stories.md:102`；`openspec/changes/refine-experience-share/proposal.md`（Out of scope）；`RouteME/backend/src/main/resources/db/migration/V8__create_trip_experiences.sql:1-13`；`RouteME/backend/src/main/java/routeme/request/ExperienceWriteRequest.java:3`；`RouteME/openapi.yaml:2180-2197`；`RouteME/frontend/src/experiences/ShareExperiencePage.tsx:178-234`；`RouteME/frontend/src/experiences/ExperienceCard.tsx:24-29`；`RouteME/e2e/tests/experiences.spec.ts:238`；头像先例 `RouteME/openapi.yaml:215-257`、`RouteME/backend/src/main/resources/application.yaml:24-27`、`.gitignore:45-46`

## Discovery Decision

**Go（light intake，2026-11-17）。** 理由：候选能力一句话可说清（给游后体验增加可选图片上传与展示）；与 `trip-experiences` 的关系明确；数据库 / 后端 / 契约 / 前端 / E2E 五层现状均可取证；头像上传提供了可直接复用的 multipart + 魔数 + 本地落盘模式；用户已就 D1–D4 裁决，无需升级完整 Discovery。

## 六字段摘要

| 字段 | 内容 |
|---|---|
| id | REQ-018 |
| statement | 让具备分享资格的用户在发布或修改游后体验时，上传最多 6 张真实行程照片（JPEG / PNG / WebP，单张 ≤5MB），随体验一起保存；浏览者在原行程详情页可见图片，首页体验卡保持内置色调封面不变。 |
| actors | 体验作者（已结束行程的发布者或已接受同行者）、浏览者（已进入用户）、系统（上传校验、落盘、归属校验、绑定与清理） |
| rationale | 真实照片提升体验可信度与灵感转化；S16 因工期把它列为增强项并作为第一条削减项，现在主线已交付，补齐它比新开故事更贴合「分享 → 灵感」闭环。 |
| acceptance hints | 见 §4：上传并发布、数量/大小/格式校验、编辑增删与排序、详情页展示、分享页预览与移除、权限边界、历史兼容、首页卡片不变。 |
| links to evidence | 见上方证据路径；上传实现以头像端点为先例；展示口径以 `trip-experiences` Living Spec 与原型为准。 |

## 1. Intent

一句话：**让游后体验从「纯文字 + 内置封面」升级为「文字 + 最多 6 张真实照片」，但不改变发布资格、文字口径与首页信息密度**——作者在分享页上传、预览、排序与删除，图片随体验保存；浏览者在原行程详情页看到首图缩略图并可查看全部；灵感首页的体验卡仍用内置封面，避免列表变重。

## 2. Actors

| 角色 | 权限边界 |
|---|---|
| 体验作者（发布者 / 已接受同行者） | 仅在已结束且自己参加过的行程上，为自己的体验上传、删除、排序图片；可修改自己体验的图片集合。 |
| 浏览者（已进入用户） | 只读：可查看详情页体验图片；不能上传、不能引用他人图片、不能删除。 |
| 未登录访客 | 不能上传（401）；可浏览已公开的体验图片（与现有体验可见性一致）。 |
| 系统 | 校验数量 / 大小 / 魔数 / 归属；生成文件名并落盘；绑定体验；清理被移除或未绑定的文件。 |

不新增角色；不改变现有体验发布 / 修改资格（`EXPERIENCE_NOT_ALLOWED` 仍由服务端判定）。

## 3. In / Out scope

**In scope**

- 分享页新增图片上传位：最多 6 张，支持预览、删除、排序、失败重试。
- 两步上传：先通过 multipart 上传端点取得图片引用，再随体验提交有序引用列表。
- 服务端校验：每篇体验 ≤6 张、单张 ≤5MB、JPEG / PNG / WebP 按魔数判定、服务端生成文件名。
- 体验写请求与响应携带有序图片集合；首图为主图。
- 编辑体验时保留、删除、重排图片；被移除图片的文件由后端清理。
- 原行程详情页体验列表展示首图缩略图，并可查看全部图片。
- 无图体验与历史体验保持现状；首页体验卡保持内置封面（D3）。
- 原型先行：先改 `docs/prototype/prototype.html` / `ui.js` / `styles.css`，再改实现。
- 契约、后端、迁移、单测与 E2E 的同批更新。

**Out of scope**

- 行程发布封面图、聊天图片、头像上传（归各自能力）。
- 图片内容审核、AI 打标、外链图片、对象存储 / CDN。
- 首页体验卡改图、图片轮播、瀑布流、独立体验详情页。
- 「参考此行程发布」复制图片（S17 仍不带图）。
- 删除体验端点（当前不存在）；图片生命周期只随体验编辑处理。
- 图片裁剪、滤镜、水印、服务端缩略图生成（MVP 用原图 + CSS / 懒加载）。

## 4. Scenarios + AC hints（SHALL 式，可观察）

1. **上传并发布带图体验** — Given 具备资格的作者在分享页，When 依次上传 2 张照片并提交体验，Then 系统 SHALL 保存体验与 2 张图片的绑定关系，And 原行程详情页的体验列表 SHALL 显示首图缩略图，And 再次进入分享页 SHALL 显示已保存的 2 张图片。*（两步上传：上传返回引用，提交携带引用）*
2. **数量、大小与格式校验** — Given 作者已上传 6 张图片，When 尝试上传第 7 张，Then 系统 SHALL 拒绝并提示上限；Given 单张 >5MB 或内容魔数不是 JPEG / PNG / WebP，When 上传，Then 系统 SHALL 拒绝并给出可读错误，And 已填写的文字内容 MUST NOT 丢失。
3. **编辑时增删与排序** — Given 已发布含 3 张图片的体验，When 作者删除第 2 张、把第 3 张移到首位并保存，Then 详情页与分享页 SHALL 按新顺序展示 2 张，And 被移除图片的文件 MUST NOT 再被读取。
4. **详情页展示图片** — Given 一条含 3 张图片的已发布体验，When 浏览者打开原行程详情，Then 体验区 SHALL 显示首图缩略图与「查看全部 3 张」入口，And 点开后 SHALL 可见全部图片；Given 一条无图体验，Then 体验区 SHALL 只显示文字，MUST NOT 出现空占位或裂图。
5. **分享页预览与移除** — Given 作者在分享页已选 2 张未提交图片，When 移除其中一张，Then 预览 SHALL 消失且该图片 MUST NOT 随体验保存；Given 提交失败，Then 已上传成功的图片 SHALL 保留以便重试，MUST NOT 要求重传。
6. **权限边界** — Given 用户不是该体验作者，When 尝试引用他人图片或删除他人图片，Then 服务端 SHALL 拒绝（403）；Given 未登录，When 上传，Then SHALL 返回 401；浏览者只能查看。
7. **历史体验兼容** — Given 图片功能上线前已发布的体验没有图片，When 浏览首页、详情与我的旅行，Then 首页体验卡 SHALL 继续显示内置封面，详情页 SHALL 只显示文字，MUST NOT 出现裂图或空占位。
8. **首页体验卡不变** — Given 一条含图片的体验，When 浏览灵感首页「旅行体验」视图，Then 卡片 SHALL 继续使用内置色调封面（用户裁决 D3），MUST NOT 加载体验图片。
9. **元数据剥离与孤儿清理** — Given 作者上传一张带 GPS 与设备信息的 JPEG，When 上传成功，Then 服务端保存的文件 SHALL 不含 EXIF（GPS、设备与拍摄时间全部剥离）；Given 一张图片上传后超过 24 小时仍未绑定体验，When 下一次上传触发清理，Then 该图片 SHALL 不可再被读取，且 MUST NOT 影响已发布体验的图片。

### 4.1 与现有能力的映射

| 本条目场景 | 现有能力 / 规格 | 关系 |
|---|---|---|
| #1 / #3 / #5 | `trip-experiences`「对已结束且参加过的行程发布游后体验」 | 在既有发布 / 修改流程上新增图片集合，不改资格与 upsert 口径 |
| #2 | 既有字数与强度校验 | 新增图片维度校验，沿用「错误可读、输入不丢失」口径 |
| #4 / #7 | `trip-experiences`「游后体验在原计划详情页展示」 | 扩展展示位；无图保持现状 |
| #6 | 现有会话与作者权限 | 复用会话校验；新增图片归属校验 |
| #8 | `trip-experiences`「灵感首页的旅行体验视图」+ D3 | 反向约束：首页卡片不变 |

## 5. Constraints（仅事实，不含技术方案）

- **两步上传**：上传端点使用 `multipart/form-data`，返回图片引用（id + 可读 URL）；体验提交只传有序引用列表。参考头像 `POST /users/me/avatar`（`openapi.yaml:215-257`）。
- **本地磁盘**：文件落 `RouteME/SqlLite/uploads/experience-photos/`；`SqlLite/uploads/` 已在 `.gitignore` 忽略（`.gitignore:45-46`），运行期数据不入库。
- **校验口径**：≤6 张 / 单张 ≤5MB / JPEG、PNG、WebP 按魔数判定；不信任声明类型与原始文件名；文件名由服务端生成。
- **图片读取**：公开只读端点（`<img>` 无法携带请求头），带缓存版本参数，参考头像读取端点。
- **归属与绑定**：图片记录归属上传者；体验 upsert 时校验引用图片属于当前作者；未绑定图片按孤儿清理。
- **首页不变**：`ExperienceCard` 的内置封面与现有 E2E 封面断言保持不变（D3）。
- **元数据**：上传时剥离全部 EXIF（含 GPS、设备与拍摄时间），不保留原始元数据（D6）。
- **缩略图**：MVP 不生成缩略图；详情页与分享页使用原图 + CSS 等比 + `loading="lazy"`，列表只加载首图（D5）。
- **孤儿清理**：保存体验时绑定；每次上传时懒清理超过 24 小时仍未绑定的图片，不引入定时任务（D7）。
- **内容审核**：本迭代不做自动审核；沿用现有举报入口与人工处理（D8）。
- **契约与迁移编号**：当前 `openapi.yaml` 0.11.0、迁移到 V17；在途 `add-ai-itinerary` 计划 0.12.0 + V18。本需求的版本与迁移号在 P3 统一排号，避免撞号。
- **原型先行**：按 `@rule:prototype-ui-alignment`，先改 `docs/prototype/`，再改实现；颜色与间距使用现有令牌，不写魔法值。
- **不改**：行程模型、发布资格、体验字数与强度三档、S17 预填字段。

## 6. Context

`add-trip-experiences` 已于 2026-11-15 归档，S16 的主干（资格校验、发布 / 修改、两处展示、纯文字 + 三档强度 + 一条建议）已交付；`refine-experience-share` 的两轮（R1 说明与内置封面、R2 布局对齐原型）也已合并到 `main`，但两者都把「图片上传」明确列为 Out of scope。原型在 S16 AC 第 4 条写着「图片上传视为增强，时间紧只用文字 + 内置封面」，削减顺序第 1 条就是它；`stories.md:102` 也记录了本迭代不做。现在主线稳定，补齐这条增强能提升体验可信度，同时不触碰已验收的资格、文字与首页口径。

## 7. Affected capabilities

| 能力 / 应用架构名 | 变更 | 说明 |
|---|---|---|
| `trip-experiences` | MODIFIED | 体验图片上传、保存、展示；发布资格与文字口径不变。 |
| 接口契约 `openapi.yaml` | 变更（P3 定版本） | 新增 multipart 上传端点、体验图片读取端点、体验写 / 读的图片字段。 |
| 数据库 / 迁移 | 变更（P3 定迁移号） | 新增 `trip_experience_photos`（体验 id、作者 id、文件名、MIME、字节数、排序、时间）。 |
| `trip-plans` | 不变（消费方） | 详情页只新增体验图片展示位，不改行程模型与发布校验。 |
| `user-profile` | 不变（只读参考） | 复用头像上传的落盘 / 魔数 / 文件名模式，不改端点与字段。 |
| 设计系统 `design-system` | 变更 | 分享页上传位 / 预览 / 排序，详情页缩略图与查看全部。 |
| 测试资产 | 变更 | `experiences.spec.ts` 的反向断言改正向；新增上传、编辑、展示、权限用例。 |

## 8. Open questions（应用架构粒度）

| class | status | question | owner | note |
|---|---|---|---|---|
| blocking | resolved | 图片存在哪里、怎么上传？ | 用户 | D1：两步上传 + 本地磁盘 `SqlLite/uploads/experience-photos/`，复用头像模式（2026-11-17）。 |
| blocking | resolved | 数量 / 大小 / 格式 / 生命周期？ | 用户 | D2：≤6 张、单张 ≤5MB、JPEG/PNG/WebP 魔数；首图主图；编辑可增删排序；旧文件后端清理（2026-11-17）。 |
| blocking | resolved | 在哪些界面展示？ | 用户 | D3：首页体验卡保持内置封面；仅详情页与分享页展示图片（2026-11-17）。 |
| blocking | resolved | 范围与权限边界？ | 用户 | D4：仅 S16 体验发布 / 修改；作者可管理，浏览者只读；不含行程发布、聊天、头像、S17（2026-11-17）。 |
| blocking | resolved | 图片与体验如何归属？ | 用户 + 头像先例 | 图片记录归上传者；体验 submit 携带有序引用；服务端校验归属（深挖 ①）。 |
| non-blocking | resolved | 是否生成服务端缩略图？ | 用户 | D5：不生成；原图 + CSS 等比 + `loading="lazy"`，列表只加载首图（2026-11-17）。 |
| non-blocking | resolved | 是否剥离 EXIF（含 GPS）？ | 用户 | D6：上传时全部剥离（GPS、设备、拍摄时间），不保留原始元数据（2026-11-17）。 |
| non-blocking | resolved | 上传后未提交的孤儿图片何时清理？ | 用户 | D7：每次上传时懒清理超过 24 小时未绑定的图片，不引入定时任务（2026-11-17）。 |
| non-blocking | resolved | 是否需要图片内容审核？ | 用户 | D8：不做自动审核，沿用现有举报入口与人工处理（2026-11-17）。 |
| non-blocking | deferred | 故事点如何估？ | SM | 原 S16 3 点不含图片；由 SM 在排期时确认。 |

**blocking 项 = 0 未 resolved**，满足进入 impact / split 的硬门。

## 9. 用户裁决记录（2026-11-17）

| id | 议题 | 裁决 | 对 AC 的影响 |
|---|---|---|---|
| D1 | 存储与上传边界 | **两步上传 + 本地磁盘** | 场景 #1 / #5 按「先上传、后提交」验收；新增上传端点与目录 |
| D2 | 数据契约 | **≤6 张 / ≤5MB / 三种格式** | 场景 #2 / #3 的全部边界 |
| D3 | 展示位置 | **首页卡片保持内置封面** | 场景 #8 为反向约束；#4 只在详情页与分享页展示 |
| D4 | 范围与权限 | **仅体验、作者可管理** | 场景 #6 的权限边界；不扩 `trip-plans` |
| D5 | 缩略图 | **不生成**；原图 + CSS 等比 + `loading="lazy"`，列表只加载首图 | 场景 #4 / #5 的性能口径 |
| D6 | EXIF | **上传时全部剥离**（GPS、设备、拍摄时间） | 场景 #9；服务端保存的文件不含元数据 |
| D7 | 孤儿清理 | **懒清理**：每次上传时清理 >24 小时未绑定的图片 | 场景 #9；不引入定时任务 |
| D8 | 内容审核 | **不做自动审核**，沿用举报入口与人工处理 | 不新增状态机；记为残余风险 |

## DoR 自检（Base 8 + Deep-dive ⑨–⑫）

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| — | resolved | §1 Intent | ①意图清晰（what + why，外部可读） | 通过 |
| — | resolved | §2 Actors | ②角色与权限边界已列（作者 / 浏览者 / 访客 / 系统） | 通过 |
| — | resolved | §3 Scope | ③in-scope 明确，out-of-scope ≥1 | 通过 |
| — | resolved | §4 | ④场景具体可观察，共 8 条 | 通过 |
| — | resolved | §4 #2 / #5 / #6 | ⑤异常与边界（超限、格式、失败、越权、未登录） | 通过 |
| — | resolved | §4 | ⑥结果可验证（图片数量、顺序、可见性、拒绝码、卡片不变） | 通过 |
| — | resolved | §5 / §7 | ⑦依赖与应用架构触点已识别（`trip-experiences`、契约、迁移、头像先例、首页不变） | 通过 |
| — | resolved | §8 | ⑧开放问题门：blocking = 0 未 resolved；non-blocking 已 deferred | 通过 |
| — | resolved | deep-dive ① | ⑨数据契约：图片 grain、字段、状态迁移已列 | 通过 |
| — | resolved | deep-dive ② | ⑩边界枚举：数量 / 大小 / 格式 / 权限 / 失败 / 历史齐全 | 通过 |
| — | resolved | deep-dive ③ | ⑪跨 REQ 一致：REQ-004 / 005 / 008 / 014 / 015 的字段与展示口径已对齐 | 通过 |
| — | resolved | deep-dive ④ | ⑫展示契约：分享页、详情页、首页卡片、我的旅行已逐面定义 | 通过 |
| WARNING | resolved | §8 | 缩略图生成 / EXIF 剥离 / 孤儿清理时机 / 内容审核 4 项未决 | 已在 2026-11-17 由 D5–D8 收口：不生成缩略图、全部剥离 EXIF、>24h 懒清理、不做自动审核 |
| SUGGESTION | deferred | §5 | 契约版本与迁移号可能和 `add-ai-itinerary`（0.12.0 + V18）撞车 | P3 统一排号；proposal 残余风险记录 |
| SUGGESTION | deferred | metadata | 故事点未估（原 S16 3 点不含图片） | SM 排期时确认 |

**DoR BLOCKER 计数 = 0；A0 ⑨–⑫ 全过。** 增补表见 `requirement-workspace/deep-dive.md`「REQ-018 增补」。
