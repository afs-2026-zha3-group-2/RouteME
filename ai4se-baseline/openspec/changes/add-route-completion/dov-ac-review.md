# AC / DoV review — add-route-completion

- **Change：** `add-route-completion`
- **Delta：** [`specs/route-completion/spec.md`](specs/route-completion/spec.md)（ADDED 6 Requirement / 18 Scenario）
- **需求：** [`REQ-030-route-completion.md`](../../requirement-workspace/requirements/REQ-030-route-completion.md)（S31-1 ~ S31-19，19 条提示；S31-3 与 S31-15 在 Delta 合并为同一场景）
- **日期：** 2026-11-18 ｜ **阶段：** P2（delta-craft review）
- **工具：** `openspec validate add-route-completion --strict` → `Change 'add-route-completion' is valid`；`openspec show --json` → 6 个 Delta 条目均为 `route-completion`，Requirement 6 / Scenario 18

## P2 定稿的歧义（原 P1 评审 F-1 / F-3）

| 歧义 | 定稿 | 依据 |
|---|---|---|
| 数据不足时 `route_completion_rate` 的 JSON 形态 | **省略该字段**（值语义为空）；前端把「缺失」与 `null` 同等视为数据不足 | 沿用 `UserProfileResponse` 类级 `@JsonInclude(NON_NULL)` 与 `openapi.yaml` 既有可空字段约定（`nullable: true` 且不入 `required`）；用户 2026-11-18 裁决 |
| `route_completion_state` 的契约强度 | **恒返回，列入 `UserProfile.required`** | 状态恒为非空枚举串；与 `credit_level` 现有写法一致；用户 2026-11-18 裁决 |

## Acceptance criteria（AC）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每条 Requirement 至少一个可测试 AC | Pass | 6 条 Requirement 的场景数分别为 2 / 2 / 5 / 6 / 2 / 1，共 18 个 Scenario，均可观察 | 无空 Requirement |
| AC-2 AC 可观察 | Pass | 字段出现 / 省略、状态码四档、百分比文案（85 / 75 / 55）、固定文案、401 / 404、`credit_*` 与 `stats` 不变、账本无记录均可断言 | 无「正常 / 合理 / 适当」类措辞 |
| AC-3 高风险分支有负向 / 边界场景 | Pass | 80 / 79 / 70 / 69 / 0 / 100 边界、非整数 / 负数 / >100 降级、无数据不得显示 0%、缺失与 `null` 双兼容、未登录 401 / 未知用户 404、独立性回归 | 失败安全：非法值 MUST NOT 落入 `good` |
| AC-4 不混入实现细节 / 模糊词 | Pass | 只写可观察行为（响应字段、状态码、文案、既有字段不变）；「前端不存在 80 / 70 阈值判断」以代码检索可验证的禁止性约束表述，不指定类 / 方法结构 | 派生函数落点与命名留给 P3 |

**AC：4/4 Pass。**

## Definition of verified（DoV）

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与提案一致 | Pass | proposal What Changes 6 组 ↔ Delta 6 条 Requirement；Out of Scope（打卡 / 聚合算法 / 数据库 / 其他展示面 / 信用与成长等级）在 Delta 无扩张；提案「18 Scenario」与 Delta 实际计数一致 | 无静默扩张 |
| DoV-2 歧义已列出或解决 | Pass | 空值序列化与 `required` 已在本文档定稿并回写 Delta、提案、Ready、deep-dive；未来聚合算法与单行程口径明确留给后续卡片 | 无 blocking 歧义 |
| DoV-3 IO / SA 残余风险已记录 | Pass | 见「Residual risks」；G1 记录固化 IO = WAYNE、SA = Jacky / Karena 的跟踪项 | 视觉色阶、聚合算法、契约版本 |
| DoV-4 不以业务实现冒充完成 | Pass | P2 只做 Delta 收敛、AC/DoV 复核与文档同步；未写代码、`openapi.yaml`、迁移 | `openspec validate --strict` 通过 |
| DoV-5 Requirement 追溯到提案 / 需求 | Pass | S31-1 ~ S31-19 → 6 条 Requirement（S31-3 与 S31-15 合并）；提案验收信号 10 条与场景组可追；无孤儿 Scenario | 映射见下 |

**DoV：5/5 Pass。**

## 场景映射（19 条 REQ 提示 → 18 个 Delta 场景）

| Requirement | Delta Scenario | REQ 提示 |
|---|---|---|
| 预留路线完成度字段与数据不足口径 | 接口返回预留字段 / 本期恒为数据不足 | S31-1 / S31-2 |
| 数据充足判定与统计范围 | 足够数据门槛 / 只统计已结束行程 | S31-4 / S31-5 |
| 阈值派生与后端权威 | 信誉良好边界 / 中性区间边界 / 警惕边界 / 非法数值降级 / 状态由后端派生 | S31-6 ~ S31-10 |
| 个人主页展示路线完成度 | 个人主页展示入口 / 信誉良好展示 / 中性展示 / 警惕展示与措辞边界 / 数据不足展示 / 本人 / 他人同口径 | S31-11 ~ S31-16；S31-3 与 S31-15 合并为「数据不足展示」 |
| 与信用分、资料统计及成长等级相互独立 | 与信用分独立 / 与资料统计、成长等级独立 | S31-17 / S31-18 |
| 资料响应兼容与访问控制 | 既有访问控制与兼容 | S31-19 |

## Residual risks

- 本版本全部用户为 `insufficient`，`good` / `neutral` / `watch` 只能通过夹具或接口拦截模拟；真实数据路径依赖未来打卡聚合卡片。
- 未来聚合算法（单行程均值 vs 打卡点加权）未定；若与本 Delta 的「已完成行程 + 发布者 / `ACCEPTED` 同行者」口径冲突，需先改规格。
- 契约版本依赖合并顺序：当前 `0.25.0`，本 change 预计 `0.26.0`，被在途 change 抢占时整体顺延并同步 `OpenApiTest`。
- `neutral` / `insufficient` 的色阶与行高未定，P3 按原型先行并做 1440 / 1024 / 768 / 390 × 深浅色走查。
- 文案固定为「信誉良好 / 请留意行程完成情况 / 暂无足够完成记录」；若产品改文案，需同步 i18n 与 E2E 断言。

## Conclusion

**G1-ready（AC 4/4 + DoV 5/5）。** 本文件不是 G1 决策；G1 由 IO + SA 具名签署。
