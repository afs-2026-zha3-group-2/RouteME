# 验证报告：add-match-reason（S07 匹配原因提示）

- **变更：** `add-match-reason`｜ **分支：** `feature/add-match-reason`｜ **契约版本：** `openapi.yaml` 保持 `0.6.0`（`Match` schema 无字段变化）
- **时间：** 2026-11-16 10:15（本机 Windows，Node 24 / JDK 由 wrapper 提供）
- **范围：** `trip-companions` 增量规格「展示可解释的匹配原因」

## 1. Red：先看到失败

列表卡片只渲染一个环形进度条与裸数字，没有「匹配度」与「匹配理由」标签；端到端用例还在断言已经改版前的首页标题「旅行灵感」。

```text
$ cd RouteME/e2e; npx playwright test tests/companions.spec.ts -g "shows match reasons"
  x  1 tests\companions.spec.ts:33:1 › shows match reasons and keeps match as the default sort (8.5s)
    Error: expect(locator).toBeVisible() failed
    Locator: locator('.trip-card').first().getByText(/匹配度 \d+%/)
    Error: element(s) not found
      41 |   await expect(firstCard.getByText(/匹配度 \d+%/)).toBeVisible();
```

失败原因与预期业务一致：卡片上的百分比没有语义标签，用户看到的是「86」而不是「匹配度 86%」。

## 2. Green：最小实现

| 改动 | 落点 | 说明 |
|---|---|---|
| 卡片补语义标签 | `frontend/src/trips/TripCard.tsx` | 环形图降为装饰（`aria-hidden`），文字区展示「匹配度 86%」与「匹配理由 …」；数字加 `.match-percentage` 供排序断言 |
| 卡片样式 | `frontend/src/styles.css` | 新增 `.match-copy` / `.match-score` / `.match-reason-label`，删除不再使用的 `.match-ring b` |
| 打分口径断言 | `backend/src/test/java/routeme/model/TripMatchTest.java` | 补「仅出发日期相同 = 30」「单个共同兴趣 = 10」两条场景；既有的 50 / 20 / 上限 20 / 上限 100 / 无重合 / 参照物覆盖保持不变 |
| 端到端用例对齐 | `e2e/tests/companions.spec.ts` | 首页断言改为当前首屏（`h1` + 视图切换），新增「卡片按匹配度降序」「切换身份后原因文本随兴趣变化」与「详情页原因列表 + 匹配度」断言 |

## 3. 验证命令与结果

```text
$ cd RouteME/backend; .\mvnw.cmd -B -o clean test
[INFO] Tests run: 154, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
（TripMatchTest 7 项，含新增的两条口径）

$ cd RouteME/frontend; npm test
 Test Files  9 passed (9)
      Tests  67 passed (67)

$ cd RouteME/frontend; npm run build
✓ built in 980ms（仅 chunk 体积提示）

$ cd RouteME; npx @redocly/cli lint openapi.yaml
valid，0 error / 7 既有 warning（与 S06 验证时一致）

$ cd RouteME/e2e; npx playwright test tests/companions.spec.ts -g "shows match reasons|keeps companion entry points" tests/trips.spec.ts -g "shows match reasons|keeps companion entry points|publishes a trip|blocks publishing"
  ok 1 companions › shows match reasons and keeps match as the default sort (2.7s)
  ok 2 companions › keeps companion entry points honest (1.5s)
  ok 3 trips › publishes a trip and finds it from the home search (2.3s)
  ok 4 trips › blocks publishing and flags every missing required field (1.5s)
  4 passed (9.5s)
```

> 备注：`mvn -Dtest=TripMatchTest test` 曾因 `target/test-classes/routeme/model/TripMatchTest.class` 陈旧副本（测试文件已移到 `routeme/pojo` 包）报 `NoClassDefFoundError: TripPlan`；执行 `clean test` 后正常。该陈旧产物不入库，仅本机增量编译残留。

## 4. 验收场景对照

| 场景 | 证据 |
|---|---|
| 展示匹配理由与百分比 | e2e `.match-score` = 「匹配度 N%」、`.match-reason-label` = 「匹配理由」、`.match-reason` 非空 |
| 目的地相同计 50 分 | `TripMatchTest#in_filterDestination_out_overridesReference` |
| 出发日期相同 30 / 相差一天 20 | `TripMatchTest#in_sameDateOnly_out_thirtyPoints`、`#in_oneDayApart_out_twentyPoints` |
| 共同兴趣每项 10、合计 ≤ 20 | `TripMatchTest#in_singleSharedInterest_out_tenPoints`、`#in_threeSharedInterests_out_cappedAtTwenty` |
| 多项命中总分不超过 100 | `TripMatchTest#in_sameDestinationAndDateWithSharedInterests_out_cappedAt100` |
| 没有可参照的已发布行程 | `TripMatchTest#in_noOverlap_out_fallbackReasonAndInterestBasis`（`basis = 对照你的旅行兴趣`） |
| 没有任何重合时给出提示 | 同上（`暂无重合，可作为新方向的灵感`） |
| 详情页与列表页都展示匹配原因 | 列表：卡片 `.match-score` / `.match-reason`；详情：`.match-reason-list li` + `.detail-meta`（e2e 同一用例覆盖） |
| 原因随身份的兴趣变化 | e2e 在身份 1 与身份 2 下分别采集 `.match-reason` 文本并断言两者不同 |
| 默认按匹配度排序 | e2e 读取卡片 `.match-percentage` 序列并断言非递增；`emptyFilterState.sort = 'match'` |

## 5. 未通过项（既有，属其它故事）

完整 e2e 套件仍有 4 条其它故事的陈旧用例失败（S01 身份门标题、S04 筛选控件、S12/S13 确认框、S16 视图切换、S17 旧途经点输入）。S07 只修复了 `companions.spec.ts` 中属于本故事的两条用例，其余沿用 S06 验证报告 §5 的登记，不并入本 change。

## 6. 结论

S07 的九条验收场景均有可执行断言并通过；卡片不再只给一个百分比数字，匹配分权重与降级文案被单元测试逐条钉住。变更未引入新依赖、未改数据模型、未改契约版本。