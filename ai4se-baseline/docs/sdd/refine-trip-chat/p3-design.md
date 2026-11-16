# P3 设计与任务记录 — refine-trip-chat

- **Change：** `refine-trip-chat`｜ **能力：** `trip-companions`（MODIFIED）+ `trip-plans`（MODIFIED）｜ **需求：** REQ-013
- **阶段：** P3（Design & decompose DoV）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

先按 `@rule:prototype-ui-alignment` 改原型并验证，再把 6 Requirement / 43 Scenario 落成可执行的设计与任务：ATDD 分层、技术设计（契约 / 迁移 / 服务 / 前端）、任务清单与可执行验证命令。

## 2. 阶段产出

| 工件 | 路径 | 结果 |
|---|---|---|
| 原型改动 | [`docs/prototype/data.js`](../../prototype/data.js)、`store.js`、`ui.js`、`main.js` | 集合时间四处展示 + 发布者编辑弹窗；`node --check` 全通过 |
| 原型预览证据 | [`docs/preview/trip-departure-info-after-edit.png`](../../preview/trip-departure-info-after-edit.png) | 浏览器验证：保存成功、三处同步更新、控制台无 error |
| ATDD 设计 | [`atdd-design.md`](../../../openspec/changes/refine-trip-chat/atdd-design.md) | A1–A10 / UT-1–UT-7 / E2E-1–E2E-13；25/25 场景映射 |
| 技术设计 | [`design.md`](../../../openspec/changes/refine-trip-chat/design.md) | D1–D15 |
| 任务清单 | [`tasks.md`](../../../openspec/changes/refine-trip-chat/tasks.md) | T1–T12 + 依赖顺序 + 对齐自检 7 项 |
| 设计评审 | [`20261116-refine-trip-chat-design-review.md`](../../reviews/20261116-refine-trip-chat-design-review.md) | Pass；WARNING 2（已修复）/ SUGGESTION 4 |
| 任务评审 | [`20261116-refine-trip-chat-tasks-review.md`](../../reviews/20261116-refine-trip-chat-tasks-review.md) | Pass；WARNING 2（已修复）/ SUGGESTION 2 |
| Spec 重评 | [`20261116-refine-trip-chat-spec-review-2.md`](../../reviews/20261116-refine-trip-chat-spec-review-2.md) | Pass；BLOCKER 0 / SUGGESTION 2（错误码订正后） |
| 质量报告 | [`20261116-154424-quality-checklist-report.md`](../../ai4se-plugins/20261116-154424-quality-checklist-report.md) | P3 全 Pass |

## 3. 原型先行记录

| 文件 | 改动 |
|---|---|
| `data.js` | `t_zhuhai_2`、`t_guangzhou_1` 补 `meetingTime` 演示值 |
| `store.js` | `createTrip` / `updateTrip` 存取 `meetingTime`；`validateTrip` 校验长度（100）与「日期部分不晚于结束日期」；新增 `updateMeetingInfo` 并导出 |
| `ui.js` | `fmtMeeting`；详情「集合时间」fact + 未填提示 + 发布者「编辑集合信息」；发布表单集合时间 + `maxlength=100`；我的旅行集合备注；聊天安全条集合时间；新增 `meetingModal` |
| `main.js` | `overlay` 增 `meeting`；`edit-meeting` / `submit-meeting` 动作；`blankDraft` / `draftFromTrip` 增 `meetingTime` |

- 验证过程发现并修复：`Store.updateMeetingInfo` 未加入导出对象，导致「不是函数」报错；复验后保存成功。
- 范围外发现：详情页同行进度条 `.meter` 用 `<span>` 导致大色块，属既有缺陷，记录不修（D14）。

## 4. 设计要点

| 主题 | 结论 |
|---|---|
| 契约 | 升 0.9.0：`meeting_time`（本地墙上时间，`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$`）、`ApplicationStatus.left`、`PUT /trips/{tripId}/meeting`（两字段整体替换）；同步 `OpenApiTest` |
| 迁移 | `V13__add_meeting_time.sql`：`ALTER TABLE trip_plans ADD COLUMN meeting_time VARCHAR(16)` |
| 「已退出」 | `ApplicationStatusEnum.LEFT`；DB 存 `name()`、API 返回 `wireValue()`；`mine()` / `participants()` / `joined` / `matched` 口径不变；`existsActive` 不拦 `left` |
| 聊天准入 | `requireAccess`：发布者或被申请方，申请状态 `ACCEPTED|LEFT`；含仅 PENDING 一律 403 `CHAT_NOT_ALLOWED` |
| 会话列表 | `chatCounterparts`（可沟通配对）与消息历史合并去重；排序「最后消息倒序 → 无消息末尾 → tripId/otherId 倒序」 |
| 前端聊天页 | 两栏 288px；≤980px 单列横滚；≤390px 气泡 88%；3 秒轮询；Enter 发送；头部四动作，退出按钮用 `participants` 判定 |
| 详情与编辑 | 集合时间一行；发布者且未结束显示「编辑集合信息」→ antd Modal → `PUT` → 刷新 |
| 我的旅行 | 仅「已匹配」加「集合：… · … · 同行 N 人」；`applicationLabel` 统一到 `trips/applicationStatus.ts` |
| 校验 | `routeme/pojo/TripMeetingRules` 服务端权威；前端同规则做体验校验 |
| 错误码 | 400 `INVALID_INPUT` / 403 `FORBIDDEN`、`CHAT_NOT_ALLOWED` / 409 `TRIP_NOT_OPEN`、`CHAT_READ_ONLY`；不引入 422 |

## 5. G1 条件在 P3 的收口

| G1 条件 | P3 处理 |
|---|---|
| 统一「已退出」状态 | D3 / D11 + T3 / T7 / T10 |
| `SafetyNote` 与聊天安全条不叠加 | D6 |
| 原型先行 | 已完成（§3） |
| 契约字段语义与端点示例 | D1（示例按 D13 的 400/403/409） |
| 会话列表补齐单测 | D5 + A1 + T5 |
| E2E 四项 | E2E-3 / 4 / 5 / 8 / 13 |
| `left` 不改既有口径 | D3 五个消费点 |
| SA 追认双 capability / 冲突裁决 | 转 P5 / G3 前 |
| 归档合并场景数核对 | 转 P5 `living-merge` |

## 6. 评审修复记录

| 来源 | 问题 | 修复 |
|---|---|---|
| design-review F-1（WARNING） | 「退出同行」可见性缺数据来源 | D6 改用 `TripDetail.participants` 判定；UT-3 补 LEFT 断言 |
| design-review F-6（WARNING） | D11 把 `applicationLabel` 归到 `tripMessages` | D11 改为新增 `trips/applicationStatus.ts`，替换三处副本 |
| design-review F-2/F-3/F-4 | D5 排序、D12 落点、D3 存储口径 | 已分别补二级排序、包路径与 `withMeetingInfo`、`name()`/`wireValue()` 说明 |
| tasks-review F-1（WARNING） | T10 落点指向 `tripStatus.ts` | 改为三个页面文件 + 引用 T7 |
| tasks-review F-2（WARNING） | T1 的 `lint:api` 不存在、漏 `OpenApiTest` | 改 `mvnw.cmd test -Dtest=OpenApiTest`，补契约断言 |
| spec-review-2 | 错误码口径 | Delta 4 处 422 → 400/403/409；D13 为唯一口径 |

## 7. 流程偏差（如实记录）

- `tasks.md` 在 design 评审与批准之前写出，偏离 `@rule:artifact-review-gate` 的「每份工件评审后再进入下一步」。
- 影响：任务表只引用 D 编号与既有文件路径，未引入新决策；评审发现的问题已回改。
- 纠正：design 与 tasks 作为一组同时请 AO 批准后才进入 P4；后续 change 严格按「design 评审批准 → 写 tasks」顺序。

## 8. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 批准 `design.md` D1–D15、`tasks.md` T1–T12 与 `spec-review-2.md`；确认评审修复已回写，进入 P4 | 2026-11-16 |

**阶段结论：Pass（AO 已批准，进入 P4）**

## 9. 准入 P4 的条件

- ~~AO 批准 `design.md`、`tasks.md` 与 `spec-review-2.md` 的批准签名。~~ 已完成（2026-11-16）。
- P4 从 T1 起按 D13 口径实现；`OpenApiTest` 与 `F-2` 修复同步落地。
- P4 验证报告记录错误码偏离（`@rule:api-contract` 的 422 措辞）与原型 `.meter` 遗留项。
