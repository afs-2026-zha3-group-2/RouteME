# All specs review — add-user-logout

- **Verdict:** Partial
- **Scope:** focus=full；root=`ai4se-baseline`；change=`openspec/changes/add-user-logout/`；能力 `user-auth`（MODIFIED，REQ-006）；评审日期 2026-11-16
- **Evidence:**
  - 共享验证（本次直接引用，未重跑）：backend `mvnw.cmd -q test` 退出码 0，34 份 surefire 报告 / 213 tests / 0 failures / 0 errors / 0 skipped；frontend `npm run typecheck` 退出码 0，`npm test` 16 个测试文件 / 137 tests 全部通过。
  - 工具缺口：`RouteME/` 根目录无 `package.json`，`npm run lint:api` 无法执行；本 change 无契约改动，契约维度按「零 diff」判定，但 lint 证据只能引用 `ci-report.md` 与 change 期记录。
  - 未重跑的证据：`npx playwright test tests/auth.spec.ts`（需要后端 8080 + 前端 5173 起服）。只能引用 `docs/ai4se-plugins/20261116-111241-local-verify-report.md`（`auth.spec.ts` 7/7、全套 25/25）与 `docs/sdd/add-user-logout/p4-verify.md`，故 C/E 维度封顶 Partial。
  - 读过的工件：`proposal.md`、`design.md`（D1–D7）、`specs/user-auth/spec.md`（1 Requirement / 10 Scenario，MODIFIED）、`tasks.md`（T1–T5 + 对齐自检 + P4/G2 记录）、`atdd-design.md`、`dov-ac-review.md`、`consistency-lint.md`、`g1-decision.md`、`g2-decision.md`、`ci-report.md`、`preview/identity-menu.html` 索引；`summary.md` 不存在（P5 未开始）。
  - 读过的实现：`frontend/src/shell/AppShell.tsx`（`identityOpen`、`id-panel` `role="dialog"`、`id-list` `role="listbox"`、`id-divider`、`id-logout`、`id-panel-note`）、`frontend/src/App.tsx#logout`、`frontend/src/i18n/tripMessages.ts`（`authLogout` / `authLogoutWarning`）、`frontend/src/styles.css`（`.id-divider` / `.id-logout`）、`e2e/tests/auth.spec.ts`（7 例）；回归侧 `routeme.controller.AuthController#logout`、`routeme.service.impl.AuthServiceImpl#logout`、`AuthControllerTest`。
  - 反向验证：`git show --stat 79a7f42` 与 `e469a31` 仅改 `e2e/` 与 `frontend/`（`auth.spec.ts`、`App.tsx`、`tripMessages.ts`、`AppShell.tsx`、`styles.css`），`openapi.yaml` / `backend/**` / `db/migration/**` 零 diff，RV-1（不新增端点、不改契约）成立。
  - 门禁与工件评审：`docs/reviews/` 下无本 change 的四份单工件评审；`@rule:artifact-review-gate` 落地提交 `114379f`（14:04:54）晚于 proposal（10:25）、delta（10:40）、design（10:56）、tasks（11:30），故该项记 **Skipped（规则晚于工件；14:08 的改动仅为路径引用修正）**。

## Findings

| id | severity | rule | location | issue | suggested_fix | authority |
|---|---|---|---|---|---|---|
| UL-01 | WARNING | rules/quality/rules.md#web-coding-style | `frontend/src/shell/AppShell.tsx`（`id-panel-note` 的两句说明、`role="dialog" aria-label="身份菜单"`） | 本 change 新增的用户可见文案与无障碍名称直接写死在组件里（「退出登录会结束本机会话并回到身份门…」「演示身份无需密码；退出登录只清除本机身份并回到身份门。」「身份菜单」），未进 `i18n/tripMessages.ts`；`authLogoutWarning` 却按规则进了 i18n，同一改动两套做法；E2E 只能按硬编码整句断言 | 把两句说明与「身份菜单」抽成 `tripMessages.authLogoutNote` / `authDemoLogoutNote` / `identityMenuLabel`，E2E 改为按角色 + 可访问名或引用同一常量 | [fact] |
| UL-02 | WARNING | rules/documentation/rules.md#sdd-artifacts | `openspec/changes/add-user-logout/specs/user-auth/spec.md`「演示身份退出当前身份」；`openspec/specs/trip-plans/spec.md`；`e2e/tests/auth.spec.ts`（`toHaveCount(4)`）；`routeme.service.impl.DemoUserServiceImpl#findAllDemo` | Delta 场景断言「身份门仍展示 3 个预设演示账户」，实现与 E2E 都是 4 个（`V12__seed_viewer_profile_user.sql` 周野，`username IS NULL` 因而进入演示列表）；Living Spec 仍写「恰好 3 个」，规格与实现/测试互相矛盾 | 用同一权威说法：要么让 `findAllDemo` 只返回 id 1–3，要么把 Delta、Living Spec、契约 `/users/demo` 描述与 E2E 断言统一改成 4 个（并说明周野的用途） | [fact] |
| UL-03 | SUGGESTION | rules/testing/rules.md#web-testing | `RouteME/e2e/tests/auth.spec.ts#createAccount` | 注册请求仍发送 `school` 与 `interests`，而契约 0.8.1 的 `AuthRegisterRequest` 只有 `username` / `password` / `nickname`（且 `add-user-profile` 明确要求忽略旧字段）；测试载荷含契约外字段，掩盖真实接口边界 | 删除这两个字段，或改成一条显式的「旧版注册字段被忽略」断言 | [fact] |
| UL-04 | SUGGESTION | rules/testing/rules.md#web-testing | `RouteME/e2e/tests/auth.spec.ts`（7 例）；`ci-report.md` §「退出功能的 CI 覆盖」 | 退出验收只在本机跑过（7/7 + 全套 25/25），CI 无 Playwright job；本次评审也无法重跑（无起服环境），回归完全依赖人工 | 把 `npx playwright test` 纳入 CI（含起后端与前端），或在 `ci-report.md` / G2 把「E2E 不入 CI」登记为需另立 change 的追踪项（当前只有 waiver 一句话） | [fact] |
| UL-05 | SUGGESTION | rules/documentation/rules.md#document-conventions | `openspec/changes/add-user-logout/ci-report.md`（`- **Root:** D:\zha_training\RouteME\ai4se-baseline`）；同见 `docs/ai4se-plugins/20261116-111241-local-verify-report.md` | 报告写绝对机器路径，且与本仓库实际路径（`...\RouteME\ai4se-baseline`）不符；规则要求文档不写 `D:\...` 这类绝对路径 | 改为相对路径或删除 `Root` 行；同模板产出的报告一并更正 | [fact] |
| UL-06 | SUGGESTION | rules/documentation/rules.md#sdd-artifacts | `openspec/changes/add-user-logout/tasks.md`（`**Owner：** AO（Jay）`）、`ci-report.md`（`Jay（AO / current developer）`）、`g2-decision.md`（Approvers） | 规则示例要求姓名在前（`Jay（AO）`），当前写法把角色放在姓名前，且同一 change 内两种写法并存 | 统一为 `Jay（AO）`，并在 G2/G3 签署行沿用 | [fact] |
| UL-07 | SUGGESTION | rules/documentation/rules.md#sdd-artifacts | `openspec/changes/add-user-logout/`（无 `summary.md`）；`g1-decision.md` 条件 L-01 / `tasks.md` G2 记录 | change 处于「P4 完成、P5 未开始」：`summary.md` 缺失，G1 条件 L-01 要求的「把 `add-user-auth` T6「演示身份不显示退出」标注为已被取代」仍未落地；读者翻 `add-user-auth/tasks.md` T6 会读到相反结论 | P5 归档时写 `summary.md` 并明确取代关系，再进 G3；在此之前不要在任何记录里宣称该收口已完成 | [fact] |

## Per-dimension summary

| 维度 | 结果 | 说明 |
|---|---|---|
| A 架构 | 未发现 | 仅前端改动，`AppShell` / `App` / `i18n` / `styles` 职责边界正确：纯流程留在 `App#logout`，组件只做取值渲染；无契约、后端、迁移 diff（RV-1 已核实）；`dialog` + 内层 `listbox` 的语义修正与 D3 一致 |
| B 质量 | 1 WARNING | `logout()` 顺序（本地优先、异步撤销会话、失败仅提示）与 D2/T3 完全一致；唯一问题是新增文案未走 i18n，同一改动内两套做法 |
| C 测试 | 2 SUGGESTION | 7 条 E2E 都用英文陈述句、语义化选择器、`expect.poll` 替代固定等待，覆盖 E3–E10 与 RV-1/RV-2；不足是 E2E 不入 CI、本次无法重跑、测试载荷含契约外字段 |
| D 安全 | 未发现 | 授权/会话边界无回退：演示身份不发请求（`page.on('request')` 断言），注册账号撤销服务端会话并用 `expect.poll` 验 401，失败仍完成本地清态；token 走 `Authorization` 而非 Cookie，CSRF 不适用；`X-User-Id` 的既有风险属 `add-user-auth` 范围，本 change 未扩大 |
| E 过程 | 1 SUGGESTION | G1 为具名 Pass（IO/SA/AO/VL/SM），G2 由 VL Neal 签署，条件与 waiver 齐全；`ci-report.md` 以 `Pass-by-human-confirm` 记 Partial 并留下确认人与时间，属诚实记录；仅签署/负责人写法与规则示例不一致 |
| F 文档 | 1 SUGGESTION | 工件中文、标识符英文、相对链接可用；`ci-report.md` 的绝对 Root 路径与规则冲突，并与仓库实际路径不符 |
| G 工件链与追溯 | 1 WARNING + 1 SUGGESTION | proposal 7 条 in-scope ↔ 10 个 Scenario ↔ E1–E10 ↔ T1–T5 ↔ E2E 用例可逐条对齐，`dov-ac-review.md` 的 9/9 需求映射与基线 3/3 保留可核验；断点为演示账户数量与规格相反，以及 `summary.md`/G3 的跨 change 收口承诺尚未落地 |

## Residual risks

- 结束会话请求失败时服务端 token 仍在 7 天有效期内，本机已清态但该 token 未失效（D2 的既定取舍；提示语「已退出本机，会话可能仍有效」已如实告知）。
- 演示身份退出只清 `localStorage`，若用户在另一浏览器/标签页仍持有该演示身份，不受影响（演示身份本身无服务端会话）。
- 退出后 `users` 状态仍保留内存中的账号列表，直到整页刷新（`currentUser` 已置空，界面不暴露）；风险仅限内存。
- E2E 依赖真实后端与种子数据；`tasks.md` P4 记录过「34 条 `E2E %` 行程把种子行程挤出首页导致 3 个既有用例失败」的数据污染，清理靠人工备份，属未自动化的环境卫生风险。
- `add-user-logout` 尚无 `summary.md`，P5/G3 未执行；Living Spec 的 MODIFIED 合并尚未发生（当前 `openspec/specs/user-auth/spec.md` 的「会话校验与退出」仍是 `add-user-auth` 归档时的 3 场景版本）。

## Next remediations (non-Gate)

- `/sdd:delta-craft`：统一「演示账户数量」的权威说法（规格 / 契约 / E2E / 实现四处），消解 `UL-02`；owner 待指派。
- `/sdd:task-plan`（小改）：把菜单说明与无障碍名称迁到 `tripMessages`，消解 `UL-01`；owner 待指派。
- `/sdd:pr-submit` 前补一次 E2E 复跑并把 `npx playwright test` 纳入 CI（`UL-04`）。
- `/sdd:rules-govern`：把「报告不得写绝对机器路径」与「负责人写法 `姓名（角色）`」纳入 lint 可查处项（`UL-05` / `UL-06`）。
- P5 归档时写 `summary.md` + G3，明确 `add-user-auth` T6 旧表述已被取代（`UL-07`）。
- 本报告不是 Gate 结论，也不替代 G1/G2/G3；G2 已由 VL 具名 Pass，本报告不改变该结论。