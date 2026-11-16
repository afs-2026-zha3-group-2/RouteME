# 变更提案：refine-trip-application

- **需求来源：** 用户指令「作为想加入的人，我看到一个行程，我想要加入，所以希望点击申请后加入该行程团队，并且我希望留一句话说明」+ 原型故事 S08 ｜ **需求条目：** `requirement-workspace/requirements/REQ-010-trip-application-entry.md`
- **能力：** `trip-companions`（MODIFIED）
- **规模：** S（单页面展示增量；无后端、契约、迁移变更）
- **规则：** `@rule:spec-first`、`@rule:sdd-artifacts`、`@rule:web-coding-style`；视觉基准：`docs/prototype/prototype.html` + `docs/prototype/styles.css`（Qoder 项目规则投影 `prototype-ui-alignment`）
- **编号说明（2026-11-16）：** P1 时按 `origin/main@b93f45b` 定为 REQ-009；合入 main 时与 `add-user-profiles` 撞号，经用户裁决按「后到者顺延」改为 **REQ-010**。本文与 delta / design / tasks / G1 记录已同步改号；`docs/ai4se-plugins/` 下的历史质量报告与本地验证报告保留当时编号。

## 问题

`add-trip-companions` 已归档并进入 Living Spec，后端已经能提交、取消、接受、拒绝申请，并在本人、重复、满员、已结束时拒绝。但前端与原型 S08 脱节：

- 申请入口是弹窗，不是原型「下一步」面板里的内联申请区；
- 重复申请时页面直接把 `DUPLICATE_APPLICATION` 错误码放进提示，没有「已申请，请等待回应」；
- 提交后的状态是一个独立的「申请待处理」Tag 区块，而原型显示的是「申请已提交，等待回应」+「撤回申请」。

结果是「打开详情 → 留一句话 → 提交 → 等待 / 撤回」这条最短链路在视觉与反馈上不连贯，用户无法从页面确认申请是否成功、下一步该做什么。

## 范围

**In scope**

- 行程详情页的申请入口改为原型的内联申请区：一句申请说明（选填、≤120 字）、「提交同行申请」按钮、聊天权限说明。
- 入口只对「非本人 + 招募中 + 未满员 + 无 pending / accepted 申请」展示。
- 提交成功后申请区变为待处理态：等待发布者回应提示 + 撤回申请；刷新后仍为待处理。
- 重复申请：后端 `DUPLICATE_APPLICATION` → 前端「已申请，请等待回应」，不新增申请并刷新状态。
- 满员 / 已结束：入口不可用并显示「人数已满」/「行程已结束」；绕过前端提交时后端 409 `TRIP_NOT_OPEN`，前端显示可读原因并刷新行程。
- 撤回后（行程仍可申请）恢复内联申请区。
- 本人发布的行程不展示申请入口；发布者的申请处理入口不变。
- 为 `trip-companions` 写一份 MODIFIED delta spec，保留既有 5 个场景并补齐入口 / 待处理展示场景。

**Out of scope**

- 自动加入团队、跳过发布者审核、提交后立即开放聊天。
- 申请说明改为必填、调整 120 字上限、富文本 / 附件。
- 新增后端端点、数据库迁移、申请状态机变更、`openapi.yaml` 版本变更。
- 行程卡片入口、批量申请、申请提醒 / 推送 / 站内信。
- 发布者处理申请、我的旅行分组、聊天、退出同行。
- 首页、我的旅行、聊天等其他页面的视觉重做。

## 影响面

| 位置 | 改动 |
|---|---|
| `RouteME/frontend/src/trips/TripDetailPage.tsx` | 申请弹窗改为内联申请区；待处理态改为等待提示 + 撤回；重复 / 不可申请错误映射；提交失败后刷新行程与申请状态 |
| `RouteME/frontend/src/i18n/tripMessages.ts` | 申请区、待处理、撤回、重复申请与不可申请原因文案 |
| `RouteME/frontend/src/styles.css` | 仅补内联申请区 / 等待提示的布局与令牌引用；不重做视觉 |
| `RouteME/frontend/src/**/*.test.ts(x)`、`RouteME/e2e/tests/companions.spec.ts` | 申请入口派生、说明选填、错误映射、待处理 / 撤回、满员 / 结束拒绝 |
| `openspec/changes/refine-trip-application/specs/trip-companions/spec.md` | MODIFIED：扩展「提交与取消同行申请」，保留既有 5 场景 + 新增 3 场景 |
| `trip-plans`（上游，只读） | 行程状态（recruiting / full / completed）与人数仍由 `trip-plans` 单一写入；本 change 只读消费，不改规则 |
| `docs/prototype/` | **不改**：入口 / 待处理 / 不可申请原因均以现有原型为准；重复提示是服务端错误映射，原型不展示 |
| 后端 / `openapi.yaml` / 迁移 | **无改动**：`message` 选填 ≤120 与错误码已存在；保留 `ApplicationServiceTest` 回归 |
| Living Spec `openspec/specs/trip-companions/spec.md` | 归档阶段用本 change 的 MODIFIED delta 替换「提交与取消同行申请」块，保留既有 5 场景 |

## 决策

| 决策点 | 选择 | 理由 |
|---|---|---|
| 申请入口形态 | 详情页内联申请区 | 用户要求严格按原型；原型 `actionBox` 就是内联表单，弹窗会打断「判断 → 提交」的上下文 |
| 说明是否必填 | 选填，≤120 字 | 用户裁决 D1；Living Spec 与契约现状一致，不改后端校验 |
| 待处理态 | 等待回应提示 + 撤回申请 | 用户裁决 D2：严格按原型；状态可见由提示与「我的旅行」共同满足，不用字面「已申请，待处理」按钮 |
| 重复申请反馈 | 前端映射「已申请，请等待回应」 | 用户 AC；后端错误码已稳定，只在页面层做可读映射 |
| 满员 / 已结束 | 入口不可用 + 原型原因；后端 409 兜底 | 用户 AC 明确「后端同样拒绝，不只靠前端隐藏」；现状已满足，只补展示 |
| 后端 / 契约 | 不改 | 申请规则与 `message` 契约已存在；改后端会把展示增量扩成规则变更 |
| 原型 | 不改 | 原型已定义入口、待处理与不可申请原因；重复提示不在原型页面展示 |
| capability 粒度 | 单一 `trip-companions`，MODIFIED | 申请属于该能力；只扩展既有 Requirement，不新增平行权威 |

## 验收信号

1. 打开他人招募中、未满员、未申请过的行程详情，操作区直接显示内联申请表单（说明选填、120 字、提交按钮、聊天说明），没有申请弹窗。
2. 留空或填写说明后提交，生成 PENDING；申请区变为「申请已提交，等待 {发布者昵称} 回应」+「撤回申请」；刷新后仍为待处理。
3. 自己发布的行程不显示申请入口；发布者的申请处理与结束行程入口保持可用。
4. 已有 pending / accepted 时绕过前端再次提交，后端返回 `DUPLICATE_APPLICATION`，页面提示「已申请，请等待回应」，申请列表不新增记录。
5. 满员 / 已结束行程的入口不可用并显示「人数已满」/「行程已结束」；直接调用接口返回 409（无有效申请时为 `TRIP_NOT_OPEN`；已有有效申请时按 `DUPLICATE_APPLICATION` 拒绝）。
6. 撤回 pending 申请后状态变为「已取消」，且行程仍可申请时恢复内联表单。
7. `openspec validate refine-trip-application --strict` 通过；`npm run build`、`npm test`、后端 `mvnw verify` 与相关 E2E 全绿。

## 残余风险

| 风险 | 处理 |
|---|---|
| 页面停留期间行程变满 / 结束，前端 `canApply` 仍是旧快照 | 提交失败后强制 `reload()` 行程并刷新申请状态；场景 8 覆盖 |
| 重复申请与满员错误码优先级（后端先判重复） | 前端分别映射 `DUPLICATE_APPLICATION` 与 `TRIP_NOT_OPEN`，不写成单一分支 |
| E2E 选择器从弹窗改为内联表单 | 同步更新 `companions.spec.ts` 的按钮、placeholder 与状态断言；以用户可见文案定位 |
| 说明为空白时被当作有效内容 | 前端 trim 后空 → `null`；后端 `normalizeMessage` 继续保持 |
| 「已申请，请等待回应」与原型 mock 文案差一个「请」字 | 用户 AC 明确指定；该字符串只出现在服务端错误映射，原型页面不展示 |
| 阶段提交与 `@rule:git-commit-conventions` 冲突 | 用户当次明确要求「每个阶段一次提交、P4 后推送、推送前先 pull」，以用户指示为准，并在交付说明记录偏离 |

## 交付边界

本提案为 P1 产物，只回答「为什么改、改哪些能力、验收信号是什么」。`design.md`、`atdd-design.md`、`tasks.md`、代码与验证属 P3 / P4；Living Spec 合并在归档阶段完成。
