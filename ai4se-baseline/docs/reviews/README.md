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
5. **批准记录**：批准人姓名 + 批准时间；只在 approve 后追加，不改写评审结论。

## 流转规则

1. 工件写完，同一回合内调用 `all-specs-review` 技能生成报告。
2. 报告写完后停下，问当前开发者是否批准进入下一步。
3. 只有明确 approve 才继续；未回复或回复含糊视为未批准。
4. 结论为 `Fail` 时先修复并重评，直到至少 `Partial` 再请求 approve。

规则原文：`docs/knowledge/rules/process/rules.md#artifact-review-gate`