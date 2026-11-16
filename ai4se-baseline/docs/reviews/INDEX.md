# 变更级全量评审索引

本索引汇总每个进行中 change 的 `all-specs-review` 报告。报告是审查记录，不是 Gate 结论；每个 change 目录下的 `review.md` 只是指向报告的索引。

- 评审日期：2026-11-16
- 评审范围：`openspec/changes/` 下 10 个进行中的 change（不含 `archive/`）
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

## 维护规则

1. 新增或实质修改 change 后，重跑 `all-specs-review`，按 `20261116-<change-id>-all-specs-review.md` 的命名新增报告；同日重评追加 `-2` 序号，不覆盖旧报告。
2. 报告结论变化时，同步更新本表与 `openspec/changes/<change-id>/review.md` 的结论字段。
3. `review.md` 不复制报告正文，避免两处结论漂移。