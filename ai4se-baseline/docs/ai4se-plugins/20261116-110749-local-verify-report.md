# Local Verify Report: add-user-profiles

**Date:** 2026-11-16 (timezone: Asia/Shanghai, +0800)
**Root:** c:\Git\ITA\RouteME\ai4se-baseline
**Scope:** local+evidence
**Change id:** add-user-profiles (REQ-008 / capability `user-profiles`)

## Summary

| Dimension | Status |
|-----------|--------|
| Build | Partial |
| Static scan | Pass |
| Code review | Pass |
| Evidence (OpenSpec) | Pass |
| **Overall** | **Partial** |

**PR gate:** 无阻断性 Fail。Partial 来自两处非代码缺口：全量 E2E 中 5 条 main 既有陈旧用例失败（与本 change 无关），以及 `docs/feedback/verification-commands.md` 仍是占位模板导致命令白名单为空。G2 由 VL 依据下列残余风险判断。

## Local commands

| Command | Source | Exit | Summary |
|---------|--------|------|---------|
| `npx @redocly/cli lint openapi.yaml` | `docs/knowledge/rules/quality/rules.md`（`@rule:api-contract`） | 0 | 契约有效；7 个 warning 均为 V10 之前已存在（`/users` 无 4XX、既有 rejected 示例不满足 schema） |
| `.\mvnw.cmd -B verify`（backend） | `@rule:java-testing` / `quality/rules.md` | 0 | 161 tests，0 failures，BUILD SUCCESS |
| `npm run build`（frontend） | `quality/rules.md` | 0 | tsc --noEmit + vite build 通过 |
| `npm test`（frontend） | `quality/rules.md` | 0 | 10 files / 76 tests 全通过（含新增 `profileFormat.test.ts` 9 条） |
| `npx playwright test tests/profiles.spec.ts` | tasks T11 / atdd-design | 0 | 8/8 通过（双入口、字段、共同兴趣、自我查看、隐私、错误态、既有举报回归） |
| `npx playwright test`（全量） | `quality/rules.md` | 1 | 15 passed / 5 failed；失败均为 main 上既有陈旧用例（见 WARNING-1），新增与本次更新的用例全通过 |
| 临时响应式检查（已删除脚本） | `@rule:prototype-ui-alignment` | 0 | 资料弹窗在 1440 / 1024 / 768 / 390 与深色主题下无横向溢出 |

> 说明：`docs/feedback/verification-commands.md` 只有占位示例，probe 报 `whitelist_empty:yes`；按 C2 用户确认改用项目规则已声明的命令，未使用 `run-verify.sh`。

## Code-review highlights

- 后端新增 `UserProfileController → UserProfileService → UserProfileServiceImpl`，只读聚合，不拥有表；返回 `UserProfileResponse` 白名单字段，username / password_hash / token 不进入响应；不存在抛 `UserNotFoundException`（`USER_NOT_FOUND` 404）。
- 统计口径与 G1 一致：发布/已完成按 `TripPlan.publisherId` 过滤，参与同行只算 `isAccepted()`，游后分享取 `ExperienceService.mine().size()`；没有新增表的写路径。
- 前端 `ProfileProvider` 只挂一个 `ProfileModal`，两个入口共用；每次打开重置状态，失败时清空旧资料。
- `TripCard` 由 `<a>` 改为 `<article>` + `tc-overlay` 覆盖链接 + 发布者 `<button>`，避免嵌套交互元素；`tc-host` z-index 2 保证点击发布者不触发卡片跳转（E2E 已验证）。详情页发布者改为 button，内部 `div/p` 改为 `span` 以符合 button 内容模型。
- 样式全部使用既有令牌（`--surface-2`、`--line`、`--jade`、`--font-num` 等），新增 `.tag.hit`、`.privacy-note`、`.profile-*` 与原型 S02 对齐；680px 以下统计改 2 列。

## Evidence checklist

| ID | Check | Result | Mark | Notes |
|----|-------|--------|------|-------|
| V1 | Task completion | Pass | [fact] | `tasks.md` T1–T12 完成；T13 属 P5（知识库/归档），按计划未做 |
| V2 | Requirement coverage | Pass | [fact] | R1→双入口（TripCard/TripDetailPage）；R2→ProfileModal 字段/文案；R3→UserProfileServiceImpl 四项统计；R4→404/失败态；R5→响应白名单 + 无举报按钮 |
| V3 | Scenario coverage | Pass | [fact] | 20 个 Scenario 由 `UserProfileControllerTest`（5）、`ProfileDataMigrationSqliteTest`（1）、`profileFormat.test.ts`（9）与 `profiles.spec.ts`（8）覆盖；关闭弹窗与既有举报回归均有 E2E |
| V4 | Requirement↔impl mapping | Pass | [fact] | 端点契约 0.8.0 与实现字段一致；统计值与种子数据核对（用户 2：3/1/2/1；用户 3：2/0/1/1；用户 4：1/0/0/0） |
| V5 | Spec drift | Pass | [fact] | 隐私文案按 G1 裁决改为“昵称、头像、身份/专业、加入时间、简介与旅行兴趣”；举报按钮按用户指示排除，未影响既有举报 |
| V6 | Design follow-through | Pass | [fact] | D1 无身份头；D2 分层；D3 现算统计；D4 契约 0.8.0；D5 V10；D6 Provider+Modal+纯函数；D7 卡片重构；D8 自我/空交集不展示；D9 失败不保留旧资料；D10 测试落位 |
| V7 | Code pattern fit | Pass | [fact] | 新类位置与命名沿用现有多数分层；record 响应、`BusinessException` 子类、`@SpringBootTest + MockMvc + @Transactional` 测试风格一致 |
| V8 | Necessity (anti-creep) | Pass | [fact] | 改动文件均可追溯到 tasks T1–T12；未实现举报、资料编辑、聊天页入口、NFR 专项；`trips.spec.ts` 的两处断言属于 T11 指定的同一身份门用例更新 |

## Evidence slots (E1 / E2 / E3)

| Slot | Status | Source |
|------|--------|--------|
| E1 Machine | Pass | 本报告 Local commands（本地 CI 等价命令；尚无远端 ci-report） |
| E2 AI | Pass | 本报告 Evidence checklist + Local commands |
| E3 Human | Pending | G2 由 VL 签署；本次未自签 |

## Five-question map

| Q | Maps to | Status |
|---|---------|--------|
| Q1 Complete? | V1–V3 | ✅ |
| Q2 Correct? | V4–V5 | ✅ |
| Q3 Coherent? | V6–V7 | ✅ |
| Q4 Necessary only? | V8 | ✅ |
| Q5 Risk controllable? | residual + red lines | ⚠️ 残余风险已记录，G2 判断 |

## Findings

### CRITICAL

无。

### WARNING

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 全量 E2E 有 5 条 main 既有陈旧用例失败：`.ant-popconfirm`（当前为 Modal 确认）、`.experience-card`、旧创建表单 label、旧首页筛选 checkbox；这些 spec 早于 user-auth / 视觉改版，非本 change 引入 | [fact] | `e2e/tests/companions.spec.ts:62`、`experiences.spec.ts:38,52`、`trips.spec.ts:54,111` | 另开测试清理 change 对齐当前 UI；本 change 不做范围外重写 |
| 2 | 命令白名单文件仍是占位模板，导致 probe `whitelist_empty:yes`，只能采用规则声明的命令 | [fact] | `docs/feedback/verification-commands.md` | 由 harness owner 补齐真实命令后，后续 P4 可改用 `run-verify.sh` |
| 3 | E2E 依赖本机安装 `e2e/node_modules` 与 Playwright Chromium；本次首次运行前两者均缺失 | [fact] | `e2e/` | 在 README/流水线中固定 `npm ci && npx playwright install chromium` |

### SUGGESTION

| # | Finding | Mark | Location | Suggestion |
|---|---------|------|----------|------------|
| 1 | 公开资料隐私边界目前由响应白名单保证；数据模型尚无电话/证件等字段 | [inference] | `UserProfileResponse` | 未来新增用户字段时先做隐私审查再决定是否进入该响应；可用契约测试断言禁用字段 |
| 2 | 统计为 O(n) 全量过滤，演示规模可接受 | [fact] | `UserProfileServiceImpl` | 数据量增长后改 mapper count 查询，契约不变 |

## Residual risks

| # | Risk | Why open | Mitigation |
|---|------|----------|------------|
| 1 | 全量 E2E 仍红（5 条陈旧用例） | 与本次功能无关，修复需重写他人 spec | accepted，已记 WARNING-1，建议独立 change 处理 |
| 2 | 身份模式分叉（演示 `X-User-Id` 与注册会话） | 本 change 刻意让 profile 端点无身份依赖 | accepted，共同兴趣在前端计算，避免耦合 |
| 3 | V10 改变演示计数（用户 4、行程 7） | 种子数据是展示非学生形态与统计的必要前提 | mitigated，相关迁移/接口/E2E 计数已同批更新 |
| 4 | 统计在请求时全量计算 | 当前数据量小，避免过早优化 | accepted，见 SUGGESTION-2 |
| 5 | 原型隐私文案与本实现文案不同（原型未含身份/加入时间） | G1 决定按实际展示字段调整 | accepted，P5 记录原型差异 |
| 6 | 举报按钮按本次范围排除 | 用户明确要求未来迭代再议 | accepted，已有聊天/行程举报未受影响（E2E 覆盖） |
| 7 | 本地 SQLite 已实际迁移到 V10 | 启动本地后端验证时 Flyway 自动升级 | accepted，迁移只增不改，回滚需恢复备份 |

## Waiver

N/A — no waiver（Overall=Partial，无阻断性 Fail）。
