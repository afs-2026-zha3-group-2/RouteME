# SDD 阶段记录（P0–P5）

本目录记录每个 change 在 P0–P5 各阶段的准入证据、产出与**具名签署**。阶段模型与门禁语义来自 `ai4se-baseline/vendor/ai4se-plugins/recipes/p0..p5.md` 与 `docs/knowledge/rules/process/rules.md#spec-first`。

## 角色名册

| 角色 | 姓名 | 职责 |
|---|---|---|
| SM | Lewis | 阶段准入与排期确认；P1 范围签字 |
| AO | Jay | 当前 change 的开发负责人；实现、本地验证、阶段记录提交 |
| IO | Wanye | 需求来源与跨能力影响确认 |
| SA | Jacky、Karena | 规格、设计与验收口径签字（P2 起） |
| VL | Neal | 独立验证签字（P4） |

## 阶段与产出

| 阶段 | 目标 | 关键产出 | 记录位置 |
|---|---|---|---|
| P0 | 项目基线可用 | 规格树、规则、知识库、CI 管道现状核对（`p0.md` 清单） | `docs/sdd/<change-id>/p0-baseline.md` |
| P1 | 模糊意图 → 可判定提案 | 需求/故事映射、影响面、`proposal.md` | `docs/sdd/<change-id>/p1-intent.md` |
| P2 | 提案 → 增量规格（G1） | Delta Spec、AC/DoV 复核、`g1-decision.md` | `docs/sdd/<change-id>/p2-spec.md` |
| P3 | 规格 → 设计与可执行任务 | `design.md`、`atdd-design.md`、`tasks.md`、一致性检查 | `docs/sdd/<change-id>/p3-design.md` |
| P4 | 实现 → 本地验证 → CI（G2） | 代码与测试、本地验证报告、`g2-decision.md` | `docs/sdd/<change-id>/p4-verify.md` |
| P5 | 合并与归档（G3） | `summary.md`、living spec 合并、知识库登记 | 归档后写入 `changes/archive/` |

## 提交约定（本目录的约定）

- 一个 change 的每个阶段对应**一次提交**，提交信息为 `<type>(p<N>): <change-id> <description>`。
  - 该写法是 `@rule:git-commit-conventions`（只允许 `verify` / `archive` 两个 stage）的本地扩展：本仓库按阶段留痕，因此 stage 位使用 `p0`–`p4`。`change-id` 仍出现在每条信息里，可从提交反查规格。
  - P4 仍承担该 change 的 verify 语义：代码、测试、验证证据与 G2 签署在同一条链路内。
- 每个阶段提交必须包含该阶段的签署记录；签署缺失视为阶段未完成。
- 未归档的 change 不产生 P5 提交；P5 记录随归档提交写入 `changes/archive/`。

## 变更索引

阶段记录按 `<change-id>` 分目录保存；表中链接指向各阶段记录（提交哈希写在记录的「阶段提交链」小节）。

| change-id | 能力 | 故事 | P0 | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|---|---|---|
| `add-trip-publish` | `trip-plans`（MODIFIED） | S06 发布旅行计划（issue #8） | [p0](add-trip-publish/p0-baseline.md) | [p1](add-trip-publish/p1-intent.md) | [p2](add-trip-publish/p2-spec.md) | [p3](add-trip-publish/p3-design.md) | [p4](add-trip-publish/p4-verify.md) | 暂不执行（按要求不归档） |
| `add-match-reason` | `trip-companions`（MODIFIED） | S07 匹配原因提示（issue #9） | [p0](add-match-reason/p0-baseline.md) | [p1](add-match-reason/p1-intent.md) | [p2](add-match-reason/p2-spec.md) | [p3](add-match-reason/p3-design.md) | [p4](add-match-reason/p4-verify.md) | 暂不执行（按要求不归档） |