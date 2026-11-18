# Skill 使用记录 — sdd-archive-queue

- **性质：** skill 使用记录（非工件评审报告，不适用 `@rule:artifact-review-gate` 签署矩阵）
- **Skill：** [`sdd-archive-queue`](../../.agents/skills/sdd-archive-queue/SKILL.md)
- **使用日期：** 2026-11-18
- **触发场景：** 全分支合并收口后盘点「哪些 change 现在可以归档」（归档顺序 / 归档依赖触发词命中）
- **执行者：** AI agent 会话

## 实际执行

```
node ai4se-baseline/scripts/archive-queue.mjs --root .
→ Wrote docs/sdd/archive-queue.md (39 active, 16 ready, 0 in cycles)
```

- 依赖来源：各 change 的 `archive-after.md`，缺失时回退解析 `docs/sdd/README.md` 变更索引备注。
- 产物：[archive-queue.md](../sdd/archive-queue.md)（生成文件，含依赖边、拓扑序、逐 change 就绪度）。
- 结果要点：**16 个 change 可归档**（add-admin-dashboard、add-ai-itinerary、add-route-completion、add-travel-finance、refine-my-trips 等），拓扑序无环；其余 23 个仍有依赖未归档或 G2 未签。

## 边界遵循

- **只算队列，不执行归档**：按 skill「archiving stays human-approved」与项目约定（用户明确「先不要归档」），本次未移动任何 change 进 `openspec/changes/archive/`。
- 后续如需归档：按拓扑序逐个经 AskUserQuestion 呈报精确命令与批准人后，交 `openspec-archive-change` / `openspec-bulk-archive-change` 执行，再重跑本工具刷新就绪度。

## 结论

**已生效。** 归档依赖从散落在索引备注里的文字变成可计算队列，一次命令即得「可归档清单 + 拓扑序 + 阻塞项」，且未越权执行归档。