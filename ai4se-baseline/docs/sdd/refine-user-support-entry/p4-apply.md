# P4 记录：refine-user-support-entry

- **Change：** `refine-user-support-entry`（REQ-018 客服能力的界面调整）｜ **阶段：** P4（apply）
- **日期：** 2026-11-17
- **能力：** `user-support`（ADDED 2 Requirement / 6 Scenario，`openspec validate --strict` valid）
- **后端 / 契约 / 迁移：** 零改动

## 1. 用户裁决

> 用户不需要看到帮助与反馈，只有内部管理员可以看到帮助与反馈，用户界面上单独设计一个客服入口。

## 2. 落地

| 项 | 处置 |
|---|---|
| 用户侧入口 | 侧栏「我的」分组新增「联系客服」→ `#/support`；窄屏悬浮按钮（`≤900px`，底部导航上方）与账号菜单同名项；底部导航不新增格子 |
| 用户侧页面 | 新增 `frontend/src/help/SupportPage.tsx`：客服会话（加载 / 空态 / 等待接入 / 处理中 / 已结束 / 重新发起）+ 常见问题侧栏 + 登录提示；不含任何举报记录 |
| 帮助与反馈 | 已下线：删除 `#/help` 路由与 `HelpPage`，侧栏「管理」分组与后台页签均无入口，旧深链落到不存在页 |
| 路由 | `route.ts` 新增 `support`；删除 `help` |
| 文案 / 样式 | `adminMessages.support*`；`styles.css` 新增 `.support-*`、`.support-fab`，复用既有色板 / 阴影令牌，深浅色自适应 |
| 测试 | `route.test.ts` 增补；`customer-service.spec.ts` 的 `[C1]` / `[C3]` 跟随；`admin.spec.ts` 举报状态断言移到管理后台 |

## 3. 为什么不再给用户看举报进度

举报进度是内部运营信息（含处理备注），用户侧只保留「已提交」回执；需要催办时走客服。`/api/help/reports` 接口与后端测试保持不变，仅移除用户侧页面入口，后续如需「举报记录」可另开 change。

## 4. 门禁

| 门禁 | 结果 |
|---|---|
| 前端 `typecheck` | 通过 |
| 前端 `npm test` | **446/446（56 文件）** |
| 前端 `build` | 通过 |
| `openspec validate refine-user-support-entry --strict` | valid |
| E2E | `customer-service` / `admin` / `safety-report` **19/19 绿**（基址 `http://localhost:5174`） |
| 后端 | 无改动（本轮未复跑，沿用前一轮 `verify` 597/597） |

## 5. 视觉与响应式核对（文本化，无截图）

| 视口 | 观察 |
|---|---|
| 1440 × 900 | 文档无横向溢出（0）；hero 1100×181、圆角 22px；主区两列 732 / 352；3 条能力标签、3 条常见问题；侧栏为「旅行灵感 / 旅行地图 / 发布行程 / AI 规划 / 我的旅行 / 同行消息 / 联系客服」 |
| 390 × 844 | 文档无横向溢出（0）；客服页单列；悬浮客服按钮 102×40、右距 14px、距底 74px（位于底部导航上方） |
| 管理员 | `#/admin` 可正常进入；侧栏与管理后台页签均无「帮助与反馈」，旧深链 `#/help` 落到不存在页 |

## 6. 未签项

- **G2（VL）未签署，本记录不代签。**

## 7. 后续修订（2026-11-18）

按用户要求把「帮助与反馈」从平台管理员导航中一并移除：删除 `#/help` 路由与 `HelpPage`，侧栏与后台页签不再提供入口，旧深链落到不存在页。对应 Delta 已由「仅管理员可见」改为「帮助与反馈已下线」，新增/更新后的 E2E 为 13/13（`admin` + `customer-service`）。
