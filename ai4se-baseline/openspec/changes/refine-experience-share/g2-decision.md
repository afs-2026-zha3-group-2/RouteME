# G2 decision — refine-experience-share

- **Gate:** G2（Verify）
- **Change:** `refine-experience-share`（`trip-experiences` MODIFIED，REQ-004 / S16，issue #18）
- **Timestamp:** 2026-11-16T17:05+0800
- **Recorded by:** Jay（AO）

## Inputs

| Artifact | Path | Result |
|---|---|---|
| Local verify report | `docs/ai4se-plugins/20261116-165905-local-verify-report.md` | 前端 141 / 后端 230 / 相关 E2E 8 全绿；全量 E2E 55 passed / 1 failed（既有债务）；人工走查 6 张 Pass；Overall Pass |
| Pipeline report（ci / cd） | `docs/ai4se-plugins/20261116-204334-pipeline-report.md`、`openspec/changes/refine-experience-share/ci-report.md` | CI run [#156](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43868630052)（`43868630052`，sha `e2abd4e`）Pass；CD run [#88](https://github.com/afs-2026-zha3-group-2/RouteME/actions/runs/43868762854)（`43868762854`）Pass；release `build-e2abd4e` 已发布 |
| P4 record | `docs/sdd/refine-experience-share/p4-verify.md` | 实现落点、与设计差异、验证命令、移交项 |
| Delta Spec | `openspec/changes/refine-experience-share/specs/trip-experiences/spec.md` | 3 Requirement / 12 Scenario；`openspec validate --strict` valid |
| Tasks | `openspec/changes/refine-experience-share/tasks.md` | T1–T7 全部完成 |
| Design | `openspec/changes/refine-experience-share/design.md` | D1–D9 与实现一致（差异已在 P4 记录） |
| Artifact reviews | `docs/reviews/20261116-refine-experience-share-{design,tasks}-review.md` | Pass；Neal + Jay 批准（2026-11-16T16:40+08:00） |
| Contract / backend | `openapi.yaml` 0.8.1、`ExperienceController` / `ExperienceServiceImpl` | **无改动**；`ExperienceControllerTest` / `ExperienceServiceTest` / `ExperienceServicePersistenceTest` 全绿 |

## 验证摘要

| 检查 | 结果 |
|---|---|
| 前端类型检查 | `npm run typecheck` 通过 |
| 前端构建 | `npm run build` 通过 |
| 前端单测 | 17 files / 141 tests passed（新增 4 例） |
| 后端单测 | 230 tests，0 failures / 0 errors |
| E2E（本 change） | `tests/experiences.spec.ts` 8 passed |
| E2E（全量，干净库） | 55 passed / 1 failed |
| 人工走查 | 1440 / 768 / 390 × 浅 / 深色，无横向溢出；封面与深色对比可辨 |
| 远端 CI | `main@e2abd4e` 的 CI run `43868630052`：Backend / Frontend 两个 job success |
| 远端 CD | CD run `43868762854`：jar + dist + release `build-e2abd4e` success |
| 合并后复跑 | `main` 上 `npm run typecheck` 通过、`npm test` 26 files / 189 tests passed |
| 契约影响 | 无 |
| 数据迁移 | 无 |

## Findings

| 维度 | 结论 | 证据 |
|---|---|---|
| AC 达成 | 12 个 Delta 场景均有 E2E / 单测 / 人工走查承接 | `docs/ai4se-plugins/20261116-165905-local-verify-report.md` §3、§4 |
| 设计一致性 | 与 D1–D9 一致；三处偏差（列表复用 `.safety-list`、封面保留顶边、状态文案拼接）均为评审收口项 | `docs/sdd/refine-experience-share/p4-verify.md` §2 |
| 安全 / 隐私 | 分享边界只提醒不采集；页面与卡片不含电话 / 证件 / 住址字段；授权仍在服务端 | Delta「分享页面提示隐私边界」；`ExperienceServiceImpl.requireCanShare` |
| 回归影响 | `TripCard` 封面逻辑抽为共享函数，行程卡与首页 E2E 全绿；体验卡新增封面未破坏骨架 / 计数断言 | `e2e/tests/trips.spec.ts`、`experiences.spec.ts` 骨架用例 |
| 未通过项 | 1 条既有 E2E 债务：`companions.spec.ts:200` 仍断言 `.ant-alert`，而 `main@1cd1505` 已改为 toast | `git show 1cd1505`（`TripDetailPage` `message.info(mapped)`；spec 仅改结束用例） |

## Decision

**Pass（with 1 documented pre-existing E2E debt）**

## Conditions + owners

无整改条件。

## Follow-ups（不阻断 G2）

| 项 | Owner | 时机 |
|---|---|---|
| `companions.spec.ts:200` 满员拒绝改用 `.ant-message` 断言（或恢复内联提示） | `add-trip-completion` / `1cd1505` owner | 独立 fix 或该 change 的 P5 |
| 「分享页面提示隐私边界」归档说明写明「场景名保留、内容扩充」 | Jay（AO）+ WAYNE（SA） | P5 / G3 |
| 全量 E2E 每次运行都会累积行程；建议 CI 用临时库 | 测试 owner | 后续 change |

## Approvers

| 角色 | 姓名 | 确认内容 | 日期 |
|---|---|---|---|
| VL | Neal | 本地验证证据可复现；实现符合 Delta 与设计；CI #156 / CD #88 通过、release `build-e2abd4e` 已发布；既有 E2E 债务归属清楚 | 2026-11-16 |
| AO | Jay | 实现、测试与走查完成；CI/CD 证据归档 | 2026-11-16 |

## 追加记录（2026-11-16 20:43，CI/CD）

- 本 change 已通过 merge commit `e2abd4e` 进入 `main`：CI run `43868630052`（job 级 success）→ CD run `43868762854`（release `build-e2abd4e`）。
- P4 质量检查中原本 `Skipped` 的 **P4-3（CI pipeline report）与 P4-4（CD）现均为 Pass**，证据见 `docs/ai4se-plugins/20261116-204334-pipeline-report.md` 与 `ci-report.md`。
- G2 结论不变：**Pass（with 1 documented pre-existing E2E debt）**；签署人仍为 VL = Neal。

## Next

- G2 通过后进入 P5（归档）。**按用户要求本次不执行 P5、不归档 S16。**
- 归档时：用本 change 的 3 条 MODIFIED 合并 Living Spec；在变更摘要写明「分享页面提示隐私边界」名称保留、内容扩充；登记知识库（`docs/knowledge/_LOG.md`）。