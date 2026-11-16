# 验证报告：add-trip-publish 目的地代码化（REQ-007 协作）

- **变更：** `add-trip-publish`（`trip-plans` MODIFIED）｜ **分支：** `feature/add-trip-publish`
- **契约版本：** `openapi.yaml` **0.6.0 → 0.7.0**（`TripCreateRequest.destination` → `destination_code`）
- **时间：** 2026-11-16 11:35（本机 Windows，Node 24 / JDK 21）
- **范围：** P2 §8 修订新增的三条场景（未选到市不能提交、非法/省级代码被拒、代码生成标准名）

## 1. Red：先看到失败

修订前的构建只认 `destination`（名称）。直接按新契约请求时后端返回 400，说明发布链路还没有代码口径：

```text
$ curl POST /api/trips  {"destination_code": "440400", ...}
  → 400 Bad Request（旧构建：destination 为空 → INVALID_INPUT）
```

前端侧对应失败：

```text
$ cd RouteME/frontend; npm run typecheck
  src/trips/tripForm.ts: Property 'destination_code' does not exist on type 'TripCreateRequest'
  （先把断言写好时即失败；随后改类型与表单）
```

端到端侧对应失败：发布用例仍用地图 `PlacePicker` 选择目的地，`getByLabel('目的地')` 命中的是地图搜索框，而不是级联控件。

## 2. Green：最小实现

| 层 | 改动 |
|---|---|
| 契约 | `TripCreateRequest.destination_code`：`required`、`pattern: '^[0-9]{6}$'`；`info.version` 0.7.0；`post /trips` 说明补充「省级/未知代码 400」 |
| 后端 | 新增 `pojo/AreaCity`（含 `displayName()`）与 `constant/AreaConstant`（二级码查表，排除 `0000` 结尾的省级码）；`TripPlanServiceImpl.create` 先解析代码再构造草稿，名称由字典生成 |
| 前端 | 新增 `areas/areaCatalog.ts`（省 → 市 + `cityByCode` / `codesForCityName`）；`tripForm` 改存 `destinationCode` 并按字典校验；`TripCreatePage` 目的地换 antd `Cascader`（`changeOnSelect=false`，必须选到市），保留字段级错误与 `aria-invalid` |
| 参考发布 | 详情页只返回市名，预填时用 `codesForCityName` 反查两级路径 |
| 端到端 | 发布用例改点级联菜单（`.ant-cascader-menu-item`），断言详情页目的地为「珠海」；其余用例的 API 载荷改 `destination_code` |

**字典边界：** 本 change 只携带最小切片（广东 14 城 + 香港 / 澳门二级区），前端与后端各一份；`add-destination-area-filters` 落地时替换为全国字典，并把 `destination_code` 持久化到 `trip_plans`。

## 3. 验证命令与结果

```text
$ cd RouteME/backend; .\mvnw.cmd -B -o clean test
[INFO] Tests run: 156, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
（TripControllerTest 27 项，含 provinceCodeOnly / unknownDestinationCode / missingDestinationCode）

$ cd RouteME/frontend; npm test
 Test Files  9 passed (9)
      Tests  75 passed (75)

$ cd RouteME/frontend; npm run build
✓ built in 977ms（仅 chunk 体积提示）

$ cd RouteME; npx @redocly/cli lint openapi.yaml
Woohoo! Your API description is valid. 🎉
You have 7 warnings.（0 error，与修订前同为既有告警）

$ cd RouteME/e2e; npx playwright test tests/trips.spec.ts -g "publishes a trip|blocks publishing"
  ok 1 › publishes a trip and finds it from the home search (5.0s)
  ok 2 › blocks publishing and flags every missing required field (1.9s)
  2 passed (8.6s)
```

## 4. 场景对照

| 场景 | 证据 |
|---|---|
| 未选到市不能提交 | `tripForm.test.ts › rejects a destination that is not a city-level code`（空 / `440000` / `999999`）；e2e 空表单用例断言目的地 `aria-invalid="true"` |
| 省级 / 未知 / 缺失代码被后端拒绝 | `TripControllerTest#in_provinceCodeOnly_out_invalidInput`、`#in_unknownDestinationCode_out_invalidInput`、`#in_missingDestinationCode_out_invalidInput` |
| 选到市后按代码生成标准名 | `TripControllerTest#in_validRequest_out_createdRecruitingTrip` 断言 `destination = 广州`（代码 `440100`）；发布 e2e 断言详情页「珠海」 |
| 契约 0.7.0 | `OpenApiTest` 断言 `info.version = 0.7.0` 与 `required` 含 `destination_code` |

## 5. 未通过项（既有，属其它故事）

完整 `trips.spec.ts`（9 条）本次 5 通过 / 4 失败，失败项与本次修订无关：

| 用例 | 失败点 | 归属 |
|---|---|---|
| 身份门与默认列表 | 仍断言旧标题「选择一个演示身份」 | S01 测试债 |
| 按兴趣筛选 | 仍用 `checkbox`，筛选已改按钮 | S04 测试债 |
| 发布者结束行程 | `.ant-popconfirm .ant-btn-primary` 选择器失效 | S15 测试债 |
| 满员与招募中的非颜色区分 | 期待 `[data-status="full"]`，与 REQ-005 的实现不一致 | `refine-inspiration-home`（他人 in-flight） |

`companions.spec.ts` 另外两条失败同属既有测试债（视图标签改为「招募中的行程」、申请→聊天链路的确认框选择器），已登记在 S07 验证报告 §5。

## 6. 结论

目的地代码化按 P2 §8 的口径完成：契约 0.7.0、前后端同一份字典切片、三条新场景均有断言且通过。**G1 已重评（Pass）**，G2 追加修订记录；本 change 仍**不归档**，归档顺序为 `add-destination-area-filters` → `add-trip-publish`，归档前需复核全国字典替换。