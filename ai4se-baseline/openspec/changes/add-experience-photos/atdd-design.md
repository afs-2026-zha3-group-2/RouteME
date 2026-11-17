# ATDD 设计 — add-experience-photos

- **Change：** `add-experience-photos`（`trip-experiences` ADDED 2 + MODIFIED 3，REQ-018）
- **阶段：** P3（ATDD 设计）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **输入：** G1 Pass + C1 的 Delta；`dov-ac-review.md`；`consistency-lint.md`；`requirements/REQ-018-experience-photos.md`；现有 `e2e/tests/experiences.spec.ts`、后端体验 / 头像测试与 `Clock` 夹具
- **NFR：** 用户 2026-11-17 确认**不纳入**本次 ATDD（上传大小 / 魔数 / EXIF / 越权已在验收场景覆盖；性能、磁盘监控、并发上传记为残余风险）。

## 1. ATDD 层与场景分类

ATDD 只规划 **API** 与 **E2E** 两层；纯逻辑（魔数识别、EXIF 剥离、清理谓词、排序映射）列 **Defer UT**，交 P4 `/sdd:atdd-apply` 做 red-green。

| # | 场景 / 验收主题 | Layer | 依据 | 备注 |
|---|---|---|---|---|
| A1 | 上传 2 张图片 → 体验提交 → 响应含有序图片 | API | 单端点契约 + 持久化 | 上传端点采用 trip 作用域；路径在 `design.md` 固定 |
| A2 | 第 7 张 / >5MB / 错误魔数 → 400 `INVALID_INPUT` | API | HTTP 状态 + 错误码 | 上传时按（trip, author）计数；提交时复验 ≤6 |
| A3 | 引用他人图片 → 403 `FORBIDDEN`；不存在 / 已占用 → 400 `INVALID_INPUT` | API | authz + 输入校验 | 覆盖三种拒绝原因 |
| A4 | 未登录上传 → 401 | API | 会话边界 | 错误码在 `design.md` 固定（`DEMO_USER_REQUIRED`） |
| A5 | 上传后落盘文件不含 EXIF（GPS / 设备 / 时间） | API | 读回字节断言 | 与 A6 共用样本 |
| A6 | >24h 未绑定图片在下一次上传时被清理；已绑定不受影响 | API | 时间 + 持久化 | 复用项目 `Clock` 夹具；不引入定时任务 |
| A7 | 体验响应含 `photos`（有序，可为空数组） | API | 响应形状 | 详情 / 首页共用响应 |
| E1 | 分享页上传 2 张 → 发布 → 详情显示首图 + 「查看全部 2 张」 | E2E | 跨页用户路径 | 主验收路径 |
| E2 | 编辑删除第 2 张、把第 3 张移到首位 → 保存后详情 / 分享页按新顺序 | E2E | UI 交互 + 持久化 | 拖拽或上移按钮按 `design.md` |
| E3 | 未提交图片可预览 / 移除；提交失败后已上传图片保留可重试 | E2E | UI 状态 + 失败恢复 | 用路由拦截模拟 500，再恢复重试 |
| E4 | 无图体验在详情只显示文字；首页体验卡仍用内置封面（反向） | E2E | 反向验证 | 同时覆盖 Non-goal「卡片改图」 |
| E5 | 非作者看不到上传 / 删除入口；直达分享页被资格校验拦截 | E2E | 权限边界 | 复用现有资格提示 |
| R1 | 行程发布页没有图片上传入口 | E2E（反向） | Non-goal | 断言无 `input[type=file]` / 上传按钮 |
| R2 | 聊天页没有图片上传入口 | E2E（反向） | Non-goal | 同上 |
| R3 | 参考此行程发布不复制图片 | API（反向） | Non-goal | 新计划响应 / 请求无 `photos` |
| R4 | 体验图片不进入首页卡片（无 `<img>` / 无图片 URL） | E2E（反向） | D3 | 断言 `.exp-cover` 存在且无体验图片节点 |
| U1 | 魔数识别（JPEG / PNG / WebP / 其它 / 伪装扩展名） | Defer UT | 纯函数 | P4 单测 |
| U2 | EXIF 剥离（JPEG APP1 / PNG eXIf / WebP EXIF chunk；解析失败按坏格式） | Defer UT | 纯函数 / 字节处理 | P4 单测 + 样本 |
| U3 | 24h 清理谓词（未绑定 / 已绑定 / 边界 24h） | Defer UT | 纯逻辑 | P4 单测 |
| U4 | 图片排序映射（提交顺序 / 读取顺序 / 删除后重排） | Defer UT | 纯逻辑 | P4 单测 |

**优先级：** A1–A7 先红；E1–E3 随后；E4 / E5 / R1–R4 与实现同批转绿；U1–U4 在 P4 按 TDD 红绿。

## 2. 写代码前先落什么

1. `e2e/tests/experiences.spec.ts` 新增：E1 / E2 / E3 / E4 / E5 与 R1 / R2 / R4（红态）。
2. 后端测试新增（红态）：A1–A7，放在体验 controller / service 的现有测试类旁（或新建 `ExperiencePhotoApiTest`）。
3. 契约先行的形状断言：A7 的 `photos` 字段在 `openapi.yaml` 后由 `redocly lint` 与 `ExperienceControllerTest` 共同守住。
4. U1–U4 不在本阶段写；P4 按 TDD 先写失败单测。

## 3. 本地 vs CI 门禁

| 层 | 本地 | CI |
|---|---|---|
| API（后端） | `.\mvnw.cmd -B -ntp test` | 现有 backend job 执行 |
| 前端 | `npm run typecheck` / `npm test` / `npm run build` | 现有 frontend job 执行 |
| E2E | `npx playwright test tests/experiences.spec.ts`（隔离 SQLite + 独立 uploads 目录 + 独立 `--output`） | **不纳入 CI**（沿用现状；残余风险已记录） |
| 契约 | `redocly lint openapi.yaml`；`openspec validate add-experience-photos --strict` | 现有契约 / validate 检查 |
| 迁移 | 全新库 V1→V18；旧库 V17→V18 双路径 | backend job 使用 H2 / Flyway |

不新增 CI 产品，不改现有 pipeline 语义。

## 4. 数据 / 夹具策略

- **图片样本：** `e2e/fixtures/experiencePhotos.ts` 提供 1×1 / 8×8 的 JPEG（带 GPS + 设备 EXIF）、PNG（含 `eXIf` / `tEXt`）、WebP（含 `EXIF` chunk）与「伪装扩展名」样本；>5MB 用 `Buffer.alloc` 生成，不入库。
- **后端样本：** `MockMultipartFile` 复用同一份 base64；EXIF 断言用 `metadata` 读取 / 字节搜索 `Exif\0\0` / `eXIf` / `EXIF`。
- **上传目录：** 后端新增配置 `routeme.experience.photo-dir`（与 `design.md` §4 同键），测试用 `@TempDir` 覆盖；E2E 启动时指向独立目录，结束后清理。
- **时钟：** 复用 `add-trip-completion` 引入的 `Clock` 夹具；孤儿清理测试用固定时钟 + 直接插入旧记录，不等待真实 24h。
- **数据所有权：** 每个 E2E 用例自建「已完成行程 + 作者 + 体验」，不复用共享种子；跨用例不共享图片 id。
- **清理：** E2E 使用独立 SQLite 与 uploads 目录；后端单测每个用例清理临时目录；不写入 `SqlLite/uploads/` 默认目录。

## 5. Non-goal 反向验证

| Non-goal | 反向用例 |
|---|---|
| 行程发布封面图 | R1：发布页无 file input / 上传按钮 |
| 聊天图片 | R2：聊天页无 file input / 上传按钮 |
| 头像上传变更 | 复用现有 `profile.spec.ts` 头像用例，断言体验上传不影响 `avatar_url` |
| S17 复制图片 | R3：参考发布的新计划不含 `photos` |
| 首页体验卡改图 | R4 / E4：卡片仍为 `.exp-cover`，无体验图片节点 |
| 内容审核 | E1：发布后立即可见，无待审状态 |
| 对象存储 / CDN | A5 / A6：文件落在本地 uploads 目录，URL 为本站只读端点 |
| 服务端缩略图 | A5：落盘只有原图，无 `*-thumb` 文件 |
| 删除体验端点 | 契约断言：无 `DELETE /trips/{tripId}/experiences` |

## 6. Non-goals（本阶段）

- 不写业务实现代码、不写测试代码（P4 `/sdd:atdd-apply`）。
- 不设计完整 UT 套件；U1–U4 只列名。
- 不使用 Playwright / POM / Excel 生成器。
- 不新增 CI 产品、不改现有流水线语义。
- 不做 NFR 测试（用户 2026-11-17 确认不纳入；性能 / 磁盘 / 并发记为残余风险）。

## 7. 交接

- `/sdd:task-plan`：把 A1–A7 / E1–E5 / R1–R4 映射到任务；`design.md` 固定上传端点路径、契约 0.12.0 + V18、EXIF 剥离方式与 401 / 403 / 400 错误码。
- 原型先行在 P4 开工前完成（`docs/prototype/`）；本设计只定义验收层。
