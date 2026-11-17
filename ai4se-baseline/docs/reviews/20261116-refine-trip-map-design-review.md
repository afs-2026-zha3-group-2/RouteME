# Design review — refine-trip-map

- **Verdict: Pass**（以修复后状态评审）
- **Scope:** focus=design（artifact-review-gate 的 Design 轮次）；root=`ai4se-baseline`；timestamp=2026-11-16
- **Artifact under review:** [`design.md`](../../openspec/changes/refine-trip-map/design.md)（D1–D12）
- **Supporting inputs:** Delta Spec（WAYNE 已签）、`atdd-design.md`、`tasks.md`、spec-review F-1~F-3、参考图（发起人 2026-11-16）
- **Evidence:** 规则锚点 `rules/quality/rules.md#web-coding-style`（antd 优先 / 自绘例外登记）、`rules/process/rules.md#spec-first`；现状代码核对：`JsonListUtils` 已存在（stops/tags 同模式）、`chatMeeting.ts` 三函数收 string|null、`PlaceMap` 现有 aria-label 与 testid 清单

## Findings

| id | severity | rule | location | issue | result |
|---|---|---|---|---|---|
| F-1 | WARNING | `rules/testing/rules.md#web-testing` | D10 迁移回填 | 初稿用 SQLite `JSON_ARRAY`，H2 不支持，测试双库必挂 | **已修复**：改 `||` + REPLACE 双库兼容拼接；T2 双库验证；种子值无控制符前提登记 |
| F-2 | SUGGESTION | `rules/quality/rules.md#web-coding-style` | D6 浮层 | 地点卡 / 候选浮层自绘而非 antd Popover | 登记例外：SVG 锚定 + clamp 定位需自绘；按钮 / 输入仍 antd；视觉令牌与 antd 圆角阴影同源 |
| F-3 | SUGGESTION | `rules/process/rules.md#spec-first` | D1 focusedCity | 全省概览聚焦与 prop city 的优先级需明确，避免目的地切换后残留 | **已修复**：D1 明确 prop city 变化重置 focusedCity |

**Counts:** BLOCKER 0 / WARNING 1（已修复）/ SUGGESTION 2 → **Pass**

## 场景 → 设计覆盖

46 场景：D1（全省只聚焦 / 组件边界）、D2–D5（视觉 / 控制条 / 图例 / 比例尺）、D6（点击反馈）、D7（详情地图 / strip / 降级）、D8（距离）、D9（多值前端）、D10（契约 / 后端 / 迁移 / 旧数据）、D11（E2E 兼容）。无孤儿场景。

## Residual risks

- 视觉重做幅度大，P4 走查若与参考图观感仍有落差，按「令牌表 + 截图」对照微调，不扩 scope。
- 平滑路线 Catmull-Rom 在共线点退化为直线，单测覆盖端点与共线情形。

## Next remediations（non-Gate）

- 与 tasks-review 一并提请签署（design/tasks 工件：Jay + Neal；报告：WAYNE + Jay），然后 P4 按 T1→T12。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| design.md | 工件 1 | Jay（AO） | 2026-11-16 |
| design.md | 工件 2 | Neal（VL，非当前开发者且非 WAYNE） | 2026-11-16 |
| 本报告 | 报告 1 | WAYNE | 2026-11-16 |
| 本报告 | 报告 2 | Jay（AO） | 2026-11-16 |