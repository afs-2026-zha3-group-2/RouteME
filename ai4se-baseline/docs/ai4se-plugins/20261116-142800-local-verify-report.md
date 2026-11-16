# 验证报告：add-match-reason R2（筛选不参与匹配分）

- **变更：** `add-match-reason`（`trip-companions` MODIFIED）｜ **分支：** `feature/add-match-reason-r2`
- **契约版本：** `openapi.yaml` **0.8.0 → 0.8.1**（`Match.basis` 描述与匹配语义）
- **时间：** 2026-11-16 14:28（本机 Windows，Node 24 / JDK 21）
- **范围：** P1 §10 的 R2：匹配只认个人参照；列表与详情分值一致；契约描述同步

## 1. Red：先看到失败

同一行程在两个入口给出不同分值：

```text
$ GET /api/matches?destination_code=440100   (X-User-Id: 2)
  trip 4 → score 50，reasons ["目的地相同"]
$ GET /api/matches/4                          (X-User-Id: 2)
  trip 4 → score 0，reasons ["暂无重合，可作为新方向的灵感"]
```

原因：`TripMatch.of` 在传入筛选目的地/日期时用筛选值覆盖了个人参照，而 REQ-007 的 out of scope 明确「不改变匹配的业务规则」。

## 2. Green：最小实现

| 改动 | 落点 | 说明 |
|---|---|---|
| 去掉筛选输入 | `pojo/TripMatch.java` | `of(candidate, reference, interests)`；参照目的地/日期只来自 `reference` |
| 统一计算入口 | `service/impl/MatchServiceImpl.java` | `search` 与 `matchFor` 共用同一调用，不再分别传筛选 |
| 契约 | `openapi.yaml` | `Match.basis` 改为「最近一条未结束的已发布行程，或你的旅行兴趣；筛选与排序不影响匹配分」；`info.version` 0.8.1 |
| 单元测试 | `TripMatchTest`（移到 `routeme/pojo`，与包名一致） | 新增「参照目的地不同则不计目的地分」；删除「筛选覆盖参照物」 |
| 接口测试 | `MatchControllerTest` | 新增「筛选列表与详情同分同理由」；契约版本断言 0.8.1 |

## 3. 验证命令与结果

```text
$ cd RouteME/backend; .\mvnw.cmd -B -o clean test
[INFO] Tests run: 209, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS

$ cd RouteME/frontend; npm test
 Test Files  14 passed (14)
      Tests  114 passed (114)

$ cd RouteME; npx @redocly/cli lint openapi.yaml
valid，0 error / 15 既有 warning

$ cd RouteME/e2e; npx playwright test tests/companions.spec.ts
  ok 1 shows match reasons and keeps match as the default sort
  ok 2 applies, gets accepted, chats, reports and leaves
  ok 3 keeps companion entry points honest
  3 passed

$ GET /api/matches?destination_code=440100 (user 2) → trip 4 score 0
$ GET /api/matches/4 (user 2)                       → trip 4 score 0
```

## 4. 场景对照

| 场景 | 证据 |
|---|---|
| 筛选与排序不改变匹配分 | 上面的手工对比 + `MatchControllerTest#in_filteredList_out_sameScoreAsDetail` |
| 列表与详情给出同一分值 | 同一用例逐个比对 `score` 与首条 reason |
| 参照目的地不同则不计目的地分 | `TripMatchTest#in_referenceDestinationDiffers_out_noDestinationPoints` |
| 无参照时只以兴趣为参照 | `TripMatchTest#in_noOverlap_out_fallbackReasonAndInterestBasis` |

顺带修复：`TripMatchTest` 原来放在 `routeme/model` 但声明 `package routeme.pojo`，增量编译会残留同名 class 触发 `NoClassDefFoundError`（S06 报告 §5 的 S-02）。已移到 `routeme/pojo`，`clean test` 后稳定。

## 5. 残余项

| 项 | Owner | 处理时机 |
|---|---|---|
| 参照物只取最近一条未结束行程 | AO | 后续优化 |
| 契约 0.8.1 需在归档时写入 `summary.md` | AO + SA | P5 |
| 看板 S07 状态仍为 P3（token 无 `project` 写权限） | SM | 人工拖到 P4 |

## 6. 结论

筛选不再影响匹配分，同一行程在列表与详情得到一致分值与理由；契约描述与版本同步。**G2 追加 R2 Pass**；S07 仍**不归档**。