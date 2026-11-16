# ATDD 设计 — refine-my-trips

- **Change：** `refine-my-trips`（REQ-013 / S11 我的旅行）
- **输入：** Delta Spec 11 条场景、`design.md` D1–D10、现有 `e2e/tests/companions.spec.ts` / `experiences.spec.ts`
- **日期：** 2026-11-16

## 1. 场景 → 验收映射

| id | Delta 场景 | 验收层 | 断言要点 |
|---|---|---|---|
| E1 | 分区展示我的旅行 | E2E + 单测 | 四段 radio 可见；每段标签带条数；默认「我发布的」选中 |
| E2 | 分组内容与计数一致 | 单测 + 后端 | `groupCounts` 与响应条数一致；后端分组不变 |
| E3 | 行内动作按分组提供 | 单测 + E2E | `actionsFor` 四组 × 状态组合；页面按钮可见性 |
| E4 | 待处理申请提醒 | 后端 + E2E | `pending_applications` 内容；「去处理」href；行内「处理申请 · N」 |
| E5 | 无待处理申请 | 单测 + E2E | 副标题「目前没有待处理的申请。」；无「去处理」按钮 |
| E6 | 重新可见时同步状态 | E2E | 改变数据后 `dispatchEvent(focus)` → 列表与计数更新 |
| E7 | 页内动作后同步状态 | E2E | 撤回 / 退出 / 结束后列表更新，无需 reload |
| E8 | 分组空态给出主操作 | E2E | 空分组显示标题与 CTA，切回非空分组正常 |
| E9 | 窄屏动作不遮挡 | E2E（390 视口） | 行内动作 `flex-wrap` 换行；`boundingBox` 不重叠 |
| E10 | 安全提示常驻 | 既有回归 | `companions.spec.ts` 的安全提示与举报断言保持全绿 |
| E11 | 提交举报并收到回执 | 既有回归 | 回执文案不变 |

## 2. 单元测试（vitest，node 环境）

| id | 文件 | 用例 |
|---|---|---|
| U1 | `mine/mineTrips.test.ts` | `groupCounts`：空数据全 0；四组各 2 条时返回 2/2/2/2 |
| U2 | 同上 | `pendingTargetTripId`：`[]` → null；`[{3,2},{5,1}]` → 3；`pendingCountFor` 未命中 → 0 |
| U3 | 同上 | `actionsFor`：published+ongoing → 含 `applications`/`complete`/`view`；applied+pending → 含 `cancel`；applied+accepted+completed → 含 `share` 不含 `chat`；matched → 含 `chat`/`leave`；completed → 仅 `share`/`view` |
| U4 | 同上 | `formatDateRange` / `dayLabel`：同月、跨月、空日期（`日期待定`） |
| U5 | `trips/coverTone.test.ts` | 同一目的地在不同调用返回同色；已知目的地固定映射；`COVER_TONES` 五色循环 |

## 3. 后端测试

| id | 文件 | 用例 |
|---|---|---|
| B1 | `MyTripsControllerTest` | 身份 2：`pending_applications` 为数组、元素含 `trip_id`/`count`、求和等于 `pending_application_count` |
| B2 | 同上 | 身份 1（无待处理）：`pending_applications` 为空数组（`jsonPath("$.pending_applications").isArray()` + `isEmpty()`） |
| B3 | 同上 | 接受申请后：对应行程计数减少 / 消失 |
| B4 | `OpenApiTest` | `MyTrips` 含 `pending_applications`，`required` 仍为原 5 项；`PendingApplicationCount` required `trip_id` / `count`，`count` `minimum: 1` |

## 4. E2E（新增 `e2e/tests/mine.spec.ts`）

前置：沿用 `companions.spec.ts` 的 `loginAs` / API fixtures；用 API 造「他人发布 + 已接受」与「已结束」行程，避免依赖种子顺序。

| id | 用例 | 步骤 | 断言 |
|---|---|---|---|
| M1 | 四段与计数 | 进入 `#/mine` | 四个 radio 可见；标签匹配 `/我发布的/` 等；默认选中「我发布的」 |
| M2 | 提醒定位 | 用 API 让用户 2 发布两条行程，第二条有待处理申请；以用户 2 进入 | 副标题含「你有 1 条申请等待处理」；「去处理」跳到第二条行程的 `#/trips/{id}/applications`；行内「处理申请 · 1」href 相同 |
| M3 | 撤回申请 | 用户 1 申请用户 2 的行程后进入「我申请的」 | 「撤回」可见；点击后状态徽标变「已取消」，「撤回」消失 |
| M4 | 退出同行 | 已接受场景进入「已匹配同行」 | 「退出同行」→ 确认 → 行从该组消失（切到已完成仍不存在） |
| M5 | 已完成写体验 | 已完成场景进入「已完成旅行」 | 「发表游后体验」跳到 `#/share/{id}`；返回后按钮为「修改我的体验」 |
| M6 | 重新可见同步 | 停留在 `#/mine`；用 API 接受一条申请；`page.evaluate(() => window.dispatchEvent(new Event('focus')))` | 「已匹配同行」计数 +1，列表出现该行程 |
| M7 | 无待处理提示 | 无待处理身份进入 | 副标题含「目前没有待处理的申请」；「去处理」按钮 count 0 |
| M8 | 窄屏布局 | `viewport 390×844`，进入任一分组 | `.mr-actions` 的 `y` 大于 `.mr-main` 的 `y`；两张 `.mine-row` 的 actions 不重叠 |

## 5. 既有 E2E 变更

| 文件 | 位置 | 变更 |
|---|---|---|
| `e2e/tests/companions.spec.ts` | `await expect(page.getByRole('tab', { name: /我申请的/ })).toBeVisible()` 及其后一行 | `tab` → `radio` |
| `e2e/tests/experiences.spec.ts` | `page.getByRole('tab', { name: /已完成/ }).click()`（两处） | `tab` → `radio` |
| `e2e/tests/experiences.spec.ts` | `.mine-row` 的「发表游后体验」「修改我的体验」 | 保持文案不变，选择器不变 |
| `e2e/tests/profile.spec.ts` | `.mine-profile-card` 断言 | 不变（资料卡保留） |

## 6. 人工走查

| 视口 | 主题 | 检查 |
|---|---|---|
| 1440 | 浅 / 深 | 页头、四段、行式列表一屏 ≥4 条；按钮同列对齐 |
| 768 | 浅 / 深 | 分段不裁切；行内动作不换行或整齐换行 |
| 390 | 浅 / 深 | 动作换行到卡片下方；无横向滚动；名字与备注不截断成歧义 |

截图存放：`docs/preview/refine-my-trips/`（P4 产出，不纳入构建）。

## 7. 完成定义（DoD）

- U1–U5、B1–B4 全绿；M1–M8 全绿；`companions` / `experiences` / `profile` 三套回归全绿。
- `npm run build`、`.\mvnw.cmd -B -ntp test`、`openspec validate refine-my-trips --strict` 全通过。
- 人工走查 6 张截图，无溢出 / 重叠 / 对比度问题。
- 未新增硬编码色值；文案全部出自 `tripMessages`。