# Intent capture — S15 结束行程（旅行中 → 已结束）

- **捕获日期：** 2026-11-16
- **来源：** 用户当次会话（SDD P1 输入，含用户故事、10 条业务规则与 12 条验收标准）
- **候选编号：** REQ-011（占位，待 registry 确认）
- **状态：** Discovery — Go（light intake）

## 原始意图（用户原话要点）

作为行程发起人，我希望在旅行结束后将行程标记为已结束，以便正式结束本次同行活动，并让同行成员进入旅行体验分享环节。

- 优先级 P0 ｜ 迭代 3（第 6–7 天）｜ 故事点 1 ｜ 落点页面：我的旅行

### 业务规则

1. 仅行程发布者可以执行「结束行程」。
2. 仅 ONGOING（旅行中）状态的行程可以被结束。
3. RECRUITING（招募中）和 FULL（已满员）均表示旅行尚未开始，不允许执行「结束行程」。
4. 当到达行程开始日期后，行程由 RECRUITING 或 FULL 自动进入 ONGOING（旅行中）。
5. 当距离行程结束不足 3 小时后，系统发出提醒告知行程即将结束。
6. 到达计划设定的结束日期后，行程自动进入 COMPLETED（已结束）。
7. 行程发布者点击「结束行程」后，系统需进行二次确认。
8. 确认结束后，行程状态由 ONGOING 转为 COMPLETED（已结束）。
9. COMPLETED 为终态，MVP 中不支持恢复为其他状态。
10. 行程结束后保留原行程信息、同行成员及历史聊天记录，不删除历史数据。

### 验收标准

1. 非行程发布者不显示「结束行程」操作。
2. RECRUITING、FULL、COMPLETED 状态下不显示「结束行程」操作。
3. ONGOING 状态下，行程发布者可以看到「结束行程」操作。
4. 点击「结束行程」后显示二次确认弹窗。
5. 用户取消确认时，行程状态保持 ONGOING，不产生其他状态变化。
6. 用户确认后，行程状态由 ONGOING 变为 COMPLETED。
7. COMPLETED 后关闭所有同行申请入口，不允许提交、接受或拒绝新的同行申请。
8. 已 ACCEPTED 的同行者继续保留在同行者列表中。
9. 原有聊天记录继续保留；聊天进入只读状态，并提示「该行程已结束」。
10. 行程发布者和 ACCEPTED 的同行者出现「发表旅行体验」入口。
11. REJECTED、CANCELLED 或未参与该行程的用户不能通过该行程进入「发表旅行体验」。
12. COMPLETED 状态不可再次执行「结束行程」，MVP 中不支持撤销结束。

## 证据锚点（现状核对）

| 证据 | 路径 | 说明 |
|---|---|---|
| 状态枚举 | `RouteME/backend/src/main/java/routeme/enums/TripStatusEnum.java` | 只有 RECRUITING / FULL / COMPLETED，**无 ONGOING** |
| 状态推导 | `RouteME/backend/src/main/java/routeme/pojo/TripPlan.java` | `status()` 仅看 `completedAt` 与 `joinedCount`，不看日期 |
| 结束行程服务 | `RouteME/backend/src/main/java/routeme/service/impl/TripPlanServiceImpl.java` | 仅校验「非 COMPLETED」即可结束，RECRUITING / FULL 也可被结束 |
| 详情页入口 | `RouteME/frontend/src/trips/TripDetailPage.tsx` | `isPublisher && !isCompleted` 即展示「结束行程」+ 二次确认 Modal |
| 我的旅行 | `RouteME/frontend/src/mine/MyTripsPage.tsx` | 四条分组（发布 / 申请 / 已匹配 / 已完成），**无结束行程入口** |
| 我的旅行聚合 | `RouteME/backend/src/main/java/routeme/service/impl/MyTripsServiceImpl.java` | 已匹配与已完成分组按 `completedAt` 判断，不识别到期自动完成 |
| 未结束列表过滤 | `RouteME/backend/src/main/resources/mapper/TripPlanMapper.xml` | `WHERE completed_at IS NULL`，日期已过的行程仍会出现在首页 |
| 聊天只读 | `RouteME/backend/src/main/java/routeme/service/impl/ChatServiceImpl.java`、`RouteME/frontend/src/chat/ChatPage.tsx` | 已实现 `CHAT_READ_ONLY` 与只读提示 |
| 体验分享资格 | `RouteME/backend/src/main/java/routeme/service/impl/ExperienceServiceImpl.java` | 已校验「COMPLETED + 发布者或已接受同行者」 |
| 申请处理 | `RouteME/backend/src/main/java/routeme/service/impl/ApplicationServiceImpl.java` | `decide()` 只校验 PENDING，未校验行程是否已结束（结束后仍可拒绝） |
| 契约状态枚举 | `RouteME/openapi.yaml`（TripSummary.status） | `enum: [recruiting, full, completed]`，无 `ongoing` |
| Living Spec | `openspec/specs/trip-plans/spec.md`「发布者结束自己的行程」 | 只规定发布者可结束未结束行程，无 ONGOING / 自动流转 / 提醒 |
| 原型 | `docs/prototype/stories.html` S15 | 故事来源 |

## 现状差距（P1 需收敛）

1. 缺 ONGOING 状态：状态模型与契约都只有三态。
2. 缺日期驱动的自动流转：开始日期 → ONGOING、结束日期 → COMPLETED。
3. 缺「距离结束不足 3 小时」提醒。
4. 结束权限过宽：RECRUITING / FULL 也能被发布者结束（违反业务规则 2/3）。
5. 落点页面缺失：故事落点「我的旅行」没有结束入口。
6. COMPLETED 后仍可拒绝既有申请；「已完成」分组与统计只认 `completed_at`，不认自动完成。
7. 首页「未结束」列表未排除已到达结束日期的行程。

## 本次明确排除（待 OQ 确认后固化）

- 恢复 / 撤销结束（COMPLETED 终态，MVP 不做）。
- 到期自动完成的定时任务与推送渠道（若采用应用内提醒，则无 push / 邮件 / 短信）。
- 行程取消能力（当前能力无「已取消」行程状态）。
- 结束后的数据删除或归档清理。
