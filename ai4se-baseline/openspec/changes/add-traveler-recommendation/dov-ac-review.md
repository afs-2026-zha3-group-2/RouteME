# DoV / AC review — add-traveler-recommendation

- **Change：** `add-traveler-recommendation`（`trip-recommendations` ADDED）
- **日期：** 2026-11-17 ｜ **记录人：** Jay（AO）
- **Delta Spec：** `openspec/changes/add-traveler-recommendation/specs/trip-recommendations/spec.md`

## 1. 验收标准覆盖（AC 16/16）

| AC | 内容 | Delta Requirement | Scenario | 结论 |
|---|---|---|---|---|
| AC-1 | 进入已发布行程详情后自动计算 | 按行程推荐同行者 | S-1 | Pass |
| AC-2 | 排除本人 / 已取消 / 基础条件不满足 | 候选筛选与基础匹配条件 | S-3 / S-4 / S-5 | Pass |
| AC-3 | 分数由后端统一计算 | 可解释的规则评分与分项得分 | S-6 ~ S-10 | Pass |
| AC-4 | 可解释规则并返回总分与明细 | 可解释的规则评分与分项得分 / 推荐结果内容 | S-6 ~ S-10 / S-14 / S-15 | Pass |
| AC-5 | 目的地相同 +50 | 可解释的规则评分与分项得分 | S-6 | Pass |
| AC-6 | 出发日期相同 +30 | 可解释的规则评分与分项得分 | S-7 | Pass |
| AC-7 | 出发日期相差 1 天 +20 | 可解释的规则评分与分项得分 | S-8 | Pass |
| AC-8 | 每个共同兴趣 +10，最多 +20 | 可解释的规则评分与分项得分 | S-9 | Pass |
| AC-9 | 按总分从高到低 | 推荐排序 | S-11 | Pass |
| AC-10 | 同分优先日期更接近 | 推荐排序 | S-12 | Pass |
| AC-11 | 展示「为什么推荐给你」 | 推荐结果内容 / 详情页推荐视图 | S-14 / S-15 / S-17 | Pass |
| AC-12 | 无匹配结果显示空状态 | 按行程推荐同行者 / 详情页推荐视图 | S-2 / S-16 | Pass |
| AC-13 | 修改目的地 / 日期 / 兴趣后重算 | 详情页推荐视图 | S-18 | Pass |
| AC-14 | 至少返回用户、行程、总分、原因、共同兴趣 | 推荐结果内容 | S-14 | Pass |
| AC-15 | 同一用户多条行程只显示最高分 | 同一用户只推荐一条 | S-13 | Pass |
| AC-16 | 接口与 UI 解耦、可扩展 | 推荐结果内容 / 详情页推荐视图 | S-14 / S-17 | Pass |

## 2. DoV 检查（5/5）

| id | 检查 | 结论 | 说明 |
|---|---|---|---|
| DoV-1 | 场景可判定（Given/When/Then，输入 → 预期） | Pass | 16 个场景均可由接口响应或页面断言验证 |
| DoV-2 | 阈值与文案单点 | Pass | 50 / 30 / 20 / 10 与上限只出现在一个 Requirement 与后端纯函数 |
| DoV-3 | 边界与异常覆盖 | Pass | 0 分、无候选、同分、多条行程、失败与重试均有用例 |
| DoV-4 | 与既有规格不冲突 | Pass | `trip-companions` 既有匹配需求不改写；本能力独立 ADDED |
| DoV-5 | 术语一致 | Pass | 「匹配总分」「分项得分」「共同兴趣」「参照行程」单一写法 |

## 3. 基线保留

- `trip-companions` 既有「展示可解释的匹配原因」与 `/matches` 行为保持原样：**4/4 场景保留**。
- `trip-plans` 详情页既有展示不变，只新增区块。

## 4. 结论

**Pass：AC 16/16 + DoV 5/5 + 基线保留 4/4。** 无 blocking 开放问题。