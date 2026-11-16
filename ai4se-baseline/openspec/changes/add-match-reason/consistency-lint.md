# 一致性检查 — add-match-reason

- **Change：** `add-match-reason`｜ **检查时间：** 2026-11-16｜ **检查人：** Jay（AO）
- **范围：** 变更包工件与 `@rule:sdd-artifacts` / `@rule:spec-first` 的对齐（手工检查）

## 检查结果

| id | 检查项 | 结果 | 证据 |
|---|---|---|---|
| C-01 | 变更包在 `openspec/changes/<change-id>/` 且自包含 | Pass | proposal / design / tasks / specs / dov-ac-review / g1 / atdd-design / consistency-lint / g2 |
| C-02 | `<change-id>` 为动词开头 kebab-case | Pass | `add-match-reason` |
| C-03 | `<capability>` 为名词短语 kebab-case | Pass | `trip-companions` |
| C-04 | 一个 change 只改一个 capability | Pass | 仅 `trip-companions`（MODIFIED） |
| C-05 | Delta Spec 使用 ADDED / MODIFIED 结构 | Pass | `## MODIFIED Requirements` + 1 Requirement |
| C-06 | 每条 Scenario 有 Given / When / Then | Pass | 9/9 |
| C-07 | 规格中不出现类名、表名作验收条件 | Pass | 只描述分值与文案；端点名仅出现在提案影响面 |
| C-08 | `tasks.md` 一条任务一层并给出验证命令 | Pass | T1 contract / T2–T3 backend / T4 frontend / T5 e2e / T6 docs |
| C-09 | 契约先于两端 | Pass | 契约无变更，T1 只做核对 |
| C-10 | 术语一致（匹配度 / 匹配理由 / 参照 / 共同兴趣） | Pass | 与 living spec、`tripMessages` 一致 |
| C-11 | 决策记录使用固定文件名 | Pass | `g1-decision.md`；`g2-decision.md` 于 P4 |
| C-12 | 验证报告位于 `docs/ai4se-plugins/<时间戳>-<本地验证>-report.md` | Pass | `20261116-101500-local-verify-report.md` |

## 告警

| id | 级别 | 内容 | 处置 |
|---|---|---|---|
| W-01 | WARNING | 卡片由「数字在环内」改为「文字匹配度 N%」，属可见视觉变化 | 已在 ATDD §3 明确约束；视觉细节仍归 `design-system`，如需微调另开样式 change |
| W-02 | WARNING | change 包在开工时已存在（先建包后补阶段记录），门禁工件按阶段补建 | 以 `docs/sdd/add-match-reason/` 的阶段记录补齐时序；归档前统一复核 |
| S-01 | SUGGESTION | 参照物只取最近一条未结束行程 | 记为后续优化，不阻塞 |
| S-02 | SUGGESTION | `companions.spec.ts` 其余用例（申请→聊天→退出）仍用失效选择器 | 属 S12/S13，登记在验证报告 |

## 结论

- **BLOCKER：0**｜ **WARNING：2**｜ **SUGGESTION：2**
- 结论：可进入 P3 收尾并申请 P4。