# P4 实现与验证记录 — add-user-logout

- **Change：** `add-user-logout`｜ **阶段：** P4（Apply & verify / G2）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO），opencode 代录

## 1. 阶段目标

按 ATDD 完成「所有身份在顶栏身份菜单退出」的实现、跑通本地验证与 CI/CD，并由 VL 完成 G2 签署。

## 2. 实现摘要

| 层 | 改动 | 提交 |
|---|---|---|
| 身份菜单 | `AppShell.tsx`：删除退出项 `isAuthenticated` 门控（演示身份同样可见）；面板 `role="dialog"`，演示身份包进内层 `listbox`；触发按钮 `aria-haspopup="dialog"`；Esc 关闭并聚焦触发按钮 | `79a7f42` |
| 退出流程 | `App.tsx` `logout()`：先捕获 token，同步清 `routeme.authToken` / `routeme.currentUserId`、重置状态、回 `#/`；随后 fire-and-forget `logoutAccount(token)`，失败仅 `message.warning` | `79a7f42` |
| 文案 | `tripMessages.ts`：新增 `authLogoutWarning`，`authLogout` 保持「退出登录」 | `79a7f42` |
| 样式 | `styles.css`：方案 B —— `.id-divider` 分隔线 + `.id-logout` 危险色行式菜单项（15px 图标、9% hover、无边框）；实测高 34px | `79a7f42` / `e469a31` |
| 端到端 | `e2e/tests/auth.spec.ts`：7 个验收用例；fixture 改为写 `localStorage` 后 `reload()` | `79a7f42` |
| 后端 / 契约 / 迁移 | 无改动（复用 `POST /api/auth/logout`） | — |

## 3. Red → Green 证据

| 步骤 | 观察 |
|---|---|
| Red | `npx playwright test tests/auth.spec.ts` → 7/7 失败（无 `role=dialog`；演示身份无退出入口） |
| Green | 实现后同一命令 7/7 通过（21.0s） |

完整输出见 [`20261116-111241-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-111241-local-verify-report.md)。

## 4. 验证结果

| 命令 | 结果 |
|---|---|
| `cd RouteME/frontend; npm run build` | 成功（1521 modules） |
| `cd RouteME/frontend; npm test` | Test Files 9 passed / Tests 74 passed |
| `cd RouteME/backend; $env:MAVEN_OPTS="-Djavax.net.ssl.trustStoreType=WINDOWS-ROOT"; .\mvnw.cmd -B test` | Tests run: 154, Failures: 0, Errors: 0 |
| `cd RouteME/e2e; npx playwright test tests/auth.spec.ts` | 7 passed |
| `cd RouteME/e2e; npx playwright test` | 25 passed |
| `npx --no-install openspec validate add-user-logout --strict` | `Change 'add-user-logout' is valid` |
| 手工走查 1440 / 768 / 390（浅 / 深色） | 无横向溢出；退出项 34px；Esc 焦点返回 |
| CI / CD（`711da3d`） | 成功（证据 `build-711da3d`，见 [`20261116-112704-pipeline-report.md`](../../../docs/ai4se-plugins/20261116-112704-pipeline-report.md)） |

## 5. P4 DoV 检查（`checklists/p4.md`）

| id | 检查 | 结论 |
|---|---|---|
| P4-1 | 本地验证报告存在 | Pass（`docs/ai4se-plugins/20261116-111241-local-verify-report.md`） |
| P4-2 | 本地 Overall = Pass | Pass |
| P4-3 | `phase=ci` | Pass（`20261116-112704-pipeline-report.md`，Overall Partial / `Pass-by-human-confirm`，已在 G2 Inputs 引用） |
| P4-4 | `phase=cd` | Pass（release `build-711da3d`） |
| P4-5 | `g2-decision.md` | Pass（`openspec/changes/add-user-logout/g2-decision.md`） |
| P4-6 | Apply 与 Verify 分离 | Pass（G2 由 VL Neal 签署，实现方未自批） |

## 6. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P2（Delta + G1） | `16b1824` |
| P3（design + tasks + preview） | `af1b678` |
| P4（实现） | `79a7f42` |
| P4（样式对齐） | `e469a31` |
| P4（验证记录） | `7bace71` |
| P4（合入 / 推送 `main`） | `711da3d`（merge `origin/main`） |

## 7. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 实现与 P3 任务一致；验证命令可复现；承担遗留项 | 2026-11-16 |
| VL | Neal | 独立复核本地验证与 CI/CD 证据；确认 10 个场景有对应断言；G2 Pass | 2026-11-16 |
| SA | Jacky、Karena | 实现未越出 Delta Spec；`user-auth` MODIFIED 仅替换「会话校验与退出」 | 2026-11-16 |
| IO | Wanye | 收到残余风险（静态 `message` 主题上下文、异步会话删除、归档旧表述） | 2026-11-16 |
| SM | Lewis | G2 Pass，REQ-006 可交付；归档另行发起 | 2026-11-16 |

**阶段结论：Pass（G2）**

## 8. P5 状态

未执行。归档时需：将 MODIFIED「会话校验与退出」合并进 `openspec/specs/user-auth/spec.md`（保留基线 3 场景）、补 `summary.md`、在 G3 记录归档 `add-user-auth` 的 T6「演示身份不显示退出」已被本 change 取代、登记 `docs/knowledge/` 并移入 `changes/archive/`。