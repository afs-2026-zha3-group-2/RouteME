# 变更级全量评审索引

本索引汇总每个进行中 change 的 `all-specs-review` 报告。报告是审查记录，不是 Gate 结论；每个 change 目录下的 `review.md` 只是指向报告的索引。

- 评审日期：2026-11-16
- 评审范围：`openspec/changes/` 下进行中的 change（不含 `archive/`）
- 报告目录：[docs/reviews](.)
- 索引写法：`openspec/changes/<change-id>/review.md` → `../../../docs/reviews/20261116-<change-id>-all-specs-review.md`

## 汇总

| # | change-id | Verdict | BLOCKER | WARNING | SUGGESTION | 评审报告 | change 索引 |
|---|---|---|---|---|---|---|---|
| 1 | add-destination-area-filters | Fail | 2 | 9 | 3 | [报告](20261116-add-destination-area-filters-all-specs-review.md) | [review.md](../../openspec/changes/add-destination-area-filters/review.md) |
| 2 | add-match-reason | Partial | 0 | 6 | 3 | [报告](20261116-add-match-reason-all-specs-review.md) | [review.md](../../openspec/changes/add-match-reason/review.md) |
| 3 | add-trip-completion | Partial | 0 | 8 | 3 | [报告](20261116-add-trip-completion-all-specs-review.md) | [review.md](../../openspec/changes/add-trip-completion/review.md) |
| 4 | add-trip-publish | Fail | 1 | 6 | 3 | [报告](20261116-add-trip-publish-all-specs-review.md) | [review.md](../../openspec/changes/add-trip-publish/review.md) |
| 5 | add-user-auth | Partial | 0 | 12 | 9 | [报告](20261116-add-user-auth-all-specs-review.md) | [review.md](../../openspec/changes/add-user-auth/review.md) |
| 6 | add-user-logout | Partial | 0 | 2 | 5 | [报告](20261116-add-user-logout-all-specs-review.md) | [review.md](../../openspec/changes/add-user-logout/review.md) |
| 7 | add-user-profile | Fail | 2 | 11 | 3 | [报告](20261116-add-user-profile-all-specs-review.md) | [review.md](../../openspec/changes/add-user-profile/review.md) |
| 8 | add-user-profiles | Fail | 1 | 6 | 4 | [报告](20261116-add-user-profiles-all-specs-review.md) | [review.md](../../openspec/changes/add-user-profiles/review.md) |
| 9 | refine-inspiration-home | Fail | 1 | 3 | 5 | [报告](20261116-refine-inspiration-home-all-specs-review.md) | [review.md](../../openspec/changes/refine-inspiration-home/review.md) |
| 10 | refine-trip-application | Partial | 0 | 1 | 5 | [报告](20261116-refine-trip-application-all-specs-review.md) | [review.md](../../openspec/changes/refine-trip-application/review.md) |
| 11 | refine-my-trips | Pass | 0 | 0 | 6 | [报告](20261116-refine-my-trips-all-specs-review.md) | [review.md](../../openspec/changes/refine-my-trips/review.md) |

## 共享验证证据

| 栈 | 命令 | 结果 |
|---|---|---|
| backend | `mvnw.cmd -q test`（`RouteME/backend`） | 退出码 0；surefire 34 个报告、213 tests、0 failures、0 errors、0 skipped |
| frontend | `npm run typecheck`（`RouteME/frontend`） | 退出码 0 |
| frontend | `npm test`（`RouteME/frontend`） | 16 个测试文件、137 tests 全部通过 |
| 契约 lint | 根目录 `npm run lint:api` | 无法执行：仓库根无 `package.json`；各报告已将契约维度结论封顶为 Partial |

## 未纳入本次评审

- `refine-safety-report`：本批评审启动后由并发工作创建，评审时只有 `proposal.md` 与增量 spec，尚无 `design.md` / `tasks.md` / 实现，故未纳入；其已有独立的 proposal / spec 工件评审。
- `openspec/changes/archive/`：已归档变更，不重复评审。

## Skill 使用记录（2026-11-18）

提效方案落地的 6 个新 skill 的真实使用证据（非工件评审报告，不适用签署矩阵）；未用过的操作已经发起人批准后补跑。问题/用法/前后对比的汇报依据层见 [skill 提效依据文档](../sdd/20261118-skill-efficiency-evidence.md)；纯数据版（可直接绘图）见 [数据表](../sdd/20261118-skill-efficiency-data.md) 与 [JSON](../sdd/20261118-skill-efficiency-data.json)。

| skill | 使用方式 | 记录 |
|---|---|---|
| sdd-merge-main | 6 分支全量合并实战 | [记录](20261118-skill-usage-sdd-merge-main.md) |
| sdd-id-allocate | 五次顺延裁决 + 门禁负向探针 | [记录](20261118-skill-usage-sdd-id-allocate.md) |
| sdd-archive-queue | 实跑生成归档队列（39 active / 16 ready） | [记录](20261118-skill-usage-sdd-archive-queue.md) |
| sdd-sign-ledger | 实跑生成签署台账（22 G2 待签） | [记录](20261118-skill-usage-sdd-sign-ledger.md) |
| sdd-worktree-ops | 分支清理 + worktree 创建/移除演练 | [记录](20261118-skill-usage-sdd-worktree-ops.md) |
| sdd-e2e-debt-baseline | fresh-DB smoke 16 例实跑 + debt-diff 归因 | [记录](20261118-skill-usage-sdd-e2e-debt-baseline.md) |

## 维护规则

1. 新增或实质修改 change 后，重跑 `all-specs-review`，按 `20261116-<change-id>-all-specs-review.md` 的命名新增报告；同日重评追加 `-2` 序号，不覆盖旧报告。
2. 报告结论变化时，同步更新本表与 `openspec/changes/<change-id>/review.md` 的结论字段。
3. `review.md` 不复制报告正文，避免两处结论漂移。
