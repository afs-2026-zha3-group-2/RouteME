# 任务计划 — refine-experience-share

- **Change：** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16 / issue #18）
- **阶段：** P3（Task plan）｜ **日期：** 2026-11-16 ｜ **Owner：** Jay（AO）
- **设计：** `design.md` D1–D9；**ATDD：** `atdd-design.md` E1–E12 / U1–U4
- **契约任务：** 无（本次不改 `openapi.yaml`、后端与迁移），因此不存在「契约先于两端」的排序约束。

| id | 任务 | 落点 | 依赖 | 验证 | 状态 |
|---|---|---|---|---|---|
| T1 | 抽出 `coverTone()` 到 `frontend/src/trips/coverTone.ts`，`TripCard` 改为引用；`ExperienceCard` 增加 `.exp-cover` 色条与目的地名 | frontend | — | `npm run typecheck`；`e2e tests/trips.spec.ts` | 待开始 |
| T2 | 新增 `frontend/src/experiences/shareEligibility.ts` 与 `shareEligibility.test.ts`（U1–U4） | frontend | — | `npm test -- shareEligibility` | 待开始 |
| T3 | 重写 `ShareExperiencePage`：hero、「你的体验会去哪里」三条、「分享边界」两条、两种不可用分支；`tripMessages` 增删键；`styles.css` 增 `.share-hero*` / `.share-note*` / `.exp-cover` | frontend | T1、T2 | `npm run typecheck`；`npm test` | 待开始 |
| T4 | `TripDetailPage` 的 `canShare` 改用 `shareEligibility`（保留 `isCompleted` 供「参考此行程发布」） | frontend | T2 | `npm test`；`e2e tests/experiences.spec.ts` | 待开始 |
| T5 | E2E：拆 `keeps experience entry points honest` 为两种提示；补 hero / 去向 / 边界 / 体验卡封面；新增「重复提交即修改」与「已完成分组区分已分享」用例 | e2e | T3、T4 | `npx playwright test tests/experiences.spec.ts` | 待开始 |
| T6 | 回归：后端 `.\mvnw.cmd -B -ntp test`（`ExperienceControllerTest` / `ExperienceServiceTest`）、前端 `npm run build`、全量 E2E | backend / frontend / e2e | T5 | 命令输出摘要写入 P4 验证报告 | 待开始 |
| T7 | 人工走查 1440 / 768 / 390 × 浅 / 深色并留截图；写 `docs/ai4se-plugins/<ts>-local-verify-report.md`、`docs/sdd/refine-experience-share/p4-verify.md`、`g2-decision.md` | docs | T6 | 报告可复核 | 待开始 |

## 落点与边界

| 层 | 文件 |
|---|---|
| frontend | `trips/coverTone.ts`（新）、`trips/TripCard.tsx`、`experiences/ExperienceCard.tsx`、`experiences/shareEligibility.ts`（新）、`experiences/shareEligibility.test.ts`（新）、`experiences/ShareExperiencePage.tsx`、`trips/TripDetailPage.tsx`、`i18n/tripMessages.ts`、`styles.css` |
| e2e | `e2e/tests/experiences.spec.ts` |
| contract / backend / migration | **无改动** |
| docs | `docs/sdd/refine-experience-share/{p3-design,p4-verify}.md`、`openspec/changes/refine-experience-share/g2-decision.md`、`docs/ai4se-plugins/<ts>-local-verify-report.md` |

## 自检

| 检查 | 结论 |
|---|---|
| 每条 Delta Requirement 至少一个任务 | 通过：R1 → T2 / T3 / T5；R2 → T1 / T3；R3 → T1 / T3 / T5 |
| 一个任务只落一层 | 通过：T1–T4 frontend、T5 e2e、T6 回归、T7 docs |
| 契约任务排两端之前 | 不适用（无契约改动） |
| 每个任务有验证命令 | 通过 |
| 与 `atdd-design.md` 场景对应 | 通过：E1–E12 / U1–U4 落在 T2 / T3 / T5 |
| 不含 out-of-scope 项 | 通过：无图片上传、无双栏布局、无 S17、无后端改动 |