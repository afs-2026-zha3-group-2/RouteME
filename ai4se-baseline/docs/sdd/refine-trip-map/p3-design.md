# P3 设计记录 — refine-trip-map

- **Change：** `refine-trip-map`｜ **阶段：** P3（Design & tasks）｜ **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

规格 → 可执行设计与任务：视觉令牌表、组件边界、点击反馈、详情地图、多值集合全链路、V17 双库兼容；E2E/UT 分层覆盖 46 场景。

## 2. 产出

- `design.md` D1–D12（Jay + Neal 签 2026-11-16）
- `atdd-design.md` E1–E10 / U1–U8 + 三档视口双主题走查
- `tasks.md` T1–T12（Jay + Neal 签 2026-11-16）
- `docs/reviews/20261116-refine-trip-map-design-review.md`（Pass；WAYNE + Jay 签）
- `docs/reviews/20261116-refine-trip-map-tasks-review.md`（Pass；WAYNE + Jay 签）

## 3. 评审修复

- design F-1（WARNING）：V17 回填弃 JSON_ARRAY，改 `||` + REPLACE 双库兼容拼接。
- design F-3：focusedCity 随 prop city 重置。
- spec F-1/F-2/F-3 落点：T5 全省只聚焦 / T5+T10 callout 语义 / T4 trim(U+3000) 单测。

## 4. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | design / tasks 工件 + 两份报告 | 2026-11-16 |
| VL | Neal | design / tasks 第二签署人 | 2026-11-16 |
| IO | WAYNE | 两份评审报告 | 2026-11-16 |

**阶段结论：Pass。** 下一步 P4：T1→T12。

## 5. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | `c6b0216` |
| P1 | `5f28d81` |
| P2 | `7634500` |
| P3 | 本阶段提交 |