# AC / DoV review — add-report-credit-deduction

- **Change：** `add-report-credit-deduction`｜ **阶段：** P2（Delta craft review）｜ **日期：** 2026-11-18
- **Delta：** `specs/user-credit/spec.md`（ADDED：3 Requirement / 16 Scenario）、`specs/admin-console/spec.md`（MODIFIED：1 Requirement / 20 Scenario）
- **输入：** `proposal.md`（D1–D5 / R-1 ~ R-26）、`requirements/REQ-028-report-credit-deduction.md`、基线 `add-admin-console` 的「举报详情与处理」
- **校验：** `openspec validate add-report-credit-deduction --strict` → `Change 'add-report-credit-deduction' is valid`

## Acceptance criteria

| Item | Result | Evidence | Notes |
|---|---|---|---|
| AC-1 每个 Requirement 至少一条可测 AC | Pass | `user-credit` 3 Requirement → 16 Scenario；`admin-console` 1 Requirement → 20 Scenario | 每个 Requirement 均有 Given / When / Then |
| AC-2 AC 可观测 | Pass | 断言落在分数值、账本字段（`reason_code` / `related_type` / `related_id` / `applied_delta`）、举报状态、HTTP 状态码、预览三段文本、限制记录 | 无「运行正常」类断言 |
| AC-3 高风险负例 / 边界 | Pass | 类型缺失 / 非法类型 / `OTHER` 未选档位 → 400；0 分截断；并发只生效一次；已受限再次扣分；被举报用户不可推导；历史举报空值降级 | 新增历史数据降级场景（本回合收敛） |
| AC-4 AC 不是伪装的实现细节 | Pass | 场景描述行为与可观察结果；未绑定类名 / 方法名 / SQL | 字段名属于账本数据契约，非实现细节 |

## Definition of verified

| Item | Result | Evidence | Notes |
|---|---|---|---|
| DoV-1 范围与 proposal 一致 | Pass | D1–D5 在 Delta 均有对应：D1 表单解耦、D2 仅账本、D3 低分联动、D4 OTHER 四档、D5 记录人 | 无静默扩缩范围 |
| DoV-2 歧义已列出或解决 | Pass | 本回合收敛 2 处：驳回场景统一为「驳回说明」；历史举报无新字段时明确「空值降级、不报错」 | 非阻塞 OQ-1 ~ OQ-5 保留至 P3 |
| DoV-3 IO / SA 残余关切已记录 | Pass | F-2 待 G1 追认 D1 对 `add-admin-console` 2 条基线场景的替换；归档顺序约束 | 见 P1 评审与 `consistency-lint.md` |
| DoV-4 未声明业务实现已完成 | Pass | P2 未写业务代码 | — |
| DoV-5 Delta Requirement 可追溯到 proposal | Pass | 3 + 1 Requirement 均可追溯到 R-1 ~ R-26 与 REQ-028 场景组 | R-23 / R-24 / R-25 由既有能力与基线权限 Requirement 承接，proposal 已注明「沿用」 |

## 场景映射抽验

| Proposal | Delta |
|---|---|
| R-1 ~ R-5 | `user-credit`「七类固定扣分」「其他原因四档」「违规类型缺失」「非法违规类型或档位」「扣分值由服务端派生」 |
| R-6 ~ R-10 | `user-credit`「成立扣分并生成记录」「不成立不扣分」「同一举报只扣一次」「并发处理只生效一次」「0 分截断仍留记录」 |
| R-11 ~ R-13 | `admin-console`「成立预览三段」「预览按 0 截断」「不成立无扣分预览」 |
| R-14 ~ R-17 | `user-credit`「记录字段完整」「不受月度加分上限影响」「账户缺失按初始分建立」 |
| R-15 | `admin-console`「已处理详情展示违规类型与扣分」「历史举报降级展示」 |
| R-18 ~ R-20 | `user-credit`「跌破 60 自动限制」「恰好 60 不触发限制」「已受限用户再次扣分」 |
| R-21 / R-22 | `admin-console`「成立表单只保留违规类型与违规原因」「成立后账号状态不变」「被举报用户已受限时仍只扣分」 |
| R-23 | 基线 `admin-console` 用户管理 Requirement + P3 回归用例承接（本 Delta 不改） |
| R-24 / R-25 | 基线 `admin-console` 权限与状态守卫 Requirement 承接；本 Delta 显式保留 409 `REPORT_NOT_PROCESSING` |
| R-26 | `admin-console`「被举报用户不可推导」 |

## 本回合收敛

1. `admin-console` Requirement 增加「历史举报无违规类型 / 实际扣分时以空值降级展示、不报错」。
2. 新增场景「历史举报降级展示」（`admin-console` Scenario 20）。
3. 「举报不成立」场景的输入措辞由「违规原因」改为「驳回说明」，与 Requirement 的处理说明定义一致。

## 结论

**结论：Pass（G1-ready，待具名签署）。** 无 BLOCKER；无阻塞 DoV 缺口。F-2 需 G1 时由 SA 具名追认 D1 的替换语义。
