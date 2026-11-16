# ATDD design — add-trip-publish

- **Change：** `add-trip-publish`（`trip-plans` MODIFIED，S06）
- **Inputs：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)（11 场景）、[`design.md`](design.md)、[`tasks.md`](tasks.md)

## 1. 分层策略

| 层 | 职责 | 本 change 的落点 |
|---|---|---|
| 契约 | 字段与边界先行 | `RouteME/openapi.yaml` `TripCreateRequest`（核对，无改动）+ `OpenApiTest` |
| 领域 | 校验规则与状态推导 | `routeme.pojo.TripPlan#create` + `TripPlanServiceTest` / `TripPlanServicePersistenceTest` |
| 接口 | HTTP 状态码、错误码、身份归属 | `TripControllerTest`（6 个拒绝用例 + 1 个成功用例） |
| 前端纯函数 | 表单校验与请求载荷 | `frontend/src/trips/tripForm.test.ts` |
| 端到端 | 真实浏览器中的完整故事 | `e2e/tests/trips.spec.ts`（发布成功、字段级阻断） |

规则：场景先落到能失败的最低层；端到端只覆盖「跨页跳转 + 持久化 + 可访问名称」这类无法在低层观察的行为。

## 2. 场景 → 测试映射

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 1 | 填写完整必填项后成功发布 | 接口 + 端到端 | `TripControllerTest#in_validRequest_out_createdRecruitingTrip`；`trips.spec.ts › publishes a trip and finds it from the home search` |
| 2 | 选填项可留空 | 前端 + 领域 | `tripForm.test.ts › maps blank optionals to null`；`TripPlanServiceTest` |
| 3 | 必填项缺失时逐项给出字段级错误 | 前端 + 端到端 | `tripForm.test.ts › reports every missing required field at once`；`trips.spec.ts › blocks publishing and flags every missing required field` |
| 4 | 日期不合法时拒绝发布 | 前端 + 接口 | `tripForm.test.ts › rejects an end date before the start date`；`TripControllerTest#in_endBeforeStart_out_invalidInput` |
| 5 | 途经点不足两个时拒绝发布 | 前端 + 接口 | `tripForm.test.ts › requires at least two stops`；`TripControllerTest#in_singleStop_out_invalidInput` |
| 6 | 计划人数越界时拒绝发布 | 前端 + 接口 | `tripForm.test.ts › bounds the capacity to the contract range`；`TripControllerTest#in_capacityOutOfRange_out_invalidInput` |
| 7 | 后端独立校验发布约束 | 接口 | `TripControllerTest` 六个拒绝用例（含 `capacity = 1`、预算倒置、标题空白） |
| 8 | 发布成功后跳转详情页 | 端到端 | 同一发布用例断言 `toHaveURL(/#\/trips\/\d+$/)` |
| 9 | 首页立即可检索新发布的行程 | 端到端 | 同一用例回到首页按标题搜索 |
| 10 | 发布者身份取自当前身份 | 接口 + 端到端 | `TripControllerTest` 断言 `publisher.id` / `participants[0].id`；端到端断言「这是你发布的行程」 |
| 11 | 发布的数据在重启后仍在 | 领域 | `TripPlanServicePersistenceTest`（重开 SQLite 连接读回） |

## 3. 可访问名称的先行设计

「逐项字段级错误」要在浏览器里可观察，必须先让字段可被命名：

- `Field` 渲染 `<label htmlFor>`，控件用同一 `id`；
- 错误文案 `id = <fieldId>-error`，控件 `aria-invalid="true"` + `aria-describedby` 指向它；
- `PlacePicker` 增加 `ariaLabel` / `inputId` / `invalid`，三个实例分别命名「目的地」「途经点」「集合地点」；
- 兴趣标签容器 `role="group"` + `aria-label`。

这些是端到端断言的前提，也是无障碍要求，属 P4 的最小实现，不另立 change。

## 4. Red → Green 计划

| 步骤 | 预期观察 |
|---|---|
| Red | `npx playwright test tests/trips.spec.ts -g "publishes a trip"` 在 `getByLabel('标题')` 超时：标签与控件未关联 |
| Green | 完成 §3 的命名与错误绑定，用例转为通过 |
| 回归 | 后端 `clean test`、前端 `npm test` / `npm run build`、契约 lint |

## 5. 覆盖缺口说明

- 页面级视觉与交互细节不在本 change 断言（属 `design-system` 能力的既有要求）。
- 未新增 NFR 用例；MVP 无 SLA，沿用 `add-trip-plans` 的 deferred 记录。