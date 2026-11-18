# Artifact review — refine-publish-route-map / proposal（第 2 次，修订后）

- **Verdict: Pass**
- **Scope:** focus=proposal（`@rule:artifact-review-gate` 的 P1 工件评审，修订稿复审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [`proposal.md`](../../openspec/changes/refine-publish-route-map/proposal.md)（D1–D9、AC-1 ~ AC-10）
- **Supersedes:** [`20261118-refine-publish-route-map-proposal-review.md`](20261118-refine-publish-route-map-proposal-review.md)（签署于「复用面板结论」落定之前，内容已被本次修订取代；原件保留不覆盖）
- **Supporting inputs:**
  - [`p0-baseline.md`](../sdd/refine-publish-route-map/p0-baseline.md)（缺口 G-01 ~ G-10、关键基线事实 1–10、准入 P1 条件）
  - P1 Delta 同批产出：[`specs/trip-plans/spec.md`](../../openspec/changes/refine-publish-route-map/specs/trip-plans/spec.md)（MODIFIED 1 Requirement / 18 Scenario，基线 7 场景原文保留 + 新增 11 场景）
  - 发起人 2026-11-18 裁决：① 保留旅行地图页面、仅移除冗余入口；② 途经点保持 `stops: string[]`，不加坐标；③ 直接复用探索页现有面板（已选途经点 / 出行方式 / 重新生成旅行路线 / 已按直线显示路线 / 行程顺序），不重新设计
- **Evidence:**
  - [`openspec validate refine-publish-route-map --strict`](../../openspec/changes/refine-publish-route-map/) → `Change 'refine-publish-route-map' is valid`
  - 基线场景保留核对（脚本比对 Living Spec 与 Delta 中同一 Requirement 的 Scenario 标题）：`baselineCount=7 deltaCount=18 missing=[]`
  - 基线绿：`frontend` 的 `npx tsc --noEmit` → 退出码 0（本 change 尚未改代码）
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`；`rules/quality/rules.md#web-coding-style`；`rules/testing/rules.md#web-testing`；`rules/architecture/rules.md#api-contract`
  - 现状核实（只读）：`TripCreatePage` 第 2 段只有 `AmapPlacePicker mode="multi" showMap`；`AmapPlacePicker` 未调用 `planRoute`；`MapExplorerPage` 已具备 `addPlace` / `handleMapClick` / `reorder` 与「首次生成后自动重算」的 effect；`WaypointPanel` 的模式行硬编码「步行 / 驾车 / 骑行」；`ItineraryPanel` 直接读 `MODE_LABELS`（`driving` = 「驾车」）；`placePick.pointFallbackName` 产出「地图选点 {lng}, {lat}」；`AmapService.planRoute` 的 `transit` 依赖 `city` 参数，而探索页调用未传；`AppShell.NAV_ITEMS` 含 `map` 项且侧栏与底部栏同源
  - 契约 / 迁移核实：`openapi.yaml` `info.version` = 0.22.0；`origin/main` 迁移最新 `V26__ai_itineraries.sql`；本 change 声明零后端 / 契约 / 迁移
  - 既有测试现状核实：`e2e/tests/trips.spec.ts` 发布用例仍断言 `china-map` / `city-map`，而这两个 testid 只存在于已无 import 的 `ChinaMap` / `CityTravelMap`

## 本次修订相对上一版的变化

| 项 | 上一版 | 修订后 |
|---|---|---|
| 面板来源 | 抽象为「共享路线编辑器」，形态待 P3 定 | 明确复用探索页现有 `WaypointPanel` / `ItineraryPanel` / `RouteLayer` / `AmapContainer` / `PlaceSearchBox` / `placePick`，不重新设计面板 |
| 规划触发 | 未区分手动与自动 | 保留「生成旅行路线」按钮；首次生成后增删 / 排序 / 切换方式自动重算 |
| 模式列表 | 只要求发布页三档 | 面板接受 `modes` / `modeLabels`；探索页保持「步行 / 驾车 / 骑行」，发布页显示「自驾 / 骑行 / 公共交通」 |
| 降级文案 | 只要求「示意 / 估算」 | 追加：提示面向普通用户，不得出现后端服务名 / 端口 / 代理 / 重载 |
| 坐标占位名 | 作为风险记录 | 升级为 D9 + AC-10：提交前拦截「地图选点 {经度}, {纬度}」并要求改名 |
| 验收口径 | AC-1 ~ AC-9 | AC-1 ~ AC-10；Delta 新增 11 场景，合计 18 |

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| F-1 | SUGGESTION（P2 承接） | `rules/process/rules.md#artifact-review-gate` | 提案「验收口径」AC-7 与追溯列 | AC-7（移除导航入口、深链保留）仍没有对应 Delta Scenario，只由 E2E 覆盖 | 维持上一版处理：AC-7 标为「D7 + E2E」，P2 的 `dov-ac-review.md` 不与 Scenario 强行对齐，并保留「`design-system` 导航条未列举旅行地图」的理由 | [fact] |
| F-2 | SUGGESTION（P3 承接） | `rules/quality/rules.md#web-coding-style` | 提案 D4「模式参数化」与影响面表 | 复用面板要求 `WaypointPanel` / `ItineraryPanel` 接受注入的 `modes` / `modeLabels`；若默认值处理不当，探索页会出现「自驾」或发布页出现「驾车」 | P3 `design.md` 明确 props 形状与默认值（缺省 = 现状 `步行 / 驾车 / 骑行`），并列出探索页回归清单（深链、收藏、匹配面板、模式行） | [inference] |
| F-3 | SUGGESTION（P3 承接） | `rules/testing/rules.md#web-testing` | 提案 D5「首次生成后自动重算」 | 「首次生成」是状态机边界：未生成前改顺序不应触发请求，已生成后改顺序必须触发；提案未指出该边界的锚点 | P3 `atdd-design.md` 用一个显式的 `hasGenerated` 状态描述两种路径，并为「未生成前改顺序不发请求」补一条断言，避免自动重算误触发 | [inference] |
| F-4 | SUGGESTION（P3 承接） | `rules/process/rules.md#spec-first` | 提案 D9 + AC-10「坐标占位名」 | 拦截时机（提交时 vs 加点时）与交互（就地改名 / 弹窗改名）未定；若只做提交拦截，用户可能填完整张表才被退回 | P3 定稿：加点后即可就地改名，提交时做兜底拦截；两者共用同一校验函数，P4 用单测覆盖校验、E2E 覆盖提交路径 | [inference] |
| F-5 | SUGGESTION（P4 承接） | `rules/process/rules.md#spec-first` | 提案 D8「测试锚点重建」 | 重写 `trips.spec.ts` 中已失效的 `china-map` / `city-map` 断言属于既有测试债，与本 change 引入的行为混在同一次改动里 | 维持上一版处理：P4 验证报告分列「本 change 新增失败」与「既有失败」，给出重写前后的失败清册 | [fact] |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 5 → **Pass**

## Per-dimension summary

| 维度 | 结论 | 说明 |
|---|---|---|
| A Architecture | Pass | 单 capability `trip-plans`（MODIFIED），符合 one change = one capability；不新增能力、不改契约与迁移；复用既有面板而非新造组件，降低架构面 |
| B Quality | N/A | P1 无实现；提案已划定「不改后端、不改契约、不加迁移」，并把 props 形态留给 P3 |
| C Testing | N/A（计划已列） | 提案列出增点 / 排序 / 手动与自动规划 / 模式切换 / 降级 / 占位名 / AI 预填 / 响应式证据，并明确重写已红的发布 E2E；基线 `tsc` 绿 |
| D Security | Pass | 不新增 PII 字段；地点检索仍走高德代理白名单；无新密钥、无新配置项 |
| E Process | Pass | P0 记录与提案同批；P0 记录人写为 Jacky；未触碰生产代码；相对上一版的实质性变更已在本报告「变化」表逐条列出，供重新签署时比对 |
| F Documentation | Pass | 正文中文、标识符与命令英文；引用代码写路径与符号名，未写行号；无绝对机器路径；`@rule:` 均指向存在锚点 |
| G Traceability | Pass | G-01→AC-1；G-02→AC-1/AC-2；G-03→AC-3；G-04→AC-4；G-05→D2/AC-6；G-06→AC-4；G-07→AC-7；G-08→D8；G-09→AC-3/AC-4；G-10→D5；D9→AC-10；AC-8→「AI 预填路线进入编辑器后可编辑」；AC-9→「窄屏与双主题不溢出」 |

## Residual risks

- 复用面板意味着发布页与探索页共享组件，`modes` / `modeLabels` 是两者唯一的分歧点；任何绕过 props 的硬编码都会让两端串味，P3 必须把默认值写成「不传即现状」。
- 手动生成 + 自动重算构成两段状态机；若 `hasGenerated` 判定漏掉「删除到少于两点」的边界，会出现对 1 个点发规划请求的噪音。
- 占位名拦截若只在提交时生效，用户在长表单末尾才被退回，体验受损；P3 需给出就地改名的落点。
- 发布页与探索页的公共交通口径仍不一致（探索页未传城市）；本 change 只保证发布页正确，探索页缺陷保留为已知债务。
- Delta 与未归档的 `refine-trip-map`、`add-trip-publish` 修改同一 Requirement；归档必须串行，且本 change 为发布页路线段的权威，G1 需具名确认。
- E2E 依赖高德响应，必须用 `page.route` 注入；若遗漏，CI 会因外网不可用而假红。
- 并行会话正在修改 `frontend/src/shell/AppShell.tsx`（账号菜单）与 `frontend/src/i18n/tripMessages.ts`（资料文案），与本 change 的 `NAV_ITEMS` / `activeKey` 与 `sectionRoute` 改动落在同两个文件；P4 需先合并 `origin/main` 再改。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 | 批准范围 |
|---|---|---|---|---|---|
| `proposal.md`（修订稿） | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「继续」 | 全文（D1–D9 / AC-1 ~ AC-10） |
| 本评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-18 | 发起人当次会话确认「继续」 | 结论与签署位 |
| 本评审报告 | 2 / 2（当前开发者） | Jacky（当前开发者） | 2026-11-18 | 发起人当次会话确认「继续」 | 结论与签署位 |