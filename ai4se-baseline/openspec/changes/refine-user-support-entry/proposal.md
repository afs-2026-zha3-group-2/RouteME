# 变更提案：refine-user-support-entry

- **需求来源：** 用户验收反馈（2026-11-17）「用户不需要看到帮助与反馈，只有内部管理员可以看到帮助与反馈，用户界面上单独设计一个客服入口」｜ **归属：** REQ-018 管理后台的客服能力（界面调整，不新增需求编号）
- **能力：** `user-support`（ADDED Requirements：用户侧独立客服入口 + 帮助与反馈的后台归属）
- **规模：** S（1 条路由 + 侧栏 / 悬浮 / 账号菜单入口 + 1 个新页面 + 后台页签 + 2 份 E2E）
- **规则：** `@rule:spec-first`、`@rule:web-coding-style`、`@rule:tdd-cycle`、`@rule:prototype-ui-alignment`
- **本回合状态：** P4 已实现并通过门禁（后端 `verify` 597/597、前端 `typecheck` + 446 tests + `build`、E2E 受影响 19/19）；记录见 `docs/sdd/refine-user-support-entry/p4-apply.md`。

## 问题

现 `#/help` 面向全体用户，把「联系人工客服」与「我的举报」混装在一页，用户侧导航也因此出现「帮助与反馈」。这带来三个问题：

- **入口语义错位。** 用户需要的是「找客服」，不是一个叫「帮助与反馈」的杂项页；举报进度属于内部运营事项，放在用户侧容易被理解为可自助催办。
- **举报进度暴露面多余。** 举报状态与管理员处理备注只在后台有意义；用户侧已通过提交回执知道「已收到」。
- **后台入口缺失。** 目前管理员与普通用户看到同一份侧栏，帮助与反馈既不属于后台页签，也没有「仅内部可见」的约束。

## 范围

**In scope**

- **用户侧独立客服入口** `#/support`：只承载客服会话（发起 / 等待接入 / 对话 / 已结束 / 重新发起），不出现任何举报记录。
- **入口落点**：宽屏侧栏「我的」分组新增「联系客服」；窄屏新增悬浮客服按钮（位于底部导航上方）与账号菜单项；底部导航不新增格子。
- **帮助与反馈下线**：侧栏「管理」分组与后台页签均不再提供「帮助与反馈」，`#/help` 路由删除、旧深链落到不存在页；页面代码一并移除（含管理员的举报进度视图）。
- **测试**：`route.test.ts` 增加 `#/support` 并把 `#/help` 锁定为不存在页；`customer-service.spec.ts` 改为「用户只有客服入口 / 帮助与反馈对普通用户与管理员都不可见」；`admin.spec.ts` 的举报状态断言改到管理后台确认。

**Out of scope**

- 客服后端接口与数据模型（`/api/service/**`、`/api/help/reports` 不变；`help/reports` 只是不再有用户界面）。
- 举报提交与处理流程、通知 / 消息中心、管理后台举报页改造。
- 契约（`openapi.yaml`）与数据库迁移：本次零改动。

## 影响面

- 前端：`route.ts`、`App.tsx`、`shell/AppShell.tsx`、`admin/AdminLayout.tsx`、`help/SupportPage.tsx`（新增）、`i18n/adminMessages.ts`、`styles.css`。
- 测试：`route.test.ts`、`e2e/tests/customer-service.spec.ts`、`e2e/tests/admin.spec.ts`。
- 后端 / 契约 / 迁移：无。
