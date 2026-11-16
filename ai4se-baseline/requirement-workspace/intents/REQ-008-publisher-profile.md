# Intent capture — 浏览者查看发布者公开资料

- **捕获日期：** 2026-11-16
- **来源：** 用户当次会话（SDD P1 输入）
- **候选编号：** REQ-008（占位，待 registry 确认）
- **状态：** Discovery — Go（light intake）

## 原始意图（用户原话要点）

作为浏览者，我希望在申请前了解对方是谁、喜欢怎么玩，以便判断是否适合同行。

- 入口：从行程卡片或详情页点击发布者，在弹窗中展示个人资料，按 prototype 中的方式展示。
- 不做：不展示电话、证件、精确住址、学校门牌等字段，保护用户隐私。
- 不做：prototype 中的「举报这位用户」本次不做，未来迭代再评估。

## 证据锚点

| 证据 | 路径 | 说明 |
|---|---|---|
| 原型资料弹窗 S02 | `docs/prototype/prototype.html` + `ui.js` `profileModal()` | 展示头像、昵称、年级/专业、加入时间、简介、兴趣标签、共同兴趣、四项统计、隐私说明；含举报按钮（本次排除） |
| 原型行程详情发起人卡片 | `ui.js` `hostPanel` | 点击发起人打开资料弹窗 |
| 现有用户字段 | `RouteME/backend/.../V3__create_demo_users.sql` | `nickname`、`avatar_initial`、`school`（值形如「大三 · 视觉传达」）、`bio`、`interests`、`created_at` |
| 现有资料接口 | `RouteME/backend/.../DemoUserController.java` | 仅 `GET /api/users` 列表，无单用户资料与统计 |
| 现有行程展示 | `RouteME/frontend/src/trips/TripCard.tsx`、`TripDetailPage.tsx` | 卡片展示发布者昵称/头像；详情页展示发布者信息，均未接入资料弹窗 |
| 隐私红线 | `openspec/specs/trip-companions/spec.md`、`docs/knowledge/rules/security/rules.md` (`pii-scrubbing`) | 不公开电话、证件、精确住址 |

## 本次明确排除

1. 举报用户功能（含原型弹窗底部「举报这位用户」按钮、举报入口占位）。
2. 电话、证件、精确住址、学校门牌等隐私字段。
3. 聊天页「资料」按钮入口（本次入口仅行程卡片与详情页）。
