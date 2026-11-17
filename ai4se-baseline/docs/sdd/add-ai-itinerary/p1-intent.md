# P1 意图记录 — add-ai-itinerary

- **Change：** `add-ai-itinerary`（REQ-017 / AI 智能行程推荐：基于地点、预算和天气生成游玩路线）｜ **阶段：** P1（Intent → proposal）
- **日期：** 2026-11-17｜ **记录人：** Jay（AO）（发起人 2026-11-17 确认本次实际开发者；第二签署人 Neal（VL））

## 1. 阶段目标

把发起人完整 User Story（输入旅行条件 → AI 结合地图 / 天气 / 预算推荐 → 编辑确认 → 保存为 RouteMe 行程）收敛为可判定提案：新能力 `ai-itinerary`（ADDED 8）+ `trip-plans`（ADDED 1「AI 行程保存为旅行计划」）；技术边界（高德管地图真相、Open-Meteo 管天气、AI 管推荐与估算）与 key 安全口径由发起人裁决。

## 2. 意图 → 故事映射

| 意图 | 承接 | 落点 |
|---|---|---|
| 输入 / 选择出发地、目的地（搜索 / 定位 / 地图点击） | ADDED「旅行条件输入与地点选择」 | `#/ai-planner` 左栏 |
| 日期 / 时长 / 预算 / 出行方式 / 兴趣 / 节奏 | ADDED「旅行条件输入与地点选择」 | 左栏表单 |
| AI 生成 ≥2 POI 完整行程（理由 / 顺序 / 时间 / 预算 / 天气建议） | ADDED「AI 行程生成与重新生成」 | 后端 DeepSeek 代理 + 右栏时间轴 |
| 天气实际参与推荐 + 注意事项 / 装备 | ADDED「真实天气参与推荐」 | 后端 Open-Meteo 代理 + 提示词注入 |
| 高德真实路线 / 距离 / 时间 + 编号 Marker 同步 | ADDED「地图验证与路线同步」 | 复用 AMap JS API 2.0 基础 |
| 删除 / 更换 / 调序 + 重算 | ADDED「行程编辑」 | 右栏列表 ↔ 地图 |
| 预算估算 + AI 估算标注 + 超预算降预算 | ADDED「预算估算与超预算反馈」 | 右栏预算卡 |
| Loading / Error / Retry，不伪造 | ADDED「外部服务失败状态」 | 三服务分区域 |
| 保存满意行程供匹配 / 同行 | ADDED「AI 行程快照保存」+ trip-plans「AI 行程保存为旅行计划」 | V18 + 契约 0.12.0 + 发布预填 |

## 3. 产出

- `openspec/changes/add-ai-itinerary/proposal.md`（WAYNE 签 2026-11-17）
- P1 Delta 草稿 `specs/ai-itinerary/spec.md`（8 Requirement / 36 Scenario）+ `specs/trip-plans/spec.md`（1 Requirement / 5 Scenario）；P2 逐条复核
- `docs/reviews/20261117-add-ai-itinerary-proposal-review.md`（Pass；WAYNE + Jay 签 2026-11-17）
- `requirement-workspace/registry.md` REQ-017 登记

## 4. 关键裁决（发起人 2026-11-17）

1. 当前开发者 Jay（AO）；design / tasks 第二签署人 Neal（VL）；proposal / spec 与报告签署按矩阵弹窗批准。
2. 收编 `feat/amap-jsapi` 在途 AMap 工作为本 change P4 实现基线（分支 `feature/add-ai-itinerary`），不丢弃、不重复实现。
3. AI 走后端 OpenAI 兼容代理接 DeepSeek；key 配置在 application 配置层——按 `no-hardcoded-secrets` 落为 `application.yaml` 环境变量占位 + gitignore `ai-local.yml` 本地覆盖（沿用 `amap-local.yml` 模式），真实 key 不提交。
4. P0–P4 每阶段一提交，push 前先 pull；P5 暂不执行、不归档。
5. 天气由后端在 generate 内自取并注入提示词（评审 F-1 收口），随方案返回天气摘要；`GET /api/weather/forecast` 供预览与重试。

## 5. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 承担 P2–P4 实现与阶段记录 | 2026-11-17 |
| IO | WAYNE | proposal 签署（需求来源与跨能力影响） | 2026-11-17 |
| SM | 待签署 | P1 范围与排期（迭代 2 / 8 点） | 待签署 |

**阶段结论：Pass。** 下一步 P2：AC/DoV 复核 → 一致性检查 → G1（无归档顺序条件）。

## 6. 提交与偏离记录

- **阶段提交：** `docs(p1): add-ai-itinerary proposal and delta draft for AI itinerary recommendation`；push 前 `git pull --rebase origin main`。
- **validate：** `openspec validate add-ai-itinerary --strict` valid；`deltaCount: 9`，无 INFO / WARNING。
- **偏离：** 无。P0 记录中「key 配置在 application.yml」按安全规则落为本地覆盖文件，已在提案决策与评审报告说明并经发起人批准。