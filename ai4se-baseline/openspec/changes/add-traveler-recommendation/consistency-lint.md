# 一致性检查 — add-traveler-recommendation

- **Change：** `add-traveler-recommendation`
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **输入：** `proposal.md`、`specs/trip-recommendations/spec.md`、`requirement-workspace/requirements/REQ-024-traveler-recommendation.md`

## 1. 计数与结构

| 项 | 值 |
|---|---|
| 变更能力数 | 1（`trip-recommendations` ADDED） |
| Requirement 数 | 7 |
| Scenario 数 | 19 |
| Delta 类型 | 纯 ADDED（无 MODIFIED / REMOVED） |
| `openspec validate --strict` | valid |

> 说明：需求条目 §4 列出 S24-1 ~ S24-16 共 16 条验收场景；Delta 为覆盖「加载 / 失败 / 空 / 重算」等前端状态，拆成 19 个 Given/When/Then。映射见 §3，无未覆盖项。

## 2. 一致性结论

| 维度 | 结论 | 说明 |
|---|---|---|
| 提案 → Delta | Pass | in-scope 的 7 项全部有 Requirement；out-of-scope 未出现在 Delta |
| Delta → 需求 | Pass | AC-1 ~ AC-16 均有 Requirement + Scenario 承接 |
| 术语 | Pass | 「推荐项」「参照行程」「分项得分」「共同兴趣」全文一致 |
| 阈值单点 | Pass | 50 / 30 / 20 / 10 / 上限 20 / 上限 100 只在「可解释的规则评分与分项得分」出现 |
| 既有能力影响 | Pass | `trip-companions` / `trip-plans` 无 MODIFIED / REMOVED |
| 契约 | Pass（待 P4） | 0.19.0 在 P4 落地时核对；本阶段只声明 |
| 迁移 | N/A | 无数据库改动 |

## 3. AC → Requirement 映射

| AC | Requirement |
|---|---|
| AC-1 / AC-12 | 按行程推荐同行者 |
| AC-2 | 候选筛选与基础匹配条件 |
| AC-3 / AC-4 / AC-5 / AC-6 / AC-7 / AC-8 | 可解释的规则评分与分项得分 |
| AC-9 / AC-10 | 推荐排序 |
| AC-15 | 同一用户只推荐一条 |
| AC-11 / AC-14 / AC-16 | 推荐结果内容 |
| AC-11 / AC-12 / AC-13 / AC-16 | 详情页推荐视图 |

## 4. 问题统计

**BLOCKER 0 / WARNING 0 / SUGGESTION 2 / N/A 2**

| id | severity | 说明 | 处理 |
|---|---|---|---|
| L-01 | SUGGESTION | Scenario 数（19）多于需求条目场景数（16） | 已在本文件 §1 说明拆分理由，P3 对齐自检逐条映射 |
| L-02 | SUGGESTION | 共同兴趣取行程标签，与「用户兴趣」字面略有差异 | Delta 已写明「候选行程标签 ∩ 当前用户兴趣」，P1 评审 F-3 已承接 |