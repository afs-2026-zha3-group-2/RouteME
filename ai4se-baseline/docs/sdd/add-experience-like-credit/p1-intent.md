# P1 — add-experience-like-credit（REQ-023 旅行体验获赞增加信用分）

- **日期：** 2026-11-17 ｜ **记录人：** Lewis Liu（当前开发者，发起人确认）｜ **阶段：** P1 Pass（质量 Pass；工件评审 1 Partial + 1 Pass，签署 7/7 齐备）
- **需求：** REQ-023 旅行体验获赞增加信用分（GitHub issue #30；信用系统迭代 2 / Story 3 / 5 点）
- **能力：** `trip-experiences`（体验点赞，ADDED）+ `user-credit`（体验获赞阶梯加分，ADDED）；跨 capability 打包偏离见 proposal 评审 F-1（待 G1 SA 确认）
- **分支 / 基线：** `.worktrees/add-experience-like-credit` / `feature/add-experience-like-credit` / `origin/main@64b38da`
- **P0：** 跳过（仓库基线、规则与工具链已由既有 change 建立；本需求不新建工程脚手架）

## 1. 输入与现状核对

| 输入 | 路径 | 结论 |
|---|---|---|
| issue | GitHub #30 `[P0] 旅行体验获赞增加信用分` | 档位 5/10/15/20/25 → +1…+5；每档一次、锁定、不回滚；同行程同作者 ≤ +5；月度 ≤ +20；自赞禁止、每人每体验一次、点赞者不得分 |
| 用户裁决 | 当次会话（2026-11-17） | D1 点赞全链路 / D2 不做信用明细可见面 / D3 月度 Asia/Shanghai / D4 月度按实发消耗 |
| 信用底座 | `CreditService`、`CreditServiceImpl`、`CreditLedgerEntity`、`V20__add_credit_account.sql` | 0–100 账户 + append-only 账本 + `book`（裁断 / 快照 / 幂等 / 零变化留痕）；**无业务事件调用方** |
| 体验能力 | `ExperienceController`、`ExperienceResponse`、`V8__create_trip_experiences.sql` | 列表 / 详情 / 我的三端点；响应无赞数 / 点赞态；每（行程, 作者）一条体验 |
| 展示面 | `ExperienceCard.tsx`、`TripDetailPage.tsx` 游后体验区 | 两处均无点赞按钮 / 赞数 |
| 原型 | `docs/prototype/ui.js` `expCard()` 与详情 `.exp-item` | 无点赞交互；两处均可插入按钮行 |
| 契约 / 迁移 | `openapi.yaml` 0.14.0（`Error.code` 闭集）；`db/migration` 最大 V20 | 需次版本 + 两字段 + 两端点；迁移号 P3 排他（`add-ai-itinerary` 声明 0.15.0 + V21） |
| 在途 change | `add-credit-account`、`add-experience-photos`、`refine-experience-share`、`refine-inspiration-home` | 均未归档；本 change 只追加 ADDED 块，归档需排在其后 |

## 2. 产出

| 工件 | 路径 | 说明 |
|---|---|---|
| 意图捕获 | `requirement-workspace/intents/REQ-023-experience-like-credit.md` | 原始意图、证据锚点、D1–D4、Discovery Go |
| Ready 需求 | `requirement-workspace/requirements/REQ-023-experience-like-credit.md` | 24 场景（L / T / D / E 四组）；blocking OQ 0；DoR BLOCKER 0 |
| Deep-dive | `requirement-workspace/deep-dive.md`「REQ-023 增补」 | ① 数据契约（点赞表 / 赞数派生 / 档位派生 / 月度派生）/ ② 边界归属 / ③ 跨 REQ 一致 / ④ 展示契约 |
| 影响面 | `requirement-workspace/impact-brief.md` §22 | 22.1–22.8；as-is → delta、blast radius、风险、拆分边界 |
| 登记 | `requirement-workspace/registry.md`、`handoff.md`、`stories.md` | REQ-023 → `add-experience-like-credit`；故事「信用迭代2-S3」 |
| 提案 | `openspec/changes/add-experience-like-credit/proposal.md` | 问题 / 范围 / 决策 D1–D10 / 影响面 / 规模 / 残余风险 |
| Delta Spec | `openspec/changes/add-experience-like-credit/specs/trip-experiences/spec.md` | ADDED 2 Requirement / 12 Scenario（点赞与取消、赞数与点赞态展示） |
| Delta Spec | `openspec/changes/add-experience-like-credit/specs/user-credit/spec.md` | ADDED 3 Requirement / 15 Scenario（阶梯加分、月度上限、计分边界） |
| 提案评审 | `docs/reviews/20261117-add-experience-like-credit-proposal-review.md` | Partial（0 BLOCKER / 1 WARNING 双 capability 偏离 / 4 SUGGESTION） |
| 规格评审 | `docs/reviews/20261117-add-experience-like-credit-spec-review.md` | Pass（0 BLOCKER / 0 WARNING / 4 SUGGESTION） |
| P1 质量报告 | `docs/ai4se-plugins/20261117-151032-quality-checklist-report.md` | Overall Pass；P1-5 / P1-6 可选 Skipped |
| 检查点日志 | `docs/ai4se-plugins/20261117-151006-quality-checklist-checkpoints.md` | C1=p1、C2=full-stage（skipped-preanswered）；probe 全部 FOUND |

## 3. 校验证据

- `openspec validate add-experience-like-credit --strict` → `Change 'add-experience-like-credit' is valid`（在 `ai4se-baseline/` 下执行）。
- P1 质量报告 required 4/4 Pass；P1-5（explore kit）/ P1-6（agent evalset）未运行 → Skipped，不阻断。
- 未改动任何业务代码、后端、契约、迁移或原型；本阶段只写工件与评审。

## 4. 工件签署（`@rule:artifact-review-gate`）

| 对象 | 签署位 | 批准人 | 批准时间 | 批准来源 |
|---|---|---|---|---|
| `proposal.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| `specs/trip-experiences/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| `specs/user-credit/spec.md` | 1 / 1（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| proposal 评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| proposal 评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） |
| spec 评审报告 | 1 / 2（WAYNE） | WAYNE（IO） | 2026-11-17 | 发起人当次会话确认「全部批准」 |
| spec 评审报告 | 2 / 2（当前开发者） | Lewis Liu | 2026-11-17 | 发起人当次会话确认（当前开发者 = Lewis Liu） |

签署位 7/7 齐备；proposal 评审为 Partial（0 BLOCKER / 1 WARNING 双 capability 偏离 / 4 SUGGESTION），WARNING 交由 G1 的 SA 裁决。

## 5. 残余风险与偏离

| 项 | 说明 / 处置 |
|---|---|
| 双 capability 偏离 | 与 `@rule:sdd-artifacts`「一个 change 只改一个 capability」存在偏离；理由与先例已记录在 proposal 残余风险，G1 需 SA 明确确认 |
| 原型规则锚点漂移 | 权威规则区无 `prototype-ui-alignment` 锚点；本阶段工件改用普通路径表述 |
| 归档顺序 | 需排在 `add-credit-account` / `add-experience-photos` / `refine-experience-share` / `refine-inspiration-home` 之后 |
| 契约 / 迁移号 | P3 排他确认；`add-ai-itinerary` 已声明 0.15.0 + V21 |
| 月度并发严格性 | P3 设计给出保障方案并写测试 |
| 多篇体验规则 | 当前模型不可经 API 构造；以结算 max 查询 + 多行数据单测覆盖 |
| 提交约定 | 按 `docs/sdd/README.md` 阶段提交（`docs(p1): add-experience-like-credit …`）；P1 只本地提交，不 push（用户未要求推送） |

## 6. 下一阶段

- P2 `/sdd:delta-craft`：AC / DoV 复核与 `consistency-lint`；G1 由 IO Wanye + SA Jacky/Karena 具名签署（含双 capability 偏离裁决）。
- P2 前置：签署位 7/7 齐备；确认 `like_count` / `liked_by_me` 与「体验不存在」错误码的契约口径。
