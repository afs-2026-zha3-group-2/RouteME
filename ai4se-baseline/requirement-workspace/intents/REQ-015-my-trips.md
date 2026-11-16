# Intent capture — S11 我的旅行（四组聚合）

- **捕获日期：** 2026-11-16
- **来源：** 用户当次会话（`https://github.com/orgs/afs-2026-zha3-group-2/projects/1/views/1` 的 S11；issue #13）、`docs/prototype/ui.js` `mine()`、`docs/prototype/stories.html` S11
- **候选编号：** REQ-015（占位，待 registry 确认）
- **状态：** Discovery — Go（light intake）

## 原始意图（用户原话要点）

> 帮我把 S11 做了，新开一个 change，请用 SDD 的方法，P0-P5，先不要做 P5，先不要归档 S11，每个阶段提交一次，git push 之前先做 git pull。S11 请参考原型图的布局和样式。

故事原文：作为用户，我希望一屏看到所有旅行相关状态，以便不漏掉待处理事项。

- 优先级 P0 ｜ 迭代 2（第 4–5 天）｜ 故事点 2 ｜ 落点页面：我的旅行页

### 验收标准（原始）

1. 分区展示：我发布的行程、我申请的行程、已匹配的同行、已完成的旅行。
2. 有待处理申请时给出可点击的提醒入口。
3. 与详情页状态保持一致，接受 / 取消后刷新即同步。

### 场景

前置：用户既发布过也申请过 → 操作：进入我的旅行 → 预期：四类数据分区正确且可跳转。

## 证据锚点（现状核对）

| 证据 | 路径 | 说明 |
|---|---|---|
| 聚合接口 | `RouteME/backend/src/main/java/routeme/controller/MyTripsController.java`、`service/impl/MyTripsServiceImpl.java`、`response/MyTripsResponse.java` | `GET /api/me/trips` 返回 published / applied / matched / completed + `pending_application_count`；**无按行程的待处理数** |
| 页面 | `RouteME/frontend/src/mine/MyTripsPage.tsx` | `Typography.Title` 裸标题 + `.mine-profile-card` + antd `Tabs` + `TripCard compact`；行内动作仅「结束行程」/「聊天」/分享 |
| 提醒 | 同上 | `Alert` 的「去处理」固定跳 `data.published[0]` |
| 刷新 | 同上 | 只在挂载时 `reload()`；无 `visibilitychange` / `focus` 重取 |
| 已交付动作 | `Trips/TripDetailPage.tsx`、`api.ts` | `cancelApplication`、`leaveTrip`、`completeTrip`、`loadMyExperiences` 均已存在，聚合页未暴露 |
| 处理申请 | `RouteME/frontend/src/trips/ApplicationsPage.tsx` | 路由 `#/trips/{id}/applications` 可承接提醒与行内入口 |
| 原型 | `docs/prototype/ui.js` `mine()`；`styles.css` `.seg` / `.mine-row` / `.mr-*` | 页面骨架、行式列表、空态与动作列基准 |
| 长期规格 | `openspec/specs/trip-companions/spec.md`「我的旅行聚合与最低安全能力」；`openspec/specs/design-system/spec.md`「我的旅行列表对齐」 | 四分区、提醒、跳转、行对齐的既有约束 |
| 既有测试 | `backend/.../MyTripsControllerTest.java`；`e2e/tests/companions.spec.ts`、`experiences.spec.ts` | 接口分组回归；E2E 依赖 `#/mine` 标题、`role=tab` 与 `.mine-row` |
| 契约 | `RouteME/openapi.yaml` `MyTrips` | `required` 含 5 个既有字段 |

## 现状差距（P1 需收敛）

1. 页面骨架与原型不符：缺 `page-head`（副标题 + 发布按钮）、缺带计数的分段控件、行式列表用行程卡代替 84px 封面行。
2. 待处理提醒不指向具体行程；行内没有「申请 · N」入口。
3. 聚合页缺少已交付动作：撤回申请、退出同行、查看、处理申请、写体验。
4. 页面停留或跨标签页操作后不重新拉取，AC 3 缺确定性保障。
5. AC 无 E2E 证据。

## 本次明确排除

- 编辑 / 删除行程（当前无路由与接口；原型按钮本迭代不落地）。
- 「参考此行程发布」（S17，issue #19，未完成）。
- 行程卡、体验卡、详情页的视觉重做。
- 后端分组规则变更（四组的定义沿用 `MyTripsServiceImpl`）。
- 引入第二套 UI 组件库或自绘分段控件。

## Discovery Decision

**Go（light intake）。** 一句话可表述：「把已交付的四组聚合接口按原型重排为可一屏扫描的行式列表，补齐已交付动作入口，并让待处理提醒定位到具体行程与在页面重新可见时同步状态」。能力归属单一（`trip-companions` MODIFIED），后端只新增一个只读聚合字段，不改状态机、不改分组规则。