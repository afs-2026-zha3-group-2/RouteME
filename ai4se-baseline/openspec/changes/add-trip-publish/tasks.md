# 任务：add-trip-publish

- **依据：** [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md)、[`design.md`](design.md)
- **约束：** 一条任务只落一层；不改数据模型与端点形状；每条任务给出验证命令与覆盖场景。

## 任务清单

### T1 [contract] 发布契约边界核对

- [x] 核对 `openapi.yaml` 的 `TripCreateRequest`：`required` 为 title / destination / start_date / end_date / stops / capacity，`stops.minItems = 2`，`capacity` 为 `2–12` 整数，`tags.maxItems = 5`，预算 `minimum: 0`。
- [x] 确认本次无字段变化，`info.version` 保持 `0.6.0`，不升版本。
- **修订（2026-11-16，REQ-007 协作）：** 目的地字段改为 `destination_code`，契约升 0.7.0；本任务记录保留为修订前状态。

**验证：** `cd RouteME; npx @redocly/cli lint openapi.yaml` → valid，0 error / 7 既有 warning
**覆盖：** 后端独立校验发布约束、计划人数越界时拒绝发布

### T2 [backend] 发布校验与发布者归属断言

- [x] 核对 `TripPlan.create` 的校验顺序：标题 → 目的地 → 日期必填 → 日期顺序 → 途经点数量 → 人数区间 → 预算非负与区间 → 标签数量 → 集合区域与补充说明长度。
- [x] `TripControllerTest` 断言：必填缺失、结束早于出发、途经点不足、人数为 1、预算倒置均返回 400 `INVALID_INPUT`；合法请求返回 201、`publisher.id` 为当前身份、`joined_count = 1`。
- [x] `TripPlanServicePersistenceTest` 断言重启后仍能读回同一条行程。

**验证：** `cd RouteME/backend; .\mvnw.cmd -B -o test` → 152 项通过（含 `TripControllerTest` 23 项、`TripPlanServicePersistenceTest`、`TripPlanServiceTest`）
**覆盖：** 后端独立校验发布约束、发布者身份取自当前身份、发布的数据在重启后仍在

### T3 [frontend] 字段级错误与提交闸门

- [x] `tripForm.test.ts` 断言空表单一次性报告标题、目的地、出发日期、结束日期、途经点与人数六类错误，且字段之间互不覆盖。
- [x] `tripForm.test.ts` 断言人数非整数（`2.5`）被拒绝。
- [x] 核对提交路径：`validateTripForm` 返回非空即 `return`，不发创建请求。

**验证：** `cd RouteME/frontend; npm test` → 67 项通过

### T4 [frontend] 选点控件的可访问名称

- [x] `PlacePicker` 增加可选 `ariaLabel` / `inputId` / `invalid`，未传时保留 `搜索地图地点`。
- [x] 发布页三个选点实例分别命名为「目的地」「途经点」「集合地点」；`Field` 改为 `<label htmlFor>` 并把错误文案绑定到控件的 `aria-describedby`。

**验证：** `cd RouteME/frontend; npm run build` → tsc 无错误、构建成功

### T5 [e2e] 发布故事端到端用例

- [x] 用语义选择器填写目的地与途经点：`getByLabel('目的地')`、`getByLabel('途经点')`，输入后回车由地名库解析。
- [x] 兴趣标签改用按钮语义点选，不再使用 `checkbox`。
- [x] 断言：提交后地址为 `#/trips/{id}`、详情标题为填写值、页面显示「这是你发布的行程」。
- [x] 断言：回到首页按标题搜索能命中该行程，状态为「招募中」。
- **修订（2026-11-16）：** 该断言改为“默认列表/按目的地筛选可见”；目的地控件改 Cascader。
- [x] 新增用例：空表单提交时五个必填控件均为 `aria-invalid="true"` 且各自显示字段级错误文案，地址仍停在 `#/trips/new`。

**验证：** `cd RouteME/e2e; npx playwright test tests/trips.spec.ts -g "publishes a trip|blocks publishing"` → 2 项通过

### T6 [docs] 验证报告

- [x] 在 `docs/ai4se-plugins/20261116-100500-local-verify-report.md` 记录真实命令与输出摘要、Red 证据与 Green 结果，并登记其它故事遗留的 e2e 测试债。
- [ ] 归档时写 `summary.md`：change-id、PR 链接、契约版本、遗留项。

**验证：** 人工核对报告中的命令可在本机复现

## 目的地修订（REQ-007 协作，已完成）

- [x] 发布页目的地从 `PlacePicker` 改省市级联 Cascader；请求改 `destination_code`；途经点/集合地点保留 `PlacePicker`。
- [x] `TripPlan.create` / `TripController` 目的地校验改为二级代码；非法代码 400（省级 `440000`、未知 `999999`、缺失三种情况各有断言）。
- [x] `trips.spec.ts` 发布用例目的地改用 Cascader 语义定位（`.ant-cascader-menu-item`）；详情页断言目的地为「珠海」。
- [x] `openapi.yaml` 目的地字段改 `destination_code`，契约 0.7.0；`OpenApiTest` 同步（版本与必填字段）。
- [x] 回归：`.\mvnw.cmd -B -o clean test`（156 通过）、`npm test`（75 通过）、`npm run build`、发布 e2e（2 通过）。

**实现边界（需在归档前复核）：** 数据底座（V10、全国省市字典、响应中的 `destination_code` / `province_*`）仍归 `add-destination-area-filters`。本 change 暂时携带一份**最小字典切片**（广东 14 城 + 香港 / 澳门二级区），后端 `AreaConstant` 与前端 `areas/areaCatalog.ts` 同步；该 change 落地时应把两处切片替换为完整字典，并让 `trip_plans` 持久化代码。

**边界：** 本 change 不归档；归档顺序为 `add-destination-area-filters` → 本 change；G1 需在目的地修订完成后重评（已重评，见 `g1-decision.md`）。