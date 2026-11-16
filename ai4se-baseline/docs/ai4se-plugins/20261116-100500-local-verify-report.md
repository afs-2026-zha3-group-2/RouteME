# 验证报告：add-trip-publish（S06 发布旅行计划）

- **变更：** `add-trip-publish`｜ **分支：** `feature/add-trip-publish`｜ **契约版本：** `openapi.yaml` 保持 `0.6.0`（无字段变化）
- **时间：** 2026-11-16 10:00（本机 Windows，Node 24 / JDK 由 wrapper 提供）
- **范围：** `trip-plans` 增量规格「发布可被他人理解的旅行计划」

## 1. Red：先看到失败

发布故事的端到端用例仍在用「文本框 + antd 下拉/复选」的旧选择器，与 `add-offline-map-place-picker` 之后的选点控件不一致，且表单标签与控件没有关联（`<span class="form-label">` 无 `htmlFor`），因此可访问名称不存在。

```text
$ cd RouteME/e2e; npx playwright test tests/trips.spec.ts -g "publishes a trip"
  x  1 tests\trips.spec.ts:61:1 › publishes a trip and finds it from the home search (30.1s)
    Error: locator.fill: Test timeout of 30000ms exceeded.
    Call log:
      - waiting for getByLabel('标题')
      66 |   await page.getByLabel('标题').fill(title);
```

失败原因与预期业务一致：表单缺少字段级可访问名称，发布故事无法被端到端验证。

## 2. Green：最小实现

| 改动 | 落点 | 说明 |
|---|---|---|
| 字段标签与控件关联 | `frontend/src/trips/TripCreatePage.tsx` | `Field` 改为 `<label htmlFor>`，控件加 `id`；错误文案带 `${id}-error`，控件用 `aria-invalid` + `aria-describedby` 指向它 |
| 选点控件可命名 | `frontend/src/map/PlacePicker.tsx` | 新增可选 `ariaLabel` / `inputId` / `invalid`；未传时保留原 `搜索地图地点` |
| 三个选点实例分别命名 | `TripCreatePage.tsx` | 目的地 / 途经点 / 集合地点 |
| 兴趣标签成组 | `TripCreatePage.tsx` | 标签容器加 `role="group"` 与 `aria-label` |
| 全量必填错误断言 | `frontend/src/trips/tripForm.test.ts` | 一次提交同时报告 title / destination / startDate / endDate / stops / capacity |
| 人数整数断言 | `tripForm.test.ts` | `capacity = 2.5` 被拒绝 |
| 端到端用例对齐新控件 | `e2e/tests/trips.spec.ts` | 语义定位（`getByLabel`、listbox、标签按钮）；新增「字段级错误阻断提交」用例；断言跳转地址、发布者归属与首页可检索 |

## 3. 验证命令与结果

```text
$ cd RouteME/backend; .\mvnw.cmd -B -o test
[INFO] Tests run: 152, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS   (28.2 s)

$ cd RouteME/frontend; npm test
 Test Files  9 passed (9)
      Tests  67 passed (67)

$ cd RouteME/frontend; npm run build
✓ 1520 modules transformed.
✓ built in 1.11s
（仅剩 chunk 体积提示，非错误）

$ cd RouteME; npx @redocly/cli lint openapi.yaml
Woohoo! Your API description is valid. 🎉
You have 7 warnings.（0 error；告警来自既有的 experiences 示例，非本变更引入）

$ cd RouteME/e2e; npx playwright test tests/trips.spec.ts -g "publishes a trip|blocks publishing"
  ok 1 tests\trips.spec.ts:68:1 › publishes a trip and finds it from the home search (3.7s)
  ok 2 tests\trips.spec.ts:93:1 › blocks publishing and flags every missing required field (1.8s)
  2 passed (7.0s)
```

## 4. 验收场景对照

| 场景 | 证据 |
|---|---|
| 填写完整必填项后成功发布 | e2e `publishes a trip…`；`TripControllerTest#in_validRequest_out_createdRecruitingTrip` |
| 选填项可留空 | `TripPlanServiceTest`、`tripForm.test.ts` 的 `maps blank optionals to null` |
| 必填项缺失时逐项给出字段级错误 | e2e `blocks publishing and flags every missing required field`；`tripForm.test.ts` 的 `reports every missing required field at once` |
| 日期不合法时拒绝发布 | `tripForm.test.ts`、`TripControllerTest#in_endBeforeStart_out_invalidInput` |
| 途经点不足两个时拒绝发布 | `TripControllerTest#in_singleStop_out_invalidInput` |
| 计划人数越界时拒绝发布 | `tripForm.test.ts`（1 / 13 / 2.5）、`TripControllerTest#in_capacityOutOfRange_out_invalidInput`（capacity = 1） |
| 后端独立校验发布约束 | `TripControllerTest` 六个拒绝用例，响应均为 400 `INVALID_INPUT` |
| 发布成功后跳转详情页 | e2e 断言 `toHaveURL(/#\/trips\/\d+$/)` 与详情标题 |
| 首页立即可检索新发布的行程 | e2e 在首页按标题搜索命中该卡片 |
| 发布者身份取自当前身份 | e2e 断言「这是你发布的行程」；`TripControllerTest` 断言 `publisher.id` 与 `participants[0].id` |
| 发布的数据在重启后仍在 | `TripPlanServicePersistenceTest`（SQLite 文件库重开连接后读回） |

## 5. 未通过项（既有，属其它故事）

完整 e2e 套件在本变更前后同为 7 通过 / 5 失败。失败用例的断言对象是其它故事已改动的界面，与本变更无交集：

| 用例 | 失败点 | 归属 |
|---|---|---|
| `companions.spec.ts` 匹配原因与默认排序 | 找不到标题「旅行灵感」 | S03 / S07 |
| `companions.spec.ts` 申请→接受→聊天→举报→退出 | `.ant-popconfirm .ant-btn-primary` 选择器失效 | S12 / S13 |
| `experiences.spec.ts` 旅行体验视图 | `.ant-segmented-item` 选择器失效 | S03 / S16 |
| `experiences.spec.ts` 参考发布 | 仍在用旧「途经点（每行一个，至少两个）」文本框 | S17 |
| `trips.spec.ts` 身份门与默认列表 | 身份门标题已改为「先有一条想走的路，再遇到同路的人。」 | S01 |
| `trips.spec.ts` 按兴趣筛选 | 首页筛选改用按钮而非 `checkbox` | S04 |

处置：不并入本变更（一个 change 只改一个 capability）。已登记为后续故事的测试债，S07 change 的 `tasks.md` 已包含对应重写任务。

## 6. 结论

S06 的十一条验收场景均有可执行断言并通过；发布链路的字段级错误、跳转、可检索与发布者归属已被钉住。变更未引入新依赖、未改数据模型、未改契约版本。