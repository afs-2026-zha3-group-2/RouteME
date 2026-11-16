# 一致性检查 — add-trip-publish

- **Change：** `add-trip-publish`｜ **检查时间：** 2026-11-16｜ **检查人：** Jay（AO）
- **范围：** 变更包工件与 `@rule:sdd-artifacts` / `@rule:spec-first` 的对齐（手工检查，仓库未引入自动 linter 脚本）

## 检查结果

| id | 检查项 | 结果 | 证据 |
|---|---|---|---|
| C-01 | 变更包在 `openspec/changes/<change-id>/` 且自包含 | Pass | proposal / design / tasks / specs / dov-ac-review / g1 / atdd-design / consistency-lint / 验证报告引用 |
| C-02 | `<change-id>` 为动词开头 kebab-case | Pass | `add-trip-publish` |
| C-03 | `<capability>` 为名词短语 kebab-case | Pass | `trip-plans` |
| C-04 | 一个 change 只改一个 capability | Pass | 仅 `trip-plans`（MODIFIED） |
| C-05 | Delta Spec 使用 ADDED / MODIFIED 结构 | Pass | `## MODIFIED Requirements` + 1 Requirement |
| C-06 | 每条 Scenario 有 Given / When / Then | Pass | 11/11 |
| C-07 | 规格中不出现类名、表名、接口路径作验收条件 | Pass | 仅业务字段与可见行为；`POST /api/trips` 仅出现在「后端独立校验」场景的**输入**描述里，断言仍为 400 与数据未变化 |
| C-08 | `tasks.md` 一条任务一层并给出验证命令 | Pass | T1 contract / T2 backend / T3–T4 frontend / T5 e2e / T6 docs |
| C-09 | 契约先于两端 | Pass | 契约无变更，T1 只做核对；T2 起才动后端断言 |
| C-10 | 术语一致（计划人数 / 已加入人数 / 途经点 / 出发日期） | Pass | 与 living spec 及 `tripMessages` 用词一致 |
| C-11 | 决策记录使用 `g1-decision.md` / `g2-decision.md` 固定名 | Pass | 已建 `g1-decision.md`，`g2-decision.md` 于 P4 提交 |
| C-12 | 验证报告位于 `docs/ai4se-plugins/<时间戳>-<技能名>-report.md` | Pass | `20261116-100500-local-verify-report.md` |

## 告警

| id | 级别 | 内容 | 处置 |
|---|---|---|---|
| W-01 | WARNING | 故事原始口径「人数 ≥ 1 的整数」与实现的 `2–12` 存在字面差异 | 已在 P1 裁定并在 Delta Spec 主句写明「含发布者，`capacity = 1` 越界」；归档时同步 living spec |
| W-02 | WARNING | 变更包跨两个阶段新增门禁工件（P2 建 g1，P4 建 g2），而 `@rule:sdd-artifacts` 的检查点在归档前统一校验 | 以 `docs/sdd/<change-id>/` 的阶段记录补齐时序证据；归档前一次性复核 |
| S-01 | SUGGESTION | `e2e` 未纳入 CI，端到端证据只能本地复现 | 已登记在验证报告 §5 与 G2 条件 |
| S-02 | SUGGESTION | `TripMatchTest` 所在目录与包名不一致（`routeme/model` vs `package routeme.pojo`），增量编译会留陈旧 class | 与本 change 无关，登记为独立清理项 |

## 结论

- **BLOCKER：0**｜ **WARNING：2**｜ **SUGGESTION：2**
- 结论：可进入 P3 设计与任务拆分；两条 WARNING 均已有明确处置与落点，不阻塞。