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

## 6. 目的地修订（REQ-007 协作）

P2 阶段记录 §8 的修订把目的地改成二级代码，新增两条场景与两组断言：

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 12 | 未选到市不能提交（发布页） | 前端 + 端到端 | `tripForm.test.ts › rejects a destination that is not a city-level code`；`trips.spec.ts › blocks publishing…`（目的地字段 `aria-invalid`） |
| 13 | 非法或省级代码被后端拒绝 | 接口 | `TripControllerTest#in_provinceCodeOnly_out_invalidInput`、`#in_unknownDestinationCode_out_invalidInput`、`#in_missingDestinationCode_out_invalidInput` |
| 14 | 选到市后按代码生成标准名 | 接口 + 端到端 | `TripControllerTest#in_validRequest_out_createdRecruitingTrip`（`destination = 广州`）；发布 e2e 断言详情页目的地为「珠海」 |

实现要点：

- 目的地控件改为 antd `Cascader`（`changeOnSelect = false`，必须点到第二级），选项来自 `frontend/src/areas/areaCatalog.ts`。
- 表单只保存市级 `destinationCode`；`toCreateRequest` 输出 `destination_code`；参考发布预填时用 `codesForCityName` 反查两级路径。
- 后端 `AreaConstant.cityOf` 负责二级码校验（长度 6、排除 `0000` 结尾的省级码、必须命中字典），名称由 `AreaCity.displayName()` 生成。
- 字典是**最小切片**（广东 14 城 + 香港 / 澳门二级区），`add-destination-area-filters` 落地时替换为全国字典并持久化代码列。

## 7. R2：表单默认值与地图上下文（2026-11-16）

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 15 | 日期默认今天 | 前端纯函数 | `tripForm.test.ts › initial form defaults both dates to today`（本地日期拼接，不走 UTC） |
| 16 | 目的地可点选 | 端到端 | 发布 e2e：点开目的地后断言面板包围盒在视口内，再选「广东省 / 珠海」 |
| 17 | 未选目的地不渲染地图 | 端到端 | 发布 e2e：`[data-testid="place-map"]` 计数为 0，引导文案可见 |
| 18 | 选定后地图聚焦该市 | 端到端 + 前端纯函数 | 发布 e2e：地图存在且 `data-city="珠海"`、点位标签只出现该市地点；`placeCatalog.test.ts › placesInCity` |
| 19 | 分组与间距 | 端到端 | 发布 e2e：三个段标题可见；同组控件宽度差 ≤ 2px |

实现要点：

- `Cascader` 增加 `getPopupContainer`（挂字段容器）与全宽样式，修复面板被算到视口外。
- `initialTripForm()` 用本地日期生成默认起止日期；`emptyTripForm` 仍用于校验用例。
- `PlacePicker` 增加 `showMap` 与 `city`；`PlaceMap` 用 `meet` 保持比例，并按该市点位包围盒缩放，未选目的地时不渲染。
- `placeCatalog` 增加 `placesInCity(city)`；`areaCatalog` 增加 `mapCityForCode(code)`（港澳二级区映射到地名库城市）。
- 表单拆三段并统一间距。

## 8. R3：字典全国化后的返工（2026-11-16）

远端 `a13416c` 把目的地字典换成全国省市后，R2 的 16 城切片与 `Cascader` 被 `AreaCascader` + `area/areaOptions` 取代。

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 20 | 未覆盖城市不渲染地图且提示正确 | 端到端 | 选「北京市 / 市辖区」→ `[data-testid="place-map"]` 计数 0；提示含「暂无离线点位」且不含「先选目的地」 |
| 21 | 代码 → 地名库城市映射 | 前端纯函数 | `areas/gazetteerCity.test.ts`：`440400→珠海`、`810200→香港`、`820100→澳门`、`110100→undefined`、未知码 → `undefined` |
| 22 | 覆盖城市仍显示地图 | 端到端 | 既有发布用例（珠海）保持 `data-city="珠海"` |
| 23 | 重复字典与死代码清理 | 类型检查 + 编译 | `tsc --noEmit`、`mvnw -o test-compile` 通过；`AreaConstant` / `pojo/AreaCity` 无引用 |

实现要点：

- 新增 `areas/gazetteerCity.ts`：`gazetteerCityForCode` 读共享 `area/areaOptions`，只在地名库包含该城市时返回城市名。
- `TripCreatePage` 用 `hasDestination` 区分「未选」与「未覆盖」两种提示；未覆盖时不渲染地图。
- `tripMessages` 新增 `waypointCityUncovered`。
- 删除 `areas/areaCatalog.ts`（含重复省市数据）与 `areaCatalog.test.ts`；删除后端 `constant/AreaConstant`、`pojo/AreaCity` 及 `TripPlanServiceImpl` 两条未使用 import。

## 9. R4/R5：按原型重排 S06/S07（2026-11-16）

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 24 | 发布页双栏、实时预览与发布前提醒同时存在 | 端到端 | `.publish-grid` / `.publish-side` 可见；预览卡显示未填标题占位；「发布前提醒」三条提示可见 |
| 25 | 卡片匹配块圆环内显示分值、理由为纯文本 | 端到端 | `companions.spec`：`.match-ring .ant-progress-indicator` 为数字；`.match-reason` 非空 |
| 26 | 详情匹配面板按原型呈现 | 端到端 | 标题「为什么推荐给你」；`.match-rule` 含「目的地相同 50 分」 |

## 10. R6：日期弹层在减少动态效果下可用（2026-11-16）

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 27 | 开启 `prefers-reduced-motion: reduce` 后点击日期能看到面板并选中 | 端到端 | `trips.spec` 的 `date pickers under reduced motion`：点开发布页「出发日期」→ `.app-date-popup` 可见且在视口内 → 点「今天」关闭并回填；首页「出发不早于」同样可打开 |

## 11. R7：导航风格交互地图（2026-11-16）

| # | 场景 | 测试层 | 用例 |
|---|---|---|---|
| 28 | 未选目的地也能看到地图 | 端到端 | 发布页 `[data-testid="place-map"]` 可见且 `data-city="all"`；选珠海后变为 `data-city="珠海"` |
| 29 | 缩放、全屏与退出 | 端到端 | 点「放大地图」后 `viewBox` 变化；点「全屏查看地图」出现 `.is-fullscreen`，Esc 退出 |
| 30 | 点击空白有候选反馈 | 端到端 | 点击地图空白出现 `.map-callout`，点「加入路线」后 `.place-chip-name` 出现 |