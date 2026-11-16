# G2 decision — add-user-auth

- **Gate：** G2（Verify）
- **Change：** `add-user-auth`（`user-auth` ADDED + `trip-plans` MODIFIED；支撑 change，无独立 REQ 行）
- **Timestamp：** 2026-11-16T14:01+0800（**补记**）
- **Recorded by：** opencode（AI agent），按 Jay（AO / current developer）2026-11-16「把归档前漏掉的 G1/G2 补回来」指令记录

> **补记说明：** 本 change 于 2026-11-16 归档（提交 `229411a`）时未产出 G1 / G2 决策记录，`git log --all` 确认这两个文件从未存在。本文件与 [`g1-decision.md`](g1-decision.md) 为依据归档产物、当日本地验证报告与 GitHub Actions 运行记录**追溯补记**，不是当时会议的原始纪要。**CI / CD 证据为本次补记时实际查询 GitHub Actions 得到**（见 §Inputs 的运行 ID），未使用推断。如需否定或修订，请以具名修订覆盖本文件。

## Inputs

| Artifact | Path / ref | Result |
|---|---|---|
| Local verify report | [`docs/ai4se-plugins/20261116-101702-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-101702-local-verify-report.md) | Pass：前端 9 文件 / 73 测试、构建成功、契约 0 error / 7 warning、后端 154 项、浏览器走查 9 步；E2E 未执行 |
| Implementation commit | `f5e984c`（feat: add account register and login with session handoff） | 已合入 `main` |
| Follow-up commit | `9a2bdf0`（AuthPanel 兴趣卡片选择器、预设 / 自定义标签模型与文案） | 已合入 `main`；随后的 `main` 批次运行覆盖 |
| Pipeline CI（required） | GitHub Actions run [#43786694809](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43786694809)（`f5e984c`，`push`） | **Success** |
| Pipeline CD | run [#43786777001](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43786777001)（`workflow_run`）；发布 [`build-f5e984c`](https://github.com/afs-2026-zha3-group-2/RouteME/releases/tag/build-f5e984c)（2026-11-16T01:32:15Z） | **Success** |
| 归档提交证据 | `229411a`：CI run [#43793107105](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43793107105) Success、CD run [#43793209208](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43793209208) Success、发布 `build-229411a`（2026-11-16T02:37:22Z） | **Success** |
| Delta Spec | [`specs/user-auth/spec.md`](specs/user-auth/spec.md)、[`specs/trip-plans/spec.md`](specs/trip-plans/spec.md) | 4 Requirement / 10 Scenario + 1 Requirement / 4 Scenario |
| Design / Tasks | [`design.md`](design.md)、[`tasks.md`](tasks.md) | D1–D4（见 design §决策）；T1–T8 全部 `[x]` |
| ATDD design | 无（`atdd-design.md` 从未产出） | 当时流程为 design + tasks + 单元 / 契约测试；E2E 未覆盖，见 §Defect grades |
| Summary | [`summary.md`](summary.md) | 实现、验证亮点与残余风险已收口 |

## Dimension results

| 维度 | 结果 | 说明 |
|---|---|---|
| build | Pass | 前端 `npm run build`（`tsc --noEmit` + `vite build`，1520 modules）；后端 `.\mvnw.cmd -B -ntp test` 154 项 |
| scan | Skipped | 仓库未配置安全扫描器；演示环境无生产凭据 |
| review | Skipped | 未运行独立评审工具；按单元测试 + 契约 lint + 浏览器走查覆盖 |
| evidence | Pass | 本地验证报告含命令与输出；浏览器走查覆盖注册 / 刷新恢复 / 退出 / 密码登录 / 演示身份切换 / 兴趣上限 |
| ci | Pass | `f5e984c` 的 CI run `43786694809` Success（补记时实测，非推断） |
| cd | Pass | CD run `43786777001` Success，发布 `build-f5e984c`；归档提交 `229411a` 同样 CI / CD Success，发布 `build-229411a` |

## Defect grades

| 级别 | 数量 | 说明 |
|---|---|---|
| CRITICAL | 0 | — |
| WARNING | 4 | ①业务端点仍信任 `X-User-Id`，token 仅用于身份恢复（绕过面已记录）；②浏览器走查的注册 / 登录 / 退出链路部分依赖临时 mock API，真实 Spring Boot + SQLite 仅手动复验、未自动化；③本 change 未新增 E2E 用例（`docs/ai4se-plugins/20261116-101702-local-verify-report.md` §6）；④并发注册的用户名唯一性依赖数据库唯一索引，冲突映射未单独测 |
| SUGGESTION | 3 | ①契约 7 条 Redocly warning 中 2 条可收敛（`/users`、`/users/demo` 未声明 4XX）；②前端 bundle 866 kB（Ant Design 体积，既有）；③`auth_sessions` 过期行无主动清理，仅校验时按 `expires_at` 拒绝 |

## Decision

**Pass**（补记）

判定依据：Delta 两份规格的场景全部落地并有对应测试；本地验证报告 6 项命令全绿；实现提交与归档提交的 CI / CD 均 Success 且有 release 产物；无 CRITICAL 缺陷、无未决 blocking 歧义。

## Waivers / conditions + owners

| 项 | Owner | 处理时机 |
|---|---|---|
| 业务端点 token 化（替换 `X-User-Id`） | AO（Jay） | 另立 change |
| 注册 / 登录 / 退出链路的 E2E 自动化 | AO（Jay） | 已由后续 `add-user-logout` 的 `e2e/tests/auth.spec.ts` 覆盖会话生命周期；注册链路仍缺自动化 |
| 真实后端下的注册 / 登录链路自动化（替换 mock 走查） | AO（Jay） | 后续 change |
| `auth_sessions` 过期行清理任务 | AO（Jay） | 量级变大后 |
| 契约 `/users`、`/users/demo` 补 4XX 响应 | AO | 契约下一次升版 |
| 归档正文「演示身份不显示退出登录」等表述由 `add-user-logout` 取代 | BA | 该 change P5 / G3 收口 |
| 本 change 缺 `dov-ac-review.md` / `consistency-lint.md` / `atdd-design.md` 三份标准产物 | BA | 已在 `g1-decision.md` 说明；后续 change 按标准流程补齐 |

## Approvers

| 角色 | 姓名 |
|---|---|
| IO | Wanye |
| SA | Jacky、Karena |
| AO（当前开发） | Jay |
| VL | Neal |
| SM | Lewis |

签署来源：沿用 2026-11-15 / 2026-11-16 其它 change 的 G2 记录中同一角色名单；补记得用户 2026-11-16 明确指示。**本记录为追溯补记，VL 未在实际验证当日独立签署**；若需正式签署，请由 VL 具名确认后在本文件追加签署时间。

## Next

- Decision = Pass（补记）→ 归档已于 `229411a` 完成，Delta 已合并进 `openspec/specs/user-auth/spec.md` 与 `openspec/specs/trip-plans/spec.md`。
- 归档后的依赖方：`add-user-logout`（REQ-006，MODIFIED「会话校验与退出」）、`add-user-profile`（REQ-008，MODIFIED「注册账号」）。
- 遗留自动化缺口（注册链路 E2E、真实后端走查）已登记为条件，不回溯修改本 change 的实现。