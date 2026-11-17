# P4 — refine-detail-companions（REQ-020 同行者卡片化实现与验证）

- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者）｜ **阶段：** P4 Pass（G2 Pass，本地验证）
- **Change：** `refine-detail-companions` ｜ **分支：** `feature/refine-detail-companions`
- **实现提交：** `aa702f0` ｜ **P3 设计提交：** `02179bb` ｜ **基线：** `6f9cb46`
- **G2：** [`openspec/changes/refine-detail-companions/g2-decision.md`](../../openspec/changes/refine-detail-companions/g2-decision.md)

## 1. 实现落点

| 文件 | 改动 |
|---|---|
| `frontend/src/trips/companions.ts` | 新增纯函数 `tripCompanions(participants, publisherId)`：过滤发布者、按 id 去重保首、保持响应顺序 |
| `frontend/src/trips/companions.test.ts` | 新增 6 条单测（过滤 / 去重 / 保序 / 仅发布者 / 空数组 / 不改入参） |
| `frontend/src/trips/CompanionCard.tsx` | 新增同行者资料卡：整卡 `button` 打开 `openProfile`，聊天 `a` 为兄弟节点；复用 `.publisher-*` 排版 |
| `frontend/src/trips/TripDetailPage.tsx` | 同行者区改卡片列表 + 空态；`canChat` 条件不变；人数与排序不动 |
| `frontend/src/i18n/tripMessages.ts` | 新增 `detailParticipantsEmpty = '还没有其他同行者。'` |
| `frontend/src/styles.css` | 摘出 `.detail-stops`、删除两处旧 `.detail-participants` 规则；末段追加卡片 / 空态样式（仅既有令牌） |
| `e2e/tests/detail-companions.spec.ts` | 新增 7 条：A1 契约守卫、卡片与发布者不重复、字段回退、空态、资料弹窗、聊天资格、窄屏双主题 |
| `e2e/tests/chat-entry.spec.ts` | 选择器 `.detail-participants` → `.detail-companions` |
| `docs/prototype/ui.js` / `styles.css` | 原型先行：`compPanel` 过滤发起人、卡片化、空态；`.companion` 保留给身份切换弹窗；`.meter` 补 `display: block` |

## 2. 验证结果

详见 [`docs/ai4se-plugins/20261117-142500-local-verify-report.md`](../../docs/ai4se-plugins/20261117-142500-local-verify-report.md)。

| 层 | 结果 |
|---|---|
| 规格 | `openspec validate refine-detail-companions --strict` → valid |
| 前端单测 | `npm test` → 36 files / 255 tests passed |
| 前端类型 / 构建 | `npm run typecheck` 0 error；`npm run build` 成功 |
| 后端回归 | `.\mvnw.cmd -B -o clean test` → 248 tests / 0 failures |
| E2E | `detail-companions.spec.ts` + `chat-entry.spec.ts` → 8 passed（Red 阶段 7 failed / 1 passed） |
| 原型走查 | 1440 / 390 截图：卡片与发布者同构、发布者不重复、聊天独立、无溢出 |

## 3. 回归失败归因（非本 change）

- `profiles.spec.ts` 4 条：同批次 `companions.spec.ts` 以周野身份累积「参与同行」；**fresh 库单独运行 8/8 Pass**。
- `trips.spec.ts` 地图 / 发布 11 条：缺 `backend/amap-local.yml` 与种子日期翻篇；**基线 `6f9cb46` 临时 worktree 同环境复跑 3 条代表性用例同样失败**。
- 其余受影响用例（同行者区、聊天、资料弹窗、分享区、我的旅行）全部通过。

## 4. 反向复核

- 无 `backend/**`、`openapi.yaml`、`db/migration/**` 改动。
- A1 守卫确认 `participants` 仍含发布者、条数与 `DemoUser` 字段不变。
- 聊天入口资格条件未变，旁观者 0 个入口、本人卡片 0 个自我入口。

## 5. G2 签署表

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 复核本地验证报告、Red/Green 证据与失败归因，G2 判 Pass | 2026-11-17 |
| AO | Lewis Liu | 交付实现、测试与验证报告 | 2026-11-17 |
| IO | WAYNE | 认可范围与验收口径（沿用 G1） | 2026-11-17 |
| SA | Jacky | 实现符合 D1 展示口径与零契约边界 | 2026-11-17 |
| SM | Lewis | 看板状态可推进到 P4 / Pass | 2026-11-17 |

> VL 为独立验证人，AO 未自签 VL；签署来源为用户 2026-11-17 当次会话确认「Pass（Neal 签 VL）」。

## 6. 条件与残余风险

- **合并前条件：** 开 PR 后在目标提交上跑 CI 并附链接；未绿不得合入。
- **合并后动作：** grep 抽查 `styles.css` 的 `.detail-companions` / `.companion-card` / `.companion-chat` 是否仍在（`styles.css` 为并行修改热点）。
- **残余风险：** 组件层无单测（仓库无 jsdom / Testing Library）；同行者超过 6 人的折叠策略未定义；地图 / 发布类 E2E 的本机环境债务未在本 change 处理。

## 7. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P1 | `6b6038d` | `docs(p1): refine-detail-companions add REQ-020 proposal and delta` |
| P2 | `afb3bac` | `docs(p2): refine-detail-companions refine the delta and record G1` |
| P3 | `02179bb` | `docs(p3): refine-detail-companions design the companion cards and tasks` |
| P4 实现 | `aa702f0` | `feat(p4): refine-detail-companions render companions as profile cards` |
| P4 记录 | 本条提交 | `docs(p4): refine-detail-companions record the verification and G2` |

## 8. 下一阶段

- PR → CI → 合并；P5 按用户既定要求**暂不执行**（不归档）。
