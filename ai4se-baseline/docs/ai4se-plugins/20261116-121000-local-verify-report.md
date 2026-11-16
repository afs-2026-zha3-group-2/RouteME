# 验证报告：add-trip-publish R2（发布页体验修复）

- **变更：** `add-trip-publish`（`trip-plans` MODIFIED）｜ **分支：** `feature/add-trip-publish-r2`
- **契约版本：** `openapi.yaml` 保持 **0.7.0**（R2 不改契约、不改后端）
- **时间：** 2026-11-16 12:10（本机 Windows，Node 24）
- **范围：** P1 §10 的四项用户评审（目的地不可点、日期无默认、地图丑且与目的地无关、布局间距）→ P2 新增的 5 个 Scenario

## 1. Red：先看到失败

| # | 复现 | 旧行为 |
|---|---|---|
| R2-1 | 点击目的地字段 | 面板节点存在但 `getBoundingClientRect()` 为 `x=-5655, y=-8835`，视口内不可见；窄屏下用户点不到任何省会 |
| R2-2 | 打开发布页 | 出发 / 结束日期为空，显示 `mm/dd/yyyy` |
| R2-3 | 未选目的地 | 途经点地图已经渲染整张广东图 |
| R2-4 | 查看地图 | `viewBox="0 0 100 100"` + `preserveAspectRatio="none"`，被 500×230 容器横向压扁；珠海 / 中山 / 澳门 / 香港标签重叠 |
| R2-5 | 查看目的地控件 | 控件宽度 142px，字段宽 397px（未撑满） |

修复后同一测量点（headless，430×900）：面板 `x=35, y=310`，宽 111、高 144，完整落在视口内。

## 2. Green：最小实现

| 改动 | 落点 | 说明 |
|---|---|---|
| 弹出层定位 + 全宽 | `TripCreatePage.tsx` | `getPopupContainer` 挂字段容器，`className="field-control"` 撑满 |
| 日期默认今天 | `tripForm.ts` | 新增 `todayIso` / `initialTripForm`（本地年月日，不用 `toISOString`）；`TripCreatePage` 用它初始化 |
| 地图按目的地展示 | `PlacePicker.tsx`、`TripCreatePage.tsx` | 新增 `showMap` / `city`；未选目的地不渲染并显示引导 |
| 地图缩放与比例 | `PlaceMap.tsx`、`styles.css` | `xMidYMid meet` + 固定宽高比；按该市点位包围盒缩放；点/标签按 `viewBox` 缩放保持屏幕尺寸；标签贪心避让；新增经纬网格与城市聚焦环 |
| 城市映射 | `areaCatalog.ts`、`placeCatalog.ts` | `mapCityForCode`（港澳二级区→香港/澳门）、`placesInCity` |
| 分组与间距 | `TripCreatePage.tsx`、`styles.css` | 基本信息 / 路线 / 补充信息三段；行距 16、段距 24；移动端底部留白 88px 避开固定导航 |
| 测试 | `tripForm.test.ts`、`placeCatalog.test.ts`、`areaCatalog.test.ts`、`e2e/tests/trips.spec.ts` | 默认日期、港澳映射、按市取点；发布 e2e 新增面板可见、日期默认、地图先隐藏后按市展示、控件等宽断言 |

## 3. 验证命令与结果

```text
$ cd RouteME/backend; .\mvnw.cmd -B -o clean test
[INFO] Tests run: 156, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS

$ cd RouteME/frontend; npm test
 Test Files  10 passed (10)
      Tests  81 passed (81)

$ cd RouteME/frontend; npm run build
✓ built in 992ms（仅 chunk 体积提示）

$ cd RouteME/e2e; npx playwright test tests/trips.spec.ts -g "publishes a trip|blocks publishing"
  ok 1 › publishes a trip and finds it from the home search (5.5s)
  ok 2 › blocks publishing and flags every missing required field (1.9s)
  2 passed

$ cd RouteME/e2e; npx playwright test tests/trips.spec.ts tests/companions.spec.ts
  9 passed / 3 failed（失败项与 R2 无关，见 §5）
```

人工核验：headless 430×900 截图确认——目的地面板在视口内可见；日期预填 `11/16/2026`；未选目的地时无地图；选「广东省 / 珠海」后地图缩放至珠海并只列该市候选点，标签不重叠；三段分组间距一致。

## 4. 场景对照

| 场景 | 证据 |
|---|---|
| 日期默认今天 | `tripForm.test.ts › initialTripForm`（本地日期 00:30 / 23:55 两个边界）；e2e 断言两个日期输入等于今天 |
| 目的地可点选 | e2e `pickDestination` 断言面板包围盒在视口内，并成功选到「广东省 / 珠海」 |
| 未选目的地不展示地图 | e2e 断言 `[data-testid="place-map"]` 计数 0 + 引导文案可见 |
| 选定后地图聚焦该市 | e2e 断言 `data-city="珠海"`、`情侣路` 点位可见；`placeCatalog.test.ts › placesInCity`、`areaCatalog.test.ts › mapCityForCode` |
| 表单分组与间距 | e2e 断言三个段标题可见；Cascader 宽度与字段宽度差 ≤ 2px |

## 5. 未通过项（既有，与 R2 无关）

`trips.spec.ts` 仍有 3 条失败，R2 前后一致：

| 用例 | 失败点 | 归属 |
|---|---|---|
| 身份门与默认列表 | 断言旧标题「选择一个演示身份」 | S01 测试债 |
| 按兴趣筛选 | 仍用 `checkbox`，筛选已改按钮 | S04 测试债 |
| 满员与招募中的非颜色区分 | 期待 `[data-status="full"]`，与 REQ-005 实现不一致 | `refine-inspiration-home` |

## 6. 结论

四项反馈全部落地：目的地可点选、日期默认今天、地图按目的地展示且不再拉伸、布局分组等距。均不改后端与契约，**G2 追加 R2 Pass**；S06 仍**不归档**。