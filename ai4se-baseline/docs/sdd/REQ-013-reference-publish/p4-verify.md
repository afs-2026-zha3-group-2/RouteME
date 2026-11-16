# P4 验证记录 — REQ-013-reference-publish

- **Change：** 无新建（REQ-013 / S17，复用已归档的 `add-trip-experiences`）｜ **阶段：** P4（Apply & verify / G2）
- **日期：** 2026-11-16 ｜ **记录人：** Jacky（AO）
- **分支 / 基点：** 主工作区 `main`，基线 `HEAD@b2becdf`（含 P1–P3 记录）
- **前置：** P1 Pass（已验证交付）→ P2 N/A → P3 N/A（对齐自检 Pass）
- **本地验证报告：** [`20261116-171500-local-verify-report.md`](../../ai4se-plugins/20261116-171500-local-verify-report.md)

## 1. 阶段目标

P4 常规是「实现 → 本地验证 → G2」。REQ-013 没有实现任务，所以本阶段只做**行为复核**：在当期 `main` 上把 S17 的四条 AC 跑一遍，确认能力没有因为后续 change（`add-trip-completion`、`refine-safety-report`、登录改造等）而回归。

## 2. 实现摘要

| 层 | 改动 | 状态 |
|---|---|---|
| 代码 / 契约 / 迁移 / 测试 / 原型 | 无 | — |

本阶段**没有**任何 diff；`status = verified` 指 REQ-004 早已交付，不是本轮实现。

## 3. 验证结果

| 命令 | 结果 |
|---|---|
| `cd RouteME/frontend; npm run build` | 成功，1552 modules，JS 1,176.93 kB / CSS 50.86 kB（仅存量 chunk 体积告警） |
| `cd RouteME/frontend; npx vitest run` | 16 文件 / **137 项通过** |
| `cd RouteME/frontend; npx vitest run src/trips/tripForm.test.ts src/route.test.ts src/experiences/experienceForm.test.ts` | 3 文件 / **30 项通过** |
| `cd RouteME/e2e; npx playwright test experiences.spec.ts` | **6 项通过**（16.1s） |
| `cd RouteME/backend; .\mvnw.cmd -B -ntp test "-Dtest=Trip*,Experience*,MyTrips*"` | **87 项通过**，`BUILD SUCCESS`（26.9s） |
| `cd RouteME/backend; .\mvnw.cmd -B -ntp test` | 230 项，**3 项失败**，均在 profile 域（见 §5） |

环境：后端 `localhost:8080`、前端 `localhost:5173` 均为并行会话已启动的实例；后端测试用 Maven 独立跑，不依赖该实例。

## 4. AC 覆盖

| AC | 结论 | 关键证据 |
|---|---|---|
| 已结束行程 / 体验入口 | Pass | E2E `experiences.spec.ts:63`、`:88`；`TripDetailPage.tsx:416-420`、`ExperienceCard.tsx:53-55` |
| 预填目的地 / 路线 / 兴趣 | Pass | E2E `:90`（提示条）、`:93`（途经点 chip）、`:94-97`（兴趣勾选）；`TripCreatePage.tsx:56-62` |
| 日期 / 人数 / 集合区域重填 | Pass | E2E `:91-92`（人数与标题为空）、`:99-100`（必填报错）；`tripForm.ts:23-35,49-85` |
| 新计划与来源无关联 | Pass | `tripForm.test.ts:106-128`（请求体无来源字段）、`route.test.ts:25-28`（`from` 只影响预填）、契约 `TripCreateRequest` |

## 5. 未覆盖与限制

- **后端全量测试 3 项失败（与 REQ-013 无关）：** `UserProfileControllerTest` / `ProfileDataMigrationSqliteTest` / `ProfileMigrationSqliteTest` 断言「`school` 保留旧文本」，但并行会话未跟踪的 `V16__normalize_demo_user_profiles.sql` 已把 `school` 重写为纯校名并把 `major` / `job` / `mbti` 拆列。行程与体验相关 87 项在同一次构建里全绿。
- **构建跑在工作区而非干净 `main`：** `npm run build` 含他人未提交的 `profile` 改动；它证明工作区可构建，不等同于干净 `main` 可构建。
- **E2E 只跑相关 spec：** `experiences.spec.ts` 是 S17 唯一相关用例集；未跑全套 30+ 条。
- 以上都不构成 AC 失败，只是本轮取证边界。迁移版本号冲突（原 `V14__normalize_demo_user_profiles.sql` 与上游 `V14__seed_demo_account_credentials.sql`）已由该会话改为 `V16` 解决，开发库 `flyway_schema_history` 仅到 V13，无校验和残留。

## 6. P4 质量检查

| id | Required | 状态 | 证据 |
|---|---|---|---|
| P4-1 | yes | **Pass** | `docs/ai4se-plugins/20261116-171500-local-verify-report.md`（构建 / 前端 / 后端 / E2E 全部命令与输出，含 3 项无关失败的归因） |
| P4-2 | yes | **Pass** | 报告 Overall = Pass（evidence scope）；无 Fail，无需 Waiver |
| P4-3 | yes | Skipped | 本记录不产生 PR / 远程 pipeline；无 `phase=ci` 报告可引 |
| P4-4 | yes* | Skipped | 未主张部署后验证 |
| P4-5 | yes* | N/A | 无实现提交，不主张 G2；`g2-decision.md` 不适用 |
| P4-6 | yes | Pass | 无代码 diff，不存在自审实现；VL 独立验证仍待 Neal 签署，未由 agent 代签 |

**Stage Overall：验证 Pass（P4-1 / P4-2 / P4-6；G2 不适用）。** 该结论只表示「当期行为符合 AC」，不表示「本轮实现了该能力」。

## 7. 签署

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| AO | Jacky | 本地验证执行与报告 | 2026-11-16 |
| VL | Neal | 独立验证 S17 四条 AC（未到） | 待签署 |
| IO | 不适用 | 无新增需求来源 | — |
| SA | 不适用 | 无 Delta / 无 G1 | — |
| SM | 不适用 | 无排期变更 | — |

**G2 结论：不适用**（无实现提交、无 Delta、无契约变更）。REQ-013 保持 `verified`，不进入 P5。

## 8. 阶段提交链

| 阶段 | 提交 | 说明 |
|---|---|---|
| P1 | `6482e6b` | 意图、Ready 条目、P1 记录与质量报告 |
| P2 | `0f099d2` | P2 准入判定（无 Delta / 无 G1） |
| P3 | `4729acb` | 现状设计确认 + UI 预览 |
| P4 | 本记录 + 本地验证报告 | `docs(p4): REQ-013-reference-publish verify S17 on current main` |

> P1–P3 的提交哈希在 2026-11-16 与 `origin/main` 合并后重写（原 `7fafd94` / `652e38b` / `ede289e`），内容未变。

## 9. 偏离

- 常规 P4 含实现、`tasks.md` 勾选、G2 签署与 pipeline；本阶段无实现，故只做行为复核，G2 记 N/A。
- 前端构建与后端回归都已补齐；后端全量的 3 项 profile 失败随并行会话的 `V16` 迁移与 profile 改动一并处理，不属于本需求。若要在干净 `main` 上复跑，等该会话提交后再执行 `npm run build` 与 `mvnw test` 即可。