# P4 实现与验证记录 — add-match-reason

- **Change：** `add-match-reason`｜ **阶段：** P4（Apply & verify / G2）
- **日期：** 2026-11-16｜ **记录人：** Jay（AO）

## 1. 阶段目标

按 ATDD 完成实现、跑通本地验证与 CI，并由 VL 完成 G2 签署。

## 2. 实现摘要

| 层 | 改动 | 提交 |
|---|---|---|
| 前端卡片 | `TripCard`：环形图改为装饰；新增「匹配度 N%」与「匹配理由 …」文字，数字加 `.match-percentage` | `1401cf6` |
| 前端样式 | `styles.css`：新增 `.match-copy` / `.match-score` / `.match-reason-label`，删除废弃的 `.match-ring b` | `1401cf6` |
| 后端测试 | `TripMatchTest`：补「仅日期相同 = 30」「单个共同兴趣 = 10」两条边界 | `1401cf6` |
| 端到端 | `companions.spec.ts`：对齐当前首页；新增降序、跨身份原因差异、详情页原因列表断言 | `1401cf6` |
| 后端实现 / 契约 | 无改动；权重、上限与降级文案已满足场景 | — |

实现提交 `1401cf6` 已通过 `bfb07ae` 合入 `main`；本阶段提交补记验证与 G2 签署。

## 3. Red → Green 证据

| 步骤 | 观察 |
|---|---|
| Red | `npx playwright test tests/companions.spec.ts -g "shows match reasons"` → 卡片内 `匹配度 \d+%` 不存在（8.5s 失败） |
| Green | 卡片补齐标签后同一用例通过（3.6s，含跨身份与详情页断言） |

完整输出见 [`20261116-101500-local-verify-report.md`](../../../docs/ai4se-plugins/20261116-101500-local-verify-report.md)。

## 4. 验证结果

| 命令 | 结果 |
|---|---|
| `cd RouteME/backend; .\mvnw.cmd -B -o clean test` | Tests run: 154, Failures: 0, Errors: 0（`TripMatchTest` 7 项） |
| `cd RouteME/frontend; npm test` | Test Files 9 passed / Tests 67 passed |
| `cd RouteME/frontend; npm run build` | 成功 |
| `cd RouteME; npx @redocly/cli lint openapi.yaml` | valid，0 error / 7 既有 warning |
| `cd RouteME/e2e; npx playwright test tests/companions.spec.ts -g "shows match reasons"` | 1 passed |
| 联合回归（S06 发布 2 项 + S07 匹配 2 项） | 4 passed |
| CI run [`43790791755`](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43790791755) | Success |

## 5. P4 DoV 检查（`checklists/p4.md`）

| id | 检查 | 结论 |
|---|---|---|
| P4-1 | 本地验证报告存在 | Pass（`docs/ai4se-plugins/20261116-101500-local-verify-report.md`） |
| P4-2 | 本地 Overall = Pass | Pass |
| P4-3 | `phase=ci` | Pass（CI run 43790791755） |
| P4-4 | `phase=cd` | Pass |
| P4-5 | `g2-decision.md` | Pass |
| P4-6 | Apply 与 Verify 分离 | Pass（G2 由 VL Neal 签署） |

## 6. 阶段提交链

| 阶段 | 提交 |
|---|---|
| P0 | docs(p0): add-match-reason baseline stage and sign-off |
| P1 | docs(p1): add-match-reason intent stage and sign-off |
| P2 | docs(p2): add-match-reason delta spec G1 and sign-off |
| P3 | docs(p3): add-match-reason design tasks and sign-off |
| P4（实现） | `1401cf6` feat(verify): add-match-reason label card match score and reason for S07 |
| P4（合并） | `bfb07ae` Merge `feature/add-match-reason` |
| P4（本阶段记录） | 本条提交 |

## 7. 负责人签署

| 角色 | 姓名 | 本阶段确认内容 | 日期 |
|---|---|---|---|
| AO | Jay | 实现与 P3 任务一致；验证命令可复现；承担遗留项 | 2026-11-16 |
| VL | Neal | 独立复核验证报告与 CI；确认九条场景有对应断言；G2 Pass | 2026-11-16 |
| SA | Jacky、Karena | 实现未越出 Delta Spec；卡片文案符合「不能只给百分比」 | 2026-11-16 |
| IO | Wanye | 收到残余风险（参照物单值、降级路径） | 2026-11-16 |
| SM | Lewis | G2 Pass，S07 可交付；P5 暂缓 | 2026-11-16 |

**阶段结论：Pass（G2）**

## 8. P5 状态

按用户 2026-11-16 指示：**暂不执行 P5，也不归档**。归档时需补：`summary.md`、living spec 合并（`trip-companions`）、`docs/knowledge/` 登记、`changes/archive/2026-11-16-add-match-reason/` 目录。

## 9. R2 实施结果（筛选不参与匹配分，2026-11-16 14:28）

| 项 | 结果 |
|---|---|
| 实现提交 | `fix(p4): add-match-reason keep home filters out of the match score` |
| 匹配入口 | `TripMatch.of(candidate, reference, interests)`；`MatchServiceImpl` 的列表与详情共用 |
| 契约 | `Match.basis` 描述与匹配语义同步；版本 0.8.0 → **0.8.1** |
| 后端验证 | `clean test` 209 通过（`TripMatchTest` 7、`MatchControllerTest` 7） |
| 前端验证 | `npm test` 114 通过（回归） |
| 契约 lint | valid，0 error / 15 既有 warning |
| 端到端 | `companions.spec.ts` 3 项通过 |
| 手工比对 | 带筛选列表与详情对 trip 4 均返回 score 0 |
| 顺带修复 | `TripMatchTest` 移到 `routeme/pojo`，消除包名不一致导致的增量编译残留 |
| 看板 | S07 仍显示 P3；token 无 `project` 写权限，需人工拖到 P4 |

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核 R2 证据，G2 追加 Pass | 2026-11-16 |
| AO | Jay | 交付实现与回归结果 | 2026-11-16 |
| SM | Lewis | 认可 R2；P5 仍暂缓 | 2026-11-16 |