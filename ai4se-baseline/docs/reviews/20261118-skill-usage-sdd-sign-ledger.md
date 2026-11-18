# Skill 使用记录 — sdd-sign-ledger

- **性质：** skill 使用记录（非工件评审报告，不适用 `@rule:artifact-review-gate` 签署矩阵）
- **Skill：** [`sdd-sign-ledger`](../../.agents/skills/sdd-sign-ledger/SKILL.md)
- **使用日期：** 2026-11-18
- **触发场景：** 全分支合并收口后盘点「谁还没签 / G2 待签状态」（签署 / 催签触发词命中）
- **执行者：** AI agent 会话

## 实际执行

```
node ai4se-baseline/scripts/sign-ledger.mjs --root .
→ Wrote docs/sdd/sign-ledger.md (39 changes, 22 G2 pending)
```

- 扫描范围：active changes 的工件、`docs/reviews/*-<change-id>-*-review*.md` 签署段、`g1/g2/g3-decision.md`。
- 产物：[sign-ledger.md](../sdd/sign-ledger.md)（生成文件，逐 change 列出工件 / 评审报告 / G1 / G2 / G3 状态）。
- 结果要点：39 个 active change 中 **22 个 G2 待签或缺 g2 文件**（如 add-user-auth / add-user-profile 为 Pending，refine-publish-route-map / refine-safety-report 等无 g2 文件）——催签 backlog 一次可见。

## 边界遵循

- **只生成台账，不代签**：skill 明确「never signs anything itself」；本次未向任何评审报告追加签署行。
- 后续催签时按 skill：读台账行 → 把同一 change 的全部缺签位合并成一次 AskUserQuestion → 先按记录人姓名规则确认当前开发者 → 批准后才落签署行。

## 结论

**已生效。** 签署 backlog 从逐份报告翻查变成一张生成台账，22 个 G2 缺口一次列清，且人工签署门禁未被绕过。