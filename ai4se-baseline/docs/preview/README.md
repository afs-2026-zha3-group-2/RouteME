# 走查截图与设计参考索引

本目录只放**可追溯的**界面证据：每个变更一个子目录，目录名与 change-id 一致。命名与准入规则见
`@rule:sdd-artifacts`（`docs/knowledge/rules/documentation/rules.md#sdd-artifacts`）。

- 根目录不放图；新图一律进子目录。
- 走查截图：`<screen>-<viewport>-<theme>.png`（viewport `390` / `768` / `1440`，theme `light` / `dark`）。
- 设计参考稿：`ref-<topic>.png`，与走查截图同目录但前缀不同。
- 临时截图（`_tmp-*` / `tmp-*`）与调试脚本不入库。

| 目录 | 对应 change / REQ | 内容 | 维护人 | 最近更新 |
|---|---|---|---|---|
| `add-ai-itinerary/` | `add-ai-itinerary`（REQ-017） | AI 规划页与详情 9 张走查截图 + 预填 + `walkthrough-report.json`；`ref-ai-planner.png` 为设计参考 | Jay | 2026-11-17 |
| `add-trip-weather/` | `add-trip-weather`（REQ-022） | 发布页天气卡三档视口 × 双主题 6 张 | Jay | 2026-11-17 |
| `publish-redesign/` | 待补 change（发布页改版进行中） | 参考稿三张：六屏总览、发布页基础版、发布页完整版 | Jay | 2026-11-17 |

新增子目录时同步本表一行；change 归档后把该行标注「已归档」，目录本身不移动。

## 待补

- `add-admin-dashboard`（REQ-023）的 8 张看板走查图尚未入库（此前只留在会话工作区，未提交即丢失）。
  该 change 归档前需要补跑截图脚本，写入 `docs/preview/add-admin-dashboard/` 后再在本表登记。
- 旧路径 `docs/preview/refine-trip-map-*.png`、`docs/preview/r2-*.png` 已随历史清理删除；
  需要这些图时按对应 `docs/ai4se-plugins/*-local-verify-report.md` 记录的脚本重新生成。