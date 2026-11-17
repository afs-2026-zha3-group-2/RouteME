# Proposal review — refine-trip-map

- **Verdict: Pass**（以修复后状态评审）
- **Scope:** focus=proposal（artifact-review-gate 的 Proposal 轮次，含 P1 Delta 草稿结构核对）；root=`ai4se-baseline`；timestamp=2026-11-16
- **Artifact under review:** [`proposal.md`](../../openspec/changes/refine-trip-map/proposal.md) + P1 草稿 [`specs/trip-plans/spec.md`](../../openspec/changes/refine-trip-map/specs/trip-plans/spec.md)
- **Supporting inputs:** `docs/sdd/refine-trip-map/p0-baseline.md`（G-01~G-06 实测证据）、Living `openspec/specs/trip-plans/spec.md`、未归档增量 `add-trip-publish` / `refine-trip-chat`、发起人裁决（2026-11-16：方案 1 离线 SVG；`meeting_areas` 数组替换；Jay 开发按名册签）
- **Evidence:**
  - `openspec validate refine-trip-map --strict` → `Change 'refine-trip-map' is valid`；附 1 条 INFO：归档模拟对 MODIFIED「发布表单的默认值与地图上下文」报 not found（目标尚在 `add-trip-publish` 增量，见 F-1）
  - 规则锚点：`rules/process/rules.md#spec-first`、`#artifact-review-gate`、`#git-branching-and-pr`；`rules/documentation/rules.md#sdd-artifacts`；`rules/quality/rules.md#web-coding-style`；`rules/testing/rules.md#web-testing`
  - `e2e/tests/companions.spec.ts` 全仓唯一直接构造 `meeting_area` 的 E2E helper（grep 证实），影响面已列
  - 契约现状 `openapi.yaml` `version: 0.10.0`、`OpenApiTest` 断言 `0.10.0`；升版目标 0.11.0 与 V17 号段（head V16、无预留）核对一致

## Findings

| id | severity | rule | location | issue | result |
|---|---|---|---|---|---|
| F-1 | WARNING | `rules/process/rules.md#spec-first` | delta MODIFIED「发布表单的默认值与地图上下文」 | 目标 Requirement 不在 Living Spec（仅在未归档 `add-trip-publish` 增量），`validate --strict` 归档模拟报 INFO not found；若归档顺序颠倒将拒绝合并 | **已修复**：proposal 残余风险登记归档顺序条件（G1 条件 C1：P5 须 `add-trip-publish` / `refine-trip-chat` 先归档）；基线口径说明移出 delta 前言（消除 strict WARNING），P3 落入 design.md |
| F-2 | WARNING | `rules/documentation/rules.md#sdd-artifacts` | proposal 决策 / 契约口径 | `meeting_areas` nullable 与「空数组 / null 待确认」并存，null / [] 双口径易漂移 | **已修复**：proposal 决策补「空值口径」行——请求接受 null 或数组，响应归一为数组（未填 = []），展示层 [] → 待确认 |
| F-3 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | delta 场景名 | 「多个集合区域去重与trim」缺空格，命名不齐 | **已修复**：改为「多个集合区域去重与 trim」 |
| F-4 | SUGGESTION | `rules/testing/rules.md#web-testing` | proposal 影响面 | 初稿漏列 `e2e/tests/companions.spec.ts` 的 `meeting_area` helper | **已修复**：影响面补该行（grep 证实仅此处直接构造字段） |

**Counts:** BLOCKER 0 / WARNING 2（均已修复）/ SUGGESTION 2（均已修复）→ **Pass**

## 缺口 → 提案覆盖（P0 G-01~G-06）

| 缺口 | 提案承接 | 验收信号 |
|---|---|---|
| G-01 详情无地图 | ADDED「行程详情路线地图」+ 影响面 TripDetailPage | 1 / 2 |
| G-02 视觉示意图 | MODIFIED 地图上下文（导航风底图 / 编号 pin / casing / 图例 / 控制条） | 1 / 3 |
| G-03 点击无反馈 | MODIFIED 地图上下文「地图点击总有可见反馈」 | 4 |
| G-04 集合单值 | MODIFIED 发布 / 详情 / 维护 + 契约 0.11.0 + V17 | 5 / 6 / 8 |
| G-05 多途经点证据 | MODIFIED 地图上下文「途经点连加与上限反馈」+ E2E 增补 | 4 |
| G-06 规格漂移 | MODIFIED 收编全省概览，取代「未选目的地不渲染」 | 3（全省概览场景） |

## 对齐自检复核

| 检查 | 结论 |
|---|---|
| in/out scope 明确且 out 不进入影响面 | Pass（在线瓦片 / 照片 / 同路气泡 / 时长编辑 / 旧列删除均 out） |
| 发起人裁决有落点 | Pass（方案 1 SVG、meeting_areas 替换、不归档 S06/S07） |
| capability 粒度单一 | Pass（仅 `trip-plans`；聊天 / 我的旅行只改展示接线，不定义其行为） |
| 既有场景保留 | Pass（发布 18 保留 + 2 新增 / 详情 6 保留 + 1 新增 / 维护 5 保留 / 地图上下文 5 保留 + 1 取代 + 4 新增 / ADDED 4；共 46，P2 逐条复核） |
| 验证链路可执行 | Pass（P0 §3 命令均为仓库真实命令） |

## Residual risks

- 归档顺序条件 C1 未满足前，本 change 不得 P5（与发起人「暂不归档」指示一致）。
- 参考图含「同路匹配」气泡与地点照片，均明确 out of scope；验收走查时需向发起人重申边界，避免再次感知落差。
- 旧 jar 感知问题靠 push 后 CD 重建闭环，P4 报告注明验证基线为源码 dev server。

## Next remediations（non-Gate）

- P2：`/sdd:delta-craft` AC/DoV 复核 + `/sdd:consistency-lint` + G1（条件 C1 入 decision）。
- P3：design.md 承载基线口径说明与视觉令牌表；atdd / tasks 按层分解。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| proposal.md | 工件 1 | WAYNE | 2026-11-16 |
| 本报告 | 报告 1 | WAYNE | 2026-11-16 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-16 |