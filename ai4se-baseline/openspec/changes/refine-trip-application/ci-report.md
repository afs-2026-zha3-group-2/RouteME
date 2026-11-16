# CI report（E1 slot）— refine-trip-application

- **Phase：** `ci`（附 `cd` 证据）
- **Commit：** `main` @ `da6cc8b`（`5561d0f..da6cc8b`）
- **Timestamp：** 2026-11-16T14:50+0800
- **Source：** [`docs/ai4se-plugins/20261116-145000-pipeline-report.md`](../../../docs/ai4se-plugins/20261116-145000-pipeline-report.md)

| Dimension | Result | Evidence |
|---|---|---|
| CI（backend + frontend） | Pass `[inference]` | CD release 作业仅在 CI `conclusion == success` 后运行；`build-da6cc8b` 已发布 |
| CD（release 产物） | Pass | GitHub release `build-da6cc8b`（standalone jar + frontend dist） |
| E2E | N/A（CI 不含） | 本地隔离端口 39 passed / 1 failed（`profiles.spec.ts:23` 属 main 侧 `V13` 种子与断言失配，非本 change） |
| Local equivalent | Pass | 前端 133 / 后端 213 / `companions` 8/8 |

**Overall：Pass（Pass-by-tag）。** 本机无 `gh` CLI 与 API token，未取得 job 级日志；如需明细由有权限成员补录。

**追加证据：** 代码提交 `da6cc8b` 的 release 为 `build-da6cc8b`；verify 文档提交 `93313dd` 因 CD 并发组 `cancel-in-progress` 被后续 `52ae84a` 取代，`93313dd` 是 `origin/main@52ae84a` 的祖先且 `build-52ae84a` 已发布，本 change 全部提交均被已发布 release 覆盖。

**Residual risk：** E2E 未纳入 CI；`profiles.spec.ts` 陈旧断言待对应 change owner 修复。
