# Artifact review — add-growth-level / spec

- **Verdict: Pass（建议）**
- **Scope:** focus=spec（`@rule:artifact-review-gate` 的 P1 Delta Spec 草稿评审）；root=`ai4se-baseline`；timestamp=2026-11-18
- **Artifact under review:** [specs/user-growth/spec.md](../../openspec/changes/add-growth-level/specs/user-growth/spec.md)
- **Supporting inputs:**
  - [proposal.md](../../openspec/changes/add-growth-level/proposal.md)（同日提案）
  - [requirements/REQ-029-growth-level.md](../../requirement-workspace/requirements/REQ-029-growth-level.md)（41 场景）
  - [intents/REQ-029-growth-level.md](../../requirement-workspace/intents/REQ-029-growth-level.md)（D1–D15）
  - [deep-dive.md](../../requirement-workspace/deep-dive.md)「REQ-029 增补」（①–④ 四表）
  - [impact-brief.md](../../requirement-workspace/impact-brief.md) §29
  - 前序评审：[20261118-add-growth-level-proposal-review.md](20261118-add-growth-level-proposal-review.md)
- **Evidence:**
  - `openspec validate add-growth-level --strict` → `Change 'add-growth-level' is valid`
  - Delta 统计：`user-growth` **ADDED**，9 Requirement / 41 Scenario；无 MODIFIED / REMOVED
  - 需求映射：REQ-029 §4 的 L / P / K / D / R / V / C / S 八组均能在 Delta 中找到对应 Requirement / Scenario
  - 规则核对：`rules/process/rules.md#spec-first`、`#artifact-review-gate`；`rules/architecture/rules.md#api-contract`；`rules/testing/rules.md#java-testing`、`#web-testing`；`rules/documentation/rules.md#sdd-artifacts`、`#document-conventions`
  - 基线一致性：`openapi.yaml` 0.25.0；迁移头 V30；`origin/main@71f3ad4`

## Review checks

| # | 检查 | 结论 |
|---|---|---|
| 1 | Delta 是否只做 ADDED、是否纯新增能力 | Pass：仅 `user-growth` ADDED；不修改 `user-credit` / `trip-experiences` / `admin-console` |
| 2 | Requirement / Scenario 是否可判定 | Pass：9 Requirement / 41 Scenario，均含 Given / When / Then / And |
| 3 | 等级边界是否闭合 | Pass：0–99 / 100–199 / 200–299 / 300–399 / 400+；99→100、399→400、LV5 继续累计、扣减回退 |
| 4 | 发布经验是否防重复 | Pass：按（行程, 作者）幂等；编辑 / 重复 / 删除重建 / 未完成行程均有边界 |
| 5 | 获赞经验是否防刷 | Pass：单篇分档、档位锁定、取消不回滚、重新点赞不重复、自赞拒绝、多篇独立 |
| 6 | 每日上限是否可验证 | Pass：+20、Asia/Shanghai、跨档按剩余额度截断、档位锁定、零实发留痕、负向不受限 |
| 7 | 举报扣减是否可验证 | Pass：RESOLVED −50、每份一次、REJECTED 0、不足 50 扣到 0、历史不回填 |
| 8 | 流水与只读约束是否完整 | Pass：append-only、等式、来源 / 前后快照 / 关联 / 幂等、无客户端写入口、用户不存在沿用错误 |
| 9 | 展示 / 可见性是否覆盖 issue 落点 | Pass：6 处展示面；本人可见经验、他人只见等级；LV5 已满级；与信用分文案区分；批量只读 |
| 10 | 并发 / 幂等是否覆盖三条写路径 | Pass：发布 / 点赞 / 举报各有并发场景；幂等键唯一约束兜底 |

## Findings

| severity | status | location | issue | fix hint |
|---|---|---|---|---|
| WARNING | carried to P3 | Delta「举报成立扣减经验」/ 同一举报重复处理 | 重复处理的响应形态未写死：可能返回既有 `ReportNotProcessingException`（409/409 语义）或静默 no-op | P3 `design.md` 明确沿用既有异常；E2E 断言「不产生第二次扣减」而非响应成功 |
| WARNING | carried to P3 | Delta「成长等级的展示与可见性」/ 他人只可见等级 | 既有 `/profile` 与 `/users/credits` 为本人 / 他人共用；「他人不返回经验值」需要按调用者分支响应 | P3 明确字段级可见性：本人返回经验与距下一级，他人省略；批量只返回等级 |
| SUGGESTION | carried to P3 | Delta「体验获赞经验」/ 有效点赞 | 受限 / 封禁用户的点赞是否计入有效赞沿用现状，未在本 Delta 定义 | 保持 `experience_likes` 行口径；如需变更另开需求（OQ-7） |
| SUGGESTION | carried to P2 | Delta 全局 | 41 场景为 P1 草稿量；部分场景可在 P2 合并同义项 | P2 delta-craft 时保留可观察断言，合并重复语义并更新 REQ 映射 |
| SUGGESTION | carried to P3 | Delta「成长等级的展示与可见性」/ 同行者卡片 | 卡片新增 `LVn` 可能影响卡片高度与 390px 布局 | P3 原型先行；四档宽度 × 浅 / 深色走查 |

## Conclusion

**Pass（建议）**：0 BLOCKER / 2 WARNING / 3 SUGGESTION。两份 WARNING 均为 P3 设计口径（重复处理的响应形态、字段级可见性），不阻塞进入 P2；SUGGESTION 带入 P2 / P3。

## 签署记录

| 对象 | 签署位 | 批准人 | 批准时间 |
|---|---|---|---|
| spec | 工件（WAYNE） | WAYNE | 2026-11-18 |
| spec-review | 报告（WAYNE） | WAYNE | 2026-11-18 |
| spec-review | 报告（当前开发者 Jay） | Jay | 2026-11-18 |
