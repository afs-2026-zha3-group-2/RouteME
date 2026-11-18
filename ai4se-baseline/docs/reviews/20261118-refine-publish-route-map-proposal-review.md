# Artifact review — refine-publish-route-map / proposal

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`proposal.md`](../../openspec/changes/refine-publish-route-map/proposal.md)
- **Supporting inputs:**
  - [`p0-baseline.md`](../sdd/refine-publish-route-map/p0-baseline.md)（缺口 G-01 ~ G-10、关键基线事实 1–10、准入 P1 条件）
  - P1 Delta 同批产出：[`specs/trip-plans/spec.md`](../../openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md)（MODIFIED 1 Requirement / 16 Scenario，基线 7 场景保留 + 新增 9 场景）
  - 发起人 2026-11-18 裁决：保留旅行地图页面、仅移除冗余入口；途经点保持 `stops: string[]`，不加坐标
- **Evidence:**
  - [`openspec validate refine-publish-route-map --strict`](../../openspec/changes/refine-publish-route-map/) → `Change 'refine-publish-route-map' is valid`
  - 基线场景保留核对（脚本比对 Living Spec 与 Delta 的 Scenario 标题）：`baselineCount=7 deltaCount=16 missing=[]`
  - 基线绿：`frontend` 的 `npx tsc --noEmit` → 退出码 0（本 change 尚未改代码）
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/quality/rules.md#web-coding-style`；`rules/testing/rules.md#web-testing`；`rules/architecture/rules.md#api-contract`
  - 现状核实（只读）：`TripCreatePage` 第 2 段只有 `AmapPlacePicker mode="multi" showMap`；`AmapPlacePicker` 未调用 `planRoute`；`RouteLayer` 只依赖 `RoutePlan` / `RouteWaypoint`；`MapExplorerPage.addPlace` / `handleMapClick` / `reorder` 已具备增点与排序；`AmapService.planRoute` 的 `transit` 依赖 `city` 参数，而探索页调用未传；`AppShell.NAV_ITEMS` 含 `map` 项且侧栏与底部栏同源
  - 契约 / 迁移核实：`openapi.yaml` `info.version` = 0.22.0；`origin/main` 迁移最新 `V26__ai_itineraries.sql`；本 change 声明零后端 / 契约 / 迁移
  - 既有测试现状核实：`e2e/tests/trips.spec.ts` 发布用例仍断言 `china-map` / `city-map`，而这两个 testid 只存在于已无 import 的 `ChinaMap` / `CityTravelMap`

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P2 承接） | `rules/process/rules.md#artifact-review-gate` | 提案「验收口径」AC-7 与追溯列 | AC-7（移除导航入口、深链保留）没有对应 Delta Scenario，只由 E2E 覆盖 | 已在本提案内说明「导航项清单不在 `design-system` 可判定范围」；P2 的 `dov-ac-review.md` 需把 AC-7 标为「D7 + E2E」，不与 Scenario 强行对齐 | [fact] |
| F-2 | SUGGESTION（P3 承接） | `rules/quality/rules.md#web-coding-style` | 提案 D4「共享件承载地图路线能力」 | 只写「组件/钩子」未定形态，边界留给 P3；若抽取时把探索页状态一并搬走，可能波及同行者面板与收藏路线 | P3 `design.md` 给出共享件的 props / 状态归属与「探索页不改行为」的回归清单（深链、收藏、匹配面板） | [inference] |
| F-3 | SUGGESTION（P4 承接） | `rules/process/rules.md#spec-first` | 提案 D8「测试锚点重建」 | 重写 `trips.spec.ts` 中已失效的 `china-map` / `city-map` 断言属于既有测试债，与本 change 引入的行为混在同一次改动里 | P4 验证报告分列「本 change 新增失败」与「既有失败」，并给出重写前后的失败清册，避免把既有债计入本 change 的收益 | [fact] |
| F-4 | SUGGESTION（治理漂移） | `rules/documentation/rules.md#document-conventions` | 提案 D7 对 `design-system`「应用外壳与导航」的处理说明 | 该条正文列举三项导航，而实现现有六项；移除 `map` 后仍有五项，属既有漂移，本 change 明确不修 | 记录为既有治理漂移；后续 `/sdd:rules-govern` 复核导航条与实现口径，不在本 change 处理 | [fact] |
| F-5 | SUGGESTION（已记录） | `rules/documentation/rules.md#sdd-artifacts` | 提案「规模」行（S–M / 3 点） | 故事点与工作量估算未经 SM 确认 | SM 在排期时确认；不影响 P1 工件通过 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `trip-plans`（MODIFIED），符合 one change = one capability；不新增能力、不改契约与迁移；`AmapProxyController` 只读复用 |
| B Quality | N/A | P1 无实现；提案已划定「不改后端、不改契约、不加迁移」，并把共享件形态留给 P3 |
| C Testing | N/A（计划已列） | 提案列出增点 / 排序 / 模式切换 / 降级 / AI 预填 / 响应式六类证据，并明确重写已红的发布 E2E；基线 `tsc` 绿 |
| D Security | Pass | 不新增 PII 字段；地点检索仍走高德代理白名单；无新密钥、无新配置项 |
| E Process | Pass | P0 记录与提案同批；P0 记录人已按发起人回答写为 Jacky；未触碰生产代码；分支命名与 change-id 一致（`feature/refine-publish-route-map`，待切出） |
| F Documentation | Pass | 正文中文、标识符与命令英文；引用代码写路径与符号名，未写行号；无绝对机器路径；`@rule:` 均指向存在锚点 |
| G Traceability | Pass | 缺口 G-01→AC-1；G-02→AC-1/AC-2；G-03→AC-3；G-04→AC-4；G-05→D2/AC-6；G-06→AC-4；G-07→AC-7；G-08→D8；G-09→AC-3/AC-4；G-10→D5；AC-8→「AI 预填路线进入编辑器后可编辑」；AC-9→「窄屏与双主题不溢出」 |

## Residual risks

- 抽取共享件是本 change 唯一的架构性动作；若边界划在页面层，会形成「第三套路线逻辑」，P3 必须先定 props 归属再动手。
- 发布页与探索页的公共交通口径仍不一致（探索页未传城市）；本 change 只保证发布页正确，探索页缺陷保留为已知债务。
- Delta 与未归档的 `refine-trip-map`、`add-trip-publish` 修改同一 Requirement；归档必须串行，且本 change 为发布页路线段的权威，G1 需具名确认。
- E2E 依赖高德响应，必须用 `page.route` 注入；若遗漏，CI 会因外网不可用而假红。
- 并行会话正在修改 `frontend/src/shell/AppShell.tsx`（账号菜单）与 `frontend/src/i18n/tripMessages.ts`（资料文案），与本 change 的 `NAV_ITEMS` / `activeKey` 与 `sectionRoute` 改动落在同两个文件；P4 需先合并 `origin/main` 再改，避免把并行 WIP 卷入 diff。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 全文 |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「全部批准」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Jacky | 2026-11-18 | 发起人当次会话确认（当前开发者 = Jacky） | 结论与签署位 |