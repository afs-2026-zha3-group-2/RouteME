# 变更提案：add-user-profiles

- **需求：** REQ-009（`requirement-workspace/requirements/REQ-009-publisher-profile.md`）
- **能力：** `user-profiles`（ADDED）｜ **规模：** S–M（复用 main 资料端点并扩展统计 + 1 个资料弹窗 + 2 个入口 + 1 条种子数据迁移）
- **原型：** `docs/prototype/prototype.html`、`ui.js` `profileModal()` / `hostPanel`、`styles.css`（S02 资料弹窗）｜ **原型冲突裁决：** 见 §原型对齐决议

## 问题

浏览者在提交同行申请前，只能从行程卡片看到发布者昵称，详情页虽有简介与兴趣，但没有统一的资料视图、共同兴趣与旅行统计，难以判断「对方是谁、喜欢怎么玩、是否适合同行」。原型已设计 S02 资料弹窗（从发起人卡片进入），本 change 将其落到「行程卡片发布者区域」与「行程详情页发布者卡片」两个入口，并按隐私要求裁剪举报与敏感字段。

## 范围

**In scope（业务能力与页面）**

- 双入口：行程卡片上的发布者区域、行程详情页的发布者卡片，点击打开该发布者的资料弹窗；卡片入口 MUST NOT 触发进入行程详情。
- 资料弹窗内容：头像、昵称、身份/年级与专业或行业（MBTI 选填）、加入时间、简介、兴趣标签、共同兴趣提示（仅与当前浏览者有交集时展示）、四项统计（发布行程 / 已完成 / 参与同行 / 游后分享）、隐私说明。
- 自我查看：发布者是当前用户时展示「这是你」标识；因举报不在本次范围，底部仅保留关闭。
- 四项统计口径：发布行程 = 该用户发布且未取消；已完成 = 该用户发布的已结束；参与同行 = 该用户被接受的申请数；游后分享 = 该用户发布的体验数。
- 异常与边界：用户不存在或资料读取失败时给出可理解提示，不展示不完整/过期资料；无共同兴趣不展示提示；字段不含 MBTI 时不显示空占位。
- 演示数据：新增 1 个非学生演示用户（「上班族 · 互联网行业 · INFP」）与其发布的 1 条招募中行程，用于从卡片/详情入口验收非学生字段语义。

**Out of scope**

- 举报用户功能（弹窗按钮、提交路径、处置闭环）——未来迭代再评估。
- 聊天页「资料」按钮入口；申请人列表、体验作者等其他用户资料入口。
- 资料编辑/维护、资料填写必填校验（身份/年级、专业或行业必填，MBTI 选填）、头像上传、实名认证、信用体系。
- 电话、证件、精确住址、学校门牌、实时位置等隐私字段的采集与展示。
- 修改 `trip-plans` / `trip-companions` / `trip-experiences` 的既有业务规则与数据所有权。

## 影响面（业务）

| 位置（能力 / 页面） | 改动 |
|---|---|
| `user-profiles` 能力 | 扩展 main 的单用户资料读取（新增 `joined_at` 与四项统计），只读聚合 |
| 旅行灵感首页 / 我的旅行（`TripCard` 展示触点） | 发布者区域可点击打开资料弹窗，且不触发卡片跳转；行程业务规则不变 |
| 行程详情页（`trip-plans` 展示触点） | 发布者卡片可点击打开资料弹窗；详情内容与接口不变 |
| 资料弹窗（新） | 按原型 S02 展示公开资料与统计，删除举报按钮，隐私文案按实际字段调整 |
| 演示身份门 / 首页列表（种子数据副作用） | 新增第 4 个用户与其行程，属预期演示变更；迁移测试与 E2E 身份门断言需同步 |
| `trip-companions` / `trip-experiences`（只读消费，不改动） | 提供「已接受申请」「体验作者」统计口径；规则不变 |

## 原型对齐决议

原型与需求不一致处按下表收口（证据：`docs/prototype/ui.js` `profileModal()`、`hostPanel`；`store.js` `stats()`）：

| 冲突点 | 原型 | 本 change 裁决 |
|---|---|---|
| 举报用户按钮 | 弹窗底部有「举报这位用户」 | **不做**（用户明确未来迭代再评估） |
| 资料入口 | 详情页发起人卡片 + 聊天页「资料」按钮 | **仅行程卡片 + 详情页**；聊天页入口不做 |
| 身份/专业字段 | 文案为「学校」，值形如「大三 · 视觉传达」 | 语义扩展为「身份/年级 · 专业或行业 [· MBTI]」，覆盖学生与上班族；本次仅展示 |
| 隐私说明文案 | 「只展示昵称、简介与旅行兴趣」 | 按实际字段调整为「昵称、头像、身份/专业、加入时间、简介与旅行兴趣」；电话、证件、精确住址和实时位置不公开 |
| 自我查看 | 显示「这是你」并隐藏举报 | 保留「这是你」；举报本就不做，底部仅关闭 |
| 卡片入口 | 卡片整体打开详情，无发布者独立入口 | 按用户指示新增发布者区域入口；点击发布者不触发卡片跳转 |
| 卡片入口（与 main 的 S18 差异） | S18 发布者入口跳 `#/users/{id}` | 改为弹窗；公开主页路由保留；`profile.spec.ts` 同步改写 |

## 需求与证据

- 引用需求：REQ-009；意图捕获 `requirement-workspace/intents/REQ-009-publisher-profile.md`。
- 原型证据：`docs/prototype/ui.js` `profileModal()` / `hostPanel`；`store.js` `stats()`；`styles.css` `.profile-*` / `.privacy-note`。
- 现有实现证据：`RouteME/backend/.../V3__create_demo_users.sql`（用户字段与 `created_at`）、`V9__add_user_credentials.sql`（演示/注册账户凭据）、`V10__add_user_profile.sql`（main S18 资料列）、`UserProfileController.java`（main 的 GET/PUT/头像端点）、`DemoUserController.java`（全部账户与 `/users/demo`）、`RouteME/frontend/src/trips/TripCard.tsx`、`TripDetailPage.tsx`、`RouteME/openapi.yaml`（main 0.7.0；本 change 0.8.0）。
- Impact 要点：扩展 `user-profiles`（复用 main 端点）；`trip-companions` / `trip-experiences` 只读消费；`trip-plans` 仅展示触点、不新增 delta；种子数据（V11）会改变迁移测试与 E2E 身份门断言。
- DoR / A0：Base 8 全过，BLOCKER = 0；deep-dive ⑨–⑫ 见 `requirement-workspace/deep-dive.md`「Deep-dive 增补 — REQ-009」。

## 规模与交付

- **Effort：** S–M。契约（资料响应增量）→ 后端统计聚合（同时覆盖演示账户与注册账户）→ 前端弹窗与双入口 → 种子数据与测试。
- **阶段：** 单阶段，无上游新依赖；可独立演示（卡片入口 → 弹窗 → 关闭）。
- **共享文件风险：** `TripCard.tsx`、`TripDetailPage.tsx`、`styles.css`、`profile.spec.ts` 与 main 的 S18 实现重叠，已按「复用 main 接口」收敛（见 design D1/D2/D5/D7）。

## Spec ID

`add-user-profiles`，业务增量规格见 `specs/user-profiles/spec.md`（Given/When/Then 纯业务语言）。
