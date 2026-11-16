# 工件评审报告（docs/reviews）

本目录保存每份 SDD 工件的评审报告，按 `@rule:artifact-review-gate` 强制产生。

## 为什么放在这里

评审报告是「工件生成后、进入下一步之前」的强制证据。它们与 `docs/ai4se-plugins/`（验证报告、检查点记录）分开，避免把「工件评审」和「阶段验证」混在一起查。

## 文件命名

```text
docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md
```

| 片段 | 取值 |
|---|---|
| `yyyymmdd` | 评审日期，如 `20261116` |
| `<change-id>` | 与 `openspec/changes/<change-id>/` 完全一致 |
| `<artifact>` | `proposal` / `spec` / `design` / `tasks` 四值之一 |

示例：

```text
docs/reviews/20261116-add-user-auth-proposal-review.md
docs/reviews/20261116-add-user-auth-spec-review.md
docs/reviews/20261116-add-user-auth-design-review.md
docs/reviews/20261116-add-user-auth-tasks-review.md
```

- 一份工件一份报告，四份工件四份报告。
- 修改后重评**不覆盖**旧报告：同一天重评追加序号，如 `-review-2.md`；跨天用新日期。
- 不用时间戳、不写 `final` / `v2` 之外的自定义后缀，历史由文件名中的日期承担。

## 报告必须包含

1. 工件路径与 change-id。
2. 评审结论：`Pass` / `Partial` / `Fail`。
3. 结构化发现：`id`、严重度（BLOCKER / WARNING / SUGGESTION）、规则锚点、位置、问题、建议改法、证据。
4. 残余风险（可为空）。
5. **签署记录**：`docs/reviews/` 下的评审报告一律由 **WAYNE + 当前开发者** 两人签署，每人一条「批准人 / 批准时间」。工件本体的签署记录也追加在同一份报告里，用「对象 + 签署位」区分；只在 approve 后追加，不改写评审结论。

## 签署规则

| 对象 | 签署人 | 签署位 |
|---|---|---|
| `docs/reviews/<yyyymmdd>-<change-id>-<artifact>-review.md` | WAYNE + 当前开发者 | 2 |
| `docs/reviews/<yyyymmdd>-<change-id>-all-specs-review.md` | WAYNE + 当前开发者 | 2 |
| `proposal.md` / Delta Spec（工件本体） | WAYNE | 1 |
| `design.md` / `tasks.md`（工件本体） | 当前开发者 + 1 名非当前开发者且非 WAYNE 的成员 | 2 |

- 报告与工件分开签：报告固定「WAYNE + 当前开发者」，工件本体按上表；同一人不得在一份对象上占两个签署位。
- 除 WAYNE 外的第二签署人候选：Jay / Lewis / Jacky / Karena / Neal。
- 签署位缺一即未批准；执行者 MUST 在报告写完的同一回合停下发问，不得默认沿用名册姓名。
- 完整口径见 `@rule:artifact-review-gate`（`docs/knowledge/rules/process/rules.md#artifact-review-gate`）。

## 变更级全量评审（all-specs-review）

除单工件评审外，每个进行中的 change 同时保留一份全量合规评审报告：

```text
docs/reviews/<yyyymmdd>-<change-id>-all-specs-review.md
```

- 报告覆盖规则、工件链、契约与实现，结论为 `Pass` / `Partial` / `Fail`，不是 Gate 结论，也不替代上面四类工件评审。
- 每个 change 目录下的 `review.md` 是**索引**，只放 change-id、评审类型、日期、结论和报告链接，不复制正文。
- 索引链接写法（相对 change 目录）：`../../../docs/reviews/<yyyymmdd>-<change-id>-all-specs-review.md`。
- 全部变更的入口见 [INDEX.md](INDEX.md)。

## 流转规则

1. 工件写完，同一回合内调用 `all-specs-review` 技能生成报告。
2. 报告写完后停下，按「签署规则」一次问齐该工件的全部签署位（工件本体 + 评审报告）；`design` / `tasks` 还要指定 1 名非当前开发者且非 WAYNE 的第二签署人。
3. 只有全部签署位明确 approve 才继续；任一签署位缺失、未回复或回复含糊视为未批准。
4. 结论为 `Fail` 时先修复并重评，直到至少 `Partial` 再请求签署。

规则原文：`docs/knowledge/rules/process/rules.md#artifact-review-gate`