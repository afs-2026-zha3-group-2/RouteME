# CI / CD report — refine-experience-share

- **Change：** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16）
- **Commit：** `main@e2abd4e9618488eb4161679e11d24f7078735d20`（merge `feature/refine-experience-share`）
- **Report：** `docs/ai4se-plugins/20261116-204334-pipeline-report.md`
- **日期：** 2026-11-16 20:43（UTC+8）

## E1 判定

**Pass** — CI 与 CD 均有 job / step 级直证。

| Phase | Run | Conclusion |
|---|---|---|
| ci | [#156](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43868630052)（id `43868630052`） | success（Backend verify + Frontend build/test） |
| cd | [#88](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43868762854)（id `43868762854`） | success（jar + dist + release `build-e2abd4e`） |

## 覆盖范围

- `main` 的 merge commit `e2abd4e` 包含本 change 的全部代码与文档，CI 在此提交上运行，覆盖合并后的最终状态。
- 冲突解决（合并时）：`TripDetailPage.tsx` 保留双方 import；`coverTone.ts` 采用 `main` 的导出式实现（行为一致）；`docs/sdd/README.md` 保留两行索引；撞名的 `20261116-172000` 质量报告拆分为 `20261116-172001`。

## 已知边界

- E2E 不在 CI 内；本 change 的 E2E 证据为本地执行（`experiences.spec.ts` 8/8）。
- `companions.spec.ts:200` 为既有债务（`main@1cd1505`），非本 change 引入。

## 结论

CI / CD 均通过；G2 的 pipeline slot 记为 **Pass（API 直证）**。
## R2（2026-11-16 21:30）

| Phase | Run | Conclusion |
|---|---|---|
| ci | [#163](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43875960658)（43875960658，sha 6ff2d21） | success（Backend verify + Frontend build/test） |
| cd | [#95](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43876124753)（43876124753） | success；release uild-6ff2d21 → 6ff2d21 |

- 报告：`docs/ai4se-plugins/20261116-213000-pipeline-report.md`。
- E2E 仍不在 CI 内：R2 的布局断言（E13–E17）为本地 9/9。
- E1 判定：**Pass（API 直证）**。