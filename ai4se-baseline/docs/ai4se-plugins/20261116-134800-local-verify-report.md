# 验证报告：add-trip-publish R3（字典全国化后的返工）

- **变更：** `add-trip-publish`（`trip-plans` MODIFIED）｜ **分支：** `feature/add-trip-publish-r3`
- **契约版本：** `openapi.yaml` 保持 **0.7.0**（R3 不改契约、不改后端行为）
- **时间：** 2026-11-16 13:48（本机 Windows，Node 24 / JDK 21）
- **范围：** P1 §12 的两处可见缺陷（覆盖城市提示错误、无地图）与 R2 遗留的重复字典

## 1. Red：先看到失败

| # | 复现 | 旧行为 |
|---|---|---|
| R3-1 | 选「北京市 / 市辖区」 | 途经点区域提示「先选目的地，再按城市点选途经点。」——目的地已选，提示错误 |
| R3-2 | 同上 | 地图不渲染（`mapCityForCode('110100')` 依赖 16 城切片，返回 `undefined`），且没有任何说明 |
| R3-3 | 代码检索 | `areas/areaCatalog.ts` 的 `AREA_PROVINCES` / `DESTINATION_OPTIONS` / `cityByCode` / `codesForCityName` 已无调用方；后端 `AreaConstant`、`pojo/AreaCity` 仅自引用，`TripPlanServiceImpl` 两条 import 未使用 |

新的映射单测在旧实现上失败：`gazetteerCityForCode('440400')` 期望 `珠海`，旧等价函数因字典名称带「市」后缀与地名库简称不一致而返回 `undefined`。

## 2. Green：最小实现

| 改动 | 落点 | 说明 |
|---|---|---|
| 共享字典映射 | 新增 `frontend/src/areas/gazetteerCity.ts` | `gazetteerCityForCode` 读 `area/areaOptions` 的 `findCity`，去掉「市」后缀后与地名库城市集合比对；港澳二级区归并到「香港」「澳门」 |
| 覆盖说明 | `TripCreatePage.tsx`、`tripMessages.ts` | 用 `hasDestination` 区分「未选」与「未覆盖」；未覆盖时提示「这个城市暂时没有离线点位…」，不再说「先选目的地」 |
| 删除重复字典 | `frontend/src/areas/areaCatalog.ts`（含测试） | 16 城切片与无调用方导出一并删除 |
| 删除后端死代码 | `constant/AreaConstant.java`、`pojo/AreaCity.java`、`TripPlanServiceImpl` 两条 import | 名称派生统一走 `area/AreaDictionary` + `AreaNames` |
| 端到端 | `e2e/tests/trips.spec.ts` | 新增 `explains a destination without offline map coverage`（北京市：无地图、覆盖提示、不得出现「先选目的地」） |

## 3. 验证命令与结果

```text
$ cd RouteME/backend; .\mvnw.cmd -B -o clean test
[INFO] Tests run: 206, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS

$ cd RouteME/frontend; npm run typecheck
（无输出，通过）

$ cd RouteME/frontend; npm test
 Test Files  13 passed (13)
      Tests  105 passed (105)

$ cd RouteME/e2e; npx playwright test tests/trips.spec.ts -g "publishes a trip|explains a destination|blocks publishing"
  ok 1 › publishes a trip and finds it in the home list (3.9s)
  ok 2 › explains a destination without offline map coverage (1.8s)
  ok 3 › blocks publishing and flags every missing required field (1.8s)
  3 passed
```

`npm run build` 亦通过（仅 chunk 体积提示）。

## 4. 场景对照

| 场景 | 证据 |
|---|---|
| 目的地暂无离线点位时给出说明 | e2e 新增用例（无 `place-map`、覆盖提示可见、「先选目的地」计数 0） |
| 代码 → 地名库城市映射 | `areas/gazetteerCity.test.ts`（珠海 / 广州 / 香港 / 澳门 / 北京 / 空 / 未知码） |
| 覆盖城市仍显示地图 | 既有发布用例断言 `data-city="珠海"` 与「情侣路」点位 |
| 重复字典与死代码清理 | `tsc --noEmit`、`mvnw -o clean test` 通过；`AreaConstant` / `pojo/AreaCity` 已无引用 |

## 5. 残余项

| 项 | Owner | 处理时机 |
|---|---|---|
| 离线地名库仍只覆盖广东 14 城 + 港澳 | SA（REQ-007 边界） | 后续点位扩充 change |
| `SqlLite/routeme.db` 迁移到 v11 后不可回退到旧代码 | AO | 本地演示库重建即可 |

## 6. 结论

R3 关闭 R2 的「最小字典切片待替换」遗留项，未覆盖城市不再出现错误提示；前端与后端各只剩一份字典来源。不改契约、**不归档**；G2 追加 R3 Pass。