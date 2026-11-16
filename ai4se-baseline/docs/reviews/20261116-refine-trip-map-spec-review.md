# Spec review — refine-trip-map

- **Verdict: Pass**
- **Scope:** focus=spec（artifact-review-gate 的 Delta Spec 轮次）；root=`ai4se-baseline`；timestamp=2026-11-16
- **Artifact under review:** [`specs/trip-plans/spec.md`](../../openspec/changes/refine-trip-map/specs/trip-plans/spec.md)（MODIFIED 4 + ADDED 1 / 46 Scenario）
- **Supporting inputs:** `dov-ac-review.md`（AC 8/8 + DoV 5/5）、`consistency-lint.md`（Pass / C1）、proposal（WAYNE 已签）、Living + `add-trip-publish` / `refine-trip-chat` 增量
- **Evidence:**
  - 基线保留机器核对：发布 18/18、详情 6/6、地图上下文 5/5 + 1 显式取代、维护 5/5；missing=[]
  - `openspec validate refine-trip-map --strict` → valid（1 INFO 归档顺序，C1）
  - 规则锚点：`rules/process/rules.md#spec-first`、`rules/documentation/rules.md#sdd-artifacts`、`rules/testing/rules.md#web-testing`

## Findings

| id | severity | rule | location | issue | result |
|---|---|---|---|---|---|
| F-1 | SUGGESTION | `rules/process/rules.md#spec-first` | MODIFIED 地图上下文「未选目的地时展示全省概览」 | 「概览不直接写入途经点」改变现状点击城市入 stops 的行为，需 P4 任务显式改造，避免实现遗漏 | 带入 P3：tasks 含「全省概览点击只聚焦」任务；atdd 含对应 E2E |
| F-2 | SUGGESTION | `rules/testing/rules.md#web-testing` | ADDED / MODIFIED 浮层场景 | 既有 E2E 依赖 `.map-callout` + 「加入路线」语义；新候选浮层需保留语义或同批更新断言 | 带入 P3：atdd 明确「候选浮层保留 data-testid=map-callout 与加入路线动作」或更新断言清单 |
| F-3 | SUGGESTION | `rules/documentation/rules.md#sdd-artifacts` | MODIFIED 发布「多个集合区域去重与 trim」 | 场景 Given 用全角空格示例「 陈家祠 」，实现需按 JS trim 口径（含全角空格 U+3000） | 带入 P3 design：trim 口径 = `String.trim()`（覆盖 U+3000），单测固化 |

**Counts:** BLOCKER 0 / WARNING 0 / SUGGESTION 3（均带入 P3）→ **Pass**

## 场景 → AC 覆盖

见 `dov-ac-review.md` §1（8/8）。46 场景中 35 为基线保留、1 为显式取代、10 为新增（发布 2 / 详情 1 / 地图上下文 4 / ADDED 4，含取代补位）。

## Residual risks

- C1 归档顺序：P5 前必须 `add-trip-publish` / `refine-trip-chat` 先归档；与「暂不归档」指示共存，不阻塞 P2–P4。
- 视觉「导航风」为参考图口径，P3 需以令牌表 + 预览固化，避免 P4 走查再返工。

## Next remediations（non-Gate）

- G1 签署（IO=WAYNE / SA=Karena）后进入 P3：design（视觉令牌表 + 基线口径说明）/ atdd / tasks。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| specs/trip-plans/spec.md | 工件 1 | WAYNE | 2026-11-16 |
| 本报告 | 报告 1 | WAYNE | 2026-11-16 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-16 |