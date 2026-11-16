# G2 decision — add-trip-publish

- **Gate：** G2（Verify）
- **Change：** `add-trip-publish`（capability `trip-plans` MODIFIED，REQ-002 / S06）
- **Timestamp：** 2026-11-16T11:00+0800
- **Recorded by：** Jay（AO / current developer）

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261116-100500-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-100500-local-verify-report.md) | Pass（契约 valid、后端 152、前端 67、构建成功、S06 e2e 2 项通过） |
| Implementation commit | `4c92fbf`（分支 `feature/add-trip-publish`），合并提交 `a37da5e` | 已合入 `main` |
| Pipeline CI（required） | GitHub Actions run [#43790134080](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43790134080)（`a37da5e`） | **Success** |
| Pipeline CD | run [#43790222617](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43790222617) | **Success**（发布 `build-a37da5e`） |
| Delta Spec | [`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 1 Requirement / 11 Scenario |
| ATDD / Design / Tasks | [`atdd-design.md`](atdd-design.md)、[`design.md`](design.md)、[`tasks.md`](tasks.md) | T1–T5 完成；T6 的 `summary.md` 留给 P5 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 后端 `.\mvnw.cmd -B -o test`；前端 `npm run build` |
| scan | Skipped | 仓库未配置安全扫描器；演示环境无生产凭据 |
| review | Skipped | 未运行独立评审工具；按 TDD + ATDD 覆盖 |
| evidence | Pass | 本地验证报告 + 67 前端用例 + 152 后端用例 + 2 条 S06 e2e |
| ci | Pass | CI run #43790134080 全绿 |
| cd | Pass | CD 成功发布 `build-a37da5e` |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 4 | 身份仍用 `X-User-Id`；其它故事 5 条 e2e 陈旧用例；Playwright 未进 CI；`capacity` 口径依赖规格解释 |
| SUGGESTION | 1 | `TripMatchTest` 目录与包名不一致（与 S06 无关） |

## Decision

**Pass**

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 其它故事的陈旧 e2e 选择器（S01/S04/S12/S13/S16/S17） | AO（Jay） | 随各自 change |
| Playwright 作为本地门禁，不进 CI | AO（Jay） | 需要浏览器回归门禁时评估 |
| `X-User-Id` 身份桩替换 | AO（Jay） | 生产化 change |
| `capacity` 口径写进 living spec | AO + SA | P5 归档合并 |

## Approvers

| 角色 | 姓名 |
|---|---|
| VL | Neal |
| AO | Jay |
| IO | Wanye |
| SA | Jacky、Karena |
| SM | Lewis |

签署来源：[`docs/sdd/add-trip-publish/p4-verify.md`](../../../docs/sdd/add-trip-publish/p4-verify.md) §签署表；VL 为独立验证人，AO 未自签 VL。

## Next

- Decision = Pass，P5 按用户 2026-11-16 指示**暂不执行**（不归档）。归档时补 `summary.md`、合并 living spec、登记知识库。

## G2 追加：目的地代码化（REQ-007 协作，2026-11-16）

| 项 | 修订前 | 修订后 |
|---|---|---|
| 契约版本 | 0.6.0 | **0.7.0**（`TripCreateRequest.destination_code`） |
| 本地验证 | 后端 152 / 前端 67 / e2e 2 | 后端 **156** / 前端 **75** / 构建成功 / 契约 valid（7 既有 warning）/ 发布 e2e 2 通过 |
| 验证报告 | `20261116-100500-local-verify-report.md` | 追加 [`20261116-113500-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-113500-local-verify-report.md) |
| 新增断言 | — | 省级码 / 未知码 / 缺失码 400；Cascader 必须选到市；详情页目的地为「珠海」 |
| CI | run `43790134080` | 待本次提交推送后复核（结果写入归档时的 `summary.md`） |

**结论：Pass**（继承 CVE/缺陷等级不变；新增残余项如下）。

| 残余项 | Owner | 处理时机 |
|---|---|---|
| 最小字典切片需替换为全国字典并持久化 `destination_code` | AO（Jay）+ `add-destination-area-filters` | 该 change 落地时 |
| 其它故事 e2e 测试债（S01 / S04 / S15、REQ-005 状态徽标） | AO（Jay） | 随各自 change |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核修订后的验证报告与断言覆盖，追加 G2 Pass | 2026-11-16 |
| SA | Jacky、Karena | 确认修订未越出 G1 重评的规格 | 2026-11-16 |
| AO | Jay | 记录字典切片遗留项 | 2026-11-16 |

## G2 追加：R2 发布页体验（2026-11-16）

| 项 | 结果 |
|---|---|
| 验证报告 | [`20261116-121000-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-121000-local-verify-report.md) |
| 后端 | `clean test` 156 通过（与 R2 前一致，R2 未改后端） |
| 前端 | `npm test` 81 通过（新增 6 条）；`npm run build` 成功 |
| 契约 | 未改动，保持 0.7.0 |
| 端到端 | 发布 2 项通过；`trips` + `companions` 9 通过 / 3 条既有失败（S01 / S04 / REQ-005） |
| 人工核验 | 430×900 截图：面板在视口内、日期预填、地图先隐藏后按市展示、分组间距一致 |

**结论：Pass**；残余项不变（字典切片替换、其它故事 e2e 债）。

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核 R2 证据，G2 追加 Pass | 2026-11-16 |
| SA | Jacky、Karena | 四项反馈均在约定范围内闭环 | 2026-11-16 |
| AO | Jay | 交付实现与回归结果 | 2026-11-16 |
| SM | Lewis | 认可 R2 交付，P5 暂缓 | 2026-11-16 |